#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adaptRecord, joinCuratedProfiles } from "./runtime-metadata-adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PROFILES_DIR = path.join(ROOT, "data/profiles");
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

function assertSafeOutputId(id, at) {
  if (typeof id !== "string" || !id || id === "." || id === ".." || id.includes("\0") || /[\\/]/.test(id)) {
    throw new Error(`${at}: unsafe source ID ${JSON.stringify(id)}`);
  }
}

async function readSourceDetails({ summaries, directory, idField, kind }) {
  const details = [];
  for (const [index, summary] of summaries.entries()) {
    const id = summary?.[idField];
    assertSafeOutputId(id, `source ${kind}[${index}].${idField}`);
    const file = path.join(directory, `${id}.json`);
    const item = await readJson(file);
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${file}: expected JSON object`);
    }
    if (item[idField] !== id) {
      throw new Error(`${file}: detail ID mismatch (expected ${id})`);
    }
    details.push(item);
  }
  return details;
}

function joinedProfile(joined, kind, id) {
  const key = `${kind}:${id}`;
  const profile = joined.get(key);
  if (!profile) throw new Error(`Missing curated profile join ${key}`);
  return profile;
}

function compareRuntimeRecords(a, b) {
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  return 0;
}

async function loadChooserProfiles(chooserDir) {
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
  return chooserProfiles;
}

export async function buildAppData({
  spdxDir,
  chooserDir,
  outputDir,
  profilesDir = DEFAULT_PROFILES_DIR,
}) {
  const catalogSource = await readJson(path.join(path.resolve(spdxDir), "json", "licenses.json"));
  const exceptionSource = await readJson(path.join(path.resolve(spdxDir), "json", "exceptions.json"));
  const chooserProfiles = await loadChooserProfiles(path.resolve(chooserDir));
  const resolvedOutputDir = path.resolve(outputDir);
  const resolvedProfilesDir = path.resolve(profilesDir);
  const resolvedSpdxDir = path.resolve(spdxDir);

  if (!Array.isArray(catalogSource.licenses) || !Array.isArray(exceptionSource.exceptions)) {
    throw new Error("SPDX source: licenses and exceptions must be arrays");
  }

  // Read and validate every detail before joining or touching the existing output.
  const licenseDetails = await readSourceDetails({
    summaries: catalogSource.licenses,
    directory: path.join(resolvedSpdxDir, "json", "details"),
    idField: "licenseId",
    kind: "licenses",
  });
  const exceptionDetails = await readSourceDetails({
    summaries: exceptionSource.exceptions,
    directory: path.join(resolvedSpdxDir, "json", "exceptions"),
    idField: "licenseExceptionId",
    kind: "exceptions",
  });
  const sourceRecords = [
    ...licenseDetails.map((item) => ({ kind: "license", id: item.licenseId })),
    ...exceptionDetails.map((item) => ({ kind: "exception", id: item.licenseExceptionId })),
  ];
  // This is deliberately before rm(outputDir): a missing or malformed join cannot destroy prior data.
  const curatedProfiles = await joinCuratedProfiles(sourceRecords, resolvedProfilesDir);

  const catalog = [];
  const searchIndex = [];
  const licenseRecords = [];
  const exceptionRecords = [];

  for (const item of licenseDetails) {
    const profile = chooserProfiles.get(item.licenseId) ?? null;
    const curated = joinedProfile(curatedProfiles, "license", item.licenseId);
    const detail = adaptRecord({
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
    }, curated);
    licenseRecords.push(detail);
    catalog.push(adaptRecord({
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
    }, curated));
    searchIndex.push({
      id: item.licenseId,
      type: "license",
      haystack: `${item.licenseId}\n${item.name}\n${item.licenseText}`.toLocaleLowerCase("cs"),
    });
  }

  for (const item of exceptionDetails) {
    const curated = joinedProfile(curatedProfiles, "exception", item.licenseExceptionId);
    const detail = adaptRecord({
      id: item.licenseExceptionId,
      name: item.name,
      type: "exception",
      deprecated: Boolean(item.isDeprecatedLicenseId),
      text: item.licenseExceptionText,
      template: item.licenseExceptionTemplate ?? null,
      comments: item.licenseComments ?? null,
      seeAlso: item.seeAlso ?? [],
    }, curated);
    exceptionRecords.push(detail);
    catalog.push(adaptRecord({
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
    }, curated));
    searchIndex.push({
      id: item.licenseExceptionId,
      type: "exception",
      haystack: `${item.licenseExceptionId}\n${item.name}\n${item.licenseExceptionText}`.toLocaleLowerCase("cs"),
    });
  }

  catalog.sort(compareRuntimeRecords);
  searchIndex.sort(compareRuntimeRecords);

  const licenseOutput = path.join(resolvedOutputDir, "licenses");
  const exceptionOutput = path.join(resolvedOutputDir, "exceptions");
  await rm(resolvedOutputDir, { recursive: true, force: true });
  await mkdir(licenseOutput, { recursive: true });
  await mkdir(exceptionOutput, { recursive: true });

  await Promise.all([
    ...licenseRecords.map((record) => writeFile(
      path.join(licenseOutput, `${record.id}.json`),
      JSON.stringify(record),
    )),
    ...exceptionRecords.map((record) => writeFile(
      path.join(exceptionOutput, `${record.id}.json`),
      JSON.stringify(record),
    )),
    writeFile(path.join(resolvedOutputDir, "catalog.json"), JSON.stringify(catalog)),
    writeFile(path.join(resolvedOutputDir, "search-index.json"), JSON.stringify(searchIndex)),
    writeFile(
      path.join(resolvedOutputDir, "manifest.json"),
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

  return {
    licenses: licenseRecords.length,
    exceptions: exceptionRecords.length,
    spdxVersion: catalogSource.licenseListVersion,
    outputDir: resolvedOutputDir,
  };
}

async function main() {
  const [spdxArg, chooserArg, outputArg = "public/data", profilesArg = DEFAULT_PROFILES_DIR] = process.argv.slice(2);
  if (!spdxArg || !chooserArg) {
    console.error("Použití: node scripts/build-app-data.mjs <spdx-data> <choosealicense> [výstup] [profily]");
    process.exitCode = 1;
    return;
  }
  try {
    const result = await buildAppData({
      spdxDir: spdxArg,
      chooserDir: chooserArg,
      outputDir: outputArg,
      profilesDir: profilesArg,
    });
    console.log(
      `Data aplikace: ${result.licenses} licencí, ` +
      `${result.exceptions} výjimek, SPDX ${result.spdxVersion}.`,
    );
  } catch (error) {
    console.error(`Data aplikace: generování selhalo: ${error.message}`);
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "")) {
  await main();
}
