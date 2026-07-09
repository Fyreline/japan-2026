import { useOnline } from '../hooks/useOnline'

/** Slim strip under the header when offline (DESIGN.md §12b). Complements,
 * doesn't replace, the itinerary's per-surface sync whisper. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null

  return (
    <div
      role="status"
      className="bg-oat px-4 py-1.5 text-center font-sans text-xs text-ink-mid transition-opacity duration-150"
    >
      Offline — showing the last synced copy
    </div>
  )
}
