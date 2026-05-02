import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { BudgetSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// PUT /api/budgets — sync full budgets array
router.put("/", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const budgets = validate(z.array(BudgetSchema), req.body.budgets ?? []);

    if (budgets.length > 0) {
      const { error } = await db.from("budgets").upsert(
        budgets.map(b => ({
          id: b.id,
          user_id: uid,
          category: b.category,
          monthly_limit: Number(b.monthlyLimit),
        })),
        { onConflict: "user_id,category" }
      );
      if (error) throw error;
    }

    const ids = budgets.map(b => b.id);
    const { data: existing } = await db.from("budgets").select("id").eq("user_id", uid);
    const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
    if (toDelete.length > 0) {
      await db.from("budgets").delete().in("id", toDelete);
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
