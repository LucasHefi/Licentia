type GithubRepositoryPayload = {
  full_name?: unknown;
  html_url?: unknown;
  stargazers_count?: unknown;
  forks_count?: unknown;
  pushed_at?: unknown;
};

type GithubRepositorySignal = {
  name: string;
  url: string;
  stars: number;
  forks: number;
  pushedAt: string | null;
};

type GithubSignal = {
  id: string;
  query: string;
  repositoryCount: number | null;
  incompleteResults: boolean;
  topRepositories: GithubRepositorySignal[];
  error?: string;
};

type GithubSignalsEnvelope = {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  coverage: string;
  caveat: string;
  status: "complete" | "partial" | "unavailable";
  licenses: GithubSignal[];
};

const githubLicenses = [
  ["MIT", "mit"],
  ["Apache-2.0", "apache-2.0"],
  ["GPL-3.0", "gpl-3.0"],
  ["BSD-3-Clause", "bsd-3-clause"],
  ["MPL-2.0", "mpl-2.0"],
  ["LGPL-3.0", "lgpl-3.0"],
  ["AGPL-3.0", "agpl-3.0"],
] as const;

const MAX_UPSTREAM_BODY_BYTES = 256 * 1024;
const MAX_REPOSITORY_COUNT = 1_000_000_000;
const MAX_REPOSITORIES = 3;
const UPSTREAM_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedSignals: { expiresAt: number; value: GithubSignalsEnvelope } | null = null;
let signalsInFlight: Promise<GithubSignalsEnvelope> | null = null;

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function githubSearchUrl(query: string) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `license:${query}`);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(MAX_REPOSITORIES));
  return url;
}

function nonNegativeInteger(value: unknown, maximum: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : null;
}

function githubRepositoryUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port || !url.pathname.startsWith("/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function repositoryTimestamp(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string" || value.length > 64 || Number.isNaN(Date.parse(value))) return undefined;
  return value;
}

function repository(value: unknown): GithubRepositorySignal | null {
  if (!isRecord(value)) return null;
  const item = value as GithubRepositoryPayload;
  if (typeof item.full_name !== "string" || item.full_name.length === 0 || item.full_name.length > 200) return null;
  const url = githubRepositoryUrl(item.html_url);
  const stars = nonNegativeInteger(item.stargazers_count, MAX_REPOSITORY_COUNT);
  const forks = nonNegativeInteger(item.forks_count, MAX_REPOSITORY_COUNT);
  const pushedAt = repositoryTimestamp(item.pushed_at);
  if (!url || stars === null || forks === null || pushedAt === undefined) return null;
  return { name: item.full_name, url, stars, forks, pushedAt };
}

function emptySignal(id: string, query: string, error: string): GithubSignal {
  return { id, query, repositoryCount: null, incompleteResults: false, topRepositories: [], error };
}

async function upstreamJson(response: Response) {
  if (!response.body) throw new Error("Odpověď GitHubu nemá tělo.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let overLimit = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (totalBytes + value.byteLength > MAX_UPSTREAM_BODY_BYTES) {
        overLimit = true;
        throw new Error("Odpověď GitHubu je příliš velká.");
      }
      chunks.push(value);
      totalBytes += value.byteLength;
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const raw = new TextDecoder().decode(bytes);

    return JSON.parse(raw) as unknown;
  } finally {
    if (overLimit) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function parsedSignal(label: string, query: string, payload: unknown): GithubSignal {
  if (!isRecord(payload)) return emptySignal(label, query, "GitHub vrátil neplatnou odpověď.");
  const repositoryCount = nonNegativeInteger(payload.total_count, MAX_REPOSITORY_COUNT);
  const incompleteResults = payload.incomplete_results;
  const items = payload.items;
  if (repositoryCount === null || typeof incompleteResults !== "boolean" || !Array.isArray(items) || items.length > MAX_REPOSITORIES) {
    return emptySignal(label, query, "GitHub vrátil neplatná nebo neúplná data.");
  }
  const repositories = items.map(repository);
  if (repositories.some((item) => item === null)) return emptySignal(label, query, "GitHub vrátil neplatný záznam repozitáře.");
  return {
    id: label,
    query,
    repositoryCount,
    incompleteResults,
    topRepositories: repositories.filter((item): item is GithubRepositorySignal => item !== null).slice(0, MAX_REPOSITORIES),
  };
}

async function loadLicenseSignal(label: string, query: string): Promise<GithubSignal> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(githubSearchUrl(query), {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Licentia-public-signals",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return emptySignal(label, query, response.status === 403 || response.status === 429 ? "GitHub dočasně omezil veřejné vyhledávání." : `GitHub odpověděl stavem ${response.status}.`);
    }
    return parsedSignal(label, query, await upstreamJson(response));
  } catch (error) {
    return emptySignal(label, query, error instanceof Error && error.name === "AbortError" ? "GitHub neodpověděl včas." : "GitHub není momentálně dostupný.");
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSignals(): Promise<GithubSignalsEnvelope> {
  const now = Date.now();
  if (cachedSignals && cachedSignals.expiresAt > now) return cachedSignals.value;
  if (signalsInFlight) return signalsInFlight;
  signalsInFlight = Promise.all(githubLicenses.map(([label, query]) => loadLicenseSignal(label, query)))
    .then((signals) => {
      const available = signals.filter((signal) => signal.repositoryCount !== null && !signal.error).length;
      const value: GithubSignalsEnvelope = {
        source: "GitHub repository search",
        sourceUrl: "https://docs.github.com/en/rest/search/search",
        fetchedAt: new Date().toISOString(),
        coverage: "Veřejné repozitáře, u kterých GitHub rozpoznal licenční výraz.",
        caveat: "Počet repozitářů není počet uživatelů, instalací ani všech závislostí.",
        status: available === signals.length ? "complete" : available > 0 ? "partial" : "unavailable",
        licenses: signals,
      };
      if (value.status !== "unavailable") cachedSignals = { expiresAt: Date.now() + CACHE_TTL_MS, value };
      return value;
    })
    .finally(() => {
      signalsInFlight = null;
    });
  return signalsInFlight;
}

export async function GET() {
  return Response.json(await loadSignals(), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
