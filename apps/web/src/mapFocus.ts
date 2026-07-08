// "See on map" fly-to contract shared by the list cards and MapView.
export type LayerKey =
  | 'accommodation'
  | 'ideas'
  | 'restaurants'
  | 'attractions'
  | 'animalCafes'

export interface MapFocus {
  layer: LayerKey
  markerId: string // matches the marker registered under `${layer}:${id}`
  lat: number
  lng: number
  // bumped on every request so repeat "see on map" on the same pin re-fires.
  nonce: number
}
