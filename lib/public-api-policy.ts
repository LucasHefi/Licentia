export type RuntimeEnv = { DB?: D1Database; RATE_LIMIT_SECRET?: string; TRUSTED_PROXY_MODE?: string; TRUSTED_PROXY_HEADER?: string; MCP_ALLOWED_ORIGINS?: string };
type RequestAdapter = Request & { remoteAddress?: string; ip?: string; cf?: { connectingIP?: string } };

export const PUBLIC_LIMIT = 60;
export const EXPENSIVE_LIMIT = 20;
const WINDOW_SECONDS = 60;
const MAX_BODY_BYTES = 128 * 1024;

async function runtimeEnv(): Promise<RuntimeEnv> {
  try { const workers = await import("cloudflare:workers"); return workers.env as RuntimeEnv; }
  catch { const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}; return { RATE_LIMIT_SECRET: env.RATE_LIMIT_SECRET, TRUSTED_PROXY_MODE: env.TRUSTED_PROXY_MODE, TRUSTED_PROXY_HEADER: env.TRUSTED_PROXY_HEADER, MCP_ALLOWED_ORIGINS: env.MCP_ALLOWED_ORIGINS }; }
}

export function canonicalizeIp(value: string) {
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(candidate)) return candidate.split(".").every(part => Number(part) <= 255) ? candidate.split(".").map(Number).join(".") : null;
  if (!/^[0-9a-fA-F:]+$/.test(candidate) || candidate.split(":").length < 3) return null;
  const halves = candidate.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (left.concat(right).some(part => !/^[0-9a-fA-F]{1,4}$/.test(part))) return null;
  if (halves.length === 1 && left.length !== 8) return null;
  if (halves.length === 2 && left.length + right.length >= 8) return null;
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right];
  return groups.map(part => part.toLowerCase().replace(/^0+(?=[0-9a-f])/, "") || "0").join(":");
}

export function adapterRemoteAddress(request: Request, env: RuntimeEnv = {}) {
  const adapter = request as RequestAdapter;
  return adapter.remoteAddress ?? adapter.ip ?? (env.TRUSTED_PROXY_MODE === "true" ? adapter.cf?.connectingIP : undefined);
}

export function requestIp(headers: Headers, remoteAddress?: string, env: RuntimeEnv = {}) {
  const direct = canonicalizeIp(remoteAddress ?? "");
  if (!direct) return env.TRUSTED_PROXY_MODE === "true" ? canonicalizeIp(headers.get(env.TRUSTED_PROXY_HEADER ?? "cf-connecting-ip") ?? "") ?? "unknown" : "unknown";
  if (env.TRUSTED_PROXY_MODE !== "true") return direct;
  const header = env.TRUSTED_PROXY_HEADER ?? "cf-connecting-ip";
  return canonicalizeIp(headers.get(header) ?? "") ?? direct;
}

async function rateLimitKey(bucket: string, ip: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`${bucket}:${ip}`));
  return `${bucket}:${Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

function headersFor(limit: number, remaining: number, retryAfter?: number) {
  const headers = new Headers({ "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff", "RateLimit-Limit": String(limit), "RateLimit-Remaining": String(Math.max(0, remaining)), "RateLimit-Reset": String(WINDOW_SECONDS) });
  if (retryAfter !== undefined) headers.set("Retry-After", String(retryAfter));
  return headers;
}

export async function publicGuard(request: Request, expensive = false, remoteAddress?: string, suppliedEnv?: RuntimeEnv) {
  const env = suppliedEnv ?? await runtimeEnv();
  if (!env.DB) return new Response(JSON.stringify({ error: "Veřejné API je dočasně nedostupné." }), { status: 503, headers: headersFor(expensive ? EXPENSIVE_LIMIT : PUBLIC_LIMIT, 0) });
  const limit = expensive ? EXPENSIVE_LIMIT : PUBLIC_LIMIT;
  const ip = requestIp(request.headers, remoteAddress ?? adapterRemoteAddress(request, env), env);
  if (ip === "unknown") return new Response(JSON.stringify({ error: "Veřejné API nemůže bezpečně určit zdroj požadavku." }), { status: 503, headers: headersFor(limit, 0) });
  if (!env.RATE_LIMIT_SECRET) return new Response(JSON.stringify({ error: "Veřejné API je dočasně nedostupné." }), { status: 503, headers: headersFor(limit, 0) });
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;
  try {
    const key = await rateLimitKey(expensive ? "expensive" : "normal", ip, env.RATE_LIMIT_SECRET);
    await env.DB.prepare(`INSERT INTO public_rate_limit (key, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,
      count=CASE WHEN public_rate_limit.window_start != excluded.window_start THEN 1 ELSE public_rate_limit.count + 1 END
      `).bind(key, windowStart).run();
    const row = await env.DB.prepare("SELECT window_start, count FROM public_rate_limit WHERE key = ?").bind(key).first<{ window_start: number; count: number }>();
    if (!row || row.window_start !== windowStart) throw new Error("rate limit state unavailable");
    const remaining = Math.max(0, limit - row.count);
    if (row.count > limit) return new Response(JSON.stringify({ error: "Příliš mnoho požadavků." }), { status: 429, headers: headersFor(limit, 0, windowStart + WINDOW_SECONDS - now) });
    return { headers: headersFor(limit, remaining) };
  } catch { return new Response(JSON.stringify({ error: "Veřejné API je dočasně nedostupné." }), { status: 503, headers: headersFor(limit, 0) }); }
}

export function boundedBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error("Tělo požadavku je příliš velké.");
  return request.text().then(raw => { if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("Tělo požadavku je příliš velké."); return JSON.parse(raw) as Record<string, unknown>; });
}

export function mergeHeaders(response: Response, extra: Headers) { const headers = new Headers(response.headers); extra.forEach((value, key) => headers.set(key, value)); return new Response(response.body, { status: response.status, headers }); }

export async function mcpOriginGuard(request: Request, suppliedEnv?: RuntimeEnv) {
  const origin = request.headers.get("origin");
  if (!origin) return { headers: new Headers({ "Access-Control-Allow-Origin": "*" }) };
  const env = suppliedEnv ?? await runtimeEnv();
  const allowed = new Set([new URL(request.url).origin, ...(env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((item) => item.trim()).filter(Boolean)]);
  let normalized: string;
  try { normalized = new URL(origin).origin; } catch { normalized = ""; }
  if (!normalized || normalized !== origin || !allowed.has(normalized)) {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Forbidden Origin header." } }, { status: 403, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  return { headers: new Headers({ "Access-Control-Allow-Origin": normalized, "Access-Control-Allow-Credentials": "true", Vary: "Origin" }) };
}
