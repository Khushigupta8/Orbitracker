import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

const ToggleSchema = z.object({
  habitId:   z.string().min(1).max(64),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
});

// POST /api/completions — toggle a single habit completion
router.post("/", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const { habitId, date, completed } = validate(ToggleSchema, req.body);

    if (completed) {
      const { error } = await db.from("habit_completions")
        .upsert({ user_id: uid, habit_id: habitId, date }, { onConflict: "user_id,habit_id,date" });
      if (error) throw error;
    } else {
      const { error } = await db.from("habit_completions").delete()
        .eq("user_id", uid).eq("habit_id", habitId).eq("date", date);
      if (error) throw error;
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
