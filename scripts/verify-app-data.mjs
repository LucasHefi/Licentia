#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";

const [spdxArg, dataArg = "public/data"] = process.argv.slice(2);
if (!spdxArg) {
  console.error("Použití: node scripts/verify-app-data.mjs <spdx-data> [data-aplikace]");
  process.exit(1);
}

const spdxDir = path.resolve(spdxArg);
const dataDir = path.resolve(dataArg);
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const licenses = await readJson(path.join(spdxDir, "json", "licenses.json"));
const exceptions = await readJson(path.join(spdxDir, "json", "exceptions.json"));
const catalog = await readJson(path.join(dataDir, "catalog.json"));
const searchIndex = await readJson(path.join(dataDir, "search-index.json"));
const indexed = new Map(searchIndex.map((item) => [`${item.type}:${item.id}`, item.haystack]));
const errors = [];

export function validateMetadata(metadata, kind, id, at, errors = []) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return errors.push(`${at}: chybí metadata.`);
  const exact = (value, keys, location) => Object.keys(value).filter((key) => !keys.includes(key)).forEach((key) => errors.push(`${location}.${key}: neznámé pole.`));
  if (metadata.contractVersion !== "1.0.0") errors.push(`${at}: neplatná verze kontraktu.`);
  if (metadata.kind !== kind || metadata.id !== id) errors.push(`${at}: nesouhlasí kind/id.`);
  const fingerprint = metadata.sourceFingerprint;
  if (fingerprint && typeof fingerprint === "object" && !Array.isArray(fingerprint)) exact(fingerprint, ["sourceId", "revision", "contentHash"], `${at}.sourceFingerprint`);
  if (!fingerprint || typeof fingerprint !== "object" || ["sourceId", "revision", "contentHash"].some(key => typeof fingerprint[key] !== "string" || !fingerprint[key])) errors.push(`${at}: neplatný sourceFingerprint.`);
  const review = metadata.review;
  if (review && typeof review === "object" && !Array.isArray(review)) exact(review, ["status", "evidenceLevel", "recommendable"], `${at}.review`);
  if (!review || typeof review !== "object" || typeof review.status !== "string" || typeof review.evidenceLevel !== "string" || typeof review.recommendable !== "boolean") errors.push(`${at}: neplatný review.`);
  if (review && !["blocked", "not-recommendable", "pending", "reviewed", "stale"].includes(review.status)) errors.push(`${at}: neplatný review.status.`);
  if (review && !["strong", "sufficient", "unknown", "weak"].includes(review.evidenceLevel)) errors.push(`${at}: neplatný review.evidenceLevel.`);
  if (review?.recommendable && (!["reviewed"].includes(review.status) || !["sufficient", "strong"].includes(review.evidenceLevel))) errors.push(`${at}: recommendable invariant.`);
  if (["pending", "stale", "weak", "blocked", "not-recommendable"].includes(review?.status) && review?.recommendable) errors.push(`${at}: nerekomendovatelný stav je recommendable.`);
  const semanticFields = kind === "license"
    ? ["family", "copyleftScope", "permissions", "obligations", "triggers", "restrictions", "patentPosition", "noticeBurden"]
    : ["exceptionApplicability", "permissions", "triggers", "restrictions"];
  if (!metadata.semantic || typeof metadata.semantic !== "object" || Array.isArray(metadata.semantic) || semanticFields.some(field => !(field in (metadata.semantic ?? {})))) errors.push(`${at}: neplatný semantic.`);
  if (metadata.semantic && typeof metadata.semantic === "object" && !Array.isArray(metadata.semantic)) exact(metadata.semantic, semanticFields, `${at}.semantic`);
  if (!Array.isArray(metadata.evidence)) errors.push(`${at}: neplatné evidence.`);
  else metadata.evidence.forEach((item, index) => {
    if (item && typeof item === "object" && !Array.isArray(item)) exact(item, ["field", "sourceId", "locator"], `${at}.evidence[${index}]`);
    if (!item || typeof item !== "object" || ["field", "sourceId", "locator"].some(key => typeof item[key] !== "string" || !item[key])) errors.push(`${at}.evidence[${index}]: neplatná položka.`);
  });
}

function validateCatalogMetadata() {
  const expected = new Set([
    ...licenses.licenses.map((item) => `license:${item.licenseId}`),
    ...exceptions.exceptions.map((item) => `exception:${item.licenseExceptionId}`),
  ]);
  const seen = new Set();
  for (const item of catalog) {
    const key = `${item.type}:${item.id}`;
    if (!expected.has(key)) errors.push(`${key}: neznámá položka katalogu.`);
    if (seen.has(key)) errors.push(`${key}: duplicitní položka katalogu.`);
    seen.add(key);
    validateMetadata(item.metadata, item.type, item.id, `catalog.${key}`, errors);
  }
}

if (catalog.length !== licenses.licenses.length + exceptions.exceptions.length) {
  errors.push(`Katalog má ${catalog.length} položek místo ${licenses.licenses.length + exceptions.exceptions.length}.`);
}
validateCatalogMetadata();

for (const summary of licenses.licenses) {
  const source = await readJson(path.join(spdxDir, "json", "details", `${summary.licenseId}.json`));
  const targetPath = path.join(dataDir, "licenses", `${summary.licenseId}.json`);
  await access(targetPath);
  const target = await readJson(targetPath);
  validateMetadata(target.metadata, "license", summary.licenseId, summary.licenseId, errors);
  if (target.text !== source.licenseText) errors.push(`${summary.licenseId}: odlišné znění.`);
  if (!indexed.get(`license:${summary.licenseId}`)?.includes(source.licenseText.toLocaleLowerCase("cs"))) {
    errors.push(`${summary.licenseId}: chybí v plnotextovém indexu.`);
  }
}

for (const summary of exceptions.exceptions) {
  const source = await readJson(path.join(spdxDir, "json", "exceptions", `${summary.licenseExceptionId}.json`));
  const targetPath = path.join(dataDir, "exceptions", `${summary.licenseExceptionId}.json`);
  await access(targetPath);
  const target = await readJson(targetPath);
  validateMetadata(target.metadata, "exception", summary.licenseExceptionId, summary.licenseExceptionId, errors);
  if (target.text !== source.licenseExceptionText) errors.push(`${summary.licenseExceptionId}: odlišné znění výjimky.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Ověřeno ${licenses.licenses.length} licencí a ${exceptions.exceptions.length} výjimek; texty jsou doslovné.`);
