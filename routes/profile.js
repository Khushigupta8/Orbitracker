import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// GET /api/profile
router.get("/", async (req, res, next) => {
  try {
    const { data } = await db.from("profiles").select("username").eq("id", req.user.id).single();
    res.json({ username: data?.username || "User" });
  } catch (e) { next(e); }
});

// PUT /api/profile
router.put("/", async (req, res, next) => {
  try {
    const { username } = validate(z.object({ username: z.string().min(1).max(80) }), req.body);
    const { error } = await db.from("profiles").upsert({ id: req.user.id, username });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
