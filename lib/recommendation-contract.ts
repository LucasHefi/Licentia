export type ReviewStatus = "blocked" | "not-recommendable" | "pending" | "reviewed" | "stale";
export type EvidenceLevel = "strong" | "sufficient" | "unknown" | "weak";
export type LicenseFamily = "network-copyleft" | "nonstandard" | "permissive" | "public-domain-equivalent" | "strong-copyleft" | "unknown" | "weak-copyleft";
export type CopyleftScope = "file" | "library" | "network" | "none" | "unknown" | "whole-work";
export type PatentPosition = "defensive-termination" | "express-grant" | "none-stated" | "retaliatory-termination" | "unknown";
export type NoticeBurden = "material" | "minimal" | "none" | "standard" | "unknown";
export type SemanticValue = string;

export interface MetadataLicenseProfile {
  id: string;
  kind: "license" | "exception";
  review: { status: ReviewStatus; recommendable: boolean; evidenceLevel: EvidenceLevel };
  sourceFingerprint: { sourceId: string; revision: string; contentHash: string };
  semantic: {
    family: LicenseFamily;
    copyleftScope: CopyleftScope;
    permissions: SemanticValue[];
    obligations: SemanticValue[];
    triggers: SemanticValue[];
    restrictions: SemanticValue[];
    patentPosition: PatentPosition;
    noticeBurden: NoticeBurden;
  };
}

export interface GuideAnswers {
  openness?: "open" | "closed" | "undecided";
  reciprocity?: "none" | "file" | "library" | "strong" | "network";
  delivery?: "library" | "application" | "saas" | "internal";
  patents?: "important" | "neutral";
  notices?: "minimal" | "standard";
  jurisdiction?: "eu" | "global";
}

export interface RecommendationContext {
  sourceLockResolved: boolean;
  ruleVersion: string;
}

export interface EligibilityResult {
  eligible: boolean;
  exclusionReasons: string[];
  missingFields: string[];
  unsupportedFields: string[];
  reasons: string[];
}

export interface RecommendationCandidate {
  profile: MetadataLicenseProfile;
  id: string;
  score: number;
  reasons: string[];
  matchedFields: string[];
}

export interface RecommendationResult {
  ruleVersion: string;
  advisory: true;
  candidates: RecommendationCandidate[];
}

const dimensions = ["openness", "reciprocity", "delivery", "patents", "notices"] as const;
const knownFamilies = new Set<LicenseFamily>(["network-copyleft", "nonstandard", "permissive", "public-domain-equivalent", "strong-copyleft", "weak-copyleft"]);
const knownScopes = new Set<CopyleftScope>(["file", "library", "network", "none", "whole-work"]);
const knownPatents = new Set<PatentPosition>(["defensive-termination", "express-grant", "none-stated", "retaliatory-termination"]);
const knownNotices = new Set<NoticeBurden>(["material", "minimal", "none", "standard"]);

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function unresolved(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || value === "unresolved";
}

function exclusion(result: EligibilityResult, reason: string): void {
  result.exclusionReasons.push(reason);
}

function requiredSemantic(profile: MetadataLicenseProfile, field: string, value: unknown, known: Set<string>, result: EligibilityResult): boolean {
  if (!hasValue(value) || value === "unknown" || (Array.isArray(value) && (value.length === 0 || value.includes("unknown")))) {
    result.missingFields.push(`semantic.${field}`);
    exclusion(result, `semantic.${field}: unknown or missing evidence`);
    return false;
  }
  if ((typeof value === "string" && !known.has(value)) || (Array.isArray(value) && value.some((item) => typeof item !== "string" || !known.has(item)))) {
    result.unsupportedFields.push(`semantic.${field}`);
    exclusion(result, `semantic.${field}: unsupported value`);
    return false;
  }
  return true;
}

function match(profile: MetadataLicenseProfile, answers: GuideAnswers): { score: number; reasons: string[]; matchedFields: string[] } {
  const { semantic } = profile;
  let score = 0;
  const reasons: string[] = [];
  const matchedFields: string[] = [];
  const add = (field: string, points: number, reason: string) => { score += points; matchedFields.push(field); reasons.push(`${field}: ${reason}`); };
  if (answers.openness === "open" && knownFamilies.has(semantic.family)) add("family", 10, "matches openness=open");
  if (answers.openness === "closed" && ["permissive", "public-domain-equivalent"].includes(semantic.family)) add("family", 10, "matches openness=closed");
  const reciprocity: Record<NonNullable<GuideAnswers["reciprocity"]>, CopyleftScope> = { none: "none", file: "file", library: "library", strong: "whole-work", network: "network" };
  if (answers.reciprocity && semantic.copyleftScope === reciprocity[answers.reciprocity]) add("copyleftScope", 20, `matches reciprocity=${answers.reciprocity}`);
  const delivery: Record<NonNullable<GuideAnswers["delivery"]>, CopyleftScope> = { library: "library", application: "whole-work", saas: "network", internal: "none" };
  if (answers.delivery && semantic.copyleftScope === delivery[answers.delivery]) add("copyleftScope", 15, `matches delivery=${answers.delivery}`);
  if (answers.patents === "important" && semantic.patentPosition === "express-grant") add("patentPosition", 12, "matches patents=important");
  if (answers.patents === "neutral" && knownPatents.has(semantic.patentPosition)) add("patentPosition", 4, "matches patents=neutral");
  if (answers.notices === "minimal" && ["minimal", "none"].includes(semantic.noticeBurden)) add("noticeBurden", 8, "matches notices=minimal");
  if (answers.notices === "standard" && ["standard", "material"].includes(semantic.noticeBurden)) add("noticeBurden", 5, "matches notices=standard");
  return { score, reasons, matchedFields };
}

export function recommendationEligibility(profile: MetadataLicenseProfile, answers: GuideAnswers, context: RecommendationContext): EligibilityResult {
  const result: EligibilityResult = { eligible: true, exclusionReasons: [], missingFields: [], unsupportedFields: [], reasons: [] };
  if (profile.kind !== "license") exclusion(result, "kind: only license profiles are recommendable");
  if (profile.review.status !== "reviewed") exclusion(result, `review.status: ${profile.review.status} is not reviewed`);
  if (profile.review.recommendable !== true) exclusion(result, "review.recommendable: false");
  if (!["sufficient", "strong"].includes(profile.review.evidenceLevel)) exclusion(result, `review.evidenceLevel: ${profile.review.evidenceLevel} is insufficient`);
  if (context.sourceLockResolved !== true) exclusion(result, "context.sourceLockResolved: false");
  if (unresolved(profile.sourceFingerprint?.revision)) exclusion(result, "sourceFingerprint.revision: unresolved");
  if (unresolved(profile.sourceFingerprint?.contentHash)) exclusion(result, "sourceFingerprint.contentHash: unresolved");
  if (unresolved(profile.sourceFingerprint?.sourceId)) exclusion(result, "sourceFingerprint.sourceId: unresolved");
  if (hasValue(answers.jurisdiction)) {
    result.unsupportedFields.push("jurisdiction");
    exclusion(result, "jurisdiction: unsupported until metadata provides jurisdiction");
  }
  const required: Record<string, [unknown, Set<string>]> = {};
  if (hasValue(answers.openness)) required.family = [profile.semantic?.family, knownFamilies];
  if (hasValue(answers.reciprocity) || hasValue(answers.delivery)) required.copyleftScope = [profile.semantic?.copyleftScope, knownScopes];
  if (hasValue(answers.patents)) required.patentPosition = [profile.semantic?.patentPosition, knownPatents];
  if (hasValue(answers.notices)) required.noticeBurden = [profile.semantic?.noticeBurden, knownNotices];
  for (const [field, [value, known]] of Object.entries(required)) requiredSemantic(profile, field, value, known, result);
  if (result.exclusionReasons.length === 0) {
    const matched = match(profile, answers);
    result.reasons = matched.reasons;
  }
  result.eligible = result.exclusionReasons.length === 0;
  return result;
}

export function recommendFromProfiles(profiles: readonly MetadataLicenseProfile[], answers: GuideAnswers, context: RecommendationContext): RecommendationResult {
  const candidates = profiles.flatMap((profile) => {
    const eligibility = recommendationEligibility(profile, answers, context);
    if (!eligibility.eligible) return [];
    const scored = match(profile, answers);
    return [{ profile, id: profile.id, score: scored.score, reasons: scored.reasons, matchedFields: scored.matchedFields }];
  });
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { ruleVersion: context.ruleVersion, advisory: true, candidates: candidates.slice(0, 5) };
}
