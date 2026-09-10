export const trackedPublicLicenses = [
  ["MIT", "mit"],
  ["Apache-2.0", "apache-2.0"],
  ["GPL-3.0", "gpl-3.0"],
  ["BSD-3-Clause", "bsd-3-clause"],
  ["MPL-2.0", "mpl-2.0"],
  ["LGPL-3.0", "lgpl-3.0"],
  ["AGPL-3.0", "agpl-3.0"],
] as const;

export const GITHUB_SIGNALS_SOURCE_URL = "https://docs.github.com/en/rest/search/search#search-repositories";

export type GithubSignal = {
  id: string;
  query: string;
  repositoryCount: number | null;
  incompleteResults: boolean;
  topRepositories: Array<{ name: string; url: string; stars: number; forks: number; pushedAt: string | null }>;
  error?: string;
};

export type GithubSignalsPayload = {
  status: "complete" | "partial" | "unavailable";
  fetchedAt: string;
  source: string;
  caveat: string;
  signals: GithubSignal[];
};

export function safeGithubRepositoryUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.port || !url.pathname.startsWith("/")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeSignalInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
}

function decodeGithubSignal(value: unknown): GithubSignal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || item.id.length === 0 || item.id.length > 64) return null;
  if (typeof item.query !== "string" || item.query.length === 0 || item.query.length > 64) return null;
  if (item.repositoryCount !== null && !safeSignalInteger(item.repositoryCount)) return null;
  if (typeof item.incompleteResults !== "boolean" || !Array.isArray(item.topRepositories) || item.topRepositories.length > 3) return null;
  const topRepositories = item.topRepositories.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const repository = value as Record<string, unknown>;
    const url = safeGithubRepositoryUrl(repository.url);
    const pushedAt = repository.pushedAt === null ? null : typeof repository.pushedAt === "string" && repository.pushedAt.length <= 64 && !Number.isNaN(Date.parse(repository.pushedAt)) ? repository.pushedAt : undefined;
    if (typeof repository.name !== "string" || repository.name.length === 0 || repository.name.length > 200 || !url || !safeSignalInteger(repository.stars) || !safeSignalInteger(repository.forks) || pushedAt === undefined) return null;
    return { name: repository.name, url, stars: repository.stars, forks: repository.forks, pushedAt };
  });
  if (topRepositories.some((repository) => repository === null)) return null;
  if (item.error !== undefined && (typeof item.error !== "string" || item.error.length > 500)) return null;
  return { id: item.id, query: item.query, repositoryCount: item.repositoryCount as number | null, incompleteResults: item.incompleteResults, topRepositories: topRepositories.filter((repository): repository is NonNullable<typeof repository> => repository !== null), ...(typeof item.error === "string" ? { error: item.error } : {}) };
}

export function decodeGithubSignalPayload(value: unknown): GithubSignalsPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (payload.status !== "complete" && payload.status !== "partial" && payload.status !== "unavailable") return null;
  if (typeof payload.fetchedAt !== "string" || payload.fetchedAt.length > 64 || Number.isNaN(Date.parse(payload.fetchedAt)) || typeof payload.source !== "string" || payload.source.length > 500 || typeof payload.caveat !== "string" || payload.caveat.length > 500 || !Array.isArray(payload.licenses)) return null;
  const signals = payload.licenses.map(decodeGithubSignal);
  if (signals.some((signal) => signal === null)) return null;
  if (signals.length !== trackedPublicLicenses.length || trackedPublicLicenses.some(([id, query]) => signals.filter((signal) => signal?.id === id && signal.query === query).length !== 1)) return null;
  const available = signals.filter((signal) => signal?.repositoryCount !== null && !signal?.error).length;
  if (payload.status !== (available === signals.length ? "complete" : available > 0 ? "partial" : "unavailable")) return null;
  return { status: payload.status, fetchedAt: payload.fetchedAt, source: payload.source, caveat: payload.caveat, signals: signals.filter((signal): signal is GithubSignal => signal !== null) };
}

export type GithubSignalReading = {
  signal: GithubSignal;
  fetchedAt: string;
  origin: "snapshot" | "live";
};

export function mergeGithubSignalReadings(readings: GithubSignalReading[], payload: GithubSignalsPayload): GithubSignalReading[] {
  return readings.map((reading) => {
    const signal = payload.signals.find((item) => item.id === reading.signal.id);
    if (!signal || signal.repositoryCount === null || signal.error || Date.parse(payload.fetchedAt) <= Date.parse(reading.fetchedAt)) return reading;
    return { signal, fetchedAt: payload.fetchedAt, origin: "live" };
  });
}
