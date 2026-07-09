export const TRIP_DAY_COUNT = 14

/** Today as a local ISO 'YYYY-MM-DD' string (never UTC — avoids the
 * `toISOString()` timezone-shift trap). Used by the journal composer's date
 * default. */
export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Day number (1–14) for a real date, or null outside the trip window.
 *  Day 1 = Sun 20 Sep 2026. Local-midnight construction + Math.round makes
 *  the maths immune to DST-length days (DATA_MODEL.md §14).
 *
 *  Timezone: deliberately device-local — the trip runs on JST and both
 *  phones will be on JST from landing, so local time is correct exactly
 *  when it matters. Before departure the window check simply returns null
 *  (even the 19 Sep overnight flight: device still says 19 Sep → null →
 *  Day 1 default, which is right). No Intl timezone juggling, no library. */
export function tripDayFor(now: Date): number | null {
  const start = new Date(2026, 8, 20) // local midnight, 20 Sep 2026
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const n = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  return n >= 1 && n <= TRIP_DAY_COUNT ? n : null
}

/** Real calendar date (local midnight) for a trip day number, 1–14. Day 1 =
 * Sun 20 Sep 2026 — the same anchor as tripDayFor, inverted. Used by the
 * weather card to match a selected itinerary day against Open-Meteo's daily
 * forecast entries (DATA_MODEL.md §13, ARCHITECTURE.md §18). */
export function dateForDay(day: number): Date {
  const start = new Date(2026, 8, 20)
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + (day - 1))
}

/** ISO 'YYYY-MM-DD' (local date, not UTC) for dateForDay(day) — matches the
 * format Open-Meteo's `daily.time` entries use. */
export function isoDateForDay(day: number): string {
  const d = dateForDay(day)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

/** Trip day number for an ISO 'YYYY-MM-DD' date string (journal entries store
 * dates this way — DATA_MODEL.md §12a). Parsed as a local date, same anchor
 * as tripDayFor. */
export function tripDayForIso(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return tripDayFor(new Date(y, m - 1, d))
}

/** 'TUE 22 SEP' from an ISO date string — the journal entry-card kicker
 * (DESIGN.md §18.2). */
export function formatIsoDateKicker(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`
}

export interface CurrentSlotResult {
  slotKey: string | null
  status: 'now' | 'next' | null
}

/** The *current* slot is the last parseable slot with time ≤ device now; if
 * none yet (early morning), the first parseable slot is *next*. Slots whose
 * `time` doesn't match /^(\d{1,2}):(\d{2})/ are ignored (DATA_MODEL.md §14). */
export function currentSlotFor(
  slots: { slotKey: string; time: string }[],
  now: Date,
): CurrentSlotResult {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const parsed = slots
    .map((s) => {
      const m = /^(\d{1,2}):(\d{2})/.exec(s.time)
      if (!m) return null
      return { slotKey: s.slotKey, minutes: Number(m[1]) * 60 + Number(m[2]) }
    })
    .filter((s): s is { slotKey: string; minutes: number } => s !== null)

  if (parsed.length === 0) return { slotKey: null, status: null }

  let current: { slotKey: string; minutes: number } | null = null
  for (const s of parsed) {
    if (s.minutes <= nowMinutes) current = s
  }
  if (current) return { slotKey: current.slotKey, status: 'now' }
  return { slotKey: parsed[0].slotKey, status: 'next' }
}
