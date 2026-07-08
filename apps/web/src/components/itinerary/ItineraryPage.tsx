import { useState } from 'react'
import { ITINERARY_DAYS } from '../../data/itineraryDays'
import type { AuthState } from '../../auth/useAuth'
import { useItinerary } from '../../hooks/useItinerary'
import { TripEssentials } from './TripEssentials'
import { DayPills } from './DayPills'
import { DayHeader } from './DayHeader'
import { SlotList } from './SlotList'
import { AddSlotRow } from './AddSlotRow'
import { UndoToast } from './UndoToast'

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  synced: { text: 'Synced just now', className: 'text-ink-soft' },
  saving: { text: 'Syncing…', className: 'text-ink-soft' },
  error: { text: 'Saved on this device — sync failed right now', className: 'text-kraft' },
  'local-only': { text: 'Local only — sign-in off', className: 'text-ink-soft' },
}

export function ItineraryPage({ auth }: { auth: AuthState }) {
  const itinerary = useItinerary(auth)
  const [activeDay, setActiveDay] = useState(1)
  const [undo, setUndo] = useState<{ message: string; restore(): void } | null>(null)

  const day = ITINERARY_DAYS.find((d) => d.day === activeDay) ?? ITINERARY_DAYS[0]
  const slots = itinerary.slotsForDay(activeDay)
  const sync = SYNC_LABEL[itinerary.syncStatus] ?? SYNC_LABEL.synced

  function handleRemove(slotKey: string) {
    const { restore } = itinerary.removeSlot(slotKey)
    setUndo({ message: 'Slot removed.', restore })
  }

  return (
    <div className="space-y-5">
      <TripEssentials />
      <DayPills active={activeDay} onSelect={setActiveDay} />
      <DayHeader day={day} />

      {itinerary.loaded ? (
        <SlotList
          day={activeDay}
          slots={slots}
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
