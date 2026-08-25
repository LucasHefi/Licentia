import { getRequestIdentity } from "../../../lib/request-identity";

export const dynamic = "force-dynamic";

const emptyState = { favorites: [], compareIds: [], guideAnswers: {}, history: [] };

async function database() {
  try {
    const { env } = await import("cloudflare:workers");
    return env.DB;
  } catch {
    throw new Error("State storage is unavailable outside the Cloudflare runtime.");
  }
}

async function ensureSchema(db: Awaited<ReturnType<typeof database>>) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS user_state (
    user_key TEXT PRIMARY KEY NOT NULL,
    favorites TEXT NOT NULL DEFAULT '[]',
    compare_ids TEXT NOT NULL DEFAULT '[]',
    guide_answers TEXT NOT NULL DEFAULT '{}',
    history TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  )`).run();
}

function parse(value: unknown, fallback: unknown) {
  try { return typeof value === "string" ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request.headers);
  if (!identity) return Response.json({ error: "Přihlášení je vyžadováno." }, { status: 401 });
  let db;
  try { db = await database(); await ensureSchema(db); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "State storage is unavailable." }, { status: 503 }); }
  const row = await db.prepare("SELECT favorites, compare_ids, guide_answers, history, updated_at FROM user_state WHERE user_key = ?").bind(identity.key).first<Record<string, unknown>>();
  if (!row) return Response.json(emptyState);
  return Response.json({ favorites: parse(row.favorites, []), compareIds: parse(row.compare_ids, []), guideAnswers: parse(row.guide_answers, {}), history: parse(row.history, []), updatedAt: row.updated_at });
}

export async function PUT(request: Request) {
  const identity = await getRequestIdentity(request.headers);
  if (!identity) return Response.json({ error: "Přihlášení je vyžadováno." }, { status: 401 });
  let state: Record<string, unknown>;
  try { state = await request.json(); } catch { return Response.json({ error: "Neplatný JSON." }, { status: 400 }); }
  const favorites = Array.isArray(state.favorites) ? state.favorites.map(String).slice(0, 500) : [];
  const compareIds = Array.isArray(state.compareIds) ? state.compareIds.map(String).slice(0, 4) : [];
  const guideAnswers = state.guideAnswers && typeof state.guideAnswers === "object" ? state.guideAnswers : {};
  const history = Array.isArray(state.history) ? state.history.slice(0, 100) : [];
  const updatedAt = new Date().toISOString();
  let db;
  try { db = await database(); await ensureSchema(db); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "State storage is unavailable." }, { status: 503 }); }
  await db.prepare(`INSERT INTO user_state (user_key, favorites, compare_ids, guide_answers, history, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_key) DO UPDATE SET favorites=excluded.favorites, compare_ids=excluded.compare_ids, guide_answers=excluded.guide_answers, history=excluded.history, updated_at=excluded.updated_at`)
    .bind(identity.key, JSON.stringify(favorites), JSON.stringify(compareIds), JSON.stringify(guideAnswers), JSON.stringify(history), updatedAt).run();
  return Response.json({ saved: true, updatedAt });
}
