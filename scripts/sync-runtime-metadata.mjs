#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adaptRecord, joinCuratedProfiles } from "./runtime-metadata-adapter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "public", "data");
const catalogPath = path.join(dataRoot, "catalog.json");
const profileRoot = path.join(root, "data", "profiles");

function sourceRecord(record) {
  const source = { ...record };
  delete source.metadata;
  return source;
}

function serialized(value) {
  return `${JSON.stringify(value)}\n`;
}

export async function syncRuntimeMetadata({ mode = "check" } = {}) {
  if (!new Set(["check", "write"]).has(mode)) throw new Error(`Unsupported mode: ${mode}`);
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  if (!Array.isArray(catalog)) throw new Error("public/data/catalog.json: expected array");
  const identities = catalog.map((record) => ({ kind: record.type, id: record.id }));
  const profiles = await joinCuratedProfiles(identities, profileRoot);
  const nextCatalog = [];
  const detailWrites = [];
  const stale = [];

  for (const record of catalog) {
    const key = `${record.type}:${record.id}`;
    const profile = profiles.get(key);
    if (!profile) throw new Error(`${key}: curated profile was not joined`);
    nextCatalog.push(adaptRecord(sourceRecord(record), profile));

    const detailPath = path.join(dataRoot, `${record.type}s`, `${record.id}.json`);
    const detail = JSON.parse(await readFile(detailPath, "utf8"));
    if (detail.type !== record.type || detail.id !== record.id) throw new Error(`${detailPath}: catalog/detail identity mismatch`);
    const nextDetail = adaptRecord(sourceRecord(detail), profile);
    const next = serialized(nextDetail);
    const current = await readFile(detailPath, "utf8");
    if (current !== next) stale.push(path.relative(root, detailPath));
    detailWrites.push([detailPath, next]);
  }

  const nextCatalogText = serialized(nextCatalog);
  if (await readFile(catalogPath, "utf8") !== nextCatalogText) stale.push(path.relative(root, catalogPath));
  if (mode === "check" && stale.length) throw new Error(`Runtime metadata is stale in ${stale.length} file(s). Run npm run data:runtime:write.`);
  if (mode === "write") {
    await Promise.all(detailWrites.map(([file, contents]) => writeFile(file, contents)));
    await writeFile(catalogPath, nextCatalogText);
  }
  return { records: nextCatalog.length, changed: stale.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const mode = process.argv.includes("--write") ? "write" : "check";
    const result = await syncRuntimeMetadata({ mode });
    process.stdout.write(`runtime metadata ${mode === "write" ? "synchronized" : "is current"}: ${result.records} records, ${result.changed} changed files\n`);
  } catch (error) {
    process.stderr.write(`runtime metadata sync failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
