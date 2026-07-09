import { useEffect, useMemo, useState } from 'react'
import { ITINERARY_DAYS } from '../../data/itineraryDays'
import { currentSlotFor, tripDayFor } from '../../data/tripWindow'
import type { AuthState } from '../../auth/useAuth'
import { useItinerary } from '../../hooks/useItinerary'
import { TripEssentials } from './TripEssentials'
import { DayPills } from './DayPills'
import { DayHeader } from './DayHeader'
import { SlotList } from './SlotList'
import { AddSlotRow } from './AddSlotRow'
import { UndoToast } from '../UndoToast'
import { WeatherCard } from '../weather/WeatherCard'

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  synced: { text: 'Synced just now', className: 'text-ink-soft' },
  saving: { text: 'Syncing…', className: 'text-ink-soft' },
  error: { text: 'Saved on this device — sync failed right now', className: 'text-kraft' },
  'local-only': { text: 'Local only — sign-in off', className: 'text-ink-soft' },
}

export function ItineraryPage({ auth }: { auth: AuthState }) {
  const itinerary = useItinerary(auth)
  // Today view (ARCHITECTURE.md §15): auto-select runs once per mount via
  // this lazy initializer — never re-yanks the day afterwards; manual pill
  // taps always win because they go through plain setActiveDay.
  const [activeDay, setActiveDay] = useState(() => tripDayFor(new Date()) ?? 1)
  const [undo, setUndo] = useState<{ message: string; restore(): void } | null>(null)

  // "Today" for the day-pill dot — computed once on mount, no ticking timer.
  const todayDay = useMemo(() => tripDayFor(new Date()), [])

  const day = ITINERARY_DAYS.find((d) => d.day === activeDay) ?? ITINERARY_DAYS[0]
  const slots = itinerary.slotsForDay(activeDay)
  const sync = SYNC_LABEL[itinerary.syncStatus] ?? SYNC_LABEL.synced

  // "now" is frozen per day-switch (not ticking) — DATA_MODEL.md §14. The
  // marker only ever applies to the day that IS today — outside the trip
  // window, or when browsing a different day than today, there is no
  // "current" slot to mark (ARCHITECTURE.md §15's pseudocode gates the whole
  // marker/scroll step behind the non-null trip-day branch; PLAN.md Phase 8's
  // acceptance is explicit: "clock outside the window lands on Day 1 with no
  // marker").
  const isToday = todayDay != null && activeDay === todayDay
  const now = useMemo(() => new Date(), [activeDay])
  const current = useMemo(
    () => (isToday ? currentSlotFor(slots, now) : { slotKey: null, status: null }),
    [isToday, slots, now],
  )

  // One-shot centre-scroll to the now/next slot, on mount and day-switch
  // only (ARCHITECTURE.md §15, DESIGN.md §13.3).
  useEffect(() => {
    if (!itinerary.loaded || !current.slotKey) return
    const el = document.querySelector(`[data-slot-key="${CSS.escape(current.slotKey)}"]`)
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDay, itinerary.loaded])

  function handleRemove(slotKey: string) {
    const { restore } = itinerary.removeSlot(slotKey)
    setUndo({ message: 'Slot removed.', restore })
  }

  return (
    <div className="space-y-5">
      <TripEssentials />
      <DayPills active={activeDay} todayDay={todayDay} onSelect={setActiveDay} />
      <DayHeader day={day} />
      <WeatherCard day={day} />

      {itinerary.loaded ? (
        <SlotList
          day={activeDay}
          slots={slots}
          markedSlotKey={current.slotKey}
          markedStatus={current.status}
          onReorder={(slotKey, toIndex) => itinerary.reorderSlot(activeDay, slotKey, toIndex)}
          onUpdate={itinerary.updateSlot}
          onBeginEdit={itinerary.beginEditing}
          onEndEdit={itinerary.endEditing}
          onRemove={handleRemove}
        />
      ) : (
        <p className="py-8 text-center text-sm text-ink-soft">Loading the plan…</p>
      )}

      <AddSlotRow onAdd={(input) => itinerary.addSlot(activeDay, input)} />

      <p aria-live="polite" className={`font-mono text-[11px] ${sync.className}`}>
        {sync.text}
      </p>

      {undo && (
        <UndoToast
          message={undo.message}
          onUndo={() => {
            undo.restore()
            setUndo(null)
          }}
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  )
}
