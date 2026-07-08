import { useMemo, useState } from 'react'
import { IDEAS, ideaMapLink } from '../data/ideas'
import { getIdeaLeg } from '../data/tripEssentials'
import { CITY_ORDER, type City, type TripIdea } from '../data/types'
import type { MapFocus } from '../mapFocus'
import { FilterPills, type PillOption } from './FilterPills'
import { SearchInput } from './SearchInput'
import { PlaceCard } from './PlaceCard'

const LEG_OPTIONS: PillOption[] = [
  { value: 'All', label: 'All legs' },
  { value: 'Tokyo', label: 'Tokyo' },
  { value: 'Fuji', label: 'Fuji' },
  { value: 'Hiroshima', label: 'Hiroshima' },
  { value: 'Osaka', label: 'Osaka' },
  { value: 'Kyoto', label: 'Kyoto' },
]

function cityRank(city: City): number {
  const i = CITY_ORDER.indexOf(city)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

function searchText(idea: TripIdea): string {
  return [idea.title, idea.city, idea.suburb, idea.description, idea.source, idea.tag]
    .join(' ')
    .toLowerCase()
}

export function IdeasList({ onSeeOnMap }: { onSeeOnMap(f: MapFocus): void }) {
  const [leg, setLeg] = useState('All')
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = IDEAS.filter(
      (idea) =>
        (leg === 'All' || getIdeaLeg(idea) === leg) &&
        (q === '' || searchText(idea).includes(q)),
    )
    const byArea = new Map<string, { city: City; suburb: string; items: TripIdea[] }>()
    for (const idea of filtered) {
      const key = `${idea.city}||${idea.suburb}`
      if (!byArea.has(key))
        byArea.set(key, { city: idea.city, suburb: idea.suburb, items: [] })
      byArea.get(key)!.items.push(idea)
    }
    return [...byArea.values()].sort((a, b) => {
      if (a.city !== b.city) return cityRank(a.city) - cityRank(b.city)
      return a.suburb.localeCompare(b.suburb)
    })
  }, [leg, query])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <FilterPills options={LEG_OPTIONS} active={leg} onSelect={setLeg} label="Filter by leg" />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search ideas by title, city or keyword…"
        />
      </div>

      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-soft">No ideas match that search.</p>
      )}

      {groups.map((group) => (
        <section key={`${group.city}||${group.suburb}`} className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              {group.city} · {group.suburb}
            </h2>
            <span className="font-mono text-[11px] text-ink-soft">
              {group.items.length} {group.items.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>
          <div className="grid gap-3">
            {group.items.map((idea) => (
              <PlaceCard
                key={idea.id}
                title={idea.title}
                pills={[idea.tag]}
                cost={idea.cost}
                description={idea.description}
                source={idea.source}
                links={[{ label: 'Map', href: ideaMapLink(idea) }]}
                onSeeOnMap={() =>
                  onSeeOnMap({
                    layer: 'ideas',
                    markerId: `ideas:${idea.id}`,
                    lat: idea.lat,
                    lng: idea.lng,
                    nonce: Date.now(),
                  })
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
