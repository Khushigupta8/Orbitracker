import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { ExpenseSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// PUT /api/expenses — sync full expenses array
router.put("/", async (req, res, next) => {
  try {
    const uid = req.user.id;
    const expenses = validate(z.array(ExpenseSchema), req.body.expenses ?? []);

    if (expenses.length > 0) {
      const { error } = await db.from("expenses").upsert(
        expenses.map(e => ({
          id: e.id,
          user_id: uid,
          amount: Number(e.amount),
          type: e.type,
          category: e.category,
          note: e.note || "",
          payment_method: e.paymentMethod,
          date: e.date,
          created_at: e.createdAt || new Date().toISOString(),
        }))
      );
      if (error) throw error;
    }

    const ids = expenses.map(e => e.id);
    // Only delete within the 365-day window the client manages — avoids wiping older history
    const since365 = new Date(); since365.setDate(since365.getDate() - 365);
    const d365 = since365.toISOString().split("T")[0];
    const { data: existing } = await db.from("expenses").select("id").eq("user_id", uid).gte("date", d365);
    const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
    if (toDelete.length > 0) {
      await db.from("expenses").delete().in("id", toDelete);
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
