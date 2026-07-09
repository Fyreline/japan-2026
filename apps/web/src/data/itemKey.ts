import type { PlaceEntry, PlaceType, TripIdea } from './types'

// Visited-mark canonical keys (DATA_MODEL.md §10a). itemSlug is the ONLY
// slugger for these keys — never reuse normalize.ts's display slug() here,
// and never change this function once marks exist (as frozen as slot_key).

/** Deterministic, index-free slug. NFKC first so width/compat variants of the
 *  same Japanese string collapse; \p{L}\p{N} keeps CJK intact. */
export function itemSlug(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function itemKeyForIdea(idea: TripIdea): string {
  return `idea:${idea.id}` // authored ids are already stable
}

const KIND_PREFIX: Record<PlaceType, string> = {
  Restaurant: 'restaurant',
  Attraction: 'attraction',
  'Animal Cafe': 'cafe',
}

export function itemKeyForEntry(e: PlaceEntry): string {
  if (e.submissionKey) return `spot:${e.submissionKey}` // submissions: the permanent handle
  return `${KIND_PREFIX[e.type]}:${itemSlug(e.city)}:${itemSlug(e.suburb)}:${itemSlug(e.name)}`
}
