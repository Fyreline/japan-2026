# Japan 2026 🇯🇵

Our trip-planning dashboard: map, day-by-day itinerary, ideas, restaurants, attractions,
animal cafés, a packing checklist, a shared trip journal and a submit-a-spot form.
20 Sep – 3 Oct 2026: Tokyo → Fuji → Hiroshima → Osaka → Kyoto → home.

A React + Vite + TypeScript + Tailwind SPA, wearing the same "Aizome" indigo-and-crimson
look as our other two household apps. It talks straight to Supabase — so it's a static
site with a login gate and a handful of live-syncing tables. The one small exception is
a tiny sign-in helper (see "One login for all three apps" below) that lets it share a
login with the other two apps; it's only involved at the moment you sign in. It's
also an installable app: **Add to Home Screen on iOS** and it works offline, showing
the last-synced plan with no signal.

## Tabs

- **Itinerary** — day-by-day plan: trip essentials (cash, Suica, eSim, car), day pills,
  and an editable list of time slots per day. Type, drag to reorder, add or remove a
  slot and it syncs to the other phone within a second when you're both signed in.
  Opens on today's day automatically once the trip starts, with a weather card and a
  "now" marker on the current slot.
- **Map** — every hotel, event, idea, restaurant, attraction and animal café as a pin,
  toggleable by layer.
- **Ideas** — the planning-notes spots, filterable by leg (Tokyo / Fuji / Hiroshima /
  Osaka / Kyoto).
- **Restaurants / Attractions / Animal cafés** — curated place lists with search + filters.
  Every place card has a tick to mark it visited, shared between you both.
- **Full data** — everything in one searchable place, grouped by city.
- **Packing** — a shared checklist, grouped by category, seeded with the essentials.
- **Journal** — a shared trip diary: a note (and an optional photo) per day, newest
  first.
- **Reference** — emergency numbers, ten handy phrases and local etiquette notes —
  works even with no signal.
- **Submit** — add a new spot from your phone; it appears on the map and tabs instantly.

## Running it locally

```bash
cd apps/web
npm install
npm run dev
```

Opens on <http://localhost:5175>. No `.env.local` needed to get started — the site runs
in **open mode**: no login, and anything you add or edit saves only to that browser (a
small "Sign-in off" pill shows in the header). This is the permanent, zero-setup fallback,
not just a placeholder.

To turn on real sign-in and cross-device sync, follow **`SUPABASE_SETUP.md`** (free,
~10 minutes) and add the two values it gives you to `apps/web/.env.local` (copy
`apps/web/.env.example` as a starting point — that file is gitignored, so your keys never
get committed).

```bash
npm run typecheck   # must stay clean
npm run build        # must stay clean
```

## One login for all three apps

You sign in here with the **same email and password as the other two household apps** —
one login, shared everywhere, and a password change made in the movie app applies here
automatically, with nothing to update on this side.

The way it works: a small helper server (`apps/server`) checks your password with the
movie app's login, then hands this site a normal Supabase session and steps out of the
way. It's only involved for the second or two it takes to sign you in — once you're in,
the app talks to Supabase directly, exactly as before, even if the home machine is off.
So if you ever see "Mishka Hub isn't reachable" on the sign-in screen, the app hasn't
broken: your phone just can't reach home *right now*, and anyone already signed in is
completely unaffected (full detail: `docs/AUTH.md` and `docs/ARCHITECTURE.md` §20).

To run the helper locally for development:

```bash
cd apps/server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env    # then fill in the real values — see below
.venv/bin/uvicorn app.main:app --port 8103
```

Its `.env` (gitignored — never commit it) needs four values: `MISHKA_BASE_URL` (where the
movie app's API lives, normally `http://127.0.0.1:8000`), `SUPABASE_URL` and
`SUPABASE_ANON_KEY` (the same two public values the web app uses), and
`SUPABASE_SERVICE_ROLE_KEY` — the one genuinely secret value, from the Supabase
dashboard. That last key must never leave the `.env` file: not in git, not in the web
app, not in a screenshot. Point the web app at your local helper by adding
`VITE_AUTH_API_BASE=http://127.0.0.1:8103` to `apps/web/.env.local`.

In production nothing needs starting by hand: the helper runs on the household machine
as a LaunchAgent (port 8102) behind our Cloudflare Tunnel at
`japan-api.mishka-hub.com`, and the live site uses it automatically.

## Repo layout

```
apps/web/              # the app — everything above lives here
  src/
    components/         # shell, tabs, cards; itinerary/, packing/, journal/,
                        #   reference/ subfolders
    data/                # datasets: accommodations, ideas, trip essentials,
                         #   itinerary days + seed, packing seed, quick
                         #   reference content, and the three curated JSON files
    hooks/               # useSubmittedSpots, useItinerary, useVisited,
                        #   usePacking, useJournal, useWeather, useTheme, useOnline
    auth/                # the Supabase sign-in gate
    lib/                 # Supabase client, weather fetch, journal photo compression
  scripts/               # generate-pwa-icons.mjs (see below)
  public/                # app icons, manifest assets
apps/server/            # the sign-in helper — checks your password with the movie
                        #   app, hands back a Supabase session (docs/AUTH.md)
supabase/migrations/    # the SQL behind every Supabase table + the journal photo
                        #   bucket, for the record
docs/                   # the build spec — architecture, data model, API, design, deployment
```

## The installed app (PWA)

The site is installable: on iOS, Safari → Share → **Add to Home Screen** gives it its
own icon and a standalone window (no Safari address bar), and it keeps working with no
signal — the last-synced itinerary, packing list, journal text and any previously-viewed
photos and map tiles all render offline. When we ship an update while the app is open,
a quiet "new version ready" toast appears — it only refreshes when you tap it, never
mid-edit.

If the torii mark ever changes, regenerate the home-screen icon set with:

```bash
cd apps/web
npm run generate-pwa-icons
```

This overwrites the four PNGs in `apps/web/public/` from `public/torii-icon.svg`'s
geometry — commit the results.

## Editing the place data

`apps/web/src/data/restaurants.json`, `attractions_by_location.json` and
`animal_cafes.json` are the curated lists behind those three tabs. Edit one of those files,
commit, push to `main` — GitHub Actions rebuilds and redeploys automatically, no other
steps.

The Ideas list and the accommodations/events layer are TypeScript files in the same folder
(`ideas.ts`, `accommodations.ts`) rather than JSON, since they're small and rarely change —
same edit → push → deploy flow.

The itinerary's starting content lives in `itineraryDays.ts` (the 14 days' dates/city/hotel)
and `itinerarySeed.ts` (the starting time slots). The packing checklist's starting items
live in `packingSeed.ts`, and the Reference tab's content in `quickReference.ts`. Once a
table has been seeded in Supabase, edits made live in the app take over — a seed only
applies once, to an empty table.

## What's kept private (don't publish these)

`.gitignore` already excludes them, but for the record — these are **not** committed:
- `OfflineExample.html` — a third party's reference site containing their own Supabase keys.
- `Japan Itinerary/` — a spreadsheet export with finances, flight logistics, and the 22nd.
- `apps/web/.env.local` — your local Supabase credentials.
- `apps/server/.env` — the sign-in helper's credentials, including the service-role key
  (the one real secret in the whole setup — it never goes anywhere but this file).
- `node_modules/`, `apps/web/dist/`, `.DS_Store`, `.claude/`.

Everything else in the repo — including the itinerary seed text and the curated
datasets — contains no secrets and no real names. The one genuinely private fact (what's
happening on the evening of the 22nd) is never written into any file, in this repo or
anywhere else — it only ever exists as something the two of you type directly into the
gated, signed-in app.

## Putting it online (GitHub Pages)

The live site deploys automatically via `.github/workflows/deploy-pages.yml` on every push
to `main`, once repo **Settings → Pages → Source** is set to **GitHub Actions** and the two
`VITE_SUPABASE_*` repo variables are set (see `SUPABASE_SETUP.md` step 7). It publishes to
`https://fyreline.github.io/japan-2026/`.

> Heads-up: on a **public** repo the curated datasets and itinerary seed are readable in
> the built source even though the live site asks for a login — only the two Supabase
> tables are actually gated. If you want the itinerary content itself private too, make
> the GitHub repo **private** (GitHub Pages on a private repo needs a paid plan).
