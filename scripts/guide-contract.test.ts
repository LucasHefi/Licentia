import assert from "node:assert/strict";
import { test } from "node:test";
import { continueGuide, guideModel } from "../lib/catalog-service.ts";
import { guideProgress } from "../lib/recommendation-contract.ts";
import { openApiDocument } from "../lib/openapi.ts";

test("guide model exposes both versioned modes", () => {
  const model = guideModel();
  assert.deepEqual(model.modes, ["quick", "advanced"]);
  assert.equal(model.stateless, true);
  assert.ok(model.questions.some((question) => question.mode === "quick"));
  assert.ok(model.questions.some((question) => question.mode === "advanced"));
});

test("OpenAPI 3.1 publishes the stateless guide contract", () => {
  const document = openApiDocument("https://licentia.test");
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths["/v1/guide"].get);
  assert.ok(document.paths["/v1/guide"].post);
  assert.equal(document.components.schemas.GuideRequest.additionalProperties, false);
});

test("guide cursor returns the next full question and progress", () => {
  const started = guideProgress({ mode: "quick", answers: {} });
  assert.equal(started.complete, false);
  assert.equal(started.nextQuestion?.key, "openness");
  assert.deepEqual(started.progress, { answered: 0, total: 6, percent: 0 });

  const continued = guideProgress({ mode: "quick", answers: { openness: "open", projectForm: "application", reciprocity: "none", commercialUse: "allowed", delivery: "application" } });
  assert.equal(continued.nextQuestion?.key, "dependencies");
  assert.equal(continued.progress.total, 7);
});

test("guide prunes answers from inactive conditional branches", () => {
  const cursor = guideProgress({ mode: "quick", answers: { delivery: "internal", dependencies: "MIT" } });
  assert.equal(cursor.answers.dependencies, undefined);
  assert.ok(cursor.activeQuestions.every((question) => question.key !== "dependencies"));
});

test("complete guide returns the canonical recommendation contract", () => {
  const result = continueGuide([], { mode: "quick", answers: { openness: "open", projectForm: "application", reciprocity: "none", commercialUse: "allowed", delivery: "internal", patents: "neutral" } });
  assert.equal(result.complete, true);
  assert.equal(result.state, "complete");
  assert.equal(result.recommendation?.guideMode, "quick");
  assert.equal(result.recommendation?.advisory, true);
});

test("guide rejects unknown, cross-mode, and malformed answers", () => {
  assert.throws(() => guideProgress({ mode: "quick", answers: { unexpected: "x" } }), /not part/);
  assert.throws(() => guideProgress({ mode: "quick", answers: { notices: "minimal" } }), /not part/);
  assert.throws(() => guideProgress({ mode: "quick", answers: { openness: "maybe" } }), /invalid value/);
  assert.throws(() => guideProgress({ mode: "expert", answers: {} }), /quick or advanced/);
});
