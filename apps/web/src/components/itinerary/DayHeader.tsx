import type { ItineraryDay } from '../../data/types'
import { LEG_COLORS } from '../../data/tripEssentials'

/** Card with mono kicker "DAY 4 · WED 23 SEP · FUJI", display title (city),
 * hotel line with booked flag. Left border 3px in the leg colour
 * (DESIGN.md §6.3). */
export function DayHeader({ day }: { day: ItineraryDay }) {
  const kicker = `DAY ${day.day} · ${day.date.toUpperCase()} · ${day.leg.toUpperCase()}`

  let hotelLine: React.ReactNode = null
  if (day.hotel) {
    hotelLine = (
      <p className="mt-1 text-sm text-ink-mid">
        🛌 {day.hotel}{' '}
        {day.hotelBooked ? (
          <span className="font-mono text-[11px] text-olive">✔ booked</span>
        ) : (
          <span className="font-mono text-[11px] text-ink-soft">not booked yet</span>
        )}
      </p>
    )
  } else if (day.leg !== 'Home') {
    hotelLine = (
      <p className="mt-1 text-sm text-ink-soft">🛌 Stay to be booked</p>
    )
  }

  return (
    <div
      className="rounded-lg border border-line bg-paper-mid p-4"
      style={{ borderLeft: `3px solid ${LEG_COLORS[day.leg]}` }}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">{kicker}</p>
      <h2 className="mt-1 font-display text-lg font-medium text-ink">{day.city}</h2>
      {hotelLine}
    </div>
  )
}
