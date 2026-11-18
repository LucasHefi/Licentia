import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogTagIds, validateEditorial } from "./catalog-editorial.mjs";
import { matchesCatalogTags, priorityTags } from "../lib/catalog-tags.ts";

const readJson = (file: string) => JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const rows = readJson("../data/catalog-editorial.json");
const catalog = readJson("../public/data/catalog.json");

function record(kind: string, id: string) {
  return readJson(`../public/data/${kind}s/${id}.json`);
}

const profiles = new Map(catalog.map(({ metadata }: { metadata: { kind: string; id: string } }) => [
  `${metadata.kind}:${metadata.id}`, metadata,
]));

test("editorial records are identity-bound and require field-level evidence", () => {
  const apache = rows[0];
  const validate = (patch: object) => validateEditorial([{ ...apache, ...patch }], profiles);
  assert.doesNotThrow(() => validateEditorial(rows, profiles));
  assert.throws(() => validateEditorial([apache, apache], profiles), /duplicate/);
  assert.throws(() => validate({ id: "missing" }), /unknown/);
  assert.throws(() => validate({ textHash: "changed" }), /source text changed/);
  assert.throws(() => validate({ purposes: [{ ...apache.purposes[0], value: "imaginary" }] }), /invalid value/);
  assert.throws(() => validate({ release: { ...apache.release, value: { date: "2004-01", precision: "day" } } }), /invalid value/);
  assert.throws(() => validate({ release: { ...apache.release, value: { date: "2004-02-30", precision: "day" } } }), /invalid value/);
  assert.throws(() => validate({ publisher: { value: "Name" } }), /source title and locator/);
  assert.throws(() => validate({ publisher: { value: "Name", source: { ...apache.publisher.source, url: "javascript:void(0)" } } }), /invalid external source/);
  const gpl = rows.find((value: { id: string }) => value.id === "GPL-3.0-only");
  assert.throws(() => validateEditorial([gpl], profiles), /variant must link back/);
});

test("tag derivation requires field evidence and never copies classification to an exception", () => {
  const apache = structuredClone(record("license", "Apache-2.0").metadata);
  const tags = catalogTagIds(apache);
  assert.deepEqual(priorityTags(tags), ["permissive", "patent-grant", "preserve-notices"]);
  assert(!tags.includes("source-on-distribution"));
  apache.review.status = "not-recommendable";
  apache.review.recommendable = false;
  apache.evidence = apache.evidence.filter((item: { field: string }) => item.field !== "permissions");
  assert(!catalogTagIds(apache).includes("patent-grant"));
  assert(catalogTagIds(apache).includes("permissive"));
  apache.semantic.family = "unknown";
  assert(!catalogTagIds(apache).includes("permissive"));
  apache.review.status = "stale";
  assert.deepEqual(catalogTagIds(apache), []);
  const exception = record("exception", "GCC-exception-3.1");
  assert.deepEqual(catalogTagIds(exception.metadata), []);
  assert.equal(exception.editorial.exceptionUse.value, "GPL-3.0-only");
});

test("generated catalog and detail agree on tags and GNU identity variants share a release", () => {
  const samples: [string, string[]][] = [
    ["Apache-2.0", ["permissive", "patent-grant", "preserve-notices"]],
    ["MIT", ["permissive", "preserve-notices"]],
    ["GPL-3.0-only", ["strong-copyleft", "source-on-distribution"]],
    ["LGPL-2.1-only", ["library-copyleft", "source-on-distribution"]],
    ["MPL-2.0", ["file-copyleft", "source-on-distribution"]],
    ["AGPL-3.0-only", ["network-copyleft", "source-on-network-use"]],
    ["CC-BY-SA-4.0", ["share-alike", "media"]],
  ];
  for (const [id, expected] of samples) {
    const summary = catalog.find((value: { id: string }) => value.id === id);
    const detail = record("license", id);
    assert.deepEqual(summary.tags, detail.tags, id);
    for (const tag of expected) assert(detail.tags.includes(tag), `${id}: ${tag}`);
  }
  const gpl = record("license", "GPL-3.0-only");
  assert.deepEqual(gpl.editorial.release, record("license", "GPL-3.0-or-later").editorial.release);
  assert.equal(gpl.editorial.release.value.date, "2007-06-29");
  assert.equal(record("license", "MIT").editorial.release, undefined);
});

test("facets use OR within groups, AND across groups and accept old records", () => {
  const selected = new Set(["permissive", "network-copyleft", "software", "data"]);
  assert(matchesCatalogTags(["permissive", "software"], selected));
  assert(matchesCatalogTags(["network-copyleft", "data"], selected));
  assert(!matchesCatalogTags(["software"], selected));
  assert(!matchesCatalogTags(["permissive", "fonts"], selected));
  assert(matchesCatalogTags(["software"], selected, "properties"));
  assert(matchesCatalogTags(undefined, new Set()));
  assert(!matchesCatalogTags(undefined, selected));
});
