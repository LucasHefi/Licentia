import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("service worker only handles static assets and honors private caching directives", () => {
  assert.match(source, /\(request\.method !== "GET" \|\| url\.origin !== self\.location\.origin\)/);
  assert.match(source, /\(request\.headers\.has\("authorization"\) \|\| request\.cache === "no-store"\)/);
  assert.match(source, /\(response\.ok && !\/\\b\(\?:no-store\|private\)\\b\/i\.test\(cacheControl\)\)/);
  assert.doesNotMatch(source, /caches\.match\("\.\/index\.html"\)/);
  assert.doesNotMatch(source, /\/api\/|\/v1\/|\/mcp\//);
});
