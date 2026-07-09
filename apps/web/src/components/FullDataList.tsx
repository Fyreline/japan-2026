import { useMemo, useState } from 'react'
import { ACCOMMODATIONS } from '../data/accommodations'
import { IDEAS, ideaMapLink } from '../data/ideas'
import { CITY_ORDER, type City, type PlaceEntry } from '../data/types'
import {
  entryCardFields,
  entryCardLinks,
  entryCardPills,
  entryFocus,
} from '../data/entryView'
import { itemKeyForEntry, itemKeyForIdea } from '../data/itemKey'
import type { CardField, CardLink } from './PlaceCard'
import type { MapFocus } from '../mapFocus'
import type { UseVisited } from '../hooks/useVisited'
import { FilterPills, type PillOption } from './FilterPills'
import { SearchInput } from './SearchInput'
import { PlaceCard } from './PlaceCard'

type Primary =
  | 'Accommodation'
  | 'Ideas'
  | 'Restaurants'
  | 'Attractions'
  | 'Animal Cafes'

interface FullEntry {
  id: string
  title: string
  city: string
  primary: Primary
  sub: string
  pills: string[]
  description: string
  fields: CardField[]
  links: CardLink[]
  source?: string
  badge?: string
  focus: MapFocus | null
  search: string
  /** Visited-mark key — absent for accommodation/event rows (DATA_MODEL.md
   * §10a: you don't tick off your own hotel; no toggle on those cards). */
  itemKey?: string
}

const PRIMARY_ORDER: Primary[] = [
  'Accommodation',
  'Ideas',
  'Restaurants',
  'Attractions',
  'Animal Cafes',
]

function cityRank(city: string): number {
  const i = CITY_ORDER.indexOf(city as City)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

function placeToFull(e: PlaceEntry, primary: Primary): FullEntry {
  return {
    id: `place:${e.id}`,
    title: e.title,
    city: e.city,
    primary,
    sub: e.category,
    pills: entryCardPills(e),
    description: e.description,
    fields: entryCardFields(e),
    links: entryCardLinks(e),
    source: e.source,
    badge: e.source === 'User Submission' ? 'User Submission' : undefined,
    focus: entryFocus(e),
    search: [e.name, e.city, e.category, e.type, e.description].join(' ').toLowerCase(),
    itemKey: itemKeyForEntry(e),
  }
}

export function FullDataList({
  restaurants,
  attractions,
  animalCafes,
  onSeeOnMap,
  visited,
}: {
  restaurants: PlaceEntry[]
  attractions: PlaceEntry[]
  animalCafes: PlaceEntry[]
  onSeeOnMap(f: MapFocus): void
  visited: UseVisited
}) {
  const [primary, setPrimary] = useState<'All' | Primary>('All')
  const [sub, setSub] = useState('All')
  const [city, setCity] = useState('All')
  const [query, setQuery] = useState('')

  const all: FullEntry[] = useMemo(() => {
    const acc: FullEntry[] = ACCOMMODATIONS.map((a) => ({
      id: `accommodation:${a.id}`,
      title: a.title,
      city: a.city,
      primary: 'Accommodation',
      sub: a.category,
      pills: [a.category, a.city, a.suburb],
      description: a.details,
      fields: [{ label: 'Dates', value: a.dates }],
      links: a.link ? [{ label: 'Link', href: a.link }] : [],
      focus: {
        layer: 'accommodation',
        markerId: `accommodation:${a.id}`,
        lat: a.lat,
        lng: a.lng,
        nonce: 0,
      },
      search: [a.title, a.city, a.category, a.details].join(' ').toLowerCase(),
    }))
    const ideas: FullEntry[] = IDEAS.map((idea) => ({
      id: `ideas:${idea.id}`,
      title: idea.title,
      city: idea.city,
      primary: 'Ideas',
      sub: 'Idea',
      pills: [idea.tag, idea.city, idea.suburb],
      description: idea.description,
      fields: [{ label: 'Cost', value: idea.cost }],
      links: [{ label: 'Map', href: ideaMapLink(idea) }],
      focus: {
        layer: 'ideas',
        markerId: `ideas:${idea.id}`,
        lat: idea.lat,
        lng: idea.lng,
        nonce: 0,
      },
      search: [idea.title, idea.city, idea.suburb, idea.tag, idea.description]
        .join(' ')
        .toLowerCase(),
      itemKey: itemKeyForIdea(idea),
    }))
    return [
      ...acc,
      ...ideas,
      ...restaurants.map((e) => placeToFull(e, 'Restaurants')),
      ...attractions.map((e) => placeToFull(e, 'Attractions')),
      ...animalCafes.map((e) => placeToFull(e, 'Animal Cafes')),
    ]
  }, [restaurants, attractions, animalCafes])

  const cityOptions: PillOption[] = useMemo(() => {
    const set = [...new Set(all.map((e) => e.city))].sort(
      (a, b) => cityRank(a) - cityRank(b),
    )
    return [{ value: 'All', label: 'All cities' }, ...set.map((c) => ({ value: c, label: c }))]
  }, [all])

  const primaryOptions: PillOption[] = [
    { value: 'All', label: 'All categories' },
    ...PRIMARY_ORDER.map((p) => ({ value: p, label: p })),
  ]

  const subOptions: PillOption[] = useMemo(() => {
    if (primary === 'All') return []
    const inScope = all.filter(
      (e) => e.primary === primary && (city === 'All' || e.city === city),
    )
    const set = [...new Set(inScope.map((e) => e.sub))].sort((a, b) => a.localeCompare(b))
    if (set.length <= 1) return []
    return [
      { value: 'All', label: 'All sub-categories' },
      ...set.map((s) => ({ value: s, label: s })),
    ]
  }, [all, primary, city])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = all.filter(
      (e) =>
        (primary === 'All' || e.primary === primary) &&
        (sub === 'All' || e.sub === sub) &&
        (city === 'All' || e.city === city) &&
        (q === '' || e.search.includes(q)),
    )
    const byCity = new Map<string, FullEntry[]>()
    for (const e of filtered) {
      if (!byCity.has(e.city)) byCity.set(e.city, [])
      byCity.get(e.city)!.push(e)
    }
    for (const list of byCity.values()) {
      list.sort(
        (a, b) => PRIMARY_ORDER.indexOf(a.primary) - PRIMARY_ORDER.indexOf(b.primary),
      )
    }
    return [...byCity.entries()].sort((a, b) => cityRank(a[0]) - cityRank(b[0]))
  }, [all, primary, sub, city, query])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <FilterPills options={cityOptions} active={city} onSelect={setCity} label="Filter by city" />
        <FilterPills
          options={primaryOptions}
          active={primary}
          onSelect={(v) => {
            setPrimary(v as 'All' | Primary)
            setSub('All')
          }}
          label="Filter by category"
        />
        {subOptions.length > 0 && (
          <FilterPills options={subOptions} active={sub} onSelect={setSub} label="Filter by sub-category" />
        )}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search the full dataset by name, city, category…"
        />
      </div>

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-soft">Nothing matches those filters.</p>
      )}

      {groups.map(([cityName, items]) => (
        <section key={cityName} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              {cityName}
            </h2>
            <span className="font-mono text-[11px] text-ink-soft">{items.length} items</span>
          </div>
          <div className="grid gap-3">
            {items.map((entry) => (
              <PlaceCard
                key={entry.id}
                title={entry.title}
                pills={entry.pills}
                description={entry.description}
                fields={entry.fields}
                links={entry.links}
                badge={entry.badge}
                visited={entry.itemKey ? visited.isVisited(entry.itemKey) : undefined}
                onToggleVisited={
                  entry.itemKey ? () => visited.toggle(entry.itemKey!) : undefined
                }
                onSeeOnMap={
                  entry.focus
                    ? () => onSeeOnMap({ ...entry.focus!, nonce: Date.now() })
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
