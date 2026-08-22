import type { GuideAnswers, LicenseSummary, Recommendation } from "../components/types";

export const ruleLabels: Record<string, string> = {
  "commercial-use": "Komerční užití",
  modifications: "Úpravy",
  distribution: "Distribuce",
  "private-use": "Soukromé užití",
  "patent-use": "Patentové oprávnění",
  "include-copyright": "Zachovat licenci a copyright",
  "include-copyright--source": "Zachovat licenci ve zdroji",
  "document-changes": "Označit změny",
  "disclose-source": "Zveřejnit zdrojový kód",
  "network-use-disclose": "Zdroj i při síťovém užití",
  "same-license": "Stejná licence pro celé dílo",
  "same-license--file": "Stejná licence pro upravené soubory",
  "same-license--library": "Stejná licence pro knihovnu",
  "trademark-use": "Bez oprávnění k ochranným známkám",
  liability: "Omezení odpovědnosti",
  warranty: "Bez záruky",
};

export function familyOf(license: LicenseSummary) {
  const conditions = license.conditions;
  if (conditions.includes("network-use-disclose")) return "Síťový copyleft";
  if (conditions.includes("same-license")) return "Silný copyleft";
  if (conditions.includes("same-license--library")) return "Knihovní copyleft";
  if (conditions.includes("same-license--file")) return "Souborový copyleft";
  if (["0BSD", "Unlicense", "CC0-1.0"].includes(license.id)) return "Maximálně volná";
  return license.profiled ? "Permisivní" : "Neklasifikováno";
}

export function recommendLicenses(
  catalog: LicenseSummary[],
  answers: GuideAnswers,
): Recommendation[] {
  const candidates = catalog.filter(
    (item) => item.type === "license" && item.profiled && !item.deprecated,
  );

  return candidates
    .map((license) => {
      let score = 45;
      const reasons: string[] = [];
      const family = familyOf(license);
      const permissive = family === "Permisivní" || family === "Maximálně volná";
      const hasPatents = license.permissions.includes("patent-use");

      if (answers.openness === "closed") {
        score += permissive ? 22 : -38;
        if (permissive) reasons.push("umožňuje kombinaci s uzavřeným produktem");
      } else if (answers.openness === "open") {
        score += family.includes("copyleft") ? 10 : 4;
      }

      const desired = answers.reciprocity;
      if (desired === "none") {
        score += permissive ? 32 : -28;
        if (permissive) reasons.push("nevyžaduje převzetí licence pro odvozené dílo");
      }
      if (desired === "file") {
        score += family === "Souborový copyleft" ? 35 : permissive ? 9 : -8;
        if (family === "Souborový copyleft") reasons.push("copyleft omezuje na upravené soubory");
      }
      if (desired === "library") {
        score += family === "Knihovní copyleft" ? 36 : family === "Souborový copyleft" ? 16 : -4;
        if (family === "Knihovní copyleft") reasons.push("chrání knihovnu, ne automaticky celou aplikaci");
      }
      if (desired === "strong") {
        score += family === "Silný copyleft" ? 38 : family === "Síťový copyleft" ? 18 : -18;
        if (family === "Silný copyleft") reasons.push("vyžaduje stejnou licenci při distribuci odvozeného díla");
      }
      if (desired === "network") {
        score += family === "Síťový copyleft" ? 45 : -18;
        if (family === "Síťový copyleft") reasons.push("zahrnuje i poskytování softwaru po síti");
      }

      if (answers.delivery === "library") {
        score += family === "Knihovní copyleft" ? 24 : permissive ? 12 : -7;
        if (family === "Knihovní copyleft") reasons.push("je navržena pro knihovny a linkování");
      }
      if (answers.delivery === "saas") {
        score += desired === "network" && family === "Síťový copyleft" ? 20 : permissive ? 8 : 0;
      }
      if (answers.delivery === "internal") {
        score += permissive ? 6 : 0;
      }

      if (answers.patents === "important") {
        score += hasPatents ? 24 : -7;
        if (hasPatents) reasons.push("obsahuje výslovné patentové oprávnění");
      }

      if (answers.notices === "minimal") {
        score += ["0BSD", "Unlicense", "CC0-1.0"].includes(license.id) ? 30 : -4;
        if (["0BSD", "Unlicense", "CC0-1.0"].includes(license.id)) reasons.push("má velmi malé požadavky na oznámení");
      }

      if (answers.jurisdiction === "eu") {
        score += license.id === "EUPL-1.2" ? 28 : 0;
        if (license.id === "EUPL-1.2") reasons.push("je koncipována v právním rámci EU");
      }

      if (!reasons.length) reasons.push("odpovídá zvolenému základnímu profilu");
      return { license, score, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score || a.license.id.localeCompare(b.license.id))
    .slice(0, 5);
}
