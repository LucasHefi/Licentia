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

if (catalog.length !== licenses.licenses.length + exceptions.exceptions.length) {
  errors.push(`Katalog má ${catalog.length} položek místo ${licenses.licenses.length + exceptions.exceptions.length}.`);
}

for (const summary of licenses.licenses) {
  const source = await readJson(path.join(spdxDir, "json", "details", `${summary.licenseId}.json`));
  const targetPath = path.join(dataDir, "licenses", `${summary.licenseId}.json`);
  await access(targetPath);
  const target = await readJson(targetPath);
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
  if (target.text !== source.licenseExceptionText) errors.push(`${summary.licenseExceptionId}: odlišné znění výjimky.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Ověřeno ${licenses.licenses.length} licencí a ${exceptions.exceptions.length} výjimek; texty jsou doslovné.`);
