import { analyzeSbom, checkCompatibility, DATA_VERSION, loadCatalog, loadDetail, recommend, searchCatalog, validateExpression } from "../../lib/catalog-service";
import { GUIDE_ANSWER_INPUT_SCHEMA } from "../../lib/recommendation-contract";
import { boundedBody, mergeHeaders, publicGuard } from "../../lib/public-api-policy";

export const dynamic = "force-dynamic";

const tools = [
  { name: "search_licenses", description: "Vyhledá a filtruje licence a výjimky SPDX.", inputSchema: { type: "object", properties: { query: { type: "string" }, type: { enum: ["license", "exception", "all"] }, osi: { type: "boolean" }, fsf: { type: "boolean" }, limit: { type: "integer", minimum: 1, maximum: 200 } } } },
  { name: "get_license", description: "Vrátí metadata a úplné znění SPDX licence nebo výjimky.", inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" }, type: { enum: ["license", "exception"] } } } },
  { name: "compare_licenses", description: "Provede orientační kontrolu kombinace licencí.", inputSchema: { type: "object", required: ["ids"], properties: { ids: { type: "array", minItems: 2, maxItems: 20, items: { type: "string" } }, context: { type: "object" } } } },
  { name: "recommend_license", description: "Vrátí typovaný, auditovatelný a fail-closed orientační výsledek; nízká evidence není jisté doporučení.", inputSchema: GUIDE_ANSWER_INPUT_SCHEMA },
  { name: "validate_spdx_expression", description: "Ověří syntaxi a identifikátory SPDX výrazu.", inputSchema: { type: "object", required: ["expression"], properties: { expression: { type: "string" } } } },
  { name: "analyze_sbom", description: "Najde SPDX licence v JSON dokumentu SPDX nebo CycloneDX.", inputSchema: { type: "object", required: ["document"], properties: { document: {} } } },
];

function result(id: unknown, value: unknown, headers?: Headers) { const response = Response.json({ jsonrpc: "2.0", id, result: value }, { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }); return headers ? mergeHeaders(response, headers) : response; }
function failure(id: unknown, code: number, message: string, headers?: Headers) { const response = Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: code === -32603 ? 500 : 400, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } }); return headers ? mergeHeaders(response, headers) : response; }
function content(value: unknown) { return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError: false }; }

export async function POST(request: Request) {
  const guard = await publicGuard(request, true);
  if (guard instanceof Response) return guard;
  let rpc: { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown>; uri?: string } };
  try { rpc = await boundedBody(request) as typeof rpc; } catch { return failure(null, -32700, "Parse error", guard.headers); }
  const id = rpc.id ?? null;
  try {
     if (rpc.method === "initialize") return result(id, { protocolVersion: "2025-03-26", capabilities: { tools: { listChanged: false }, resources: {} }, serverInfo: { name: "licentia", version: "1.0.0" }, instructions: "Kanonická znění pocházejí ze SPDX. Doporučení jsou orientační a nejsou právní radou." }, guard.headers);
     if (rpc.method === "notifications/initialized") return new Response(null, { status: 202, headers: guard.headers });
     if (rpc.method === "ping") return result(id, {}, guard.headers);
     if (rpc.method === "tools/list") return result(id, { tools }, guard.headers);
     if (rpc.method === "resources/templates/list") return result(id, { resourceTemplates: [{ uriTemplate: "spdx://licenses/{id}", name: "SPDX licence", mimeType: "application/json" }, { uriTemplate: "spdx://exceptions/{id}", name: "SPDX výjimka", mimeType: "application/json" }] }, guard.headers);
    const origin = new URL(request.url).origin;
    if (rpc.method === "resources/read") {
      const match = rpc.params?.uri?.match(/^spdx:\/\/(licenses|exceptions)\/(.+)$/);
       if (!match) return failure(id, -32602, "Neplatné resource URI", guard.headers);
      const detail = await loadDetail(origin, match[1] === "licenses" ? "license" : "exception", decodeURIComponent(match[2]));
       return result(id, { contents: [{ uri: rpc.params?.uri, mimeType: "application/json", text: JSON.stringify({ dataVersion: DATA_VERSION, ...detail }) }] }, guard.headers);
    }
     if (rpc.method !== "tools/call") return failure(id, -32601, "Method not found", guard.headers);
    const rawArgs = rpc.params?.arguments;
     if (rpc.params?.name === "recommend_license" && (rawArgs !== undefined && (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)))) return failure(id, -32602, "Recommendation arguments must be an object.", guard.headers);
    const args = rawArgs ?? {};
    const catalog = await loadCatalog(origin);
    let value: unknown;
    if (rpc.params?.name === "search_licenses") { const q = new URLSearchParams(); if (args.query) q.set("q", String(args.query)); if (args.type) q.set("type", String(args.type)); if (args.osi !== undefined) q.set("osi", String(args.osi)); if (args.fsf !== undefined) q.set("fsf", String(args.fsf)); if (args.limit) q.set("limit", String(args.limit)); value = searchCatalog(catalog, q); }
    else if (rpc.params?.name === "get_license") value = { dataVersion: DATA_VERSION, ...await loadDetail(origin, args.type === "exception" ? "exception" : "license", String(args.id ?? "")) };
    else if (rpc.params?.name === "compare_licenses") value = checkCompatibility(catalog, Array.isArray(args.ids) ? args.ids.map(String) : [], args.context as Record<string, unknown> | undefined);
    else if (rpc.params?.name === "recommend_license") {
      try { value = recommend(catalog, args); }
       catch (error) { return failure(id, -32602, error instanceof Error ? error.message : "Invalid recommendation arguments.", guard.headers); }
    }
    else if (rpc.params?.name === "validate_spdx_expression") value = validateExpression(catalog, String(args.expression ?? ""));
    else if (rpc.params?.name === "analyze_sbom") value = analyzeSbom(catalog, args.document);
     else return failure(id, -32602, "Unknown tool", guard.headers);
     return result(id, content(value), guard.headers);
   } catch (error) { return failure(id, -32603, error instanceof Error ? error.message : "Internal error", guard.headers); }
}

export async function GET(request: Request) { const guard = await publicGuard(request, true); if (guard instanceof Response) return guard; return new Response("Licentia MCP používá Streamable HTTP POST.", { status: 405, headers: new Headers({ Allow: "POST, OPTIONS", ...Object.fromEntries(guard.headers) }) }); }
export function OPTIONS() { return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, OPTIONS" } }); }
