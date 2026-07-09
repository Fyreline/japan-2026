/** Seigaiha (青海波) — the woodblock "blue ocean wave" band that replaces the
 * old sakura petals (DESIGN.md §8). One motif, used twice (under the header
 * hairline, above the footer line), never animated. Concentric semicircle
 * strokes tiled horizontally in a 14px band, `text-sky` at 20% light / 25%
 * dark. currentColor + opacity only — no hex. The svg has no viewBox so user
 * units are pixels and the 24px pattern tile repeats across the full width. */
export function SeigaihaBand() {
  return (
    <div
      aria-hidden
      className="pointer-events-none h-3.5 w-full overflow-hidden text-sky opacity-20 dark:opacity-25"
    >
      <svg width="100%" height="14" className="block">
        <defs>
          <pattern
            id="seigaiha-tile"
            width="24"
            height="14"
            patternUnits="userSpaceOnUse"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M0 14 A12 12 0 0 1 24 14" />
              <path d="M4 14 A8 8 0 0 1 20 14" />
              <path d="M8 14 A4 4 0 0 1 16 14" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="14" fill="url(#seigaiha-tile)" />
      </svg>
    </div>
  )
}

/** A single large seigaiha scallop — the "quiet illustration" empty-state
 * motif (DESIGN.md §8), reused by Journal's empty state and Reference's
 * page foot. currentColor + opacity only, never animated. */
export function SeigaihaScallop() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 50"
      className="mx-auto h-16 w-32 text-sky opacity-20 dark:opacity-25"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M0 50 A50 50 0 0 1 100 50" />
        <path d="M15 50 A35 35 0 0 1 85 50" />
        <path d="M30 50 A20 20 0 0 1 70 50" />
      </g>
    </svg>
  )
}
