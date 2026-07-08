export type TabId =
  | 'itinerary'
  | 'map'
  | 'ideas'
  | 'restaurants'
  | 'attractions'
  | 'animalCafes'
  | 'fullData'
  | 'submit'

// Desktop tab row — 8 views (DESIGN.md §4).
export const DESKTOP_TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'map', label: 'Map' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'attractions', label: 'Attractions' },
  { id: 'animalCafes', label: 'Animal cafés' },
  { id: 'fullData', label: 'Full data' },
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
