import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { Accommodation, PlaceEntry, TripIdea } from '../data/types'
import { ideaMapLink } from '../data/ideas'
import { CITY_FALLBACK_COORDS } from '../data/normalize'
import { CITY_ORDER } from '../data/types'
import type { LayerKey, MapFocus } from '../mapFocus'
import { useTheme } from '../hooks/useTheme'

const TILE = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}
const TILE_ATTR =
  'Map tiles © <a href="https://carto.com/attributions">CARTO</a> · Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'

const LAYER_META: {
  key: LayerKey
  label: string
  colorVar: string
  symbol: string
}[] = [
  { key: 'accommodation', label: 'Hotels / Events', colorVar: '--color-ink', symbol: '🛌' },
  { key: 'ideas', label: 'Ideas', colorVar: '--color-sky', symbol: '•' },
  { key: 'restaurants', label: 'Restaurants', colorVar: '--color-kraft', symbol: '🍣' },
  { key: 'attractions', label: 'Attractions', colorVar: '--color-fig', symbol: '☆' },
  { key: 'animalCafes', label: 'Animal cafés', colorVar: '--color-olive', symbol: '🐾' },
]

const ALL_LAYERS: LayerKey[] = LAYER_META.map((l) => l.key)

function esc(text: string): string {
  return String(text ?? '').replace(/[&<>"]/g, (s) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[s] as string,
  )
}

function icon(colorVar: string, symbol: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="japan-marker" style="background: var(${colorVar})">${symbol}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  })
}

interface PopupModel {
  title: string
  kicker: string
  fields: { k: string; v: string }[]
  body?: string
  links: { href: string; label: string }[]
}

function popupHtml(m: PopupModel): string {
  const rows = m.fields
    .filter((f) => f.v)
    .map((f) => `<div class="popup-row"><span class="k">${esc(f.k)}:</span> ${esc(f.v)}</div>`)
    .join('')
  const links = m.links
    .filter((l) => l.href)
    .map((l) => `<div class="popup-row"><a href="${esc(l.href)}" target="_blank" rel="noreferrer">${esc(l.label)}</a></div>`)
    .join('')
  const body = m.body ? `<div class="popup-row">${esc(m.body)}</div>` : ''
  return `<h4>${esc(m.title)}</h4><div class="popup-kicker">${esc(m.kicker)}</div>${rows}${body}${links}`
}

export function MapView({
  accommodations,
  ideas,
  restaurants,
  attractions,
  animalCafes,
  focus,
  active,
}: {
  accommodations: Accommodation[]
  ideas: TripIdea[]
  restaurants: PlaceEntry[]
  attractions: PlaceEntry[]
  animalCafes: PlaceEntry[]
  focus: MapFocus | null
  active: boolean
}) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const layersRef = useRef<Record<LayerKey, L.LayerGroup>>(
    {} as Record<LayerKey, L.LayerGroup>,
  )
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    accommodation: true,
    ideas: true,
    restaurants: true,
    attractions: true,
    animalCafes: true,
  })
  const [panelOpen, setPanelOpen] = useState(true)

  // ── init (once) ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [36.205, 138.252],
      zoom: 6,
      minZoom: 4,
      maxBounds: [
        [20, 120],
        [46, 156],
      ],
      maxBoundsViscosity: 0.85,
      zoomControl: true,
    })
    mapRef.current = map

    tileRef.current = L.tileLayer(TILE[theme], {
      attribution: TILE_ATTR,
      maxZoom: 18,
      minZoom: 4,
    }).addTo(map)

    for (const key of ALL_LAYERS) {
      layersRef.current[key] = L.layerGroup().addTo(map)
    }

    // Dashed route polyline between the leg cities (DESIGN.md §7).
    const route = CITY_ORDER.map(
      (c) => [CITY_FALLBACK_COORDS[c].lat, CITY_FALLBACK_COORDS[c].lng] as [number, number],
    )
    // stroke colour comes from the .route-line CSS rule (index.css) — a CSS
    // `stroke` property resolves var(), unlike Leaflet's stroke *attribute*.
    L.polyline(route, {
      className: 'route-line',
      weight: 2,
      dashArray: '6 8',
      opacity: 0.7,
    }).addTo(map)

    setTimeout(() => map.invalidateSize(), 200)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── theme → swap CARTO tile set ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) map.removeLayer(tileRef.current)
    tileRef.current = L.tileLayer(TILE[theme], {
      attribution: TILE_ATTR,
      maxZoom: 18,
      minZoom: 4,
    }).addTo(map)
    tileRef.current.setZIndex(0)
  }, [theme])

  // ── (re)build markers when datasets change ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const registry = markersRef.current
    registry.clear()

    function place(
      key: LayerKey,
      id: string,
      lat: number,
      lng: number,
      colorVar: string,
      symbol: string,
      model: PopupModel,
    ) {
      const marker = L.marker([lat, lng], { icon: icon(colorVar, symbol) })
      marker.bindPopup(popupHtml(model), { closeButton: true, autoPan: true })
      marker.addTo(layersRef.current[key])
      registry.set(`${key}:${id}`, marker)
    }

    // clear all
    for (const key of ALL_LAYERS) layersRef.current[key].clearLayers()

    for (const a of accommodations) {
      const isEvent = a.category === 'Event'
      place(
        'accommodation',
        a.id,
        a.lat,
        a.lng,
        isEvent ? '--color-clay' : '--color-ink',
        isEvent ? '★' : '🛌',
        {
          title: a.title,
          kicker: `${a.category} · ${a.city}`,
          fields: [{ k: 'When', v: a.dates }],
          body: a.details,
          links: [{ href: a.link, label: 'Open link' }],
        },
      )
    }
    for (const idea of ideas) {
      place('ideas', idea.id, idea.lat, idea.lng, '--color-sky', '•', {
        title: idea.title,
        kicker: `Idea · ${idea.city}`,
        fields: [{ k: 'Cost', v: idea.cost }],
        body: idea.detail,
        links: [{ href: ideaMapLink(idea), label: 'Google Maps' }],
      })
    }
    const placeSets: [LayerKey, PlaceEntry[], string, string][] = [
      ['restaurants', restaurants, '--color-kraft', '🍣'],
      ['attractions', attractions, '--color-fig', '☆'],
      ['animalCafes', animalCafes, '--color-olive', '🐾'],
    ]
    for (const [key, list, colorVar, symbol] of placeSets) {
      for (const e of list) {
        if (!e.coordinates) continue
        const fields =
          e.type === 'Restaurant'
            ? [
                { k: 'Cost', v: e.costDisplay },
                { k: 'Rating', v: e.rating ?? '' },
                { k: 'Approx wait', v: e.approxWait ?? '' },
              ]
            : e.type === 'Attraction'
              ? [
                  { k: 'Booking', v: e.bookingRequirement ?? '' },
                  { k: 'Cost', v: e.costDisplay },
                ]
              : [
                  { k: 'Animals', v: (e.animals ?? []).join(', ') },
                  { k: 'Booking', v: e.bookingRequirement ?? '' },
                ]
        place(key, e.id, e.coordinates.lat, e.coordinates.lng, colorVar, symbol, {
          title: e.title,
          kicker: `${e.category} · ${e.city}`,
          fields,
          body: e.description,
          links: [{ href: e.link, label: e.type === 'Restaurant' ? 'Google Maps' : 'Website' }],
        })
      }
    }
  }, [accommodations, ideas, restaurants, attractions, animalCafes])

  // ── layer visibility toggles ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const key of ALL_LAYERS) {
      const group = layersRef.current[key]
      if (!group) continue
      if (visible[key]) {
        if (!map.hasLayer(group)) map.addLayer(group)
      } else if (map.hasLayer(group)) {
        map.removeLayer(group)
      }
    }
  }, [visible])

  // ── invalidate size when the tab becomes visible ──────────────────────────
  useEffect(() => {
    if (active && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 120)
    }
  }, [active])

  // ── "See on map" fly-to ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus) return
    // make sure the target layer is shown
    setVisible((v) => (v[focus.layer] ? v : { ...v, [focus.layer]: true }))
    const group = layersRef.current[focus.layer]
    if (group && !map.hasLayer(group)) map.addLayer(group)
    map.invalidateSize()
    const zoom = focus.layer === 'restaurants' ? 14 : 12
    map.flyTo([focus.lat, focus.lng], zoom, { duration: 1.2 })
    const marker = markersRef.current.get(focus.markerId)
    if (marker) marker.openPopup()
  }, [focus])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[calc(100dvh-13rem)] min-h-80 w-full overflow-hidden rounded-lg border border-line md:h-[560px]"
      />
      <aside className="absolute right-3 top-3 z-[500] w-56 rounded-lg border border-line bg-paper/95 p-3 text-sm shadow-float">
        <div className="flex items-center justify-between">
          <span className="font-display text-sm font-medium text-ink">Layers</span>
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft hover:text-ink"
          >
            {panelOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        {panelOpen && (
          <div className="mt-2 flex flex-col gap-1.5">
            {LAYER_META.map((l) => (
              <label key={l.key} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-mid">
                <input
                  type="checkbox"
                  checked={visible[l.key]}
                  onChange={(e) => setVisible((v) => ({ ...v, [l.key]: e.target.checked }))}
                  className="h-4 w-4 accent-clay"
                />
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full border border-paper"
                  style={{ background: `var(${l.colorVar})` }}
                />
                {l.label}
              </label>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}
