#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { validateProfile } from "./validate-license-data.mjs";
import { enumerateSources } from "./sync-license-profiles.mjs";
import { metadataProfileFromCatalog, recommendationEligibility, runtimeSourceLockResolved } from "../lib/recommendation-contract.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewDir = path.join(root, "data/content-reviews/licenses");
const reportDir = path.join(root, "docs/reports/licenses");
const assignmentFile = path.join(root, "data/review-workflow/assignments.json");
const expansionFile = path.join(root, "data/guide-expansion.json");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const filename = id => `id-${Buffer.from(id).toString("base64url")}.json`;
const textFields = ["subjectCs", "grantCs", "conditionsCs", "limitationsCs", "compatibilityCs"];
const evidenceFields = ["family", "copyleftScope", "permissions", "obligations", "triggers", "restrictions", "patentPosition", "noticeBurden", "review"];
const cleanCell = text => text.replaceAll("|", "\\|").replaceAll("\n", " ");

function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

export function validateContentReview(review, profile, { originalFingerprint, expectedId, priorIds = new Set(), catalogRecord, sourceLockResolved = true } = {}) {
  assert.ok(review && typeof review === "object" && !Array.isArray(review), "review must be an object");
  assert.equal(review.id, expectedId ?? profile.id, "review identity");
  assert.match(review.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, "review date");
  assert.deepEqual(review.sourceFingerprint, profile.sourceFingerprint, `${review.id}: review/profile fingerprint mismatch`);
  if (originalFingerprint) assert.deepEqual(profile.sourceFingerprint, originalFingerprint, `${review.id}: source fingerprint changed`);
  assert.ok(["individual-full-text", "prior-individual-full-text"].includes(review.reviewMethod), "review method");
  if (review.reviewMethod === "prior-individual-full-text") assert.ok(priorIds.has(review.id), `${review.id}: cannot invent prior completion`);
  else {
    assert.equal(review.ruleVersion, "2026-09-09.10", "new review version");
    for (const field of textFields) assert.ok(typeof review.analysis?.[field] === "string" && review.analysis[field].trim().length > 10, `${review.id}: missing ${field}`);
  }
  assert.ok(typeof review.summaryCs === "string" && review.summaryCs.trim().length > 30, `${review.id}: summary missing`);
  assert.ok(Array.isArray(review.blockersCs) && review.blockersCs.every(value => typeof value === "string" && value.trim().length > 10), `${review.id}: malformed blockers`);
  assert.ok(Array.isArray(review.sources) && review.sources.length > 0, `${review.id}: sources missing`);
  for (const source of review.sources) {
    assert.ok(typeof source.url === "string" && /^https?:\/\//.test(source.url), `${review.id}: source URL`);
    assert.ok(typeof source.note === "string" && source.note.trim(), `${review.id}: source finding missing`);
  }
  validateProfile(profile, { file: filename(review.id), release: true });
  assert.equal(profile.review.evidenceLevel, "strong", `${review.id}: full review must have strong evidence`);
  for (const field of evidenceFields) {
    const entries = profile.evidence.filter(entry => entry.field === field);
    assert.ok(entries.length > 0 && entries.some(entry => entry.locator.length > 30), `${review.id}: missing substantive ${field} evidence`);
    if (review.reviewMethod === "individual-full-text") assert.ok(entries.some(entry => entry.ruleId === "guide-expansion.editorial-review" && entry.ruleVersion === review.ruleVersion && entry.locator.trim().length > 30), `${review.id}: field ${field} was not individually re-reviewed`);
  }
  assert.ok(["eligible", "blocked"].includes(review.disposition), `${review.id}: disposition`);
  if (review.disposition === "blocked") {
    assert.equal(profile.review.status, "not-recommendable");
    assert.equal(profile.review.recommendable, false);
    assert.ok(review.blockersCs.length > 0, `${review.id}: blocked without a next step`);
  } else {
    assert.equal(profile.review.status, "reviewed");
    assert.equal(profile.review.recommendable, true);
    assert.deepEqual(review.blockersCs, []);
    {
      const metadata = { contractVersion: "1.0.0", kind: profile.kind, id: profile.id, review: profile.review, semantic: profile.semantic, sourceFingerprint: profile.sourceFingerprint, evidence: profile.evidence };
      const candidate = metadataProfileFromCatalog({ id: profile.id, type: profile.kind, deprecated: false, ...catalogRecord, metadata });
      assert.ok(candidate, `${review.id}: invalid runtime metadata`);
      const result = recommendationEligibility(candidate, {}, { sourceLockResolved, ruleVersion: "1.0.0" });
      assert.equal(result.eligible, true, `${review.id}: guide rejects claimed eligibility: ${result.exclusionReasons.join("; ")}`);
    }
  }
  return review;
}

export function readReviewState() {
  const assignments = read(assignmentFile);
  const catalog = read(path.join(root, "public/data/catalog.json"));
  const licenses = catalog.filter(item => item.type === "license");
  const priorIds = new Set(assignments.alreadyDocumented);
  const revisitedIds = new Set(assignments.parentRevisitedIds ?? []);
  assert.equal(revisitedIds.size, (assignments.parentRevisitedIds ?? []).length, "duplicate parent revisit");
  for (const id of revisitedIds) assert.ok(priorIds.has(id), `${id}: parent revisit must refer to a documented prior review`);
  const owners = new Map();
  for (const [owner, ids] of Object.entries(assignments.streams)) {
    for (const id of ids) {
      assert.ok(!owners.has(id) && !priorIds.has(id), `duplicate assignment: ${id}`);
      owners.set(id, owner);
    }
  }
  assert.deepEqual([...priorIds, ...owners.keys()].sort(), licenses.map(item => item.id).sort(), "assignment does not cover exactly the license catalog");
  const fingerprints = new Map(enumerateSources().records.filter(record => record.kind === "license").map(record => [record.id, record.fingerprint]));
  const sourceLockResolved = runtimeSourceLockResolved(catalog);
  const completed = new Map();
  for (const file of fs.readdirSync(reviewDir).filter(file => file.endsWith(".json"))) {
    const review = read(path.join(reviewDir, file));
    const record = licenses.find(item => item.id === review.id);
    assert.ok(record, `unexpected review ID: ${review.id}`);
    assert.equal(file, filename(review.id), "review filename does not match its ID");
    const profile = read(path.join(root, "data/profiles/licenses", file));
    validateContentReview(review, profile, { expectedId: record.id, originalFingerprint: fingerprints.get(record.id), priorIds, catalogRecord: record, sourceLockResolved });
    if (revisitedIds.has(review.id)) assert.equal(review.reviewMethod, "individual-full-text", `${review.id}: parent revisit requires a new individual review`);
    completed.set(review.id, { review, profile, record, owner: owners.get(review.id) ?? (revisitedIds.has(review.id) ? "parent_revisit" : "prior") });
  }
  return { assignments, licenses, priorIds, revisitedIds, owners, completed, remaining: licenses.filter(item => !completed.has(item.id)).map(item => item.id) };
}

function backfillPriorReviews() {
  const assignments = read(assignmentFile);
  const expansion = read(expansionFile);
  for (const id of assignments.alreadyDocumented) {
    const output = path.join(reviewDir, filename(id));
    if (fs.existsSync(output)) continue;
    const profile = read(path.join(root, "data/profiles/licenses", filename(id)));
    const blocked = Object.hasOwn(expansion.blockedNotes, id);
    const evidence = profile.evidence.find(entry => entry.field === "review" && entry.ruleId === "guide-expansion.editorial-review");
    assert.ok(evidence, `${id}: no prior individual evidence`);
    writeJsonAtomic(output, {
      id, reviewedAt: expansion.reviewedAt, ruleVersion: evidence.ruleVersion,
      reviewMethod: "prior-individual-full-text", sourceFingerprint: profile.sourceFingerprint,
      disposition: blocked ? "blocked" : "eligible",
      summaryCs: blocked ? expansion.blockedDisplayNotes[id] : expansion.notes[id],
      blockersCs: blocked ? [expansion.blockedNotes[id]] : [],
      sources: [{ url: `https://spdx.org/licenses/${id}.html`, note: `Dřívější individuální revize ${evidence.ruleVersion}; podrobné doložení jednotlivých polí je zachováno v kurátorovaném profilu.` }],
    });
  }
}

function renderLicenseReview({ review, profile, record }) {
  const labels = { subjectCs: "Předmět a rozsah", grantCs: "Udělená práva", conditionsCs: "Podmínky a spouštěče", limitationsCs: "Omezení, výjimky a ukončení", compatibilityCs: "Verze a kombinování" };
  const lines = [`# ${review.id} — obsahová revize`, "", record.name, "", `Revize: **${review.reviewedAt}** · pravidlo **${review.ruleVersion}**.`, "", `Výsledek: **${review.disposition === "eligible" ? "způsobilá pro průvodce podle kurátorovaného profilu" : "zpracována, nezařazena do průvodce"}**.`, "", review.summaryCs, ""];
  if (review.reviewMethod === "prior-individual-full-text") lines.push("Tento záznam zachovává již dokončenou individuální revizi z předchozích várek. Nejde o novou revizi provedenou při vytvoření tohoto souboru.", "");
  for (const field of textFields) if (review.analysis?.[field]) lines.push(`## ${labels[field]}`, "", review.analysis[field], "");
  if (review.blockersCs.length) lines.push("## Překážky a navazující práce", "", ...review.blockersCs.map(value => `- ${value}`), "");
  lines.push("## Metadata a jejich doložení", "", "| Pole | Hodnota | Doložení znění |", "|---|---|---|");
  for (const field of evidenceFields.filter(field => field !== "review")) lines.push(`| ${field} | ${cleanCell(JSON.stringify(profile.semantic[field]))} | ${cleanCell(profile.evidence.filter(entry => entry.field === field).map(entry => entry.locator).join("; "))} |`);
  lines.push("", "## Zdroje", "", ...review.sources.map(source => `- [Primární zdroj](${source.url}) — ${source.note}`), `- [Kurátorovaný profil](../../../data/profiles/licenses/${filename(review.id)})`, `- [Uložené úplné znění](../../../public/data/licenses/${review.id}.json)`, "", "## Otisk zdroje", "", "```json", JSON.stringify(review.sourceFingerprint, null, 2), "```", "");
  return lines.join("\n");
}

export function renderReviewProgress(state) {
  const counts = [...state.completed.values()].reduce((totals, item) => ({ ...totals, [item.review.disposition]: totals[item.review.disposition] + 1 }), { eligible: 0, blocked: 0 });
  const lines = ["# Systematická revize všech licencí", "", "Každá dokončená položka má samostatný záznam, úplné doložení osmi metadatových polí a výslovné rozhodnutí o zařazení. Dokončená revize neznamená automatické doporučení licence pro nový softwarový projekt.", "", "| Stav | Počet |", "|---|---:|", `| Licence v rozsahu | ${state.licenses.length} |`, `| Dokončené individuální revize | ${state.completed.size} |`, `| Z toho způsobilé podle profilů | ${counts.eligible} |`, `| Z toho zpracované s překážkou | ${counts.blocked} |`, `| Zbývá zpracovat | ${state.remaining.length} |`, "", "84 licenčních výjimek není samostatnými licencemi a tento přehled je nepovažuje za kandidáty průvodce. Aktuální synchronizované zařazení v aplikaci ověřuje [report průvodce](guide-inclusion.md).", "", "## Pracovní proudy", "", "| Proud | Přiděleno | Dokončeno | Zbývá |", "|---|---:|---:|---:|"];
  for (const [owner, ids] of Object.entries(state.assignments.streams)) {
    const done = ids.filter(id => state.completed.has(id)).length;
    lines.push(`| ${owner} | ${ids.length} | ${done} | ${ids.length - done} |`);
  }
  if (state.revisitedIds.size) lines.push("", `Hlavní agent navíc znovu individuálně posoudil ${state.revisitedIds.size} dřívějších revizí po rozšíření slovníku. Jsou součástí původních 202 položek a nezvyšují počet licencí v rozsahu.`, "");
  const dates = [...state.completed.values()].map(item => item.review.reviewedAt).sort();
  if (dates.length) lines.push("", `Období doložených revizí: ${dates[0]} až ${dates.at(-1)}. Identifikátor dávky označuje její zahájení; jednotlivé záznamy uchovávají skutečné datum posouzení.`, "");
  lines.push("", "## Jednotlivé licence", "", "| Licence | Stav revize | Překážka / další práce |", "|---|---|---|");
  for (const record of [...state.licenses].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    const item = state.completed.get(record.id);
    lines.push(item ? `| [${record.id}](licenses/${record.id}.md) | ${item.review.disposition === "eligible" ? "Zpracována; způsobilá" : "Zpracována; nezařazena"} | ${cleanCell(item.review.blockersCs.join(" ")) || "—"} |` : `| ${record.id} | Čeká na individuální revizi (${state.owners.get(record.id) ?? "prior"}) | Zatím nelze vydávat generický stav reviewed za dokončenou obsahovou revizi. |`);
  }
  lines.push("", "## Reprodukce", "", "```bash", "npm run data:reviews:report", "npm run data:reviews:check", "```", "");
  return lines.join("\n");
}

function writeReports(state) {
  fs.mkdirSync(reportDir, { recursive: true });
  for (const item of state.completed.values()) fs.writeFileSync(path.join(reportDir, `${item.review.id}.md`), renderLicenseReview(item));
  fs.writeFileSync(path.join(root, "docs/reports/systematic-review.md"), renderReviewProgress(state));
}

function integrateCompletedReview(state) {
  assert.equal(state.remaining.length, 0, `Integration requires complete coverage; ${state.remaining.length} licenses remain`);
  const expansion = read(expansionFile);
  const baseline = new Set(state.assignments.baselineEligibleIds);
  const reviewedAt = [...state.completed.values()].map(item => item.review.reviewedAt).sort().at(-1);
  const batch = { id: "2026-09-09-10", reviewedAt, included: [], updated: [], excluded: [] };
  for (const [id, { review }] of state.completed) {
    if (state.priorIds.has(id) && !state.revisitedIds.has(id)) continue;
    if (review.disposition === "eligible") {
      expansion.notes[id] = review.summaryCs;
      delete expansion.blockedNotes[id]; delete expansion.blockedDisplayNotes[id];
      (baseline.has(id) ? batch.updated : batch.included).push(id);
    } else {
      delete expansion.notes[id];
      expansion.blockedNotes[id] = review.blockersCs.join(" ");
      expansion.blockedDisplayNotes[id] = review.summaryCs;
      batch.excluded.push(id);
    }
  }
  for (const key of ["included", "updated", "excluded"]) batch[key].sort();
  expansion.reviewedAt = reviewedAt;
  expansion.batches = [...expansion.batches.filter(item => item.id !== batch.id), batch];
  for (const key of ["notes", "blockedNotes", "blockedDisplayNotes"]) expansion[key] = Object.fromEntries(Object.entries(expansion[key]).sort(([a], [b]) => a.localeCompare(b, "en")));
  writeJsonAtomic(expansionFile, expansion);
  return batch;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes("--backfill-prior")) backfillPriorReviews();
  const state = readReviewState();
  if (process.argv.includes("--require-complete")) assert.equal(state.remaining.length, 0, `${state.remaining.length} licenses still need review`);
  if (process.argv.includes("--integrate")) console.log(JSON.stringify(integrateCompletedReview(state)));
  if (process.argv.includes("--check")) {
    assert.equal(fs.readFileSync(path.join(root, "docs/reports/systematic-review.md"), "utf8"), renderReviewProgress(state), "systematic report is stale");
    for (const item of state.completed.values()) assert.equal(fs.readFileSync(path.join(reportDir, `${item.review.id}.md`), "utf8"), renderLicenseReview(item), `${item.review.id}: individual report is stale`);
  } else writeReports(state);
  console.log(JSON.stringify({ licenses: state.licenses.length, reviewed: state.completed.size, remaining: state.remaining.length }));
}
