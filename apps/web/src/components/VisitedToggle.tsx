/** 24px circular ghost toggle, visited state olive + tick (DESIGN.md §14).
 * Touch target padded to 44px via an invisible hit area — the slot-handle
 * trick. Rendered in PlaceCard's top-right column; not on accommodations/
 * events, not on map popups (DATA_MODEL.md §10a). */
export function VisitedToggle({
  visited,
  onToggle,
}: {
  visited: boolean
  onToggle(): void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visited}
      aria-label={visited ? 'Visited — tap to unmark' : 'Mark as visited'}
      title={visited ? 'Visited — tap to unmark' : 'Mark as visited'}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span
        aria-hidden
        className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
          visited
            ? 'border-olive bg-olive text-paper'
            : 'border-line-strong text-cloud hover:text-ink-soft'
        }`}
      >
        {visited && (
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none">
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
  )
}
