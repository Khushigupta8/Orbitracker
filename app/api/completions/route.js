import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { validate } from "@/lib/schemas";

const ToggleSchema = z.object({
  habitId:   z.string().min(1).max(64),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
});

// POST /api/completions — toggle a single habit completion
export const POST = route(async ({ req, user, db }) => {
  const uid = user.id;
  const { habitId, date, completed } = validate(ToggleSchema, await readJson(req));

  if (completed) {
    const { error } = await db.from("habit_completions")
      .upsert({ user_id: uid, habit_id: habitId, date }, { onConflict: "user_id,habit_id,date" });
    if (error) throw error;
  } else {
    const { error } = await db.from("habit_completions").delete()
      .eq("user_id", uid).eq("habit_id", habitId).eq("date", date);
    if (error) throw error;
  }

  return json({ ok: true });
});
