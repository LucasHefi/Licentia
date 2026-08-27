import { getRequestIdentity } from "../../../lib/request-identity";
import { boundedBody } from "../../../lib/public-api-policy";
import { parseWorkspaceState, safeStoredWorkspaceState } from "../../../lib/workspace-state";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const emptyState = { favorites: [], compareIds: [], guideAnswers: {}, history: [] };

async function database() {
  try {
    const { env } = await import("cloudflare:workers");
    return env.DB;
  } catch {
    throw new Error("State storage is unavailable outside the Cloudflare runtime.");
  }
}

function parse(value: unknown, fallback: unknown) {
  try { return typeof value === "string" ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request.headers);
  if (!identity) return Response.json({ error: "Přihlášení je vyžadováno." }, { status: 401, headers: noStore });
  let db;
  try { db = await database(); } catch { return Response.json({ error: "Úložiště pracovního prostoru není dostupné." }, { status: 503, headers: noStore }); }
  const row = await db.prepare("SELECT favorites, compare_ids, guide_answers, history, updated_at FROM user_state WHERE user_key = ?").bind(identity.key).first<Record<string, unknown>>();
  if (!row) return Response.json(emptyState, { headers: noStore });
  const state = safeStoredWorkspaceState({ favorites: parse(row.favorites, []), compareIds: parse(row.compare_ids, []), guideAnswers: parse(row.guide_answers, {}), history: parse(row.history, []) });
  return Response.json({ ...state, updatedAt: row.updated_at }, { headers: noStore });
}

export async function PUT(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return Response.json({ error: "Neplatný původ požadavku." }, { status: 403, headers: noStore });
  const identity = await getRequestIdentity(request.headers);
  if (!identity) return Response.json({ error: "Přihlášení je vyžadováno." }, { status: 401, headers: noStore });
  let payload: Record<string, unknown>;
  try { payload = await boundedBody(request); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Neplatný JSON." }, { status: 400, headers: noStore }); }
  const state = parseWorkspaceState(payload);
  if (!state) return Response.json({ error: "Pracovní prostor nemá platný formát." }, { status: 422, headers: noStore });
  const baseUpdatedAt = typeof payload.baseUpdatedAt === "string" ? payload.baseUpdatedAt : null;
  const updatedAt = new Date().toISOString();
  let db;
  try { db = await database(); } catch { return Response.json({ error: "Úložiště pracovního prostoru není dostupné." }, { status: 503, headers: noStore }); }
  const values = [JSON.stringify(state.favorites), JSON.stringify(state.compareIds), JSON.stringify(state.guideAnswers), JSON.stringify(state.history), updatedAt];
  const existing = await db.prepare("SELECT updated_at FROM user_state WHERE user_key = ?").bind(identity.key).first<{ updated_at: string }>();
  if (existing) {
    if (!baseUpdatedAt || baseUpdatedAt !== existing.updated_at) return Response.json({ error: "Pracovní prostor byl mezitím změněn na jiném zařízení.", updatedAt: existing.updated_at }, { status: 409, headers: noStore });
    const result = await db.prepare("UPDATE user_state SET favorites=?, compare_ids=?, guide_answers=?, history=?, updated_at=? WHERE user_key=? AND updated_at=?")
      .bind(...values, identity.key, baseUpdatedAt).run();
    if (!result.meta.changes) return Response.json({ error: "Pracovní prostor byl mezitím změněn na jiném zařízení." }, { status: 409, headers: noStore });
  } else {
    if (baseUpdatedAt) return Response.json({ error: "Pracovní prostor byl mezitím odstraněn." }, { status: 409, headers: noStore });
    try {
      await db.prepare("INSERT INTO user_state (user_key, favorites, compare_ids, guide_answers, history, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(identity.key, ...values).run();
    } catch {
      return Response.json({ error: "Pracovní prostor byl mezitím vytvořen na jiném zařízení." }, { status: 409, headers: noStore });
    }
  }
  return Response.json({ saved: true, updatedAt }, { headers: noStore });
}
