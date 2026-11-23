import { createClient } from "@supabase/supabase-js";

let client;

// Created lazily so `next build` doesn't need runtime secrets.
export function getDb() {
  if (!client) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return client;
}
