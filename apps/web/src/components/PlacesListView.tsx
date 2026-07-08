import { useMemo, useState } from 'react'
import { CITY_ORDER, type City, type PlaceEntry } from '../data/types'
import {
  entryCardFields,
  entryCardLinks,
  entryCardPills,
  entryFocus,
} from '../data/entryView'
import type { MapFocus } from '../mapFocus'
import { FilterPills, type PillOption } from './FilterPills'
import { SearchInput } from './SearchInput'
import { PlaceCard } from './PlaceCard'

function cityRank(city: string): number {
  const i = CITY_ORDER.indexOf(city as City)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

function searchText(e: PlaceEntry): string {
  return [
    e.name,
    e.city,
    e.suburb,
    e.category,
    e.cuisineType ?? '',
    e.description,
    (e.animals ?? []).join(' '),
    e.approxWait ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

/** Restaurants / Attractions / Animal cafés share this shell: city pills +
 * collapsible category pills + search, cards grouped by city (DESIGN.md §7). */
export function PlacesListView({
  entries,
  itemNoun,
  searchPlaceholder,
  onSeeOnMap,
}: {
  entries: PlaceEntry[]
  itemNoun: string
  searchPlaceholder: string
  onSeeOnMap(f: MapFocus): void
}) {
  const [city, setCity] = useState('All')
  const [category, setCategory] = useState('All')
  const [showCategories, setShowCategories] = useState(true)
  const [query, setQuery] = useState('')

  const cityOptions: PillOption[] = useMemo(() => {
    const set = [...new Set(entries.map((e) => e.city))].sort(
      (a, b) => cityRank(a) - cityRank(b),
    )
    return [
      { value: 'All', label: 'All cities' },
      ...set.map((c) => ({ value: c, label: c })),
    ]
  }, [entries])

  const categoryOptions: PillOption[] = useMemo(() => {
    const inCity = entries.filter((e) => city === 'All' || e.city === city)
    const set = [...new Set(inCity.map((e) => e.category))].sort((a, b) =>
      a.localeCompare(b),
    )
    return [
      { value: 'All', label: 'All categories' },
      ...set.map((c) => ({ value: c, label: c })),
    ]
  }, [entries, city])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = entries.filter(
      (e) =>
        (city === 'All' || e.city === city) &&
        (category === 'All' || e.category === category) &&
        (q === '' || searchText(e).includes(q)),
    )
    const byCity = new Map<string, PlaceEntry[]>()
    for (const e of filtered) {
      if (!byCity.has(e.city)) byCity.set(e.city, [])
      byCity.get(e.city)!.push(e)
    }
    return [...byCity.entries()].sort((a, b) => cityRank(a[0]) - cityRank(b[0]))
  }, [entries, city, category, query])

  function selectCity(v: string) {
    setCity(v)
    setCategory('All')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <FilterPills
          options={cityOptions}
          active={city}
          onSelect={selectCity}
          label="Filter by city"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowCategories((v) => !v)}
            aria-expanded={showCategories}
            className="self-start rounded-full border border-line bg-paper-mid px-3 py-1 text-xs font-medium text-ink-soft transition hover:text-ink"
          >
            Categories {showCategories ? '▾' : '▸'}
          </button>
          {showCategories && (
            <FilterPills
              options={categoryOptions}
              active={category}
              onSelect={setCategory}
              label="Filter by category"
            />
          )}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      </div>

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-soft">
          No {itemNoun} match those filters.
        </p>
      )}

      {groups.map(([cityName, items]) => (
        <section key={cityName} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              {cityName}
            </h2>
            <span className="font-mono text-[11px] text-ink-soft">
              {items.length} {itemNoun}
            </span>
          </div>
          <div className="grid gap-3">
            {items.map((entry) => (
              <PlaceCard
                key={entry.id}
                title={entry.title}
                pills={entryCardPills(entry)}
                description={entry.description}
                fields={entryCardFields(entry)}
                links={entryCardLinks(entry)}
                badge={entry.source === 'User Submission' ? 'User Submission' : undefined}
                onSeeOnMap={
                  entry.coordinates ? () => onSeeOnMap(entryFocus(entry)!) : undefined
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
