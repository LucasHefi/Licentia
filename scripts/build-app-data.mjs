#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const [spdxArg, chooserArg, outputArg = "public/data"] = process.argv.slice(2);
if (!spdxArg || !chooserArg) {
  console.error("Použití: node scripts/build-app-data.mjs <spdx-data> <choosealicense> [výstup]");
  process.exit(1);
}

const spdxDir = path.resolve(spdxArg);
const chooserDir = path.resolve(chooserArg);
const outputDir = path.resolve(outputArg);
const licenseOutput = path.join(outputDir, "licenses");
const exceptionOutput = path.join(outputDir, "exceptions");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

function cleanHtml(value = "") {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseChooserFrontMatter(raw) {
  const block = raw.split(/^---\s*$/m)[1] ?? "";
  const result = { permissions: [], conditions: [], limitations: [] };
  let arrayKey = null;
  for (const line of block.split("\n")) {
    const array = line.match(/^(permissions|conditions|limitations):\s*$/);
    if (array) {
      arrayKey = array[1];
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && arrayKey) {
      result[arrayKey].push(item[1].trim());
      continue;
    }
    const scalar = line.match(/^([a-z-]+):\s*(.+)$/);
    if (scalar) {
      arrayKey = null;
      result[scalar[1]] = ["permissions", "conditions", "limitations"].includes(scalar[1]) && scalar[2].trim() === "[]"
        ? []
        : cleanHtml(scalar[2].trim());
    } else if (line.trim() && !line.startsWith(" ")) {
      arrayKey = null;
    }
  }
  return result;
}

const chooserProfiles = new Map();
const chooserFiles = [
  "0bsd.txt", "agpl-3.0.txt", "apache-2.0.txt", "bsd-3-clause.txt",
  "cc0-1.0.txt", "eupl-1.2.txt", "gpl-3.0.txt", "lgpl-3.0.txt",
  "mit.txt", "mpl-2.0.txt", "unlicense.txt", "zlib.txt",
];

for (const file of chooserFiles) {
  const profile = parseChooserFrontMatter(
    await readFile(path.join(chooserDir, "_licenses", file), "utf8"),
  );
  const currentId = {
    "AGPL-3.0": "AGPL-3.0-only",
    "GPL-3.0": "GPL-3.0-only",
    "LGPL-3.0": "LGPL-3.0-only",
  }[profile["spdx-id"]] ?? profile["spdx-id"];
  profile["spdx-id"] = currentId;
  chooserProfiles.set(currentId, profile);
}

const catalogSource = await readJson(path.join(spdxDir, "json", "licenses.json"));
const exceptionSource = await readJson(path.join(spdxDir, "json", "exceptions.json"));

await rm(outputDir, { recursive: true, force: true });
await mkdir(licenseOutput, { recursive: true });
await mkdir(exceptionOutput, { recursive: true });

const catalog = [];
const searchIndex = [];

for (const summary of catalogSource.licenses) {
  const item = await readJson(
    path.join(spdxDir, "json", "details", `${summary.licenseId}.json`),
  );
  const profile = chooserProfiles.get(item.licenseId) ?? null;
  const detail = {
    id: item.licenseId,
    name: item.name,
    type: "license",
    deprecated: Boolean(item.isDeprecatedLicenseId),
    osi: Boolean(item.isOsiApproved),
    fsf: Boolean(item.isFsfLibre),
    text: item.licenseText,
    template: item.standardLicenseTemplate ?? null,
    header: item.standardLicenseHeader ?? null,
    headerTemplate: item.standardLicenseHeaderTemplate ?? null,
    comments: item.licenseComments ?? item.comment ?? null,
    seeAlso: item.seeAlso ?? [],
    profile,
  };
  await writeFile(
    path.join(licenseOutput, `${item.licenseId}.json`),
    JSON.stringify(detail),
  );
  catalog.push({
    id: item.licenseId,
    name: item.name,
    type: "license",
    deprecated: detail.deprecated,
    osi: detail.osi,
    fsf: detail.fsf,
    profiled: Boolean(profile),
    permissions: profile?.permissions ?? [],
    conditions: profile?.conditions ?? [],
    limitations: profile?.limitations ?? [],
  });
  searchIndex.push({
    id: item.licenseId,
    type: "license",
    haystack: `${item.licenseId}\n${item.name}\n${item.licenseText}`.toLocaleLowerCase("cs"),
  });
}

for (const summary of exceptionSource.exceptions) {
  const item = await readJson(
    path.join(spdxDir, "json", "exceptions", `${summary.licenseExceptionId}.json`),
  );
  const detail = {
    id: item.licenseExceptionId,
    name: item.name,
    type: "exception",
    deprecated: Boolean(item.isDeprecatedLicenseId),
    text: item.licenseExceptionText,
    template: item.licenseExceptionTemplate ?? null,
    comments: item.licenseComments ?? null,
    seeAlso: item.seeAlso ?? [],
  };
  await writeFile(
    path.join(exceptionOutput, `${item.licenseExceptionId}.json`),
    JSON.stringify(detail),
  );
  catalog.push({
    id: item.licenseExceptionId,
    name: item.name,
    type: "exception",
    deprecated: detail.deprecated,
    osi: false,
    fsf: false,
    profiled: false,
    permissions: [],
    conditions: [],
    limitations: [],
  });
  searchIndex.push({
    id: item.licenseExceptionId,
    type: "exception",
    haystack: `${item.licenseExceptionId}\n${item.name}\n${item.licenseExceptionText}`.toLocaleLowerCase("cs"),
  });
}

catalog.sort((a, b) => a.id.localeCompare(b.id, "en"));
searchIndex.sort((a, b) => a.id.localeCompare(b.id, "en"));

await Promise.all([
  writeFile(path.join(outputDir, "catalog.json"), JSON.stringify(catalog)),
  writeFile(path.join(outputDir, "search-index.json"), JSON.stringify(searchIndex)),
  writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify({
      spdxVersion: catalogSource.licenseListVersion,
      licenses: catalogSource.licenses.length,
      exceptions: exceptionSource.exceptions.length,
      generatedAt: "2026-08-22",
      sources: {
        spdx: "https://spdx.org/licenses/",
        osi: "https://opensource.org/api/license",
        chooser: "https://choosealicense.com/",
      },
    }, null, 2),
  ),
]);

console.log(
  `Data aplikace: ${catalogSource.licenses.length} licencí, ` +
  `${exceptionSource.exceptions.length} výjimek, SPDX ${catalogSource.licenseListVersion}.`,
);
