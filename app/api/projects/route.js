import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { ProjectSchema, validate } from "@/lib/schemas";

// PUT /api/projects — sync full projects array (with milestones)
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const projects = validate(z.array(ProjectSchema), body.projects ?? []);

  if (projects.length > 0) {
    const { error } = await db.from("projects").upsert(
      projects.map(p => ({
        id: p.id, user_id: uid, name: p.name, description: p.desc || "",
        status: p.status, priority: p.priority, progress: p.progress,
        due_date: p.dueDate || null, stage: p.stage, color_index: p.ci,
        developer: p.developer || "",
      }))
    );
    if (error) throw error;

    for (const p of projects) {
      const ms = p.milestones || [];
      if (ms.length > 0) {
        const { error: me } = await db.from("milestones").upsert(
          ms.map(m => ({ id: m.id, project_id: p.id, user_id: uid, text: m.text, done: m.done }))
        );
        if (me) throw me;
      }
      const { data: existing } = await db.from("milestones").select("id").eq("project_id", p.id);
      const keep = ms.map(m => m.id);
      const toDelete = (existing || []).map(r => r.id).filter(id => !keep.includes(id));
      if (toDelete.length > 0) await db.from("milestones").delete().in("id", toDelete);
    }
  }

  const ids = projects.map(p => p.id);
  const { data: existing } = await db.from("projects").select("id").eq("user_id", uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) await db.from("projects").delete().in("id", toDelete);

  return json({ ok: true });
});
