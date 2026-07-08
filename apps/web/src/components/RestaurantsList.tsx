import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import { PlacesListView } from './PlacesListView'

export function RestaurantsList({
  entries,
  onSeeOnMap,
}: {
  entries: PlaceEntry[]
  onSeeOnMap(f: MapFocus): void
}) {
  return (
    <PlacesListView
      entries={entries}
      itemNoun="restaurants"
      searchPlaceholder="Search restaurants by name, cuisine, area…"
      onSeeOnMap={onSeeOnMap}
    />
  )
}
