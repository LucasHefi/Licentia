import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateProfile as validateCuratedProfile } from "./validate-license-data.mjs";

export const METADATA_CONTRACT_VERSION = "1.0.0";

const PROFILE_KINDS = new Set(["license", "exception"]);
const REVIEW_STATUSES = new Set(["blocked", "not-recommendable", "pending", "reviewed", "stale"]);
const EVIDENCE_LEVELS = new Set(["strong", "sufficient", "unknown", "weak"]);
const METADATA_KEYS = [
  "contractVersion",
  "kind",
  "id",
  "review",
  "semantic",
  "sourceFingerprint",
  "evidence",
];

function assertObject(value, at) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${at}: expected object`);
  }
}

function assertString(value, at) {
  if (typeof value !== "string" || !value) {
    throw new Error(`${at}: expected non-empty string`);
  }
}

function assertKind(kind, at) {
  if (!PROFILE_KINDS.has(kind)) {
    throw new Error(`${at}: expected license or exception`);
  }
}

function assertExactKeys(value, keys, at) {
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new Error(`${at}.${key}: unknown field`);
  }
  for (const key of keys) {
    if (!(key in value)) throw new Error(`${at}.${key}: missing field`);
  }
}

function validateReviewSafety(review, at) {
  assertObject(review, at);
  assertString(review.status, `${at}.status`);
  if (!REVIEW_STATUSES.has(review.status)) {
    throw new Error(`${at}.status: unknown review status ${JSON.stringify(review.status)}`);
  }
  assertString(review.evidenceLevel, `${at}.evidenceLevel`);
  if (!EVIDENCE_LEVELS.has(review.evidenceLevel)) {
    throw new Error(`${at}.evidenceLevel: unknown evidence level ${JSON.stringify(review.evidenceLevel)}`);
  }
  if (typeof review.recommendable !== "boolean") {
    throw new Error(`${at}.recommendable: expected boolean`);
  }
  if (review.recommendable && (review.status !== "reviewed" || !["sufficient", "strong"].includes(review.evidenceLevel))) {
    throw new Error(`${at}: recommendable invariant`);
  }
  if (review.status !== "reviewed" && review.recommendable) {
    throw new Error(`${at}: non-reviewed state cannot be recommendable`);
  }
}

function validateJoinedProfile(profile, kind, id, file) {
  assertObject(profile, file);
  if (profile.id !== id) throw new Error(`${file}: identity mismatch (expected ${kind}:${id})`);
  if (profile.kind !== kind) throw new Error(`${file}: wrong kind (expected ${kind})`);
  try {
    validateCuratedProfile(profile, { file });
  } catch (error) {
    throw new Error(`${file}: schema-invalid curated profile (${error.message})`);
  }
  validateReviewSafety(profile.review, `${file}.review`);
  return profile;
}

export function profileFilename(id) {
  if (typeof id !== "string" || !id || id.includes("\0") || id === "." || id === ".." || /[\\/]/.test(id)) {
    throw new Error(`Unsafe profile id: ${JSON.stringify(id)}`);
  }
  return `id-${Buffer.from(id, "utf8").toString("base64url")}.json`;
}

export async function loadCuratedProfile(profilesDir, kind, id) {
  assertKind(kind, "profile kind");
  assertString(id, "profile id");
  const filename = profileFilename(id);
  const file = path.join(path.resolve(profilesDir), `${kind}s`, filename);
  let profile;
  try {
    profile = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    throw new Error(`Missing or invalid curated profile ${kind}:${id}: ${error.message}`);
  }
  return validateJoinedProfile(profile, kind, id, file);
}

export async function joinCuratedProfiles(records, profilesDir) {
  if (!Array.isArray(records)) throw new Error("source records: expected array");
  const joined = new Map();
  for (const record of records) {
    assertObject(record, "source record");
    assertKind(record.kind, "source record.kind");
    assertString(record.id, "source record.id");
    const key = `${record.kind}:${record.id}`;
    if (joined.has(key)) throw new Error(`Duplicate source record ${key}`);
    joined.set(key, await loadCuratedProfile(profilesDir, record.kind, record.id));
  }
  return joined;
}

export function validateRuntimeMetadata(metadata, kind, id, at = "metadata") {
  assertObject(metadata, at);
  assertKind(kind, `${at}.kind`);
  assertString(id, `${at}.id`);
  assertExactKeys(metadata, METADATA_KEYS, at);
  if (metadata.contractVersion !== METADATA_CONTRACT_VERSION) {
    throw new Error(`${at}.contractVersion: unsupported metadata contract version`);
  }
  if (metadata.kind !== kind || metadata.id !== id) {
    throw new Error(`${at}: kind/id mismatch (expected ${kind}:${id})`);
  }
  validateReviewSafety(metadata.review, `${at}.review`);
  try {
    validateCuratedProfile({
      id,
      kind,
      schemaVersion: METADATA_CONTRACT_VERSION,
      sourceFingerprint: metadata.sourceFingerprint,
      review: metadata.review,
      semantic: metadata.semantic,
      evidence: metadata.evidence,
    }, { file: at });
  } catch (error) {
    throw new Error(`${at}: schema-invalid runtime metadata (${error.message})`);
  }
  return metadata;
}

export function metadataFor(profile, kind, id) {
  const validated = validateJoinedProfile(profile, kind, id, "profile");
  return structuredClone({
    contractVersion: METADATA_CONTRACT_VERSION,
    kind,
    id,
    review: validated.review,
    semantic: validated.semantic,
    sourceFingerprint: validated.sourceFingerprint,
    evidence: validated.evidence,
  });
}

export function adaptRecord(record, profile) {
  assertObject(record, "runtime record");
  assertKind(record.type, "runtime record.type");
  assertString(record.id, "runtime record.id");
  if (Object.hasOwn(record, "metadata")) {
    throw new Error(`runtime record ${record.type}:${record.id}: metadata namespace already exists`);
  }
  const result = structuredClone(record);
  result.metadata = metadataFor(profile, record.type, record.id);
  return result;
}
