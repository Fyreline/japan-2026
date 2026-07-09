import { useEffect, useState } from 'react'
import { formatIsoDateKicker, tripDayForIso } from '../../data/tripWindow'
import type { JournalEntry } from '../../data/types'
import { EntryComposer } from './EntryComposer'

/** One journal entry (DESIGN.md §18.2). Edit swaps the card into composer
 * mode in place; photo loads lazily behind a paper-deep placeholder while
 * its signed URL resolves (or stays, offline with nothing cached). */
export function EntryCard({
  entry,
  photosEnabled,
  photoUrl,
  onRequestPhotoUrl,
  onSave,
  onRemove,
}: {
  entry: JournalEntry
  photosEnabled: boolean
  photoUrl: string | null
  onRequestPhotoUrl(): void
  onSave(input: { date: string; text: string; photoFile: File | null }): void
  onRemove(): void
}) {
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (entry.photoPath) onRequestPhotoUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.photoPath])

  if (editing) {
    return (
      <EntryComposer
        mode="edit"
        initialDate={entry.date}
        initialText={entry.text}
        photosEnabled={photosEnabled}
        onSubmit={(input) => {
          onSave(input)
          setEditing(false)
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const day = tripDayForIso(entry.date)
  const kicker = formatIsoDateKicker(entry.date) + (day ? ` · DAY ${day}` : '')

  return (
    <article className="rounded-lg border border-line bg-paper-mid p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">{kicker}</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-ink-soft hover:text-ink"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove entry"
            className="text-cloud hover:text-fig"
          >
            ✕
          </button>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{entry.text}</p>

      {entry.photoPath && (
        <div className="mt-3 max-h-80 w-full overflow-hidden rounded-md bg-paper-deep">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              loading="lazy"
              className="max-h-80 w-full object-cover"
            />
          ) : (
            <div className="h-40 w-full" />
          )}
        </div>
      )}
    </article>
  )
}
