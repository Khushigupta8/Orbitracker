# Orbit

A personal productivity dashboard to manage your habits, projects, expenses, and daily life — all in one place.

## Features

- **Today** — Track daily habits with streaks, set your mood, and manage one-off tasks with priority and project linking
- **Projects** — Full project management with SDLC stages, progress tracking, milestones, priorities, and developer assignment
- **Sprints** — Kanban board (Backlog / In Progress / Done) for agile task management
- **Wishes** — Bucket list for travel, experiences, skills, goals, shopping, and more
- **Expenses** — Income, expense, and savings tracker with budgets and category breakdowns (INR)
- **Log** — Daily standup journal with wins, blockers, plans, meetings, and decisions
- **Charts** — Visual analytics with area charts, bar charts, and pie charts across all data
- **AI Chat** — Built-in AI assistant with full context of your habits, projects, finances, and daily log

## Tech Stack

- **Frontend** — React 18, Vite, Recharts
- **Backend** — Node.js, Express
- **Database & Auth** — Supabase (PostgreSQL)
- **AI** — Groq API
- **Deployment** — Render

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Khushigupta8/Orbitracker.git
cd Orbitracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | console.groq.com |
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

### 4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:5173` (frontend) and `http://localhost:3001` (API).

## Deployment

Deployed on [Render](https://render.com) as a single Node.js web service.

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`

Set all environment variables from `.env` in the Render dashboard before deploying.
