import { useState } from 'react'
import type { City, PlaceType, SubmissionPayload } from '../data/types'
import type { SubmitResult } from '../hooks/useSubmittedSpots'

const SUB_CATEGORIES: Record<PlaceType, string[]> = {
  Restaurant: [
    'Cheap Eats',
    'Family Friendly',
    'Hidden Gem',
    'High End',
    'Local Cuisine Specialty',
    'Vegetarian / Vegan Friendly',
  ],
  Attraction: ['Top 10', 'Hidden Gems', 'Museum', 'Temple / Shrine', 'Nature', 'Experience'],
  'Animal Cafe': ['Cats', 'Dogs', 'Otters', 'Capybaras', 'Birds', 'Mixed Animals'],
}

const CITIES: City[] = ['Tokyo', 'Fuji', 'Hiroshima', 'Osaka', 'Kyoto']

const inputCls =
  'min-h-11 w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none placeholder:text-cloud focus:border-clay'
const labelCls = 'text-[13px] font-medium text-ink-mid'

export function SubmitForm({
  onSubmit,
}: {
  onSubmit(payload: SubmissionPayload): Promise<SubmitResult>
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PlaceType>('Restaurant')
  const [subCategory, setSubCategory] = useState(SUB_CATEGORIES.Restaurant[0])
  const [costTier, setCostTier] = useState('1')
  const [city, setCity] = useState<City>('Tokyo')
  const [suburb, setSuburb] = useState('')
  const [speciality, setSpeciality] = useState('')
  const [description, setDescription] = useState('')
  const [googleMapsLink, setGoogleMapsLink] = useState('')
  const [approxWait, setApproxWait] = useState('')
  const [bookingRequirement, setBookingRequirement] = useState('')

  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function changeCategory(next: PlaceType) {
    setCategory(next)
    setSubCategory(SUB_CATEGORIES[next][0])
  }

  function reset() {
    setName('')
    setSuburb('')
    setSpeciality('')
    setDescription('')
    setGoogleMapsLink('')
    setApproxWait('')
    setBookingRequirement('')
    setCostTier('1')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !subCategory || !speciality.trim() || !description.trim() || !googleMapsLink.trim()) {
      setResult({ ok: false, message: 'Please fill in all required fields.' })
      return
    }
    setBusy(true)
    const res = await onSubmit({
      name: name.trim(),
      category,
      subCategory,
      costTier: Number(costTier),
      city,
      suburb: suburb.trim(),
      speciality: speciality.trim(),
      description: description.trim(),
      googleMapsLink: googleMapsLink.trim(),
      approxWait: approxWait.trim(),
      bookingRequirement: bookingRequirement.trim(),
    })
    setBusy(false)
    setResult(res)
    if (res.ok) reset()
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-lg border border-line bg-paper-mid p-5">
        <h2 className="font-display text-xl font-medium text-ink">Submit a spot</h2>
        <p className="mt-1 text-sm text-ink-mid">
          Found somewhere good? Add it and it appears on the map and tabs straight away. When
          shared sync is on, it shows up for you both.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelCls}>Name</span>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Uobei Shibuya Dogenzaka"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Category</span>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => changeCategory(e.target.value as PlaceType)}
            >
              <option value="Restaurant">Restaurant</option>
              <option value="Attraction">Attraction</option>
              <option value="Animal Cafe">Animal Cafe</option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Sub-category</span>
            <select
              className={inputCls}
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
            >
              {SUB_CATEGORIES[category].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Approx cost</span>
            <select
              className={inputCls}
              value={costTier}
              onChange={(e) => setCostTier(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {'£'.repeat(n)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>City</span>
            <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value as City)}>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Suburb / area</span>
            <input
              className={inputCls}
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g. Asakusa"
            />
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelCls}>Speciality</span>
            <input
              className={inputCls}
              value={speciality}
              onChange={(e) => setSpeciality(e.target.value)}
              placeholder="e.g. Matcha parfait, ramen, owl interaction"
            />
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelCls}>Description</span>
            <textarea
              className={`${inputCls} min-h-24 py-2.5`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what it is and why it's good"
            />
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelCls}>Google Maps link</span>
            <input
              className={inputCls}
              value={googleMapsLink}
              onChange={(e) => setGoogleMapsLink(e.target.value)}
              placeholder="Paste Google Maps link"
            />
            <span className="text-[12px] text-ink-soft">
              Copy the share link from Google Maps. If coordinates are missing, the city centre is
              used.
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Approx wait (optional)</span>
            <input
              className={inputCls}
              value={approxWait}
              onChange={(e) => setApproxWait(e.target.value)}
              placeholder="e.g. 15–30 mins"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelCls}>Booking requirement (optional)</span>
            <select
              className={inputCls}
              value={bookingRequirement}
              onChange={(e) => setBookingRequirement(e.target.value)}
            >
              <option value="">Not specified</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Recommended">Recommended</option>
              <option value="Required">Required</option>
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-clay px-4 py-2.5 text-sm font-medium text-paper transition hover:bg-clay-deep disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Add spot'}
            </button>
            {result && (
              <span
                aria-live="polite"
                className={`text-[13px] ${result.ok ? 'text-olive' : 'text-kraft'}`}
              >
                {result.message}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
