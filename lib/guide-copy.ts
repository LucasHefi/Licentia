import type { CandidateStatus, EvidenceLevel, RecommendationResult } from "./recommendation-contract";

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  "good fit": "dobrá shoda",
  "review required": "vyžaduje kontrolu",
  "insufficient evidence": "nedostatek evidence",
  excluded: "vyloučeno",
};

export const evidenceLabels: Record<EvidenceLevel, string> = { strong: "silná", sufficient: "dostatečná", weak: "slabá", unknown: "neznámá" };
export const outcomeLabels: Record<RecommendationResult["outcome"], string> = { recommendation: "doporučení", "insufficient-evidence": "nedostatek evidence", "no-safe-match": "bez bezpečné shody" };

export function guideMessage(message: string): string {
  const translations: Record<string, string> = {
    "hard constraints evaluated before ranking": "Tvrdé podmínky se vyhodnocují před řazením.",
    "equal fit preserved; deterministic ID order is not a fabricated score difference": "Stejná shoda zůstává zachována; pořadí podle ID nevytváří falešný rozdíl skóre.",
    "Dependency analysis is incomplete; provide an SPDX expression or explicitly mark it unknown.": "Analýza závislostí není dokončená; zadejte SPDX výraz nebo výslovně označte neznámou hodnotu.",
    "Dependency SPDX expression is malformed; no safe match is shown.": "SPDX výraz závislostí má chybný formát; bezpečná shoda se nezobrazuje.",
    "Dependencies were explicitly marked unknown; no safe match is shown.": "Závislosti byly výslovně označeny jako neznámé; bezpečná shoda se nezobrazuje.",
    "Dependencies were explicitly marked unknown; scoring continues without dependency compatibility.": "Závislosti byly označeny jako neznámé; skóre pokračuje bez vyhodnocení jejich kompatibility.",
    "Dependency identifiers are not all known; no safe match is shown.": "Ne všechny identifikátory závislostí jsou známé; bezpečná shoda se nezobrazuje.",
    "No safe match: runtime catalog metadata is absent or unresolved. Review evidence before recommending a license.": "Bez bezpečné shody: metadata katalogu za běhu chybí nebo nejsou vyřešená. Před doporučením licence zkontrolujte evidenci.",
    "Proprietary or source-available intent requires separate terms; no OSI/open-source recommendation is shown.": "Proprietární záměr nebo záměr se zpřístupněným zdrojovým kódem vyžaduje samostatné podmínky; doporučení OSI/open-source se nezobrazuje.",
    "metadata readiness evaluated before ranking": "Připravenost metadat se vyhodnotila před řazením.",
    "answered requirements are scored; mismatches are reported per candidate": "Zodpovězené požadavky se bodují; nesoulad se vypisuje u každého kandidáta.",
    "Licence se řadí podle skóre odpovědí; nedostatky jsou uvedené u každého kandidáta.": "Licence se řadí podle skóre odpovědí; nedostatky jsou uvedené u každého kandidáta.",
    "family: does not confirm an open-source family": "Rodina licence nepotvrzuje open-source charakter.",
    "family: open-source terms do not provide a closed/proprietary strategy": "Open-source podmínky neposkytují uzavřenou/proprietární strategii.",
    "permissions: commercial use is not evidenced": "Komerční použití není doložené.",
    "copyleftScope: does not match reciprocity=none": "Rozsah copyleftu neodpovídá požadavku „žádný“.",
    "copyleftScope: does not match reciprocity=strong": "Rozsah copyleftu neodpovídá požadavku „celé dílo“.",
    "copyleftScope: does not match reciprocity=file": "Rozsah copyleftu neodpovídá požadavku „soubor“.",
    "copyleftScope: does not match reciprocity=library": "Rozsah copyleftu neodpovídá požadavku „knihovna“.",
    "copyleftScope: does not match reciprocity=network": "Rozsah copyleftu neodpovídá požadavku „síť“.",
    "patentPosition: does not evidence a patent grant or defensive termination": "Není doložené patentové oprávnění ani obranné ukončení.",
    "patentPosition: has no evidenced patent position": "Patentové postavení není doložené.",
    "noticeBurden: requires more than a minimal notice burden": "Vyžaduje více než minimální oznamovací povinnost.",
    "noticeBurden: does not fit a standard notice burden": "Neodpovídá standardní oznamovací zátěži.",
    "triggers: has copyleft obligations": "Obsahuje povinnosti copyleftu.",
    "triggers: does not evidence a distribution trigger": "Není doložen spouštěč při distribuci.",
    "triggers: does not evidence a network-use trigger": "Není doložen síťový spouštěč povinnosti.",
    "restrictions: does not evidence a trademark restriction or clarification": "Není doložené omezení nebo vyjasnění ochranných známek.",
    "obligations: does not evidence notice obligations": "Nejsou doložené povinnosti k oznámením.",
    "obligations: does not evidence a source obligation": "Není doložená povinnost poskytnout zdrojový kód.",
    "obligations: does not evidence an installation-information obligation": "Není doložená povinnost poskytnout instalační informace.",
    "obligations: has obligations beyond the requested minimum": "Obsahuje povinnosti nad požadované minimum.",
    "semantic.versionStrategy: no validated metadata field exists": "Strategie verzí není v ověřených metadatech dostupná.",
    "semantic.dualLicensing: no validated metadata field exists": "Duální licencování není v ověřených metadatech dostupné.",
    "semantic.futureDistribution: no validated metadata field exists": "Budoucí distribuce není v ověřených metadatech dostupná.",
  };
  if (translations[message]) return translations[message];
  if (message.startsWith("branch=")) return `Větev: ${message.slice("branch=".length)}`;
  if (message.startsWith("dependency-analysis=")) return `Analýza závislostí: ${message.slice("dependency-analysis=".length)}`;
  if (message.includes(": matches ")) return message.replace(": matches ", ": odpovídá ");
  return message;
}
