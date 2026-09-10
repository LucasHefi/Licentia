import { fetchGithubSignals, type GithubSignalsEnvelope } from "../../../lib/github-signals-source.ts";

const CACHE_TTL_MS = 15 * 60 * 1000;
const RETRY_TTL_MS = 60 * 1000;
let cachedSignals: { expiresAt: number; value: GithubSignalsEnvelope } | null = null;
let signalsInFlight: Promise<GithubSignalsEnvelope> | null = null;

export const dynamic = "force-dynamic";

async function loadSignals(): Promise<GithubSignalsEnvelope> {
  if (cachedSignals && cachedSignals.expiresAt > Date.now()) return cachedSignals.value;
  if (signalsInFlight) return signalsInFlight;
  signalsInFlight = fetchGithubSignals()
    .then((value) => {
      const ttl = value.status === "complete" ? CACHE_TTL_MS : RETRY_TTL_MS;
      cachedSignals = { expiresAt: Date.now() + ttl, value };
      return value;
    })
    .finally(() => { signalsInFlight = null; });
  return signalsInFlight;
}

export async function GET() {
  const value = await loadSignals();
  return Response.json(value, {
    headers: {
      "Cache-Control": value.status === "complete" ? "public, max-age=900, s-maxage=900" : "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
