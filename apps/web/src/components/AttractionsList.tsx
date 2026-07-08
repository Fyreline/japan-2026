import type { PlaceEntry } from '../data/types'
import type { MapFocus } from '../mapFocus'
import { PlacesListView } from './PlacesListView'

export function AttractionsList({
  entries,
  onSeeOnMap,
}: {
  entries: PlaceEntry[]
  onSeeOnMap(f: MapFocus): void
}) {
  return (
    <PlacesListView
      entries={entries}
      itemNoun="attractions"
      searchPlaceholder="Search attractions by name, type, area…"
      onSeeOnMap={onSeeOnMap}
    />
  )
}
