import { Router } from "express";
import { db } from "../lib/supabaseAdmin.js";
import { ChatMessageSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

// GET /api/chat-history — last 60 messages
router.get("/", async (req, res, next) => {
  try {
    const { data } = await db.from("chat_messages")
      .select("role, content")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    res.json({ messages: (data || []).reverse() });
  } catch (e) { next(e); }
});

// POST /api/chat-history — append new messages
router.post("/", async (req, res, next) => {
  try {
    const messages = validate(z.array(ChatMessageSchema).min(1).max(10), req.body.messages ?? []);
    const { error } = await db.from("chat_messages").insert(
      messages.map(m => ({ user_id: req.user.id, role: m.role, content: m.content }))
    );
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/chat-history — clear all messages for this user
router.delete("/", async (req, res, next) => {
  try {
    const { error } = await db.from("chat_messages").delete().eq("user_id", req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
