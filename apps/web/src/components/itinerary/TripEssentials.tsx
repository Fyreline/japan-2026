import { useState } from 'react'
import { TRIP_ESSENTIALS } from '../../data/tripEssentials'

/** Collapsible row of small essentials cards — flights/cash/rail/eSim/car
 * (DESIGN.md §6.1). Collapsed by default on mobile ("Trip essentials ▸"). */
export function TripEssentials() {
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-lg border border-line bg-paper-mid">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left md:hidden"
      >
        <span className="font-display text-sm font-medium text-ink">Trip essentials</span>
        <span className="text-ink-soft">{open ? '▾' : '▸'}</span>
      </button>
      <div className={`${open ? 'block' : 'hidden'} md:block`}>
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 md:pt-4 lg:grid-cols-3">
          {TRIP_ESSENTIALS.map((e) => (
            <div key={e.title} className="rounded-lg border border-line bg-paper p-3">
              <p className="font-display text-[13px] font-medium text-ink">{e.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">{e.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
