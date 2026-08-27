import { cp, rm, writeFile, readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const output = path.join(root, "apache-dist");
await cp(path.join(root, "apache-server"), output, { recursive: true, force: true });
const manifest = [];
async function walk(dir) {
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name);
    const info = await stat(file);
    if (info.isDirectory()) await walk(file);
    else if (!file.endsWith("checksums.sha256")) manifest.push(`${createHash("sha256").update(await readFile(file)).digest("hex")}  ${path.relative(output, file)}`);
  }
}
await walk(output);
await writeFile(path.join(output, "checksums.sha256"), manifest.sort().join("\n") + "\n");
await rm(path.join(output, "api", "config.php"), { force: true });
