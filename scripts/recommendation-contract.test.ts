import assert from "node:assert/strict";
import test from "node:test";
import {
  GUIDE_MODEL_VERSION,
  buildGuideModel,
  parseRecommendationInput,
  parseDependencyInput,
  recommendFromCatalog,
  recommendationEligibility,
  recommendFromProfiles,
  metadataProfileFromCatalog,
  runtimeSourceLockResolved,
  type CatalogMetadataRecord,
  type GuideAnswers,
  type MetadataLicenseProfile,
} from "../lib/recommendation-contract.ts";
import { guideMessage } from "../lib/guide-copy.ts";

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
    evidence: [
      { field: "family", sourceId: "spdx-license-list", locator: "text" },
      { field: "permissions", sourceId: "spdx-license-list", locator: "text" },
      { field: "copyleftScope", sourceId: "spdx-license-list", locator: "text" },
      { field: "obligations", sourceId: "spdx-license-list", locator: "text" },
      { field: "triggers", sourceId: "spdx-license-list", locator: "text" },
      { field: "restrictions", sourceId: "spdx-license-list", locator: "text" },
      { field: "patentPosition", sourceId: "spdx-license-list", locator: "text" },
      { field: "noticeBurden", sourceId: "spdx-license-list", locator: "text" },
      { field: "review", sourceId: "spdx-license-list", locator: "isOsiApproved=true" },
    ],
    ...overrides,
  };
}

function catalogRecord(source = profile()): CatalogMetadataRecord {
  return {
    id: source.id,
    type: "license",
    deprecated: false,
    metadata: {
      contractVersion: "1.0.0",
      kind: "license",
      id: source.id,
      review: source.review,
      semantic: source.semantic,
      sourceFingerprint: source.sourceFingerprint,
      evidence: source.evidence ?? [],
    },
  };
}

function generatedCatalogRecord(source = profile({
  id: "LIC-008-generated-fixture",
  semantic: { ...profile().semantic, projectForm: "application", noticeBurden: "minimal" },
})): CatalogMetadataRecord {
  return {
    ...catalogRecord(source),
    name: "Generated envelope fixture",
    osi: true,
    fsf: true,
    profiled: true,
    permissions: ["commercial-use", "distribution", "modifications", "patent-grant"],
    conditions: [],
    limitations: [],
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

test("candidate ties use explicit stable ID ordering rather than locale collation", () => {
  const result = recommendFromProfiles([profile({ id: "a" }), profile({ id: "B" }), profile({ id: "A" })], { openness: "open" }, context);
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), ["A", "B", "a"]);
});

test("the versioned guide has quick and advanced questions with conditional dependencies", () => {
  const model = buildGuideModel();
  assert.equal(model.version, GUIDE_MODEL_VERSION);
  const quick = model.questions.filter((question) => question.mode === "quick");
  assert.equal(quick.length, 7);
  assert.ok(quick.some((question) => question.key === "delivery"));
  assert.ok(quick.some((question) => question.key === "patents"));
  assert.deepEqual(quick.find((question) => question.key === "dependencies")?.showWhen, { key: "delivery", equals: "application" });
  const advanced = model.questions.filter((question) => question.mode === "advanced");
  assert.ok(advanced.some((question) => question.key === "delivery"));
  assert.ok(advanced.some((question) => question.key === "dependencies"));
  assert.ok(advanced.some((question) => question.key === "patents"));
  assert.ok(advanced.some((question) => question.key === "openness"));
  assert.ok(advanced.some((question) => question.key === "commercialUse"));
  assert.ok(advanced.some((question) => question.key === "notices"));
  const dependencyQuestion = advanced.find((question) => question.key === "dependencies");
  assert.deepEqual(dependencyQuestion?.showWhen, { key: "delivery", equals: "application" });
});

test("patent and obligation answers match the catalog semantics", () => {
  const gpl = profile({
    id: "GPL-3.0-only",
    semantic: {
      ...profile().semantic,
      family: "strong-copyleft",
      copyleftScope: "whole-work",
      patentPosition: "retaliatory-termination",
      obligations: ["disclose-source", "provide-corresponding-source", "same-license"],
    },
  });
  assert.equal(recommendationEligibility(gpl, { patents: "important" }, context).eligible, true);
  assert.equal(recommendationEligibility(gpl, { obligations: "minimal" }, context).eligible, false);
});

test("guide copy translates explanatory messages while preserving technical enum values", () => {
  assert.equal(guideMessage("hard constraints evaluated before ranking"), "Tvrdé podmínky se vyhodnocují před řazením.");
  assert.equal(guideMessage("branch=source-available-or-proprietary"), "Větev: source-available-or-proprietary");
  assert.equal(guideMessage("dependency-analysis=no-requested"), "Analýza závislostí: no-requested");
  assert.equal(guideMessage("No safe match: runtime catalog metadata is absent or unresolved. Review evidence before recommending a license."), "Bez bezpečné shody: metadata katalogu za běhu chybí nebo nejsou vyřešená. Před doporučením licence zkontrolujte evidenci.");
});

test("dependency input is fail-closed for malformed and unknown SPDX expressions", () => {
  const known = ["MIT", "Apache-2.0"];
  assert.deepEqual(parseDependencyInput("MIT AND (Apache-2.0)", known), {
    state: "valid", expression: "MIT AND (Apache-2.0)", identifiers: ["MIT", "Apache-2.0"], errors: [], unknown: [],
  });
  assert.equal(parseDependencyInput("MIT OR", known).state, "malformed");
  assert.equal(parseDependencyInput("UnknownLicense", known).state, "unknown");
  assert.deepEqual(parseDependencyInput("unknown", known), {
    state: "unknown", expression: "unknown", identifiers: [], errors: ["Dependencies were explicitly marked unknown."], unknown: [],
  });
});

test("dependency WITH requires an exception identifier rather than any known SPDX identifier", () => {
  assert.equal(parseDependencyInput("MIT WITH Apache-2.0", ["MIT", "Apache-2.0"], ["GPL-2.0-exception"]).state, "malformed");
  assert.equal(parseDependencyInput("MIT WITH GPL-2.0-exception", ["MIT"], ["GPL-2.0-exception"]).state, "valid");
  assert.equal(parseDependencyInput("GPL-2.0-exception", ["MIT"], ["GPL-2.0-exception"]).state, "malformed");
  assert.equal(parseDependencyInput("MIT WITH Unknown-exception", ["MIT"], ["GPL-2.0-exception"]).state, "unknown");
});

test("recommendation result exposes status, confidence, trace, ties and next question", () => {
  const first = profile({ id: "Alpha" });
  const second = profile({ id: "Beta" });
  const result = recommendFromProfiles([first, second], { openness: "open", delivery: "internal" }, context);
  assert.equal(result.candidates[0]?.status, "good fit");
  assert.equal(result.candidates[0]?.fit, result.candidates[1]?.fit);
  assert.equal(result.candidates[0]?.evidenceConfidence, "sufficient");
  assert.ok(result.trace.length > 0);
  assert.equal(result.nextQuestion, "projectForm");
});

test("closed and proprietary intent are separate no-safe-match branches", () => {
  const cases: GuideAnswers[] = [
    { openness: "closed" },
    { proprietary: "required" },
    { proprietary: "allowed" },
    { proprietary: "preferred" },
  ];
  for (const answers of cases) {
    const result = recommendFromProfiles([profile()], answers, context);
    assert.equal(result.outcome, "no-safe-match", JSON.stringify(answers));
    assert.equal(result.branch, "source-available-or-proprietary", JSON.stringify(answers));
    assert.deepEqual(result.candidates, [], JSON.stringify(answers));
    assert.deepEqual(result.alternatives, [], JSON.stringify(answers));
    assert.match(result.guidance.join(" "), /no OSI|open-source|propriet/i, JSON.stringify(answers));
  }
});

test("catalog recommendation is explicitly unsafe when runtime metadata is absent", () => {
  const result = recommendFromCatalog([{ id: "MIT", type: "license", deprecated: false }], {}, context);
  assert.deepEqual(result.candidates, []);
  assert.match(result.guidance.join(" "), /No safe match/);
  assert.ok(result.unknowns.includes("catalog metadata"));
});

test("catalog recommendation uses the metadata namespace without deriving legal values", () => {
  const source = profile({ id: "MIT" });
  const result = recommendFromCatalog([{
    id: source.id,
    type: "license",
    deprecated: false,
    metadata: {
      contractVersion: "1.0.0",
      kind: "license",
      id: source.id,
      review: source.review,
      semantic: source.semantic,
      sourceFingerprint: source.sourceFingerprint,
      evidence: source.evidence ?? [],
    },
  }], { openness: "open" }, { ...context, knownIdentifiers: ["MIT"] });
  assert.equal(result.candidates[0]?.id, "MIT");
  assert.deepEqual(result.candidates[0]?.evidence, source.evidence);
  assert.equal(result.candidates[0]?.evidence.some((reference) => reference.field === "sourceFingerprint"), false);
});

test("project form is contextual while commercial use remains evidence-backed", () => {
  const applicationProfile = profile({
    semantic: { ...profile().semantic, projectForm: "application" } as MetadataLicenseProfile["semantic"],
  });
  assert.equal(recommendationEligibility(applicationProfile, { projectForm: "application" }, context).eligible, true);

  const missingProjectForm = recommendationEligibility(profile(), { projectForm: "application" }, context);
  assert.equal(missingProjectForm.eligible, true);
  assert.deepEqual(missingProjectForm.missingFields, []);
  const mismatchedProjectForm = recommendationEligibility(profile({ semantic: { ...profile().semantic, projectForm: "library" } as MetadataLicenseProfile["semantic"] }), { projectForm: "application" }, context);
  assert.equal(mismatchedProjectForm.eligible, true);

  const mismatchedReciprocity = recommendationEligibility(profile(), { reciprocity: "strong" }, context);
  assert.equal(mismatchedReciprocity.eligible, false);
  const mismatchedPatents = recommendationEligibility(profile({ semantic: { ...profile().semantic, patentPosition: "none-stated" } }), { patents: "important" }, context);
  assert.equal(mismatchedPatents.eligible, false);
  const mismatchedNotices = recommendationEligibility(profile({ semantic: { ...profile().semantic, noticeBurden: "minimal" } }), { notices: "standard" }, context);
  assert.equal(mismatchedNotices.eligible, false);

  assert.equal(recommendationEligibility(profile(), { commercialUse: "allowed" }, context).eligible, true);
  const missingCommercialPermission = recommendationEligibility(profile({ semantic: { ...profile().semantic, permissions: ["distribution"] } }), { commercialUse: "allowed" }, context);
  assert.equal(missingCommercialPermission.eligible, false);
  assert.ok(missingCommercialPermission.exclusionReasons.some((reason) => reason.includes("commercial-use")));

  const restricted = recommendFromProfiles([profile()], { commercialUse: "restricted" }, context);
  assert.equal(restricted.outcome, "no-safe-match");
  assert.deepEqual(restricted.candidates, []);
  assert.match(restricted.guidance.join(" "), /restricted|unsupported/i);
});

test("runtime answer boundary rejects unknown keys, invalid types/enums, and uncertainty states on every recommendation path", () => {
  const cases: Array<[string, unknown]> = [
    ["unknown key", { unexpected: "value" }],
    ["inherited-looking key", { toString: "open" }],
    ["invalid type", { openness: 42 }],
    ["invalid enum", { reciprocity: "bogus" }],
    ["unknown", { openness: "unknown" }],
    ["not-applicable", { openness: "not-applicable" }],
    ["undecided", { openness: "undecided" }],
  ];
  for (const [label, rawAnswers] of cases) {
    const answers = rawAnswers as GuideAnswers;
    assert.equal(recommendationEligibility(profile(), answers, context).eligible, false, label);
    assert.deepEqual(recommendFromProfiles([profile()], answers, context).candidates, [], label);
    assert.deepEqual(recommendFromCatalog([catalogRecord()], answers, { ...context, knownIdentifiers: ["MIT"] }).candidates, [], label);
  }
});

test("runtime answer boundary rejects inherited properties before downstream reads", () => {
  const inherited = Object.create({ dependencies: "MIT" }) as GuideAnswers;
  assert.equal(recommendationEligibility(profile(), inherited, { ...context, knownIdentifiers: ["MIT"] }).eligible, false);
  assert.deepEqual(recommendFromProfiles([profile()], inherited, { ...context, knownIdentifiers: ["MIT"] }).candidates, []);
  const inheritedUnknown = Object.create({ openness: "unknown" }) as GuideAnswers;
  assert.equal(recommendationEligibility(profile(), inheritedUnknown, context).eligible, false);
  assert.deepEqual(recommendFromProfiles([profile()], inheritedUnknown, context).candidates, []);
});

test("dependency validation is shared by eligibility and recommendation paths and honors context identifiers", () => {
  for (const dependencies of ["MIT OR", "GPL-3.0"]) {
    const answers = { dependencies } as GuideAnswers;
    assert.equal(recommendationEligibility(profile(), answers, { ...context, knownIdentifiers: ["MIT"] }).eligible, false, dependencies);
    assert.deepEqual(recommendFromProfiles([profile()], answers, { ...context, knownIdentifiers: ["MIT"] }).candidates, [], dependencies);
    assert.deepEqual(recommendFromCatalog([catalogRecord()], answers, { ...context, knownIdentifiers: ["MIT"] }).candidates, [], dependencies);
  }

  const valid = { dependencies: "MIT" } as GuideAnswers;
  assert.equal(recommendationEligibility(profile(), valid, { ...context, knownIdentifiers: ["MIT"] }).eligible, true);
  assert.equal(recommendFromProfiles([profile()], valid, { ...context, knownIdentifiers: ["MIT"] }).candidates.length, 1);
  assert.equal(recommendFromCatalog([catalogRecord()], valid, { ...context, knownIdentifiers: ["MIT"] }).candidates.length, 1);
  assert.deepEqual(recommendFromProfiles([profile()], valid, { ...context, knownIdentifiers: [] }).candidates, []);
});

test("empty answers remain valid with no hard constraints", () => {
  assert.equal(recommendationEligibility(profile(), {}, context).eligible, true);
  assert.equal(recommendFromProfiles([profile()], {}, context).candidates.length, 1);
  assert.equal(recommendFromCatalog([catalogRecord()], {}, context).candidates.length, 1);
});

test("catalog metadata validation rejects incomplete shape, invalid enums, fingerprints, and evidence", () => {
  const invalidRecords: Array<[string, CatalogMetadataRecord]> = [];
  const invalidReview = catalogRecord();
  invalidReview.metadata = { ...invalidReview.metadata!, review: { ...invalidReview.metadata!.review, status: "invalid" as never } };
  invalidRecords.push(["review", invalidReview]);

  const invalidSemantic = catalogRecord();
  invalidSemantic.metadata = { ...invalidSemantic.metadata!, semantic: { ...invalidSemantic.metadata!.semantic, family: "invalid" as never } };
  invalidRecords.push(["semantic", invalidSemantic]);

  const invalidFingerprint = catalogRecord();
  invalidFingerprint.metadata = { ...invalidFingerprint.metadata!, sourceFingerprint: { ...invalidFingerprint.metadata!.sourceFingerprint, contentHash: "" } };
  invalidRecords.push(["sourceFingerprint", invalidFingerprint]);

  const emptyEvidence = catalogRecord();
  emptyEvidence.metadata = { ...emptyEvidence.metadata!, evidence: [] };
  invalidRecords.push(["empty evidence", emptyEvidence]);

  const malformedEvidence = catalogRecord();
  malformedEvidence.metadata = { ...malformedEvidence.metadata!, evidence: [{ field: "", sourceId: "spdx-license-list", locator: "text" }] };
  invalidRecords.push(["field evidence", malformedEvidence]);

  const extraMetadata = catalogRecord();
  extraMetadata.metadata = { ...extraMetadata.metadata!, extra: true } as CatalogMetadataRecord["metadata"];
  invalidRecords.push(["metadata shape", extraMetadata]);

  for (const [label, record] of invalidRecords) {
    const result = recommendFromCatalog([record], {}, { ...context, knownIdentifiers: ["MIT"] });
    assert.equal(result.outcome, "no-safe-match", label);
    assert.deepEqual(result.candidates, [], label);
  }
});

test("LIC-008 correction: generated catalog envelope validates optional fields fail closed", () => {
  const generated = generatedCatalogRecord();
  const answers: GuideAnswers = {
    openness: "open",
    projectForm: "application",
    commercialUse: "allowed",
    patents: "important",
    notices: "minimal",
  };
  const valid = recommendFromCatalog([generated], answers, { ...context, knownIdentifiers: ["MIT"] });
  assert.equal(valid.outcome, "recommendation");
  assert.equal(valid.candidates[0]?.id, generated.id);
  assert.equal(valid.nextQuestion, "reciprocity");

  const malformedPermissions = {
    ...generated,
    permissions: ["commercial-use", 7],
  } as unknown as CatalogMetadataRecord;
  const blankName = { ...generated, name: "  " };
  const coercibleOsi = { ...generated, osi: "true" } as unknown as CatalogMetadataRecord;
  const unknownOuterKey = { ...generated, unexpected: true } as unknown as CatalogMetadataRecord;
  const malformedCases: Array<[string, CatalogMetadataRecord]> = [
    ["malformed permissions", malformedPermissions],
    ["blank name", blankName],
    ["coercible osi", coercibleOsi],
    ["unknown outer key", unknownOuterKey],
  ];

  for (const [label, record] of malformedCases) {
    const result = recommendFromCatalog([record], answers, { ...context, knownIdentifiers: ["MIT"] });
    assert.equal(result.outcome, "no-safe-match", label);
    assert.deepEqual(result.candidates, [], label);
    assert.deepEqual(result.alternatives, [], label);
  }
});

test("LIC-008 correction: deprecated true catalog records are rejected before recommendation", () => {
  const deprecated = generatedCatalogRecord();
  deprecated.deprecated = true;
  const answers: GuideAnswers = {
    openness: "open",
    projectForm: "application",
    commercialUse: "allowed",
    patents: "important",
    notices: "minimal",
  };

  assert.equal(metadataProfileFromCatalog(deprecated), null);
  const result = recommendFromCatalog([deprecated], answers, { ...context, knownIdentifiers: ["LIC-008-generated-fixture"] });
  assert.equal(result.outcome, "no-safe-match");
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.alternatives, []);
});

test("LIC-008 correction: SPDX WITH keeps license and exception namespaces separate across adapters", () => {
  const exceptionId = "GPL-2.0-exception";
  const records = [catalogRecord(), { id: exceptionId, type: "exception" } as CatalogMetadataRecord];
  const answers = { dependencies: `MIT WITH ${exceptionId}` } as GuideAnswers;
  const uiContext = { ...context, knownIdentifiers: ["MIT"], knownExceptionIdentifiers: [exceptionId] };
  const catalogAdapterContext = {
    ...context,
    knownIdentifiers: records.filter((record) => record.type === "license").map((record) => record.id),
    knownExceptionIdentifiers: records.filter((record) => record.type === "exception").map((record) => record.id),
  };
  const direct = recommendFromCatalog(records, answers, uiContext);
  const catalogAdapter = recommendFromCatalog(records, answers, catalogAdapterContext);

  assert.equal(direct.outcome, "recommendation");
  assert.deepEqual(
    {
      outcome: direct.outcome,
      branch: direct.branch,
      unknowns: direct.unknowns,
      candidates: direct.candidates.map(({ id, status, evidenceConfidence }) => ({ id, status, evidenceConfidence })),
    },
    {
      outcome: catalogAdapter.outcome,
      branch: catalogAdapter.branch,
      unknowns: catalogAdapter.unknowns,
      candidates: catalogAdapter.candidates.map(({ id, status, evidenceConfidence }) => ({ id, status, evidenceConfidence })),
    },
  );
  assert.deepEqual(uiContext, catalogAdapterContext);
  assert.equal(parseDependencyInput(exceptionId, ["MIT"], [exceptionId]).state, "malformed");
  assert.equal(parseDependencyInput(`MIT WITH ${exceptionId} WITH ${exceptionId}`, ["MIT"], [exceptionId]).state, "malformed");
});

test("LIC-008 correction: answer boundary rejects symbols and non-enumerable keys without executing accessors", () => {
  const symbolAnswers = Object.create(null) as Record<PropertyKey, unknown>;
  Object.defineProperty(symbolAnswers, Symbol("answer"), { enumerable: true, value: "open" });
  assert.equal(recommendationEligibility(profile(), symbolAnswers, context).eligible, false);

  const nonEnumerableAnswers = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(nonEnumerableAnswers, "openness", { enumerable: false, value: "open" });
  assert.equal(recommendationEligibility(profile(), nonEnumerableAnswers, context).eligible, false);

  let getterCalls = 0;
  const accessorAnswers = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(accessorAnswers, "openness", {
    enumerable: true,
    get: () => { getterCalls += 1; return "open"; },
  });
  assert.equal(recommendationEligibility(profile(), accessorAnswers, context).eligible, false);
  assert.equal(getterCalls, 0);

  const plainNullPrototypeAnswers = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(plainNullPrototypeAnswers, "openness", { enumerable: true, value: "open" });
  assert.equal(recommendationEligibility(profile(), plainNullPrototypeAnswers, context).eligible, true);
});

test("LIC-008 correction: reviewed candidates with unknown semantic evidence cannot claim a recommendation", () => {
  const unresolvedFamily = profile({ semantic: { ...profile().semantic, family: "unknown" } });
  const result = recommendFromProfiles([unresolvedFamily], {}, context);

  assert.equal(result.outcome, "insufficient-evidence");
  assert.equal(result.candidates[0]?.status, "insufficient evidence");
  assert.ok(result.unknowns.includes("MIT: semantic.family"));
  assert.match(result.guidance.join(" "), /insufficient|unknown|evidence/i);
});

test("LIC-008 strict correction: nested accessor answer values are rejected without invoking nested getters", () => {
  let getterCalls = 0;
  const nested = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(nested, "trap", {
    enumerable: true,
    get: () => { getterCalls += 1; return "open"; },
  });
  const answers = { openness: nested } as unknown as GuideAnswers;

  assert.equal(recommendationEligibility(profile(), answers, context).eligible, false);
  assert.equal(getterCalls, 0);
});

test("LIC-008 strict correction: metadata arrays are descriptor-safe and fail closed without getter execution", () => {
  const malformedPermissionArrays: Array<[string, unknown]> = [];

  const permissionAccessor = ["commercial-use"];
  Object.defineProperty(permissionAccessor, "0", { enumerable: true, get: () => "commercial-use" });
  malformedPermissionArrays.push(["permission accessor", permissionAccessor]);

  const permissionSymbol = ["commercial-use"];
  Object.defineProperty(permissionSymbol, Symbol("extra"), { enumerable: true, value: "commercial-use" });
  malformedPermissionArrays.push(["permission symbol", permissionSymbol]);

  const permissionExtra = ["commercial-use"];
  Object.defineProperty(permissionExtra, "extra", { enumerable: false, value: "commercial-use" });
  malformedPermissionArrays.push(["permission non-enumerable extra", permissionExtra]);

  malformedPermissionArrays.push(["permission hole", new Array(1)]);
  const permissionCustomPrototype = ["commercial-use"];
  Object.setPrototypeOf(permissionCustomPrototype, { custom: true });
  malformedPermissionArrays.push(["permission custom prototype", permissionCustomPrototype]);

  for (const [label, permissions] of malformedPermissionArrays) {
    const candidate = profile({ semantic: { ...profile().semantic, permissions: permissions as string[] } });
    assert.equal(recommendationEligibility(candidate, {}, context).eligible, false, label);
  }

  let getterCalls = 0;
  const evidenceAccessor = [profile().evidence![0]];
  Object.defineProperty(evidenceAccessor, "0", {
    enumerable: true,
    get: () => { getterCalls += 1; return profile().evidence![0]; },
  });
  const evidenceCandidate = profile({ evidence: evidenceAccessor });
  assert.equal(recommendationEligibility(evidenceCandidate, {}, context).eligible, false);
  assert.equal(getterCalls, 0);

  const evidenceItem = { ...profile().evidence![0] };
  Object.defineProperty(evidenceItem, "field", {
    enumerable: true,
    get: () => { getterCalls += 1; return "family"; },
  });
  const evidenceItemCandidate = profile({ evidence: [evidenceItem] });
  assert.equal(recommendationEligibility(evidenceItemCandidate, {}, context).eligible, false);
  assert.equal(getterCalls, 0);
});

test("LIC-008 strict correction: application dependency constraints short-circuit catalog mapping before ranking", () => {
  const cases: Array<[string, GuideAnswers]> = [
    ["missing", { delivery: "application" }],
    ["malformed", { delivery: "application", dependencies: "MIT OR" }],
    ["unknown", { delivery: "application", dependencies: "No-Such-License" }],
  ];

  for (const [label, answers] of cases) {
    let mapCalls = 0;
    const records = {
      map: () => {
        mapCalls += 1;
        throw new Error("catalog mapping must not run before dependency hard constraints");
      },
    } as unknown as readonly CatalogMetadataRecord[];
    const first = recommendFromCatalog(records, answers, { ...context, knownIdentifiers: ["MIT"] });
    const second = recommendFromCatalog(records, answers, { ...context, knownIdentifiers: ["MIT"] });

    assert.equal(mapCalls, 0, label);
    assert.deepEqual(first, second, label);
    assert.equal(first.outcome, "no-safe-match", label);
    assert.deepEqual(first.candidates, [], label);
    assert.deepEqual(first.alternatives, [], label);
    assert.ok(first.unknowns.includes("dependencies"), label);
  }
});

test("LIC-008 bounded correction: direct profile recommendations require application dependencies", () => {
  const applicationProfile = profile({ semantic: { ...profile().semantic, copyleftScope: "whole-work" } });
  const result = recommendFromProfiles([applicationProfile], { delivery: "application" }, {
    ...context,
    knownIdentifiers: ["MIT"],
    guideMode: "advanced",
  });

  assert.equal(result.outcome, "no-safe-match");
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.alternatives, []);
  assert.equal(result.nextQuestion, "dependencies");
  assert.ok(result.unknowns.includes("dependencies"));
});

test("LIC-008 bounded correction: next question selection is mode-scoped and preserves conditions", () => {
  const advancedContext = { ...context, guideMode: "advanced" as const, knownIdentifiers: ["MIT"] };
  assert.equal(recommendFromProfiles([profile()], {}, advancedContext).nextQuestion, "delivery");
  assert.equal(recommendFromProfiles([profile()], { delivery: "library" }, advancedContext).nextQuestion, "copyleftTrigger");
  assert.equal(recommendFromProfiles([profile()], { delivery: "application" }, advancedContext).nextQuestion, "dependencies");

  const quick = recommendFromProfiles([profile()], { openness: "open" }, { ...context, guideMode: "quick" });
  assert.equal(quick.nextQuestion, "projectForm");
  assert.notEqual(quick.nextQuestion, "delivery");
});

test("LIC-008 bounded correction: API envelopes preserve mode and reject unknown outer keys", () => {
  assert.deepEqual(parseRecommendationInput({ delivery: "library" }), { answers: { delivery: "library" }, mode: "quick" });
  assert.deepEqual(parseRecommendationInput({ mode: "advanced", requirements: { delivery: "application" } }), { answers: { delivery: "application" }, mode: "advanced" });
  assert.throws(() => parseRecommendationInput({ mode: "advanced", requirements: {}, extra: true }), /only mode and requirements/);
  assert.throws(() => parseRecommendationInput({ mode: "sideways", requirements: {} }), /quick or advanced/);

  const advanced = recommendFromProfiles([profile()], { delivery: "application" }, { ...context, guideMode: "advanced" });
  assert.equal(advanced.guideModelVersion, GUIDE_MODEL_VERSION);
  assert.equal(advanced.guideMode, "advanced");
  assert.equal(advanced.nextQuestion, "dependencies");
});

test("LIC-008 bounded correction: every interactive question exposes explicit uncertainty options", () => {
  const model = buildGuideModel();
  for (const question of model.questions) {
    const values = question.options.map((option) => option.value);
    assert.ok(values.includes("not-applicable"), question.id);
    assert.ok(values.includes("undecided"), question.id);
  }

  const uncertain: GuideAnswers = { delivery: "undecided" };
  const result = recommendFromProfiles([profile()], uncertain, context);
  assert.equal(result.outcome, "no-safe-match");
  assert.deepEqual(result.candidates, []);
});

test("LIC-008 bounded correction: hostile profile kind and extra keys fail closed without coercion", () => {
  let getterCalls = 0;
  const hostileKind = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(hostileKind, "toString", {
    enumerable: true,
    get: () => {
      getterCalls += 1;
      throw new Error("kind coercion must not run");
    },
  });
  const hostile = { ...profile(), kind: hostileKind, extra: true } as unknown as MetadataLicenseProfile;

  assert.doesNotThrow(() => recommendationEligibility(hostile, {}, context));
  const eligibility = recommendationEligibility(hostile, {}, context);
  const result = recommendFromProfiles([hostile], {}, context);
  assert.equal(eligibility.eligible, false);
  assert.equal(result.outcome, "no-safe-match");
  assert.deepEqual(result.candidates, []);
  assert.equal(getterCalls, 0);
});

test("LIC-008 regression: inherited dependency answers are never consulted downstream", () => {
  const objectPrototype = Object.prototype as Record<string, unknown>;
  const previous = objectPrototype.dependencies;
  objectPrototype.dependencies = "MIT";
  try {
    const answers = { delivery: "application" } as GuideAnswers;
    const result = recommendFromProfiles([profile()], answers, { ...context, knownIdentifiers: ["MIT"] });
    assert.equal(result.outcome, "no-safe-match");
    assert.equal(result.nextQuestion, "dependencies");
    assert.ok(result.unknowns.includes("dependencies"));
  } finally {
    if (previous === undefined) delete objectPrototype.dependencies;
    else objectPrototype.dependencies = previous;
  }
});

test("LIC-008 regression: throwing proxies fail closed on every recommendation entry point", () => {
  const hostile = new Proxy(profile(), {
    get: () => { throw new Error("hostile profile read"); },
  }) as unknown as MetadataLicenseProfile;
  assert.doesNotThrow(() => recommendationEligibility(hostile, {}, context));
  assert.doesNotThrow(() => recommendFromProfiles([hostile], {}, context));
  assert.doesNotThrow(() => recommendFromCatalog([hostile as unknown as CatalogMetadataRecord], {}, context));
  assert.deepEqual(recommendFromProfiles([hostile], {}, context).candidates, []);
});

test("LIC-008 regression: runtime source-lock readiness is derived from catalog metadata", () => {
  const valid = catalogRecord();
  assert.equal(runtimeSourceLockResolved([valid]), true);
  assert.equal(runtimeSourceLockResolved([{ ...valid, metadata: undefined }]), false);
  assert.equal(runtimeSourceLockResolved([{ ...valid, metadata: { ...valid.metadata!, sourceFingerprint: { ...valid.metadata!.sourceFingerprint, revision: "unresolved" } } }]), false);
  assert.equal(runtimeSourceLockResolved([{ ...valid, metadata: { ...valid.metadata!, sourceFingerprint: { ...valid.metadata!.sourceFingerprint, sourceId: "unknown-source" } } }]), false);
  assert.equal(runtimeSourceLockResolved([{ ...valid, metadata: { ...valid.metadata!, evidence: [] } }]), false);
});
