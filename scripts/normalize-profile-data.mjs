#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.argv[2] ?? "public/data");
const catalogPath = path.join(dataDir, "catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
for (const item of catalog) {
  for (const key of ["permissions", "conditions", "limitations"]) if (!Array.isArray(item[key])) item[key] = [];
  if (!item.profiled || item.type !== "license") continue;
  const detailPath = path.join(dataDir, "licenses", `${item.id}.json`);
  const detail = JSON.parse(await readFile(detailPath, "utf8"));
  if (detail.profile) for (const key of ["permissions", "conditions", "limitations"]) if (!Array.isArray(detail.profile[key])) detail.profile[key] = [];
  await writeFile(detailPath, JSON.stringify(detail));
}
await writeFile(catalogPath, JSON.stringify(catalog));
console.log(`Normalizováno ${catalog.length} katalogových položek.`);
