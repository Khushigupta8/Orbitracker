import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { WishSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// PUT /api/wishes — sync full wishes array
router.put("/", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const wishes = validate(z.array(WishSchema), req.body.wishes ?? []);

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
    if (toDelete.length > 0) {
      await db.from("wishes").delete().in("id", toDelete);
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
