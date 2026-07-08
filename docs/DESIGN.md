# Japan 2026 — Design System

Purpose: the visual + interaction contract for the rebuilt trip site. Direction: **the household's Aizome (藍染) woodblock-print language applied to a travel dashboard** — washi-mint paper, indigo ink, one hanko-crimson accent, hairline borders instead of shadows, calm and legible on a phone in a train station. The pink sakura theme (and its falling-petal animation) is fully replaced. Where Mishka Hub is a cinema lobby and Michi is a walking trail, Japan 2026 is **the paper travel folder**: tickets, maps and a day-planner, printed beautifully.

**Status: planned.** Token *values* are read from the canonical Aizome file (`learningLanguageMachine/apps/web/src/theme.css`, mirrored here byte-identical — [ARCHITECTURE.md](ARCHITECTURE.md) §10); this doc never restates hexes. Token names are frozen household law.

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
- **Desktop tab nav** (≥768px) — a second header row: 8 tabs (**Itinerary · Map · Ideas · Restaurants · Attractions · Animal cafés · Full data · Submit**) in `font-display` 14px; inactive `text-ink-soft`, hover `text-ink`, active `text-ink` + 2px `clay` underline (Michi's pattern). Row scrolls horizontally if cramped between 768–900px.
- **Mobile bottom nav** (<768px) — fixed bottom bar, `bg-paper/95`, 1px `border-line` top, **5 items, 64px tall, safe-area padded** (Michi's convention): **Plan 🗓 · Map 🗺 · Ideas 💡 · Places ⛩ · Add ➕**. Active item: `clay` icon + label; inactive `ink-soft`. **Places** groups the four list views (Restaurants / Attractions / Animal cafés / Full data): tapping it opens the last-used of the four, and on mobile each of those views shows a segmented control at the top to switch between them. This *fixes* the current site's gap where Animal cafés and Full data were unreachable from the mobile nav. The old floating map FAB is dropped — Map has a permanent nav slot now.
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
