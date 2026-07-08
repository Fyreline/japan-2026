import { PLACES_TABS, type TabId } from '../tabs'

/** Mobile-only segmented control that switches between the four list views —
 * fixes the old site's gap where Animal cafés + Full data had no mobile route
 * (DESIGN.md §4). Hidden on desktop, where the tab row covers all four. */
export function PlacesSegmented({
  active,
  onSelect,
}: {
  active: TabId
  onSelect(id: TabId): void
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-paper-mid p-1 md:hidden">
      {PLACES_TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-pressed={isActive}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isActive ? 'bg-clay text-paper' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
