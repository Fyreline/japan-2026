import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import type { UseVisited } from '../hooks/useVisited'
import { PlacesListView } from './PlacesListView'

export function AttractionsList({
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
      itemNoun="attractions"
      searchPlaceholder="Search attractions by name, type, area…"
      onSeeOnMap={onSeeOnMap}
      visited={visited}
    />
  )
}
