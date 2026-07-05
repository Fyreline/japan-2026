# Japan 2026 🇯🇵

Our trip-planning dashboard, recreated from the coworker's Japan site but with our own
itinerary, ideas and stops. 20 Sep – 3 Oct 2026: Tokyo → Fuji → Hiroshima → Osaka → Kyoto → home.

## What's here

| File | What it is |
|------|------------|
| `index.html` | The whole site — map, itinerary, ideas, restaurants, attractions, animal cafes, submit form. Just open it. |
| `config.js` | The **only** file to edit to switch on shared syncing (see below). |
| `restaurants.json` / `attractions_by_location.json` / `animal_cafes.json` | The place data shown on the Restaurants / Attractions / Animal Cafes tabs. Edit these to add or change places. |
| `SUPABASE_SETUP.md` | 5-minute guide to turn on shared syncing between our phones. |
| `OfflineExample.html` | The coworker's original, kept for reference. |
| `Japan Itinerary/` | Our Google Sheet export (source for the itinerary). |

## Tabs

- **Itinerary** — day-by-day plan with hotels, travel and trip essentials (cash, Suica, eSim, car).
- **Map view** — every hotel, event, idea, restaurant, attraction and cafe as a pin. Toggle layers top-right.
- **Ideas** — all the spots from our planning notes, filterable by leg (Tokyo / Fuji / Hiroshima / Osaka / Kyoto).
- **Restaurants / Attractions / Animal Cafes** — curated place lists with search + filters.
- **Full data** — everything in one searchable place, grouped by city.
- **Submit** — add a new spot from your phone; it appears on the map and tabs instantly.

## Running it

It's a plain static site — no build step.

- **Quickest:** double-click `index.html`. (The Submit form still works and saves locally; the
  Restaurants/Attractions/Animal-Cafes tabs need it served over http — see next.)
- **Served locally (recommended):** from this folder run `python3 -m http.server 8123`
  then open <http://localhost:8123/index.html>.

## Login + shared syncing (Supabase)

Out of the box the site runs in **open mode**: no login, and spots you add save only on the
device that added them (you'll see a small "Sign-in off" note in the header).

Follow **`SUPABASE_SETUP.md`** (free, ~10 min) to switch on:
- a **real sign-in** so only the two of you can open the site, and
- **shared spots** that sync live across both phones.

You paste two values into `config.js` and the login screen turns on automatically.

## What's kept private (don't publish these)

`.gitignore` already excludes them, but for the record — these are **not** committed:
- `OfflineExample.html` — contains the coworker's Supabase keys.
- `Japan Itinerary/` — finances, flight details, and the 22nd surprise.
- `.DS_Store`, `.claude/`.

The app files (`index.html`, `config.js`, the JSONs) contain no secrets. The anon key you'll
add to `config.js` is safe to publish (it's protected by row-level security).

## Putting it online (GitHub Pages)

1. Do the `SUPABASE_SETUP.md` steps first so the live site is gated by login.
2. `git init` in this folder, commit (the `.gitignore` keeps the private stuff out), and push
   to a new GitHub repo.
3. Repo **Settings → Pages → Deploy from branch → `main` / root**.
4. Your site goes live at `https://<your-username>.github.io/<repo>/`.

> Heads-up: on a **public** repo the itinerary/ideas are readable in the source even though the
> live site asks for a login. For those to be private too, make the GitHub repo **private**
> (GitHub Pages on a private repo needs a paid plan; otherwise host it privately like MishkaHub).
