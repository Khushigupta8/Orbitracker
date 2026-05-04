import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { LogSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// PUT /api/logs/:date — upsert a day's log entry
router.put("/:date", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date format" });
    const [dy, dm, dd] = date.split("-").map(Number);
    const parsed = new Date(dy, dm - 1, dd);
    if (parsed.getFullYear() !== dy || parsed.getMonth() + 1 !== dm || parsed.getDate() !== dd)
      return res.status(400).json({ error: "Invalid date" });

    const log = validate(LogSchema, req.body);

    // Upsert log record
    const { error: le } = await db.from("daily_logs").upsert(
      { user_id: uid, date, wins: log.wins, blockers: log.blockers, plans: log.plans, mood: log.mood ?? null },
      { onConflict: "user_id,date" }
    );
    if (le) throw le;

    // Sync tasks: delete then reinsert
    await db.from("daily_tasks").delete().eq("user_id", uid).eq("date", date);
    if (log.tasks.length > 0) {
      const { error: te } = await db.from("daily_tasks").insert(
        log.tasks.map(t => ({
          id: t.id, user_id: uid, date, text: t.text, done: t.done,
          priority: t.priority, project_id: t.projectId || null,
        }))
      );
      if (te) throw te;
    }

    // Sync meetings: delete then reinsert
    await db.from("meetings").delete().eq("user_id", uid).eq("date", date);
    if (log.meetings.length > 0) {
      const { error: me } = await db.from("meetings").insert(
        log.meetings.map(m => ({ id: m.id, user_id: uid, date, title: m.title, notes: m.notes, ts: m.ts }))
      );
      if (me) throw me;
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
