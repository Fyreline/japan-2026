import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import { PlacesListView } from './PlacesListView'

export function AnimalCafesList({
  entries,
  onSeeOnMap,
}: {
  entries: PlaceEntry[]
  onSeeOnMap(f: MapFocus): void
}) {
  return (
    <PlacesListView
      entries={entries}
      itemNoun="cafés"
      searchPlaceholder="Search animal cafés by name, animal, area…"
      onSeeOnMap={onSeeOnMap}
    />
  )
}
