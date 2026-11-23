import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnon);

// Placeholders keep the import safe during build/prerender; <Root> shows a
// clear error screen when the real env vars are missing.
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnon || "missing-anon-key"
);
