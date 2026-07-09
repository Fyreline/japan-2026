import { useState } from 'react'
import { todayIso } from '../../data/tripWindow'

/** The journal's composer — used both for the always-visible "new entry"
 * card at the top and, in place, for editing an existing entry (DESIGN.md
 * §18.1/§18.3). Photo attach is hidden in open mode (Storage needs
 * Supabase). */
export function EntryComposer({
  mode = 'new',
  initialDate,
  initialText,
  photosEnabled,
  busy,
  onSubmit,
  onCancel,
}: {
  mode?: 'new' | 'edit'
  initialDate?: string
  initialText?: string
  photosEnabled: boolean
  busy?: boolean
  onSubmit(input: { date: string; text: string; photoFile: File | null }): void
  onCancel?(): void
}) {
  const [date, setDate] = useState(initialDate ?? todayIso())
  const [text, setText] = useState(initialText ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  function handlePhotoChoose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function clearPhoto() {
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit({ date, text: text.trim(), photoFile })
    if (mode === 'new') {
      setDate(todayIso())
      setText('')
      clearPhoto()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-line bg-paper-mid p-4"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink outline-none focus:border-clay"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What happened today?"
        rows={3}
        className="w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay"
      />

      {photosEnabled && (
        <div className="flex items-center gap-3">
          {!photoPreview ? (
            <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:text-ink">
              ＋ Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChoose}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={photoPreview}
                alt=""
                className={`h-16 w-16 rounded-md object-cover ${busy ? 'opacity-50' : ''}`}
              />
              <button
                type="button"
                onClick={clearPhoto}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-paper"
              >
                ✕
              </button>
            </div>
          )}
          {busy && <span className="text-xs text-ink-soft">Saving on this device…</span>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-paper transition hover:bg-clay-deep"
        >
          {mode === 'new' ? 'Add entry' : 'Save'}
        </button>
        {mode === 'edit' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>

      {photosEnabled && mode === 'new' && (
        <p className="font-mono text-[11px] text-ink-soft">
          Photos are resized on your phone before upload.
        </p>
      )}
    </form>
  )
}
