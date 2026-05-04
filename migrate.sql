-- Run this in Supabase SQL Editor to apply the new additions
-- Safe to re-run

-- 1. Add theme preference to profiles
alter table profiles add column if not exists theme jsonb;

-- 2. Chat message history table
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

create index if not exists chat_messages_user_created_idx
  on chat_messages(user_id, created_at desc);

-- 3. Row level security
alter table chat_messages enable row level security;

drop policy if exists "own chat_messages" on chat_messages;
create policy "own chat_messages" on chat_messages
  for all using (auth.uid() = user_id);
