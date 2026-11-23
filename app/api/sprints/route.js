import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { SprintSchema, validate } from "@/lib/schemas";

// PUT /api/sprints — sync full sprints array (with items)
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const sprints = validate(z.array(SprintSchema), body.sprints ?? []);

  if (sprints.length > 0) {
    const { error } = await db.from("sprints").upsert(
      sprints.map(s => ({
        id: s.id, user_id: uid, name: s.name, goal: s.goal || "",
        start_date: s.startDate, end_date: s.endDate || null, completed: s.completed,
      }))
    );
    if (error) throw error;

    for (const s of sprints) {
      const items = s.items || [];
      if (items.length > 0) {
        const { error: ie } = await db.from("sprint_items").upsert(
          items.map(i => ({
            id: i.id, sprint_id: s.id, user_id: uid, text: i.text,
            project_id: i.projectId || null, status: i.status,
          }))
        );
        if (ie) throw ie;
      }
      const { data: existing } = await db.from("sprint_items").select("id").eq("sprint_id", s.id);
      const keep = items.map(i => i.id);
      const toDelete = (existing || []).map(r => r.id).filter(id => !keep.includes(id));
      if (toDelete.length > 0) await db.from("sprint_items").delete().in("id", toDelete);
    }
  }

  const ids = sprints.map(s => s.id);
  const { data: existing } = await db.from("sprints").select("id").eq("user_id", uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) await db.from("sprints").delete().in("id", toDelete);

  return json({ ok: true });
});
