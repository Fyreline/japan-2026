import type { City, PlaceEntry } from './types'
import restaurantsJson from './restaurants.json'
import attractionsJson from './attractions_by_location.json'
import animalCafesJson from './animal_cafes.json'

// JSON → typed PlaceEntry (DATA_MODEL.md §4). Static imports mean a malformed
// file fails the build (resolveJsonModule) instead of a tab at runtime.

// ── Raw JSON shapes ─────────────────────────────────────────────────────────
interface RawCoords {
  lat: number
  lng: number
}
interface RawRestaurant {
  category?: string
  name: string
  tabelog_rating?: string
  cost_approx?: string
  cuisine_type?: string
  description?: string
  google_maps_link?: string
  approx_wait_time_walkin?: string
  coordinates?: RawCoords
}
interface RawAttraction {
  name: string
  description?: string
  website?: string
  approx_cost?: string
  coordinates?: RawCoords
  google_map_link?: string
  google_maps_link?: string
  booking_requirement?: string
  rating?: { google?: string; tripadvisor?: string }
}
interface RawAnimalCafe extends RawAttraction {
  animals?: string[]
}

const restaurantsData = restaurantsJson as {
  destinations: Record<string, RawRestaurant[]>
}
const attractionsData = attractionsJson as {
  locations: Record<string, Record<string, RawAttraction[]>>
}
const animalCafesData = animalCafesJson as {
  cities: Record<string, RawAnimalCafe[]>
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-')
}

// tier key → display category (DATA_MODEL.md §4b).
function tierLabel(key: string): string {
  if (key === 'top_10') return 'Top 10'
  if (key === 'hidden_gems') return 'Hidden Gems'
  return key
}

// ── Restaurants ─────────────────────────────────────────────────────────────
export function normalizeRestaurants(): PlaceEntry[] {
  const out: PlaceEntry[] = []
  for (const [area, items] of Object.entries(restaurantsData.destinations)) {
    // key = "City" or "City (Suburb)" (DATA_MODEL.md §4a).
    const parsed = /^([^()]+)(?:\s*\((.+)\))?$/.exec(area) ?? []
    const city = (parsed[1] ?? '').trim() as City
    const suburb = (parsed[2] ?? '').trim()
    items.forEach((item, index) => {
      out.push({
        id: `${slug(city)}-${slug(suburb)}-${index}`,
        type: 'Restaurant',
        title: item.name,
        name: item.name,
        category: item.category ?? 'Restaurant',
        city,
        suburb,
        description: item.description ?? '',
        link: item.google_maps_link ?? '',
        coordinates: item.coordinates ?? null,
        costDisplay: item.cost_approx ?? '',
        rating: item.tabelog_rating,
        cuisineType: item.cuisine_type,
        approxWait: item.approx_wait_time_walkin,
      })
    })
  }
  return out
}

// ── Attractions ─────────────────────────────────────────────────────────────
export function normalizeAttractions(): PlaceEntry[] {
  const out: PlaceEntry[] = []
  for (const [city, tiers] of Object.entries(attractionsData.locations)) {
    for (const [tierKey, items] of Object.entries(tiers)) {
      items.forEach((item, index) => {
        out.push({
          id: `${slug(city)}-${slug(item.name)}-${index}`,
          type: 'Attraction',
          title: item.name,
          name: item.name,
          category: tierLabel(tierKey),
          city: city as City,
          suburb: '',
          description: item.description ?? '',
          // Coalesce the historical duplicate link keys (DATA_MODEL.md §4b/§4d).
          link:
            item.google_maps_link ?? item.google_map_link ?? item.website ?? '',
          coordinates: item.coordinates ?? null,
          costDisplay: item.approx_cost ?? '',
          rating: item.rating?.google,
          bookingRequirement: item.booking_requirement,
        })
      })
    }
  }
  return out
}

// ── Animal cafés ────────────────────────────────────────────────────────────
export function normalizeAnimalCafes(): PlaceEntry[] {
  const out: PlaceEntry[] = []
  for (const [city, items] of Object.entries(animalCafesData.cities)) {
    items.forEach((item, index) => {
      out.push({
        id: `${slug(city)}-${slug(item.name)}-${index}`,
        type: 'Animal Cafe',
        title: item.name,
        name: item.name,
        // Category = first animal (port of the current site).
        category: item.animals?.length ? item.animals[0] : 'Animal Cafe',
        city: city as City,
        suburb: '',
        description: item.description ?? '',
        link:
          item.google_maps_link ?? item.google_map_link ?? item.website ?? '',
        coordinates: item.coordinates ?? null,
        costDisplay: item.approx_cost ?? '',
        rating: item.rating?.google,
        bookingRequirement: item.booking_requirement,
        animals: item.animals ?? [],
      })
    })
  }
  return out
}

// The three static datasets, normalized once at module load.
export const BASE_RESTAURANTS = normalizeRestaurants()
export const BASE_ATTRACTIONS = normalizeAttractions()
export const BASE_ANIMAL_CAFES = normalizeAnimalCafes()

// ── Coordinate helpers (shared with the submit flow, DATA_MODEL.md §7) ───────
export const CITY_FALLBACK_COORDS: Record<City, RawCoords> = {
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Fuji: { lat: 35.505, lng: 138.77 },
  Kyoto: { lat: 35.0116, lng: 135.7681 },
  Hiroshima: { lat: 34.3853, lng: 132.4553 },
  Osaka: { lat: 34.6937, lng: 135.5023 },
}

/** Pull coordinates out of a Google-Maps link (port of the current regexes,
 * DATA_MODEL.md §7b): `@lat,lng` then `!3d…!4d…` then `?q=lat,lng`. */
export function extractCoordsFromGoogleMapsLink(
  url: string,
): RawCoords | null {
  if (!url) return null
  const text = String(url)
  let m = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  m = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  m = text.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (m) return { lat: Number(m[1]), lng: Number(m[2]) }
  return null
}
