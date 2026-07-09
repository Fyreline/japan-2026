# Japan 2026 — Design System

Purpose: the visual + interaction contract for the rebuilt trip site. Direction: **the household's Aizome (藍染) woodblock-print language applied to a travel dashboard** — washi-mint paper, indigo ink, one hanko-crimson accent, hairline borders instead of shadows, calm and legible on a phone in a train station. The pink sakura theme (and its falling-petal animation) is fully replaced. Where Mishka Hub is a cinema lobby and Michi is a walking trail, Japan 2026 is **the paper travel folder**: tickets, maps and a day-planner, printed beautifully.

**Status:** §1–§11 are the shipped visual contract; §12–§18 spec the **feature extension**'s surfaces ([PLAN.md](PLAN.md) Phases 7–13) — strictly within the same tokens, no new colours, ever. Token *values* are read from the canonical Aizome file (`learningLanguageMachine/apps/web/src/theme.css`, mirrored here byte-identical — [ARCHITECTURE.md](ARCHITECTURE.md) §10); this doc never restates hexes (the manifest/icon exception is documented in §12a). Token names are frozen household law.

---

## 1. What is inherited verbatim from the household system

- **Full colour palette**, light and dark: `paper/paper-mid/paper-deep`, `ink/ink-mid/ink-soft`, `line/line-strong`, `clay/clay-deep` (the hanko-crimson accent), `kraft`, `oat`, `cloud`, `olive`, `sky`, `fig`, `liquid`, `viz-1…4`, plus `shadow-float`. The `.dark` block and the `@custom-variant dark (&:where(.dark, .dark *))` mechanism, unchanged.
- **Type stacks**: display `"Schibsted Grotesk Variable"`, serif accent `"Source Serif 4 Variable"`, body `"Inter Variable"`, mono `"JetBrains Mono Variable"`, Japanese `"Noto Sans JP Variable"` — all self-hosted `@fontsource-variable` imports, no CDN (§3).
- **Radii** `sm 4px / md 8px / lg 16px / full`, the spacing scale `4 8 12 16 24 32 40 48 64 96`, **borders-not-shadows elevation** (shadow only for genuinely floating things: map popups, the mobile add-slot sheet), container `max-width: 72rem`.
- **Component specs** for buttons, inputs, cards, pills, toasts, empty states — Mishka DESIGN.md §1e applies unchanged; deltas only are listed in §5.
- **Voice**: Anthropic-calm, British English, sentence case, no exclamation-mark cheerleading, numbers and dates in mono. "Saved on this device — sync failed right now", not "Oops!! 😱".

## 2. Token wiring (`apps/web/src/index.css`)

```css
@import "tailwindcss";

/* Self-hosted fonts — no Google Fonts CDN (household rule) */
@import "@fontsource-variable/schibsted-grotesk";
@import "@fontsource-variable/source-serif-4";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";
@import "@fontsource-variable/noto-sans-jp";

@custom-variant dark (&:where(.dark, .dark *));

/* Colours + shadows live in the SHARED Aizome palette (canonical in the
   Michi repo, mirrored here — see ARCHITECTURE.md §10 / theme-sync). */
@import "./theme.css";

@theme {
  /* type */
  --font-display: "Schibsted Grotesk Variable", "Space Grotesk", Arial, sans-serif;
  --font-serif: "Source Serif 4 Variable", Georgia, serif;
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
  --font-jp: "Noto Sans JP Variable", "Hiragino Sans", "Hiragino Kaku Gothic ProN",
             "Yu Gothic", sans-serif;

  /* radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
```

No colour may be defined in this block — colours live only in `theme.css`. **No hex anywhere else in the app** (components, inline styles, Leaflet divIcons, SVGs — everything resolves `var(--color-*)` or a token utility). This is a review-blocker, restated in [CLAUDE.md](../CLAUDE.md).

## 3. Typography

| Role | Stack | Used for |
|---|---|---|
| Display | `font-display` | header wordmark, tab labels, day headers, section titles; weights 500/700, tracking `-0.005em` |
| Body / UI | `font-sans` | everything by default; 400/500/600 |
| Mono | `font-mono` | slot time labels, dates ("20 SEP – 3 OCT"), tiny tracked kickers (`DAY 4 · FUJI`, 11–12px, +0.08em, uppercase), coordinates, counts |
| Serif accent | `font-serif` | sparingly: the login welcome line ("Two of you, two weeks, one plan."), empty-state one-liners. Never for UI chrome |
| Japanese | `font-jp` | any run of Japanese text in data (ryokan names, しずく); applied via a `jp` utility class on text nodes that can contain CJK — line-height ≥1.4, never letter-spaced |

Scale (rem-based px): `12 → 14 → 16 (body) → 18 → 20 → 24 → 30 → 38`. Body copy 16/1.5; this is a dense dashboard, not an essay — headings 20–24 in-app, 30+ only on the login screen.

## 4. App shell & navigation

- **Header** — sticky, `bg-paper/95`, 1px `border-line` bottom (no blur, no shadow). Left: `ToriiMark` (§8) + wordmark `Japan <span class="text-clay">2026</span>` in `font-display`. Beneath the wordmark on ≥md: the route strip in mono `ink-soft` 12px — `20 SEP – 3 OCT · GLASGOW → TOKYO → FUJI → HIROSHIMA → OSAKA → KYOTO → HOME`. Right: theme toggle (icon button, Mishka spec) + "Sign out" ghost button (hidden in open mode; replaced by a `bg-oat text-ink-mid` "Sign-in off" pill).
- **Desktop tab nav** (≥768px) — a second header row: 11 tabs (**Itinerary · Map · Ideas · Restaurants · Attractions · Animal cafés · Full data · Packing · Journal · Reference · Submit** — the last four before Submit are the extension's additions, [ARCHITECTURE.md](ARCHITECTURE.md) §13b) in `font-display` 14px; inactive `text-ink-soft`, hover `text-ink`, active `text-ink` + 2px `clay` underline (Michi's pattern). Row scrolls horizontally when cramped — with 11 tabs that now extends to roughly 768–1200px, which is fine (it already behaved this way).
- **Mobile bottom nav** (<768px) — fixed bottom bar, `bg-paper/95`, 1px `border-line` top, **5 items, 64px tall, safe-area padded** (Michi's convention): **Plan 🗓 · Map 🗺 · Ideas 💡 · Places ⛩ · Add ➕** — **unchanged by the extension**. **Places** groups the four list views (Restaurants / Attractions / Animal cafés / Full data): tapping it opens the last-used of the four, and on mobile each of those views shows a segmented control at the top to switch between them. This *fixes* the current site's gap where Animal cafés and Full data were unreachable from the mobile nav. The old floating map FAB is dropped — Map has a permanent nav slot now. **The extension makes Plan a group on the identical mechanic**: Plan opens the last-used of Itinerary / Packing / Journal / Reference, and those four views show the same segmented control on mobile (`PLAN_TABS` beside `PLACES_TABS`; `lastPlanTab` beside `lastPlacesTab`). Every shipped item keeps its slot, icon and meaning.
- Tab panels render in a `max-w-6xl` container, gutter 16px mobile / 32px desktop; bottom padding ≥80px on mobile so content clears the nav bar.

## 5. Component specs (deltas from the inherited Mishka §1e)

| Component | Spec |
|---|---|
| **Primary button** | `bg-ink text-paper rounded-md px-4 py-2.5 font-medium`, hover `bg-ink-mid` — inherited. One `bg-clay` accent button max per view ("Sign in", "Add spot", "Add slot") |
| **Card** (`PlaceCard`, essentials, day header) | `bg-paper-mid border border-line rounded-lg p-4`; interactive hover `border-line-strong`; never a resting shadow |
| **Filter pills** | `rounded-full px-3 py-1 text-xs font-medium border border-line bg-paper-mid text-ink-soft`; active `bg-clay text-paper border-clay`. City/leg/category rows `flex-wrap`, never horizontal-scroll |
| **Search input** | inherited input spec, `rounded-full`, search glyph left, `placeholder:text-cloud` |
| **Status/source pills** | ok `bg-olive/15 text-olive`, warn `bg-kraft/20 text-clay-deep`, info `bg-sky/15 text-sky`, "User Submission" badge `bg-oat text-ink-mid` |
| **"Booked ✔" flag** | mono 11px `text-olive`; unbooked hotels `text-ink-soft` "not booked yet" |
| **Toast / inline notice** | bottom-centre `bg-ink text-paper rounded-lg shadow-float` 4s; sync-failure notes render inline under the affected control in `text-kraft` 13px instead |
| **Map popup** | Leaflet popup restyled via CSS: `bg-paper text-ink border-line rounded-lg shadow-float`, title in `font-display`, body 13px, link in `clay` |
| **Map markers** | `L.divIcon` circles 26px, `border: 2px solid var(--color-paper)`, background by layer: Accommodation `ink` 🛌 · Event `clay` ★ · Idea `sky` • · Restaurant `kraft` 🍣 · Attraction `fig` ☆ · Animal café `olive` 🐾. Legend chips in the layer panel use the same tokens |
| **Login screen** | Mishka's `LoginScreen.tsx` layout verbatim: centred `max-w-sm` on `paper`, `ToriiMark` large in clay, wordmark, serif welcome line, email + password inputs (inherited spec), full-width `bg-clay` "Sign in" button, error line in `text-fig`. Footnote in `ink-soft` 13px: "Just the two of you — same accounts as always." |

## 6. The itinerary tab (signature surface)

Adopts the owner's prototype interaction model, re-clothed in Aizome. Anatomy, top to bottom:

1. **Trip essentials** — a collapsible row of small cards (flights / cash / rail / eSim / car), `bg-paper-mid border-line rounded-lg`, title emoji + `font-display` 14px, body 13px `ink-mid`. Collapsed by default on mobile ("Trip essentials ▸").
2. **Day pills** (`DayPills`) — 14 pills, `rounded-full`, mono label `D1`–`D14` with the weekday/date in a tooltip/subline; inactive `bg-paper-mid border-line text-ink-soft`; active `bg-clay text-paper`. Each pill wears a 3px bottom tick in its **leg colour**: Tokyo `clay` · Fuji `sky` · Hiroshima `fig` · Osaka `kraft` · Kyoto `olive` · Home `cloud` (`LEG_COLORS`, DATA_MODEL.md §5). Wraps to two rows on mobile.
3. **Day header** (`DayHeader`) — card with mono kicker `DAY 4 · WED 23 SEP · FUJI`, display title (city), hotel line with booked flag. Left border 3px in the leg colour.
4. **Slot list** (`SlotList` → `SlotRow`) — the day's slots ordered by `position`. Slot anatomy (min-height 48px, `bg-paper-mid border border-line rounded-md`, 8px gap):
   - **Type edge**: 4px full-height left edge, colour by `type` — the exact mapping is law:

     | Slot type | Token | Rationale |
     |---|---|---|
     | `travel` | `sky` | steel blue — movement, transit |
     | `food` | `kraft` | warm terracotta — meals |
     | `culture` | `fig` | plum — temples, museums, districts |
     | `free` | `olive` | teal-green — free time, onsen, wandering |
     | `sleep` | `cloud` | muted — wind-down |
     | `surprise` | `clay` | the hanko crimson — a sealed stamp 🤫 |
     | `default` | `ink-soft` | neutral indigo |

     No new hexes, ever — these are existing Aizome tokens.
   - **Time label**: mono 12px `ink-soft`, fixed 56px column, right-aligned.
   - **Text**: 14px `ink`, editable in place (focus ring `2px clay` offset 2px; commit on blur / 600 ms debounce). A small type-dot button before the text cycles/edits the slot's `type` and `time` via a tiny inline popover.
   - **Drag handle**: `⠿` glyph, 44×44px touch target, `text-cloud`, hover `text-ink-soft`, `cursor-grab`. dnd-kit: dragged row lifts with `shadow-float` + `border-clay`; drop gap indicated by a 2px `clay` line. Keyboard sorting (space + arrows) comes free with `@dnd-kit/sortable` — keep the default announcer strings.
   - **Remove**: ✕ ghost button, visible on hover/focus (always visible on touch), `text-cloud` hover `text-fig`, with a 5s undo toast.
   - **Surprise slot extra**: on top of its clay edge, a faint `bg-clay/8` tint across the row — special, but quiet. No other slot type gets a background.
5. **Add slot** (`AddSlotRow`) — full-width dashed `border-line-strong rounded-md` row, "＋ Add a time slot" in `ink-soft`; expands inline to time input (mono) + type select + text input + "Add" primary button. No `prompt()` dialogs (the prototype's placeholder mechanic dies here).
6. **Sync whisper** — a one-line mono 11px `ink-soft` status under the list: "Synced just now" / "Saved on this device — sync failed right now" (`text-kraft`) / "Local only — sign-in off" (open mode).

## 7. Browse tabs & map

- **Ideas** — leg filter pills + search; entries grouped by city → suburb with mono kickers (`TOKYO · SETAGAYA`); `PlaceCard` shows title, tag pill, cost in mono, description, "See on map" ghost button (switches to Map, flies to pin, opens popup — port of the current behaviour).
- **Restaurants / Attractions / Animal cafés** — city pills + category pills (collapsible "Categories" toggle preserved) + search; cards add rating/cuisine/wait/booking lines, links out in `clay`.
- **Full data** — everything (curated + submissions) in one searchable list grouped by city, category filter row with sub-category toggle — feature parity with today, restyled.
- **Map** — full-bleed within the panel, height `calc(100dvh - chrome)` on mobile, 560px desktop; CARTO light tiles (dark mode: CARTO `dark_all` — the one theme branch allowed outside tokens, chosen by `useTheme`); layer-toggle panel as a `bg-paper/95 border-line rounded-lg` floating card (collapsible, current behaviour); 5 layers per §5's marker table; route polyline between overnight stops in `ink-soft`, dashed.

## 8. Decorative motif — the seigaiha band (replaces the sakura petals)

**One motif, used twice, never animated.** The pink falling-petal animation is deleted with the old theme. Its replacement is **seigaiha (青海波) — the classic woodblock "blue ocean wave" print pattern of overlapping concentric arcs**, which sits squarely in the Aizome indigo register and nods to the flight over the Pacific:

- Construction: an inline SVG `<pattern>` of concentric semicircle strokes (3 rings per scallop, stroke `currentColor`, fill none), tiled horizontally; rendered in a 14px-tall band.
- Placement (exactly two): (1) the bottom edge of the header, directly under the border hairline; (2) above the footer line. Colour `text-sky` at 20% opacity light / 25% dark — present when you look, invisible when you don't.
- The **ToriiMark** (site mark): a flat two-post torii silhouette drawn with the same weight as Mishka's cat mark, `currentColor` (renders `clay` in the header/login, follows theme), also exported flat as `public/torii-icon.svg` with hardcoded accent/paper hexes **only there** (favicons can't read CSS vars — same documented exception as the siblings').
- Empty states may reuse a single large seigaiha scallop as a quiet illustration; nothing else decorative anywhere. No gradients, no clipart, no animation loops.

## 9. Dark mode & contrast

- Mechanism per [ARCHITECTURE.md](ARCHITECTURE.md) §9: `.dark` on `<html>`, token substitution only, `ThemeToggle` port, `localStorage('japan-theme')`, OS preference on first visit, pre-paint script.
- The Aizome `.dark` block already carries lifted values (crimson `clay` lightens, `sky` becomes the pale cyan lead). Requirements to verify on this app's surfaces, both themes, **≥4.5:1**:
  - body text (`ink` on `paper`, `ink-mid` on `paper-mid`);
  - `paper` text on `clay` (primary/accent buttons, active pills);
  - slot time labels (`ink-soft` on `paper-mid`);
  - every slot-edge colour vs `paper-mid` needs only **3:1** (non-text UI), but the same colours used *as text* (e.g. legend labels) need 4.5:1 — use `text-ink` labels beside colour dots rather than coloured text where in doubt;
  - map markers keep their 2px `paper` ring in both themes so pins read on both tile sets.
- Fixes go in the canonical theme.css via the theme-sync discipline (values only, light+dark together, all three apps rebuilt) — never as a local component override.

## 10. Motion

Almost none — this app is calm paper:

- dnd-kit's drag lift/settle (its default 200ms transforms) is the only signature motion.
- Tab/day switches: 120ms opacity. Toasts: 150ms slide-fade.
- `prefers-reduced-motion: reduce`: the global collapse rule from the siblings' `index.css` (animations/transitions → 0.01ms) ships from day one; drag still works, just without the easing.

## 11. Acceptance criteria

- [ ] Every colour on every screen resolves to an Aizome token (spot-check computed styles); `clay` is the only saturated accent per view; zero hex literals outside `theme.css` (+ the favicon exception).
- [ ] `theme.css` is byte-identical to the canonical Michi copy (`diff` clean).
- [ ] Dark mode repaints every surface via the `.dark` token block — no `dark:` colour-class hunting in components (the CARTO tile-set swap is the sole allowed branch); no flash on load.
- [ ] Header, tabs, mobile bottom nav, cards, pills, inputs match §4–§5 including focus rings (keyboard-only walkthrough).
- [ ] Itinerary slots render the §6 type→token mapping exactly; the day-3 surprise slot shows clay edge + tint and its seed text.
- [ ] Drag-reorder works with touch, mouse **and** keyboard; drop indicator and lift shadow per §6.4.
- [ ] The seigaiha band appears in exactly two places, static, in `sky` at the specified opacity; no sakura/pink remnants anywhere; ToriiMark legible at 16px favicon size.
- [ ] Japanese strings render in Noto Sans JP (self-hosted; no runtime font fetch in the network panel).
- [ ] Contrast: §9's checklist passes at ≥4.5:1 (text) / ≥3:1 (UI) in both themes.
- [ ] `prefers-reduced-motion` collapses all transitions; the app stays fully usable.
- [ ] Lighthouse a11y ≥ 95 on Itinerary, Map, Ideas: labels on all icon buttons, the slot list keyboard-sortable, live region announces sync failures.

Extension additions to this checklist (surfaces specced in §12–§18):

- [ ] Every extension surface (packing, journal, reference, weather card, visited toggles, offline banner, update toast) resolves only Aizome tokens; the manifest/icon hexes are confined to the §12a exception files.
- [ ] The mobile bottom nav still shows exactly the five shipped items; Plan's segmented control reaches all four grouped views; desktop shows all 11 tabs.
- [ ] Visited dimming keeps card text ≥4.5:1 in both themes (dim via `text-ink-soft`/opacity on decoration, never below-contrast body text).
- [ ] The `jp` utility is applied to every Japanese run in the Reference phrases and journal/packing user text can accept CJK (font-jp fallback chain holds).
- [ ] Installed-app splash/status bar read as paper, both platforms; the app icon is legible at home-screen size next to the siblings' marks.
- [ ] Lighthouse a11y ≥ 95 extends to Packing, Journal and Reference; the offline banner and update toast are announced via live regions.

## 12. PWA surfaces (extension)

The chrome the installed app wears. Mechanics in [ARCHITECTURE.md](ARCHITECTURE.md) §14 — this section is only what it looks like.

### 12a. App icon & manifest colours

- The icon set (§14e construction table) is drawn **from the existing favicon geometry**: clay torii on a paper ground, nothing added — the home-screen icon is the favicon, grown up. Maskable variant keeps all strokes inside the central 80%; the apple-touch-icon is opaque, full-bleed paper, square (iOS rounds it).
- **Hex exception, extended and bounded:** the favicon SVG exception (§8) now covers exactly three artefacts — `public/torii-icon.svg`, the generated PNG icon set (via `scripts/generate-pwa-icons.mjs`'s two constants), and the manifest's `theme_color`/`background_color` in `vite.config.ts`. All carry a comment naming this section. Anywhere else, hexes remain a review-blocker.
- Splash (iOS derives it): `background_color` paper + centred icon — calm, no wordmark, no gradient.

### 12b. Offline banner (`OfflineBanner`)

A slim strip directly under the header (above the tab row's content, never floating): `bg-oat text-ink-mid`, 12px `font-sans`, py-1.5, centred — "Offline — showing the last synced copy". Appears/disappears on the `online`/`offline` events with the standard 150ms fade; `role="status"` so it's announced. No icon, no dismiss button — it isn't an error, it's a state of the world. It coexists with the itinerary's sync whisper (§6.6), which stays the per-surface truth about writes.

### 12c. Update toast (`UpdateToast`)

The inherited toast spec (§5) verbatim: bottom-centre, `bg-ink text-paper rounded-lg shadow-float` — "A new version is ready" with a single **Refresh** text button in `clay`'s dark-legible pairing (`text-paper` underlined on `bg-ink` is fine; no second accent). It does **not** auto-dismiss (unlike 4s toasts — an update prompt should wait), stacks above the mobile nav, and dismissing (✕) simply defers to next launch. Never interrupts an in-progress edit: it renders, it doesn't reload.

## 13. Today view highlights (extension)

Behaviour in [ARCHITECTURE.md](ARCHITECTURE.md) §15; the visual layer is three quiet touches, all reusing §6's vocabulary:

1. **Today's day pill**: when `tripDayFor(now)` matches a pill, that pill gains a 4px `clay` dot centred under its leg tick (visible in active *and* inactive states — it marks the date, not the selection). Tooltip/subline text gains "· today".
2. **The "now" slot marker**: the current slot's row (§15's parse rules) gets a `border-line-strong` border upgrade plus a mono 11px `text-clay` "NOW" kicker right-aligned in the time column, under the time label. The *next* slot (when no slot has started yet) gets "NEXT" in `text-ink-soft` instead. No background tint — the surprise slot (§6.4) keeps its monopoly on row tints.
3. **The auto-scroll**: one-shot, `block: 'center'`; under `prefers-reduced-motion` it jumps without smooth scrolling. Never repeats while the tab stays mounted.

## 14. Visited toggle & visited cards (extension)

- **`VisitedToggle`** renders in `PlaceCard`'s top-right column (with cost/links): a 24px circular ghost button, `border border-line-strong text-cloud`, hover `text-ink-soft`; visited state `bg-olive border-olive text-paper` with a 14px tick glyph. `aria-pressed` + label "Mark as visited"/"Visited — tap to unmark". Touch target padded to 44px (invisible hit area, same trick as the slot handle).
- **Visited card state**: the card stays fully readable — dimming is decoration-only. The title colour drops to `text-ink-soft` (no strikethrough — visited places still get talked about), the card border stays `border-line`, and a **"Visited" pill** in the §5 ok-style (`bg-olive/15 text-olive`, 11px) joins the meta pills row. Body text, fields and links keep their shipped colours; contrast is never sacrificed to a status.
- Appears on Ideas, Restaurants, Attractions, Animal cafés and Full data cards; **not** on accommodations/events (DATA_MODEL.md §10a) and not on map popups (the popup stays read-only; the list is the management surface).
- Optimistic flip, instant; failures use the standard quiet inline note pattern (§5 toasts/notes).

## 15. Packing checklist (extension)

`PackingPage` deliberately reads as "the itinerary's calmer sibling" (the household's muscle memory, minus the machinery):

1. **Header row**: display-font title "Packing", right-aligned mono 12px `text-ink-soft` whole-trip count — "14 of 24 packed".
2. **Category groups** in DATA_MODEL.md §11a order, each: mono kicker (`DOCUMENTS`, 11–12px, +0.08em, uppercase, `text-ink-soft`) + per-category count ("3 of 6", mono 11px) + its items.
3. **`PackingRow`** (mirrors `SlotRow` minus time/type-edge/drag): min-height 44px, `bg-paper-mid border border-line rounded-md`, 8px gap. Anatomy: **checkbox** — 20px `rounded-sm border border-line-strong bg-paper`; checked `bg-olive border-olive` with a `paper` tick; the whole row is the tap target (label wraps the row), 150ms fill transition. **Label** — 14px `text-ink`, editable in place exactly like slot text (focus ring `2px clay`, blur/600ms commit); checked items drop to `text-ink-soft` — **no strikethrough** (a packed passport still needs to be findable in the list at 5 a.m.). **Remove** — the §6.4 ✕ ghost button verbatim, with the 5s undo toast.
4. **`AddItemRow`** per category: the §6.5 dashed composer, simplified — text input + "Add" primary button only (no time, no type). New items append at the category's end.
5. **No drag handles** (DATA_MODEL.md §11e — schema-ready, UI deliberately omitted). No section collapse either: ~24 items don't earn it.
6. **Sync whisper**: the §6.6 line, verbatim component, under the last group.

## 16. Weather card (extension)

One compact card, rendered between `DayHeader` and the slot list, only when the selected day's leg has a city (never for day 14 / `Home`). Anatomy — a single `bg-paper-mid border border-line rounded-lg px-4 py-3` row:

- Left: condition emoji (20px) + current temp in `font-display` 20px `text-ink` ("21°") + condition label 13px `text-ink-mid` ("Mostly clear").
- Right, mono 12px `text-ink-soft`, one line: `H 24° · L 17° · ☂ 30%` (high/low + rain chance for the shown day; the rain figure only when the API returns one).
- Kicker above the row content, mono 11px uppercase `text-ink-soft`: `TOKYO · TODAY` / `TOKYO · WED 23 SEP` (selected-day forecast, when within the horizon) / `TOKYO · RIGHT NOW` (current-conditions fallback, e.g. pre-trip). Stale-cache state appends "· as of 14:20" in `text-kraft`.
- **States it does not have**: no loading spinner (renders nothing until first data), no error state (hides — [ARCHITECTURE.md](ARCHITECTURE.md) §18), no tap/expand behaviour. Emoji come from the DATA_MODEL.md §13b table; no icon font, no images, no new colours.

## 17. Quick-reference page (extension)

Static content ([DATA_MODEL.md](DATA_MODEL.md) §15 is canonical — implementation transcribes, never rewrites), presented as three sections in one column (`max-w-2xl` — it's reading matter, not a dashboard):

1. **Emergency** — a `bg-paper-mid border border-line rounded-lg p-4` card, deliberately first and unmissable: the two numbers set huge in `font-mono` (30px, `text-ink`) with 13px labels — **110** Police · **119** Fire / ambulance — plus the note line, and the gov.uk link (standard `clay` link, labelled "UK travel advice for Japan — check before you go, including embassy contact"). No other card on this page uses numbers this large; hierarchy is the safety feature.
2. **Phrases** — the §15b table as rows: Japanese in `font-jp` 16px `text-ink` (the one place the app sets Japanese *as content*, so the `jp` utility is mandatory), rōmaji in `font-mono` 12px `text-ink-soft`, English 13px `text-ink-mid`. Row dividers `border-line`; no card-per-phrase (it's a crib sheet, density is the point).
3. **Etiquette & practicalities** — the §15c list as plain 14px `text-ink-mid` bullets with `text-ink-soft` markers. No emoji bullets, no illustration — one seigaiha scallop empty-state motif is permitted at the foot of the page (§8's "quiet illustration" clause), nothing else.

Tone check is part of review: practical, calm, British English, zero exclamation marks — the §15 content already complies; don't "improve" it.

## 18. Journal (extension)

`JournalPage`, top to bottom:

1. **`EntryComposer`** (top, always visible — writing tonight's entry is the primary act mid-trip): a `bg-paper-mid border border-line rounded-lg p-4` card with a date input (inherited input spec, `font-mono`, defaults to today), a 3-row auto-growing textarea (placeholder: "What happened today?" — serif is *not* used here; body font, it's an input), a **photo attach** ghost button ("＋ Photo", `text-ink-soft`, hidden in open mode) showing a 64px `rounded-md` thumbnail preview with a ✕ once chosen, and one primary "Add entry" button (`bg-clay` — this page's single accent, §5 rule). A quiet mono 11px note under the composer: "Photos are resized on your phone before upload." Upload-in-flight: the thumbnail at 50% opacity with the standard inline note — no progress bars.
2. **Entry list**, newest first, grouped by date. **`EntryCard`**: `bg-paper-mid border border-line rounded-lg p-4`; mono kicker `TUE 22 SEP · DAY 3` (day number only when the date is inside the trip window — DATA_MODEL.md §12a); body 14px `text-ink` `leading-relaxed`; photo (when present) below the text as `rounded-md w-full max-h-80 object-cover`, `loading="lazy"`, `bg-paper-deep` placeholder while the signed URL resolves. Offline with an uncached photo: the placeholder simply stays — no broken-image state.
3. **Edit/delete**: an "Edit" ghost button per card swaps the card into composer mode in place (same fields); delete is the ✕-with-5s-undo pattern (§6.4) — the undo restores text + `photoPath` (the object survives deletion attempts until the row goes; ARCHITECTURE.md §19).
4. **Empty state**: serif one-liner (§3's sanctioned use) — "The first page is yours." — over a single seigaiha scallop.
5. **Sync whisper**: §6.6 line at the foot. No attribution anywhere on any surface — no names, no initials, no "who wrote this" affordance of any kind (house law).
