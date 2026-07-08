import type { Leg, TripEssential, TripIdea } from './types'

// Trip essentials — flights, cash, rail, eSim, car (DATA_MODEL.md §5). Ported
// verbatim from the current index.html `tripEssentials`. Flight times are
// already public; no finances beyond the already-public ryokan price appear
// anywhere.
export const TRIP_ESSENTIALS: TripEssential[] = [
  {
    title: '✈️ Flights',
    body: 'Out: Heathrow 19 Sep 09:25 → Haneda 20 Sep 07:00. Back: Haneda 3 Oct 08:55 → Heathrow 3 Oct 15:45.',
  },
  {
    title: '💴 Cash',
    body: 'Carry ~¥20,000 at all times — lots of places are still cash-only.',
  },
  {
    title: '🚄 Rail',
    body: 'Grab Suica / Welcome Suica cards for trains, buses and konbini.',
  },
  {
    title: '📶 eSim',
    body: 'Sort a data eSim before you fly (e.g. Journey Japan).',
  },
  {
    title: '🚗 Car (Fuji leg)',
    body: 'International Driving Permit + travel & driving insurance required. Get an ETC card for tolls. ~£40/day + fuel; one-way drop-off at Nagoya (Nippon Rent-A-Car).',
  },
]

// Leg → Aizome token (DATA_MODEL.md §5, DESIGN.md §6). The current site's pink
// hexes are deleted — these resolve `var(--color-*)` so they follow the theme
// and never hardcode a colour. Used as inline `borderColor` / `background`.
export const LEG_COLORS: Record<Leg, string> = {
  Tokyo: 'var(--color-clay)',
  Fuji: 'var(--color-sky)',
  Hiroshima: 'var(--color-fig)',
  Osaka: 'var(--color-kraft)',
  Kyoto: 'var(--color-olive)',
  Home: 'var(--color-cloud)',
}

// City / district → trip leg (DATA_MODEL.md §3).
export const LEG_MAP: Record<string, Leg> = {
  Tokyo: 'Tokyo',
  Fuji: 'Fuji',
  Hakone: 'Fuji',
  Kyoto: 'Kyoto',
  Hiroshima: 'Hiroshima',
  Osaka: 'Osaka',
  Nara: 'Kyoto',
}

/** `leg` derives as LEG_MAP[city] ?? city (port of the current site). */
export function getIdeaLeg(idea: TripIdea): Leg {
  return idea.leg ?? LEG_MAP[idea.city] ?? (idea.city as Leg)
}
