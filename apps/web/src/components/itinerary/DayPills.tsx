import { ITINERARY_DAYS } from '../../data/itineraryDays'
import { LEG_COLORS } from '../../data/tripEssentials'

/** 14 day pills, mono D1–D14, weekday/date in a tooltip. Active pill is clay;
 * each wears a 3px bottom tick in its leg colour (DESIGN.md §6.2). */
export function DayPills({
  active,
  onSelect,
}: {
  active: number
  onSelect(day: number): void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Itinerary day">
      {ITINERARY_DAYS.map((d) => {
        const isActive = d.day === active
        return (
          <button
            key={d.day}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={`${d.date} · ${d.city}`}
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
          </button>
        )
      })}
    </div>
  )
}
