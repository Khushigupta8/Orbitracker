-- ============================================================
-- Orbit — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New Query
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text not null default 'User',
  theme      jsonb,
  created_at timestamptz default now()
);
alter table profiles add column if not exists theme jsonb;

-- Habits
create table if not exists habits (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  category   text not null default 'personal',
  start_time text not null default '09:00',
  end_time   text not null default '10:00',
  days       integer[] not null default '{}',
  created_at timestamptz default now()
);

-- Habit completions (one row per habit per day completed)
create table if not exists habit_completions (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  habit_id text not null references habits(id) on delete cascade,
  date     date not null,
  unique(user_id, habit_id, date)
);

-- Projects
create table if not exists projects (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text default '',
  status      text not null default 'on-track',
  priority    text not null default 'medium',
  progress    integer not null default 0,
  due_date    date,
  stage       text not null default 'planning',
  color_index integer not null default 0,
  developer   text not null default '',
  created_at  timestamptz default now()
);

-- Project milestones
create table if not exists milestones (
  id         text primary key,
  project_id text not null references projects(id) on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  text       text not null,
  done       boolean not null default false
);

-- Sprints
create table if not exists sprints (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  goal       text default '',
  start_date date not null,
  end_date   date,
  completed  boolean not null default false,
  created_at timestamptz default now()
);

-- Sprint items (kanban tasks within a sprint)
create table if not exists sprint_items (
  id         text primary key,
  sprint_id  text not null references sprints(id) on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  text       text not null,
  project_id text references projects(id) on delete set null,
  status     text not null default 'backlog'
);

-- Wishes / bucket list
create table if not exists wishes (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  type        text not null default 'dream',
  category    text not null default 'goal',
  priority    text not null default 'want',
  notes       text default '',
  target_date date,
  price       numeric,
  done        boolean not null default false,
  created_at  timestamptz default now()
);

-- Daily logs (one row per user per day)
create table if not exists daily_logs (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users on delete cascade,
  date     date not null,
  wins     text default '',
  blockers text default '',
  plans    text default '',
  mood     integer,
  unique(user_id, date)
);

-- Daily tasks (linked to a date, not a log id)
create table if not exists daily_tasks (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  text       text not null,
  done       boolean not null default false,
  priority   text not null default 'medium',
  project_id text references projects(id) on delete set null
);

-- Meeting notes (linked to a date)
create table if not exists meetings (
  id      text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date    date not null,
  title   text not null,
  notes   text default '',
  ts      timestamptz not null default now()
);

-- Expenses, income & savings
create table if not exists expenses (
  id             text primary key,
  user_id        uuid not null references auth.users on delete cascade,
  amount         numeric not null,
  type           text not null default 'expense' check (type in ('expense','income','savings')),
  category       text not null default 'other',
  note           text default '',
  payment_method text not null default 'cash',
  date           date not null,
  created_at     timestamptz default now()
);
create index if not exists expenses_user_date_idx on expenses(user_id, date desc);

-- Migration: ensure existing tables allow the 'savings' type
alter table expenses drop constraint if exists expenses_type_check;
alter table expenses add  constraint expenses_type_check check (type in ('expense','income','savings'));

-- Monthly budgets per category
create table if not exists budgets (
  id            text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  category      text not null,
  monthly_limit numeric not null default 0,
  created_at    timestamptz default now(),
  unique (user_id, category)
);

-- Chat message history
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);
create index if not exists chat_messages_user_created_idx on chat_messages(user_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table profiles         enable row level security;
alter table habits           enable row level security;
alter table habit_completions enable row level security;
alter table projects         enable row level security;
alter table milestones       enable row level security;
alter table sprints          enable row level security;
alter table sprint_items     enable row level security;
alter table wishes           enable row level security;
alter table daily_logs       enable row level security;
alter table daily_tasks      enable row level security;
alter table meetings         enable row level security;
alter table expenses         enable row level security;
alter table budgets          enable row level security;
alter table chat_messages    enable row level security;

-- Each user can only read/write their own rows
-- Drops first so the script is safely re-runnable (CREATE POLICY has no IF NOT EXISTS)
drop policy if exists "own profiles"          on profiles;
drop policy if exists "own habits"            on habits;
drop policy if exists "own habit_completions" on habit_completions;
drop policy if exists "own projects"          on projects;
drop policy if exists "own milestones"        on milestones;
drop policy if exists "own sprints"           on sprints;
drop policy if exists "own sprint_items"      on sprint_items;
drop policy if exists "own wishes"            on wishes;
drop policy if exists "own daily_logs"        on daily_logs;
drop policy if exists "own daily_tasks"       on daily_tasks;
drop policy if exists "own meetings"          on meetings;
drop policy if exists "own expenses"          on expenses;
drop policy if exists "own budgets"           on budgets;
drop policy if exists "own chat_messages"     on chat_messages;

create policy "own profiles"          on profiles          for all using (auth.uid() = id);
create policy "own habits"            on habits            for all using (auth.uid() = user_id);
create policy "own habit_completions" on habit_completions for all using (auth.uid() = user_id);
create policy "own projects"          on projects          for all using (auth.uid() = user_id);
create policy "own milestones"        on milestones        for all using (auth.uid() = user_id);
create policy "own sprints"           on sprints           for all using (auth.uid() = user_id);
create policy "own sprint_items"      on sprint_items      for all using (auth.uid() = user_id);
create policy "own wishes"            on wishes            for all using (auth.uid() = user_id);
create policy "own daily_logs"        on daily_logs        for all using (auth.uid() = user_id);
create policy "own daily_tasks"       on daily_tasks       for all using (auth.uid() = user_id);
create policy "own meetings"          on meetings          for all using (auth.uid() = user_id);
create policy "own expenses"          on expenses          for all using (auth.uid() = user_id);
create policy "own budgets"           on budgets           for all using (auth.uid() = user_id);
create policy "own chat_messages"     on chat_messages     for all using (auth.uid() = user_id);

-- ── Auto-create profile on signup ────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'User')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
