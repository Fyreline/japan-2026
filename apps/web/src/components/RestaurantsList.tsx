import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import type { UseVisited } from '../hooks/useVisited'
import { PlacesListView } from './PlacesListView'

export function RestaurantsList({
  entries,
  onSeeOnMap,
  visited,
}: {
  entries: PlaceEntry[]
  onSeeOnMap(f: MapFocus): void
  visited: UseVisited
}) {
  return (
    <PlacesListView
      entries={entries}
      itemNoun="restaurants"
      searchPlaceholder="Search restaurants by name, cuisine, area…"
      onSeeOnMap={onSeeOnMap}
      visited={visited}
    />
  )
}
