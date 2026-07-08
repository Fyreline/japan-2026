import { TRIP_ESSENTIALS } from '../data/tripEssentials'

/** Placeholder for the Itinerary tab. The live day-planner (day pills, slot
 * editing, drag-reorder + sync) is Phase 4 — this Phase-1 panel shows the
 * static trip essentials and a calm empty state so the tab is never blank. */
export function ItineraryPlaceholder() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Trip essentials
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRIP_ESSENTIALS.map((e) => (
            <div key={e.title} className="rounded-lg border border-line bg-paper-mid p-4">
              <p className="font-display text-sm font-medium text-ink">{e.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">{e.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 rounded-lg border border-line bg-paper-mid px-6 py-12 text-center">
        <svg width="72" height="40" viewBox="0 0 72 40" aria-hidden className="text-sky opacity-30">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0 40 A36 36 0 0 1 72 40" />
            <path d="M12 40 A24 24 0 0 1 60 40" />
            <path d="M24 40 A12 12 0 0 1 48 40" />
          </g>
        </svg>
        <p className="font-serif text-lg text-ink-mid">
          The day-by-day planner arrives next.
        </p>
        <p className="max-w-sm text-sm text-ink-soft">
          Fourteen days, five stops — Tokyo to Fuji, Hiroshima, Osaka, Kyoto and home. The editable,
          live-syncing itinerary lands in the next build phase.
        </p>
      </section>
    </div>
  )
}
