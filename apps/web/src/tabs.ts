export type TabId =
  | 'itinerary'
  | 'map'
  | 'ideas'
  | 'restaurants'
  | 'attractions'
  | 'animalCafes'
  | 'fullData'
  | 'packing'
  | 'journal'
  | 'reference'
  | 'submit'

// Desktop tab row — 11 views (DESIGN.md §4).
export const DESKTOP_TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'map', label: 'Map' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'animalCafes', label: 'Animal cafés' },
  { id: 'fullData', label: 'Full data' },
  { id: 'packing', label: 'Packing' },
  { id: 'journal', label: 'Journal' },
  { id: 'reference', label: 'Reference' },
  { id: 'submit', label: 'Submit' },
]

// The four list views the mobile "Places" item groups + their segmented
// control (DESIGN.md §4).
export const PLACES_TABS: { id: TabId; label: string }[] = [
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'animalCafes', label: 'Animal cafés' },
  { id: 'fullData', label: 'Full data' },
]

export const PLACES_TAB_IDS = PLACES_TABS.map((t) => t.id)

// The "Plan" group on the mobile bottom nav (ARCHITECTURE.md §13b) — Plan
// opens the last-used of these, which show a segmented control on mobile.
export const PLAN_TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'packing', label: 'Packing' },
  { id: 'journal', label: 'Journal' },
  { id: 'reference', label: 'Reference' },
]

export const PLAN_TAB_IDS = PLAN_TABS.map((t) => t.id)
