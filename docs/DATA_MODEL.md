# Japan 2026 — Data Model

Every data shape in the app: the static in-repo datasets (as TypeScript types), the Supabase tables (TS shape + Postgres schema + the mapping between them), the journal photo storage contract, the localStorage keys, and the seed rules. Where the app and this file diverge, this file wins and the code is corrected. Companion docs: [API.md](API.md) for the SQL + call patterns, [ARCHITECTURE.md](ARCHITECTURE.md) §6–7 and §13–19 for how these shapes move.

**Status:** §1–§9 are shipped and live (the rebuild, [PLAN.md](PLAN.md) Phases 1–6). §10–§15 are the **feature extension** (*new*) — specced here first, implemented in Phases 7–13. All types live in `apps/web/src/data/types.ts` unless a section names another module.

---

## 1. Conventions

- Client-side objects use **camelCase**; Supabase columns use **snake_case**. The mapping functions (`rowToSubmissionEntry`/`submissionToRow`, `rowToSlot`/`slotToRow`) are the only places the two vocabularies meet.
- Every synced record carries a **client-generated stable key** (`client_submission_key` / `slot_key`) so inserts are idempotent, realtime echoes dedupe, and edits have a handle that survives reloads on both devices.
- Timestamps are Postgres `timestamptz` defaulting to `now()`; the client never fabricates them.
- Cities are `'Tokyo' | 'Fuji' | 'Hiroshima' | 'Osaka' | 'Kyoto'` (plus `'Home'` in itinerary legs). Display order: `['Tokyo','Fuji','Hiroshima','Osaka','Kyoto']`.
- **No real names anywhere** — in data, comments, commits or docs. The travellers are "the two of you". The 22 Sep evening slot's text is exactly `Evening — Booked up 🤫` and never more specific (§6b).

## 2. Static dataset — accommodations & events (*existing* → `accommodations.ts`)

Feeds the map's "Hotels / Events" layer and the Full data tab. 10 entries today (2 accommodations, 8 planned events), ported verbatim from the current `accommodations` array.

```ts
export interface Accommodation {
  id: string                        // kebab-case, unique, e.g. 'ryokan-shizuku'
  type: 'accommodation' | 'event'
  title: string                     // may contain Japanese text (font-jp handles it)
  city: City
  suburb: string
  dates: string                     // free display text, e.g. '23–26 Sep 2026 (nights 4–6)'
  lat: number
  lng: number
  details: string                   // popup body; may carry 'Booked ✔' notes
  link: string
  category: 'Accommodation' | 'Event'   // marker icon + Full data grouping
}
```

## 3. Static dataset — trip ideas (*existing* → `ideas.ts`)

44 entries: 28 from the household's own planning notes plus 16 trimmed picks from a coworker's list. Feeds the Ideas tab (grouped by city + suburb, filterable by leg) and the map's Ideas layer.

```ts
export interface TripIdea {
  id: string                        // 'gotokuji'; coworker picks prefixed 'cw-'
  title: string
  city: City
  suburb: string                    // includes '(day trip)' suffixes, e.g. 'Kawagoe (day trip)'
  tag: string                       // free vocab: Culture/Shopping/Food/Nightlife/Art/…
  cost: string                      // display string: 'Free', '£25', '£0+ purchases', '¥1,800'
  lat: number
  lng: number
  source: string                    // 'Your Tokyo notes' | "Coworker's picks" | …
  description: string
  detail: string
  link?: string                     // absent → derived Google-Maps search URL (below)
  leg?: Leg                         // derived lazily via LEG_MAP, never authored
}
```

Port rules from the current site: ideas without a `link` get `https://www.google.com/maps/search/?api=1&query=` + URL-encoded `"{title} {city} Japan"`; `leg` derives as `LEG_MAP[city] ?? city` where `LEG_MAP = { Hakone:'Fuji', Nara:'Kyoto', Tokyo:'Tokyo', Fuji:'Fuji', Kyoto:'Kyoto', Hiroshima:'Hiroshima', Osaka:'Osaka' }`.

## 4. Static JSON files (*existing, content unchanged* → `src/data/*.json`)

The three curated files move from the repo root into `apps/web/src/data/` and are **statically imported** (bundled, typed via `normalize.ts`) rather than runtime-fetched — a malformed file now fails the build instead of a tab at runtime. The friendly "edit a JSON file to add places" workflow survives: edit → push → Actions rebuilds.

### 4a. `restaurants.json`

```jsonc
{ "destinations": {
    "Tokyo (Shibuya)": [            // key = "City" or "City (Suburb)" — parsed at load
      { "category": "Cheap Eats",   // sub-category vocabulary, drives filter pills
        "name": "…", "tabelog_rating": "3.5",
        "cost_approx": "£", "cuisine_type": "…",
        "description": "…", "google_maps_link": "…",
        "approx_wait_time_walkin": "…",
        "coordinates": { "lat": 35.66, "lng": 139.70 } } ] } }
```

`normalize.ts` must preserve the current loader behaviour: `city`/`suburb` parsed from the destination key with `/^([^()]+)(?:\s*\((.+)\))?$/`; each item stamped with `type: 'Restaurant'`, `title = name`, and a derived stable `id` (`{city}-{suburb}-{index}` slug).

### 4b. `attractions_by_location.json`

```jsonc
{ "locations": {
    "Tokyo": {
      "top_10":      [ { "name": "…", "rating": "…", "approx_cost": "…",
                         "booking_requirement": "…", "description": "…",
                         "website": "…", "google_maps_link": "…", "google_map_link": "…",
                         "coordinates": { "lat": 0, "lng": 0 } } ],
      "hidden_gems": [ /* same item shape */ ] } } }
```

The tier key becomes the item's `category` (`top_10` → "Top 10", `hidden_gems` → "Hidden Gems"). Note the historical duplicate link keys (`google_maps_link` **and** `google_map_link`) — readers must accept either; the normalizer coalesces them.

### 4c. `animal_cafes.json`

```jsonc
{ "cities": {
    "Tokyo": [ { "name": "…", "animals": ["Cats"], "rating": "…",
                 "approx_cost": "…", "booking_requirement": "…",
                 "description": "…", "website": "…",
                 "google_maps_link": "…", "google_map_link": "…",
                 "coordinates": { "lat": 0, "lng": 0 } } ] } }
```

### 4d. Normalized entry (what tabs/map/Full data actually consume)

```ts
export interface PlaceEntry {
  id: string
  type: 'Restaurant' | 'Attraction' | 'Animal Cafe'
  title: string                     // = name
  name: string
  category: string                  // sub-category / tier ("Cheap Eats", "Top 10", …)
  city: City
  suburb: string
  description: string
  link: string                      // coalesced google_maps_link / google_map_link / website
  coordinates: { lat: number; lng: number } | null
  costDisplay: string               // cost_approx / approx_cost, as-is
  rating?: string                   // tabelog_rating / rating
  bookingRequirement?: string
  // Restaurant-only:
  cuisineType?: string
  approxWait?: string
  // Animal-cafe-only:
  animals?: string[]
  source?: 'User Submission'        // set only on submitted spots (§7)
}
```

## 5. Static dataset — trip essentials + leg lookups (*existing* → `tripEssentials.ts`)

- `TRIP_ESSENTIALS: { title: string; body: string }[]` — flights, cash (~¥20,000), Suica, eSim, car-hire notes, rendered as cards above the itinerary. Flight times are already public in the current site and stay; **no finances beyond the already-public ryokan price appear anywhere**.
- `LEG_COLORS` becomes **token-based** (the current pink hexes are deleted): `{ Tokyo:'var(--color-clay)', Fuji:'var(--color-sky)', Hiroshima:'var(--color-fig)', Osaka:'var(--color-kraft)', Kyoto:'var(--color-olive)', Home:'var(--color-cloud)' }` — see [DESIGN.md](DESIGN.md) §6.
- `LEG_MAP` as in §3.

## 6. Itinerary slots (*new*) — the redesign's centrepiece

### 6a. Day metadata (static, `itineraryDays.ts`)

Day-level facts are trip constants, not collaborative state:

```ts
export interface ItineraryDay {
  day: number            // 1–14
  date: string           // 'Sun 20 Sep' … 'Sat 3 Oct'
  city: string           // display: 'Tokyo', 'Mt. Fuji / Hakone', 'Homeward bound'
  leg: Leg               // 'Tokyo'|'Fuji'|'Hiroshima'|'Osaka'|'Kyoto'|'Home' → LEG_COLORS
  hotel: string          // '' when unknown
  hotelBooked: boolean
}
```

Ported from the current site's `itinerary` array (day/date/city/leg/hotel/hotelBooked). The old `travel`/`acts`/`note` strings do **not** carry over as fields — their content folds into the slot seed (§6b). The prototype's per-day `budget` field is **deliberately dropped**: finance data stays out of this public repo (same policy that gitignores `Japan Itinerary/`).

### 6b. Slot — client shape (in-memory + localStorage + seed)

```ts
export type SlotType =
  | 'travel' | 'food' | 'culture' | 'free' | 'sleep' | 'surprise' | 'default'

export interface ItinerarySlot {
  slotKey: string        // stable id 'dNN-HHMM-slug', unique for all time
  day: number            // 1–14, joins to ItineraryDay
  position: number       // fractional sort key within the day (§6c)
  time: string           // display label, free text (usually 'HH:MM')
  type: SlotType         // drives the coloured left edge (DESIGN.md §6)
  text: string           // the editable content
}
```

`ITINERARY_SEED` in `itinerarySeed.ts` is the initial dataset: the owner's prototype's 14 days of ~6–9 slots each (one every ~1.5–2.5 h), reconciled with the live site's day facts. Seed rules:

- **Day 3 (Tue 22 Sep): daytime slots come from the prototype (breakfast → Edo-Tokyo Museum → lunch → Akihabara → Super Potato → arcade); the evening is exactly** `{ slotKey:'d03-1800-surprise', day:3, position:70, time:'18:00', type:'surprise', text:'Evening — Booked up 🤫' }` **and nothing in the seed occupies day 3 after 18:00.** The prototype's own day-3 evening entries are dropped in its favour, and no seed entry anywhere may hint at a specific venue for that evening. What the travellers later type into the live app is their own business.
- Dinner/meal slots elsewhere stay generic in the seed ("🍣 Dinner — splurge night!"); specific restaurant bookings get typed into the live app, not committed.
- `slotKey`s are deterministic (`dNN-HHMM-slug`), so seeding is idempotent (§6d). They are **never regenerated or renamed** after first commit — they're the sync handle.
- `position` seeds on the 10/20/30… lattice in time order within each day.
- Emoji-led text (the prototype's style: `✈️ Land at Haneda — immigration & baggage`) is kept — it's the wayfinding.

### 6c. Ordering — fractional positions

`position` is a `double precision` sort key, unique-ish within a day but never assumed integral:

- Render order: `ORDER BY day, position`, ties broken by `slotKey` for determinism.
- Drag-drop: the moved slot's new `position = (prev.position + next.position) / 2` — or `first − 10` / `last + 10` at the edges → **one row updated per drag**, one realtime frame.
- Renumber guard: if the midpoint would land within `1e-6` of a neighbour (≈50 consecutive drags into the same gap), the client rewrites that day's positions back onto the 10-lattice in a single batched pass. Rare enough to be a footnote, cheap enough to be safe.
- **Time follows the drop.** A reorder also recomputes the moved slot's `time` label from its new neighbours (`tripWindow.ts`'s `parseTimeToMinutes`/`formatMinutesToTime`, the same HH:MM parse `currentSlotFor` already uses), so a reordered day still reads top-to-bottom in time order instead of carrying its old clock time to a new spot: midpoint of both neighbours' minutes when both parse, ±30 min off a single parseable neighbour at either edge of the day, rounded to the nearest 5 minutes and clamped to 00:00–23:55. Only the *moved* slot's time changes — its neighbours keep their own labels. If neither neighbour has a parseable time, the moved slot's time is left exactly as it was rather than guessed at. Applies in both the plain-reorder and renumber-guard paths.

### 6d. Slot — Supabase table `itinerary_slots`

Full SQL with RLS + realtime in [API.md](API.md) §3. Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | surrogate; the client never uses it as a handle |
| `slot_key` | `text not null unique` | the client's stable id — dedup + edit/delete handle (mirrors `client_submission_key`) |
| `day` | `int not null check (day between 1 and 14)` | |
| `position` | `double precision not null` | §6c |
| `time_label` | `text not null default ''` | display time |
| `slot_type` | `text not null default 'default'` + `check (slot_type in ('travel','food','culture','free','sleep','surprise','default'))` | coloured edge |
| `content` | `text not null default ''` | the editable text |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | maintained by a `moddatetime` trigger on UPDATE (API.md §3) — the client never sends it |

Indexes: the `unique` on `slot_key` doubles as the lookup index; plus `create index on public.itinerary_slots (day, "position");` for the ordered read. `REPLICA IDENTITY FULL` so realtime DELETE events carry `slot_key`, not just the surrogate `id` (API.md §3d).

### 6e. Mapping — `rowToSlot` / `slotToRow` (mirrors `rowToSubmissionEntry`)

| Client (`ItinerarySlot`) | Row (`itinerary_slots`) | Direction notes |
|---|---|---|
| `slotKey` | `slot_key` | both ways; never regenerated |
| `day` | `day` | both ways |
| `position` | `position` | both ways; `Number(row.position)` on read |
| `time` | `time_label` | both ways; `row.time_label ?? ''` on read |
| `type` | `slot_type` | both ways; unknown/renamed values fall back to `'default'` on read (forward compatibility) |
| `text` | `content` | both ways; `row.content ?? ''` on read |
| — | `id`, `created_at`, `updated_at` | server-only; ignored by the client shape |

### 6f. Seeding protocol

On the first signed-in load, if `SELECT` over `itinerary_slots` returns zero rows, the client UPSERTs the whole `ITINERARY_SEED` mapped through `slotToRow`, with `{ onConflict: 'slot_key', ignoreDuplicates: true }`. Two devices racing produce one seeded table and zero errors — `slot_key` uniqueness is the referee. The seed is **never re-applied** over a non-empty table: deletions are deliberate, and re-seeding would resurrect them.

## 7. Submitted spots (*existing*, preserved verbatim)

### 7a. Supabase table `submitted_spots`

As created by the original [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) (SQL restated in [API.md](API.md) §2). Live today with real rows — **the rebuild must not alter this table**.

| Column | Type | | Column | Type |
|---|---|---|---|---|
| `id` | `bigint identity pk` | | `speciality` | `text` |
| `created_at` | `timestamptz default now()` | | `description` | `text` |
| `client_submission_key` | `text` | | `google_maps_link` | `text` |
| `category` | `text` (Restaurant/Attraction/Animal Cafe) | | `approx_wait` | `text` |
| `name` | `text` | | `booking_requirement` | `text` |
| `sub_category` | `text` | | `lat` / `lng` | `double precision` |
| `cost_tier` | `int` (1–5 → `'£'.repeat(n)`) | | `city` / `suburb` | `text` |

### 7b. Form payload + mapping (`useSubmittedSpots.ts`)

```ts
export interface SubmissionPayload {          // what SubmitForm collects
  name: string; category: 'Restaurant' | 'Attraction' | 'Animal Cafe'
  subCategory: string; costTier: number       // 1–5
  city: City; suburb: string
  speciality: string; description: string
  googleMapsLink: string; approxWait: string; bookingRequirement: string
}
```

**Read path** (`rowToSubmissionEntry`, ported logic): row → payload with fallbacks (`name ?? speciality ?? 'User Submission'`, `sub_category ?? speciality ?? 'User Submission'`, `cost_tier ?? 1`) → `buildSubmissionEntry(payload, { id: client_submission_key ?? id, coordinates: lat/lng ?? CITY_FALLBACK_COORDS[city] ?? Tokyo })`, which fans out into the **native `PlaceEntry` shape of whichever dataset the category targets**: a Restaurant submission gains `cuisineType` (from speciality) and `approxWait`; an Attraction gains `bookingRequirement || 'Unknown'`; an Animal Cafe gains `animals: [subCategory || speciality]`. All gain `source: 'User Submission'` and `costDisplay = '£'.repeat(costTier)`.

**Write path** (`submissionToRow`): snake_case row from the same payload plus `client_submission_key: entry.submissionKey`, `lat`/`lng` from the entry's resolved coordinates (extracted from the Google-Maps link via the current regexes — `!3d…!4d…` then `?q=lat,lng` — else city fallback).

**Dedup on both paths**: an in-memory `Set` keyed by `client_submission_key ?? id` (the current `seenSubmissionKeys` behaviour) makes realtime echoes and re-loads no-ops.

This is the reference implementation the itinerary sync (§6) deliberately mirrors.

## 8. localStorage keys

| Key | Contents | Written when |
|---|---|---|
| `japan2026UserSubmissions` (*existing*) | JSON array of submission entries | Own submissions — open mode (it *is* the store) or alongside Supabase (local copy) |
| `japan2026ItinerarySlots` (*new*) | JSON array of client-shape slots (§6b), whole trip | Open mode: on every mutation. Signed-in: write-through snapshot after every successful load/mutation — the offline read cache |
| `japan-theme` (*new*) | `'light'` or `'dark'` (absent = follow OS) | Theme toggle |
| `japan2026VisitedMarks` (*extension*) | JSON array of visited `item_key` strings (§10) | Same discipline as the slots snapshot: open mode it is the store; signed-in it is the write-through offline cache |
| `japan2026PackingItems` (*extension*) | JSON array of client-shape packing items (§11) | Same discipline as the slots snapshot |
| `japan2026JournalEntries` (*extension*) | JSON array of client-shape journal entries (§12) — **text and paths only, never photo binaries** | Same discipline; photo bytes live only in Storage (§12d) and the service worker's runtime cache |
| `japan2026WeatherCache` (*extension*) | Per-city last Open-Meteo snapshot + `fetchedAt` (§13c) | Every successful weather fetch |

## 9. Sizing sanity

14 days × ~7 slots ≈ 100 seed rows; a heavily edited trip might double that. `submitted_spots` holds dozens of rows. Everything fits in Supabase's free tier by three orders of magnitude; no pagination anywhere; whole-table reads on load are the right call. The bundled JSON datasets total ~55 KB pre-gzip — a non-issue for a Vite chunk.

The extension changes none of this: `visited_marks` tops out at a few hundred one-column rows, `packing_items` at ~40, `journal_entries` at a few dozen. Journal photos are the only new bulk — at the §12d compression contract (~150–400 KB each, ≤ 30 photos) the whole trip is well under 15 MB against Storage's 1 GB free tier. Whole-table reads stay the right call everywhere.

## 10. Visited marks (*extension*) — "we've been here"

A shared, presence-only set: an item is visited if its key has a row in `visited_marks`, and not visited otherwise. No payload, no notes, no attribution — the toggle on a card is the entire feature. Synced live between the two phones exactly like everything else.

### 10a. Item keys — the canonicalisation function (`data/itemKey.ts`)

The existing datasets do **not** share a durable id scheme, so the mark cannot key on raw `id`s:

| Dataset | Current id | Durable? |
|---|---|---|
| Ideas (`ideas.ts`) | authored kebab-case (`'gotokuji'`, `'cw-…'`) | **Yes** — hand-written, never regenerated |
| Restaurants (`normalize.ts`) | `{slug(city)}-{slug(suburb)}-{index}` | **No** — the index shifts when the JSON is edited |
| Attractions / animal cafés | `{slug(city)}-{slug(name)}-{index}` | **No** — same index problem |
| Submitted spots | `client_submission_key ?? String(row.id)` | **Yes** — the permanent sync handle (§7) |
| Accommodations / events | authored ids | Excluded — you don't tick off your own hotel; no toggle on these cards |

So `visited_marks.item_key` uses a canonical key derived from stable natural facts, computed by one function pair in a new `apps/web/src/data/itemKey.ts`:

```ts
/** Deterministic, index-free slug. NFKC first so width/compat variants of the
 *  same Japanese string collapse; \p{L}\p{N} keeps CJK intact. */
export function itemSlug(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function itemKeyForIdea(idea: TripIdea): string {
  return `idea:${idea.id}`                      // authored ids are already stable
}

const KIND_PREFIX: Record<PlaceType, string> = {
  Restaurant: 'restaurant',
  Attraction: 'attraction',
  'Animal Cafe': 'cafe',
}

export function itemKeyForEntry(e: PlaceEntry): string {
  if (e.submissionKey) return `spot:${e.submissionKey}`   // submissions: the permanent handle
  return `${KIND_PREFIX[e.type]}:${itemSlug(e.city)}:${itemSlug(e.suburb)}:${itemSlug(e.name)}`
}
```

Stability contract (documented, accepted trade-offs for a two-person app):

- Keys survive JSON reordering, re-indexing, and description/link edits — the failure mode of the raw ids.
- **Renaming** a curated place in a JSON file orphans its mark (the card reads as unvisited again). Accepted: renames are rare, the cost is one lost tick, and orphan rows are harmless (cleanup recipe in DEPLOYMENT-style housekeeping, API.md §5).
- Two same-named places in the same city + suburb would share a key and toggle together. No such pair exists in the current data; accepted.
- `itemSlug` is the **only** slugger for keys — never reuse `normalize.ts`'s display `slug()` here, and never change `itemSlug` once marks exist (it is as frozen as `slot_key`).

### 10b. Client shape

```ts
// The whole client state is a set — presence = visited.
type VisitedSet = Set<string>       // of item_key
```

No richer object exists client-side. The hook (`hooks/useVisited.ts`) exposes `isVisited(key)`, `toggle(key)` and mirrors the `useItinerary` engine shape (ARCHITECTURE.md §16).

### 10c. Supabase table `visited_marks`

Full SQL in [API.md](API.md) §5. Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | surrogate; never a client handle |
| `item_key` | `text not null unique` | §10a canonical key — the dedup + delete handle |
| `created_at` | `timestamptz not null default now()` | |

No `updated_at` and no UPDATE path — rows are only ever inserted and deleted (presence-only). `REPLICA IDENTITY FULL` so realtime DELETEs carry `item_key` (same reasoning as §6d).

### 10d. Toggle protocol

- **Mark:** `upsert({ item_key }, { onConflict: 'item_key', ignoreDuplicates: true })` — both phones marking the same card in the same second produce one row and zero errors (the §6f seeding trick, reused).
- **Unmark:** `delete().eq('item_key', key)`.
- **Realtime:** event `*`; INSERT adds the key to the set, DELETE drops it. Own echoes are no-ops.
- Optimistic local flip first, localStorage snapshot after every change, quiet inline failure note — the standard mutation discipline (§8, ARCHITECTURE.md §8).

## 11. Packing items (*extension*) — the shared checklist

A new tab and a new fully-CRUD table, deliberately shaped as a **simpler sibling of the itinerary engine** (§6): same stable-key + fractional-position machinery, minus times, types and colour edges.

### 11a. Client shape

```ts
export type PackingCategory =
  | 'documents' | 'electronics' | 'clothing' | 'health' | 'other'

export const PACKING_CATEGORIES: { id: PackingCategory; label: string }[] = [
  { id: 'documents',   label: 'Documents' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing',    label: 'Clothing' },
  { id: 'health',      label: 'Health & first aid' },
  { id: 'other',       label: 'Everything else' },
]

export interface PackingItem {
  itemKey: string           // 'pk-…' stable sync handle (mirrors slot_key)
  category: PackingCategory
  label: string             // the editable text
  checked: boolean
  position: number          // fractional sort key within the category (§6c rules)
}
```

### 11b. Supabase table `packing_items`

Full SQL in [API.md](API.md) §6. Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | |
| `item_key` | `text not null unique` | seeded `pk-{category}-{slug}`, user-added `pk-user-{epoch}-{slug}` |
| `category` | `text not null default 'other'` + `check (category in ('documents','electronics','clothing','health','other'))` | |
| `label` | `text not null default ''` | |
| `checked` | `boolean not null default false` | |
| `position` | `double precision not null` | §6c fractional ordering, per category |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` via the same `moddatetime` trigger pattern as §6d |

Index `(category, "position")` for the ordered read; `REPLICA IDENTITY FULL` for keyed DELETEs.

### 11c. Mapping — `rowToPackingItem` / `packingItemToRow`

| Client | Row | Direction notes |
|---|---|---|
| `itemKey` | `item_key` | both ways; never regenerated |
| `category` | `category` | both ways; unknown values fall back to `'other'` on read |
| `label` | `label` | both ways; `row.label ?? ''` on read |
| `checked` | `checked` | both ways; `Boolean(row.checked)` on read |
| `position` | `position` | both ways; `Number(row.position)` on read |
| — | `id`, `created_at`, `updated_at` | server-only |

### 11d. Seed — `PACKING_SEED` (`data/packingSeed.ts`)

Seeded on first signed-in load if the table is empty, with the exact §6f protocol (`onConflict: 'item_key', ignoreDuplicates: true` — race-proof). Open mode seeds localStorage the same way. Positions on the 10/20/30… lattice per category. The seed is generic by rule: **no real names, no finances, no venue hints.**

| `item_key` | category | label |
|---|---|---|
| `pk-documents-passports` | documents | Passports |
| `pk-documents-idp` | documents | International Driving Permit (Fuji car leg) |
| `pk-documents-insurance` | documents | Travel + driving insurance details |
| `pk-documents-esim` | documents | eSIM installed and tested |
| `pk-documents-flights` | documents | Flight details saved offline |
| `pk-documents-bookings` | documents | Hotel booking confirmations |
| `pk-electronics-adapters` | electronics | Plug adapters (Japan type A) |
| `pk-electronics-chargers` | electronics | Phone chargers + cables |
| `pk-electronics-battery` | electronics | Battery pack, charged |
| `pk-electronics-camera` | electronics | Camera + spare card |
| `pk-electronics-earphones` | electronics | Earphones |
| `pk-clothing-layers` | clothing | Light layers — warm days, cool evenings |
| `pk-clothing-shoes` | clothing | Comfortable walking shoes, broken in |
| `pk-clothing-rain` | clothing | Rain jacket or compact umbrella |
| `pk-clothing-onsen` | clothing | Small towel for onsen/sento |
| `pk-clothing-laundry` | clothing | Laundry bag (coin laundries are everywhere) |
| `pk-health-medication` | health | Regular medication, in original packaging |
| `pk-health-firstaid` | health | Paracetamol + plasters + basics |
| `pk-health-sanitiser` | health | Hand sanitiser (many toilets lack soap) |
| `pk-other-coinpurse` | other | Coin purse — ¥ coins pile up fast |
| `pk-other-totebag` | other | Foldable tote for shopping + konbini runs |
| `pk-other-pen` | other | Pen for immigration forms |
| `pk-other-daybag` | other | Day bag |
| `pk-other-rubbishbag` | other | Small bag for daytime rubbish (public bins are rare) |

### 11e. Decisions

- **Reorder is schema-ready but not in the v1 UI.** `position` ships from day one (items render `ORDER BY category, position`; new items append at their category's end), so drag-reorder can be added later with zero migration — but the checklist gets no dnd-kit wiring at first. A packing list is check-and-move-on, not a choreography surface; the itinerary keeps the drag budget. Revisit only if the household asks.
- Full CRUD (like slots): edit label in place, add per category, delete with undo. Conflict policy: last write wins, per item (§6 precedent).

## 12. Journal entries (*extension*) — the shared trip diary

One table plus the app's **first use of Supabase Storage** (photos). Chronological notes, optionally one photo each, shared and **unattributed** — per the household convention (ARCHITECTURE.md §4.4), nothing stores or exposes which of the two wrote an entry.

### 12a. Client shape

```ts
export interface JournalEntry {
  entryKey: string          // 'jr-{epochms}-{rand4}' — stable sync handle
  date: string              // ISO 'YYYY-MM-DD' — the day the entry describes
  text: string
  photoPath: string | null  // Storage object path in journal-photos, e.g. 'jr-1758…-4821.jpg'
}
```

The trip day number (`DAY 3`) is **derived** client-side from `date` via §14's window maths when the date falls inside the trip — never stored. `created_at` is server-only and breaks ties within a date.

### 12b. Supabase table `journal_entries`

Full SQL in [API.md](API.md) §7. Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | |
| `entry_key` | `text not null unique` | sync handle, client-generated |
| `entry_date` | `date not null` | the day described; the client always sends it |
| `body` | `text not null default ''` | |
| `photo_path` | `text` | `null` = no photo; §12d path convention |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` via the `moddatetime` trigger pattern |

Index `(entry_date, created_at)`; `REPLICA IDENTITY FULL`. **No author column, ever.**

### 12c. Mapping — `rowToJournalEntry` / `journalEntryToRow`

| Client | Row | Direction notes |
|---|---|---|
| `entryKey` | `entry_key` | both ways; never regenerated |
| `date` | `entry_date` | both ways; Postgres `date` ↔ the ISO string verbatim |
| `text` | `body` | both ways; `row.body ?? ''` on read |
| `photoPath` | `photo_path` | both ways; `row.photo_path ?? null` on read |
| — | `id`, `created_at`, `updated_at` | server-only |

### 12d. Photos — the compression + storage contract

- Bucket: `journal-photos`, **private**, authenticated-only policies (API.md §7c–7d). Object path = `` `${entryKey}.jpg` `` — one photo max per entry; re-attaching overwrites (`upsert: true`).
- **Client-side compression is a requirement, not a nice-to-have** (mobile data in Japan): before upload, decode with `createImageBitmap(file)` (which honours EXIF orientation), draw onto a canvas scaled so the **longest edge ≤ 1600 px** (never upscale), export `canvas.toBlob('image/jpeg', 0.8)`. A 12 MP phone photo lands around 150–400 KB. Lives in a new `apps/web/src/lib/images.ts`; no library — the canvas API is the whole implementation (ARCHITECTURE.md §3 justification).
- Reads go through **signed URLs** (private bucket): `createSignedUrl(path, 3600)`, memoised per session. URLs are never persisted (they expire); only `photo_path` is stored.
- Deleting an entry removes the object first, then the row. A failed object delete leaves an orphan — harmless; housekeeping recipe in API.md §7e.
- **Open mode:** Storage needs Supabase, so the photo control is hidden; journal entries are text-only in localStorage. Signed-in offline: text saves locally with the standard sync note; photo attach is disabled while offline (no upload queue — ARCHITECTURE.md §4.5 stands).

### 12e. Decisions

- **No one-entry-per-day constraint.** The composer defaults to today's date and the list groups by date, which nudges towards one entry a day — but a museum morning and an izakaya evening deserve separate photos, so there is no unique index on `entry_date`.
- **Newest first.** `ORDER BY entry_date DESC, created_at DESC` — mid-trip, today's entry is the one being reread and edited.
- Either traveller can edit or delete any entry — same trust model as slots; last write wins.

## 13. Weather (*extension*) — client-only, no table

Open-Meteo is fetched straight from the browser; nothing touches Supabase. Shapes live in `types.ts`, the fetch/cache logic in `hooks/useWeather.ts` (call pattern: [API.md](API.md) §8).

### 13a. City anchors

The weather coordinate for a day is `CITY_FALLBACK_COORDS[day.leg]` — for every leg except `'Home'`, `Leg` *is* a `City`, and these are the **same five anchors** `normalize.ts` already ships for submission fallbacks (Tokyo 35.6762/139.6503 · Fuji 35.505/138.77 · Hiroshima 34.3853/132.4553 · Osaka 34.6937/135.5023 · Kyoto 35.0116/135.7681). No new coordinates are authored. `leg === 'Home'` → no weather (the card does not render for day 14).

### 13b. Snapshot shape + WMO code mapping

```ts
export interface WeatherSnapshot {
  city: City
  fetchedAt: number                       // Date.now() at fetch
  current: { temp: number; code: number } // temperature_2m °C, weather_code
  daily: {
    date: string                          // 'YYYY-MM-DD'
    code: number
    tMax: number
    tMin: number
    rainChance: number                    // precipitation_probability_max, %
  }[]
}
```

WMO `weather_code` → display, one lookup table (`WEATHER_LABELS`), unknown codes fall back to `'—'` with no emoji:

| Codes | Label | Emoji |
|---|---|---|
| 0 | Clear | ☀️ |
| 1–2 | Mostly clear | 🌤️ |
| 3 | Overcast | ☁️ |
| 45, 48 | Fog | 🌫️ |
| 51–57 | Drizzle | 🌦️ |
| 61–67 | Rain | 🌧️ |
| 71–77, 85–86 | Snow | 🌨️ |
| 80–82 | Showers | 🌦️ |
| 95–99 | Thunderstorm | ⛈️ |

### 13c. Cache — `japan2026WeatherCache`

`Record<City, WeatherSnapshot>` in localStorage. Rules: a snapshot **younger than 30 min** is served without fetching (also the politeness cap on a free keyless API); older → refetch, showing the stale copy meanwhile; fetch fails and the copy is **under 6 h** old → keep showing it (mono "as of HH:MM" line); over 6 h with no network → the card hides. Weather is never louder than absence — no error states, no toasts.

## 14. Trip window & the Today calculation (*extension*)

`ItineraryDay.date` stays a display string (`'Sun 20 Sep'`) and is **never parsed**. Real-date logic gets its own constants in a new `apps/web/src/data/tripWindow.ts`:

```ts
export const TRIP_DAY_COUNT = 14

/** Day number (1–14) for a real date, or null outside the trip window.
 *  Day 1 = Sun 20 Sep 2026. Local-midnight construction + Math.round makes
 *  the maths immune to DST-length days. */
export function tripDayFor(now: Date): number | null {
  const start = new Date(2026, 8, 20)   // local midnight, 20 Sep 2026
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const n = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  return n >= 1 && n <= TRIP_DAY_COUNT ? n : null
}
```

- **Timezone: deliberately device-local.** The trip runs on JST and both phones will be on JST from landing, so local time is correct exactly when it matters. Before departure the window check simply returns null (even the 19 Sep overnight flight: device still says 19 Sep → null → Day 1 default, which is right). No `Intl` timezone juggling, no library.
- **Outside the window the itinerary defaults to Day 1**, exactly as shipped. (Nearest-upcoming-day was considered and rejected: outside the window the travellers are at home planning from the top, and the extra rule buys nothing.)
- **Current-slot highlight** (ARCHITECTURE.md §15): slot `time` labels are free text, so parse with `/^(\d{1,2}):(\d{2})/` and ignore slots that don't match. The *current* slot is the last parseable slot with time ≤ device now; if none yet (early morning), the first parseable slot is *next*. Recomputed on mount and day-switch only — no ticking timer.

## 15. Quick-reference content (*extension*) — static dataset

Entirely in-repo, no storage of any kind: a new `apps/web/src/data/quickReference.ts` renders through the Reference tab (DESIGN.md §17). Content rules: practical and calm, British English, no tourist-board prose. The **full canonical content** is specced here so implementation is transcription, not judgement:

### 15a. Emergency

| Entry | Value |
|---|---|
| Police | **110** |
| Fire / ambulance | **119** |
| Both work from any phone, SIM or not. | note line |
| UK government travel advice (incl. embassy contact) | link out: `https://www.gov.uk/foreign-travel-advice/japan` — labelled "check before you go" |

Deliberate: **no embassy phone number is hardcoded** — it cannot be verified as current from here, and a wrong emergency number is worse than a link. The gov.uk page is the stable, maintained source.

### 15b. Phrases (`{ jp, romaji, en }[]` — `jp` rendered with the `jp` font utility)

| 日本語 | Rōmaji | English |
|---|---|---|
| ありがとうございます | arigatou gozaimasu | Thank you |
| すみません | sumimasen | Excuse me / sorry (also calls staff over) |
| お願いします | onegai shimasu | Please |
| 英語が話せますか？ | eigo ga hanasemasu ka? | Do you speak English? |
| トイレはどこですか？ | toire wa doko desu ka? | Where is the toilet? |
| これはいくらですか？ | kore wa ikura desu ka? | How much is this? |
| これをください | kore o kudasai | This one, please |
| 大丈夫です | daijoubu desu | I'm fine / no thank you |
| 美味しかったです | oishikatta desu | That was delicious |
| 乾杯 | kanpai | Cheers |

### 15c. Etiquette & practicalities (rendered as a plain list)

- No tipping, anywhere — it can genuinely confuse. Great service is the default.
- Shoes off where you see a genkan step or shoe lockers — restaurants, ryokan, temples, fitting rooms.
- Don't eat while walking; stand aside or find a spot. Drinking from a bottle by the vending machine is fine.
- Trains are quiet: phones on silent, calls wait until you're off.
- Public bins are rare — carry your rubbish home (see the packing list).
- Cash still rules small places; top up IC cards (Suica) at machines with cash. 7-Eleven ATMs take UK cards.
- Stand left on escalators in Tokyo, right in Osaka. You'll be corrected by the crowd either way.
- Onsen: wash and rinse thoroughly *before* the bath; towels stay out of the water; tattoo rules vary — check signs.
- Queue like it's a national sport, because it is: marked lines on platforms, orderly everywhere.
- Convenience stores (konbini) solve most problems: food, coffee, ATMs, toilets, parcel post.
