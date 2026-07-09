-- Japan 2026 — packing_items table, RLS and realtime.
--
-- Committed for the record. This is the exact SQL text of docs/API.md
-- §6a–6b, applied once via the Supabase dashboard SQL editor (see
-- docs/DEPLOYMENT.md §3). Shape + seed: docs/DATA_MODEL.md §11. Structurally
-- a simpler itinerary_slots — same key, ordering, trigger and realtime
-- machinery (0001_itinerary_slots.sql).

-- ── 6a. Schema ────────────────────────────────────────────────────────────
create table if not exists public.packing_items (
  id bigint generated always as identity primary key,
  item_key text not null unique,
  category text not null default 'other'
    check (category in ('documents','electronics','clothing','health','other')),
  label text not null default '',
  checked boolean not null default false,
  "position" double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists packing_items_category_position
  on public.packing_items (category, "position");

-- same moddatetime pattern as itinerary_slots — the extension already exists
create trigger packing_items_updated_at
  before update on public.packing_items
  for each row execute procedure extensions.moddatetime (updated_at);

-- ── 6b. RLS + realtime ──────────────────────────────────────────────────
alter table public.packing_items enable row level security;

create policy "signed-in can read packing"
  on public.packing_items for select
  to authenticated using (true);

create policy "signed-in can add packing"
  on public.packing_items for insert
  to authenticated with check (true);

create policy "signed-in can edit packing"
  on public.packing_items for update
  to authenticated using (true) with check (true);

create policy "signed-in can remove packing"
  on public.packing_items for delete
  to authenticated using (true);

alter publication supabase_realtime add table public.packing_items;
alter table public.packing_items replica identity full;
