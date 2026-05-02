import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { HabitSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// PUT /api/habits — sync full habits array
router.put("/", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const habits = validate(z.array(HabitSchema), req.body.habits ?? []);

    if (habits.length > 0) {
      const { error } = await db.from("habits").upsert(
        habits.map(h => ({
          id: h.id, user_id: uid, name: h.name, category: h.category,
          start_time: h.startTime, end_time: h.endTime, days: h.days,
        }))
      );
      if (error) throw error;
    }

    // Delete habits no longer in the list
    const ids = habits.map(h => h.id);
    const { data: existing } = await db.from("habits").select("id").eq("user_id", uid);
    const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
    if (toDelete.length > 0) {
      const { error } = await db.from("habits").delete().in("id", toDelete);
      if (error) throw error;
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
