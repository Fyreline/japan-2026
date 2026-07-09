-- Japan 2026 — journal_entries table + the journal-photos Storage bucket.
--
-- Committed for the record. This is the exact SQL text of docs/API.md
-- §7a–7d, applied once via the Supabase dashboard SQL editor (see
-- docs/DEPLOYMENT.md §3). Shape + photo contract: docs/DATA_MODEL.md §12.
-- This is the app's first use of Supabase Storage — the bucket + policy SQL
-- gets the same rigour as the tables. No author column of any kind, per the
-- household's no-attribution convention (docs/ARCHITECTURE.md §4.4).

-- ── 7a. Schema ────────────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id bigint generated always as identity primary key,
  entry_key text not null unique,
  entry_date date not null,
  body text not null default '',
  photo_path text,                       -- null = no photo; '{entry_key}.jpg' otherwise
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_date
  on public.journal_entries (entry_date, created_at);

create trigger journal_entries_updated_at
  before update on public.journal_entries
  for each row execute procedure extensions.moddatetime (updated_at);

-- ── 7b. RLS + realtime ──────────────────────────────────────────────────
alter table public.journal_entries enable row level security;

create policy "signed-in can read journal"
  on public.journal_entries for select
  to authenticated using (true);

create policy "signed-in can add journal"
  on public.journal_entries for insert
  to authenticated with check (true);

create policy "signed-in can edit journal"
  on public.journal_entries for update
  to authenticated using (true) with check (true);

create policy "signed-in can remove journal"
  on public.journal_entries for delete
  to authenticated using (true);

alter publication supabase_realtime add table public.journal_entries;
alter table public.journal_entries replica identity full;

-- ── 7c. Bucket ────────────────────────────────────────────────────────────
-- Private bucket; 5 MB cap is generous headroom over the ~400 KB the client
-- compression contract produces (DATA_MODEL.md §12d). Idempotent.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-photos', 'journal-photos', false, 5242880,
        array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- ── 7d. Storage policies ──────────────────────────────────────────────────
-- storage.objects already has RLS enabled by Supabase; these policies open
-- exactly one bucket to exactly the authenticated role — the table posture,
-- mirrored.
create policy "signed-in can read journal photos"
  on storage.objects for select
  to authenticated using (bucket_id = 'journal-photos');

create policy "signed-in can add journal photos"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'journal-photos');

create policy "signed-in can replace journal photos"
  on storage.objects for update
  to authenticated using (bucket_id = 'journal-photos')
  with check (bucket_id = 'journal-photos');

create policy "signed-in can remove journal photos"
  on storage.objects for delete
  to authenticated using (bucket_id = 'journal-photos');

-- Verify after applying: an unauthenticated fetch of
-- /storage/v1/object/journal-photos/<anything> returns an error object, and
-- createSignedUrl works only with a session.
