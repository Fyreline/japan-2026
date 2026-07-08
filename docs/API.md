# Japan 2026 — Supabase Surface

There is no REST API of ours — the SPA talks to Supabase directly through `@supabase/supabase-js` v2. This doc is the complete contract for that surface: client init, the Auth calls, both tables' SQL (schema + RLS + realtime), and the exact TypeScript call patterns the hooks implement. Implement `lib/supabase.ts`, `auth/useAuth.ts`, `hooks/useSubmittedSpots.ts` and `hooks/useItinerary.ts` against this doc and update it in the same commit as any change. Storage rationale: [DATA_MODEL.md](DATA_MODEL.md); flow diagrams: [ARCHITECTURE.md](ARCHITECTURE.md) §5–7.

**Status:** §1–§2 describe what is already live in the household's Supabase project (verified against the current `index.html` + `SUPABASE_SETUP.md`); §3 is the redesign's addition.

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
- The anon key is a public, RLS-guarded `sb_publishable_` key. It ships in the built bundle by design. The `service_role` key must never appear anywhere in this repo, its env files, or its Actions variables.
- Error convention: every `{ data, error }` return is checked; mutations surface failures as the quiet inline notes specced in [DESIGN.md](DESIGN.md) §6.6 and **never lose the optimistic local write** (localStorage keeps it).

### 0b. Table names

Table names are string constants in one place (`lib/supabase.ts`): `TABLES = { spots: 'submitted_spots', slots: 'itinerary_slots' }`. The old `config.js` `SUPABASE_TABLE` indirection retires.

## 1. Auth

Two fixed users, created manually in the dashboard (auto-confirmed), public signups disabled — there is no registration surface anywhere. Setup walkthrough: [SUPABASE_SETUP.md](../SUPABASE_SETUP.md).

### 1a. Calls (`useAuth.ts`)

```ts
// initial session (page load) — resolves from localStorage, no network round-trip needed
const { data: { session } } = await supabase.auth.getSession()

// every later transition (sign-in, sign-out, token refresh, revocation)
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => setSession(session),
)
// cleanup on unmount: subscription.unsubscribe()

// sign in (LoginScreen submit)
const { error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password,
})
// error.message → shown verbatim in the form's text-fig error line

// sign out (header button) — onAuthStateChange re-raises the gate
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
| Who can read/write either table? | Only the two `authenticated` users. RLS on both tables; no `anon` policies exist. |
| Is the anon key in a public repo/bundle a problem? | No — it is designed to be public (`sb_publishable_`), and grants nothing without a session. Documented in SUPABASE_SETUP.md. |
| Registration? | Disabled in the dashboard (Auth → Providers → Email → "Allow new users to sign up" OFF). Two accounts, ever. |
| service_role key | Never in this repo, never in Actions. Dashboard-only. |
| Realtime | Both tables in the `supabase_realtime` publication; RLS applies to realtime too (Supabase enforces policies on `postgres_changes` for the subscribing user's JWT). |
| The 22 Sep secret | Not a database concern: the seed text is generic by rule (DATA_MODEL.md §6b). Anything more specific only ever exists as live row content typed by a traveller, behind the gate. |
