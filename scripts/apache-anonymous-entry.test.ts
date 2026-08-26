import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../components/PortableApp.tsx", import.meta.url), "utf8");

test("Apache landing exposes a local anonymous branch without an account", () => {
  assert.match(source, /useState\(false\)/, "anonymous mode must be local component state");
  assert.match(source, /type="button"[^>]*className="auth-anonymous"[^>]*onClick=\{\(\) => setAnonymous\(true\)\}/);
  assert.match(source, /Pokračovat bez registrace a přihlášení/);
  assert.match(source, /if \(anonymous\) return <LicenseStudio \/>;/, "anonymous mode must omit account prop");
  assert.match(source, /api\/auth\/\$\{mode === "signin" \? "login" : "register"\}/, "account form must remain available");
  assert.match(source, /session\.user\)[\s\S]*<LicenseStudio account=\{/);
  assert.doesNotMatch(source, /anonymous[\s\S]{0,500}api\/state/, "anonymous branch must not request protected state");
});
