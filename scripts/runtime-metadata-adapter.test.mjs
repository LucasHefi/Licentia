import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { adaptRecord, joinCuratedProfiles, loadCuratedProfile, profileFilename } from "./runtime-metadata-adapter.mjs";

const profile = (id, kind = "license", review = { status: "pending", recommendable: false, evidenceLevel: "unknown" }) => ({
  id, kind, schemaVersion: "1.0.0",
  sourceFingerprint: { sourceId: "spdx-license-list", revision: "r1", contentHash: "sha256:x" },
  review, semantic: kind === "license"
    ? { family: "unknown", copyleftScope: "unknown", permissions: ["unknown"], obligations: ["unknown"], triggers: ["unknown"], restrictions: ["unknown"], patentPosition: "unknown", noticeBurden: "unknown" }
    : { exceptionApplicability: "unknown", permissions: ["unknown"], triggers: ["unknown"], restrictions: ["unknown"] }, evidence: [],
});
async function fixture(entries) {
  const root = await mkdtemp(path.join(os.tmpdir(), "lic-006-"));
  for (const [kind, id, value = profile(id, kind)] of entries) {
    const dir = path.join(root, "profiles", `${kind}s`); await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, profileFilename(id)), typeof value === "string" ? value : JSON.stringify(value));
  }
  return path.join(root, "profiles");
}

test("all source records join and results are deterministic without mutation", async () => {
  const profiles = await fixture([["license", "MIT"], ["exception", "LLVM-exception"]]);
  const records = [{ kind: "license", id: "MIT" }, { kind: "exception", id: "LLVM-exception" }];
  const before = structuredClone(records);
  const first = await joinCuratedProfiles(records, profiles);
  const second = await joinCuratedProfiles(records, profiles);
  assert.deepEqual(records, before); assert.deepEqual([...first], [...second]);
  const output = adaptRecord({ id: "MIT", type: "license", profile: null }, first.get("license:MIT"));
  assert.equal(output.metadata.review.recommendable, false); assert.deepEqual(records, before);
});

test("missing, invalid, wrong-kind and identity profiles fail closed", async () => {
  const profiles = await fixture([["license", "MIT", profile("OTHER")], ["exception", "wrong-kind", profile("wrong-kind", "license")], ["exception", "bad", "{"]]);
  await assert.rejects(() => loadCuratedProfile(profiles, "license", "missing"), /Missing or invalid/);
  await assert.rejects(() => loadCuratedProfile(profiles, "license", "MIT"), /identity mismatch/);
  await assert.rejects(() => loadCuratedProfile(profiles, "exception", "wrong-kind"), /wrong kind/);
  await assert.rejects(() => loadCuratedProfile(profiles, "exception", "bad"), /Missing or invalid/);
  assert.throws(() => profileFilename("../escape"), /Unsafe profile id/);
  assert.throws(() => profileFilename("a/b"), /Unsafe profile id/);
});

test("pending profiles remain non-recommendable and malformed profiles fail", async () => {
  const profiles = await fixture([["license", "MIT", profile("MIT")], ["license", "bad", { id: "bad", kind: "license" }]]);
  const joined = await joinCuratedProfiles([{ kind: "license", id: "MIT" }], profiles);
  assert.equal(adaptRecord({ id: "MIT", type: "license" }, joined.get("license:MIT")).metadata.review.recommendable, false);
  await assert.rejects(() => loadCuratedProfile(profiles, "license", "bad"), /schemaVersion|sourceFingerprint/);
});

test("joins are exact and reject duplicate or schema-invalid semantic metadata", async () => {
  const profiles = await fixture([["license", "MIT"], ["exception", "LLVM-exception"]]);
  await assert.rejects(
    () => joinCuratedProfiles([{ kind: "license", id: "MIT" }, { kind: "license", id: "MIT" }], profiles),
    /Duplicate source record license:MIT/,
  );
  const invalid = profile("MIT");
  invalid.semantic.permissions = ["not-a-permission"];
  const invalidProfiles = await fixture([["license", "MIT", invalid]]);
  await assert.rejects(() => loadCuratedProfile(invalidProfiles, "license", "MIT"), /unknown enum value/);
  const recommendable = profile("MIT", "license", { status: "pending", recommendable: true, evidenceLevel: "strong" });
  recommendable.evidence = [{ field: "family", sourceId: "spdx-license-list", locator: "fixture" }];
  const gatedProfiles = await fixture([["license", "MIT", recommendable]]);
  await assert.rejects(() => loadCuratedProfile(gatedProfiles, "license", "MIT"), /recommendable invariant/);
});
