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

- **Framework** — Next.js (App Router), React 19, Recharts
- **Backend** — Next.js Route Handlers (`app/api/*`)
- **Database & Auth** — Supabase (PostgreSQL)
- **AI** — Groq API
- **Deployment** — Vercel

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

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | console.groq.com |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |

### 4. Run locally

```bash
npm run dev
```

App and API both run at `http://localhost:3000`.

## Deployment (Vercel)

1. Push the repo to GitHub and import it at [vercel.com/new](https://vercel.com/new) (framework preset: Next.js, no config needed).
2. Add these environment variables in Project Settings → Environment Variables:
   `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy. In Supabase → Authentication → URL Configuration, add your Vercel URL to the allowed redirect URLs (needed for Google sign-in).
