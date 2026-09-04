import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { decodeGithubSignalPayload, safeGithubRepositoryUrl } from "../lib/public-signals.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const routeSource = readFileSync(`${root}/app/api/signals/route.ts`, "utf8");
const uiSource = readFileSync(`${root}/components/LicenseStudio.tsx`, "utf8");
let moduleId = 0;

function repository(name = "octo/example") {
  return { full_name: name, html_url: `https://github.com/${name}`, stargazers_count: 12, forks_count: 3, pushed_at: "2026-09-04T09:00:00Z" };
}

function upstreamPayload(overrides: Record<string, unknown> = {}) {
  return { total_count: 42, incomplete_results: false, items: [repository()], ...overrides };
}

function clientSignal(overrides: Record<string, unknown> = {}) {
  return { id: "MIT", query: "mit", repositoryCount: 42, incompleteResults: false, topRepositories: [], ...overrides };
}

function clientEnvelope(overrides: Record<string, unknown> = {}) {
  return { status: "complete", fetchedAt: "2026-09-04T09:00:00Z", source: "GitHub", caveat: "Public signal only.", licenses: [clientSignal()], ...overrides };
}

async function loadRoute() {
  moduleId += 1;
  return import(`../app/api/signals/route.ts?signals-contract=${moduleId}`);
}

function installFetch(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => handler(new URL(String(input)), init)) as typeof fetch;
  return () => { globalThis.fetch = original; };
}

test("signals contract is hardened and static targets are explicit", () => {
  assert.match(routeSource, /AbortController/);
  assert.match(routeSource, /signal: controller\.signal/);
  assert.match(routeSource, /MAX_UPSTREAM_BODY_BYTES/);
  assert.match(routeSource, /MAX_REPOSITORIES = 3/);
  assert.match(routeSource, /Number\.isSafeInteger/);
  assert.match(routeSource, /signalsInFlight/);
  assert.match(uiSource, /decodeGithubSignalPayload/);
  assert.match(uiSource, /status: "unavailable"/);
  assert.match(readFileSync(`${root}/desktop/main.tsx`, "utf8"), /dataset\.licentiaStaticTarget = "true"/);
  assert.match(readFileSync(`${root}/apache/main.tsx`, "utf8"), /dataset\.licentiaStaticTarget = "true"/);
});

test("client decoder preserves complete, partial, and unavailable envelope status", () => {
  assert.equal(decodeGithubSignalPayload(clientEnvelope())?.status, "complete");
  assert.equal(decodeGithubSignalPayload(clientEnvelope({ status: "partial" }))?.status, "partial");
  assert.equal(decodeGithubSignalPayload(clientEnvelope({ status: "unavailable", caveat: "GitHub rate limit." }))?.status, "unavailable");
  assert.equal(decodeGithubSignalPayload({ ...clientEnvelope(), status: "ready" }), null);
  assert.equal(decodeGithubSignalPayload({ ...clientEnvelope(), licenses: [{ ...clientSignal(), topRepositories: [{ name: "bad", url: "https://github.com:8443/octo/example", stars: 1, forks: 1, pushedAt: null }] }] }), null);
});

test("safe GitHub URLs reject credentials and non-default ports", () => {
  assert.equal(safeGithubRepositoryUrl("https://github.com/octo/example"), "https://github.com/octo/example");
  assert.equal(safeGithubRepositoryUrl("https://user:secret@github.com/octo/example"), null);
  assert.equal(safeGithubRepositoryUrl("https://github.com:8443/octo/example"), null);
  assert.equal(safeGithubRepositoryUrl("https://user@github.com/octo/example"), null);
  assert.equal(safeGithubRepositoryUrl("https://:secret@github.com/octo/example"), null);
});

test("GET returns bounded validated signals and coalesces concurrent loads", async () => {
  const calls: Array<{ url: URL; signal?: AbortSignal | null }> = [];
  const restore = installFetch(async (url, init) => {
    calls.push({ url, signal: init?.signal });
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(JSON.stringify(upstreamPayload()), { status: 200, headers: { "content-type": "application/json" } });
  });
  try {
    const route = await loadRoute();
    const [first, second] = await Promise.all([route.GET(), route.GET()]);
    const firstPayload = await first.json() as { status: string; licenses: Array<{ topRepositories: unknown[] }> };
    const secondPayload = await second.json() as { status: string; licenses: Array<{ topRepositories: unknown[] }> };
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(firstPayload.status, "complete");
    assert.equal(secondPayload.status, "complete");
    assert.equal(firstPayload.licenses.length, 7);
    assert.ok(firstPayload.licenses.every((signal) => signal.topRepositories.length <= 3));
    assert.equal(calls.length, 7, "concurrent requests must share one in-flight fan-out");
    assert.ok(calls.every((call) => call.url.hostname === "api.github.com" && call.signal instanceof AbortSignal));
  } finally {
    restore();
  }
});

test("malformed or oversized upstream data fails closed", async () => {
  const malformedRestore = installFetch(() => new Response(JSON.stringify(upstreamPayload({ total_count: -4, items: [{ ...repository(), html_url: "https://evil.example/repo" }] })), { status: 200 }));
  try {
    const route = await loadRoute();
    const response = await route.GET();
    const payload = await response.json() as { status: string; licenses: Array<{ repositoryCount: number | null; error?: string }> };
    assert.equal(payload.status, "unavailable");
    assert.ok(payload.licenses.every((signal) => signal.repositoryCount === null && typeof signal.error === "string"));
  } finally {
    malformedRestore();
  }

  const oversizedRestore = installFetch(() => new Response(JSON.stringify(upstreamPayload({ padding: "x".repeat(300_000) })), { status: 200 }));
  try {
    const route = await loadRoute();
    const response = await route.GET();
    const payload = await response.json() as { status: string; licenses: Array<{ repositoryCount: number | null }> };
    assert.equal(payload.status, "unavailable");
    assert.ok(payload.licenses.every((signal) => signal.repositoryCount === null));
  } finally {
    oversizedRestore();
  }
});

test("GET rejects credential-bearing GitHub repository URLs", async () => {
  const restore = installFetch(() => new Response(JSON.stringify(upstreamPayload({
    items: [{ ...repository(), html_url: "https://user:secret@github.com/octo/example" }],
  })), { status: 200 }));
  try {
    const route = await loadRoute();
    const response = await route.GET();
    const raw = await response.text();
    const payload = JSON.parse(raw) as { status: string; licenses: Array<{ repositoryCount: number | null; topRepositories: unknown[] }> };
    assert.equal(payload.status, "unavailable");
    assert.ok(payload.licenses.every((signal) => signal.repositoryCount === null && signal.topRepositories.length === 0));
    assert.doesNotMatch(raw, /user:secret@github\.com/);
  } finally {
    restore();
  }
});

test("oversized streaming upstream data is rejected before the body is fully consumed", async () => {
  const limit = 256 * 1024;
  const chunks = [new Uint8Array(limit), new Uint8Array(1), new Uint8Array(1024 * 1024)];
  let consumedBytes = 0;
  let cancellations = 0;
  const oversizedRestore = installFetch(() => {
    const pending = chunks.slice();
    let cancelled = false;
    return new Response(new ReadableStream<Uint8Array>({
      async pull(controller) {
        const chunk = pending.shift();
        if (!chunk) {
          controller.close();
          return;
        }
        if (chunk.byteLength > limit) await new Promise((resolve) => setTimeout(resolve, 20));
        if (cancelled) return;
        consumedBytes += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
        cancellations += 1;
      },
    }), { status: 200 });
  });
  try {
    const route = await loadRoute();
    const response = await route.GET();
    const payload = await response.json() as { status: string; licenses: Array<{ repositoryCount: number | null }> };
    assert.equal(payload.status, "unavailable");
    assert.ok(payload.licenses.every((signal) => signal.repositoryCount === null));
    assert.equal(consumedBytes, (limit + 1) * 7, "each reader must stop at the first byte over the cap");
    assert.equal(cancellations, 7, "each over-limit reader must cancel its body");
  } finally {
    oversizedRestore();
  }
});
