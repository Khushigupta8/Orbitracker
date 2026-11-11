import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { validate } from "@/lib/schemas";

const ThemeSchema = z.object({ id: z.string().max(32), bg: z.string().max(32), dark: z.boolean() });

// GET /api/profile
export const GET = route(async ({ user, db }) => {
  const { data } = await db.from("profiles").select("username, theme").eq("id", user.id).single();
  return json({ username: data?.username || "User", theme: data?.theme || null });
});

// PUT /api/profile
export const PUT = route(async ({ req, user, db }) => {
  const { username, theme } = validate(
    z.object({
      username: z.string().min(1).max(80).optional(),
      theme: ThemeSchema.optional(),
    }).refine(d => d.username !== undefined || d.theme !== undefined, "Provide username or theme"),
    await readJson(req)
  );
  const update = { id: user.id };
  if (username !== undefined) update.username = username;
  if (theme    !== undefined) update.theme    = theme;
  const { error } = await db.from("profiles").upsert(update);
  if (error) throw error;
  return json({ ok: true });
});
