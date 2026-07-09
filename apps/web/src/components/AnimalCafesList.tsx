import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import type { UseVisited } from '../hooks/useVisited'
import { PlacesListView } from './PlacesListView'

export function AnimalCafesList({
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
      itemNoun="cafés"
      searchPlaceholder="Search animal cafés by name, animal, area…"
      onSeeOnMap={onSeeOnMap}
      visited={visited}
    />
  )
}
