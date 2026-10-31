create table if not exists public.cricket_draft_state (
 id int primary key check (id = 1),
 state jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.cricket_draft_state enable row level security;
revoke all on public.cricket_draft_state from anon, authenticated;
-- Edge Function service role only.