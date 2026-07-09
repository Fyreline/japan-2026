import { useEffect, useRef, useState } from 'react'
import type { PackingItem } from '../../data/types'

/** Mirrors SlotRow minus time/type-edge/drag (DESIGN.md §15.3). The whole
 * row is the tap target for the checkbox; label is editable in place like
 * slot text (focus ring, blur/600ms commit). No strikethrough on checked
 * items — a packed passport still needs to be findable in the list. */
export function PackingRow({
  item,
  onToggle,
  onCommitLabel,
  onRemove,
}: {
  item: PackingItem
  onToggle(): void
  onCommitLabel(label: string): void
  onRemove(): void
}) {
  const [label, setLabel] = useState(item.label)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLabel(item.label)
  }, [item.label])

  function handleChange(value: string) {
    setLabel(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onCommitLabel(value), 600)
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onCommitLabel(label)
  }

  return (
    <div className="group flex min-h-11 items-center gap-2 rounded-md border border-line bg-paper-mid px-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={item.checked}
        aria-label={item.checked ? `${item.label || 'Item'} — packed` : `Mark ${item.label || 'item'} as packed`}
        className="flex h-11 w-8 shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-sm border transition-colors duration-150 ${
            item.checked ? 'border-olive bg-olive' : 'border-line-strong bg-paper'
          }`}
        >
          {item.checked && (
            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 text-paper" fill="none">
              <path
                d="M2.5 7.2 5.6 10 11.5 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      <input
        type="text"
        value={label}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={`min-w-0 flex-1 bg-transparent py-2 text-sm outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 focus:ring-offset-paper-mid ${
          item.checked ? 'text-ink-soft' : 'text-ink'
        }`}
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove item"
        className="flex h-11 w-9 shrink-0 items-center justify-center text-cloud opacity-0 transition hover:text-fig focus:opacity-100 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}
