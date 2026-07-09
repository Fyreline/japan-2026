# Japan 2026 — Supabase Surface

There is exactly one REST endpoint of ours — the §9 login proxy, used at the sign-in moment and never again — and everything else is the SPA talking to Supabase directly through `@supabase/supabase-js` v2. This doc is the complete contract for that surface: client init, the Auth calls, every table's SQL (schema + RLS + realtime), the journal photo bucket + its storage policies, the exact TypeScript call patterns the hooks implement — plus the one non-Supabase call in the app, the keyless Open-Meteo fetch (§8), and the login proxy's contract (§9). Implement the data hooks against this doc and update it in the same commit as any change. Storage rationale: [DATA_MODEL.md](DATA_MODEL.md); flow diagrams: [ARCHITECTURE.md](ARCHITECTURE.md) §5–7, §13–19, §20.

**Status:** §1–§3 are live (tables `submitted_spots` + `itinerary_slots`, shipped). §5–§8 are the **feature extension** — three new tables, the first Storage bucket, and the weather call ([PLAN.md](PLAN.md) Phases 7–13). Each new table's SQL is applied once via the dashboard SQL editor and committed under `supabase/migrations/` (DEPLOYMENT.md §3a). §9 (and the §1 sign-in change it implies) is the **shared-login extension** ([PLAN.md](PLAN.md) Phase 14, design in [AUTH.md](AUTH.md)).

---

## 0. Conventions

### 0a. Client init (`lib/supabase.ts`)

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** null = OPEN MODE: no gate, localStorage only, no realtime.
 *  Every consumer must handle the null. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null
```

- Defaults are correct and must not be overridden: `persistSession: true` (localStorage), `autoRefreshToken: true`, `detectSessionInUrl: true`. **No manual token machinery** — supabase-js owns refresh/persistence (this is the deliberate difference from MishkaHub's hand-rolled `auth.ts`; see ARCHITECTURE.md §5).
- The anon key is a public, RLS-guarded `sb_publishable_` key. It ships in the built bundle by design. The `service_role` key must never appear in `apps/web`, any `VITE_*` env var (those are baked into the public bundle), git history, or Actions variables — the one place it lives outside the dashboard is the login proxy's gitignored `apps/server/.env` on the household Mac (§9, [AUTH.md](AUTH.md) §4).
- Error convention: every `{ data, error }` return is checked; mutations surface failures as the quiet inline notes specced in [DESIGN.md](DESIGN.md) §6.6 and **never lose the optimistic local write** (localStorage keeps it).

### 0b. Table & bucket names

Table names are string constants in one place (`lib/supabase.ts`):

```ts
export const TABLES = {
  spots: 'submitted_spots',
  slots: 'itinerary_slots',
  visited: 'visited_marks',     // §5
  packing: 'packing_items',     // §6
  journal: 'journal_entries',   // §7
} as const

export const BUCKETS = {
  journalPhotos: 'journal-photos',  // §7c
} as const
```

The old `config.js` `SUPABASE_TABLE` indirection retires.

## 1. Auth

Two fixed users, created manually in the dashboard (auto-confirmed), public signups disabled — there is no registration surface anywhere. Setup walkthrough: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md).

**Changed by the shared-login extension (§9, [AUTH.md](AUTH.md)):** the frontend no longer calls `signInWithPassword` — the LoginScreen submit now POSTs to Japan's own login proxy (which verifies the credentials against Mishka Hub and mints a genuine Supabase session), then adopts that session with `setSession()`. **That is the entire change.** `getSession`, `onAuthStateChange`, `signOut`, session persistence and token auto-refresh are exactly as shipped — supabase-js still owns all of it, none of it needs touching, and nothing else in this doc's Supabase surface moves.

### 1a. Calls (`useAuth.ts`)

```ts
// initial session (page load) — resolves from localStorage, no network round-trip needed
// UNCHANGED by §9
const { data: { session } } = await supabase.auth.getSession()

// every later transition (sign-in, sign-out, token refresh, revocation)
// UNCHANGED by §9
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => setSession(session),
)
// cleanup on unmount: subscription.unsubscribe()

// sign in (LoginScreen submit) — REPLACED by §9: credentials go to Japan's
// login proxy, which verifies them against Mishka Hub and returns a genuine
// Supabase session pair; the SPA adopts it. AUTH_API_BASE defaults to the
// production tunnel hostname; .env.local overrides it for local dev (§9).
const AUTH_API_BASE =
  import.meta.env.VITE_AUTH_API_BASE ?? 'https://japan-api.mishka-hub.com'

const res = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email.trim(), password }),
})
if (!res.ok) {
  const body = await res.json().catch(() => null)
  // body?.detail → shown verbatim in the form's text-fig error line
  // (fetch/network failure → the §9a 503 copy, hardcoded as the fallback line)
}
const { access_token, refresh_token } = await res.json()
const { error } = await supabase.auth.setSession({ access_token, refresh_token })
// from here it is a completely normal Supabase session — persisted and
// auto-refreshed by supabase-js with zero further involvement from the proxy

// sign out (header button) — UNCHANGED by §9: onAuthStateChange re-raises the gate
await supabase.auth.signOut()
```

### 1b. Hook contract

```ts
type AuthState =
  | { status: 'open' }                          // supabase === null
  | { status: 'loading' }                       // getSession in flight
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

function useAuth(): AuthState & {
  signIn(email: string, password: string): Promise<{ error: string | null }>
  signOut(): Promise<void>
}
```

`App.tsx` renders: `open`/`signedIn` → the app shell; `signedOut` → `<LoginScreen/>`; `loading` → nothing but the paper background (no flash of gate or content). Data hooks read the same state and only touch Supabase when `signedIn`.

## 2. `submitted_spots` (existing — do not alter)

Live table with real rows. Restated from the original setup SQL for the record:

### 2a. Schema + RLS + realtime (already applied)

```sql
create table if not exists public.submitted_spots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  client_submission_key text,
  category text,
  name text,
  sub_category text,
  cost_tier int,
  city text,
  suburb text,
  speciality text,
  description text,
  google_maps_link text,
  approx_wait text,
  booking_requirement text,
  lat double precision,
  lng double precision
);

alter table public.submitted_spots enable row level security;

create policy "signed-in can read spots"
  on public.submitted_spots for select
  to authenticated using (true);

create policy "signed-in can add spots"
  on public.submitted_spots for insert
  to authenticated with check (true);

alter publication supabase_realtime add table public.submitted_spots;
```

Notes: **read + insert only, `authenticated` role only** — there are deliberately no UPDATE/DELETE policies (spots are append-only from the app's point of view; cleanup happens in the dashboard SQL editor). The rebuild preserves this exactly.

### 2b. Call patterns (`useSubmittedSpots.ts`)

```ts
// load once per signed-in session
const { data, error } = await supabase
  .from('submitted_spots')
  .select('*')
  .order('created_at', { ascending: true })
// data.forEach(row => apply(rowToSubmissionEntry(row)))  — dedup via seen-keys Set

// live inserts from the other phone
const channel = supabase
  .channel('submitted-spots-realtime')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'submitted_spots' },
    (payload) => apply(rowToSubmissionEntry(payload.new)),
  )
  .subscribe()
// cleanup: supabase.removeChannel(channel)

// write (SubmitForm) — optimistic local apply happens first, regardless
const { error } = await supabase
  .from('submitted_spots')
  .insert(submissionToRow(entry, payload))   // DATA_MODEL.md §7b
```

Channel name, event scope (INSERT only) and the dedup-by-`client_submission_key` behaviour are ports of the current implementation.

## 3. `itinerary_slots` (new)

The collaborative itinerary store. Same authenticated-only RLS posture as `submitted_spots`, but with the full CRUD set — slots are edited, moved and deleted, not just appended. This SQL is applied once via the dashboard SQL editor ([DEPLOYMENT.md](DEPLOYMENT.md) §3) and committed as `supabase/migrations/0001_itinerary_slots.sql`.

### 3a. Schema

```sql
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
```

### 3b. RLS — authenticated read/write only (never public)

```sql
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
```

No `anon` grants of any kind — an unauthenticated request sees zero rows and can write nothing. (Open mode never talks to Supabase at all.)

### 3c. Realtime config

```sql
alter publication supabase_realtime add table public.itinerary_slots;

-- DELETE (and UPDATE old-row) events carry only the primary key by default.
-- The client keys everything on slot_key, so ship the whole old row:
alter table public.itinerary_slots replica identity full;
```

The `replica identity full` line is load-bearing: without it, a realtime DELETE payload contains only `{ id }` and the other phone cannot tell which slot to drop.

### 3d. Call patterns (`useItinerary.ts`)

```ts
// ── load (once per signed-in session) ───────────────────────────────
const { data, error } = await supabase
  .from('itinerary_slots')
  .select('*')
  .order('day', { ascending: true })
  .order('position', { ascending: true })

// ── seed (only when the load returned zero rows) ────────────────────
// Race-proof: slot_key unique + ignoreDuplicates means two first-loads
// can both run this; exactly one set of rows results, no errors thrown.
const { error } = await supabase
  .from('itinerary_slots')
  .upsert(ITINERARY_SEED.map(slotToRow), {
    onConflict: 'slot_key',
    ignoreDuplicates: true,
  })

// ── edit text / time / type (blur or 600 ms debounce) ───────────────
const { error } = await supabase
  .from('itinerary_slots')
  .update({ content, time_label, slot_type })   // send only changed columns
  .eq('slot_key', slotKey)

// ── reorder (dnd-kit onDragEnd) — exactly ONE row per drag ──────────
const { error } = await supabase
  .from('itinerary_slots')
  .update({ position: midpoint })               // DATA_MODEL.md §6c
  .eq('slot_key', slotKey)

// ── add ─────────────────────────────────────────────────────────────
const { error } = await supabase
  .from('itinerary_slots')
  .insert(slotToRow(newSlot))                   // fresh slot_key, midpoint/end position

// ── remove ──────────────────────────────────────────────────────────
const { error } = await supabase
  .from('itinerary_slots')
  .delete()
  .eq('slot_key', slotKey)

// ── live sync from the other phone ──────────────────────────────────
const channel = supabase
  .channel('itinerary-slots-realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'itinerary_slots' },
    (payload) => {
      if (payload.eventType === 'DELETE') {
        dropSlot((payload.old as SlotRow).slot_key)      // needs §3c replica identity
      } else {
        upsertSlot(rowToSlot(payload.new as SlotRow))    // INSERT and UPDATE
      }
      // own echoes are harmless: applying identical state is a no-op
    },
  )
  .subscribe()
// cleanup: supabase.removeChannel(channel)
```

Every successful load/mutation also refreshes the `japan2026ItinerarySlots` localStorage snapshot (DATA_MODEL.md §8); every failed mutation keeps the optimistic local state and shows the inline sync note.

### 3e. Renumber pass (rare)

When a drag's midpoint would land within `1e-6` of a neighbour, rewrite that day's lattice in one round trip:

```ts
const rows = daySlots.map((s, i) => ({ slot_key: s.slotKey, position: (i + 1) * 10 }))
// one upsert, onConflict slot_key — realtime delivers one frame per row,
// all of which the other phone applies idempotently
const { error } = await supabase
  .from('itinerary_slots')
  .upsert(rows.map(r => ({ ...slotToRow(lookup(r.slot_key)), position: r.position })), {
    onConflict: 'slot_key',
  })
```

## 4. Security summary

| Concern | Answer |
|---|---|
| Who can read/write any table? | Only the two `authenticated` users. RLS on every table; no `anon` policies exist. |
| Is the anon key in a public repo/bundle a problem? | No — it is designed to be public (`sb_publishable_`), and grants nothing without a session. Documented in SUPABASE_SETUP.md. |
| Registration? | Disabled in the dashboard (Auth → Providers → Email → "Allow new users to sign up" OFF). Two accounts, ever. |
| service_role key | Never in git history, never in Actions, never in `apps/web` or the built bundle. Its one home outside the dashboard is the login proxy's gitignored `apps/server/.env` on the household Mac — server-side only, never logged, placeholders only in every committed file (§9, [AUTH.md](AUTH.md) §4). |
| Realtime | Every synced table is in the `supabase_realtime` publication; RLS applies to realtime too (Supabase enforces policies on `postgres_changes` for the subscribing user's JWT). |
| The 22 Sep secret | Not a database concern: the seed text is generic by rule (DATA_MODEL.md §6b). Anything more specific only ever exists as live row content typed by a traveller, behind the gate. |
| The extension tables (§5–§7) | Same posture exactly: `authenticated`-only policies, zero `anon` grants. `visited_marks` deliberately has no UPDATE policy (presence-only); `packing_items` and `journal_entries` carry the full CRUD set like `itinerary_slots`. |
| Journal photos (§7c–7d) | Private bucket; four `storage.objects` policies scoped to `bucket_id = 'journal-photos'`, `authenticated` only. Reads happen via short-lived signed URLs; an anonymous request to an object path gets an error, not an image. No per-user attribution in paths or metadata. |
| Open-Meteo (§8) | The app's only third-party API call. Keyless by design — nothing to leak. The request carries only a public city's coordinates: no auth header, no cookies, no personal data. |

## 5. `visited_marks` (extension) — presence-only toggle store

Key design: [DATA_MODEL.md](DATA_MODEL.md) §10. Committed as `supabase/migrations/0002_visited_marks.sql`.

### 5a. Schema + RLS + realtime

```sql
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
```

### 5b. Call patterns (`useVisited.ts`)

```ts
// load (once per signed-in session) — the whole set is a few hundred strings
const { data, error } = await supabase
  .from(TABLES.visited)
  .select('item_key')

// mark — the DATA_MODEL.md §6f idempotent-upsert trick: both phones marking
// the same card in the same second produce one row and zero errors
const { error } = await supabase
  .from(TABLES.visited)
  .upsert({ item_key: itemKey }, { onConflict: 'item_key', ignoreDuplicates: true })

// unmark
const { error } = await supabase
  .from(TABLES.visited)
  .delete()
  .eq('item_key', itemKey)

// live sync — INSERT adds to the set, DELETE drops (needs replica identity full)
const channel = supabase
  .channel('visited-marks-realtime')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: TABLES.visited },
    (payload) => {
      if (payload.eventType === 'DELETE') {
        drop((payload.old as { item_key: string }).item_key)
      } else {
        add((payload.new as { item_key: string }).item_key)
      }
    },
  )
  .subscribe()
```

Optimistic flip + `japan2026VisitedMarks` snapshot + quiet inline failure note — the standard mutation discipline.

### 5c. Housekeeping

```sql
-- orphaned marks (a curated place was renamed in its JSON — DATA_MODEL.md §10a):
-- harmless; list and prune by eye in the SQL editor when curious
select item_key, created_at from public.visited_marks order by created_at;
```

## 6. `packing_items` (extension) — full-CRUD checklist

Shape + seed: [DATA_MODEL.md](DATA_MODEL.md) §11. Committed as `supabase/migrations/0003_packing_items.sql`. Structurally a simpler `itinerary_slots` — same key, ordering, trigger and realtime machinery.

### 6a. Schema

```sql
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

-- same moddatetime pattern as itinerary_slots (§3a); the extension already exists
create trigger packing_items_updated_at
  before update on public.packing_items
  for each row execute procedure extensions.moddatetime (updated_at);
```

### 6b. RLS + realtime

```sql
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
```

### 6c. Call patterns (`usePacking.ts`)

```ts
// load
const { data, error } = await supabase
  .from(TABLES.packing)
  .select('*')
  .order('category', { ascending: true })
  .order('position', { ascending: true })

// seed (only when the load returned zero rows) — DATA_MODEL.md §6f protocol, race-proof
const { error } = await supabase
  .from(TABLES.packing)
  .upsert(PACKING_SEED.map(packingItemToRow), {
    onConflict: 'item_key',
    ignoreDuplicates: true,
  })

// tick / untick
await supabase.from(TABLES.packing).update({ checked }).eq('item_key', itemKey)

// edit label (blur or 600 ms debounce, same as slot text)
await supabase.from(TABLES.packing).update({ label }).eq('item_key', itemKey)

// add (fresh 'pk-user-…' key, position = category max + 10)
await supabase.from(TABLES.packing).insert(packingItemToRow(newItem))

// remove
await supabase.from(TABLES.packing).delete().eq('item_key', itemKey)

// live sync — identical shape to the slots channel (§3d): INSERT/UPDATE upsert
// into state by item_key, DELETE drops by item_key
supabase.channel('packing-items-realtime').on('postgres_changes',
  { event: '*', schema: 'public', table: TABLES.packing }, applyFrame).subscribe()
```

`japan2026PackingItems` snapshot after every load/mutation; open-mode localStorage store seeded from `PACKING_SEED` — all per the slots precedent.

## 7. `journal_entries` + the `journal-photos` bucket (extension)

Shape + photo contract: [DATA_MODEL.md](DATA_MODEL.md) §12. Committed as `supabase/migrations/0004_journal.sql` (table, bucket and storage policies in one file). **This is the app's first use of Supabase Storage** — the bucket + policy SQL below gets the same rigour as the tables.

### 7a. Schema

```sql
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
```

No author column of any kind — per the household's no-attribution convention (ARCHITECTURE.md §4.4).

### 7b. RLS + realtime

```sql
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
```

### 7c. Bucket

```sql
-- Private bucket; 5 MB cap is generous headroom over the ~400 KB the client
-- compression contract produces (DATA_MODEL.md §12d). Idempotent.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal-photos', 'journal-photos', false, 5242880,
        array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;
```

### 7d. Storage policies

`storage.objects` already has RLS enabled by Supabase; these policies open exactly one bucket to exactly the `authenticated` role — the table posture, mirrored:

```sql
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
```

Verify after applying: an unauthenticated `fetch` of `/storage/v1/object/journal-photos/<anything>` returns an error object, and `createSignedUrl` works only with a session (Phase 13 checks this — PLAN.md).

### 7e. Call patterns (`useJournal.ts` + `lib/images.ts`)

```ts
// ── table CRUD — identical shape to the slots patterns (§3d) ──────────
await supabase.from(TABLES.journal).select('*')
  .order('entry_date', { ascending: false })
  .order('created_at', { ascending: false })
await supabase.from(TABLES.journal).insert(journalEntryToRow(entry))
await supabase.from(TABLES.journal).update({ body, entry_date }).eq('entry_key', key)
await supabase.from(TABLES.journal).delete().eq('entry_key', key)
// realtime: channel 'journal-entries-realtime', event '*', upsert/drop by entry_key

// ── photo upload — ALWAYS through the §12d compression first ──────────
const blob = await compressImage(file)          // lib/images.ts: ≤1600 px, JPEG q0.8
const { error } = await supabase.storage
  .from(BUCKETS.journalPhotos)
  .upload(`${entry.entryKey}.jpg`, blob, { contentType: 'image/jpeg', upsert: true })
// then persist photo_path on the row:
await supabase.from(TABLES.journal)
  .update({ photo_path: `${entry.entryKey}.jpg` }).eq('entry_key', entry.entryKey)

// ── photo display — private bucket, so signed URLs, memoised per session ──
const { data, error } = await supabase.storage
  .from(BUCKETS.journalPhotos)
  .createSignedUrl(entry.photoPath, 3600)       // 1 h; never persisted anywhere
// data.signedUrl → <img src>

// ── delete an entry: object first, then row ───────────────────────────
if (entry.photoPath) {
  await supabase.storage.from(BUCKETS.journalPhotos).remove([entry.photoPath])
  // a failed remove leaves an orphan object — accepted; housekeeping below
}
await supabase.from(TABLES.journal).delete().eq('entry_key', entry.entryKey)
```

Housekeeping (dashboard, occasional): Storage → journal-photos → sort by name and delete any object whose `entry_key` no longer appears in `select entry_key from public.journal_entries`.

## 8. Open-Meteo (extension) — the one non-Supabase call

**Genuinely keyless.** Open-Meteo's free non-commercial tier requires no API key, no account, no auth header and no signup — a plain `fetch` of a public URL is the entire integration. There is **no key to provision, store, or rotate**; do not go looking for one, and do not add anything weather-related to `.env` files or repo variables. This module imports **nothing from `lib/supabase.ts`** — it is the only network call in the app that isn't Supabase (ARCHITECTURE.md §18).

```ts
// lib/weather.ts — plain fetch, no supabase import, no headers, no key
export async function fetchWeather(city: City): Promise<WeatherSnapshot> {
  const { lat, lng } = CITY_FALLBACK_COORDS[city]
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '7',
  }).toString()

  const res = await fetch(url)                  // throws offline — caller catches
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  const json = await res.json()
  return toSnapshot(city, json)                 // → DATA_MODEL.md §13b shape
}
```

Rules:

- **Caching is app-level**, per DATA_MODEL.md §13c (30 min fresh window, 6 h stale ceiling) — this is also the politeness cap on a free service. The service worker deliberately does **not** cache this host (ARCHITECTURE.md §14): one cache layer, not two.
- `timezone=Asia/Tokyo` pins daily boundaries to JST regardless of where the request is made from (pre-trip checks from the UK show Japan's days, not Britain's).
- `forecast_days: '7'` covers "current + a short forecast"; the API's free horizon is 16 days, so mid-trip every remaining leg is in range. Pre-trip, September dates are beyond the horizon — the card falls back to current conditions only (DESIGN.md §16).
- Every failure path ends in "show the cached snapshot or show nothing" — never an error state, never a toast (weather is ambience, not infrastructure).

## 9. The login proxy (shared-login extension) — the one API of ours

Design + alternatives + security posture: [AUTH.md](AUTH.md). Architecture, topology and the Mac-independence argument: [ARCHITECTURE.md](ARCHITECTURE.md) §20. Delivery: [PLAN.md](PLAN.md) Phase 14.

A stateless FastAPI app (`apps/server`) with exactly two routes and no database. Base URL: **`https://japan-api.mishka-hub.com`** in production (Cloudflare Tunnel → loopback uvicorn on the household Mac, port **8102**); **`http://127.0.0.1:8103`** when running the dev instance locally. The SPA reads the base from `VITE_AUTH_API_BASE` and defaults to the production hostname when unset (§1a) — so the Pages build needs no new repo variable.

Error bodies follow the household shape everywhere: `{"detail": "<human sentence>", "code": "<machine_slug>"}`.

### 9a. `POST /api/auth/login`

Request:

```json
{ "email": "string", "password": "string" }
```

Responses:

```
200 → { "access_token":  "<supabase access JWT>",
        "refresh_token": "<supabase refresh token>",
        "expires_in":    3600,
        "user": { "id": "<supabase user uuid>", "email": "string" } }
      — a genuine Supabase session pair, produced by a real signInWithPassword
        on the server (see below); the SPA feeds it straight to setSession()

401 → { "detail": "Incorrect email or password", "code": "invalid_credentials" }
429 → { "detail": "Too many failed login attempts — try again later.", "code": "rate_limited" }
      — Japan's own 5-failures/15-min/IP limit, or Mishka Hub's own 429 passed through
503 → { "detail": "Mishka Hub isn't reachable — Japan borrows its login. Is it running?",
        "code": "identity_unavailable" }
503 → { "detail": "Signed in with Mishka Hub, but the session couldn't be finished — try again shortly.",
        "code": "session_mint_failed" }
      — verification succeeded but Supabase's Auth API was unreachable; nothing was
        half-issued (no tokens returned; the password rotation is harmless to redo)
```

Server-side sequence (the complete contract — [AUTH.md](AUTH.md) §2 has the diagram):

1. Rate-limit gate (5/15 min/IP, in front of everything — a brute force must not reach Mishka Hub or the mint).
2. Verify `lower(email)` + password against Mishka Hub's unmodified `POST /api/auth/login` via the ported identity client; map 401/429/unreachable per the table above. The throwaway Mishka session is logged out best-effort.
3. Mint the Supabase session — service_role key, server-side only:

```python
# supabase-py v2; both clients are module-level singletons in app/sessions.py
admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)   # never logged, never returned
anon  = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)           # same public key the SPA bakes in

# 3a. find the Supabase Auth user by email. There is no stable get-by-email
#     admin call; the project holds two users, ever — list and match:
users = admin.auth.admin.list_users()
user = next((u for u in users if (u.email or "").lower() == email), None)

# 3b. auto-provision on first login (bounded by Mishka Hub's own account list —
#     an email only reaches this line if Mishka Hub just verified it):
if user is None:
    user = admin.auth.admin.create_user(
        {"email": email, "email_confirm": True, "password": fresh_random()}
    ).user

# 3c. rotate the password to noise — 32 bytes, base64; never reused, never
#     returned, never logged. Normal, stable Admin API surface:
password = fresh_random()   # secrets.token_urlsafe(32)
admin.auth.admin.update_user_by_id(user.id, {"password": password})

# 3d. a real sign-in with the anon client → a genuine Supabase session:
session = anon.auth.sign_in_with_password(
    {"email": email, "password": password}
).session
# → session.access_token / .refresh_token / .expires_in / .user
```

4. Return the pair. Any exception in 3a–3d → 503 `session_mint_failed`; the password variable goes out of scope and is never persisted.

### 9b. `GET /api/health`

Mirror of Michi's probe, minus its content versioning:

```
200 → { "status": "ok", "identity": "reachable" | "unreachable" }
```

`identity` is the Mishka Hub reachability probe (identity client's `ping()`, 1 s timeout), cached for 60 s at module scope so health checks never hammer or block on Mishka Hub. Used by the orchestrator/tunnel checks; the SPA never calls it.
