-- Japan 2026 — itinerary_slots table, RLS and realtime.
--
-- Committed for the record. This is the exact SQL text of docs/API.md §3a–3c,
-- applied once via the Supabase dashboard SQL editor (see docs/DEPLOYMENT.md
-- §3). The `submitted_spots` table already exists and is out of scope here —
-- see docs/API.md §2.
--
-- Full contract (schema rationale, RLS posture, realtime config, call
-- patterns): docs/API.md §3. Storage shapes: docs/DATA_MODEL.md §6.

-- ── 3a. Schema ────────────────────────────────────────────────────────────
create table if not exists public.itinerary_slots (
  id bigint generated always as identity primary key,
  slot_key text not null unique,
  day int not null check (day between 1 and 14),
  "position" double precision not null,
  time_label text not null default '',
  slot_type text not null default 'default'
    check (slot_type in ('travel','food','culture','free','sleep','surprise','default')),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itinerary_slots_day_position
  on public.itinerary_slots (day, "position");

-- updated_at maintained server-side; the client never sends it
create extension if not exists moddatetime schema extensions;
create trigger itinerary_slots_updated_at
  before update on public.itinerary_slots
  for each row execute procedure extensions.moddatetime (updated_at);

-- ── 3b. RLS — authenticated read/write only (never public) ────────────────
alter table public.itinerary_slots enable row level security;

create policy "signed-in can read slots"
  on public.itinerary_slots for select
  to authenticated using (true);

create policy "signed-in can add slots"
  on public.itinerary_slots for insert
  to authenticated with check (true);

create policy "signed-in can edit slots"
  on public.itinerary_slots for update
  to authenticated using (true) with check (true);

create policy "signed-in can remove slots"
  on public.itinerary_slots for delete
  to authenticated using (true);

-- No anon grants of any kind — an unauthenticated request sees zero rows and
-- can write nothing. (Open mode never talks to Supabase at all.)

-- ── 3c. Realtime config ─────────────────────────────────────────────────────
alter publication supabase_realtime add table public.itinerary_slots;

-- DELETE (and UPDATE old-row) events carry only the primary key by default.
-- The client keys everything on slot_key, so ship the whole old row:
alter table public.itinerary_slots replica identity full;
