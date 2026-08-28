import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

test("Vite config does not depend on agent hosting metadata", () => {
  assert.doesNotMatch(viteConfig, /from ["']\.\/\.openai\/hosting\.json/);
  assert.match(viteConfig, /hasOpenAiHostingMetadata/);
  assert.match(viteConfig, /binding:\s*["']DB["']/);
  assert.match(viteConfig, /d1_databases:/);
});
