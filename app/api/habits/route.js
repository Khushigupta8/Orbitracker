import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { HabitSchema, validate } from "@/lib/schemas";

// PUT /api/habits — sync full habits array
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const habits = validate(z.array(HabitSchema), body.habits ?? []);

  if (habits.length > 0) {
    const { error } = await db.from("habits").upsert(
      habits.map(h => ({
        id: h.id, user_id: uid, name: h.name, category: h.category,
        start_time: h.startTime, end_time: h.endTime, days: h.days,
      }))
    );
    if (error) throw error;
  }

  const ids = habits.map(h => h.id);
  const { data: existing } = await db.from("habits").select("id").eq("user_id", uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) {
    const { error } = await db.from("habits").delete().in("id", toDelete);
    if (error) throw error;
  }

  return json({ ok: true });
});
