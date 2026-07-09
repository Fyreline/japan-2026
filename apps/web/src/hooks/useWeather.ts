import { useEffect, useState } from 'react'
import { fetchWeather } from '../lib/weather'
import type { City, WeatherSnapshot } from '../data/types'

const CACHE_KEY = 'japan2026WeatherCache'
const FRESH_MS = 30 * 60 * 1000 // 30 min
const STALE_CEILING_MS = 6 * 60 * 60 * 1000 // 6 h

type Cache = Partial<Record<City, WeatherSnapshot>>

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* storage full / private mode — in-memory state still holds */
  }
}

export interface UseWeatherResult {
  snapshot: WeatherSnapshot | null
  stale: boolean // true = showing a >30min-old cached copy ("as of HH:MM")
}

/** DATA_MODEL.md §13c cache discipline: <30min fresh → served without
 * fetching; older → refetch, showing the stale copy meanwhile; fetch fails
 * and the copy is <6h old → keep showing it; >6h with no network → hide.
 * Never an error state (ARCHITECTURE.md §18). */
export function useWeather(city: City | null): UseWeatherResult {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(() =>
    city ? (readCache()[city] ?? null) : null,
  )

  useEffect(() => {
    if (!city) {
      setSnapshot(null)
      return
    }
    let cancelled = false
    const cached = readCache()[city] ?? null
    setSnapshot(cached)

    const age = cached ? Date.now() - cached.fetchedAt : Infinity
    if (age < FRESH_MS) return // fresh enough — no fetch

    fetchWeather(city)
      .then((fresh) => {
        if (cancelled) return
        const cache = readCache()
        cache[city] = fresh
        writeCache(cache)
        setSnapshot(fresh)
      })
      .catch(() => {
        // Fetch failed — keep showing the cached copy (caller decides
        // whether it's within the 6h ceiling via `stale`/fetchedAt). If
        // there was no cache at all, `snapshot` stays null → card hides.
      })

    return () => {
      cancelled = true
    }
  }, [city])

  if (!snapshot) return { snapshot: null, stale: false }

  const age = Date.now() - snapshot.fetchedAt
  if (age > STALE_CEILING_MS) return { snapshot: null, stale: false }

  return { snapshot, stale: age >= FRESH_MS }
}
