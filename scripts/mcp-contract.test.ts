import assert from "node:assert/strict";
import { test } from "node:test";
import { MCP_LATEST_PROTOCOL_VERSION, negotiateMcpProtocolVersion, parseMcpEnvelope, toolsForProtocol, validateMcpToolArguments } from "../lib/mcp-contract.ts";
import { mcpOriginGuard } from "../lib/public-api-policy.ts";

test("MCP negotiates supported revisions and defaults to the latest stable revision", () => {
  assert.equal(negotiateMcpProtocolVersion("2025-06-18"), "2025-06-18");
  assert.equal(negotiateMcpProtocolVersion("unsupported"), MCP_LATEST_PROTOCOL_VERSION);
});

test("MCP validates JSON-RPC requests, notifications, and responses", () => {
  assert.equal(parseMcpEnvelope({ jsonrpc: "2.0", id: 1, method: "ping" }).kind, "request");
  assert.equal(parseMcpEnvelope({ jsonrpc: "2.0", method: "notifications/initialized" }).kind, "notification");
  assert.equal(parseMcpEnvelope({ jsonrpc: "2.0", id: 1, result: {} }).kind, "response");
  assert.throws(() => parseMcpEnvelope({ id: 1, method: "ping" }), /Invalid JSON-RPC/);
  assert.throws(() => parseMcpEnvelope({ jsonrpc: "2.0", id: null, method: "ping" }), /id must/);
});

test("all MCP tools strictly validate arguments and expose guide operations", () => {
  const tools = toolsForProtocol(MCP_LATEST_PROTOCOL_VERSION);
  assert.ok(tools.some((tool) => tool.name === "start_license_guide"));
  assert.ok(tools.some((tool) => tool.name === "continue_license_guide"));
  assert.deepEqual(validateMcpToolArguments("search_licenses", { query: "MIT", limit: 10 }), []);
  assert.match(validateMcpToolArguments("search_licenses", { unexpected: true })[0] ?? "", /unknown field/);
  assert.match(validateMcpToolArguments("compare_licenses", { ids: ["MIT"] })[0] ?? "", /too few/);
  assert.match(validateMcpToolArguments("get_license", {})[0] ?? "", /required/);
  assert.deepEqual(validateMcpToolArguments("continue_license_guide", { mode: "quick", answers: { openness: "open" } }), []);
  assert.ok(toolsForProtocol("2025-03-26").every((tool) => !("outputSchema" in tool)));
});

test("MCP Origin validation permits same-origin and configured origins only", async () => {
  const sameOrigin = await mcpOriginGuard(new Request("https://licentia.test/mcp", { headers: { Origin: "https://licentia.test" } }), {});
  assert.equal(sameOrigin instanceof Response, false);
  const configured = await mcpOriginGuard(new Request("https://licentia.test/mcp", { headers: { Origin: "https://client.test" } }), { MCP_ALLOWED_ORIGINS: "https://client.test" });
  assert.equal(configured instanceof Response, false);
  const rejected = await mcpOriginGuard(new Request("https://licentia.test/mcp", { headers: { Origin: "https://evil.test" } }), {});
  assert.equal(rejected instanceof Response ? rejected.status : 200, 403);
});
