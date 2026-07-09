import { useState } from 'react'
import type { AuthState } from '../../auth/useAuth'
import { useJournal } from '../../hooks/useJournal'
import { EntryComposer } from './EntryComposer'
import { EntryCard } from './EntryCard'
import { UndoToast } from '../UndoToast'
import { SeigaihaScallop } from '../Seigaiha'

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  synced: { text: 'Synced just now', className: 'text-ink-soft' },
  saving: { text: 'Syncing…', className: 'text-ink-soft' },
  error: { text: 'Saved on this device — sync failed right now', className: 'text-kraft' },
  'local-only': { text: 'Local only — sign-in off', className: 'text-ink-soft' },
}

interface PendingRemoval {
  message: string
  restore(): void
  commit(): void
}

/** JournalPage (DESIGN.md §18) — composer always on top, newest-first cards
 * below. No attribution anywhere on any surface. */
export function JournalPage({ auth }: { auth: AuthState }) {
  const journal = useJournal(auth)
  const [undo, setUndo] = useState<PendingRemoval | null>(null)
  const sync = SYNC_LABEL[journal.syncStatus] ?? SYNC_LABEL.synced

  function handleRemove(entryKey: string) {
    // At most one removal is ever "in the grace period" — starting a new one
    // finalizes any previous pending removal immediately (DESIGN.md §18.3's
    // deferred-delete only needs to protect the most recent action).
    if (undo) undo.commit()
    const { restore, commit } = journal.removeEntry(entryKey)
    setUndo({ message: 'Entry removed.', restore, commit })
  }

  return (
    <div className="space-y-5">
      <EntryComposer
        mode="new"
        photosEnabled={journal.photosEnabled}
        onSubmit={(input) => journal.addEntry(input)}
      />

      {!journal.loaded ? (
        <p className="py-8 text-center text-sm text-ink-soft">Loading the journal…</p>
      ) : journal.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <SeigaihaScallop />
          <p className="font-serif text-lg text-ink-mid">The first page is yours.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {journal.entries.map((entry) => (
            <EntryCard
              key={entry.entryKey}
              entry={entry}
              photosEnabled={journal.photosEnabled}
              photoUrl={journal.photoUrl(entry.entryKey)}
              onRequestPhotoUrl={() => {
                if (entry.photoPath) journal.requestPhotoUrl(entry.entryKey, entry.photoPath)
              }}
              onSave={(input) => journal.updateEntry(entry.entryKey, input)}
              onRemove={() => handleRemove(entry.entryKey)}
            />
          ))}
        </div>
      )}

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
          onDismiss={() => {
            undo.commit()
            setUndo(null)
          }}
        />
      )}
    </div>
  )
}
