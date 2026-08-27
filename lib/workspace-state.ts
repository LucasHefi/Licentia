import type { ActivityEntry, GuideAnswers, WorkspaceState } from "../components/types";

const SPDX_ID = /^[A-Za-z0-9][A-Za-z0-9.-]{0,127}$/;
const ACTIVITY_KINDS = new Set<ActivityEntry["kind"]>(["detail", "guide", "comparison"]);
const GUIDE_KEYS = new Set<keyof GuideAnswers>([
  "openness",
  "reciprocity",
  "delivery",
  "patents",
  "notices",
  "jurisdiction",
  "projectForm",
  "commercialUse",
  "proprietary",
  "copyleftTrigger",
  "trademarks",
  "obligations",
  "dependencies",
  "versionStrategy",
  "dualLicensing",
  "futureDistribution",
]);

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueIds(value: unknown, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const ids = value.map(String);
  if (ids.some((id) => !SPDX_ID.test(id))) return null;
  return [...new Set(ids)];
}

function guideAnswers(value: unknown): GuideAnswers | null {
  if (!plainRecord(value) || Object.keys(value).some((key) => !GUIDE_KEYS.has(key as keyof GuideAnswers))) return null;
  if (Object.values(value).some((answer) => typeof answer !== "string" || answer.length > 128)) return null;
  return { ...value } as GuideAnswers;
}

function history(value: unknown): ActivityEntry[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const result: ActivityEntry[] = [];
  for (const item of value) {
    if (!plainRecord(item) || Object.keys(item).some((key) => !["id", "kind", "label", "createdAt"].includes(key))) return null;
    if (typeof item.id !== "string" || item.id.length > 128) return null;
    if (typeof item.kind !== "string" || !ACTIVITY_KINDS.has(item.kind as ActivityEntry["kind"])) return null;
    if (typeof item.label !== "string" || item.label.length > 500) return null;
    if (typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) return null;
    result.push({ id: item.id, kind: item.kind as ActivityEntry["kind"], label: item.label, createdAt: item.createdAt });
  }
  return result;
}

export function parseWorkspaceState(value: unknown): WorkspaceState | null {
  if (!plainRecord(value)) return null;
  if (Object.keys(value).some((key) => !["favorites", "compareIds", "guideAnswers", "history", "updatedAt", "baseUpdatedAt"].includes(key))) return null;
  const favorites = uniqueIds(value.favorites, 500);
  const compareIds = uniqueIds(value.compareIds, 4);
  const answers = guideAnswers(value.guideAnswers);
  const activity = history(value.history);
  if (!favorites || !compareIds || !answers || !activity) return null;
  return { favorites, compareIds, guideAnswers: answers, history: activity };
}

export function safeStoredWorkspaceState(value: unknown): WorkspaceState {
  return parseWorkspaceState(value) ?? { favorites: [], compareIds: [], guideAnswers: {}, history: [] };
}
