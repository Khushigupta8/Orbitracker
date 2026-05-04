import { supabase } from "./supabase";

// Get the current Supabase session token to authenticate server requests
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

async function request(method, path, body) {
  const token = await getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    const detail = data.details ? " — " + (Array.isArray(data.details) ? data.details.map(d => `${(d.path||[]).join(".")}: ${d.message}`).join("; ") : JSON.stringify(data.details)) : "";
    const err = new Error((data.error || `Request failed: ${res.status}`) + detail);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Load all data in one request ──────────────────────────────────────────────
export async function loadAll() {
  return request("GET", "/data");
}

// ── Habits ────────────────────────────────────────────────────────────────────
export async function saveHabits(_userId, habits) {
  return request("PUT", "/habits", { habits });
}

// ── Completions ───────────────────────────────────────────────────────────────
export async function toggleCompletion(_userId, habitId, date, completed) {
  return request("POST", "/completions", { habitId, date, completed });
}

// ── Projects ──────────────────────────────────────────────────────────────────
export async function saveProjects(_userId, projects) {
  return request("PUT", "/projects", { projects });
}

// ── Sprints ───────────────────────────────────────────────────────────────────
export async function saveSprints(_userId, sprints) {
  return request("PUT", "/sprints", { sprints });
}

// ── Wishes ────────────────────────────────────────────────────────────────────
export async function saveWishes(_userId, wishes) {
  return request("PUT", "/wishes", { wishes });
}

// ── Daily logs ────────────────────────────────────────────────────────────────
export async function updateDailyLog(_userId, date, log) {
  return request("PUT", `/logs/${date}`, log);
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function saveProfile(_userId, username) {
  return request("PUT", "/profile", { username });
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export async function saveExpenses(_userId, expenses) {
  return request("PUT", "/expenses", { expenses });
}

// ── Budgets ───────────────────────────────────────────────────────────────────
export async function saveBudgets(_userId, budgets) {
  return request("PUT", "/budgets", { budgets });
}
