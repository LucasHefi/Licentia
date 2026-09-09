import test from "node:test";
import assert from "node:assert/strict";
import { validateContentReview } from "./content-review-workflow.mjs";

const version = "2026-09-09.10";
function fixture() {
  const profile = {
    id: "Content-review-fixture", kind: "license", schemaVersion: "1.0.0",
    sourceFingerprint: { sourceId: "spdx-license-list", revision: "pinned-test-revision", contentHash: "sha256:fixture" },
    review: { status: "reviewed", recommendable: true, evidenceLevel: "strong" },
    semantic: {
      family: "permissive", copyleftScope: "none",
      permissions: ["commercial-use", "distribution", "modifications", "private-use"],
      obligations: ["include-notice"], triggers: ["use"], restrictions: [],
      patentPosition: "none-stated", noticeBurden: "minimal",
    },
    evidence: [],
  };
  profile.evidence = [...Object.keys(profile.semantic), "review"].map(field => ({ field, sourceId: "spdx-license-list", locator: `Fixture section for ${field}: deliberately substantive field evidence used only in this test.`, ruleId: "guide-expansion.editorial-review", ruleVersion: version }));
  const review = {
    id: profile.id, reviewedAt: "2026-09-09", ruleVersion: version,
    reviewMethod: "individual-full-text", sourceFingerprint: structuredClone(profile.sourceFingerprint),
    disposition: "eligible", summaryCs: "Testovací obsahová revize s konkrétním podmíněným zachováním oznámení při užití.", blockersCs: [],
    analysis: Object.fromEntries(["subjectCs", "grantCs", "conditionsCs", "limitationsCs", "compatibilityCs"].map(field => [field, `Samostatná testovací analýza pole ${field}.`])),
    sources: [{ url: "https://spdx.org/licenses/", note: "URL primárního zdroje pro testovací validaci, nikoli skutečná revize licence." }],
  };
  return { review, profile };
}

test("full content review accepts a use-conditioned notice through the actual runtime gate", () => {
  const { review, profile } = fixture();
  assert.equal(validateContentReview(review, profile), review);
});

test("review cannot claim a different identity or silently replace the pinned source", () => {
  const { review, profile } = fixture();
  assert.throws(() => validateContentReview({ ...review, id: "Different-ID" }, profile), /review identity/);
  assert.throws(() => validateContentReview({ ...review, sourceFingerprint: { ...review.sourceFingerprint, contentHash: "sha256:changed" } }, profile), /fingerprint mismatch/);
  assert.throws(() => validateContentReview(review, profile, { originalFingerprint: { ...profile.sourceFingerprint, revision: "other-revision" } }), /source fingerprint changed/);
});

test("legacy import cannot manufacture completion or replace a fresh individual analysis", () => {
  const { review, profile } = fixture();
  const prior = { ...review, reviewMethod: "prior-individual-full-text" };
  delete prior.analysis;
  assert.throws(() => validateContentReview(prior, profile), /cannot invent prior completion/);
  assert.doesNotThrow(() => validateContentReview(prior, profile, { priorIds: new Set([profile.id]) }));
  const incomplete = structuredClone(review);
  delete incomplete.analysis.conditionsCs;
  assert.throws(() => validateContentReview(incomplete, profile), /missing conditionsCs/);
});

test("new field review must itself contain substantive evidence instead of borrowing an old locator", () => {
  const { review, profile } = fixture();
  profile.evidence.find(entry => entry.field === "triggers").ruleVersion = "2026-09-09.09";
  profile.evidence.push({ field: "triggers", sourceId: "spdx-license-list", locator: "text", ruleId: "guide-expansion.editorial-review", ruleVersion: version });
  assert.throws(() => validateContentReview(review, profile), /field triggers was not individually re-reviewed/);
});

test("completed negative review needs a documented next step and cannot claim recommendation", () => {
  const { review, profile } = fixture();
  review.disposition = "blocked";
  profile.review = { status: "not-recommendable", recommendable: false, evidenceLevel: "strong" };
  assert.throws(() => validateContentReview(review, profile), /blocked without a next step/);
  review.blockersCs = ["Konkrétní testovací podmínka vyžaduje doplnění modelu alternativ distribuce."];
  assert.doesNotThrow(() => validateContentReview(review, profile));
  profile.review.recommendable = true;
  assert.throws(() => validateContentReview(review, profile));
});

test("strong evidence does not bypass unknown semantics, deprecation or an unresolved runtime source lock", () => {
  const { review, profile } = fixture();
  assert.throws(() => validateContentReview(review, { ...profile, semantic: { ...profile.semantic, permissions: ["unknown"] } }), /unknown/);
  assert.throws(() => validateContentReview(review, profile, { catalogRecord: { id: profile.id, type: "license", deprecated: true } }), /invalid runtime metadata/);
  assert.throws(() => validateContentReview(review, profile, { sourceLockResolved: false }), /guide rejects claimed eligibility/);
});
