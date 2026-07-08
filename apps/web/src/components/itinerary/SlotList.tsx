import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ItinerarySlot, SlotType } from '../../data/types'
import { SlotRow } from './SlotRow'

/** Sortable list of a day's slots — touch + keyboard reorder via
 * @dnd-kit/sortable (DESIGN.md §6.4). */
export function SlotList({
  day,
  slots,
  onReorder,
  onUpdate,
  onBeginEdit,
  onEndEdit,
  onRemove,
}: {
  day: number
  slots: ItinerarySlot[]
  onReorder(slotKey: string, toIndex: number): void
  onUpdate(slotKey: string, patch: Partial<Pick<ItinerarySlot, 'time' | 'type' | 'text'>>): void
  onBeginEdit(slotKey: string): void
  onEndEdit(slotKey: string): void
  onRemove(slotKey: string): void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const toIndex = slots.findIndex((s) => s.slotKey === over.id)
    if (toIndex === -1) return
    onReorder(String(active.id), toIndex)
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-soft">
        Nothing planned yet for day {day}.
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={slots.map((s) => s.slotKey)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {slots.map((slot) => (
            <SlotRow
              key={slot.slotKey}
              slot={slot}
              onCommitText={(text) => onUpdate(slot.slotKey, { text })}
              onChangeType={(type: SlotType) => onUpdate(slot.slotKey, { type })}
              onChangeTime={(time) => onUpdate(slot.slotKey, { time })}
              onBeginEdit={() => onBeginEdit(slot.slotKey)}
              onEndEdit={() => onEndEdit(slot.slotKey)}
              onRemove={() => onRemove(slot.slotKey)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
