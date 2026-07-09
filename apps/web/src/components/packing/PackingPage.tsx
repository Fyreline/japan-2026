import { useState } from 'react'
import { PACKING_CATEGORIES } from '../../data/types'
import type { AuthState } from '../../auth/useAuth'
import { usePacking } from '../../hooks/usePacking'
import { PackingRow } from './PackingRow'
import { AddItemRow } from './AddItemRow'
import { UndoToast } from '../UndoToast'

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  synced: { text: 'Synced just now', className: 'text-ink-soft' },
  saving: { text: 'Syncing…', className: 'text-ink-soft' },
  error: { text: 'Saved on this device — sync failed right now', className: 'text-kraft' },
  'local-only': { text: 'Local only — sign-in off', className: 'text-ink-soft' },
}

/** PackingPage — "the itinerary's calmer sibling" (DESIGN.md §15). */
export function PackingPage({ auth }: { auth: AuthState }) {
  const packing = usePacking(auth)
  const [undo, setUndo] = useState<{ message: string; restore(): void } | null>(null)
  const sync = SYNC_LABEL[packing.syncStatus] ?? SYNC_LABEL.synced

  const totalCount = packing.allItems.length
  const packedCount = packing.allItems.filter((i) => i.checked).length

  function handleRemove(itemKey: string) {
    const { restore } = packing.removeItem(itemKey)
    setUndo({ message: 'Item removed.', restore })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-xl font-medium text-ink">Packing</h1>
        <span className="font-mono text-xs text-ink-soft">
          {packedCount} of {totalCount} packed
        </span>
      </div>

      {!packing.loaded ? (
        <p className="py-8 text-center text-sm text-ink-soft">Loading the checklist…</p>
      ) : (
        <div className="space-y-6">
          {PACKING_CATEGORIES.map((cat) => {
            const items = packing.itemsForCategory(cat.id)
            const checked = items.filter((i) => i.checked).length
            return (
              <section key={cat.id} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
                    {cat.label.toUpperCase()}
                  </h2>
                  <span className="font-mono text-[11px] text-ink-soft">
                    {checked} of {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <PackingRow
                      key={item.itemKey}
                      item={item}
                      onToggle={() => packing.toggleChecked(item.itemKey)}
                      onCommitLabel={(label) => packing.updateLabel(item.itemKey, label)}
                      onRemove={() => handleRemove(item.itemKey)}
                    />
                  ))}
                </div>
                <AddItemRow onAdd={(label) => packing.addItem(cat.id, label)} />
              </section>
            )
          })}
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
          onDismiss={() => setUndo(null)}
        />
      )}
    </div>
  )
}
