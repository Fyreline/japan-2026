import type { TabId } from '../tabs'

/** Mobile-only segmented control shared by the Places and Plan nav groups
 * (DESIGN.md §4, ARCHITECTURE.md §13b). Hidden on desktop, where the tab
 * row already reaches every view directly. */
export function SegmentedTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: { id: TabId; label: string }[]
  active: TabId
  onSelect(id: TabId): void
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-paper-mid p-1 md:hidden">
      {tabs.map((tab) => {
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
