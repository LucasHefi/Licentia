import type { LicenseDetail, LicenseProfile, LicenseSummary } from "../components/types";
import { metadataProfileFromCatalog } from "./recommendation-contract.ts";
import expansion from "../data/guide-expansion.json" with { type: "json" };

export const ruleLabels: Record<string, string> = {
  "commercial-use": "Komerční užití",
  modifications: "Úpravy",
  distribution: "Distribuce",
  "private-use": "Soukromé užití",
  "patent-use": "Patentové oprávnění",
  "patent-grant": "Výslovné patentové oprávnění",
  "conditional-relicensing": "Jiná licence pouze při splnění stanovených podmínek",
  "defend-commercial-distribution": "Při komerční distribuci hájit a odškodnit ostatní přispěvatele podle licence",
  "defend-added-warranty": "Při převzetí dalších záruk hájit a odškodnit přispěvatele podle licence",
  "preserve-combined-license-terms": "Při kombinaci zachovat odlišné licenční podmínky jednotlivých částí",
  "same-license--network": "Stejná licence pro pokryté dílo i při síťovém provozu, s výjimkami podle znění",
  sublicensing: "Podlicencování za podmínek licence",
  "include-license-text": "Přiložit znění licence",
  "retain-copyright": "Zachovat copyright",
  "include-use-acknowledgment": "Při stanoveném užití uvést poděkování podle licence",
  "include-advertising-acknowledgment": "Uvést předepsané poděkování v reklamě podle licence",
  "pass-disclaimer-requirement": "Předat povinnost disclaimeru pro další binární distribuci",
  "include-notice": "Zachovat nebo uvést požadovaná oznámení podle licence",
  "allow-relinking": "Umožnit propojení s upravenou knihovnou podle licence",
  "allow-reverse-engineering": "Umožnit reverzní inženýrství pro ladění povolených úprav",
  unknown: "Dosud neurčeno",
  "mark-modifications": "Označit změny",
  "provide-corresponding-source": "Poskytnout odpovídající zdrojový kód",
  "provide-installation-information": "Poskytnout instalační informace, pokud to licence vyžaduje",
  "additional-terms": "Další podmínky uvedené ve znění licence",
  "patent-claim": "Důsledky patentového sporu",
  trademark: "Omezení použití jmen nebo ochranných známek",
  "include-copyright": "Zachovat licenci a copyright",
  "include-copyright--source": "Zachovat licenci ve zdroji",
  "document-changes": "Označit změny",
  "disclose-source": "Zpřístupnit zdrojový kód podle podmínek licence",
  "network-use-disclose": "Zdroj i při síťovém užití",
  "same-license": "Stejná licence pro celé dílo",
  "same-license--file": "Stejná licence pro pokryté soubory",
  "same-license--library": "Stejná licence pro knihovnu",
  "same-license--unknown": "Stejná licence za podmínek uvedených ve znění",
  "trademark-use": "Bez oprávnění k ochranným známkám",
  liability: "Omezení odpovědnosti",
  warranty: "Bez záruky",
};

type ProfileRecord = Pick<LicenseSummary, "id" | "type" | "deprecated" | "metadata">;
const displayNotes: Record<string, string> = { ...expansion.notes, ...expansion.blockedDisplayNotes };

export function guideNoteFor(id: string) {
  return displayNotes[id];
}

export function obligationLabel(value: string, scope: string) {
  if (value === "include-copyright") return ruleLabels["retain-copyright"];
  const scoped = value === "same-license" && ["file", "library", "network", "unknown"].includes(scope) ? `same-license--${scope}` : value;
  return ruleLabels[scoped] ?? value;
}

function curatedProfile(license: ProfileRecord) {
  // The catalog may display a completed negative review of a deprecated ID.
  // Recommendation still uses the original deprecated flag through its own gate.
  const profile = metadataProfileFromCatalog({ id: license.id, type: license.type, deprecated: false, metadata: license.metadata });
  if (!license.deprecated && profile?.review.status === "reviewed" && profile.review.recommendable) return profile;
  // A completed negative review is useful in the catalog even though the guide excludes it.
  const covered = new Set(profile?.evidence?.map(item => item.field));
  return Object.hasOwn(expansion.blockedNotes, license.id)
    && profile?.review.status === "not-recommendable" && profile.review.evidenceLevel === "strong"
    && [...Object.keys(profile.semantic), "review"].every(field => covered.has(field)) ? profile : null;
}

export function hasDisplayProfile(license: LicenseSummary) {
  return Boolean(curatedProfile(license) || license.profiled);
}

export function profileForDisplay(license: LicenseDetail): LicenseProfile | null {
  const profile = curatedProfile(license);
  if (!profile) return license.profile ?? null;
  const semantic = profile.semantic;
  const conditions = semantic.obligations.map((value) => value === "include-copyright" ? "retain-copyright" : value === "same-license" && ["file", "library", "network", "unknown"].includes(semantic.copyleftScope) ? `same-license--${semantic.copyleftScope}` : value);
  return {
    description: guideNoteFor(license.id) ?? license.profile?.description ?? "Ověřený profil shrnuje oprávnění a podmínky licence. Podrobnosti a výjimky obsahuje úplné znění.",
    permissions: semantic.permissions,
    conditions,
    limitations: semantic.restrictions,
  };
}

export function familyOf(license: LicenseSummary) {
  const semantic = curatedProfile(license)?.semantic;
  if (semantic) {
    if (semantic.family === "unknown") return "Neklasifikováno";
    if (semantic.family === "network-copyleft") return "Síťový copyleft";
    if (semantic.family === "strong-copyleft") return "Silný copyleft";
    if (semantic.family === "weak-copyleft") {
      if (semantic.copyleftScope === "file") return "Souborový copyleft";
      if (semantic.copyleftScope === "library") return "Knihovní copyleft";
      return "Slabý copyleft";
    }
    if (semantic.family === "public-domain-equivalent" || semantic.family === "permissive" && semantic.noticeBurden === "none" && semantic.copyleftScope === "none") return "Maximálně volná";
    if (semantic.family === "permissive") return "Permisivní";
    return "Nestandardní";
  }
  const conditions = license.conditions;
  if (conditions.includes("network-use-disclose")) return "Síťový copyleft";
  if (conditions.includes("same-license")) return "Silný copyleft";
  if (conditions.includes("same-license--library")) return "Knihovní copyleft";
  if (conditions.includes("same-license--file")) return "Souborový copyleft";
  if (["0BSD", "Unlicense", "CC0-1.0"].includes(license.id)) return "Maximálně volná";
  return license.profiled ? "Permisivní" : "Neklasifikováno";
}
