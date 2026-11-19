import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const manifest = JSON.parse(await read("../package.json"));
const lock = JSON.parse(await read("../package-lock.json"));
const tauri = JSON.parse(await read("../src-tauri/tauri.conf.json"));
const cargo = await read("../src-tauri/Cargo.toml");
const cargoLock = await read("../src-tauri/Cargo.lock");
const versions = {
  "package-lock.json": lock.version,
  "package-lock.json (root package)": lock.packages?.[""]?.version,
  "tauri.conf.json": tauri.version,
  "Cargo.toml": cargo.match(/^\[package\]\s*\n(?:[^\n]+\n)*?version\s*=\s*"([^"]+)"/m)?.[1],
  "Cargo.lock": cargoLock.match(/^name = "licentia"\r?\nversion = "([^"]+)"/m)?.[1],
};
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("package.json must contain a stable application version");
for (const [name, version] of Object.entries(versions)) {
  if (version !== manifest.version) throw new Error(`${name}: expected ${manifest.version}, found ${version}`);
}
console.log(`Licentia application version: ${manifest.version}`);
