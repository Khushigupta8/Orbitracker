import { Router } from "express";
import { chatLimiter } from "../middleware/rateLimit.js";
import { ChatMessageSchema, validate } from "../lib/schemas.js";
import { z } from "zod";

const router = Router();

const BodySchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  context: z.string().max(3000).default(""),
});

router.post("/", chatLimiter, async (req, res, next) => {
  try {
    const { messages, context } = validate(BodySchema, req.body);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return res.status(500).json({ error: "GROQ_API_KEY not configured" });
    }

    const systemPrompt = `You are a friendly, warm AI assistant named "Orbit" integrated into a personal life-management app. You help the user optimize their daily habits, manage projects, plan sprints, track expenses & budgets, log mood, and stay productive.

Here is the user's current context:
${context}

Guidelines:
- Be concise, warm, and actionable
- Use emojis sparingly but effectively
- Format responses with short paragraphs
- Give specific, personalized advice based on their data
- Celebrate wins and gently nudge on areas for improvement
- When asked about their day, reference specific habits/tasks/expenses by name
- For money questions, cite numbers in ₹ and reference specific categories
- Keep responses under 150 words unless they ask for detail`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    res.json({ content: [{ text }] });
  } catch (e) { next(e); }
});

export default router;
