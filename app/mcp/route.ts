import { analyzeSbom, checkCompatibility, continueGuide, DATA_VERSION, guideModel, loadCatalog, loadDetail, recommend, searchCatalog, validateExpression } from "../../lib/catalog-service";
import { MCP_LATEST_PROTOCOL_VERSION, MCP_PROMPTS, MCP_RESOURCES, MCP_RESOURCE_TEMPLATES, MCP_SERVER_VERSION, MCP_SUPPORTED_PROTOCOL_VERSIONS, negotiateMcpProtocolVersion, parseMcpEnvelope, mcpProtocolVersionFromHeader, toolsForProtocol, validateMcpToolArguments } from "../../lib/mcp-contract";
import { boundedBody, mcpOriginGuard, mergeHeaders, publicGuard } from "../../lib/public-api-policy";

export const dynamic = "force-dynamic";

function rpcHeaders(extra: Headers, protocolVersion?: string) {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  if (protocolVersion) headers.set("MCP-Protocol-Version", protocolVersion);
  return headers;
}

function result(id: string | number, value: unknown, headers: Headers, protocolVersion?: string) {
  return Response.json({ jsonrpc: "2.0", id, result: value }, { headers: rpcHeaders(headers, protocolVersion) });
}

function failure(id: string | number | null, code: number, message: string, headers: Headers, options?: { status?: number; data?: unknown; protocolVersion?: string }) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message, ...(options?.data === undefined ? {} : { data: options.data }) } }, { status: options?.status ?? 200, headers: rpcHeaders(headers, options?.protocolVersion) });
}

function toolContent(value: Record<string, unknown>, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value, isError };
}

async function guardedHeaders(request: Request, expensive: boolean) {
  const origin = await mcpOriginGuard(request);
  if (origin instanceof Response) return origin;
  const guard = await publicGuard(request, expensive);
  if (guard instanceof Response) return mergeHeaders(guard, origin.headers);
  const headers = new Headers(guard.headers);
  origin.headers.forEach((value, key) => headers.set(key, value));
  return headers;
}

function resourceText(uri: string, value: unknown) {
  return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(value) }] };
}

export async function POST(request: Request) {
  const guarded = await guardedHeaders(request, true);
  if (guarded instanceof Response) return guarded;
  let raw: unknown;
  try { raw = await boundedBody(request); }
  catch { return failure(null, -32700, "Parse error", guarded, { status: 400 }); }

  let parsed: ReturnType<typeof parseMcpEnvelope>;
  try { parsed = parseMcpEnvelope(raw); }
  catch (error) { return failure(null, -32600, error instanceof Error ? error.message : "Invalid Request", guarded, { status: 400 }); }
  const { envelope: rpc, kind } = parsed;
  if (kind === "notification" || kind === "response") return new Response(null, { status: 202, headers: guarded });
  const id = rpc.id as string | number;

  if (rpc.method === "initialize") {
    const protocolVersion = negotiateMcpProtocolVersion(rpc.params?.protocolVersion);
    return result(id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } },
      serverInfo: { name: "licentia", title: "Licentia SPDX License Guide", version: MCP_SERVER_VERSION },
      instructions: "Use start_license_guide and continue_license_guide for interactive selection. Canonical texts come from the pinned SPDX snapshot; curated metadata is identified separately; all recommendations are advisory and not legal advice.",
    }, guarded, protocolVersion);
  }

  const protocolVersion = mcpProtocolVersionFromHeader(request.headers.get("mcp-protocol-version"));
  if (!protocolVersion) return failure(id, -32602, "Unsupported MCP protocol version.", guarded, { status: 400, data: { supported: MCP_SUPPORTED_PROTOCOL_VERSIONS } });

  try {
    if (rpc.method === "ping") return result(id, {}, guarded, protocolVersion);
    if (rpc.method === "tools/list") return result(id, { tools: toolsForProtocol(protocolVersion) }, guarded, protocolVersion);
    if (rpc.method === "resources/list") return result(id, { resources: MCP_RESOURCES }, guarded, protocolVersion);
    if (rpc.method === "resources/templates/list") return result(id, { resourceTemplates: MCP_RESOURCE_TEMPLATES }, guarded, protocolVersion);
    if (rpc.method === "prompts/list") return result(id, { prompts: MCP_PROMPTS }, guarded, protocolVersion);
    if (rpc.method === "prompts/get") {
      if (rpc.params?.name !== "choose_license") return failure(id, -32602, "Unknown prompt.", guarded, { protocolVersion });
      const mode = rpc.params?.arguments && typeof rpc.params.arguments === "object" && !Array.isArray(rpc.params.arguments) ? (rpc.params.arguments as Record<string, unknown>).mode : undefined;
      if (mode !== undefined && mode !== "quick" && mode !== "advanced") return failure(id, -32602, "Prompt mode must be quick or advanced.", guarded, { protocolVersion });
      return result(id, { description: "Interactive, evidence-backed license selection", messages: [{ role: "user", content: { type: "text", text: `Help me choose a software license. Start the ${mode ?? "quick"} Licentia guide, ask one returned question at a time, and continue with cumulative answers. Clearly label the result as advisory and not legal advice.` } }] }, guarded, protocolVersion);
    }
    if (rpc.method === "resources/read") {
      const uri = typeof rpc.params?.uri === "string" ? rpc.params.uri : "";
      if (uri === "licentia://guide/model") return result(id, resourceText(uri, guideModel()), guarded, protocolVersion);
      if (uri === "licentia://api/discovery") return result(id, resourceText(uri, { name: "Licentia API", version: MCP_SERVER_VERSION, dataVersion: DATA_VERSION, rest: "/v1", documentation: "/v1/openapi.json", mcp: "/mcp", guide: "/v1/guide" }), guarded, protocolVersion);
      const match = uri.match(/^spdx:\/\/(licenses|exceptions)\/(.+)$/);
      if (!match) return failure(id, -32602, "Invalid resource URI.", guarded, { protocolVersion });
      const detail = await loadDetail(new URL(request.url).origin, match[1] === "licenses" ? "license" : "exception", decodeURIComponent(match[2]));
      return result(id, resourceText(uri, { dataVersion: DATA_VERSION, ...detail }), guarded, protocolVersion);
    }
    if (rpc.method !== "tools/call") return failure(id, -32601, "Method not found", guarded, { protocolVersion });

    const name = typeof rpc.params?.name === "string" ? rpc.params.name : "";
    const args = rpc.params?.arguments ?? {};
    const argumentErrors = validateMcpToolArguments(name, args);
    if (argumentErrors.length) return failure(id, -32602, argumentErrors[0] ?? "Invalid tool arguments.", guarded, { data: { errors: argumentErrors }, protocolVersion });
    const input = args as Record<string, unknown>;

    try {
      const origin = new URL(request.url).origin;
      const catalog = await loadCatalog(origin);
      let value: Record<string, unknown>;
      if (name === "search_licenses") {
        const query = new URLSearchParams();
        if (input.query) query.set("q", String(input.query));
        if (input.type) query.set("type", String(input.type));
        if (input.osi !== undefined) query.set("osi", String(input.osi));
        if (input.fsf !== undefined) query.set("fsf", String(input.fsf));
        if (input.limit) query.set("limit", String(input.limit));
        value = searchCatalog(catalog, query);
      } else if (name === "get_license") value = { dataVersion: DATA_VERSION, ...await loadDetail(origin, input.type === "exception" ? "exception" : "license", String(input.id)) };
      else if (name === "compare_licenses") value = checkCompatibility(catalog, (input.ids as unknown[]).map(String), input.context as Record<string, unknown> | undefined);
      else if (name === "start_license_guide") value = continueGuide(catalog, { mode: input.mode, answers: {} });
      else if (name === "continue_license_guide") value = continueGuide(catalog, input);
      else if (name === "recommend_license") value = recommend(catalog, input);
      else if (name === "validate_spdx_expression") value = validateExpression(catalog, String(input.expression));
      else if (name === "analyze_sbom") value = analyzeSbom(catalog, input.document);
      else return failure(id, -32602, "Unknown tool.", guarded, { protocolVersion });
      return result(id, toolContent(value), guarded, protocolVersion);
    } catch (error) {
      return result(id, toolContent({ error: error instanceof Error ? error.message : "Tool execution failed." }, true), guarded, protocolVersion);
    }
  } catch (error) {
    return failure(id, -32603, error instanceof Error ? error.message : "Internal error", guarded, { status: 500, protocolVersion });
  }
}

export async function GET(request: Request) {
  const guarded = await guardedHeaders(request, false);
  if (guarded instanceof Response) return guarded;
  return new Response("Licentia MCP does not expose a server event stream; use Streamable HTTP POST.", { status: 405, headers: new Headers({ Allow: "POST, OPTIONS", ...Object.fromEntries(guarded) }) });
}

export async function DELETE(request: Request) {
  const origin = await mcpOriginGuard(request);
  if (origin instanceof Response) return origin;
  return new Response(null, { status: 405, headers: new Headers({ Allow: "POST, OPTIONS", ...Object.fromEntries(origin.headers) }) });
}

export async function OPTIONS(request: Request) {
  const origin = await mcpOriginGuard(request);
  if (origin instanceof Response) return origin;
  return new Response(null, { status: 204, headers: new Headers({ ...Object.fromEntries(origin.headers), "Access-Control-Allow-Headers": "content-type, authorization, mcp-protocol-version, mcp-session-id, last-event-id", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" }) });
}

export const MCP_IMPLEMENTED_PROTOCOL_VERSION = MCP_LATEST_PROTOCOL_VERSION;
