import { useState } from 'react'

/** The §6.5 dashed composer, simplified — text input + "Add" button only, no
 * time/type (DESIGN.md §15.4). New items append at the category's end. */
export function AddItemRow({ onAdd }: { onAdd(label: string): void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')

  function reset() {
    setLabel('')
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    onAdd(label.trim())
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-dashed border-line-strong px-3 py-2 text-left text-sm text-ink-soft transition hover:text-ink"
      >
        ＋ Add an item
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-md border border-line-strong bg-paper-mid p-2"
    >
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What are you packing?"
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-clay"
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
