import { DATA_VERSION } from "../../lib/catalog-service";

export function GET() {
  return Response.json({ name: "Licentia API", version: "1.0.0", dataVersion: DATA_VERSION, documentation: "/docs/ECOSYSTEM.md", endpoints: ["/v1/licenses", "/v1/licenses/{id}", "/v1/licenses/{id}/text", "/v1/exceptions/{id}", "/v1/versions", "/v1/recommendations", "/v1/expressions/validate", "/v1/compatibility/check", "/v1/sbom/analyze"] });
}
