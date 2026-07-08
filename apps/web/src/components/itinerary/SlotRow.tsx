import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SLOT_TYPES, type ItinerarySlot, type SlotType } from '../../data/types'

const EDGE_CLASS: Record<SlotType, string> = {
  travel: 'bg-sky',
  food: 'bg-kraft',
  culture: 'bg-fig',
  free: 'bg-olive',
  sleep: 'bg-cloud',
  surprise: 'bg-clay',
  default: 'bg-ink-soft',
}

const TYPE_LABEL: Record<SlotType, string> = {
  travel: 'Travel',
  food: 'Food',
  culture: 'Culture',
  free: 'Free time',
  sleep: 'Sleep',
  surprise: 'Surprise',
  default: 'Default',
}

/** One slot row — type edge, time, editable text, type/time popover, drag
 * handle, remove (DESIGN.md §6.4). */
export function SlotRow({
  slot,
  onCommitText,
  onChangeType,
  onChangeTime,
  onBeginEdit,
  onEndEdit,
  onRemove,
}: {
  slot: ItinerarySlot
  onCommitText(text: string): void
  onChangeType(type: SlotType): void
  onChangeTime(time: string): void
  onBeginEdit(): void
  onEndEdit(): void
  onRemove(): void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.slotKey,
  })
  const [text, setText] = useState(slot.text)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Keep the local draft in sync with incoming remote state, unless the row
  // is focused for editing (ARCHITECTURE.md §8 — local text wins until blur).
  useEffect(() => {
    setText(slot.text)
  }, [slot.text])

  useEffect(() => {
    if (!popoverOpen) return
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [popoverOpen])

  function handleTextChange(value: string) {
    setText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommitText(value), 600)
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onCommitText(text)
    onEndEdit()
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex min-h-12 items-stretch gap-2 overflow-hidden rounded-md border bg-paper-mid ${
        isDragging ? 'border-clay shadow-float' : 'border-line'
      } ${slot.type === 'surprise' ? 'bg-clay/8' : ''}`}
    >
      <span aria-hidden className={`w-1 shrink-0 ${EDGE_CLASS[slot.type]}`} />

      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          aria-label={`Change type or time (currently ${TYPE_LABEL[slot.type]}, ${slot.time})`}
          aria-expanded={popoverOpen}
          className={`m-1.5 h-3 w-3 shrink-0 rounded-full ${EDGE_CLASS[slot.type]}`}
        />
        {popoverOpen && (
          <div
            ref={popoverRef}
            className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-line bg-paper p-3 shadow-float"
          >
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
              Type
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {SLOT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChangeType(t)}
                  aria-pressed={t === slot.type}
                  className={`rounded-full border px-2 py-1 text-[11px] font-medium transition ${
                    t === slot.type
                      ? 'border-clay bg-clay text-paper'
                      : 'border-line text-ink-soft hover:text-ink'
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                Time
              </span>
              <input
                type="text"
                defaultValue={slot.time}
                onBlur={(e) => onChangeTime(e.target.value)}
                placeholder="HH:MM"
                className="w-full rounded-md border border-line bg-paper px-2 py-1.5 font-mono text-sm text-ink outline-none focus:border-clay"
              />
            </label>
          </div>
        )}
      </div>

      <span className="w-14 shrink-0 self-center text-right font-mono text-xs text-ink-soft">
        {slot.time}
      </span>

      <input
        type="text"
        value={text}
        onFocus={onBeginEdit}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        className="min-w-0 flex-1 self-center bg-transparent py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper-mid"
      />

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center self-center text-cloud hover:text-ink-soft"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove slot"
        className="flex h-11 w-9 shrink-0 items-center justify-center self-center text-cloud opacity-0 transition hover:text-fig focus:opacity-100 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}
