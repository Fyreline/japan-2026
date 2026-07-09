import { PLACES_TAB_IDS, PLAN_TAB_IDS, type TabId } from '../tabs'

const ITEMS: { icon: string; label: string; target: TabId; group?: TabId[] }[] = [
  // "Plan" groups Itinerary/Packing (growing to Journal/Reference in
  // Phases 11–12) — opens the last-used of them, same mechanic as Places
  // (ARCHITECTURE.md §13b).
  { icon: '🗓', label: 'Plan', target: 'itinerary', group: PLAN_TAB_IDS },
  { icon: '🗺', label: 'Map', target: 'map' },
  { icon: '💡', label: 'Ideas', target: 'ideas' },
  // "Places" groups the four list views — opens the last-used of them
  // (DESIGN.md §4). This fixes the old site's gap where Animal cafés + Full
  // data were unreachable from the mobile nav.
  { icon: '⛩', label: 'Places', target: 'restaurants', group: PLACES_TAB_IDS },
  { icon: '➕', label: 'Add', target: 'submit' },
]

/** Fixed bottom bar (<768px), 5 items, 64px tall, safe-area padded
 * (DESIGN.md §4) — unchanged by the extension; Plan and Places are groups on
 * the same mechanic. */
export function MobileNav({
  active,
  planTarget,
  placesTarget,
  onSelect,
}: {
  active: TabId
  planTarget: TabId
  placesTarget: TabId
  onSelect(id: TabId): void
}) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map((item) => {
        const isActive = item.group
          ? item.group.includes(active)
          : item.target === active
        const target = item.label === 'Plan' ? planTarget : item.label === 'Places' ? placesTarget : item.target
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(target)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
              isActive ? 'text-clay' : 'text-ink-soft'
            }`}
          >
            <span aria-hidden className="text-xl leading-none">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
