#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { validateRuntimeMetadata } from "./runtime-metadata-adapter.mjs";

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

function validateMetadata(metadata, kind, id, at) {
  try {
    validateRuntimeMetadata(metadata, kind, id, at);
  } catch (error) {
    errors.push(error.message);
  }
}

function verifyTags(detail, key) {
  if (!isDeepStrictEqual(detail.tags, summaries.get(key)?.tags)) {
    errors.push(`${key}: odlišné tagy v katalogu a detailu.`);
  }
}

const summaries = new Map(catalog.map(item => [`${item.type}:${item.id}`, item]));

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
    validateMetadata(item.metadata, item.type, item.id, `catalog.${key}`);
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
  validateMetadata(target.metadata, "license", summary.licenseId, summary.licenseId);
  verifyTags(target, `license:${summary.licenseId}`);
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
  validateMetadata(target.metadata, "exception", summary.licenseExceptionId, summary.licenseExceptionId);
  verifyTags(target, `exception:${summary.licenseExceptionId}`);
  if (target.text !== source.licenseExceptionText) errors.push(`${summary.licenseExceptionId}: odlišné znění výjimky.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Ověřeno ${licenses.licenses.length} licencí a ${exceptions.exceptions.length} výjimek; texty jsou doslovné.`);
