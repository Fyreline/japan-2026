/** Rounded search input with a search glyph (DESIGN.md §5). */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange(v: string): void
  placeholder: string
}) {
  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox="0 0 20 20"
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
      >
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line
          x1="13.5"
          y1="13.5"
          x2="18"
          y2="18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-full border border-line bg-paper-mid py-2.5 pl-10 pr-4 text-sm text-ink outline-none placeholder:text-cloud focus:border-clay"
      />
    </div>
  )
}
