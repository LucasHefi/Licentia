import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkspaceState, safeStoredWorkspaceState } from "../lib/workspace-state.ts";

const valid = {
  favorites: ["MIT", "MIT", "Apache-2.0"],
  compareIds: ["MIT"],
  guideAnswers: { openness: "open", dependencies: "MIT AND Apache-2.0" },
  history: [{ id: "event-1", kind: "detail", label: "MIT", createdAt: "2026-08-26T10:00:00.000Z" }],
};

test("normalizes a valid workspace and removes duplicate identifiers", () => {
  assert.deepEqual(parseWorkspaceState(valid), { ...valid, favorites: ["MIT", "Apache-2.0"] });
});

test("rejects unknown keys, oversized collections and malformed values", () => {
  assert.equal(parseWorkspaceState({ ...valid, compareIds: ["MIT", "A", "B", "C", "D"] }), null);
  assert.equal(parseWorkspaceState({ ...valid, favorites: ["../secret"] }), null);
  assert.equal(parseWorkspaceState({ ...valid, guideAnswers: { unexpected: "value" } }), null);
  assert.equal(parseWorkspaceState({ ...valid, unexpected: true }), null);
  assert.equal(parseWorkspaceState({ ...valid, history: [{ ...valid.history[0], kind: "other" }] }), null);
});

test("corrupt persisted data falls back to a clean local workspace", () => {
  assert.deepEqual(safeStoredWorkspaceState({ favorites: "MIT" }), { favorites: [], compareIds: [], guideAnswers: {}, history: [] });
});
