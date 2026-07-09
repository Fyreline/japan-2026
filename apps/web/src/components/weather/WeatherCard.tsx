import { useWeather } from '../../hooks/useWeather'
import { weatherLabel } from '../../lib/weather'
import { isoDateForDay, tripDayFor } from '../../data/tripWindow'
import type { ItineraryDay, City } from '../../data/types'

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** One compact card between DayHeader and the slot list (DESIGN.md §16).
 * Never renders for 'Home'; never a loading spinner or error state
 * (ARCHITECTURE.md §18) — it either has something to show, or it hides. */
export function WeatherCard({ day }: { day: ItineraryDay }) {
  const city = day.leg === 'Home' ? null : (day.leg as City)
  const { snapshot, stale } = useWeather(city)

  if (!snapshot) return null

  const targetIso = isoDateForDay(day.day)
  const matched = snapshot.daily.find((d) => d.date === targetIso)
  const isToday = tripDayFor(new Date()) === day.day

  const { label, emoji } = weatherLabel(snapshot.current.code)

  const kickerSuffix = matched ? (isToday ? 'TODAY' : day.date.toUpperCase()) : 'RIGHT NOW'

  return (
    <div className="rounded-lg border border-line bg-paper-mid px-4 py-3">
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
        {(city ?? '').toUpperCase()} · {kickerSuffix}
        {stale && <span className="text-kraft"> · as of {formatTime(snapshot.fetchedAt)}</span>}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl leading-none">
            {emoji}
          </span>
          <span className="font-display text-xl text-ink">
            {Math.round(snapshot.current.temp)}°
          </span>
          <span className="text-[13px] text-ink-mid">{label}</span>
        </div>
        {matched && (
          <span className="font-mono text-xs text-ink-soft">
            H {Math.round(matched.tMax)}° · L {Math.round(matched.tMin)}°
            {matched.rainChance != null ? ` · ☂ ${Math.round(matched.rainChance)}%` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
