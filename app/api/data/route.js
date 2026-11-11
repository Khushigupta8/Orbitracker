import { route, json } from "@/lib/server/route";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const emptyLog = () => ({ wins: "", blockers: "", plans: "", mood: null, tasks: [], meetings: [], decisions: [] });

// GET /api/data — load all user data in one round trip
export const GET = route(async ({ user, db }) => {
  const uid = user.id;
  const d60 = daysAgo(60), d30 = daysAgo(30), d365 = daysAgo(365);

  const [habR, compR, projR, logR, taskR, meetR, sprintR, profR, wishR, expR, budR, cliR] = await Promise.all([
    db.from("habits").select("*").eq("user_id", uid).order("created_at"),
    db.from("habit_completions").select("habit_id, date").eq("user_id", uid).gte("date", d60),
    db.from("projects").select("*, milestones(*)").eq("user_id", uid).order("created_at"),
    db.from("daily_logs").select("*").eq("user_id", uid).gte("date", d30),
    db.from("daily_tasks").select("*").eq("user_id", uid).gte("date", d30),
    db.from("meetings").select("*").eq("user_id", uid).gte("date", d30),
    db.from("sprints").select("*, sprint_items(*)").eq("user_id", uid).order("created_at"),
    db.from("profiles").select("username, theme").eq("id", uid).single(),
    db.from("wishes").select("*").eq("user_id", uid).order("created_at"),
    db.from("expenses").select("*").eq("user_id", uid).gte("date", d365).order("date", { ascending: false }),
    db.from("budgets").select("*").eq("user_id", uid).order("category"),
    db.from("clients").select("*, client_tasks(*)").eq("user_id", uid).order("created_at"),
  ]);

  const habits = (habR.data || []).map(r => ({
    id: r.id, name: r.name, category: r.category,
    startTime: r.start_time, endTime: r.end_time, days: r.days,
  }));

  const comps = {};
  (compR.data || []).forEach(r => {
    if (!comps[r.date]) comps[r.date] = {};
    comps[r.date][r.habit_id] = true;
  });

  const projects = (projR.data || []).map(r => ({
    id: r.id, name: r.name, desc: r.description || "", status: r.status,
    priority: r.priority, progress: r.progress, dueDate: r.due_date || "",
    stage: r.stage, ci: r.color_index, developer: r.developer || "",
    milestones: (r.milestones || []).map(m => ({ id: m.id, text: m.text, done: m.done })),
  }));

  const logs = {};
  (logR.data || []).forEach(r => {
    logs[r.date] = { wins: r.wins || "", blockers: r.blockers || "", plans: r.plans || "", mood: r.mood, timeWorked: r.time_worked || 0, tasks: [], meetings: [], decisions: [] };
  });
  (taskR.data || []).forEach(r => {
    if (!logs[r.date]) logs[r.date] = emptyLog();
    logs[r.date].tasks.push({ id: r.id, text: r.text, done: r.done, priority: r.priority, projectId: r.project_id || "" });
  });
  (meetR.data || []).forEach(r => {
    if (!logs[r.date]) logs[r.date] = emptyLog();
    logs[r.date].meetings.push({ id: r.id, title: r.title, notes: r.notes || "", ts: r.ts });
  });

  const sprints = (sprintR.data || []).map(r => ({
    id: r.id, name: r.name, goal: r.goal || "", startDate: r.start_date,
    endDate: r.end_date || "", completed: r.completed,
    items: (r.sprint_items || []).map(i => ({ id: i.id, text: i.text, projectId: i.project_id || "", status: i.status })),
  }));

  const wishes = (wishR.data || []).map(r => ({
    id: r.id, title: r.title, type: r.type, category: r.category, priority: r.priority,
    notes: r.notes || "", targetDate: r.target_date || "",
    price: r.price != null ? String(r.price) : "", done: r.done, createdAt: r.created_at,
  }));

  const expenses = (expR.data || []).map(r => ({
    id: r.id,
    amount: r.amount != null ? Number(r.amount) : 0,
    type: r.type || "expense",
    category: r.category,
    note: r.note || "",
    paymentMethod: r.payment_method || "cash",
    date: r.date,
    createdAt: r.created_at,
  }));

  const budgets = (budR.data || []).map(r => ({
    id: r.id,
    category: r.category,
    monthlyLimit: r.monthly_limit != null ? Number(r.monthly_limit) : 0,
  }));

  // If the clients tables haven't been migrated yet, cliR.error is set and we return [].
  const clients = (cliR.data || []).map(r => ({
    id: r.id, name: r.name, source: r.source, contact: r.contact || "", status: r.status,
    notes: r.notes || "", ci: r.color_index,
    tasks: (r.client_tasks || [])
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map(t => ({ id: t.id, text: t.text, done: t.done, priority: t.priority, dueDate: t.due_date || "", projectId: t.project_id || "" })),
  }));

  return json({
    clients,
    habits, comps, projects, logs, sprints, wishes, expenses, budgets,
    username: profR.data?.username || "User",
    theme: profR.data?.theme || null,
  });
});
