export const GUIDE_MODEL_VERSION = "lic-008-guide-v1";
export type ReviewStatus = "blocked" | "not-recommendable" | "pending" | "reviewed" | "stale";
export type EvidenceLevel = "strong" | "sufficient" | "unknown" | "weak";
export type LicenseFamily = "network-copyleft" | "nonstandard" | "permissive" | "public-domain-equivalent" | "strong-copyleft" | "unknown" | "weak-copyleft";
export type CopyleftScope = "file" | "library" | "network" | "none" | "unknown" | "whole-work";
export type PatentPosition = "defensive-termination" | "express-grant" | "none-stated" | "retaliatory-termination" | "unknown";
export type NoticeBurden = "material" | "minimal" | "none" | "standard" | "unknown";
export type ProjectForm = "library" | "application" | "service" | "plugin" | "unknown";
export type SemanticValue = string;
export type AnswerState = "unknown" | "not-applicable" | "undecided";
export type GuideMode = "quick" | "advanced";
export type CandidateStatus = "good fit" | "review required" | "insufficient evidence" | "excluded";

export interface EvidenceReference {
  field: string;
  sourceId: string;
  locator: string;
  ruleId?: string;
  ruleVersion?: string;
}

export type MetadataEvidence = EvidenceReference;

export interface MetadataLicenseProfile {
  id: string;
  kind: "license" | "exception";
  deprecated?: boolean;
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
    projectForm?: ProjectForm;
  };
  evidence?: readonly EvidenceReference[];
}

export interface CatalogMetadataRecord {
  id: string;
  type: "license" | "exception";
  deprecated?: boolean;
  name?: string;
  osi?: boolean;
  fsf?: boolean;
  profiled?: boolean;
  permissions?: readonly string[];
  conditions?: readonly string[];
  limitations?: readonly string[];
  metadata?: {
    contractVersion?: string;
    kind: "license" | "exception";
    id: string;
    review: MetadataLicenseProfile["review"];
    semantic: MetadataLicenseProfile["semantic"];
    sourceFingerprint: MetadataLicenseProfile["sourceFingerprint"];
    evidence: readonly MetadataEvidence[];
  };
}

export interface GuideAnswers {
  openness?: "open" | "closed" | AnswerState;
  reciprocity?: "none" | "file" | "library" | "strong" | "network" | AnswerState;
  delivery?: "library" | "application" | "saas" | "internal" | AnswerState;
  patents?: "important" | "neutral" | AnswerState;
  notices?: "minimal" | "standard" | AnswerState;
  jurisdiction?: "eu" | "global" | AnswerState;
  projectForm?: "library" | "application" | "service" | "plugin" | AnswerState;
  commercialUse?: "allowed" | "restricted" | AnswerState;
  proprietary?: "allowed" | "preferred" | "required" | AnswerState;
  copyleftTrigger?: "distribution" | "network" | "none" | AnswerState;
  trademarks?: "important" | "neutral" | AnswerState;
  obligations?: "notices" | "source" | "installation" | "minimal" | AnswerState;
  dependencies?: string | AnswerState;
  versionStrategy?: "fixed" | "later" | "either" | AnswerState;
  dualLicensing?: "yes" | "no" | "considering" | AnswerState;
  futureDistribution?: "public" | "commercial" | "internal" | AnswerState;
}

export interface GuideQuestion {
  id: string;
  key: keyof GuideAnswers;
  mode: GuideMode;
  title: string;
  help: string;
  options: readonly { value: string; label: string }[];
  showWhen?: { key: keyof GuideAnswers; equals: string };
}

export interface GuideModel { version: string; questions: readonly GuideQuestion[]; }

export interface RecommendationContext {
  sourceLockResolved: boolean;
  ruleVersion: string;
  knownIdentifiers?: readonly string[];
  knownExceptionIdentifiers?: readonly string[];
  guideMode?: GuideMode;
}

const runtimeSourceIds = new Set(["spdx-license-list", "spdx-exception-list", "choose-a-license"]);
const unresolvedFingerprint = (value: unknown): boolean => typeof value !== "string" || value.trim() === "" || ["unknown", "unresolved", "pending"].includes(value.trim().toLowerCase());

export function runtimeSourceLockResolved(records: readonly CatalogMetadataRecord[]): boolean {
  const licenses = records.filter((record) => record && record.type === "license");
  if (!licenses.length) return false;
  return licenses.every((record) => {
    const fingerprint = record.metadata?.sourceFingerprint;
    if (!fingerprint || unresolvedFingerprint(fingerprint.sourceId) || unresolvedFingerprint(fingerprint.revision) || unresolvedFingerprint(fingerprint.contentHash) || !runtimeSourceIds.has(fingerprint.sourceId)) return false;
    return Array.isArray(record.metadata?.evidence) && record.metadata.evidence.length > 0 && record.metadata.evidence.every((item) => runtimeSourceIds.has(item.sourceId));
  });
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
  status: CandidateStatus;
  fit: number;
  evidenceConfidence: EvidenceLevel;
  conflicts: string[];
  unknowns: string[];
  obligations: string[];
  evidence: EvidenceReference[];
}

export interface RecommendationResult {
  guideModelVersion?: string;
  guideMode?: GuideMode;
  outcome: "recommendation" | "insufficient-evidence" | "no-safe-match";
  ruleVersion: string;
  advisory: true;
  candidates: RecommendationCandidate[];
  alternatives: RecommendationCandidate[];
  trace: string[];
  conflicts: string[];
  unknowns: string[];
  obligations: string[];
  guidance: string[];
  branch: "open-source" | "source-available-or-proprietary";
  nextQuestion?: keyof GuideAnswers;
}

const uncertaintyOptions: readonly { value: AnswerState; label: string }[] = [
  { value: "unknown", label: "Nevím" },
  { value: "not-applicable", label: "Není relevantní" },
  { value: "undecided", label: "Nerozhodnuto" },
];

const guideQuestions: GuideQuestion[] = [
  { id: "q-openness", key: "openness", mode: "quick", title: "Má zůstat software otevřený?", help: "Rozlišuje open-source větev od proprietární strategie.", options: [{ value: "open", label: "Ano" }, { value: "closed", label: "Povolím uzavřené použití" }, ...uncertaintyOptions] },
  { id: "q-project-form", key: "projectForm", mode: "quick", title: "Co distribuujete?", help: "Forma projektu určuje relevantní povinnosti.", options: [{ value: "application", label: "Aplikaci" }, { value: "library", label: "Knihovnu" }, { value: "service", label: "Službu" }, ...uncertaintyOptions] },
  { id: "q-reciprocity", key: "reciprocity", mode: "quick", title: "Jaký rozsah sdílení změn chcete?", help: "Copyleft se může týkat souboru, knihovny, díla nebo síťového užití.", options: [{ value: "none", label: "Žádný" }, { value: "file", label: "Soubor" }, { value: "library", label: "Knihovna" }, { value: "strong", label: "Celé dílo" }, { value: "network", label: "Síťová služba" }, ...uncertaintyOptions] },
  { id: "q-commercial-use", key: "commercialUse", mode: "quick", title: "Bude software komerčně použit?", help: "Neznámá odpověď nesmí splnit hard constraint.", options: [{ value: "allowed", label: "Ano" }, { value: "restricted", label: "Omezeně" }, ...uncertaintyOptions] },
  { id: "q-delivery-quick", key: "delivery", mode: "quick", title: "Jak software dodáte?", help: "Distribuce a SaaS aktivují odlišné povinnosti.", options: [{ value: "application", label: "Aplikace" }, { value: "library", label: "Knihovna" }, { value: "saas", label: "SaaS" }, { value: "internal", label: "Interně" }, ...uncertaintyOptions] },
  { id: "q-patents-quick", key: "patents", mode: "quick", title: "Jsou důležité patenty?", help: "Výslovné oprávnění je evidence-backed kritérium.", options: [{ value: "important", label: "Ano" }, { value: "neutral", label: "Neřeším" }, ...uncertaintyOptions] },
  { id: "q-delivery-advanced", key: "delivery", mode: "advanced", title: "Jak software dodáte?", help: "Distribuce a SaaS aktivují odlišné povinnosti.", options: [{ value: "application", label: "Aplikace" }, { value: "library", label: "Knihovna" }, { value: "saas", label: "SaaS" }, { value: "internal", label: "Interně" }, ...uncertaintyOptions] },
  { id: "q-dependencies", key: "dependencies", mode: "advanced", title: "Jaké máte závislosti?", help: "SPDX výraz nebo SBOM lze ověřit bez tichého přijetí chyby.", options: uncertaintyOptions, showWhen: { key: "delivery", equals: "application" } },
  { id: "q-copyleft-trigger", key: "copyleftTrigger", mode: "advanced", title: "Kdy se má povinnost aktivovat?", help: "Rozlišuje distribuci od síťového poskytnutí.", options: [{ value: "distribution", label: "Při distribuci" }, { value: "network", label: "I v síti" }, { value: "none", label: "Bez copyleftu" }, ...uncertaintyOptions] },
  { id: "q-patents-advanced", key: "patents", mode: "advanced", title: "Jsou důležité patenty?", help: "Výslovné oprávnění je evidence-backed kritérium.", options: [{ value: "important", label: "Ano" }, { value: "neutral", label: "Neřeším" }, ...uncertaintyOptions] },
  { id: "q-trademarks", key: "trademarks", mode: "advanced", title: "Potřebujete řešit ochranné známky?", help: "Licence obvykle neposkytuje trademark práva.", options: [{ value: "important", label: "Ano" }, { value: "neutral", label: "Ne" }, ...uncertaintyOptions] },
  { id: "q-obligations", key: "obligations", mode: "advanced", title: "Jaké povinnosti zvládnete?", help: "Notices, zdroj a instalační informace se posuzují explicitně.", options: [{ value: "minimal", label: "Minimum" }, { value: "notices", label: "Notices" }, { value: "source", label: "Zdroj" }, { value: "installation", label: "Zdroj a instalace" }, ...uncertaintyOptions] },
  { id: "q-version-strategy", key: "versionStrategy", mode: "advanced", title: "Jak pracovat s budoucími verzemi?", help: "Volba pozdější licence není automatická kompatibilita.", options: [{ value: "fixed", label: "Pevná verze" }, { value: "later", label: "Pozdější verze" }, { value: "either", label: "Obojí" }, ...uncertaintyOptions] },
  { id: "q-dual-licensing", key: "dualLicensing", mode: "advanced", title: "Zvažujete duální licenci?", help: "Výsledek je strategická otázka, ne právní závěr.", options: [{ value: "yes", label: "Ano" }, { value: "no", label: "Ne" }, { value: "considering", label: "Zvažuji" }, ...uncertaintyOptions] },
  { id: "q-future-distribution", key: "futureDistribution", mode: "advanced", title: "Jaká je budoucí distribuce?", help: "Zachytí veřejné, komerční a interní scénáře.", options: [{ value: "public", label: "Veřejná" }, { value: "commercial", label: "Komerční" }, { value: "internal", label: "Interní" }, ...uncertaintyOptions] },
];

export function buildGuideModel(): GuideModel { return { version: GUIDE_MODEL_VERSION, questions: guideQuestions }; }

export const DEFAULT_NON_UI_GUIDE_MODE: GuideMode = "quick";

export const GUIDE_ANSWER_INPUT_SCHEMA = {
  oneOf: [
    { type: "object", additionalProperties: false, properties: {
    openness: { enum: ["open", "closed", "undecided", "unknown", "not-applicable"] },
    reciprocity: { enum: ["none", "file", "library", "strong", "network", "unknown", "not-applicable", "undecided"] },
    delivery: { enum: ["library", "application", "saas", "internal", "unknown", "not-applicable", "undecided"] },
    patents: { enum: ["important", "neutral", "unknown", "not-applicable", "undecided"] },
    notices: { enum: ["minimal", "standard", "unknown", "not-applicable", "undecided"] },
    jurisdiction: { enum: ["eu", "global", "unknown", "not-applicable", "undecided"] },
    projectForm: { enum: ["library", "application", "service", "plugin", "unknown", "not-applicable", "undecided"] },
    commercialUse: { enum: ["allowed", "restricted", "unknown", "not-applicable", "undecided"] },
    proprietary: { enum: ["allowed", "preferred", "required", "unknown", "not-applicable", "undecided"] },
    copyleftTrigger: { enum: ["distribution", "network", "none", "unknown", "not-applicable", "undecided"] },
    trademarks: { enum: ["important", "neutral", "unknown", "not-applicable", "undecided"] },
    obligations: { enum: ["notices", "source", "installation", "minimal", "unknown", "not-applicable", "undecided"] },
    dependencies: { type: "string", description: "SPDX expression, or the explicit string unknown/not-applicable" },
    versionStrategy: { enum: ["fixed", "later", "either", "unknown", "not-applicable", "undecided"] },
    dualLicensing: { enum: ["yes", "no", "considering", "unknown", "not-applicable", "undecided"] },
    futureDistribution: { enum: ["public", "commercial", "internal", "unknown", "not-applicable", "undecided"] },
    } },
    { type: "object", additionalProperties: false, required: ["requirements"], properties: {
      mode: { enum: ["quick", "advanced"] },
      requirements: { type: "object", additionalProperties: false, properties: {
        openness: { enum: ["open", "closed", "undecided", "unknown", "not-applicable"] },
        reciprocity: { enum: ["none", "file", "library", "strong", "network", "unknown", "not-applicable", "undecided"] },
        delivery: { enum: ["library", "application", "saas", "internal", "unknown", "not-applicable", "undecided"] },
        patents: { enum: ["important", "neutral", "unknown", "not-applicable", "undecided"] },
        notices: { enum: ["minimal", "standard", "unknown", "not-applicable", "undecided"] },
        jurisdiction: { enum: ["eu", "global", "unknown", "not-applicable", "undecided"] },
        projectForm: { enum: ["library", "application", "service", "plugin", "unknown", "not-applicable", "undecided"] },
        commercialUse: { enum: ["allowed", "restricted", "unknown", "not-applicable", "undecided"] },
        proprietary: { enum: ["allowed", "preferred", "required", "unknown", "not-applicable", "undecided"] },
        copyleftTrigger: { enum: ["distribution", "network", "none", "unknown", "not-applicable", "undecided"] },
        trademarks: { enum: ["important", "neutral", "unknown", "not-applicable", "undecided"] },
        obligations: { enum: ["notices", "source", "installation", "minimal", "unknown", "not-applicable", "undecided"] },
        dependencies: { type: "string" },
        versionStrategy: { enum: ["fixed", "later", "either", "unknown", "not-applicable", "undecided"] },
        dualLicensing: { enum: ["yes", "no", "considering", "unknown", "not-applicable", "undecided"] },
        futureDistribution: { enum: ["public", "commercial", "internal", "unknown", "not-applicable", "undecided"] },
      } },
    } },
  ],
} as const;

export type RecommendationInput = { answers: GuideAnswers; mode: GuideMode };

export function parseRecommendationInput(value: unknown): RecommendationInput {
  if (!answerRecord(value)) throw new Error("Recommendation input must be an answer object or {mode, requirements} envelope.");
  const keys = Object.keys(value);
  const envelope = keys.includes("requirements") || keys.includes("mode");
  if (!envelope) return { answers: value as GuideAnswers, mode: DEFAULT_NON_UI_GUIDE_MODE };
  if (!keys.every((key) => key === "mode" || key === "requirements") || !answerRecord(value.requirements)) throw new Error("Recommendation envelope may contain only mode and requirements.");
  if (value.mode !== undefined && value.mode !== "quick" && value.mode !== "advanced") throw new Error("Recommendation mode must be quick or advanced.");
  return { answers: value.requirements as GuideAnswers, mode: (value.mode ?? DEFAULT_NON_UI_GUIDE_MODE) as GuideMode };
}

export interface DependencyParseResult { state: "valid" | "malformed" | "unknown"; expression: string; identifiers: string[]; errors: string[]; unknown: string[]; }

export function parseDependencyInput(input: unknown, knownIdentifiers: readonly string[], knownExceptionIdentifiers: readonly string[] = []): DependencyParseResult {
  const expression = typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
  const identifiers = [...new Set(expression.match(/[A-Za-z0-9][A-Za-z0-9.-]*/g) ?? [])].filter((x) => !["AND", "OR", "WITH"].includes(x.toUpperCase()));
  const knownLicenses = new Set(knownIdentifiers);
  const knownExceptions = new Set(knownExceptionIdentifiers);
  const unknown = identifiers.filter((id) => !knownLicenses.has(id) && !knownExceptions.has(id));
  if (!expression) return { state: "malformed", expression, identifiers, errors: ["Expression is empty."], unknown };
  if (expression.toLowerCase() === "unknown") return { state: "unknown", expression, identifiers: [], errors: ["Dependencies were explicitly marked unknown."], unknown: [] };
  if (unknown.length) return { state: "unknown", expression, identifiers, errors: [`Unknown SPDX identifier: ${unknown.join(", ")}.`], unknown };
  const balance = [...expression].reduce((sum, char) => sum + (char === "(" ? 1 : char === ")" ? -1 : 0), 0);
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let expectTerm = true;
  let withAllowed = false;
  let malformed = balance !== 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const upper = token.toUpperCase();
    if (token === "(") { if (!expectTerm) malformed = true; expectTerm = true; withAllowed = false; continue; }
    if (token === ")") { if (expectTerm) malformed = true; expectTerm = false; withAllowed = false; continue; }
    if (upper === "AND" || upper === "OR") { if (expectTerm) malformed = true; expectTerm = true; withAllowed = false; continue; }
    if (upper === "WITH") {
      if (expectTerm || !withAllowed) { malformed = true; continue; }
      const exception = tokens[index + 1];
      if (!exception || ["AND", "OR", "WITH", "(", ")"].includes(exception.toUpperCase())) {
        malformed = true;
      } else if (knownLicenses.has(exception)) {
        malformed = true;
        index += 1;
      } else if (knownExceptions.has(exception)) {
        index += 1;
      } else {
        // Unknown identifiers were handled above, but keep this fail-closed if
        // the tokenizer and identifier collector ever diverge.
        malformed = true;
        index += 1;
      }
      expectTerm = false;
      withAllowed = false;
      continue;
    }
    if (!expectTerm) malformed = true;
    if (knownExceptions.has(token)) malformed = true;
    if (!knownLicenses.has(token)) malformed = true;
    expectTerm = false;
    withAllowed = true;
  }
  if (expectTerm) malformed = true;
  if (malformed) return { state: "malformed", expression, identifiers, errors: ["Malformed SPDX expression."], unknown };
  return { state: "valid", expression, identifiers, errors: [], unknown };
}

const knownFamilies = new Set<LicenseFamily>(["network-copyleft", "nonstandard", "permissive", "public-domain-equivalent", "strong-copyleft", "weak-copyleft"]);
const knownScopes = new Set<CopyleftScope>(["file", "library", "network", "none", "whole-work"]);
const knownPatents = new Set<PatentPosition>(["defensive-termination", "express-grant", "none-stated", "retaliatory-termination"]);
const knownNotices = new Set<NoticeBurden>(["material", "minimal", "none", "standard"]);

const answerValues: Record<keyof GuideAnswers, readonly string[]> = {
  openness: ["open", "closed"],
  reciprocity: ["none", "file", "library", "strong", "network"],
  delivery: ["library", "application", "saas", "internal"],
  patents: ["important", "neutral"],
  notices: ["minimal", "standard"],
  jurisdiction: ["eu", "global"],
  projectForm: ["library", "application", "service", "plugin"],
  commercialUse: ["allowed", "restricted"],
  proprietary: ["allowed", "preferred", "required"],
  copyleftTrigger: ["distribution", "network", "none"],
  trademarks: ["important", "neutral"],
  obligations: ["notices", "source", "installation", "minimal"],
  dependencies: [],
  versionStrategy: ["fixed", "later", "either"],
  dualLicensing: ["yes", "no", "considering"],
  futureDistribution: ["public", "commercial", "internal"],
};

const uncertaintyStates = new Set(["unknown", "not-applicable", "undecided"]);

interface AnswerValidation {
  valid: boolean;
  missingFields: string[];
  unsupportedFields: string[];
  exclusionReasons: string[];
}

function answerRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) return false;
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== "string") return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined && descriptor.enumerable === true && Object.hasOwn(descriptor, "value");
    });
  } catch {
    return false;
  }
}

function safeAnswerRecord(value: unknown): GuideAnswers | null {
  if (!answerRecord(value)) return null;
  try {
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
      result[key] = descriptor.value;
    }
    return result as GuideAnswers;
  } catch {
    return null;
  }
}

function validateAnswers(answers: unknown, context: RecommendationContext): AnswerValidation {
  const validation: AnswerValidation = { valid: true, missingFields: [], unsupportedFields: [], exclusionReasons: [] };
  const reject = (field: string, reason: string, missing = false): void => {
    validation.valid = false;
    (missing ? validation.missingFields : validation.unsupportedFields).push(field);
    validation.exclusionReasons.push(`${field}: ${reason}`);
  };

  const safeAnswers = safeAnswerRecord(answers);
  if (!safeAnswers) {
    reject("answers", "must be an object");
    return validation;
  }

  for (const [key, value] of Object.entries(safeAnswers)) {
    if (!Object.hasOwn(answerValues, key)) {
      reject(`answers.${key}`, "unknown answer key");
      continue;
    }
    const answerKey = key as keyof GuideAnswers;
    if (typeof value !== "string") {
      reject(`answers.${key}`, "invalid value type");
      continue;
    }
    if (uncertaintyStates.has(value)) {
      reject(`answers.${key}`, `uncertainty state ${value} is not recommendable`, true);
      continue;
    }
    if (answerKey === "dependencies") {
      const dependency = parseDependencyInput(value, context.knownIdentifiers ?? [], context.knownExceptionIdentifiers ?? []);
      if (dependency.state !== "valid") reject("answers.dependencies", dependency.errors[0] ?? "invalid dependency expression");
      continue;
    }
    if (!answerValues[answerKey].includes(value)) {
      reject(`answers.${key}`, "invalid enum value");
      continue;
    }
    if (answerKey === "jurisdiction") {
      reject("jurisdiction", "unsupported until metadata provides jurisdiction");
      continue;
    }
  }
  return validation;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function unresolved(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "" || value === "unresolved";
}

const knownPermissions = new Set(["commercial-use", "distribution", "modifications", "patent-grant", "private-use", "sublicensing", "unknown"]);
const knownObligations = new Set(["disclose-source", "include-copyright", "include-license-text", "include-notice", "mark-modifications", "network-use-disclose", "provide-corresponding-source", "provide-installation-information", "same-license", "unknown"]);
const knownTriggers = new Set(["combination", "distribution", "linking", "modification", "network-use", "patent-claim", "unknown"]);
const knownRestrictions = new Set(["additional-terms", "liability", "patent-claim", "trademark", "unknown", "warranty"]);
const knownProjectForms = new Set<string>(["library", "application", "service", "plugin"]);
const semanticFields = ["family", "copyleftScope", "permissions", "obligations", "triggers", "restrictions", "patentPosition", "noticeBurden"] as const;
const metadataFields = ["contractVersion", "kind", "id", "review", "semantic", "sourceFingerprint", "evidence"] as const;
const reviewStatuses = new Set<ReviewStatus>(["blocked", "not-recommendable", "pending", "reviewed", "stale"]);
const evidenceLevels = new Set<EvidenceLevel>(["strong", "sufficient", "unknown", "weak"]);
const semanticFamilies = new Set<string>([...knownFamilies, "unknown"]);
const semanticScopes = new Set<string>([...knownScopes, "unknown"]);
const semanticPatents = new Set<string>([...knownPatents, "unknown"]);
const semanticNotices = new Set<string>([...knownNotices, "unknown"]);

function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeArrayValues(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) return null;
    const keys = Reflect.ownKeys(value);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (!lengthDescriptor || lengthDescriptor.enumerable || !Object.hasOwn(lengthDescriptor, "value")) return null;
    const length = lengthDescriptor.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length >= 2 ** 32 || keys.length !== length + 1) return null;
    const values = new Array<unknown>(length);
    for (const key of keys) {
      if (key === "length") continue;
      if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key)) return null;
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) return null;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) return null;
      values[index] = descriptor.value;
    }
    return values.every((_, index) => Object.hasOwn(values, index)) ? values : null;
  } catch {
    return null;
  }
}

function validStringArray(value: unknown, known: Set<string>): value is string[] {
  const values = safeArrayValues(value);
  return values !== null && new Set(values).size === values.length && values.every((item) => nonEmptyString(item) && known.has(item));
}

function validGeneratedStringArray(value: unknown): value is string[] {
  const values = safeArrayValues(value);
  return values !== null && values.every(nonEmptyString);
}

function validReview(value: unknown): value is MetadataLicenseProfile["review"] {
  if (!answerRecord(value) || !hasExactKeys(value, ["status", "recommendable", "evidenceLevel"])) return false;
  return typeof value.recommendable === "boolean" && typeof value.status === "string" && reviewStatuses.has(value.status as ReviewStatus) && typeof value.evidenceLevel === "string" && evidenceLevels.has(value.evidenceLevel as EvidenceLevel);
}

function validSourceFingerprint(value: unknown): value is MetadataLicenseProfile["sourceFingerprint"] {
  return answerRecord(value) && hasExactKeys(value, ["sourceId", "revision", "contentHash"]) && nonEmptyString(value.sourceId) && nonEmptyString(value.revision) && nonEmptyString(value.contentHash);
}

function validEvidence(value: unknown, requireNonEmpty = false): value is readonly EvidenceReference[] {
  const items = safeArrayValues(value);
  return items !== null && (!requireNonEmpty || items.length > 0) && items.every((item) => answerRecord(item)
    && hasExactKeys(item, ["field", "sourceId", "locator"], ["ruleId", "ruleVersion"])
    && nonEmptyString(item.field)
    && nonEmptyString(item.sourceId)
    && nonEmptyString(item.locator)
    && (item.ruleId === undefined || nonEmptyString(item.ruleId))
    && (item.ruleVersion === undefined || nonEmptyString(item.ruleVersion)));
}

function validSemantic(value: unknown): value is MetadataLicenseProfile["semantic"] {
  if (!answerRecord(value) || !hasExactKeys(value, semanticFields, ["projectForm"])) return false;
  if (typeof value.family !== "string" || !semanticFamilies.has(value.family)) return false;
  if (typeof value.copyleftScope !== "string" || !semanticScopes.has(value.copyleftScope)) return false;
  if (!validStringArray(value.permissions, knownPermissions) || !validStringArray(value.obligations, knownObligations) || !validStringArray(value.triggers, knownTriggers) || !validStringArray(value.restrictions, knownRestrictions)) return false;
  if (typeof value.patentPosition !== "string" || !semanticPatents.has(value.patentPosition)) return false;
  if (typeof value.noticeBurden !== "string" || !semanticNotices.has(value.noticeBurden)) return false;
  return value.projectForm === undefined || (typeof value.projectForm === "string" && (knownProjectForms.has(value.projectForm as ProjectForm) || value.projectForm === "unknown"));
}

function validProfileShape(profile: unknown): profile is MetadataLicenseProfile {
  if (!answerRecord(profile) || !hasExactKeys(profile, ["id", "kind", "review", "sourceFingerprint", "semantic"], ["deprecated", "evidence"])) return false;
  if (!nonEmptyString(profile.id) || typeof profile.kind !== "string" || (profile.kind !== "license" && profile.kind !== "exception")) return false;
  if (profile.deprecated !== undefined && typeof profile.deprecated !== "boolean") return false;
  if (!validReview(profile.review) || !validSourceFingerprint(profile.sourceFingerprint) || !validSemantic(profile.semantic)) return false;
  if (profile.evidence !== undefined && !validEvidence(profile.evidence, false)) return false;
  if (profile.review.recommendable === true && (!validEvidence(profile.evidence, true) || profile.review.status !== "reviewed" || !["sufficient", "strong"].includes(profile.review.evidenceLevel))) return false;
  return true;
}

function validCatalogMetadata(value: unknown, kind: "license" | "exception", id: string): value is NonNullable<CatalogMetadataRecord["metadata"]> {
  if (!answerRecord(value) || !hasExactKeys(value, metadataFields)) return false;
  if (value.contractVersion !== "1.0.0" || value.kind !== kind || value.id !== id) return false;
  if (!validReview(value.review) || !validSourceFingerprint(value.sourceFingerprint) || !validSemantic(value.semantic) || !validEvidence(value.evidence, true)) return false;
  return value.review.recommendable !== true || (value.review.status === "reviewed" && ["sufficient", "strong"].includes(value.review.evidenceLevel));
}

function stableCompare(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function nextActiveQuestion(answers: GuideAnswers, mode: GuideMode): keyof GuideAnswers | undefined {
  for (const question of buildGuideModel().questions) {
    if (question.mode !== mode) continue;
    if (question.showWhen && answers[question.showWhen.key] !== question.showWhen.equals) continue;
    const value = answers[question.key];
    if (value === undefined || (typeof value === "string" && uncertaintyStates.has(value))) return question.key;
  }
  return undefined;
}

function activeGuideMode(context: RecommendationContext): GuideMode {
  return context.guideMode ?? DEFAULT_NON_UI_GUIDE_MODE;
}

function withGuideContract(result: RecommendationResult, context: RecommendationContext): RecommendationResult {
  return { guideModelVersion: GUIDE_MODEL_VERSION, guideMode: activeGuideMode(context), ...result };
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
  if (typeof answers.projectForm === "string" && !uncertaintyStates.has(answers.projectForm) && semantic.projectForm === answers.projectForm) add("projectForm", 10, `matches projectForm=${answers.projectForm}`);
  if (answers.commercialUse === "allowed" && semantic.permissions.includes("commercial-use")) add("permissions", 10, "matches commercialUse=allowed");
  const reciprocity: Record<string, CopyleftScope> = { none: "none", file: "file", library: "library", strong: "whole-work", network: "network" };
  const reciprocityScope = typeof answers.reciprocity === "string" ? reciprocity[answers.reciprocity] : undefined;
  if (reciprocityScope !== undefined && semantic.copyleftScope === reciprocityScope) add("copyleftScope", 20, `matches reciprocity=${answers.reciprocity}`);
  const delivery: Record<string, CopyleftScope> = { library: "library", application: "whole-work", saas: "network", internal: "none" };
  const deliveryScope = typeof answers.delivery === "string" ? delivery[answers.delivery] : undefined;
  if (deliveryScope !== undefined && semantic.copyleftScope === deliveryScope) add("copyleftScope", 15, `matches delivery=${answers.delivery}`);
  if (answers.patents === "important" && semantic.patentPosition === "express-grant") add("patentPosition", 12, "matches patents=important");
  if (answers.patents === "neutral" && knownPatents.has(semantic.patentPosition)) add("patentPosition", 4, "matches patents=neutral");
  if (answers.notices === "minimal" && ["minimal", "none"].includes(semantic.noticeBurden)) add("noticeBurden", 8, "matches notices=minimal");
  if (answers.notices === "standard" && ["standard", "material"].includes(semantic.noticeBurden)) add("noticeBurden", 5, "matches notices=standard");
  return { score, reasons, matchedFields };
}

function unknownSemanticFields(profile: MetadataLicenseProfile): string[] {
  const fields: Array<[string, unknown]> = [
    ["semantic.family", profile.semantic.family],
    ["semantic.copyleftScope", profile.semantic.copyleftScope],
    ["semantic.permissions", profile.semantic.permissions],
    ["semantic.obligations", profile.semantic.obligations],
    ["semantic.triggers", profile.semantic.triggers],
    ["semantic.restrictions", profile.semantic.restrictions],
    ["semantic.patentPosition", profile.semantic.patentPosition],
    ["semantic.noticeBurden", profile.semantic.noticeBurden],
  ];
  return fields.filter(([, value]) => value === "unknown" || (Array.isArray(value) && value.includes("unknown"))).map(([field]) => field);
}

function recommendationEligibilityUnsafe(profile: MetadataLicenseProfile, answers: GuideAnswers, context: RecommendationContext): EligibilityResult {
  const result: EligibilityResult = { eligible: true, exclusionReasons: [], missingFields: [], unsupportedFields: [], reasons: [] };
  const safeAnswers = safeAnswerRecord(answers);
  const validation = validateAnswers(safeAnswers, context);
  result.missingFields.push(...validation.missingFields);
  result.unsupportedFields.push(...validation.unsupportedFields);
  result.exclusionReasons.push(...validation.exclusionReasons);
  if (!validation.valid) {
    result.eligible = false;
    return result;
  }
  if (!validProfileShape(profile)) {
    exclusion(result, "metadata: runtime profile shape or field evidence is invalid");
    result.unsupportedFields.push("metadata");
    result.eligible = false;
    return result;
  }
  if (profile.kind !== "license") exclusion(result, "kind: only license profiles are recommendable");
  if (profile.deprecated === true) exclusion(result, "deprecated: historical profiles are not recommendable");
  if (profile.review.status !== "reviewed") exclusion(result, `review.status: ${profile.review.status} is not reviewed`);
  if (profile.review.recommendable !== true) exclusion(result, "review.recommendable: false");
  if (!["sufficient", "strong"].includes(profile.review.evidenceLevel)) exclusion(result, `review.evidenceLevel: ${profile.review.evidenceLevel} is insufficient`);
  if (context.sourceLockResolved !== true) exclusion(result, "context.sourceLockResolved: false");
  if (unresolved(profile.sourceFingerprint?.revision)) exclusion(result, "sourceFingerprint.revision: unresolved");
  if (unresolved(profile.sourceFingerprint?.contentHash)) exclusion(result, "sourceFingerprint.contentHash: unresolved");
  if (unresolved(profile.sourceFingerprint?.sourceId)) exclusion(result, "sourceFingerprint.sourceId: unresolved");
  if (!validEvidence(profile.evidence, profile.review.recommendable === true)) exclusion(result, "evidence: field-level evidence is missing or malformed");
  if (safeAnswers?.proprietary === "required" || safeAnswers?.proprietary === "allowed" || safeAnswers?.proprietary === "preferred") exclusion(result, "intent: proprietary strategy is not an open-source recommendation");
  if (safeAnswers?.openness === "closed") exclusion(result, "intent: closed strategy is not an open-source recommendation");
  const required: Record<string, [unknown, Set<string>]> = {};
  if (hasValue(safeAnswers?.openness)) required.family = [profile.semantic?.family, knownFamilies];
  if (hasValue(safeAnswers?.reciprocity) || hasValue(safeAnswers?.delivery)) required.copyleftScope = [profile.semantic?.copyleftScope, knownScopes];
  if (hasValue(safeAnswers?.patents)) required.patentPosition = [profile.semantic?.patentPosition, knownPatents];
  if (hasValue(safeAnswers?.notices)) required.noticeBurden = [profile.semantic?.noticeBurden, knownNotices];
  if (hasValue(safeAnswers?.projectForm)) required.projectForm = [profile.semantic?.projectForm, knownProjectForms];
  for (const [field, [value, known]] of Object.entries(required)) requiredSemantic(profile, field, value, known, result);
  const reciprocityScopes: Record<string, CopyleftScope> = { none: "none", file: "file", library: "library", strong: "whole-work", network: "network" };
  const deliveryScopes: Record<string, CopyleftScope> = { library: "library", application: "whole-work", saas: "network", internal: "none" };
  const reciprocityScope = typeof safeAnswers?.reciprocity === "string" ? reciprocityScopes[safeAnswers.reciprocity] : undefined;
  const deliveryScope = typeof safeAnswers?.delivery === "string" ? deliveryScopes[safeAnswers.delivery] : undefined;
  if (reciprocityScope !== undefined && profile.semantic.copyleftScope !== reciprocityScope) exclusion(result, `semantic.copyleftScope: required ${reciprocityScope} is not evidenced`);
  if (deliveryScope !== undefined && profile.semantic.copyleftScope !== deliveryScope) exclusion(result, `semantic.copyleftScope: required ${deliveryScope} is not evidenced`);
  if (typeof safeAnswers?.projectForm === "string" && !uncertaintyStates.has(safeAnswers.projectForm) && profile.semantic.projectForm !== safeAnswers.projectForm) exclusion(result, "semantic.projectForm: requested project form is not evidenced");
  if (safeAnswers?.patents === "important" && profile.semantic.patentPosition !== "express-grant") exclusion(result, "semantic.patentPosition: express grant is not evidenced");
  if (safeAnswers?.notices === "minimal" && !["minimal", "none"].includes(profile.semantic.noticeBurden)) exclusion(result, "semantic.noticeBurden: minimal burden is not evidenced");
  if (safeAnswers?.notices === "standard" && !["standard", "material"].includes(profile.semantic.noticeBurden)) exclusion(result, "semantic.noticeBurden: standard burden is not evidenced");
  if (safeAnswers?.commercialUse === "allowed") {
    const permissionsKnown = requiredSemantic(profile, "permissions", profile.semantic?.permissions, knownPermissions, result);
    if (permissionsKnown && !profile.semantic.permissions.includes("commercial-use")) {
      result.unsupportedFields.push("semantic.permissions");
      exclusion(result, "semantic.permissions: commercial-use permission is not evidenced");
    }
  }
  if (safeAnswers?.commercialUse === "restricted") {
    result.unsupportedFields.push("semantic.commercialUse");
    exclusion(result, "semantic.commercialUse: commercialUse=restricted is not represented by the metadata contract");
  }
  if (safeAnswers?.copyleftTrigger !== undefined) {
    const trigger = safeAnswers.copyleftTrigger === "network" ? "network-use" : safeAnswers.copyleftTrigger === "distribution" ? "distribution" : undefined;
    if (safeAnswers.copyleftTrigger === "none" && profile.semantic?.copyleftScope !== "none") exclusion(result, "semantic.copyleftScope: no-copyleft requirement is not met");
    else if (trigger && !profile.semantic?.triggers?.includes(trigger)) exclusion(result, `semantic.triggers: ${trigger} is not evidenced`);
  }
  if (safeAnswers?.trademarks === "important" && !profile.semantic?.restrictions?.includes("trademark")) exclusion(result, "semantic.restrictions: trademark position is not evidenced");
  if (safeAnswers?.obligations === "notices" && !profile.semantic?.obligations?.some((value) => ["include-notice", "include-copyright", "include-license-text"].includes(value))) exclusion(result, "semantic.obligations: notice obligations are not evidenced");
  if (safeAnswers?.obligations === "source" && !profile.semantic?.obligations?.some((value) => ["disclose-source", "provide-corresponding-source"].includes(value))) exclusion(result, "semantic.obligations: source obligation is not evidenced");
  if (safeAnswers?.obligations === "installation" && !profile.semantic?.obligations?.includes("provide-installation-information")) exclusion(result, "semantic.obligations: installation information is not evidenced");
  for (const key of ["versionStrategy", "dualLicensing", "futureDistribution"] as const) {
    if (safeAnswers?.[key] !== undefined) {
      result.unsupportedFields.push(`semantic.${key}`);
      exclusion(result, `semantic.${key}: no validated metadata field exists`);
    }
  }
  if (result.exclusionReasons.length === 0) {
    const matched = match(profile, safeAnswers ?? {});
    result.reasons = matched.reasons;
  }
  result.eligible = result.exclusionReasons.length === 0;
  return result;
}

export function recommendationEligibility(profile: MetadataLicenseProfile, answers: GuideAnswers, context: RecommendationContext): EligibilityResult {
  try {
    return recommendationEligibilityUnsafe(profile, answers, context);
  } catch {
    return { eligible: false, exclusionReasons: ["runtime input: hostile value rejected"], missingFields: [], unsupportedFields: ["runtime input"], reasons: [] };
  }
}

function recommendFromProfilesUnsafe(profiles: readonly MetadataLicenseProfile[], answers: GuideAnswers, context: RecommendationContext): RecommendationResult {
  const validation = validateAnswers(answers, context);
  const safeAnswers: GuideAnswers = safeAnswerRecord(answers) ?? {};
  const proprietaryIntent = ["allowed", "preferred", "required"].includes(safeAnswers.proprietary ?? "") || safeAnswers.openness === "closed";
  const branch = proprietaryIntent ? "source-available-or-proprietary" : "open-source";
  const trace = ["hard constraints evaluated before ranking", `branch=${branch}`];
  if (!validation.valid) {
    trace.push(...validation.exclusionReasons);
    return { outcome: "no-safe-match", ruleVersion: context.ruleVersion, advisory: true, candidates: [], alternatives: [], trace, conflicts: [], unknowns: validation.missingFields, obligations: [], guidance: validation.exclusionReasons, branch };
  }
  if (safeAnswers.delivery === "application" && safeAnswers.dependencies === undefined) {
    const guidance = ["Dependency analysis is incomplete; provide an SPDX expression or explicitly mark it unknown."];
    return {
      outcome: "no-safe-match",
      ruleVersion: context.ruleVersion,
      advisory: true,
      candidates: [],
      alternatives: [],
      trace: [...trace, "dependency-analysis=not-requested"],
      conflicts: [],
      unknowns: ["dependencies"],
      obligations: [],
      guidance,
      branch,
      nextQuestion: "dependencies",
    };
  }
  if (branch === "source-available-or-proprietary") {
    const guidance = ["Proprietary or source-available intent requires separate terms; no OSI/open-source recommendation is shown."];
    return { outcome: "no-safe-match", ruleVersion: context.ruleVersion, advisory: true, candidates: [], alternatives: [], trace: [...trace, "open-source candidates suppressed for proprietary branch"], conflicts: [], unknowns: [], obligations: [], guidance, branch, nextQuestion: nextActiveQuestion(safeAnswers, activeGuideMode(context)) };
  }
  if (safeAnswers.commercialUse === "restricted") {
    const guidance = ["Restricted commercial-use intent is not represented by validated catalog metadata; no safe match is shown."];
    return { outcome: "no-safe-match", ruleVersion: context.ruleVersion, advisory: true, candidates: [], alternatives: [], trace: [...trace, "commercial-use restriction is unsupported by metadata"], conflicts: [], unknowns: ["semantic.commercialUse"], obligations: [], guidance, branch };
  }
  const exclusionReasons: string[] = [];
  const candidates = profiles.flatMap((profile) => {
    const eligibility = recommendationEligibility(profile, safeAnswers, context);
    if (!eligibility.eligible) {
      exclusionReasons.push(...eligibility.exclusionReasons);
      return [];
    }
    const scored = match(profile, safeAnswers);
    const unknowns = unknownSemanticFields(profile);
    const status: CandidateStatus = unknowns.length ? "insufficient evidence" : "good fit";
    const evidence = validEvidence(profile.evidence) ? profile.evidence.map((item) => ({ ...item })) : [];
    return [{ profile, id: profile.id, score: scored.score, fit: scored.score, reasons: scored.reasons, matchedFields: scored.matchedFields, status, evidenceConfidence: profile.review.evidenceLevel, conflicts: [], unknowns, obligations: profile.semantic.obligations, evidence }];
  });
  candidates.sort((a, b) => b.score - a.score || stableCompare(a.id, b.id));
  const equalFit = candidates.length > 1 && candidates[0]?.fit === candidates[1]?.fit;
  if (equalFit) trace.push("equal fit preserved; deterministic ID order is not a fabricated score difference");
  const nextQuestion = nextActiveQuestion(safeAnswers, activeGuideMode(context));
  const guidance = [...new Set(exclusionReasons)];
  const unknowns = [...new Set(candidates.flatMap((candidate) => candidate.unknowns.map((field) => `${candidate.id}: ${field}`)))];
  if (unknowns.length) {
    trace.push("insufficient semantic evidence prevents a recommendation claim");
    guidance.push("Insufficient evidence remains in candidate metadata; no recommendation claim is made.");
  }
  const outcome = !candidates.length ? "no-safe-match" : unknowns.length ? "insufficient-evidence" : "recommendation";
  return { outcome, ruleVersion: context.ruleVersion, advisory: true, candidates: candidates.slice(0, 5), alternatives: candidates.slice(5), trace, conflicts: [], unknowns, obligations: candidates[0]?.obligations ?? [], guidance: [...new Set(guidance)], branch, nextQuestion };
}

export function recommendFromProfiles(profiles: readonly MetadataLicenseProfile[], answers: GuideAnswers, context: RecommendationContext): RecommendationResult {
  try {
    return withGuideContract(recommendFromProfilesUnsafe(profiles, answers, context), context);
  } catch {
    return withGuideContract({ outcome: "no-safe-match", ruleVersion: context.ruleVersion, advisory: true, candidates: [], alternatives: [], trace: ["runtime input: hostile value rejected"], conflicts: [], unknowns: ["runtime input"], obligations: [], guidance: ["Hostile runtime input was rejected; no safe match is shown."], branch: "open-source" }, context);
  }
}

export function metadataProfileFromCatalog(record: CatalogMetadataRecord): MetadataLicenseProfile | null {
  if (!answerRecord(record)) return null;
  if (!hasExactKeys(record, ["id", "type"], ["deprecated", "name", "osi", "fsf", "profiled", "permissions", "conditions", "limitations", "metadata"])) return null;
  if (!nonEmptyString(record.id) || (record.type !== "license" && record.type !== "exception")) return null;
  if (record.deprecated !== undefined && typeof record.deprecated !== "boolean") return null;
  if (record.deprecated !== undefined && record.deprecated !== false) return null;
  if (record.name !== undefined && !nonEmptyString(record.name)) return null;
  for (const key of ["osi", "fsf", "profiled"] as const) {
    if (record[key] !== undefined && typeof record[key] !== "boolean") return null;
  }
  for (const key of ["permissions", "conditions", "limitations"] as const) {
    if (record[key] !== undefined && !validGeneratedStringArray(record[key])) return null;
  }
  const metadata = record.metadata;
  if (!validCatalogMetadata(metadata, record.type, record.id) || record.type !== "license") return null;
  const candidate: MetadataLicenseProfile = {
    id: metadata.id,
    kind: metadata.kind,
    deprecated: record.deprecated,
    review: metadata.review,
    sourceFingerprint: metadata.sourceFingerprint,
    semantic: metadata.semantic,
    evidence: metadata.evidence,
  };
  return validProfileShape(candidate) ? candidate : null;
}

function recommendFromCatalogUnsafe(records: readonly CatalogMetadataRecord[], answers: GuideAnswers, context: RecommendationContext): RecommendationResult {
  const validation = validateAnswers(answers, context);
  const safeAnswers: GuideAnswers = safeAnswerRecord(answers) ?? {};
  const dependency = parseDependencyInput(safeAnswers.dependencies, context.knownIdentifiers ?? [], context.knownExceptionIdentifiers ?? []);
  const dependencyState = safeAnswers.dependencies === undefined ? "not-requested" : dependency.state;
  const dependencyRequired = safeAnswers.delivery === "application" && safeAnswers.dependencies === undefined;
  const dependencyInvalid = safeAnswers.dependencies !== undefined && dependency.state !== "valid";
  const proprietaryIntent = ["allowed", "preferred", "required"].includes(safeAnswers.proprietary ?? "") || safeAnswers.openness === "closed";
  const branch = proprietaryIntent ? "source-available-or-proprietary" : "open-source";
  const trace = ["hard constraints evaluated before ranking", `branch=${branch}`, `dependency-analysis=${dependencyState}`];
  const dependencyUnknowns = ["dependencies", ...dependency.unknown];
  const dependencyGuidance = dependencyRequired
    ? "Dependency analysis is incomplete; provide an SPDX expression or explicitly mark it unknown."
    : dependency.state === "malformed"
      ? "Dependency SPDX expression is malformed; no safe match is shown."
      : dependency.expression.toLowerCase() === "unknown"
        ? "Dependencies were explicitly marked unknown; no safe match is shown."
        : "Dependency identifiers are not all known; no safe match is shown.";

  if (!validation.valid || dependencyRequired || dependencyInvalid) {
    const unknowns = [...new Set([
      ...validation.missingFields,
      ...(dependencyRequired || dependencyInvalid ? dependencyUnknowns : []),
    ])];
    const guidance = [...validation.exclusionReasons];
    if (dependencyRequired || dependencyInvalid) guidance.push(dependencyGuidance);
    return {
      outcome: "no-safe-match",
      ruleVersion: context.ruleVersion,
      advisory: true,
      candidates: [],
      alternatives: [],
      trace: [...trace, ...validation.exclusionReasons],
      conflicts: [],
      unknowns,
      obligations: [],
      guidance: [...new Set(guidance)],
      branch,
      nextQuestion: dependencyRequired ? "dependencies" : nextActiveQuestion(safeAnswers, activeGuideMode(context)),
    };
  }

  const profiles = records.map(metadataProfileFromCatalog).filter((profile): profile is MetadataLicenseProfile => profile !== null);
  const result = recommendFromProfiles(profiles, safeAnswers, context);
  if (!result.trace.includes(`dependency-analysis=${dependencyState}`)) result.trace.push(`dependency-analysis=${dependencyState}`);
  if (!profiles.length) {
    result.unknowns.push("catalog metadata");
    result.guidance.push("No safe match: runtime catalog metadata is absent or unresolved. Review evidence before recommending a license.");
    result.candidates = [];
    result.alternatives = [];
    result.outcome = "no-safe-match";
  }
  return result;
}

export function recommendFromCatalog(records: readonly CatalogMetadataRecord[], answers: GuideAnswers, context: RecommendationContext): RecommendationResult {
  try {
    return withGuideContract(recommendFromCatalogUnsafe(records, answers, context), context);
  } catch {
    return withGuideContract({ outcome: "no-safe-match", ruleVersion: context.ruleVersion, advisory: true, candidates: [], alternatives: [], trace: ["runtime input: hostile value rejected"], conflicts: [], unknowns: ["runtime input"], obligations: [], guidance: ["Hostile runtime input was rejected; no safe match is shown."], branch: "open-source" }, context);
  }
}
