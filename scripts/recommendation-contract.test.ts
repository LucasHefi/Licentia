import assert from "node:assert/strict";
import test from "node:test";
import {
  recommendationEligibility,
  recommendFromProfiles,
  type GuideAnswers,
  type MetadataLicenseProfile,
} from "../lib/recommendation-contract.ts";

const context = { sourceLockResolved: true, ruleVersion: "lic-005-v1" };

function profile(overrides: Partial<MetadataLicenseProfile> = {}): MetadataLicenseProfile {
  return {
    id: "MIT",
    kind: "license",
    review: { status: "reviewed", recommendable: true, evidenceLevel: "sufficient" },
    sourceFingerprint: { sourceId: "choose-a-license", revision: "2026-01", contentHash: "sha256:abc" },
    semantic: {
      family: "permissive",
      copyleftScope: "none",
      permissions: ["commercial-use", "distribution", "modifications", "patent-grant"],
      obligations: ["include-copyright", "include-license-text"],
      triggers: ["distribution", "modification"],
      restrictions: ["liability", "warranty"],
      patentPosition: "express-grant",
      noticeBurden: "standard",
    },
    ...overrides,
  };
}

test("pending, stale, weak, non-recommendable, unresolved, locked, and exception profiles fail closed", () => {
  const cases: Array<[string, Partial<MetadataLicenseProfile>, typeof context]> = [
    ["pending", { review: { ...profile().review, status: "pending" } }, context],
    ["stale", { review: { ...profile().review, status: "stale" } }, context],
    ["weak", { review: { ...profile().review, evidenceLevel: "weak" } }, context],
    ["not recommendable", { review: { ...profile().review, recommendable: false } }, context],
    ["unresolved revision", { sourceFingerprint: { sourceId: "s", revision: "unresolved", contentHash: "hash" } }, context],
    ["unresolved hash", { sourceFingerprint: { sourceId: "s", revision: "r", contentHash: "unresolved" } }, context],
    ["source lock", {}, { sourceLockResolved: false, ruleVersion: "lic-005-v1" }],
    ["exception", { kind: "exception" as "license" }, context],
  ];
  for (const [label, overrides, testContext] of cases) {
    const result = recommendationEligibility(profile(overrides), {}, testContext);
    assert.equal(result.eligible, false, label);
    assert.ok(result.exclusionReasons.length > 0, label);
  }
});

test("reviewed sufficient profile is eligible and gives explicit match reasons", () => {
  const answers: GuideAnswers = { openness: "open", patents: "important", notices: "standard" };
  const result = recommendationEligibility(profile(), answers, context);
  assert.equal(result.eligible, true);
  assert.deepEqual(result.missingFields, []);
  assert.deepEqual(result.unsupportedFields, []);
  assert.ok(result.reasons.length >= 2);
  const recommendation = recommendFromProfiles([profile()], answers, context);
  assert.equal(recommendation.advisory, true);
  assert.equal(recommendation.ruleVersion, context.ruleVersion);
  assert.deepEqual(recommendation.candidates[0]?.matchedFields, ["family", "patentPosition", "noticeBurden"]);
});

test("unknown required fields and jurisdiction exclude rather than scoring", () => {
  const unknown = profile({ semantic: { ...profile().semantic, family: "unknown" } });
  const missing = recommendationEligibility(unknown, { openness: "open" }, context);
  assert.equal(missing.eligible, false);
  assert.ok(missing.missingFields.includes("semantic.family"));

  const jurisdiction = recommendationEligibility(profile(), { jurisdiction: "eu" }, context);
  assert.equal(jurisdiction.eligible, false);
  assert.ok(jurisdiction.unsupportedFields.includes("jurisdiction"));
  assert.deepEqual(recommendFromProfiles([profile()], { jurisdiction: "global" }, context).candidates, []);
});

test("ordering is deterministic, capped, and inputs remain immutable", () => {
  const profiles = [profile({ id: "Zed" }), profile({ id: "Alpha" }), profile({ id: "Beta" }), profile({ id: "Gamma" }), profile({ id: "Delta" }), profile({ id: "Epsilon" })];
  const answers: GuideAnswers = { openness: "open" };
  const before = structuredClone(profiles);
  const result = recommendFromProfiles(profiles, answers, context);
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["Alpha", "Beta", "Delta", "Epsilon", "Gamma"]);
  assert.deepEqual(profiles, before);
  assert.deepEqual(answers, { openness: "open" });
});
