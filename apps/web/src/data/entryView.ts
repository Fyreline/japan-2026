import type { PlaceEntry, PlaceType } from './types'
import type { LayerKey, MapFocus } from '../mapFocus'
import type { CardField, CardLink } from '../components/PlaceCard'

export const LAYER_FOR_TYPE: Record<PlaceType, LayerKey> = {
  Restaurant: 'restaurants',
  Attraction: 'attractions',
  'Animal Cafe': 'animalCafes',
}

/** Fields/links/pills for a normalized place entry, per DESIGN.md §7 (cards
 * add rating/cuisine/wait/booking lines; links out in clay). */
export function entryCardFields(entry: PlaceEntry): CardField[] {
  if (entry.type === 'Restaurant') {
    return [
      { label: 'Cost', value: entry.costDisplay },
      { label: 'Rating', value: entry.rating ?? '' },
      { label: 'Approx wait', value: entry.approxWait ?? '' },
    ]
  }
  if (entry.type === 'Attraction') {
    return [
      { label: 'Booking', value: entry.bookingRequirement || 'Walk-in' },
      { label: 'Cost', value: entry.costDisplay },
    ]
  }
  // Animal Cafe
  return [
    { label: 'Animals', value: (entry.animals ?? []).join(', ') },
    { label: 'Booking', value: entry.bookingRequirement || 'Walk-in' },
  ]
}

export function entryCardPills(entry: PlaceEntry): string[] {
  if (entry.type === 'Restaurant') {
    return [entry.category, entry.cuisineType ?? '', entry.city, entry.suburb]
  }
  return [entry.category, entry.city]
}

export function entryCardLinks(entry: PlaceEntry): CardLink[] {
  const label = entry.type === 'Restaurant' ? 'Map' : 'Website'
  return entry.link ? [{ label, href: entry.link }] : []
}

/** Fly-to target for an entry, or null if it has no coordinates. */
export function entryFocus(entry: PlaceEntry): MapFocus | null {
  if (!entry.coordinates) return null
  const layer = LAYER_FOR_TYPE[entry.type]
  return {
    layer,
    markerId: `${layer}:${entry.id}`,
    lat: entry.coordinates.lat,
    lng: entry.coordinates.lng,
    nonce: Date.now(),
  }
}
