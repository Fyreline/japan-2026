import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, TABLES } from '../lib/supabase'
import type { AuthState } from '../auth/useAuth'
import {
  BASE_ANIMAL_CAFES,
  BASE_ATTRACTIONS,
  BASE_RESTAURANTS,
  CITY_FALLBACK_COORDS,
  extractCoordsFromGoogleMapsLink,
} from '../data/normalize'
import type { City, PlaceEntry, SubmissionPayload } from '../data/types'

const LOCAL_KEY = 'japan2026UserSubmissions'

// ── payload → PlaceEntry (DATA_MODEL.md §7b buildSubmissionEntry) ────────────
function buildEntry(
  payload: SubmissionPayload,
  overrides: {
    id?: string
    submissionKey?: string
    coordinates?: { lat: number; lng: number }
  } = {},
): PlaceEntry {
  const generatedId = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const id = overrides.id ?? generatedId
  const submissionKey = overrides.submissionKey ?? id
  const coordinates =
    overrides.coordinates ??
    extractCoordsFromGoogleMapsLink(payload.googleMapsLink) ??
    CITY_FALLBACK_COORDS[payload.city] ??
    CITY_FALLBACK_COORDS.Tokyo
  const costDisplay = '£'.repeat(Number(payload.costTier) || 1)

  const base: PlaceEntry = {
    id,
    submissionKey,
    type: payload.category,
    title: payload.name || `${payload.category} submission`,
    name: payload.name || `User Submitted ${payload.category}`,
    category: payload.subCategory || 'User Submission',
    city: payload.city,
    suburb: payload.suburb,
    description: payload.description,
    link: payload.googleMapsLink,
    coordinates,
    costDisplay,
    source: 'User Submission',
  }

  if (payload.category === 'Restaurant') {
    return {
      ...base,
      cuisineType: payload.speciality || payload.subCategory || 'General',
      approxWait: payload.approxWait || '',
    }
  }
  if (payload.category === 'Attraction') {
    return { ...base, bookingRequirement: payload.bookingRequirement || 'Unknown' }
  }
  return {
    ...base,
    animals: payload.subCategory
      ? [payload.subCategory]
      : payload.speciality
        ? [payload.speciality]
        : [],
    bookingRequirement: payload.bookingRequirement || 'Unknown',
  }
}

interface SpotRow {
  id?: number | string
  client_submission_key?: string | null
  category?: string
  name?: string
  sub_category?: string
  cost_tier?: number
  city?: string
  suburb?: string
  speciality?: string
  description?: string
  google_maps_link?: string
  approx_wait?: string
  booking_requirement?: string
  lat?: number | null
  lng?: number | null
}

// row → PlaceEntry (DATA_MODEL.md §7b read path).
function rowToEntry(row: SpotRow): PlaceEntry {
  const city = (row.city as City) ?? 'Tokyo'
  const payload: SubmissionPayload = {
    category: (row.category as PlaceEntry['type']) ?? 'Restaurant',
    name: row.name || row.speciality || 'User Submission',
    subCategory: row.sub_category || row.speciality || 'User Submission',
    costTier: row.cost_tier || 1,
    city,
    suburb: row.suburb || '',
    speciality: row.speciality || '',
    description: row.description || '',
    googleMapsLink: row.google_maps_link || '',
    approxWait: row.approx_wait || '',
    bookingRequirement: row.booking_requirement || '',
  }
  const key = row.client_submission_key || (row.id != null ? String(row.id) : undefined)
  return buildEntry(payload, {
    id: key ?? `remote-${Date.now()}`,
    submissionKey: key,
    coordinates: {
      lat: Number(row.lat ?? CITY_FALLBACK_COORDS[city]?.lat ?? 35.6762),
      lng: Number(row.lng ?? CITY_FALLBACK_COORDS[city]?.lng ?? 139.6503),
    },
  })
}

// PlaceEntry + payload → row (DATA_MODEL.md §7b write path).
function entryToRow(entry: PlaceEntry, payload: SubmissionPayload): SpotRow {
  return {
    client_submission_key: entry.submissionKey ?? entry.id,
    category: payload.category,
    name: payload.name || '',
    sub_category: payload.subCategory || '',
    cost_tier: Number(payload.costTier) || 1,
    city: payload.city,
    suburb: payload.suburb || '',
    speciality: payload.speciality || '',
    description: payload.description || '',
    google_maps_link: payload.googleMapsLink || '',
    approx_wait: payload.approxWait || '',
    booking_requirement: payload.bookingRequirement || '',
    lat: entry.coordinates?.lat ?? null,
    lng: entry.coordinates?.lng ?? null,
  }
}

function readLocal(): PlaceEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as PlaceEntry[]
  } catch {
    return []
  }
}

export interface SubmitResult {
  ok: boolean
  message: string
}

export interface UseSubmittedSpots {
  restaurants: PlaceEntry[]
  attractions: PlaceEntry[]
  animalCafes: PlaceEntry[]
  submit(payload: SubmissionPayload): Promise<SubmitResult>
}

/** Load + realtime + insert + localStorage for submitted spots
 * (API.md §2, DATA_MODEL.md §7). Optimistic local apply happens first,
 * regardless of Supabase; dedup by client_submission_key via a seen-keys Set. */
export function useSubmittedSpots(auth: AuthState): UseSubmittedSpots {
  const [submitted, setSubmitted] = useState<PlaceEntry[]>([])
  const seenKeys = useRef<Set<string>>(new Set())

  // Idempotent apply into state (dedup by key), optionally persisting locally.
  const apply = useCallback((entry: PlaceEntry, persist: boolean) => {
    const key = entry.submissionKey || entry.id
    if (key && seenKeys.current.has(key)) return
    if (key) seenKeys.current.add(key)
    setSubmitted((prev) => [...prev, entry])
    if (persist) {
      try {
        const existing = readLocal()
        existing.push(entry)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(existing))
      } catch {
        /* storage full / private mode — optimistic state still holds */
      }
    }
  }, [])

  // Hydrate local + (signed-in) load remote + subscribe.
  useEffect(() => {
    if (auth.status !== 'open' && auth.status !== 'signedIn') return

    // own submissions from this device
    for (const entry of readLocal()) apply(entry, false)

    if (auth.status !== 'signedIn' || !supabase) return
    const client = supabase // narrowed non-null for the async closures below

    let cancelled = false

    client
      .from(TABLES.spots)
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        for (const row of data as SpotRow[]) apply(rowToEntry(row), false)
      })

    const channel: RealtimeChannel = client
      .channel('submitted-spots-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLES.spots },
        (payload) => apply(rowToEntry(payload.new as SpotRow), false),
      )
      .subscribe()

    return () => {
      cancelled = true
      client.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status])

  const submit = useCallback(
    async (payload: SubmissionPayload): Promise<SubmitResult> => {
      const entry = buildEntry(payload)
      // optimistic: apply + persist locally first, regardless of Supabase.
      apply(entry, true)

      if (!supabase) {
        return { ok: true, message: 'Spot added to the map and tabs on this device.' }
      }
      const { error } = await supabase
        .from(TABLES.spots)
        .insert(entryToRow(entry, payload))
      if (error) {
        return {
          ok: false,
          message: 'Saved on this device — shared sync failed right now.',
        }
      }
      return { ok: true, message: 'Spot submitted and shared with you both.' }
    },
    [apply],
  )

  const restaurants = useMemo(
    () => [...BASE_RESTAURANTS, ...submitted.filter((e) => e.type === 'Restaurant')],
    [submitted],
  )
  const attractions = useMemo(
    () => [...BASE_ATTRACTIONS, ...submitted.filter((e) => e.type === 'Attraction')],
    [submitted],
  )
  const animalCafes = useMemo(
    () => [...BASE_ANIMAL_CAFES, ...submitted.filter((e) => e.type === 'Animal Cafe')],
    [submitted],
  )

  return { restaurants, attractions, animalCafes, submit }
}
