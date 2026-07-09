-- Japan 2026 — visited_marks table, RLS and realtime.
--
-- Committed for the record. This is the exact SQL text of docs/API.md §5a,
-- applied once via the Supabase dashboard SQL editor (see docs/DEPLOYMENT.md
-- §3). Key design: docs/DATA_MODEL.md §10.

create table if not exists public.visited_marks (
  id bigint generated always as identity primary key,
  item_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.visited_marks enable row level security;

create policy "signed-in can read visits"
  on public.visited_marks for select
  to authenticated using (true);

create policy "signed-in can add visits"
  on public.visited_marks for insert
  to authenticated with check (true);

create policy "signed-in can remove visits"
  on public.visited_marks for delete
  to authenticated using (true);

-- Deliberately NO update policy: a mark is inserted or deleted, never edited.

alter publication supabase_realtime add table public.visited_marks;
alter table public.visited_marks replica identity full;   -- DELETEs must carry item_key
