import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { boundedBody, canonicalizeIp, EXPENSIVE_LIMIT, publicGuard, requestIp } from "../lib/public-api-policy.ts";

type Row = { window_start: number; count: number };
class FakeD1 {
  rows = new Map<string, Row>();
  outage = false;
  prepare(sql: string) {
    return {
      bind: (...args: unknown[]) => ({
        run: async () => {
          if (this.outage) throw new Error("D1 unavailable");
          if (sql.startsWith("INSERT")) {
            const [key, windowStart] = args as [string, number];
            const row = this.rows.get(key);
            this.rows.set(key, !row || row.window_start !== windowStart ? { window_start: windowStart, count: 1 } : { window_start: windowStart, count: row.count + 1 });
          }
        },
        first: async <T>() => {
          if (this.outage) throw new Error("D1 unavailable");
          return this.rows.get(args[0] as string) as T | undefined;
        },
      }),
    };
  }
}

const env = (db: FakeD1) => ({ DB: db as unknown as D1Database, RATE_LIMIT_SECRET: "test-only-secret" });
const request = (headers?: HeadersInit) => new Request("https://example.test/v1/licenses", { headers });

test("canonicalizes IPv4 and IPv6 and rejects malformed addresses", () => {
  assert.equal(canonicalizeIp(" 192.168.001.002 "), "192.168.1.2");
  assert.equal(canonicalizeIp("[2001:0DB8:0:0:0:0:0:1]"), "2001:db8:0:0:0:0:0:1");
  assert.equal(canonicalizeIp("999.1.1.1"), null);
  assert.equal(canonicalizeIp("not-an-ip"), null);
});

test("direct mode ignores spoofed forwarding headers and fails closed without adapter address", () => {
  const headers = new Headers({ "X-Forwarded-For": "203.0.113.9" });
  assert.equal(requestIp(headers, undefined, {}), "unknown");
  assert.equal(requestIp(headers, "198.51.100.7", {}), "198.51.100.7");
});

test("trusted configured proxy header is used only in trusted mode", () => {
  const headers = new Headers({ "X-Real-IP": "203.0.113.9", "X-Forwarded-For": "198.51.100.2" });
  assert.equal(requestIp(headers, "198.51.100.7", { TRUSTED_PROXY_MODE: "true", TRUSTED_PROXY_HEADER: "X-Real-IP" }), "203.0.113.9");
  assert.equal(requestIp(headers, "198.51.100.7", { TRUSTED_PROXY_HEADER: "X-Real-IP" }), "198.51.100.7");
});

test("rate-limit storage key never contains the raw IP", async () => {
  const db = new FakeD1();
  const rawIp = "198.51.100.42";
  await publicGuard(request(), false, rawIp, env(db));
  assert.equal(db.rows.size, 1);
  assert.ok([...db.rows.keys()][0] !== undefined);
  assert.doesNotMatch([...db.rows.keys()][0]!, new RegExp(rawIp.replaceAll(".", "\\.")));
});

test("normal bucket allows 60 and rejects the 61st request with rate headers", async () => {
  const db = new FakeD1();
  let last: Response | { headers: Headers } | undefined;
  for (let i = 0; i < 61; i++) last = await publicGuard(request(), false, "192.0.2.1", env(db));
  assert.equal(last instanceof Response ? last.status : 200, 429);
  assert.equal(last instanceof Response ? last.headers.get("RateLimit-Limit") : null, "60");
  assert.equal(last instanceof Response ? last.headers.get("RateLimit-Remaining") : null, "0");
  assert.ok(Number(last instanceof Response ? last.headers.get("Retry-After") : "0") > 0);
});

test("expensive bucket is 20 and burst increments atomically", async () => {
  const sequentialDb = new FakeD1();
  const sequential = [];
  for (let i = 0; i < 21; i++) sequential.push(await publicGuard(request(), true, "192.0.2.2", env(sequentialDb)));
  assert.equal(sequential.filter(value => value instanceof Response && value.status === 429).length, 1);
  const burstDb = new FakeD1();
  const responses = await Promise.all(Array.from({ length: 25 }, () => publicGuard(request(), true, "192.0.2.3", env(burstDb))));
  assert.ok(responses.filter(value => value instanceof Response && value.status === 429).length >= 5);
  assert.equal(EXPENSIVE_LIMIT, 20);
});

test("route policy keeps the documented public allowlist separate from protected state/auth", () => {
  const apache = readFileSync(new URL("../apache-server/api/index.php", import.meta.url), "utf8");
  assert.match(apache, /str_starts_with\(\$route, 'v1'\) \|\| \$route === 'mcp'/);
  assert.match(apache, /\$route === 'api\/state'[\s\S]*required_user/);
  assert.match(apache, /\$route === 'api\/auth\/session'/);
  const root = readFileSync(new URL("../app/v1/route.ts", import.meta.url), "utf8");
  const subroutes = readFileSync(new URL("../app/v1/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(root, /publicGuard\(request\)/);
  assert.match(subroutes, /publicGuard\(request\);/);
  assert.doesNotMatch(subroutes, /publicGuard\(request, path\[0\] === "snapshots"\)/);
});

test("storage outage fails closed and body size is bounded", async () => {
  const db = new FakeD1(); db.outage = true;
  const response = await publicGuard(request(), false, "192.0.2.3", env(db));
  assert.equal(response instanceof Response ? response.status : 200, 503);
  await assert.rejects(() => boundedBody(new Request("https://example.test", { method: "POST", body: "x".repeat(128 * 1024 + 1) })), /příliš velké/);
});
