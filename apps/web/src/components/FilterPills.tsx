export interface PillOption {
  value: string
  label: string
}

/** A flex-wrap row of filter pills (DESIGN.md §5). Active pill is clay; the
 * row wraps, never horizontal-scrolls. */
export function FilterPills({
  options,
  active,
  onSelect,
  label,
}: {
  options: PillOption[]
  active: string
  onSelect(value: string): void
  label?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((opt) => {
        const isActive = opt.value === active
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={isActive}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isActive
                ? 'border-clay bg-clay text-paper'
                : 'border-line bg-paper-mid text-ink-soft hover:text-ink'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
