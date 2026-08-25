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
    "Dependency identifiers are not all known; no safe match is shown.": "Ne všechny identifikátory závislostí jsou známé; bezpečná shoda se nezobrazuje.",
    "No safe match: runtime catalog metadata is absent or unresolved. Review evidence before recommending a license.": "Bez bezpečné shody: metadata katalogu za běhu chybí nebo nejsou vyřešená. Před doporučením licence zkontrolujte evidenci.",
    "Proprietary or source-available intent requires separate terms; no OSI/open-source recommendation is shown.": "Proprietární záměr nebo záměr se zpřístupněným zdrojovým kódem vyžaduje samostatné podmínky; doporučení OSI/open-source se nezobrazuje.",
  };
  if (translations[message]) return translations[message];
  if (message.startsWith("branch=")) return `Větev: ${message.slice("branch=".length)}`;
  if (message.startsWith("dependency-analysis=")) return `Analýza závislostí: ${message.slice("dependency-analysis=".length)}`;
  if (message.includes(": matches ")) return message.replace(": matches ", ": odpovídá ");
  return message;
}
