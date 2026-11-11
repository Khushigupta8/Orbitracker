-- Clients & client to-dos — run in Supabase SQL Editor (safe to re-run)
create table if not exists clients (
  id         text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  source     text not null default 'direct',
  contact    text default '',
  status     text not null default 'active',
  notes      text default '',
  color_index integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists client_tasks (
  id         text primary key,
  client_id  text not null references clients(id) on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  text       text not null,
  done       boolean not null default false,
  priority   text not null default 'medium',
  due_date   date,
  project_id text,
  created_at timestamptz default now()
);

alter table clients      enable row level security;
alter table client_tasks enable row level security;
drop policy if exists "own clients"      on clients;
drop policy if exists "own client_tasks" on client_tasks;
create policy "own clients"      on clients      for all using (auth.uid() = user_id);
create policy "own client_tasks" on client_tasks for all using (auth.uid() = user_id);
