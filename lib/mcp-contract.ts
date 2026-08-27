import { GUIDE_ANSWER_INPUT_SCHEMA } from "./recommendation-contract.ts";

export const MCP_SERVER_VERSION = "1.1.0";
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
export const MCP_LATEST_PROTOCOL_VERSION = MCP_SUPPORTED_PROTOCOL_VERSIONS[0];
export const MCP_FALLBACK_PROTOCOL_VERSION = "2025-03-26";

const objectOutput = { type: "object", additionalProperties: true } as const;
const readOnlyAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const directAnswersSchema = GUIDE_ANSWER_INPUT_SCHEMA.oneOf[0];

export const GUIDE_CURSOR_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { enum: ["quick", "advanced"], description: "Quick asks the minimum safe set; advanced captures more constraints." },
    answers: directAnswersSchema,
  },
} as const;

export const MCP_TOOLS = [
  { name: "search_licenses", title: "Search SPDX licenses", description: "Search and filter the pinned SPDX license and exception catalog. Use before requesting a detail when the identifier is unknown.", inputSchema: { type: "object", additionalProperties: false, properties: { query: { type: "string", maxLength: 200 }, type: { enum: ["license", "exception", "all"] }, osi: { type: "boolean" }, fsf: { type: "boolean" }, limit: { type: "integer", minimum: 1, maximum: 200 } } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "get_license", title: "Get an SPDX record", description: "Return provenance, curated metadata, and the complete canonical text of one SPDX license or exception.", inputSchema: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 128 }, type: { enum: ["license", "exception"] } } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "compare_licenses", title: "Review a license combination", description: "Perform an advisory compatibility review. The result always requires human review and never claims legal compatibility.", inputSchema: { type: "object", additionalProperties: false, required: ["ids"], properties: { ids: { type: "array", minItems: 2, maxItems: 20, items: { type: "string", minLength: 1, maxLength: 128 } }, context: { type: "object" } } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "start_license_guide", title: "Start the license guide", description: "Start Licentia's versioned, stateless license-selection guide and return the first question. Continue with continue_license_guide.", inputSchema: { type: "object", additionalProperties: false, properties: { mode: { enum: ["quick", "advanced"] } } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "continue_license_guide", title: "Continue the license guide", description: "Continue the guide with all answers collected so far. Returns progress, the next full question, and only after completion the fail-closed recommendation result.", inputSchema: GUIDE_CURSOR_INPUT_SCHEMA, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "recommend_license", title: "Evaluate explicit requirements", description: "Evaluate already-known requirements directly. For an interactive question flow use start_license_guide and continue_license_guide.", inputSchema: GUIDE_ANSWER_INPUT_SCHEMA, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "validate_spdx_expression", title: "Validate an SPDX expression", description: "Validate SPDX expression syntax and identifiers against the pinned catalog.", inputSchema: { type: "object", additionalProperties: false, required: ["expression"], properties: { expression: { type: "string", minLength: 1, maxLength: 4096 } } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
  { name: "analyze_sbom", title: "Analyze SBOM licenses", description: "Extract license identifiers from SPDX or CycloneDX JSON license fields and return an advisory summary.", inputSchema: { type: "object", additionalProperties: false, required: ["document"], properties: { document: {} } }, outputSchema: objectOutput, annotations: readOnlyAnnotations },
] as const;

export const MCP_RESOURCES = [
  { uri: "licentia://guide/model", name: "Licentia license guide model", description: "Versioned quick and advanced guide questions and answer choices.", mimeType: "application/json" },
  { uri: "licentia://api/discovery", name: "Licentia API discovery", description: "REST and MCP capability summary.", mimeType: "application/json" },
] as const;

export const MCP_RESOURCE_TEMPLATES = [
  { uriTemplate: "spdx://licenses/{id}", name: "SPDX license", description: "Canonical license detail from the pinned SPDX snapshot.", mimeType: "application/json" },
  { uriTemplate: "spdx://exceptions/{id}", name: "SPDX exception", description: "Canonical exception detail from the pinned SPDX snapshot.", mimeType: "application/json" },
] as const;

export const MCP_PROMPTS = [{ name: "choose_license", title: "Choose a software license", description: "Guide a user through an advisory, evidence-backed license selection.", arguments: [{ name: "mode", description: "quick or advanced", required: false }] }] as const;

type JsonSchema = Record<string, unknown>;

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export function negotiateMcpProtocolVersion(requested: unknown): string {
  return typeof requested === "string" && (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested) ? requested : MCP_LATEST_PROTOCOL_VERSION;
}

export function mcpProtocolVersionFromHeader(value: string | null): string | null {
  const version = value ?? MCP_FALLBACK_PROTOCOL_VERSION;
  return (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(version) ? version : null;
}

export type McpEnvelope = {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
};

export function parseMcpEnvelope(value: unknown): { envelope: McpEnvelope; kind: "request" | "notification" | "response" } {
  if (!record(value) || value.jsonrpc !== "2.0") throw new Error("Invalid JSON-RPC 2.0 envelope.");
  const hasId = Object.hasOwn(value, "id");
  if (hasId && typeof value.id !== "string" && typeof value.id !== "number") throw new Error("JSON-RPC id must be a string or number.");
  if (Object.hasOwn(value, "method")) {
    if (typeof value.method !== "string" || value.method.length === 0) throw new Error("JSON-RPC method must be a non-empty string.");
    if (value.params !== undefined && !record(value.params)) throw new Error("JSON-RPC params must be an object.");
    return { envelope: value as McpEnvelope, kind: hasId ? "request" : "notification" };
  }
  if (!hasId || (!Object.hasOwn(value, "result") && !Object.hasOwn(value, "error"))) throw new Error("Invalid JSON-RPC message.");
  return { envelope: value as McpEnvelope, kind: "response" };
}

function validateSchema(schema: JsonSchema, value: unknown, path: string): string[] {
  if (Array.isArray(schema.oneOf)) {
    const variants = schema.oneOf.map((entry) => validateSchema(entry as JsonSchema, value, path));
    return variants.filter((errors) => errors.length === 0).length === 1 ? [] : [`${path}: must match exactly one supported input form`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return [`${path}: unsupported value`];
  if (schema.type === "object") {
    if (!record(value)) return [`${path}: expected an object`];
    const properties = record(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    const errors = required.flatMap((key) => typeof key === "string" && !Object.hasOwn(value, key) ? [`${path}.${key}: required`] : []);
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(properties, key)) errors.push(`${path}.${key}: unknown field`);
    for (const [key, child] of Object.entries(value)) if (record(properties[key])) errors.push(...validateSchema(properties[key] as JsonSchema, child, `${path}.${key}`));
    return errors;
  }
  if (schema.type === "array") {
    if (!Array.isArray(value)) return [`${path}: expected an array`];
    const errors: string[] = [];
    if (typeof schema.minItems === "number" && value.length < schema.minItems) errors.push(`${path}: too few items`);
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) errors.push(`${path}: too many items`);
    if (record(schema.items)) value.forEach((item, index) => errors.push(...validateSchema(schema.items as JsonSchema, item, `${path}[${index}]`)));
    return errors;
  }
  if (schema.type === "string") {
    if (typeof value !== "string") return [`${path}: expected a string`];
    if (typeof schema.minLength === "number" && value.length < schema.minLength) return [`${path}: string is too short`];
    if (typeof schema.maxLength === "number" && value.length > schema.maxLength) return [`${path}: string is too long`];
  }
  if (schema.type === "integer" && !Number.isInteger(value)) return [`${path}: expected an integer`];
  if (schema.type === "integer" && typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) return [`${path}: value is too small`];
  if (schema.type === "integer" && typeof value === "number" && typeof schema.maximum === "number" && value > schema.maximum) return [`${path}: value is too large`];
  if (schema.type === "boolean" && typeof value !== "boolean") return [`${path}: expected a boolean`];
  return [];
}

export function validateMcpToolArguments(name: string, value: unknown): string[] {
  const tool = MCP_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) return [`Unknown tool: ${name}`];
  return validateSchema(tool.inputSchema as JsonSchema, value, "arguments");
}

export function toolsForProtocol(version: string) {
  if (version !== "2025-03-26") return MCP_TOOLS;
  return MCP_TOOLS.map((tool) => {
    const legacy: Record<string, unknown> = { ...tool };
    delete legacy.outputSchema;
    return legacy;
  });
}
