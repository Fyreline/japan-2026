import { DESKTOP_TABS, type TabId } from '../tabs'

/** Desktop tab row (≥768px) — 8 views, active gets a 2px clay underline
 * (DESIGN.md §4). Scrolls horizontally if cramped. */
export function TabNav({
  active,
  onSelect,
}: {
  active: TabId
  onSelect(id: TabId): void
}) {
  return (
    <nav className="hidden border-b border-line bg-paper/95 md:block">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-8">
        {DESKTOP_TABS.map((tab) => {
          const isActive = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 font-display text-sm transition ${
                isActive
                  ? 'border-clay text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
