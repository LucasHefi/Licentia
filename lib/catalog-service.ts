import type { GuideAnswers, LicenseDetail, LicenseSummary } from "../components/types";
import { familyOf, recommendLicenses } from "./recommend";

export const DATA_VERSION = "3.28.0";

export async function loadCatalog(origin: string): Promise<LicenseSummary[]> {
  const response = await fetch(new URL("/data/catalog.json", origin));
  if (!response.ok) throw new Error(`Catalog unavailable: ${response.status}`);
  return response.json() as Promise<LicenseSummary[]>;
}

export async function loadDetail(origin: string, type: "license" | "exception", id: string): Promise<LicenseDetail> {
  const folder = type === "license" ? "licenses" : "exceptions";
  const response = await fetch(new URL(`/data/${folder}/${encodeURIComponent(id)}.json`, origin));
  if (!response.ok) throw new Error(`Unknown SPDX identifier: ${id}`);
  return response.json() as Promise<LicenseDetail>;
}

export function searchCatalog(catalog: LicenseSummary[], query: URLSearchParams) {
  const text = (query.get("q") ?? "").trim().toLocaleLowerCase("en");
  const type = query.get("type");
  const osi = query.get("osi");
  const fsf = query.get("fsf");
  const deprecated = query.get("deprecated");
  const limit = Math.min(200, Math.max(1, Number(query.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(query.get("offset") ?? 0) || 0);
  const matches = catalog.filter((item) => {
    if (text && !`${item.id} ${item.name}`.toLocaleLowerCase("en").includes(text)) return false;
    if (type && type !== "all" && item.type !== type) return false;
    if (osi === "true" && !item.osi) return false;
    if (fsf === "true" && !item.fsf) return false;
    if (deprecated === "false" && item.deprecated) return false;
    if (deprecated === "true" && !item.deprecated) return false;
    return true;
  });
  return { dataVersion: DATA_VERSION, total: matches.length, offset, limit, items: matches.slice(offset, offset + limit) };
}

export function recommend(catalog: LicenseSummary[], answers: GuideAnswers) {
  return { dataVersion: DATA_VERSION, ruleVersion: "1.0.0", advisory: true, candidates: recommendLicenses(catalog, answers) };
}

class ExpressionParser {
  private position = 0;
  constructor(private readonly tokens: string[], private readonly licenses: Set<string>, private readonly exceptions: Set<string>) {}
  parse() { this.or(); if (this.position !== this.tokens.length) throw new Error(`Neočekávaný token „${this.tokens[this.position]}“.`); }
  private or() { this.and(); while (this.peek("OR")) { this.position++; this.and(); } }
  private and() { this.term(); while (this.peek("AND")) { this.position++; this.term(); } }
  private term() {
    if (this.peek("(")) { this.position++; this.or(); this.expect(")"); return; }
    const id = this.tokens[this.position++];
    if (!id || !this.licenses.has(id)) throw new Error(`Neznámý SPDX identifikátor „${id ?? "konec výrazu"}“.`);
    if (this.peek("WITH")) {
      this.position++;
      const exception = this.tokens[this.position++];
      if (!exception || !this.exceptions.has(exception)) throw new Error(`Neznámá SPDX výjimka „${exception ?? "konec výrazu"}“.`);
    }
  }
  private peek(value: string) { return this.tokens[this.position]?.toUpperCase() === value; }
  private expect(value: string) { if (!this.peek(value)) throw new Error(`Očekáváno „${value}“.`); this.position++; }
}

export function validateExpression(catalog: LicenseSummary[], expression: string) {
  const normalized = expression.trim().replace(/\s+/g, " ");
  const tokens = normalized.match(/\(|\)|[^\s()]+/g) ?? [];
  if (!tokens.length) return { valid: false, expression: normalized, errors: ["Výraz je prázdný."] };
  try {
    new ExpressionParser(tokens, new Set(catalog.filter(x => x.type === "license").map(x => x.id)), new Set(catalog.filter(x => x.type === "exception").map(x => x.id))).parse();
    return { valid: true, expression: normalized, errors: [] };
  } catch (error) {
    return { valid: false, expression: normalized, errors: [error instanceof Error ? error.message : "Neplatný výraz."] };
  }
}

export function checkCompatibility(catalog: LicenseSummary[], ids: string[], context?: Record<string, unknown>) {
  const items = ids.map(id => catalog.find(item => item.type === "license" && item.id === id)).filter(Boolean) as LicenseSummary[];
  const unknown = ids.filter(id => !items.some(item => item.id === id));
  const families = items.map(item => ({ id: item.id, family: familyOf(item) }));
  const strong = families.filter(item => item.family === "Silný copyleft" || item.family === "Síťový copyleft");
  const warnings: string[] = [];
  if (unknown.length) warnings.push(`Neznámé identifikátory: ${unknown.join(", ")}.`);
  if (strong.length > 1) warnings.push("Kombinace více silných copyleft licencí vyžaduje ruční kontrolu kompatibility a případných výjimek.");
  if (items.some(item => item.deprecated)) warnings.push("Výběr obsahuje historický SPDX identifikátor.");
  if (!warnings.length) warnings.push("Nebyl nalezen zjevný konflikt v orientačních metadatech; výsledek není právním stanoviskem.");
  return { dataVersion: DATA_VERSION, advisory: true, compatible: unknown.length === 0 && strong.length < 2 ? "likely" : "review", licenses: families, context: context ?? {}, warnings };
}

export function analyzeSbom(catalog: LicenseSummary[], document: unknown) {
  const serialized = JSON.stringify(document);
  const found = catalog.filter(item => item.type === "license" && new RegExp(`(^|[^A-Za-z0-9.-])${item.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9.-]|$)`).test(serialized));
  return { dataVersion: DATA_VERSION, advisory: true, licenseCount: found.length, licenses: found.map(item => ({ id: item.id, name: item.name, family: familyOf(item), deprecated: item.deprecated })), warnings: found.some(item => item.deprecated) ? ["SBOM obsahuje historické SPDX identifikátory."] : [] };
}
