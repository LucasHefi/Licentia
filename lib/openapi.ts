import { DATA_VERSION } from "./catalog-service.ts";
import { GUIDE_ANSWER_INPUT_SCHEMA } from "./recommendation-contract.ts";

const json = { "application/json": { schema: { type: "object" } } };
const response = (description: string) => ({ description, content: json });

export function openApiDocument(origin?: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Licentia API",
      version: "1.1.0",
      description: `Read-only SPDX catalog and advisory license tooling over pinned data ${DATA_VERSION}. Recommendations are not legal advice.`,
      license: { name: "MIT" },
    },
    servers: [{ url: origin ?? "/" }],
    tags: [{ name: "Catalog" }, { name: "Guide" }, { name: "Analysis" }],
    paths: {
      "/v1": { get: { summary: "Discover API capabilities", responses: { "200": response("API discovery") } } },
      "/v1/openapi.json": { get: { summary: "OpenAPI 3.1 document", responses: { "200": response("This document") } } },
      "/v1/licenses": { get: { tags: ["Catalog"], summary: "Search licenses and exceptions", parameters: [{ name: "q", in: "query", schema: { type: "string", maxLength: 200 } }, { name: "type", in: "query", schema: { enum: ["license", "exception", "all"] } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } }, { name: "offset", in: "query", schema: { type: "integer", minimum: 0 } }], responses: { "200": response("Paginated catalog results") } } },
      "/v1/licenses/{id}": { get: { tags: ["Catalog"], summary: "Get license detail", parameters: [{ $ref: "#/components/parameters/SpdxId" }], responses: { "200": response("License detail"), "404": response("Unknown identifier") } } },
      "/v1/licenses/{id}/text": { get: { tags: ["Catalog"], summary: "Get canonical license text", parameters: [{ $ref: "#/components/parameters/SpdxId" }], responses: { "200": { description: "Canonical text", content: { "text/plain": { schema: { type: "string" } } } }, "404": response("Unknown identifier") } } },
      "/v1/exceptions/{id}": { get: { tags: ["Catalog"], summary: "Get exception detail", parameters: [{ $ref: "#/components/parameters/SpdxId" }], responses: { "200": response("Exception detail"), "404": response("Unknown identifier") } } },
      "/v1/versions": { get: { tags: ["Catalog"], summary: "List data snapshots", responses: { "200": response("Snapshot list") } } },
      "/v1/guide": {
        get: { tags: ["Guide"], summary: "Get the versioned guide model", parameters: [{ name: "mode", in: "query", schema: { $ref: "#/components/schemas/GuideMode" } }], responses: { "200": response("Guide model"), "400": response("Invalid mode") } },
        post: { tags: ["Guide"], summary: "Start or continue the stateless guide", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GuideRequest" } } } }, responses: { "200": response("Guide cursor and optional final recommendation"), "400": response("Invalid guide input"), "429": response("Rate limit exceeded") } },
      },
      "/v1/recommendations": { post: { tags: ["Guide"], summary: "Evaluate explicit requirements directly", requestBody: { required: true, content: { "application/json": { schema: GUIDE_ANSWER_INPUT_SCHEMA } } }, responses: { "200": response("Advisory recommendation result"), "400": response("Invalid envelope") } } },
      "/v1/expressions/validate": { post: { tags: ["Analysis"], summary: "Validate an SPDX expression", requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false, required: ["expression"], properties: { expression: { type: "string", maxLength: 4096 } } } } } }, responses: { "200": response("Validation result") } } },
      "/v1/compatibility/check": { post: { tags: ["Analysis"], summary: "Perform an advisory compatibility review", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["ids"], properties: { ids: { type: "array", minItems: 2, maxItems: 20, items: { type: "string" } }, context: { type: "object" } } } } } }, responses: { "200": response("Human-review-required result") } } },
      "/v1/sbom/analyze": { post: { tags: ["Analysis"], summary: "Analyze SPDX or CycloneDX JSON", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["document"], properties: { document: {} } } } } }, responses: { "200": response("SBOM license summary") } } },
    },
    components: {
      parameters: { SpdxId: { name: "id", in: "path", required: true, schema: { type: "string", maxLength: 128 } } },
      schemas: {
        GuideMode: { type: "string", enum: ["quick", "advanced"] },
        GuideAnswers: GUIDE_ANSWER_INPUT_SCHEMA.oneOf[0],
        GuideRequest: { type: "object", additionalProperties: false, properties: { mode: { $ref: "#/components/schemas/GuideMode" }, answers: { $ref: "#/components/schemas/GuideAnswers" } } },
      },
    },
  } as const;
}
