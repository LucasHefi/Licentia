import { analyzeSbom, checkCompatibility, DATA_VERSION, loadCatalog, loadDetail, recommend, searchCatalog, validateExpression } from "../../../lib/catalog-service";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": status === 200 ? "public, max-age=300" : "no-store", "Access-Control-Allow-Origin": "*" } });
}

function originOf(request: Request) { return new URL(request.url).origin; }

async function body(request: Request) {
  try { return await request.json() as Record<string, unknown>; }
  catch { throw new Error("Tělo požadavku musí být platný JSON."); }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const catalog = await loadCatalog(originOf(request));
    const url = new URL(request.url);
    if (path[0] === "licenses" && path.length === 1) return json(searchCatalog(catalog, url.searchParams));
    if (path[0] === "licenses" && path[1]) {
      const detail = await loadDetail(originOf(request), "license", path[1]);
      if (path[2] === "text") return new Response(detail.text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" } });
      return json({ dataVersion: DATA_VERSION, ...detail });
    }
    if (path[0] === "exceptions" && path[1]) return json({ dataVersion: DATA_VERSION, ...await loadDetail(originOf(request), "exception", path[1]) });
    if (path[0] === "versions") return json({ current: DATA_VERSION, versions: [{ version: DATA_VERSION, licenseCount: 727, exceptionCount: 84, source: "SPDX License List" }] });
    if (path[0] === "snapshots" && path[1] === DATA_VERSION) return json({ version: DATA_VERSION, licenseCount: 727, exceptionCount: 84, immutable: true, files: ["catalog.json", "search-index.json", "licenses/*.json", "exceptions/*.json"] });
    return json({ error: "Endpoint nebyl nalezen." }, 404);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Interní chyba." }, 404); }
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const payload = await body(request);
    const catalog = await loadCatalog(originOf(request));
    if (path.join("/") === "recommendations") return json(recommend(catalog, payload));
    if (path.join("/") === "expressions/validate") return json(validateExpression(catalog, String(payload.expression ?? "")));
    if (path.join("/") === "compatibility/check") return json(checkCompatibility(catalog, Array.isArray(payload.ids) ? payload.ids.map(String) : [], payload.context as Record<string, unknown> | undefined));
    if (path.join("/") === "sbom/analyze") return json(analyzeSbom(catalog, payload.document ?? payload));
    return json({ error: "Endpoint nebyl nalezen." }, 404);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Interní chyba." }, 400); }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
}
