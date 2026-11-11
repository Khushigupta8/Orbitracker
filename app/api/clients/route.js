import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { ClientSchema, validate } from "@/lib/schemas";

// PUT /api/clients — sync full clients array (with their to-do tasks)
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const clients = validate(z.array(ClientSchema), body.clients ?? []);

  if (clients.length > 0) {
    const { error } = await db.from("clients").upsert(
      clients.map(c => ({
        id: c.id, user_id: uid, name: c.name, source: c.source,
        contact: c.contact || "", status: c.status, notes: c.notes || "", color_index: c.ci,
      }))
    );
    if (error) throw error;

    for (const c of clients) {
      const tasks = c.tasks || [];
      if (tasks.length > 0) {
        const { error: te } = await db.from("client_tasks").upsert(
          tasks.map(t => ({
            id: t.id, client_id: c.id, user_id: uid, text: t.text, done: t.done,
            priority: t.priority, due_date: t.dueDate || null, project_id: t.projectId || null,
          }))
        );
        if (te) throw te;
      }
      const { data: existing } = await db.from("client_tasks").select("id").eq("client_id", c.id);
      const keep = tasks.map(t => t.id);
      const toDelete = (existing || []).map(r => r.id).filter(id => !keep.includes(id));
      if (toDelete.length > 0) await db.from("client_tasks").delete().in("id", toDelete);
    }
  }

  const ids = clients.map(c => c.id);
  const { data: existing } = await db.from("clients").select("id").eq("user_id", uid);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) await db.from("clients").delete().in("id", toDelete);

  return json({ ok: true });
});
