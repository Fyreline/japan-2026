import { useState } from 'react'
import { SLOT_TYPES, type SlotType } from '../../data/types'

const TYPE_LABEL: Record<SlotType, string> = {
  travel: 'Travel',
  food: 'Food',
  culture: 'Culture',
  free: 'Free time',
  sleep: 'Sleep',
  surprise: 'Surprise',
  default: 'Default',
}

/** Dashed "add a time slot" row — expands inline to time/type/text +
 * primary "Add" button. No prompt() dialogs (DESIGN.md §6.5). */
export function AddSlotRow({
  onAdd,
}: {
  onAdd(input: { time: string; type: SlotType; text: string }): void
}) {
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState('')
  const [type, setType] = useState<SlotType>('default')
  const [text, setText] = useState('')

  function reset() {
    setTime('')
    setType('default')
    setText('')
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ time: time.trim(), type, text: text.trim() })
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-line-strong px-4 py-3 text-left text-sm text-ink-soft transition hover:text-ink"
      >
        ＋ Add a time slot
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 rounded-md border border-line-strong bg-paper-mid p-3"
    >
      <input
        type="text"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        placeholder="HH:MM"
        className="w-20 rounded-md border border-line bg-paper px-2 py-1.5 font-mono text-sm text-ink outline-none focus:border-clay"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SlotType)}
        className="rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-clay"
      >
        {SLOT_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's happening?"
        autoFocus
        className="min-w-40 flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-clay"
      />
      <button
        type="submit"
        className="rounded-md bg-clay px-3 py-1.5 text-sm font-medium text-paper transition hover:bg-clay-deep"
      >
        Add
      </button>
      <button
        type="button"
        onClick={reset}
        className="rounded-md px-2 py-1.5 text-sm text-ink-soft hover:text-ink"
      >
        Cancel
      </button>
    </form>
  )
}
