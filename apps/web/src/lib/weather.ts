// The app's one non-Supabase call (API.md §8, ARCHITECTURE.md §18).
// Open-Meteo's free non-commercial tier is genuinely keyless — no account,
// no auth header, no signup. Plain fetch of a public URL is the entire
// integration. This module imports NOTHING from lib/supabase.ts and nothing
// weather-related ever goes in an env file or repo variable.
import { CITY_FALLBACK_COORDS } from '../data/normalize'
import type { City, WeatherSnapshot } from '../data/types'

// WMO weather_code → display (DATA_MODEL.md §13b). Unknown codes fall back
// to '—' with no emoji.
export const WEATHER_LABELS: { codes: number[]; label: string; emoji: string }[] = [
  { codes: [0], label: 'Clear', emoji: '☀️' },
  { codes: [1, 2], label: 'Mostly clear', emoji: '🌤️' },
  { codes: [3], label: 'Overcast', emoji: '☁️' },
  { codes: [45, 48], label: 'Fog', emoji: '🌫️' },
  { codes: [51, 52, 53, 54, 55, 56, 57], label: 'Drizzle', emoji: '🌦️' },
  { codes: [61, 62, 63, 64, 65, 66, 67], label: 'Rain', emoji: '🌧️' },
  { codes: [71, 72, 73, 74, 75, 76, 77, 85, 86], label: 'Snow', emoji: '🌨️' },
  { codes: [80, 81, 82], label: 'Showers', emoji: '🌦️' },
  { codes: [95, 96, 97, 98, 99], label: 'Thunderstorm', emoji: '⛈️' },
]

export function weatherLabel(code: number): { label: string; emoji: string } {
  const found = WEATHER_LABELS.find((w) => w.codes.includes(code))
  return found ?? { label: '—', emoji: '' }
}

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

function toSnapshot(city: City, json: OpenMeteoResponse): WeatherSnapshot {
  return {
    city,
    fetchedAt: Date.now(),
    current: {
      temp: json.current.temperature_2m,
      code: json.current.weather_code,
    },
    daily: json.daily.time.map((date, i) => ({
      date,
      code: json.daily.weather_code[i],
      tMax: json.daily.temperature_2m_max[i],
      tMin: json.daily.temperature_2m_min[i],
      rainChance: json.daily.precipitation_probability_max[i],
    })),
  }
}

// lib/weather.ts — plain fetch, no supabase import, no headers, no key.
export async function fetchWeather(city: City): Promise<WeatherSnapshot> {
  const { lat, lng } = CITY_FALLBACK_COORDS[city]
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '7',
  }).toString()

  const res = await fetch(url) // throws offline — caller catches
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  const json = (await res.json()) as OpenMeteoResponse
  return toSnapshot(city, json)
}
