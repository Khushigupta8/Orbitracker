import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { BudgetSchema, validate } from "@/lib/schemas";

// PUT /api/budgets — sync full budgets array
export const PUT = route(async ({ req, user, db }) => {
  const uid = user.id;
  const body = await readJson(req);
  const budgets = validate(z.array(BudgetSchema), body.budgets ?? []);

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
  if (toDelete.length > 0) await db.from("budgets").delete().in("id", toDelete);

  return json({ ok: true });
});
