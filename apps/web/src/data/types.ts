// Every static shape in the app (DATA_MODEL.md). Client objects are camelCase;
// Supabase columns (snake_case) meet these only in the mapping functions.

export type City = 'Tokyo' | 'Fuji' | 'Hiroshima' | 'Osaka' | 'Kyoto'

// Cities plus 'Home' for itinerary legs (DATA_MODEL.md §1).
export type Leg = City | 'Home'

// Display order for city grouping/sorting.
export const CITY_ORDER: City[] = ['Tokyo', 'Fuji', 'Hiroshima', 'Osaka', 'Kyoto']

// ── Static dataset: accommodations & events (DATA_MODEL.md §2) ──────────────
export interface Accommodation {
  id: string
  type: 'accommodation' | 'event'
  title: string
  city: City
  suburb: string
  dates: string
  lat: number
  lng: number
  details: string
  link: string
  category: 'Accommodation' | 'Event'
}

// ── Static dataset: trip ideas (DATA_MODEL.md §3) ───────────────────────────
export interface TripIdea {
  id: string
  title: string
  city: City
  suburb: string
  tag: string
  cost: string
  lat: number
  lng: number
  source: string
  description: string
  detail: string
  link?: string
  leg?: Leg
}

// ── Normalized place entry — what tabs/map/Full data consume
//    (DATA_MODEL.md §4d) ─────────────────────────────────────────────────────
export type PlaceType = 'Restaurant' | 'Attraction' | 'Animal Cafe'

export interface PlaceEntry {
  id: string
  type: PlaceType
  title: string
  name: string
  category: string
  city: City
  suburb: string
  description: string
  link: string
  coordinates: { lat: number; lng: number } | null
  costDisplay: string
  rating?: string
  bookingRequirement?: string
  // Restaurant-only:
  cuisineType?: string
  approxWait?: string
  // Animal-cafe-only:
  animals?: string[]
  // Set only on submitted spots (§7):
  source?: 'User Submission'
  // Stable sync handle for submitted spots (client_submission_key).
  submissionKey?: string
}

// ── Trip essentials (DATA_MODEL.md §5) ──────────────────────────────────────
export interface TripEssential {
  title: string
  body: string
}

// ── Submit form payload (DATA_MODEL.md §7b) ─────────────────────────────────
export interface SubmissionPayload {
  name: string
  category: PlaceType
  subCategory: string
  costTier: number // 1–5
  city: City
  suburb: string
  speciality: string
  description: string
  googleMapsLink: string
  approxWait: string
  bookingRequirement: string
}
