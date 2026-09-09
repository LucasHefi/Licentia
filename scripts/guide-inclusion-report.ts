#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateSources } from "./sync-license-profiles.mjs";
import { validateProfile } from "./validate-license-data.mjs";
import { metadataProfileFromCatalog, recommendationEligibility, runtimeSourceLockResolved, type CatalogMetadataRecord } from "../lib/recommendation-contract.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const reportPath = path.join(root, "docs/reports/guide-inclusion.md");
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
const cell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const link = (id: string) => `[${id}](https://spdx.org/licenses/${encodeURIComponent(id)}.html)`;
const fields = ["family", "copyleftScope", "permissions", "obligations", "triggers", "restrictions", "patentPosition", "noticeBurden"];

// These examples come from individual content reviews, not keyword classification.
// Only currently blocked IDs are shown, so resolving a profile removes its example.
const followUpAreas = [
  { area: "Zdrojové podklady a historické změny", ids: ["CAL-1.0", "GPL-2.0-with-font-exception", "GPL-2.0-with-classpath-exception", "BSD-4-Clause-UC", "BSD-Mark-Modifications", "CECILL-1.1"], task: "Opravit či doplnit chybějící autoritativní znění a doložit jeho verzi. Historické zrušení klauzule nebo rozpor nelze vyřešit domněnkou. Změna zdroje vyžaduje nový otisk a revizi dotčených metadat." },
  { area: "Rozsah na úrovni komponent", ids: ["IPL-1.0", "CPL-1.0", "EPL-1.0", "BSD-Systemics", "BSD-Systemics-W3Works", "SSLeay-standalone", "OpenSSL", "GL2PS"], task: "Vyjádřit hranici pokrytého programu či kódu, odvozenin a samostatných modulů. Nepoužít automaticky soubor, knihovnu ani celé kombinované dílo; skutečné hranice se mezi zněními liší." },
  { area: "Alternativní podmínky", ids: ["Artistic-2.0", "Ruby", "Imlib2", "Sendmail", "Sendmail-8.23", "QPL-1.0", "Vim", "SMPPL"], task: "Modelovat jednotlivé cesty splnění a jejich předpoklady, formu distribuce a role. Volby mezi zdroji, oznámením, přejmenováním nebo jinou licencí nejsou souběžným seznamem povinností." },
  { area: "Souhlas příjemců a další závazky", ids: ["AFL-2.0", "AFL-3.0", "OSL-1.1", "Adobe-2006", "IJG-short", "ESA-PL-permissive-2.4"], task: "Rozlišit získávání výslovného souhlasu, rozumné úsilí, přebírání či hájení nároků a další konkrétní povinnosti. Zachovat nositele závazku, spouštěč a výjimky; běžné notice nebo disclaimer nemusí stačit." },
  { area: "Předmět licence a jiný typ průvodce", ids: ["OFL-1.1", "CC-BY-4.0", "CC-BY-SA-4.0", "ODbL-1.0", "CERN-OHL-P-2.0"], task: "Doplnit rozhodování pro obsah, fonty, databáze a hardware a jejich zvláštní práva. Předmět určuje skutečný grant; samotný název rodiny nevylučuje software. Řešit také další podmínky z individuální revize." },
  { area: "Omezení a zvláštní spouštěče užití", ids: ["BUSL-1.1", "Elastic-2.0", "JSON", "MS-LPL", "Vixie-Cron", "HPND-export-US", "NLOD-2.0"], task: "Vyjádřit konkrétní komerční, provozní, účelové, prodejní či exportní podmínky a nakládání s vyloučenými daty. Obecná distribuce nebo use nezastupují všechna tato pravidla." },
  { area: "Názvy, kontakty a rozsah oprávnění", ids: ["MITNFA", "XSkat", "MMIXware", "Fair", "SGP4", "Kastrup", "MIPS"], task: "Oddělit přejmenování a směrování hlášení chyb od prostého označení změn. U úzkých nebo obecných grantů doložit rozsah jednotlivých práv; nevyrábět chybějící distribuční či modifikační oprávnění podle názvu licence." },
  { area: "Patentové závazky a nastavitelné formuláře", ids: ["CECILL-2.0", "CECILL-2.1", "CECILL-B", "CECILL-C", "APL-1.0"], task: "Odlišit závazek nevymáhat patenty a jeho předání nabyvatelům od výslovného grantu. U nastavitelné licence uchovat vybrané přílohy, výchozí hodnoty a historii kombinovaných kopií; nevydávat volitelné patenty či atribuci za povinnou součást každé varianty." },
];


export function renderGuideReport() {
  const catalog: CatalogMetadataRecord[] = readJson(path.join(root, "public/data/catalog.json"));
  const expansion: { reviewedAt: string; sourceVersion: string; notes: Record<string, string>; blockedNotes: Record<string, string>; batches: { id: string; reviewedAt: string; included: string[]; updated?: string[]; excluded: string[] }[] } = readJson(path.join(root, "data/guide-expansion.json"));
  const sourceRecords = enumerateSources().records;
  const sourceLockResolved = runtimeSourceLockResolved(catalog);
  const rows = sourceRecords.map(record => {
    const profileFile = path.join(root, "data/profiles", `${record.kind}s`, record.filename);
    const problems: string[] = [];
    const profile = fs.existsSync(profileFile) ? readJson(profileFile) : null;
    const summary = catalog.find(item => item.type === record.kind && item.id === record.id);
    if (!profile) problems.push("Chybí kurátorovaný profil.");
    if (record.source.deprecated) problems.push("Historický SPDX identifikátor; pro nové označení vybrat aktuální variantu.");
    if (record.kind === "exception") problems.push("Výjimka není samostatná licence; nutno ověřit základní licenci a použít WITH.");
    if (!summary) problems.push("Chybí záznam v katalogu aplikace.");
    if (profile) {
      try { validateProfile(profile, { file: profileFile, release: true }); }
      catch (error) { problems.push(`Neplatný profil: ${error instanceof Error ? error.message : String(error)}`); }
      const unknown = Object.entries(profile.semantic).filter(([, value]) => value === "unknown" || Array.isArray(value) && value.includes("unknown")).map(([field]) => field);
      if (unknown.length) problems.push(`Neurčená metadata: ${unknown.join(", ")}.`);
      const expectedFields = record.kind === "license" ? fields : ["exceptionApplicability", "permissions", "triggers", "restrictions"];
      const covered = new Set(profile.evidence.map((entry: { field: string }) => entry.field));
      const missingEvidence = [...expectedFields, "review"].filter(field => !covered.has(field));
      if (missingEvidence.length) problems.push(`Chybí evidence: ${missingEvidence.join(", ")}.`);
      if (profile.review.status !== "reviewed" || !profile.review.recommendable) problems.push(`Stav ${profile.review.status}; recommendable=${profile.review.recommendable}.`);
      if (!["sufficient", "strong"].includes(profile.review.evidenceLevel)) problems.push(`Slabá nebo chybějící evidence: ${profile.review.evidenceLevel}.`);
      if (JSON.stringify(profile.sourceFingerprint) !== JSON.stringify(record.fingerprint)) problems.push("Zastaralý otisk zdroje; revizi zopakovat nad aktuálním textem.");
      const expectedMetadata = { contractVersion: "1.0.0", kind: profile.kind, id: profile.id, review: profile.review, semantic: profile.semantic, sourceFingerprint: profile.sourceFingerprint, evidence: profile.evidence };
      for (const [label, metadata] of [["katalog", summary?.metadata], ["detail", record.source.metadata]] as const) {
        if (JSON.stringify(metadata) !== JSON.stringify(expectedMetadata)) problems.push(`Metadata pro ${label} nejsou synchronizována s profilem.`);
      }
    }
    const runtime = summary ? metadataProfileFromCatalog(summary) : null;
    const gate = runtime ? recommendationEligibility(runtime, {}, { sourceLockResolved, ruleVersion: "1.0.0" }) : null;
    if (record.kind === "license" && !record.source.deprecated && !gate?.eligible && !problems.length) problems.push(`Průvodce odmítl profil: ${gate?.exclusionReasons.join("; ") ?? "neplatná runtime metadata"}.`);
    if (!sourceLockResolved) problems.push("Nevyřešené zdroje katalogu za běhu.");
    const reviewNotes: string[] = profile?.evidence.filter((entry: { field: string; ruleId?: string }) => entry.field === "review" && entry.ruleId !== "lic-007.profile-review").map((entry: { locator: string }) => entry.locator) ?? [];
    return { id: record.id, kind: record.kind, eligible: record.kind === "license" && gate?.eligible === true && problems.length === 0, problems, reviewNotes, profileFile, semantic: profile?.semantic };
  });
  const eligible = rows.filter(row => row.eligible);
  const excluded = rows.filter(row => row.kind === "license" && !row.eligible);
  const exceptions = rows.filter(row => row.kind === "exception");
  const scopes = new Map<string, number>();
  eligible.forEach(row => scopes.set(row.semantic.copyleftScope, (scopes.get(row.semantic.copyleftScope) ?? 0) + 1));
  const lines = [
    "# Zařazení licencí do průvodce — stav metadat", "",
    `Poslední obsahová revize rozšíření: **${expansion.reviewedAt}**. Zdroj: **${expansion.sourceVersion}**.`, "",
    "Report se deterministicky generuje z aktuálních kurátorovaných profilů, katalogu, detailů a skutečné vstupní kontroly průvodce. Pokrytí obsahových revizí a samostatné záznamy každé licence jsou v [systematickém přehledu](systematic-review.md). Po dalších změnách spustit `npm run data:guide:report`.", "",
    "| Rozsah | Počet |", "|---|---:|",
    `| Licence v katalogu | ${eligible.length + excluded.length} |`,
    `| Způsobilé pro průvodce | ${eligible.length} |`,
    `| Licence zatím nezařazené | ${excluded.length} |`,
    `| Výjimky (pouze ve spojení se základní licencí) | ${exceptions.length} |`, "",
    `Rozsahy copyleftu způsobilých profilů: ${[...scopes].sort().map(([scope, count]) => `\`${scope}\`: ${count}`).join(", ")}.`, "",
    "## Doplněné licence a podmínky", "",
    `Z individuálně zpracovaných profilů má ${Object.keys(expansion.notes).length} kladné rozhodnutí a ${Object.keys(expansion.blockedNotes).length} doloženou překážku zařazení. Každý má všech osm významových polí, konkrétní evidenci pro každé pole a review, zachovaný otisk zdroje a synchronizovanou kopii v katalogu i detailu. Původní kanonická znění a OSI/FSF příznaky zůstávají zdrojovými daty SPDX.`, "",
    "| Várka | Revize | Nově zařazené | Aktualizované dříve zařazené | Nezařazené při uzavření várky |", "|---|---|---:|---|---|",
    ...expansion.batches.map(batch => `| ${batch.id} | ${batch.reviewedAt} | ${batch.included.length} | ${(batch.updated ?? []).map(link).join(", ") || "—"} | ${batch.id === "2026-09-09-10" ? `${batch.excluded.length} — [jednotlivé revize](systematic-review.md)` : batch.excluded.map(link).join(", ") || "—"} |`), "",
    "| Licence | Stav nyní | Podstatné podmínky a hranice shrnutí |", "|---|---|---|",
    ...Object.entries(expansion.notes).map(([id, note]) => `| ${link(id)} | ${rows.find(row => row.id === id)?.eligible ? "zařazena" : "vyžaduje kontrolu"} | ${cell(note)} |`), "",
    "Opraveny byly mj. neexistující zdrojová povinnost NCSA/Unlicense, výslovný patentový grant GPL 2.0, knihovní místo souborového rozsahu MPL bez sekundární výjimky a chybějící omezení reklamního použití jmen. Prázdný seznam znamená doloženou absenci položek v dané kategorii; unknown znamená nevyřešený význam daného pole, i když obsahová revize již konkrétní překážku doložila.", "",
    "## Další posouzené licence s překážkou", "",
    "| Licence | Důvod a navazující práce |", "|---|---|",
    ...Object.entries(expansion.blockedNotes).map(([id, note]) => `| ${link(id)} | ${cell(note)} |`), "",
    "## Navazující práce", "",
    "Konkrétní zbývající úkol pro každou nezařazenou licenci uvádí předchozí tabulka a její [samostatná obsahová revize](systematic-review.md). Následující přehled seskupuje doložené úkoly; nejde o automatické právní zatřídění celé rodiny. Vyřešení jedné oblasti nemusí odstranit další překážky téže licence.", "",
    "| Oblast | Další krok | Příklady aktuálně nezařazených revizí |", "|---|---|---|",
    ...followUpAreas.flatMap(({ area, ids, task }) => {
      const blocked = ids.filter(id => Object.hasOwn(expansion.blockedNotes, id));
      return blocked.length ? [`| ${area} | ${cell(task)} | ${blocked.map(id => `[${id}](licenses/${id}.md)`).join(", ")} |`] : [];
    }), "",
    "Doloženou překážku nelze odstranit pouhým přepnutím recommendable. Po rozšíření modelu znovu posoudit každou dotčenou licenci podle jejího vlastního znění.", "",
    "## Hranice modelu a údržba", "",
    "- Rodina a OSI schválení samy o sobě nestačí k zařazení. Dřívější skript `complete-pending-license-reviews.mjs` hromadně vyplňoval review i u profilů s unknown; takový záznam není důkazem dokončené obsahové revize. Níže jsou vypsána konkrétní chybějící pole.",
    "- Sekundární licence MPL, přechod na pozdější GPL a podmíněné patentové granty se nesmějí zaměňovat s automatickou kompatibilitou závislostí. Průvodce stále nabízí orientační skóre; kontrola závislostí neprokazuje právní kompatibilitu.",
    "- Slovník 1.1.0 přidává allow-relinking a allow-reverse-engineering. Jde o podmínky distribuce kombinovaného díla; relinkování lze podle příslušné LGPL splnit i vhodným mechanismem sdílené knihovny. Zdroje aplikace nejsou automaticky vyžadovány. LGPL 3.0 navíc podmíněně vyžaduje instalační informace. Nové povinnosti průvodce nepovažuje za minimální zátěž ani samy o sobě za povinnost poskytnout zdroje.",
    "- LGPL 2.0 nemá samostatnou alternativu vhodné sdílené knihovny z LGPL 2.1; splnění § 6(a)–(d) se posuzuje podle této starší verze. CDDL 1.0/1.1 přidává souborový rozsah, identifikaci přispěvatele a patentové ukončení všech grantů po 60denním oznámení s možností stažení nároku. CDDL 1.1 navíc obsahuje ocenění licencí při urovnání před sporem a oznámení kalifornské jurisdikce; samotný výběr CDDL neprokazuje kompatibilitu s GPL ani vhodnost jurisdikce.",
    "- Čtvrtá várka opravuje dřívější odmítnutí Apache 1.1 a BSD variant Sun/Open MPI kvůli podmínkám, které již lze vyjádřit oznámením, omezením jmen a konkrétní poznámkou. BSD No-Nuclear-Warranty obsahuje upozornění na určení softwaru, nikoli zákaz použití z No-Nuclear-License. MIT-STK jen nezávazně žádá zaslání úprav; Qhull ukládá oznámení o původních zdrojích, nikoli jejich poskytování. PSF 2.0 zahrnuje souhrn zveřejněných změn, automatické ukončení pro podstatné porušení a přijetí podmínek; nezastupuje historické licence celého Pythonu. Unicode 3.0 nepřebírá staré definice ani výluku PDF tabulek z Unicode-DFS-2016.",
    "- Pátá várka zpřesňuje BlueOak: include-notice vyjadřuje text licence nebo odkaz, additional-terms a poznámka zachovávají přijetí pravidel, písemné upozornění a 30 dnů na všechny praktické kroky k nápravě Notices. Grant zahrnuje současné i později licencovatelné patentové nároky každého přispěvatele; pravidla pro úpravy formuláře licence na webu nejsou další podmínkou softwaru. Bzip2 a HTMLTIDY nevyžadují produktové poděkování, CMU-Mach jen žádá o vrácení vylepšení. Bcrypt obsahuje náhradní permisivní grant, CFITSIO výslovný grant vedle amerického prohlášení o copyrightu. Zmínka o zdrojích v podmínce zachování oznámení sama neznamená jejich poskytování.",
    "- Šestá várka rozlišuje dobrovolné pivo, dary a poděkování od povinného oznámení CryptoSwift. InnoSetup zachovává existující copyrighty a URL v binárním rozhraní a značkuje i binární úpravy; OML dovoluje jiné podmínky vlastních úprav při jejich uvedení na první straně souboru. Mup vyžaduje důvody a autory změn v dokumentaci, ne výslovně datum. ADSL zahrnuje vzdání se nároků souvisejících s užitím; prosté warranty/liability by tuto část nevysvětlilo. Afmparse jen konstatuje vlastnictví známek, z čehož neplyne zvláštní zákaz propagace. Glulxe se neposuzuje podle dnešního MIT znění autora, ale podle uloženého historického textu.",
    "- Sedmá várka rozlišuje výslovný patentový grant COIL pro nutně dotčené patenty poskytovatele od obranného ukončení všech práv UCAR bez grantu. UCAR byla v této várce odložena kvůli patentovému vyhodnocení; osmá várka tuto překážku řeší a zachovává její výjimku pro kombinace. EFL 1.0 vyžaduje veřejné vydání upraveného balíku při šíření závislého binárního programu, EFL 2.0 je pouze doporučuje. DSDP doporučuje vědeckou citaci mimo povinné grantové podmínky, Plexus má neurčité should přímo v jejich seznamu. Multics zachovává i celý historický úvod a neobsahuje disclaimery. Cronyx je původem fontový balík, ale grant výslovně dovoluje obecné nakládání se softwarem bez zvláštních pravidel pro názvy nebo vložení fontů. WordNet požaduje oznámení i v interních kopiích a nemá samostatné omezení odpovědnosti. Původní texty ani příznaky SPDX nebyly přepsány podle dnešních webových poznámek.",
    "- Osmá várka a slovník 1.2.0 přidávají conditional-relicensing, preserve-combined-license-terms, defend-commercial-distribution a defend-added-warranty. Podmíněné přelicencování neznamená obecnou volbu libovolné licence. AGPL §13 zachovává kombinaci AGPL/GPLv3 s odlišnými podmínkami částí a nabídkou zdrojů obou; síťový spouštěč vyžaduje upravenou interaktivní verzi. EUPL zahrnuje sdělování podstatných funkcí i bez úprav, výjimky odpovědnosti a informační/jurisdikční pravidla. EPL vyžaduje pro sekundární GPL samostatné oznámení počátečního přispěvatele, nikoli jen přílohu A. Odškodnění EPL je podmíněno vlastním jednáním při komerční distribuci a vylučuje IP spory; EUPL je váže na dobrovolně převzaté záruky nebo odpovědnost. Nové povinnosti nejsou minimální a samy neznamenají poskytování zdrojů. Model lic-008-guide-v4 přidává síťovou volbu do obou režimů a pro patents=important vyžaduje skutečné patent-grant v permissions; UCAR se tak vrací do výběru s patentovým nesouladem tam, kde je grant požadován. Python 2.0 zachovává celý soubor čtyř historických ujednání včetně alternativního oznámení CNRI a odlišných právních řádů. Artistic 2.0 a Ruby mají dokončené revize s konkrétními zbývajícími alternativami.",
    "- Devátá várka a slovník 1.3.0 přidávají advertising, include-advertising-acknowledgment a pass-disclaimer-requirement. Model lic-008-guide-v5 nabízí v obou režimech advertising=allowed|avoid; odmítnutí vytvoří konkrétní nesoulad i při interním užití, přijetí nedává zvláštní body ani neupřednostňuje reklamní licence. Nové povinnosti nejsou minimální a samy neznamenají poskytování zdrojů. Apache 1.0 a BSD-Advertising-Acknowledgement odlišují reklamu od povinného poděkování v každé redistribuci; BSD-3-Clause-Attribution reklamu nepožaduje. BSD-4-Clause-Shortened zachovává celý příslušný odstavec a nemá výluku odpovědnosti; BSD-Source-Code ukládá zachování oznámení pouze při distribuci zdrojů, ač dovoluje i binární distribuci. Již zařazená BSD-3-Clause-acpica má nově výslovnou povinnost předávat požadavek podstatně obdobného disclaimeru pro další binární distribuci, bez copyleftu. Caldera bez preambule je zařazena, historicky omezená Caldera zůstává mimo výběr. U BSD-4-Clause-UC je nutné spojit znění s retroaktivním dodatkem UC Berkeley; [primární doplněk](https://www.freebsd.org/copyright/license/) z 22. 7. 1999 ruší reklamní odstavec dotčených BSD Unix souborů, nikoli automaticky licencí jiných držitelů práv. Historické texty, otisky a příznaky SPDX zůstávají zachované. Apache výpočet zároveň používá shodnou váhu neutrální odpovědi na patenty jako TypeScript.",
    "- Desátá várka systematicky dokončuje revize zbývajících 525 licencí a zachovává 202 dřívějších individuálních revizí. Každá licence má samostatný JSON i Markdown záznam; kontrola pokrytí odmítne chybějící revizi, změněný otisk, nedoložené pole nebo neplatné zařazení. Slovník 1.4.0 přidává use pro povinnosti při samotném užití, include-use-acknowledgment pro povinné poděkování při vymezeném použití a express-exclusion pro výslovnou patentovou výluku. Model v6 odlišuje poděkování od zachování oznámení; tato povinnost není minimální a neznamená automaticky reklamu, copyleft ani poskytování zdrojů. Přesné podmínky produktu, veřejné dostupnosti zdrojů a umístění oznámení zůstávají v jednotlivých poznámkách. Pět starších negativních revizí bylo znovu posouzeno: CryptoSwift, zlib-acknowledgement, MIT-enna a libutil-David-Nugent jsou nově zařazeny, Fair stále blokuje rozsah obecného grantu. IBM-pibs nově výslovně rozlišuje patentovou výluku od mlčení. Zpracování a způsobilost pro softwarového průvodce jsou odlišné výsledky.",
    "- Jurisdikce, strategie verzí, dual licensing a budoucí distribuce nemají úplný datový model. Jejich doplnění vyžaduje samostatnou revizi schématu a pravidel. Knihovní copyleft je dostupný pro LGPL 2.0, 2.1 a 3.0; síťový pro AGPL 3.0 a EUPL 1.2. Skutečné licenční kombinace vyžadují další podklady.",
    "- Nejde o aktualizaci celého SPDX seznamu na nové vydání: pracujeme s pevnou verzí 3.28.0. Všech 727 licencí a 84 výjimek již v katalogu existovalo; rozšiřuje se výběr průvodce.",
    "- Před povolením dalších profilů doplnit významová pole a konkrétní odstavce do evidence, ověřit otisk, spustit `npm run data:runtime:write`, `npm run data:guide:report` a `npm run check`. Samotné přepnutí recommendable není revize.", "",
    "## Úplný seznam nezařazených licencí", "",
    "Každý řádek uvádí skutečný datový blokátor. U obsahově revidovaných odmítnutých profilů je zachována i jejich poznámka review; původní anglické formulace nejsou novou automatickou právní interpretací.", "",
    "| Licence / profil | Překážky a další práce | Dosavadní obsahová poznámka |", "|---|---|---|",
    ...excluded.map(row => `| ${link(row.id)} · [profil](${path.relative(path.dirname(reportPath), row.profileFile)}) | ${cell(row.problems.join(" "))} | ${cell(row.reviewNotes.join("; ")) || "Individuálně projít znění, doplnit uvedená pole a evidenci."} |`), "",
    "## Licenční výjimky", "",
    "Výjimky se do samostatného výběru licencí nezařazují. Následující seznam zachovává i jejich zbývající datové nedostatky pro budoucí práci s výrazy WITH.", "",
    "| Výjimka / profil | Překážky |", "|---|---|",
    ...exceptions.map(row => `| ${link(row.id)} · [profil](${path.relative(path.dirname(reportPath), row.profileFile)}) | ${cell(row.problems.join(" "))} |`), "",
    "## Reprodukce", "", "```bash", "npm run data:guide:report", "npm run data:guide:check", "npm run check", "```", "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const report = renderGuideReport();
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(reportPath) || fs.readFileSync(reportPath, "utf8") !== report) throw new Error("Report je zastaralý. Spusťte npm run data:guide:report.");
    console.log("Guide inclusion report is current.");
  } else {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
    console.log(`Guide inclusion report written: ${path.relative(root, reportPath)}`);
  }
}
