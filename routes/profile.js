import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

const ThemeSchema = z.object({ id: z.string().max(32), bg: z.string().max(32), dark: z.boolean() });

// GET /api/profile
router.get("/", async (req, res, next) => {
  try {
    const { data } = await db.from("profiles").select("username, theme").eq("id", req.user.id).single();
    res.json({ username: data?.username || "User", theme: data?.theme || null });
  } catch (e) { next(e); }
});

// PUT /api/profile
router.put("/", async (req, res, next) => {
  try {
    const { username, theme } = validate(
      z.object({
        username: z.string().min(1).max(80).optional(),
        theme: ThemeSchema.optional(),
      }).refine(d => d.username !== undefined || d.theme !== undefined, "Provide username or theme"),
      req.body
    );
    const update = { id: req.user.id };
    if (username !== undefined) update.username = username;
    if (theme    !== undefined) update.theme    = theme;
    const { error } = await db.from("profiles").upsert(update);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
