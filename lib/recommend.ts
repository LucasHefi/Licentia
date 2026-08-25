import type { LicenseSummary } from "../components/types";

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
