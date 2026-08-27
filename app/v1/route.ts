import { DATA_VERSION } from "../../lib/catalog-service";
import { mergeHeaders, publicGuard } from "../../lib/public-api-policy";

export async function GET(request: Request) {
  const guard = await publicGuard(request);
  if (guard instanceof Response) return guard;
  return mergeHeaders(Response.json({ name: "Licentia API", version: "1.1.0", dataVersion: DATA_VERSION, documentation: "/v1/openapi.json", mcp: "/mcp", endpoints: ["/v1/openapi.json", "/v1/licenses", "/v1/licenses/{id}", "/v1/licenses/{id}/text", "/v1/exceptions/{id}", "/v1/versions", "/v1/guide", "/v1/recommendations", "/v1/expressions/validate", "/v1/compatibility/check", "/v1/sbom/analyze"] }), guard.headers);
}
