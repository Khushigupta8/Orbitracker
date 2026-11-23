import { NextResponse } from "next/server";
import { getDb } from "./supabaseAdmin";

// Best-effort in-memory rate limiter. On serverless this is per warm instance,
// so it throttles bursts but is not a global limit.
const buckets = new Map();
function isLimited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return false;
  }
  b.count += 1;
  return b.count > max;
}

export async function readJson(req) {
  try { return (await req.json()) ?? {}; } catch { return {}; }
}

export function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

/**
 * Wraps a route handler with auth (Supabase bearer token), rate limiting and
 * uniform error responses. Handler receives { req, user, db, params }.
 */
export function route(handler, { name = "api", max = 300, windowMs = 15 * 60 * 1000, limitMessage = "Too many requests, please slow down" } = {}) {
  return async (req, ctx) => {
    try {
      const header = req.headers.get("authorization");
      if (!header?.startsWith("Bearer ")) return json({ error: "Missing authorization header" }, 401);

      const db = getDb();
      let user;
      try {
        const { data, error } = await db.auth.getUser(header.slice(7));
        if (error || !data?.user) return json({ error: "Invalid or expired token" }, 401);
        user = data.user;
      } catch {
        return json({ error: "Token verification failed" }, 401);
      }

      if (isLimited(`${name}:${user.id}`, max, windowMs)) return json({ error: limitMessage }, 429);

      const params = ctx?.params ? await ctx.params : {};
      return await handler({ req, user, db, params });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error("[error]", err);
      else if (err.details) console.error("[validation]", req.method, req.url, JSON.stringify(err.details));
      return json(
        {
          error: err.message || "Internal server error",
          ...(err.details ? { details: err.details } : {}),
        },
        status
      );
    }
  };
}
