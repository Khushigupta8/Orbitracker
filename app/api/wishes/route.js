import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { WishSchema, validate } from "@/lib/schemas";

// PUT /api/wishes — sync full wishes array
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const wishes = validate(z.array(WishSchema), body.wishes ?? []);

  if (wishes.length > 0) {
    const { error } = await db.from("wishes").upsert(
      wishes.map(w => ({
        id: w.id, user_id: uid, title: w.title, type: w.type,
        category: w.category, priority: w.priority, notes: w.notes || "",
        target_date: w.targetDate || null, price: w.price ? Number(w.price) : null,
        done: w.done, created_at: w.createdAt || new Date().toISOString(),
      }))
    );
    if (error) throw error;
  }

  const ids = wishes.map(w => w.id);
  const { data: existing } = await db.from("wishes").select("id").eq("user_id", uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) await db.from("wishes").delete().in("id", toDelete);

  return json({ ok: true });
});
