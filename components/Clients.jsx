"use client";

import { useState } from "react";

const CCOLS = ["#7B9ED9", "#D4537E", "#D4A054", "#6BAA84", "#9B8EC4", "#E8824A", "#56B4D3"];
const SOURCES = { fiverr: "Fiverr", upwork: "Upwork", direct: "Direct", referral: "Referral", other: "Other" };
const STATUSES = {
  active:  { label: "active",  color: "#6BAA84" },
  waiting: { label: "waiting on client", color: "#D4A054" },
  paused:  { label: "paused",  color: "#9ca3af" },
  done:    { label: "done",    color: "#7B9ED9" },
};
const PRIO = { high: { label: "high", color: "#D4537E", rank: 0 }, medium: { label: "med", color: "#D4A054", rank: 1 }, low: { label: "low", color: "#9ca3af", rank: 2 } };

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayDiff = d => d ? Math.round((new Date(d + "T00:00:00") - new Date(localToday() + "T00:00:00")) / 86400000) : null;
const fmt = d => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const BLANK_C = { name: "", source: "fiverr", contact: "", status: "active", notes: "", ci: 0 };
const BLANK_T = { text: "", priority: "medium", dueDate: "", projectId: "" };

function dueLabel(t) {
  const n = dayDiff(t.dueDate);
  if (n == null) return null;
  if (t.done) return { text: fmt(t.dueDate), color: "var(--text-muted)" };
  if (n < 0) return { text: `${fmt(t.dueDate)} · ${-n}d overdue`, color: "#D4537E" };
  if (n === 0) return { text: "due today", color: "#D4A054" };
  if (n === 1) return { text: "due tomorrow", color: "#D4A054" };
  return { text: `${fmt(t.dueDate)} · ${n}d`, color: "var(--text-muted)" };
}

// Open tasks first, then by due date (no date last), then priority
const sortTasks = tasks => [...tasks].sort((a, b) =>
  (a.done - b.done) ||
  ((a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : (a.dueDate || "9999") > (b.dueDate || "9999") ? 1 : 0) ||
  (PRIO[a.priority].rank - PRIO[b.priority].rank));

export default function Clients({ clients, projects, onSave, adding, setAdding }) {
  const [filter, setFilter] = useState("open");        // open | all | done
  const [cf, setCf] = useState({ ...BLANK_C });
  const [editId, setEditId] = useState(null);
  const [drafts, setDrafts] = useState({});            // clientId -> new task draft
  const [expanded, setExpanded] = useState({});         // clientId -> show completed

  const today = localToday();
  const openTasks = clients.flatMap(c => c.tasks.filter(t => !t.done).map(t => ({ ...t, client: c })));
  const overdue = openTasks.filter(t => t.dueDate && t.dueDate < today);
  const dueToday = openTasks.filter(t => t.dueDate === today);
  const dueWeek = openTasks.filter(t => t.dueDate && t.dueDate > today && dayDiff(t.dueDate) <= 7);

  const updateClient = (id, fn) => onSave(clients.map(c => c.id === id ? fn(c) : c));
  const toggleTask = (cid, tid) => updateClient(cid, c => ({ ...c, tasks: c.tasks.map(t => t.id === tid ? { ...t, done: !t.done } : t) }));
  const delTask = (cid, tid) => updateClient(cid, c => ({ ...c, tasks: c.tasks.filter(t => t.id !== tid) }));
  const addTask = cid => {
    const d = drafts[cid] || BLANK_T;
    if (!d.text.trim()) return;
    updateClient(cid, c => ({ ...c, tasks: [...c.tasks, { id: uid("ct"), text: d.text.trim(), done: false, priority: d.priority, dueDate: d.dueDate, projectId: d.projectId }] }));
    setDrafts(x => ({ ...x, [cid]: { ...BLANK_T, priority: d.priority } }));
  };
  const setDraft = (cid, patch) => setDrafts(x => ({ ...x, [cid]: { ...BLANK_T, ...(x[cid] || {}), ...patch } }));

  const openEdit = c => { setEditId(c.id); setCf({ name: c.name, source: c.source, contact: c.contact, status: c.status, notes: c.notes, ci: c.ci }); setAdding(true); };
  const cancel = () => { setAdding(false); setEditId(null); setCf({ ...BLANK_C }); };
  const submit = () => {
    if (!cf.name.trim()) return;
    if (editId) onSave(clients.map(c => c.id === editId ? { ...c, ...cf, name: cf.name.trim() } : c));
    else onSave([...clients, { ...cf, name: cf.name.trim(), id: uid("c"), ci: clients.length % CCOLS.length, tasks: [] }]);
    cancel();
  };
  const delClient = c => {
    if (window.confirm(`Delete ${c.name} and its ${c.tasks.length} to-do(s)?`)) onSave(clients.filter(x => x.id !== c.id));
  };

  const shown = clients.filter(c =>
    filter === "all" ? true : filter === "done" ? c.status === "done" : c.status !== "done");

  const summary = [
    { k: "overdue", label: "overdue", list: overdue, color: "#D4537E" },
    { k: "today", label: "due today", list: dueToday, color: "#D4A054" },
    { k: "week", label: "next 7 days", list: dueWeek, color: "#7B9ED9" },
    { k: "open", label: "open to-dos", list: openTasks, color: "#6BAA84" },
  ];
  const urgent = [...overdue, ...dueToday].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Summary across all clients */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {summary.map(s => (
          <div key={s.k} className="form-card" style={{ borderLeftColor: s.color, padding: "0.8rem 1rem", gap: 2 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.list.length}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {urgent.length > 0 && (
        <div className="form-card" style={{ borderLeftColor: "#D4537E", gap: 6 }}>
          <p className="form-title">needs attention</p>
          {urgent.map(t => {
            const dl = dueLabel(t);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={false} onChange={() => toggleTask(t.client.id, t.id)} />
                <span style={{ flex: 1 }}>{t.text}</span>
                <span className="mini-pill" style={{ background: CCOLS[t.client.ci % CCOLS.length] + "22", color: CCOLS[t.client.ci % CCOLS.length] }}>{t.client.name}</span>
                <span style={{ fontSize: 11, color: dl.color }}>{dl.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit client */}
      {adding && (
        <div className="form-card" style={{ borderLeftColor: CCOLS[cf.ci % CCOLS.length] }}>
          <p className="form-title">{editId ? "edit client" : "new client"}</p>
          <div className="form-grid">
            <input placeholder="Client name" value={cf.name} onChange={e => setCf(f => ({ ...f, name: e.target.value }))} style={{ gridColumn: "1/-1" }} autoFocus />
            <select value={cf.source} onChange={e => setCf(f => ({ ...f, source: e.target.value }))}>
              {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={cf.status} onChange={e => setCf(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input placeholder="Contact / username / email" value={cf.contact} onChange={e => setCf(f => ({ ...f, contact: e.target.value }))} style={{ gridColumn: "1/-1" }} />
          </div>
          <textarea placeholder="Notes — scope, rates, timezone, links…" value={cf.notes} onChange={e => setCf(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 60 }} />
          <div style={{ display: "flex", gap: 6 }}>
            {CCOLS.map((c, i) => (
              <button key={c} type="button" aria-label={"colour " + (i + 1)} onClick={() => setCf(f => ({ ...f, ci: i }))}
                style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: cf.ci === i ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={cancel} className="ghost-btn">cancel</button>
            <button onClick={submit} className="save-btn" style={{ background: CCOLS[cf.ci % CCOLS.length] }}>{editId ? "update" : "save"}</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6 }}>
        {[["open", "active clients"], ["done", "completed"], ["all", "all"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className="ghost-btn"
            style={filter === k ? { fontWeight: 700, color: "var(--text-primary)", borderColor: "var(--text-secondary)" } : {}}>{l}</button>
        ))}
      </div>

      {shown.length === 0 && !adding && (
        <p className="empty-state">{clients.length === 0 ? "no clients yet — add your first client, then give them a to-do list" : "no clients in this view"}</p>
      )}

      {/* Client cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14, alignItems: "start" }}>
        {shown.map(c => {
          const color = CCOLS[c.ci % CCOLS.length];
          const st = STATUSES[c.status] || STATUSES.active;
          const open = c.tasks.filter(t => !t.done);
          const doneTasks = c.tasks.filter(t => t.done);
          const pct = c.tasks.length ? Math.round(doneTasks.length / c.tasks.length * 100) : 0;
          const draft = drafts[c.id] || BLANK_T;
          const list = sortTasks(expanded[c.id] ? c.tasks : open);
          return (
            <div key={c.id} className="form-card" style={{ borderLeftColor: color, borderLeftWidth: 4, gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                    {SOURCES[c.source] || c.source}{c.contact ? ` · ${c.contact}` : ""}
                  </p>
                </div>
                <span className="mini-pill" style={{ background: st.color + "22", color: st.color }}>{st.label}</span>
              </div>
              {c.notes && <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{c.notes}</p>}

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(128,128,128,0.18)" }}>
                  <div style={{ width: pct + "%", height: "100%", borderRadius: 3, background: color, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{doneTasks.length}/{c.tasks.length}</span>
              </div>

              {/* To-do list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {list.length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{c.tasks.length ? "all caught up 🎉" : "no to-dos yet"}</p>}
                {list.map(t => {
                  const dl = dueLabel(t);
                  const proj = projects.find(p => p.id === t.projectId);
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "3px 0" }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(c.id, t.id)} style={{ accentColor: color }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIO[t.priority].color, flexShrink: 0 }} title={t.priority + " priority"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.55 : 1 }}>{t.text}</span>
                        {(dl || proj) && (
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                            {dl && <span style={{ color: dl.color }}>{dl.text}</span>}
                            {dl && proj && " · "}
                            {proj && <span>{proj.name}</span>}
                          </div>
                        )}
                      </div>
                      <button onClick={() => delTask(c.id, t.id)} className="ghost-btn danger" style={{ fontSize: 11, padding: "0 6px" }} aria-label="delete to-do">✕</button>
                    </div>
                  );
                })}
                {doneTasks.length > 0 && (
                  <button onClick={() => setExpanded(x => ({ ...x, [c.id]: !x[c.id] }))} className="ghost-btn" style={{ fontSize: 11, alignSelf: "flex-start" }}>
                    {expanded[c.id] ? "hide completed" : `show ${doneTasks.length} completed`}
                  </button>
                )}
              </div>

              {/* Add to-do */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input placeholder="+ add a to-do for this client…" value={draft.text}
                  onChange={e => setDraft(c.id, { text: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") addTask(c.id); }} />
                {draft.text.trim() && (
                  <div className="form-row">
                    <select value={draft.priority} onChange={e => setDraft(c.id, { priority: e.target.value })}>
                      {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v.label} priority</option>)}
                    </select>
                    <input type="date" value={draft.dueDate} onChange={e => setDraft(c.id, { dueDate: e.target.value })} />
                    {projects.length > 0 && (
                      <select value={draft.projectId} onChange={e => setDraft(c.id, { projectId: e.target.value })}>
                        <option value="">no project</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => addTask(c.id)} className="save-btn" style={{ background: color }}>add</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(c)} className="ghost-btn" style={{ fontSize: 11 }}>edit</button>
                <button onClick={() => delClient(c)} className="ghost-btn danger" style={{ fontSize: 11 }}>delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
