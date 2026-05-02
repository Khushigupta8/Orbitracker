import { supabase } from "./supabase";

// ── Profiles ──────────────────────────────────────────────────────────────────

export async function loadProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  return data?.username || "User";
}

export async function saveProfile(userId, username) {
  await supabase.from("profiles").upsert({ id: userId, username });
}

// ── Habits ────────────────────────────────────────────────────────────────────

export async function loadHabits(userId) {
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    startTime: r.start_time,
    endTime: r.end_time,
    days: r.days,
  }));
}

export async function saveHabits(userId, habits) {
  if (habits.length > 0) {
    await supabase.from("habits").upsert(
      habits.map(h => ({
        id: h.id,
        user_id: userId,
        name: h.name,
        category: h.category,
        start_time: h.startTime,
        end_time: h.endTime,
        days: h.days,
      }))
    );
  }
  // Delete habits removed from the list
  const ids = habits.map(h => h.id);
  const { data: existing } = await supabase.from("habits").select("id").eq("user_id", userId);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) {
    await supabase.from("habits").delete().in("id", toDelete);
  }
}

// ── Completions ───────────────────────────────────────────────────────────────

export async function loadComps(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data } = await supabase
    .from("habit_completions")
    .select("habit_id, date")
    .eq("user_id", userId)
    .gte("date", since.toISOString().split("T")[0]);
  const comps = {};
  (data || []).forEach(r => {
    if (!comps[r.date]) comps[r.date] = {};
    comps[r.date][r.habit_id] = true;
  });
  return comps;
}

export async function toggleCompletion(userId, habitId, date, completed) {
  if (completed) {
    await supabase.from("habit_completions")
      .upsert({ user_id: userId, habit_id: habitId, date }, { onConflict: "user_id,habit_id,date" });
  } else {
    await supabase.from("habit_completions").delete()
      .eq("user_id", userId).eq("habit_id", habitId).eq("date", date);
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function loadProjects(userId) {
  const { data } = await supabase
    .from("projects")
    .select("*, milestones(*)")
    .eq("user_id", userId)
    .order("created_at");
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    desc: r.description || "",
    status: r.status,
    priority: r.priority,
    progress: r.progress,
    dueDate: r.due_date || "",
    stage: r.stage,
    ci: r.color_index,
    milestones: (r.milestones || []).map(m => ({ id: m.id, text: m.text, done: m.done })),
  }));
}

export async function saveProjects(userId, projects) {
  if (projects.length > 0) {
    await supabase.from("projects").upsert(
      projects.map(p => ({
        id: p.id,
        user_id: userId,
        name: p.name,
        description: p.desc || "",
        status: p.status,
        priority: p.priority || "medium",
        progress: p.progress || 0,
        due_date: p.dueDate || null,
        stage: p.stage || "planning",
        color_index: p.ci || 0,
      }))
    );
    // Sync milestones per project
    for (const p of projects) {
      const ms = p.milestones || [];
      if (ms.length > 0) {
        await supabase.from("milestones").upsert(
          ms.map(m => ({ id: m.id, project_id: p.id, user_id: userId, text: m.text, done: m.done }))
        );
      }
      const { data: existing } = await supabase.from("milestones").select("id").eq("project_id", p.id);
      const toDelete = (existing || []).map(r => r.id).filter(id => !ms.map(m => m.id).includes(id));
      if (toDelete.length > 0) {
        await supabase.from("milestones").delete().in("id", toDelete);
      }
    }
  }
  // Delete removed projects
  const ids = projects.map(p => p.id);
  const { data: existing } = await supabase.from("projects").select("id").eq("user_id", userId);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) {
    await supabase.from("projects").delete().in("id", toDelete);
  }
}

// ── Sprints ───────────────────────────────────────────────────────────────────

export async function loadSprints(userId) {
  const { data } = await supabase
    .from("sprints")
    .select("*, sprint_items(*)")
    .eq("user_id", userId)
    .order("created_at");
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    goal: r.goal || "",
    startDate: r.start_date,
    endDate: r.end_date || "",
    completed: r.completed,
    items: (r.sprint_items || []).map(i => ({
      id: i.id,
      text: i.text,
      projectId: i.project_id || "",
      status: i.status,
    })),
  }));
}

export async function saveSprints(userId, sprints) {
  if (sprints.length > 0) {
    await supabase.from("sprints").upsert(
      sprints.map(s => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        goal: s.goal || "",
        start_date: s.startDate,
        end_date: s.endDate || null,
        completed: s.completed || false,
      }))
    );
    for (const s of sprints) {
      const items = s.items || [];
      if (items.length > 0) {
        await supabase.from("sprint_items").upsert(
          items.map(i => ({
            id: i.id,
            sprint_id: s.id,
            user_id: userId,
            text: i.text,
            project_id: i.projectId || null,
            status: i.status,
          }))
        );
      }
      const { data: existing } = await supabase.from("sprint_items").select("id").eq("sprint_id", s.id);
      const toDelete = (existing || []).map(r => r.id).filter(id => !items.map(i => i.id).includes(id));
      if (toDelete.length > 0) {
        await supabase.from("sprint_items").delete().in("id", toDelete);
      }
    }
  }
  const ids = sprints.map(s => s.id);
  const { data: existing } = await supabase.from("sprints").select("id").eq("user_id", userId);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) {
    await supabase.from("sprints").delete().in("id", toDelete);
  }
}

// ── Wishes ────────────────────────────────────────────────────────────────────

export async function loadWishes(userId) {
  const { data } = await supabase
    .from("wishes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  return (data || []).map(r => ({
    id: r.id,
    title: r.title,
    type: r.type,
    category: r.category,
    priority: r.priority,
    notes: r.notes || "",
    targetDate: r.target_date || "",
    price: r.price != null ? String(r.price) : "",
    done: r.done,
    createdAt: r.created_at,
  }));
}

export async function saveWishes(userId, wishes) {
  if (wishes.length > 0) {
    await supabase.from("wishes").upsert(
      wishes.map(w => ({
        id: w.id,
        user_id: userId,
        title: w.title,
        type: w.type || "dream",
        category: w.category,
        priority: w.priority,
        notes: w.notes || "",
        target_date: w.targetDate || null,
        price: w.price ? Number(w.price) : null,
        done: w.done,
        created_at: w.createdAt || new Date().toISOString(),
      }))
    );
  }
  const ids = wishes.map(w => w.id);
  const { data: existing } = await supabase.from("wishes").select("id").eq("user_id", userId);
  const toDelete = (existing || []).map(r => r.id).filter(id => !ids.includes(id));
  if (toDelete.length > 0) {
    await supabase.from("wishes").delete().in("id", toDelete);
  }
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function loadLogs(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().split("T")[0];

  const [{ data: logRows }, { data: taskRows }, { data: meetingRows }] = await Promise.all([
    supabase.from("daily_logs").select("*").eq("user_id", userId).gte("date", sinceStr),
    supabase.from("daily_tasks").select("*").eq("user_id", userId).gte("date", sinceStr),
    supabase.from("meetings").select("*").eq("user_id", userId).gte("date", sinceStr),
  ]);

  const logs = {};

  (logRows || []).forEach(r => {
    logs[r.date] = { wins: r.wins || "", blockers: r.blockers || "", plans: r.plans || "", mood: r.mood, tasks: [], meetings: [], decisions: [] };
  });
  (taskRows || []).forEach(r => {
    if (!logs[r.date]) logs[r.date] = { wins: "", blockers: "", plans: "", mood: null, tasks: [], meetings: [], decisions: [] };
    logs[r.date].tasks.push({ id: r.id, text: r.text, done: r.done, priority: r.priority, projectId: r.project_id || "" });
  });
  (meetingRows || []).forEach(r => {
    if (!logs[r.date]) logs[r.date] = { wins: "", blockers: "", plans: "", mood: null, tasks: [], meetings: [], decisions: [] };
    logs[r.date].meetings.push({ id: r.id, title: r.title, notes: r.notes || "", ts: r.ts });
  });

  return logs;
}

export async function updateDailyLog(userId, date, log) {
  await supabase.from("daily_logs").upsert(
    { user_id: userId, date, wins: log.wins || "", blockers: log.blockers || "", plans: log.plans || "", mood: log.mood ?? null },
    { onConflict: "user_id,date" }
  );

  // Sync tasks: delete all for this date then reinsert
  await supabase.from("daily_tasks").delete().eq("user_id", userId).eq("date", date);
  const tasks = log.tasks || [];
  if (tasks.length > 0) {
    await supabase.from("daily_tasks").insert(
      tasks.map(t => ({ id: t.id, user_id: userId, date, text: t.text, done: t.done, priority: t.priority || "medium", project_id: t.projectId || null }))
    );
  }

  // Sync meetings: delete all for this date then reinsert
  await supabase.from("meetings").delete().eq("user_id", userId).eq("date", date);
  const meetings = log.meetings || [];
  if (meetings.length > 0) {
    await supabase.from("meetings").insert(
      meetings.map(m => ({ id: m.id, user_id: userId, date, title: m.title, notes: m.notes || "", ts: m.ts }))
    );
  }
}
