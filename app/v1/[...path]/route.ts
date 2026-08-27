import { analyzeSbom, checkCompatibility, continueGuide, DATA_VERSION, guideModel, loadCatalog, loadDetail, recommend, searchCatalog, validateExpression } from "../../../lib/catalog-service";
import { boundedBody, mergeHeaders, publicGuard } from "../../../lib/public-api-policy";
import { openApiDocument } from "../../../lib/openapi";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200, extra?: Headers) {
  const response = Response.json(data, { status, headers: { "Cache-Control": status === 200 ? "public, max-age=300" : "no-store", "Access-Control-Allow-Origin": "*" } });
  return extra ? mergeHeaders(response, extra) : response;
}

function originOf(request: Request) { return new URL(request.url).origin; }

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const guard = await publicGuard(request);
  if (guard instanceof Response) return guard;
  try {
    const url = new URL(request.url);
    if (path[0] === "openapi.json" && path.length === 1) return json(openApiDocument(url.origin), 200, guard.headers);
    const catalog = await loadCatalog(originOf(request));
    if ((url.searchParams.get("q") ?? "").length > 200) return json({ error: "Dotaz je příliš dlouhý." }, 400, guard.headers);
    if (path[0] === "licenses" && path.length === 1) return json(searchCatalog(catalog, url.searchParams), 200, guard.headers);
    if (path[0] === "licenses" && path[1]) {
      const detail = await loadDetail(originOf(request), "license", path[1]);
      if (path[2] === "text") return new Response(detail.text, { headers: new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*", ...Object.fromEntries(guard.headers) }) });
      return json({ dataVersion: DATA_VERSION, ...detail }, 200, guard.headers);
    }
    if (path[0] === "exceptions" && path[1]) return json({ dataVersion: DATA_VERSION, ...await loadDetail(originOf(request), "exception", path[1]) }, 200, guard.headers);
    if (path[0] === "versions") return json({ current: DATA_VERSION, versions: [{ version: DATA_VERSION, licenseCount: 727, exceptionCount: 84, source: "SPDX License List" }] }, 200, guard.headers);
    if (path[0] === "snapshots" && path[1] === DATA_VERSION) return json({ version: DATA_VERSION, licenseCount: 727, exceptionCount: 84, immutable: true, files: ["catalog.json", "search-index.json", "licenses/*.json", "exceptions/*.json"] }, 200, guard.headers);
    if (path[0] === "guide" && path.length === 1) return json(guideModel(url.searchParams.get("mode") ?? undefined), 200, guard.headers);
    return json({ error: "Endpoint nebyl nalezen." }, 404, guard.headers);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Interní chyba." }, 404, guard.headers); }
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const guard = await publicGuard(request, true);
  if (guard instanceof Response) return guard;
  try {
    const payload = await boundedBody(request);
    const catalog = await loadCatalog(originOf(request));
    if (path.join("/") === "guide") return json(continueGuide(catalog, payload), 200, guard.headers);
    if (path.join("/") === "recommendations") return json(recommend(catalog, payload), 200, guard.headers);
    if (path.join("/") === "expressions/validate") return json(validateExpression(catalog, String(payload.expression ?? "").slice(0, 4096)), 200, guard.headers);
    if (path.join("/") === "compatibility/check") return json(checkCompatibility(catalog, Array.isArray(payload.ids) ? payload.ids.slice(0, 20).map(String) : [], payload.context as Record<string, unknown> | undefined), 200, guard.headers);
    if (path.join("/") === "sbom/analyze") return json(analyzeSbom(catalog, payload.document ?? payload), 200, guard.headers);
    return json({ error: "Endpoint nebyl nalezen." }, 404, guard.headers);
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Interní chyba." }, 400, guard.headers); }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } });
}
