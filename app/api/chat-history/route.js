import { z } from "zod";
import { route, json, readJson } from "@/lib/server/route";
import { ChatMessageSchema, validate } from "@/lib/schemas";

// GET /api/chat-history — last 60 messages
export const GET = route(async ({ user, db }) => {
  const { data } = await db.from("chat_messages")
    .select("role, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);
  return json({ messages: (data || []).reverse() });
});

// POST /api/chat-history — append new messages
export const POST = route(async ({ req, user, db }) => {
  const body = await readJson(req);
  const messages = validate(z.array(ChatMessageSchema).min(1).max(10), body.messages ?? []);
  const { error } = await db.from("chat_messages").insert(
    messages.map(m => ({ user_id: user.id, role: m.role, content: m.content }))
  );
  if (error) throw error;
  return json({ ok: true });
});

// DELETE /api/chat-history — clear all messages for this user
export const DELETE = route(async ({ user, db }) => {
  const { error } = await db.from("chat_messages").delete().eq("user_id", user.id);
  if (error) throw error;
  return json({ ok: true });
});
