const CJK = /[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]/

export interface CardField {
  label: string
  value: string
}
export interface CardLink {
  label: string
  href: string
}

export interface PlaceCardProps {
  title: string
  /** small mono kicker above the title, e.g. "TOKYO · SETAGAYA" */
  kicker?: string
  /** meta pills under the title (category, tag, city, suburb) */
  pills?: string[]
  cost?: string
  description?: string
  /** rating / cuisine / wait / booking / animals / dates lines */
  fields?: CardField[]
  links?: CardLink[]
  source?: string
  /** shown as a "User Submission" badge */
  badge?: string
  onSeeOnMap?: () => void
}

/** Shared list card — idea / restaurant / attraction / café / full-data
 * (DESIGN.md §5, §7). bg-paper-mid, hairline border, no resting shadow. */
export function PlaceCard({
  title,
  kicker,
  pills,
  cost,
  description,
  fields,
  links,
  source,
  badge,
  onSeeOnMap,
}: PlaceCardProps) {
  const titleJp = CJK.test(title)
  return (
    <article className="rounded-lg border border-line bg-paper-mid p-4 transition hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kicker && (
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              {kicker}
            </p>
          )}
          <h3
            className={`font-display text-base font-medium text-ink ${titleJp ? 'jp' : ''}`}
          >
            {title}
          </h3>
          {pills && pills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pills
                .filter(Boolean)
                .map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-paper-deep px-2.5 py-0.5 text-[11px] text-ink-soft"
                  >
                    {p}
                  </span>
                ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {cost && (
            <span className="font-mono text-xs text-ink-mid">{cost}</span>
          )}
          {badge && (
            <span className="rounded-full bg-oat px-2 py-0.5 text-[11px] font-medium text-ink-mid">
              {badge}
            </span>
          )}
          {links
            ?.filter((l) => l.href)
            .map((l, i) => (
              <a
                key={i}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-clay hover:underline"
              >
                {l.label}
              </a>
            ))}
        </div>
      </div>

      {description && (
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">{description}</p>
      )}

      {fields && fields.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {fields
            .filter((f) => f.value)
            .map((f, i) => (
              <span
                key={i}
                className="rounded-md border border-line bg-paper px-2.5 py-1 text-[12px] text-ink-soft"
              >
                <span className="text-ink-soft">{f.label}: </span>
                <span className="text-ink-mid">{f.value}</span>
              </span>
            ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        {source ? (
          <span className="text-xs text-ink-soft">{source}</span>
        ) : (
          <span />
        )}
        {onSeeOnMap && (
          <button
            type="button"
            onClick={onSeeOnMap}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            See on map
          </button>
        )}
      </div>
    </article>
  )
}
