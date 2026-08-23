import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildAppData } from "./build-app-data.mjs";
import { profileFilename } from "./runtime-metadata-adapter.mjs";

const chooserFiles = [
  "0bsd.txt", "agpl-3.0.txt", "apache-2.0.txt", "bsd-3-clause.txt",
  "cc0-1.0.txt", "eupl-1.2.txt", "gpl-3.0.txt", "lgpl-3.0.txt",
  "mit.txt", "mpl-2.0.txt", "unlicense.txt", "zlib.txt",
];

const licenseProfile = (id) => ({
  id,
  kind: "license",
  schemaVersion: "1.0.0",
  sourceFingerprint: { sourceId: "spdx-license-list", revision: "r1", contentHash: "sha256:x" },
  review: { status: "pending", recommendable: false, evidenceLevel: "unknown" },
  semantic: {
    family: "unknown", copyleftScope: "unknown", permissions: ["unknown"], obligations: ["unknown"],
    triggers: ["unknown"], restrictions: ["unknown"], patentPosition: "unknown", noticeBurden: "unknown",
  },
  evidence: [],
});

const exceptionProfile = (id) => ({
  id,
  kind: "exception",
  schemaVersion: "1.0.0",
  sourceFingerprint: { sourceId: "spdx-license-list", revision: "r1", contentHash: "sha256:x" },
  review: { status: "pending", recommendable: false, evidenceLevel: "unknown" },
  semantic: { exceptionApplicability: "unknown", permissions: ["unknown"], triggers: ["unknown"], restrictions: ["unknown"] },
  evidence: [],
});

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value));
}

async function fixture({ profile = "valid" } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "lic-006-build-"));
  const spdxDir = path.join(root, "spdx");
  const chooserDir = path.join(root, "chooser");
  const profilesDir = path.join(root, "profiles");
  const outputDir = path.join(root, "output");
  await writeJson(path.join(spdxDir, "json/licenses.json"), {
    licenseListVersion: "fixture-1",
    licenses: [{ licenseId: "MIT" }],
  });
  await writeJson(path.join(spdxDir, "json/exceptions.json"), {
    exceptions: [{ licenseExceptionId: "LLVM-exception" }],
  });
  await writeJson(path.join(spdxDir, "json/details/MIT.json"), {
    licenseId: "MIT", name: "MIT License", isDeprecatedLicenseId: false,
    isOsiApproved: true, isFsfLibre: true, licenseText: "Permission is hereby granted.",
    seeAlso: ["https://example.test/mit"], licenseComments: "Legacy comment",
  });
  await writeJson(path.join(spdxDir, "json/exceptions/LLVM-exception.json"), {
    licenseExceptionId: "LLVM-exception", name: "LLVM Exception", isDeprecatedLicenseId: false,
    licenseExceptionText: "This exception applies.", seeAlso: ["https://example.test/llvm"],
  });
  await mkdir(path.join(chooserDir, "_licenses"), { recursive: true });
  for (const file of chooserFiles) {
    const id = file === "mit.txt" ? "MIT" : file.replace(/\.txt$/, "").toUpperCase();
    await writeFile(path.join(chooserDir, "_licenses", file), `---\nspdx-id: ${id}\npermissions:\n  - use\nconditions: []\nlimitations:\n  - none\n---\n`);
  }
  if (profile !== "missing") {
    await writeJson(path.join(profilesDir, "licenses", profileFilename("MIT")),
      profile === "invalid" ? { id: "MIT", kind: "license" } : licenseProfile("MIT"));
    await writeJson(path.join(profilesDir, "exceptions", profileFilename("LLVM-exception")), exceptionProfile("LLVM-exception"));
  }
  return { spdxDir, chooserDir, profilesDir, outputDir };
}

async function contentHash(directory) {
  const files = [["", new Uint8Array(0)]];
  async function collect(current, relative = "") {
    for (const entry of (await readdir(current)).sort()) {
      const file = path.join(current, entry);
      const child = path.join(relative, entry);
      if ((await stat(file)).isDirectory()) await collect(file, child);
      else files.push([child, await readFile(file)]);
    }
  }
  await collect(directory);
  files.shift();
  const hash = createHash("sha256");
  for (const [file, content] of files) hash.update(file).update("\0").update(content).update("\0");
  return hash.digest("hex");
}

test("buildAppData preserves legacy fields, namespaces both metadata records, and is deterministic", async () => {
  const fixtureData = await fixture();
  const first = await buildAppData(fixtureData);
  const firstHash = await contentHash(fixtureData.outputDir);
  const license = JSON.parse(await readFile(path.join(fixtureData.outputDir, "licenses/MIT.json"), "utf8"));
  const exception = JSON.parse(await readFile(path.join(fixtureData.outputDir, "exceptions/LLVM-exception.json"), "utf8"));
  assert.deepEqual({ id: license.id, name: license.name, text: license.text, osi: license.osi, seeAlso: license.seeAlso }, {
    id: "MIT", name: "MIT License", text: "Permission is hereby granted.", osi: true, seeAlso: ["https://example.test/mit"],
  });
  assert.equal(license.metadata.kind, "license");
  assert.equal(license.metadata.id, "MIT");
  assert.equal(exception.metadata.kind, "exception");
  assert.equal(exception.metadata.id, "LLVM-exception");
  assert.equal(first.licenses, 1);
  assert.equal(first.exceptions, 1);
  await buildAppData(fixtureData);
  assert.equal(await contentHash(fixtureData.outputDir), firstHash);
});

for (const profile of ["missing", "invalid"]) {
  test(`fails before deleting output when the ${profile} profile cannot be joined`, async () => {
    const fixtureData = await fixture({ profile });
    await mkdir(fixtureData.outputDir, { recursive: true });
    const sentinel = path.join(fixtureData.outputDir, "sentinel.txt");
    await writeFile(sentinel, "preserve me");
    await assert.rejects(() => buildAppData(fixtureData), /Missing or invalid curated profile|schema-invalid curated profile/);
    assert.equal(await readFile(sentinel, "utf8"), "preserve me");
  });
}
