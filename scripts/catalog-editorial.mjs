import { readFile } from "node:fs/promises";
import dictionary from "../data/catalog-tags.json" with { type: "json" };

export const defaultEditorialPath = new URL("../data/catalog-editorial.json", import.meta.url);
const purposeTags = new Set(dictionary.filter(tag => tag.group === "use").map(tag => tag.id));
const curatedProperties = new Set(["share-alike", "source-on-distribution", "source-on-network-use", "non-commercial", "no-derivatives"]);
const dateForms = { year: /^\d{4}$/, month: /^\d{4}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/ };

function requireValue(ok, at, message) {
  if (!ok) throw new Error(`${at}: ${message}`);
}

const nonempty = value => typeof value === "string" && value.trim().length > 0;

function validateFact(fact, at, validValue) {
  requireValue(fact && validValue(fact.value), at, "invalid value");
  const { source } = fact;
  requireValue(nonempty(source?.title) && nonempty(source.locator), at, "source title and locator are required");
  const url = URL.parse(source.url);
  requireValue(url && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password, at, "invalid external source URL");
}

function validDate(date) {
  if (!date || !Object.hasOwn(dateForms, date.precision) || typeof date.date !== "string" || !dateForms[date.precision].test(date.date)) return false;
  const iso = date.date.padEnd(7, "-01").padEnd(10, "-01");
  const parsed = new Date(iso);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === iso;
}

export function validateEditorial(rows, profiles) {
  requireValue(Array.isArray(rows), "editorial", "expected an array keyed by kind and SPDX ID");
  const result = new Map();
  for (const row of rows) {
    const key = `${row?.kind}:${row?.id}`;
    const profile = profiles.get(key);
    requireValue(profile && !result.has(key), key, "unknown or duplicate SPDX ID");
    requireValue(row.textHash === profile.sourceFingerprint.contentHash && /^sha256:[0-9a-f]{64}$/.test(row.textHash), key, "source text changed or its fingerprint is unresolved; review this entry");
    const { release, approval, spdxInclusion, publisher, summary, purposes, properties, related, research, exceptionUse, ...identity } = row;
    requireValue(Object.keys(identity).every(field => ["kind", "id", "textHash"].includes(field)), key, "unknown field");
    requireValue(nonempty(research), key, "missing research outcome");
    for (const [name, fact] of Object.entries({ release, approval, spdxInclusion })) {
      if (fact !== undefined) validateFact(fact, `${key}.${name}`, validDate);
    }
    if (publisher !== undefined) validateFact(publisher, `${key}.publisher`, nonempty);
    if (summary !== undefined) validateFact(summary, `${key}.summary`, value => nonempty(value) && value.length <= 220);
    for (const [name, list, validValue, factKey] of [
      ["purposes", purposes, value => row.kind === "license" && purposeTags.has(value), value => value],
      ["properties", properties, value => row.kind === "license" && curatedProperties.has(value?.tag) && nonempty(value.condition), value => value.tag],
      ["related", related, value => value?.id !== row.id && profiles.has(`${row.kind}:${value?.id}`) && ["previous", "next", "variant"].includes(value.relation), value => value.id],
    ]) {
      if (list === undefined) continue;
      requireValue(Array.isArray(list), `${key}.${name}`, "expected an array");
      const seen = new Set();
      for (const fact of list) {
        validateFact(fact, `${key}.${name}`, validValue);
        const id = factKey(fact.value);
        requireValue(!seen.has(id), `${key}.${name}`, "duplicate value");
        seen.add(id);
      }
    }
    if (exceptionUse !== undefined) validateFact(exceptionUse, `${key}.exceptionUse`, value => row.kind === "exception" && profiles.has(`license:${value}`));
    result.set(key, row);
  }
  for (const [key, row] of result) {
    for (const { value } of row.related ?? []) {
      if (value.relation !== "variant") continue;
      const peer = result.get(`${row.kind}:${value.id}`);
      requireValue(peer?.related?.some(fact => fact.value.relation === "variant" && fact.value.id === row.id), key, "variant must link back");
      requireValue(JSON.stringify(peer.release?.value) === JSON.stringify(row.release?.value), key, "variants must share the release of the same text");
    }
  }
  return result;
}

export async function loadEditorial(file, profiles) {
  return file ? validateEditorial(JSON.parse(await readFile(file, "utf8")), profiles) : new Map();
}

export function catalogTagIds(profile, editorial) {
  if (profile.kind !== "license") return [];
  const tags = new Set([
    ...(editorial?.purposes ?? []).map(fact => fact.value),
    ...(editorial?.properties ?? []).map(fact => fact.value.tag),
  ]);
  const { semantic, review, evidence, sourceFingerprint } = profile;
  const canUseProfile = ["reviewed", "not-recommendable"].includes(review.status)
    && ["strong", "sufficient"].includes(review.evidenceLevel)
    && sourceFingerprint.revision !== "unresolved" && sourceFingerprint.contentHash !== "unresolved";
  if (canUseProfile) {
    const supported = field => {
      const value = semantic[field];
      return value !== "unknown" && !(Array.isArray(value) && value.includes("unknown"))
        && evidence.some(item => item.field === field);
    };
    const family = supported("family") ? semantic.family : null;
    const scope = supported("copyleftScope") ? semantic.copyleftScope : null;
    if (family === "permissive") tags.add("permissive");
    if (family === "strong-copyleft" && scope === "whole-work" && !tags.has("share-alike")) tags.add("strong-copyleft");
    if (family === "weak-copyleft" && scope === "file") tags.add("file-copyleft");
    if (family === "weak-copyleft" && scope === "library") tags.add("library-copyleft");
    if (family === "network-copyleft" && scope === "network") tags.add("network-copyleft");
    if (supported("permissions") && semantic.permissions.includes("patent-grant")) tags.add("patent-grant");
    if (supported("obligations")) {
      if (semantic.obligations.some(item => item === "include-copyright" || item === "include-notice")) tags.add("preserve-notices");
      if (semantic.obligations.includes("mark-modifications")) tags.add("mark-changes");
    }
  }
  return dictionary.filter(tag => tags.has(tag.id)).map(tag => tag.id);
}

export function baseRecord(record) {
  const source = { ...record };
  delete source.metadata;
  delete source.tags;
  delete source.editorial;
  return source;
}

export function addEditorial(record, profile, rows, detail = false) {
  const editorial = rows.get(`${record.type}:${record.id}`);
  const tags = catalogTagIds(profile, editorial);
  if (tags.length) record.tags = tags;
  if (detail && editorial) {
    const { release, approval, spdxInclusion, publisher, summary, purposes, properties, related, exceptionUse } = editorial;
    const fields = { release, approval, spdxInclusion, publisher, summary, purposes, properties, related, exceptionUse };
    if (Object.values(fields).some(value => value !== undefined)) record.editorial = fields;
  }
  return record;
}
