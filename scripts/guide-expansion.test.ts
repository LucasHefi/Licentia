import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { continueGuide } from "../lib/catalog-service.ts";
import { familyOf, hasDisplayProfile, obligationLabel, profileForDisplay } from "../lib/recommend.ts";
import { buildGuideModel, GUIDE_ANSWER_INPUT_SCHEMA, metadataProfileFromCatalog, recommendationEligibility, recommendFromCatalog, runtimeSourceLockResolved } from "../lib/recommendation-contract.ts";
import { guideMessage } from "../lib/guide-copy.ts";
import { renderGuideReport, reportPath } from "./guide-inclusion-report.ts";
import type { LicenseDetail, LicenseSummary } from "../components/types.ts";

const catalog: LicenseSummary[] = JSON.parse(fs.readFileSync(new URL("../public/data/catalog.json", import.meta.url), "utf8"));
const expansion: { notes: Record<string, string>; blockedNotes: Record<string, string>; blockedDisplayNotes: Record<string, string> } = JSON.parse(fs.readFileSync(new URL("../data/guide-expansion.json", import.meta.url), "utf8"));
const context = { sourceLockResolved: runtimeSourceLockResolved(catalog), ruleVersion: "1.0.0" };
const record = (id: string) => catalog.find(item => item.type === "license" && item.id === id)!;
const detail = (id: string): LicenseDetail => JSON.parse(fs.readFileSync(new URL(`../public/data/licenses/${id}.json`, import.meta.url), "utf8"));

test("use acknowledgments preserve product and public-source conditions without inventing advertising or source supply", () => {
  for (const id of ["CryptoSwift", "zlib-acknowledgement", "MIT-enna"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.ok(profile.semantic.triggers.includes("use"), id);
    assert.ok(profile.semantic.obligations.includes("include-use-acknowledgment"), id);
    assert.ok(!profile.semantic.obligations.includes("provide-corresponding-source"), id);
    assert.equal(recommendationEligibility(profile, { advertising: "avoid" }, context).eligible, true, id);
    assert.equal(recommendationEligibility(profile, { obligations: "minimal" }, context).eligible, false, id);
  }
  assert.match(expansion.notes["MIT-enna"], /Pokud zdroje tohoto softwaru nejsou veřejně dostupné/);
  assert.match(expansion.notes["MIT-enna"], /pouze staticky či dynamicky připojený/);
  assert.match(expansion.notes["zlib-acknowledgement"], /nerozšiřuje na samotné binárky/);
  assert.match(expansion.notes.CryptoSwift, /zdrojové ani binární distribuci/);
});

test("notice placement and use are resolved independently of ambiguous grant scope", () => {
  const libutil = metadataProfileFromCatalog(record("libutil-David-Nugent"))!;
  assert.equal(recommendationEligibility(libutil, {}, context).eligible, true);
  assert.deepEqual(libutil.semantic.restrictions, ["warranty"]);
  assert.ok(libutil.semantic.triggers.includes("use"));
  assert.match(expansion.notes["libutil-David-Nugent"], /bezprostředně na začátku souboru/);
  assert.match(expansion.notes["libutil-David-Nugent"], /jiném užití než začlenění do FreeBSD/);
  const fair = metadataProfileFromCatalog(record("Fair"))!;
  assert.deepEqual(fair.semantic.triggers, ["use"]);
  assert.equal(recommendationEligibility(fair, {}, context).eligible, false);
  assert.match(expansion.blockedNotes.Fair, /rozsah usage of the works/);
});

test("an explicit patent exclusion is known metadata and cannot satisfy a patent-grant preference", () => {
  const clear = metadataProfileFromCatalog(record("BSD-3-Clause-Clear"))!;
  assert.equal(clear.semantic.patentPosition, "express-exclusion");
  assert.ok(!clear.semantic.permissions.includes("patent-grant"));
  assert.ok(!clear.semantic.restrictions.includes("patent-claim"));
  assert.equal(recommendationEligibility(clear, {}, context).eligible, true);
  assert.equal(recommendationEligibility(clear, { patents: "important" }, context).eligible, false);
});

test("both complete guide modes distinguish advertising consent from ordinary notices even without distribution", () => {
  const advertisingIds = ["Apache-1.0", "BSD-4-Clause", "BSD-4-Clause-Shortened", "BSD-Advertising-Acknowledgement", "Caldera-no-preamble"];
  for (const mode of ["quick", "advanced"] as const) {
    const questions = buildGuideModel().questions.filter(question => question.mode === mode);
    assert.deepEqual(questions.find(question => question.key === "advertising")?.options.slice(0, 2).map(option => option.value), ["allowed", "avoid"]);
    const answers = Object.fromEntries(questions.filter(question => !question.showWhen).map(question => [question.key, "unknown"]));
    Object.assign(answers, { openness: "open", reciprocity: "none", commercialUse: "allowed", projectForm: "application", delivery: "internal", patents: "neutral", advertising: "allowed" });
    const allowed = continueGuide(catalog, { mode, answers });
    assert.equal(allowed.complete, true);
    const accepted = [...allowed.recommendation!.candidates, ...allowed.recommendation!.alternatives];
    for (const id of [...advertisingIds, "BSD-3-Clause-Attribution", "BSD-Source-Code"]) {
      const candidate = accepted.find(item => item.id === id)!;
      assert.equal(candidate.status, "good fit", id);
      assert.equal(candidate.score, 100, `${id}: accepting advertising must not penalize or prefer either kind`);
      assert.ok(!candidate.matchedFields.includes("advertising"));
    }
    const avoided = continueGuide(catalog, { mode, answers: { ...answers, advertising: "avoid" } });
    assert.equal(avoided.complete, true);
    const all = [...avoided.recommendation!.candidates, ...avoided.recommendation!.alternatives];
    for (const id of advertisingIds) {
      const candidate = all.find(item => item.id === id)!;
      assert.equal(candidate.status, "review required", id);
      assert.equal(candidate.score, 85, id);
      assert.deepEqual(candidate.conflicts, ["advertising: requires an advertising acknowledgment"], id);
      assert.equal(guideMessage(candidate.conflicts[0]), "Vyžaduje poděkování v reklamě, které jste odmítli.");
      assert.ok(candidate.obligations.includes("include-advertising-acknowledgment"));
      assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, { advertising: "avoid" }, context).eligible, false);
    }
    for (const id of ["BSD-3-Clause-Attribution", "BSD-Source-Code"]) {
      const candidate = all.find(item => item.id === id)!;
      assert.equal(candidate.status, "good fit", id);
      assert.equal(candidate.score, 100, id);
    }
  }
  for (const id of ["Caldera", "BSD-4-Clause-UC"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, { advertising: "allowed" }, context).eligible, false, id);
  }
});

test("advertising and disclaimer propagation are nonminimal duties, never source-supply or copyleft", () => {
  for (const obligation of ["include-use-acknowledgment", "include-advertising-acknowledgment", "pass-disclaimer-requirement"]) {
    const item = structuredClone(record("MIT-0"));
    item.metadata!.semantic.obligations = [obligation];
    const profile = metadataProfileFromCatalog(item)!;
    assert.equal(recommendationEligibility(profile, {}, context).eligible, true);
    for (const answer of ["minimal", "source"] as const) {
      assert.equal(recommendationEligibility(profile, { obligations: answer }, context).eligible, false);
      assert.equal(recommendFromCatalog([item], { openness: "open", obligations: answer }, context).candidates[0].status, "review required");
    }
    assert.notEqual(obligationLabel(obligation, "none"), obligation);
  }
  const acpica = record("BSD-3-Clause-acpica").metadata!.semantic;
  assert.equal(acpica.copyleftScope, "none");
  assert.ok(acpica.obligations.includes("pass-disclaimer-requirement"));
  assert.ok(!acpica.obligations.includes("same-license"));
  assert.match(expansion.notes["BSD-3-Clause-acpica"], /podstatně obdobný disclaimer/);
});

test("BSD variants preserve the actual trigger, distribution form, disclaimers and historical blockers", () => {
  const shortened = record("BSD-4-Clause-Shortened").metadata!.semantic;
  assert.deepEqual(shortened.restrictions, ["trademark", "warranty"]);
  assert.ok(!shortened.obligations.includes("include-license-text"));
  assert.ok(shortened.obligations.includes("include-notice"));
  assert.deepEqual(record("BSD-Advertising-Acknowledgement").metadata!.semantic.restrictions, ["liability", "warranty"]);
  assert.deepEqual(record("BSD-3-Clause-Attribution").metadata!.semantic.triggers, ["distribution"]);
  assert.match(expansion.notes["BSD-Source-Code"], /pro samotné binární kopie text nepřidává/);
  assert.match(expansion.notes["BSD-3-Clause-Attribution"], /Samostatné poděkování v reklamě se nevyžaduje/);
  assert.match(expansion.blockedNotes.Caldera, /32V UNIX/);
  assert.match(expansion.blockedNotes["BSD-4-Clause-UC"], /22\. 7\. 1999/);
  for (const id of ["Apache-1.0", "Caldera-no-preamble", "BSD-4-Clause", "BSD-4-Clause-Shortened", "BSD-Advertising-Acknowledgement", "BSD-3-Clause-Attribution", "BSD-Source-Code", "BSD-3-Clause-acpica"]) {
    const semantic = record(id).metadata!.semantic;
    assert.ok(!semantic.permissions.includes("patent-grant"), id);
    assert.ok(!semantic.obligations.includes("provide-corresponding-source"), id);
  }
});

test("advertising answer is present in both API forms and uncertainty is not treated as consent", () => {
  assert.deepEqual(GUIDE_ANSWER_INPUT_SCHEMA.oneOf[0].properties.advertising.enum, ["allowed", "avoid", "unknown", "not-applicable", "undecided"]);
  assert.deepEqual(GUIDE_ANSWER_INPUT_SCHEMA.oneOf[1].properties.requirements.properties.advertising, GUIDE_ANSWER_INPUT_SCHEMA.oneOf[0].properties.advertising);
  const result = recommendFromCatalog([record("Apache-1.0")], { openness: "open", projectForm: "application", reciprocity: "none", commercialUse: "allowed", delivery: "internal", patents: "neutral", advertising: "unknown" }, context);
  assert.equal(result.candidates[0].score, 100);
  assert.equal(result.nextQuestion, "advertising");
  assert.equal(recommendationEligibility(metadataProfileFromCatalog(record("Apache-1.0"))!, { advertising: "unknown" }, context).eligible, false);
  assert.ok(!result.candidates[0].matchedFields.includes("advertising"));
  const invalid = recommendFromCatalog(catalog, { advertising: "yes" } as never, context);
  assert.equal(invalid.outcome, "no-safe-match");
  assert.deepEqual(invalid.candidates, []);
  assert.deepEqual(invalid.guidance, ["answers.advertising: invalid enum value"]);
});

test("each newly curated license passes the real guide gate and has identical detail metadata", () => {
  assert.ok(context.sourceLockResolved);
  for (const id of Object.keys(expansion.notes)) {
    const item = record(id);
    const profile = metadataProfileFromCatalog(item);
    assert.ok(profile, id);
    assert.deepEqual(recommendationEligibility(profile, {}, context).exclusionReasons, [], id);
    assert.deepEqual(detail(id).metadata, item.metadata, id);
    assert.ok(hasDisplayProfile(item), id);
    assert.equal(profileForDisplay(detail(id))?.description, expansion.notes[id]);
  }
  const recommendation = recommendFromCatalog(catalog, { openness: "open", patents: "neutral" }, context);
  const ids = new Set([...recommendation.candidates, ...recommendation.alternatives].map(item => item.id));
  for (const id of Object.keys(expansion.notes)) assert.ok(ids.has(id), `${id} absent from guide results`);
});

test("file copyleft selects CDDL, MPL and MS-RL in both complete guide modes", () => {
  for (const mode of ["quick", "advanced"] as const) {
    const model = buildGuideModel();
    const reciprocity = model.questions.find(question => question.mode === mode && question.key === "reciprocity");
    assert.ok(reciprocity?.options.some(option => option.value === "file"));
    const answers = Object.fromEntries(model.questions.filter(question => question.mode === mode && !question.showWhen).map(question => [question.key, "unknown"]));
    Object.assign(answers, { openness: "open", projectForm: "library", reciprocity: "file", commercialUse: "allowed", delivery: "library", patents: "important" });
    const result = continueGuide(catalog, { mode, answers });
    assert.equal(result.complete, true);
    const fits = [...result.recommendation!.candidates, ...result.recommendation!.alternatives].filter(item => item.status === "good fit");
    for (const id of ["CDDL-1.0", "CDDL-1.1", "EPL-2.0", "MPL-2.0", "MPL-2.0-no-copyleft-exception", "MS-RL"]) assert.ok(fits.some(item => item.id === id), id);
    for (const item of fits) {
      assert.equal(record(item.id).metadata!.semantic.copyleftScope, "file", item.id);
      assert.ok(record(item.id).metadata!.semantic.permissions.includes("patent-grant"), item.id);
    }
    assert.ok(result.recommendation?.candidates.every(item => item.status === "good fit"));
  }
});

test("source and patent obligations are not invented from incidental words in the text", () => {
  for (const id of ["NCSA", "Unlicense", "ISC", "MIT-0", "ECL-2.0", "ZPL-2.0", "ZPL-2.1", "libpng-2.0", "MS-PL"]) {
    assert.ok(!record(id).metadata?.semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!profileForDisplay(detail(id))?.conditions.includes("provide-corresponding-source"), id);
  }
  for (const id of ["GPL-2.0-only", "GPL-2.0-or-later", "LGPL-2.0-only", "LGPL-2.0-or-later", "LGPL-2.1-only", "LGPL-2.1-or-later"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(profile.semantic.patentPosition, "none-stated");
    assert.ok(!profile.semantic.permissions.includes("patent-grant"));
    assert.ok(!profile.semantic.permissions.includes("sublicensing"));
    assert.equal(recommendationEligibility(profile, { patents: "important" }, context).eligible, false);
  }
  assert.deepEqual(profileForDisplay(detail("MIT-0"))?.conditions, []);
  assert.deepEqual(profileForDisplay(detail("Unlicense"))?.conditions, []);
  assert.ok(!record("UPL-1.0").metadata?.semantic.obligations.includes("include-license-text"));
  assert.ok(record("UPL-1.0").metadata?.semantic.obligations.includes("include-notice"));
  assert.deepEqual(profileForDisplay(detail("FSFUL"))?.conditions, []);
  assert.ok(!record("MIT-Modern-Variant").metadata?.semantic.obligations.includes("include-license-text"));
  assert.ok(!record("MS-RL").metadata?.semantic.restrictions.includes("liability"));
});

test("library choice returns LGPL and respects version-specific patent and installation conditions", () => {
  const ids = ["LGPL-2.0-only", "LGPL-2.0-or-later", "LGPL-2.1-only", "LGPL-2.1-or-later", "LGPL-3.0-only", "LGPL-3.0-or-later"];
  for (const mode of ["quick", "advanced"] as const) {
    const questions = buildGuideModel().questions.filter(question => question.mode === mode);
    assert.ok(questions.find(question => question.key === "reciprocity")?.options.some(option => option.value === "library"));
    const answers = Object.fromEntries(questions.filter(question => !question.showWhen).map(question => [question.key, "unknown"]));
    Object.assign(answers, { openness: "open", projectForm: "library", reciprocity: "library", commercialUse: "allowed", delivery: "library", patents: "neutral" });
    const result = continueGuide(catalog, { mode, answers });
    assert.equal(result.complete, true);
    const fits = [...result.recommendation!.candidates, ...result.recommendation!.alternatives].filter(item => item.status === "good fit");
    assert.deepEqual(fits.filter(item => ids.includes(item.id)).map(item => item.id), ids);
    for (const item of fits) assert.equal(record(item.id).metadata!.semantic.copyleftScope, "library", item.id);
    for (const item of fits.filter(item => ids.includes(item.id))) {
      const semantic = record(item.id).metadata!.semantic;
      assert.ok(semantic.obligations.includes("allow-relinking"));
      assert.ok(semantic.obligations.includes("allow-reverse-engineering"));
      assert.equal(semantic.obligations.includes("provide-installation-information"), item.id.startsWith("LGPL-3.0"));
      assert.equal(familyOf(record(item.id)), "Knihovní copyleft");
    }
    answers.patents = "important";
    const patentResult = continueGuide(catalog, { mode, answers }).recommendation!;
    const patentFits = [...patentResult.candidates, ...patentResult.alternatives].filter(item => item.status === "good fit");
    assert.deepEqual(patentFits.filter(item => ids.includes(item.id)).map(item => item.id), ids.slice(4));
    for (const item of patentFits) assert.ok(record(item.id).metadata!.semantic.permissions.includes("patent-grant"), item.id);
    for (const item of [...patentResult.candidates, ...patentResult.alternatives].filter(item => item.id.startsWith("LGPL-2."))) {
      assert.equal(item.status, "review required");
      assert.ok(item.conflicts.some(conflict => conflict.includes("patent")));
    }
  }
});

test("relinking and reverse engineering are nonminimal but do not alone imply source supply", () => {
  for (const obligation of ["allow-relinking", "allow-reverse-engineering"]) {
    const item = structuredClone(record("MIT-0"));
    item.metadata!.semantic.obligations = [obligation];
    const profile = metadataProfileFromCatalog(item)!;
    assert.ok(profile, obligation);
    assert.equal(recommendationEligibility(profile, {}, context).eligible, true);
    assert.equal(recommendationEligibility(profile, { obligations: "minimal" }, context).eligible, false);
    assert.equal(recommendationEligibility(profile, { obligations: "source" }, context).eligible, false);
    for (const answer of ["minimal", "source"] as const) {
      const ranked = recommendFromCatalog([item], { openness: "open", obligations: answer }, context).candidates[0];
      assert.equal(ranked.status, "review required");
      assert.ok(ranked.conflicts.some(conflict => conflict.includes("obligation")));
    }
    assert.notEqual(obligationLabel(obligation, "library"), obligation);
  }
});

test("negative content reviews correct catalog displays while remaining excluded from the guide", () => {
  const report = renderGuideReport();
  for (const [id, note] of Object.entries(expansion.blockedNotes)) {
    const item = record(id);
    assert.equal(item.metadata!.review.status, "not-recommendable");
    const profile = metadataProfileFromCatalog(item);
    if (item.deprecated) assert.equal(profile, null, id);
    else assert.equal(recommendationEligibility(profile!, {}, context).eligible, false, id);
    assert.deepEqual(detail(id).metadata, item.metadata);
    assert.equal(profileForDisplay(detail(id))?.description, expansion.blockedDisplayNotes[id]);
    assert.ok(report.includes(note), id);
  }
  assert.equal(familyOf(record("JSON")), "Nestandardní");
  assert.equal(familyOf(record("MS-PL")), "Neklasifikováno");
  assert.ok(profileForDisplay(detail("MS-PL"))?.conditions.includes("same-license--unknown"));
});

test("display uses scoped curated rules and retains exclusions", () => {
  assert.equal(familyOf(record("MPL-2.0-no-copyleft-exception")), "Souborový copyleft");
  assert.ok(profileForDisplay(detail("MPL-2.0"))?.conditions.includes("same-license--file"));
  assert.equal(obligationLabel("same-license", "file"), "Stejná licence pro pokryté soubory");
  assert.equal(obligationLabel("include-copyright", "none"), "Zachovat copyright");
  for (const id of ["Artistic-2.0", "Brian-Gladman-3-Clause", "Fair", "BUSL-1.1", "JSON", "MS-PL"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false, id);
  }
  const pending = detail("MIT-0");
  pending.metadata!.review = { status: "pending", recommendable: false, evidenceLevel: "weak" };
  assert.deepEqual(profileForDisplay(pending), pending.profile ?? null);
});

test("catalog family display does not invent library scope or unrestricted terms", () => {
  for (const id of ["IPL-1.0", "CPL-1.0"]) {
    const item = record(id);
    assert.equal(item.metadata!.semantic.family, "weak-copyleft", id);
    assert.equal(item.metadata!.semantic.copyleftScope, "unknown", id);
    assert.equal(familyOf(item), "Slabý copyleft", id);
    assert.ok(profileForDisplay(detail(id))?.conditions.includes("same-license--unknown"), id);
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(item)!, {}, context).eligible, false, id);
  }
  // No notice burden does not remove an independent substantive restriction.
  for (const id of ["MPEG-SSG", "Knuth-CTAN"]) {
    assert.equal(record(id).metadata!.semantic.noticeBurden, "none", id);
    assert.equal(familyOf(record(id)), "Nestandardní", id);
  }
});

test("CDDL source scope and patent termination remain distinct from permissive and library licenses", () => {
  for (const id of ["CDDL-1.0", "CDDL-1.1"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(familyOf(record(id)), "Souborový copyleft");
    assert.equal(profile.semantic.copyleftScope, "file");
    assert.equal(profile.semantic.patentPosition, "retaliatory-termination");
    assert.ok(profile.semantic.obligations.includes("provide-corresponding-source"));
    assert.ok(profileForDisplay(detail(id))?.conditions.includes("same-license--file"));
    assert.equal(recommendationEligibility(profile, { obligations: "minimal" }, context).eligible, false);
    assert.equal(recommendationEligibility(profile, { reciprocity: "library" }, context).eligible, false);
    assert.match(expansion.notes[id], /60denním/);
  }
  assert.match(expansion.notes["CDDL-1.1"], /urovnání před soudním sporem/);
  assert.match(expansion.notes["CDDL-1.1"], /kalifornské/);
});

test("LGPL 2.0 does not inherit the shared-library alternative introduced in 2.1", () => {
  for (const id of ["LGPL-2.0-only", "LGPL-2.0-or-later"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.match(expansion.notes[id], /2\.0 nemá samostatnou alternativu sdílené knihovny/);
    assert.match(profile.evidence!.find(item => item.field === "obligations")!.locator, /NO separate suitable-shared-library alternative/);
    assert.ok(!profile.semantic.obligations.includes("provide-installation-information"));
    assert.ok(!obligationLabel("allow-relinking", "library").includes("nebo"));
  }
});

test("short license variants preserve notice alternatives without inventing source, patent or liability terms", () => {
  assert.deepEqual(record("MIT-testregex").metadata!.semantic.obligations, []);
  assert.deepEqual(record("HPND-sell-regexpr").metadata!.semantic.obligations, ["include-copyright"]);
  assert.deepEqual(record("HPND-sell-regexpr").metadata!.semantic.restrictions, ["warranty"]);
  for (const id of ["SGI-B-2.0", "Unicode-DFS-2016"]) {
    assert.ok(record(id).metadata!.semantic.obligations.includes("include-notice"));
    assert.ok(!record(id).metadata!.semantic.obligations.includes("include-license-text"));
  }
  for (const id of ["MIT-enna", "SAX-PD", "Unicode-DFS-2016", "mpich2", "NAIST-2003"]) {
    const semantic = record(id).metadata!.semantic;
    assert.ok(!semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!semantic.permissions.includes("patent-grant"), id);
  }
  for (const id of ["HPND-doc", "HPND-doc-sell", "SAX-PD"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false);
  }
});

test("Apache 1.1 attribution differs from supported advertising and blocked conditional naming", () => {
  const apache = metadataProfileFromCatalog(record("Apache-1.1"))!;
  assert.equal(recommendationEligibility(apache, {}, context).eligible, true);
  assert.equal(recommendationEligibility(apache, { notices: "minimal" }, context).eligible, false);
  assert.equal(recommendationEligibility(apache, { patents: "important" }, context).eligible, false);
  assert.ok(apache.semantic.obligations.includes("include-notice"));
  assert.equal(apache.semantic.noticeBurden, "material");
  assert.match(expansion.notes["Apache-1.1"], /pokud je přiložena/);
  assert.match(expansion.notes["Apache-1.1"], /alternativně/);
  for (const id of ["XSkat", "Zed"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false, id);
  }
  assert.ok(record("Apache-1.0").metadata!.semantic.triggers.includes("advertising"));
  assert.ok(record("XSkat").metadata!.semantic.obligations.includes("unknown"));
});

test("optional contribution requests and source-location notices do not become source obligations", () => {
  for (const id of ["MIT-STK", "Qhull", "MIT-Khronos-old", "PSF-2.0"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(recommendationEligibility(profile, { obligations: "source" }, context).eligible, false, id);
    assert.ok(!profile.semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!profile.semantic.obligations.includes("same-license"), id);
  }
  assert.deepEqual(record("MIT-STK").metadata!.semantic.obligations, ["include-copyright", "include-license-text"]);
  assert.ok(!record("MIT-Khronos-old").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.ok(record("Qhull").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.ok(record("Qhull").metadata!.semantic.obligations.includes("include-notice"));
  assert.deepEqual(record("Qhull").metadata!.semantic.restrictions, ["warranty"]);
  assert.ok(record("PSF-2.0").metadata!.semantic.restrictions.includes("additional-terms"));
  assert.match(expansion.notes["PSF-2.0"], /automaticky ukončuje/);
  assert.match(expansion.notes["PSF-2.0"], /historických licencí/);
});

test("HPND variants preserve materially different notice and disclaimer conditions", () => {
  assert.deepEqual(record("HPND-Markus-Kuhn").metadata!.semantic.obligations, []);
  assert.deepEqual(record("HPND-Markus-Kuhn").metadata!.semantic.triggers, []);
  assert.deepEqual(record("HPND-UC").metadata!.semantic.obligations, ["include-copyright"]);
  assert.deepEqual(record("HPND-merchantability-variant").metadata!.semantic.obligations, ["include-copyright", "include-license-text"]);
  assert.deepEqual(record("HPND-sell-MIT-disclaimer-xserver").metadata!.semantic.obligations, ["include-license-text"]);
  assert.deepEqual(record("HPND-SMC").metadata!.semantic.restrictions, ["trademark"]);
  assert.deepEqual(record("Xfig").metadata!.semantic.restrictions, []);
  assert.equal(recommendationEligibility(metadataProfileFromCatalog(record("HPND-Fenneberg-Livingston"))!, { notices: "minimal" }, context).eligible, false);
  assert.ok(record("HPND-Intel").metadata!.semantic.obligations.includes("mark-modifications"));
  for (const id of ["HPND-Netrek", "HPND-Pbmplus", "HPND-Kevlin-Henney", "HPND-merchantability-variant"]) {
    assert.deepEqual(record(id).metadata!.semantic.restrictions, ["warranty"], id);
  }
});

test("nuclear and IP disclaimers are not field-of-use bans or patent grants", () => {
  const nuclearDisclaimer = metadataProfileFromCatalog(record("BSD-3-Clause-No-Nuclear-Warranty"))!;
  assert.equal(nuclearDisclaimer.semantic.family, "permissive");
  assert.equal(recommendationEligibility(nuclearDisclaimer, { commercialUse: "allowed" }, context).eligible, true);
  for (const id of ["BSD-3-Clause-No-Nuclear-License", "BSD-3-Clause-No-Nuclear-License-2014"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false);
  }
  for (const id of ["BSD-3-Clause-Open-MPI", "xlock", "MIT-Khronos-old", "PSF-2.0", "Xfig", "Unicode-3.0"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(profile.semantic.patentPosition, "none-stated", id);
    assert.ok(!profile.semantic.permissions.includes("patent-grant"), id);
    assert.equal(recommendationEligibility(profile, { patents: "important" }, context).eligible, false, id);
  }
  assert.deepEqual(record("Unicode-3.0").metadata!.semantic.obligations, ["include-copyright", "include-notice"]);
  assert.match(expansion.notes["Unicode-3.0"], /buď.*nebo/);
  assert.match(expansion.notes["Unicode-3.0"], /nepřebírá staré vymezení/);
});

test("BlueOak supports a patent preference without requiring copyright retention or the whole license file", () => {
  const profile = metadataProfileFromCatalog(record("BlueOak-1.0.0"))!;
  assert.equal(profile.semantic.patentPosition, "express-grant");
  assert.ok(profile.semantic.permissions.includes("patent-grant"));
  assert.ok(!profile.semantic.permissions.includes("sublicensing"));
  assert.deepEqual(profile.semantic.obligations, ["include-notice"]);
  assert.deepEqual(profile.semantic.triggers, ["distribution"]);
  assert.ok(profile.semantic.restrictions.includes("additional-terms"));
  assert.ok(!profile.semantic.restrictions.includes("trademark"));
  assert.equal(recommendationEligibility(profile, { reciprocity: "none", patents: "important", obligations: "minimal" }, context).eligible, true);
  const result = recommendFromCatalog(catalog, { openness: "open", reciprocity: "none", patents: "important", obligations: "minimal" }, context);
  const match = [...result.candidates, ...result.alternatives].find(item => item.id === "BlueOak-1.0.0");
  assert.equal(match?.status, "good fit");
  assert.match(expansion.notes["BlueOak-1.0.0"], /text licence nebo odkaz/);
  assert.match(expansion.notes["BlueOak-1.0.0"], /do 30 dnů.*praktické kroky/);
});

test("source notice retention and optional contribution requests do not become source supply", () => {
  for (const id of ["Boehm-GC", "Boehm-GC-without-fee", "CMU-Mach", "CMU-Mach-nodoc", "bzip2-1.0.6", "HTMLTIDY", "Leptonica", "IBM-pibs", "Martin-Birgmeier"]) {
    const semantic = record(id).metadata!.semantic;
    assert.ok(!semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!semantic.obligations.includes("disclose-source"), id);
    assert.ok(!semantic.obligations.includes("same-license"), id);
  }
  assert.match(expansion.notes["bzip2-1.0.6"], /Poděkování.*dobrovolné/);
  assert.match(expansion.notes["HTMLTIDY"], /Poděkování.*dobrovolné/);
  assert.match(expansion.notes["CMU-Mach"], /žádostí, nikoli podmínkou/);
  assert.ok(!record("CMU-Mach").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.ok(!record("Boehm-GC").metadata!.semantic.restrictions.includes("liability"));
  assert.ok(record("Boehm-GC").metadata!.semantic.obligations.includes("include-notice"));
  assert.match(expansion.notes["CMU-Mach-nodoc"], /zvlášť nepožaduje/);
});

test("public-domain assertions and IP disclaimers remain distinct from fallback and patent grants", () => {
  const bcrypt = metadataProfileFromCatalog(record("bcrypt-Solar-Designer"))!;
  assert.equal(bcrypt.semantic.family, "public-domain-equivalent");
  assert.deepEqual(bcrypt.semantic.obligations, []);
  assert.deepEqual(bcrypt.semantic.triggers, []);
  assert.deepEqual(bcrypt.semantic.restrictions, ["warranty"]);
  assert.equal(recommendationEligibility(bcrypt, {}, context).eligible, true);
  assert.equal(recommendationEligibility(metadataProfileFromCatalog(record("libselinux-1.0"))!, {}, context).eligible, false);
  assert.equal(record("CFITSIO").metadata!.semantic.family, "permissive");
  assert.deepEqual(record("CFITSIO").metadata!.semantic.obligations, ["include-copyright", "include-notice"]);
  assert.deepEqual(record("Clips").metadata!.semantic.obligations, []);
  for (const id of ["Linux-OpenIB", "CFITSIO", "HTMLTIDY", "bcrypt-Solar-Designer"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(profile.semantic.patentPosition, "none-stated", id);
    assert.ok(!profile.semantic.permissions.includes("patent-grant"), id);
    assert.equal(recommendationEligibility(profile, { patents: "important" }, context).eligible, false, id);
  }
  assert.equal(record("IBM-pibs").metadata!.semantic.patentPosition, "express-exclusion");
  assert.equal(recommendationEligibility(metadataProfileFromCatalog(record("IBM-pibs"))!, { patents: "important" }, context).eligible, false);
  assert.deepEqual(record("SunPro").metadata!.semantic.restrictions, []);
  assert.deepEqual(record("Sun-PPP").metadata!.semantic.restrictions, ["trademark", "warranty"]);
  assert.deepEqual(record("Sun-PPP-2000").metadata!.semantic.restrictions, ["liability", "warranty"]);
});

test("sale-only source supply and unresolved license alternatives do not enter the general guide", () => {
  for (const id of ["Vixie-Cron", "Brian-Gladman-3-Clause", "python-ldap", "Martin-Birgmeier"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false, id);
  }
  assert.ok(record("Vixie-Cron").metadata!.semantic.triggers.includes("unknown"));
  assert.ok(!record("Vixie-Cron").metadata!.semantic.obligations.includes("provide-corresponding-source"));
  assert.match(expansion.blockedNotes["Vixie-Cron"], /prodej jako samostatný spouštěč/);
  assert.equal(record("Brian-Gladman-3-Clause").metadata!.semantic.patentPosition, "unknown");
  assert.deepEqual(record("python-ldap").metadata!.semantic.permissions, ["unknown"]);
  assert.deepEqual(record("Brian-Gladman-2-Clause").metadata!.semantic.restrictions, ["warranty"]);
});

test("voluntary gifts and credits do not become payments, contribution or source obligations", () => {
  for (const id of ["Beerware", "Giftware", "Ferguson-Twofish", "InnoSetup"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(recommendationEligibility(profile, { commercialUse: "allowed" }, context).eligible, true, id);
    assert.ok(!profile.semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!profile.semantic.obligations.includes("same-license"), id);
  }
  assert.deepEqual(record("Giftware").metadata!.semantic.obligations, []);
  assert.deepEqual(record("Giftware").metadata!.semantic.triggers, []);
  assert.deepEqual(record("Beerware").metadata!.semantic.restrictions, []);
  assert.deepEqual(record("Ferguson-Twofish").metadata!.semantic.obligations, ["include-copyright"]);
  assert.deepEqual(record("BOLA-1.1").metadata!.semantic.obligations, []);
  assert.equal(recommendationEligibility(metadataProfileFromCatalog(record("BOLA-1.1"))!, {}, context).eligible, false);
});

test("source and binary notice variants preserve explicit exceptions and change requirements", () => {
  assert.deepEqual(record("checkmk").metadata!.semantic.obligations, ["include-copyright"]);
  assert.deepEqual(record("mpi-permissive").metadata!.semantic.obligations, []);
  for (const id of ["InnoSetup", "Kazlib", "Mup", "DEC-3-Clause", "OML"]) {
    assert.ok(!record(id).metadata!.semantic.obligations.includes("provide-corresponding-source"), id);
  }
  assert.ok(record("InnoSetup").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.match(expansion.notes["InnoSetup"], /všechny existující výskyty copyrightu a webových adres/);
  assert.match(expansion.notes["InnoSetup"], /zdrojových i binárních verzí/);
  assert.match(expansion.notes["Kazlib"], /proprietárního softwaru.*nevyžaduje/);
  assert.ok(record("Mackerras-3-Clause-acknowledgment").metadata!.semantic.obligations.includes("include-notice"));
  assert.ok(!record("Mackerras-3-Clause").metadata!.semantic.obligations.includes("include-notice"));
  assert.ok(record("Mup").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.match(expansion.notes["Mup"], /Datum změny text zvlášť nevyžaduje/);
  assert.ok(record("OML").metadata!.semantic.permissions.includes("sublicensing"));
  assert.ok(!record("OML").metadata!.semantic.obligations.includes("same-license"));
  assert.ok(!record("OML").metadata!.semantic.obligations.includes("mark-modifications"));
  assert.match(expansion.notes["OML"], /první straně každého/);
});

test("claim waivers and trademark statements are not replaced by unrelated legal permissions", () => {
  assert.ok(record("ADSL").metadata!.semantic.restrictions.includes("additional-terms"));
  assert.match(expansion.notes["ADSL"], /vzdání se nároků/);
  assert.ok(!record("Afmparse").metadata!.semantic.restrictions.includes("trademark"));
  assert.deepEqual(record("lsof").metadata!.semantic.restrictions, ["additional-terms", "liability"]);
  assert.deepEqual(record("Furuseth").metadata!.semantic.restrictions, ["trademark", "warranty"]);
  assert.deepEqual(record("Jam").metadata!.semantic.restrictions, ["warranty"]);
  for (const id of ["DEC-3-Clause", "NCL", "ADSL", "mpi-permissive", "OML"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(profile.semantic.patentPosition, "none-stated", id);
    assert.ok(!profile.semantic.permissions.includes("patent-grant"), id);
    assert.equal(recommendationEligibility(profile, { patents: "important" }, context).eligible, false, id);
  }
});

test("source licensing, naming and ownership gaps remain outside the guide", () => {
  for (const id of ["Cube", "MMIXware", "Noweb", "Glulxe", "OpenVision", "OFFIS", "Graphics-Gems", "Afmparse"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false, id);
    assert.ok(!record(id).metadata!.semantic.obligations.includes("provide-corresponding-source"), id);
  }
  assert.ok(record("Cube").metadata!.semantic.obligations.includes("same-license"));
  assert.equal(record("Cube").metadata!.semantic.copyleftScope, "unknown");
  assert.ok(record("Noweb").metadata!.semantic.triggers.includes("unknown"));
  assert.ok(record("MMIXware").metadata!.semantic.obligations.includes("unknown"));
  assert.match(expansion.blockedNotes["Glulxe"], /1999–2010/);
  assert.match(expansion.blockedNotes["Glulxe"], /nezaměnit jej automaticky za MIT/);
  assert.ok(record("OpenVision").metadata!.semantic.obligations.includes("unknown"));
  assert.deepEqual(record("Glulxe").metadata!.semantic.restrictions, []);
});

test("report is reproducible and covers every excluded license and exception", () => {
  const report = renderGuideReport();
  assert.equal(fs.readFileSync(reportPath, "utf8"), report);
  for (const item of catalog) {
    const profile = metadataProfileFromCatalog(item);
    if (profile && recommendationEligibility(profile, {}, context).eligible) continue;
    assert.ok(report.includes(`[${item.id}](https://spdx.org/licenses/`), item.id);
  }
  assert.match(report, /Neurčená metadata: /);
  assert.ok(report.includes("preserve-combined-license-terms"));
  assert.match(report, /Výjimka není samostatná licence/);
});

test("COIL patent permission is scoped and UCAR remains a mismatch for a grant requirement", () => {
  const coil = metadataProfileFromCatalog(record("COIL-1.0"))!;
  assert.equal(coil.semantic.patentPosition, "express-grant");
  assert.ok(coil.semantic.permissions.includes("patent-grant"));
  assert.ok(coil.semantic.permissions.includes("sublicensing"));
  assert.ok(!coil.semantic.restrictions.includes("patent-claim"));
  assert.equal(recommendationEligibility(coil, { patents: "important" }, context).eligible, true);
  assert.match(coil.evidence!.find(item => item.field === "patentPosition")!.locator, /NECESSARILY.*WHEN/);
  const ucar = metadataProfileFromCatalog(record("UCAR"))!;
  assert.equal(ucar.semantic.patentPosition, "defensive-termination");
  assert.ok(!ucar.semantic.permissions.includes("patent-grant"));
  assert.ok(ucar.semantic.triggers.includes("patent-claim"));
  assert.ok(ucar.semantic.restrictions.includes("patent-claim"));
  assert.ok(!ucar.semantic.obligations.includes("provide-corresponding-source"));
  assert.equal(recommendationEligibility(ucar, {}, context).eligible, true);
  assert.equal(recommendationEligibility(ucar, { patents: "important" }, context).eligible, false);
  assert.match(expansion.notes.UCAR, /Výjimkou jsou spory o kombinaci/);
  assert.ok(!profileForDisplay(detail("UCAR"))!.permissions.includes("patent-grant"));
});

test("Eiffel version changes and TMate source propagation do not collapse into a generic source duty", () => {
  const old = metadataProfileFromCatalog(record("EFL-1.0"))!;
  const current = metadataProfileFromCatalog(record("EFL-2.0"))!;
  assert.equal(recommendationEligibility(old, {}, context).eligible, false);
  assert.equal(recommendationEligibility(current, {}, context).eligible, true);
  assert.equal(current.semantic.copyleftScope, "none");
  assert.deepEqual(current.semantic.obligations, ["include-copyright", "include-license-text"]);
  assert.ok(!old.semantic.obligations.includes("same-license"));
  assert.ok(old.semantic.obligations.includes("unknown"));
  assert.match(expansion.blockedDisplayNotes["EFL-1.0"], /musíte.*veřejně vydat/);
  assert.match(expansion.notes["EFL-2.0"], /pouze doporučením/);
  const tmate = metadataProfileFromCatalog(record("TMate"))!;
  assert.equal(recommendationEligibility(tmate, {}, context).eligible, false);
  assert.equal(tmate.semantic.copyleftScope, "unknown");
  assert.ok(tmate.semantic.obligations.includes("provide-corresponding-source"));
  assert.ok(!tmate.semantic.obligations.includes("same-license"));
  assert.match(tmate.evidence!.find(item => item.field === "obligations")!.locator, /accompanying software using that software/);
  assert.match(expansion.blockedDisplayNotes.TMate, /nominální poplatek/);
});

test("scientific credits, historical notices and dated modifications retain their exact force", () => {
  assert.ok(!record("DSDP").metadata!.semantic.triggers.includes("unknown"));
  assert.ok(!record("DSDP").metadata!.semantic.restrictions.includes("trademark"));
  assert.match(expansion.notes.DSDP, /citace|Citace/);
  assert.match(expansion.notes.NetCDF, /výslovně dobrovolné/);
  assert.deepEqual(record("Saxpath").metadata!.semantic.obligations, ["include-copyright", "include-license-text"]);
  assert.ok(record("Plexus").metadata!.semantic.obligations.includes("unknown"));
  for (const id of ["Minpack", "Entessa"]) {
    assert.ok(record(id).metadata!.semantic.obligations.includes("include-notice"), id);
    assert.match(record(id).metadata!.evidence.find(item => item.field === "obligations")!.locator, /IF ANY/, id);
  }
  assert.ok(!record("Minpack").metadata!.semantic.restrictions.includes("trademark"));
  assert.deepEqual(record("Multics").metadata!.semantic.restrictions, ["trademark"]);
  assert.equal(record("Multics").metadata!.semantic.noticeBurden, "material");
  assert.match(expansion.notes.Multics, /celý historický úvod/);
  for (const id of ["ECL-1.0", "Naumen"]) {
    assert.ok(record(id).metadata!.semantic.obligations.includes("mark-modifications"), id);
    assert.match(record(id).metadata!.evidence.find(item => item.field === "obligations")!.locator, /DATE/, id);
  }
  assert.equal(record("ECL-1.0").metadata!.semantic.patentPosition, "none-stated");
  assert.ok(record("ECL-1.0").metadata!.semantic.permissions.includes("sublicensing"));
});

test("notice-only source references, historical export lists and disclaimers do not invent rights or obligations", () => {
  for (const id of ["Cronyx", "diffmark"]) {
    assert.deepEqual(record(id).metadata!.semantic.restrictions, ["liability"], id);
  }
  assert.deepEqual(record("diffmark").metadata!.semantic.obligations, []);
  assert.deepEqual(record("diffmark").metadata!.semantic.triggers, []);
  const wordnet = record("WordNet").metadata!.semantic;
  assert.deepEqual(wordnet.restrictions, ["additional-terms", "trademark", "warranty"]);
  assert.deepEqual(wordnet.obligations, ["include-copyright", "include-notice"]);
  assert.match(expansion.notes.WordNet, /interní použití/);
  for (const id of ["Caldera", "Crossword", "Inner-Net-2.0", "Intel", "OGC-1.0", "Xerox"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.equal(recommendationEligibility(profile, {}, context).eligible, false, id);
    assert.ok(!profile.semantic.obligations.includes("provide-corresponding-source"), id);
  }
  assert.ok(record("Caldera").metadata!.semantic.triggers.includes("advertising"));
  assert.match(expansion.notes["Caldera-no-preamble"], /nemá preambuli/);
  assert.ok(record("Inner-Net-2.0").metadata!.semantic.permissions.includes("unknown"));
  assert.deepEqual(record("Intel").metadata!.semantic.restrictions, ["liability", "trademark", "warranty"]);
  assert.match(expansion.blockedDisplayNotes.Intel, /květen 2000/);
  assert.ok(record("Xerox").metadata!.semantic.obligations.includes("unknown"));
  assert.ok(!record("OGC-1.0").metadata!.semantic.permissions.includes("distribution"));
});

test("both complete guide modes now select the reviewed network copyleft profiles", () => {
  for (const mode of ["quick", "advanced"] as const) {
    const questions = buildGuideModel().questions.filter(question => question.mode === mode);
    assert.ok(questions.find(question => question.key === "reciprocity")?.options.some(option => option.value === "network"));
    const answers = Object.fromEntries(questions.filter(question => !question.showWhen).map(question => [question.key, "unknown"]));
    Object.assign(answers, { openness: "open", projectForm: "service", delivery: "saas", reciprocity: "network", patents: "important", commercialUse: "allowed" });
    if (mode === "advanced") answers.copyleftTrigger = "network";
    const result = continueGuide(catalog, { mode, answers });
    assert.equal(result.complete, true);
    const fits = [...result.recommendation!.candidates, ...result.recommendation!.alternatives].filter(item => item.status === "good fit");
    for (const id of ["AGPL-3.0-only", "AGPL-3.0-or-later", "EUPL-1.2"]) assert.ok(fits.some(item => item.id === id), id);
    for (const item of fits) assert.equal(record(item.id).metadata!.semantic.copyleftScope, "network", item.id);
    for (const item of fits) {
      assert.ok(item.obligations.includes("network-use-disclose"));
      assert.equal(familyOf(record(item.id)), "Síťový copyleft");
      assert.ok(profileForDisplay(detail(item.id))!.conditions.includes("same-license--network"));
    }
  }
});

test("network source scope and AGPL GPLv3 split terms remain distinct from automatic relicensing", () => {
  for (const id of ["AGPL-3.0-only", "AGPL-3.0-or-later"]) {
    const profile = metadataProfileFromCatalog(record(id))!;
    assert.ok(profile.semantic.obligations.includes("preserve-combined-license-terms"));
    assert.ok(!profile.semantic.permissions.includes("sublicensing"));
    assert.ok(!profile.semantic.permissions.includes("conditional-relicensing"));
    assert.ok(profile.semantic.obligations.includes("provide-installation-information"));
    assert.match(expansion.notes[id], /GPLv3 pod GPLv3/);
    assert.match(profile.evidence!.find(item => item.field === "obligations")!.locator, /ONLY IF modified AND remote interaction supported/);
  }
  assert.match(expansion.notes["AGPL-3.0-only"], /pouze verzi 3/);
  assert.match(expansion.notes["AGPL-3.0-or-later"], /pozdější verze vydané FSF/);
  assert.match(expansion.notes["EUPL-1.2"], /není omezeno na upravený program/);
  assert.ok(!record("EUPL-1.2").metadata!.semantic.obligations.includes("provide-installation-information"));
});

test("conditional licensing and indemnity survive validation without becoming minimal or source duties", () => {
  const duties = ["defend-commercial-distribution", "defend-added-warranty", "preserve-combined-license-terms"];
  for (const duty of duties) {
    const isolated = structuredClone(record("MIT-0"));
    isolated.metadata!.semantic.obligations = [duty];
    const profile = metadataProfileFromCatalog(isolated)!;
    assert.equal(recommendationEligibility(profile, {}, context).eligible, true, duty);
    for (const answer of ["minimal", "source"] as const) {
      assert.equal(recommendationEligibility(profile, { obligations: answer }, context).eligible, false, duty);
      assert.equal(recommendFromCatalog([isolated], { openness: "open", obligations: answer }, context).candidates[0].status, "review required", duty);
    }
    assert.notEqual(obligationLabel(duty, "none"), duty);
  }
  const epl = record("EPL-2.0").metadata!.semantic;
  const eupl = record("EUPL-1.2").metadata!.semantic;
  assert.ok(epl.permissions.includes("conditional-relicensing"));
  assert.ok(eupl.permissions.includes("conditional-relicensing"));
  assert.ok(epl.obligations.includes("defend-commercial-distribution"));
  assert.ok(!epl.obligations.includes("defend-added-warranty"));
  assert.ok(eupl.obligations.includes("defend-added-warranty"));
  assert.ok(!eupl.obligations.includes("defend-commercial-distribution"));
  assert.match(expansion.notes["EPL-2.0"], /samotná příloha A nestačí/);
  assert.match(expansion.notes["EPL-2.0"], /spory o duševní vlastnictví jsou vyňaty/);
  assert.match(expansion.notes["EUPL-1.2"], /dobrovolně převzaté/);
});

test("patent-sensitive ranking rejects termination without a grant but keeps the general UCAR candidate", () => {
  const selected = [record("UCAR"), record("COIL-1.0")];
  const general = recommendFromCatalog(selected, { openness: "open" }, context);
  assert.ok(general.candidates.every(item => item.status === "good fit"));
  const patent = recommendFromCatalog(selected, { openness: "open", patents: "important" }, context);
  assert.equal(patent.candidates[0].id, "COIL-1.0");
  assert.equal(patent.candidates[0].score, 100);
  const ucar = patent.candidates.find(item => item.id === "UCAR")!;
  assert.equal(ucar.status, "review required");
  assert.ok(ucar.score < 100);
  assert.ok(!ucar.matchedFields.includes("patentPosition"));
  assert.match(ucar.conflicts.join(" "), /express patent grant/);
  for (const position of ["express-grant", "defensive-termination", "retaliatory-termination"] as const) {
    const isolated = structuredClone(record("UCAR"));
    isolated.metadata!.semantic.patentPosition = position;
    const profile = metadataProfileFromCatalog(isolated)!;
    assert.equal(recommendationEligibility(profile, { patents: "important" }, context).eligible, false, position);
  }
});

test("historical Python and PHP conditions are preserved while Artistic and Ruby alternatives stay unresolved", () => {
  assert.equal(record("Python-2.0").metadata!.semantic.copyleftScope, "none");
  assert.match(expansion.notes["Python-2.0"], /PSF, BeOpen, CNRI a CWI/);
  assert.match(expansion.notes["Python-2.0"], /1895\.22\/1011/);
  assert.match(expansion.notes["PHP-3.01"], /Foo for PHP/);
  assert.ok(record("PHP-3.01").metadata!.semantic.obligations.includes("include-notice"));
  for (const id of ["Python-2.0", "PHP-3.01", "Artistic-2.0", "Ruby"]) {
    assert.ok(!record(id).metadata!.semantic.obligations.includes("provide-corresponding-source"), id);
    assert.ok(!record(id).metadata!.semantic.obligations.includes("same-license"), id);
  }
  for (const id of ["Artistic-2.0", "Ruby"]) {
    assert.equal(recommendationEligibility(metadataProfileFromCatalog(record(id))!, {}, context).eligible, false, id);
    assert.equal(record(id).metadata!.semantic.copyleftScope, "unknown");
    assert.ok(record(id).metadata!.semantic.obligations.includes("unknown"));
  }
  assert.ok(!record("Ruby").metadata!.semantic.restrictions.includes("liability"));
  assert.equal(record("Artistic-2.0").metadata!.semantic.patentPosition, "retaliatory-termination");
  assert.ok(!record("Artistic-2.0").metadata!.semantic.permissions.includes("sublicensing"));
});
