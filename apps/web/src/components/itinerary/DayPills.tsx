import { ITINERARY_DAYS } from '../../data/itineraryDays'
import { LEG_COLORS } from '../../data/tripEssentials'

/** 14 day pills, mono D1–D14, weekday/date in a tooltip. Active pill is clay;
 * each wears a 3px bottom tick in its leg colour (DESIGN.md §6.2). `todayDay`
 * (from tripDayFor) adds the Today view's clay dot + "· today" tooltip
 * suffix (DESIGN.md §13.1) — marks the date, not the selection, so it shows
 * in both active and inactive states. */
export function DayPills({
  active,
  todayDay,
  onSelect,
}: {
  active: number
  todayDay?: number | null
  onSelect(day: number): void
}) {
  return (
    <div className="flex flex-wrap gap-2 pb-1.5" role="tablist" aria-label="Itinerary day">
      {ITINERARY_DAYS.map((d) => {
        const isActive = d.day === active
        const isToday = d.day === todayDay
        return (
          <button
            key={d.day}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={`${d.date} · ${d.city}${isToday ? ' · today' : ''}`}
            onClick={() => onSelect(d.day)}
            className={`relative rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition ${
              isActive
                ? 'border-clay bg-clay text-paper'
                : 'border-line bg-paper-mid text-ink-soft hover:text-ink'
            }`}
          >
            D{d.day}
            <span
              aria-hidden
              className="absolute inset-x-2 bottom-0.5 block h-[3px] rounded-full"
              style={{ background: LEG_COLORS[d.leg] }}
            />
            {isToday && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1.5 flex justify-center"
              >
                <span className="h-1 w-1 rounded-full bg-clay" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
