import {
  EMERGENCY_NOTE,
  EMERGENCY_NUMBERS,
  ETIQUETTE,
  PHRASES,
  UK_TRAVEL_ADVICE,
} from '../../data/quickReference'
import { SeigaihaScallop } from '../Seigaiha'

/** Static, offline-by-construction (DESIGN.md §17) — content is transcribed
 * from DATA_MODEL.md §15 verbatim, never rewritten. */
export function ReferencePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Emergency — deliberately first and unmissable */}
      <section className="rounded-lg border border-line bg-paper-mid p-4">
        <div className="flex flex-wrap gap-6">
          {EMERGENCY_NUMBERS.map((e) => (
            <div key={e.label}>
              <p className="font-mono text-[30px] leading-none text-ink">{e.value}</p>
              <p className="mt-1 text-[13px] text-ink-mid">{e.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-ink-mid">{EMERGENCY_NOTE}</p>
        <p className="mt-1 text-[13px] text-ink-mid">
          {UK_TRAVEL_ADVICE.context} —{' '}
          <a
            href={UK_TRAVEL_ADVICE.href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-clay hover:underline"
          >
            {UK_TRAVEL_ADVICE.linkText}
          </a>
        </p>
      </section>

      {/* Phrases */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Phrases
        </h2>
        <div className="divide-y divide-line">
          {PHRASES.map((p) => (
            <div key={p.jp} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 py-2 sm:grid-cols-3">
              <span className="jp text-base text-ink">{p.jp}</span>
              <span className="font-mono text-xs text-ink-soft">{p.romaji}</span>
              <span className="col-span-2 text-[13px] text-ink-mid sm:col-span-1">{p.en}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Etiquette & practicalities */}
      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Etiquette &amp; practicalities
        </h2>
        <ul className="space-y-2">
          {ETIQUETTE.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-mid">
              <span aria-hidden className="text-ink-soft">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="py-4">
        <SeigaihaScallop />
      </div>
    </div>
  )
}
