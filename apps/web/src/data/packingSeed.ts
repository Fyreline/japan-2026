import type { PackingItem } from './types'

// PACKING_SEED — DATA_MODEL.md §11d, verbatim (keys, categories, labels;
// generic by rule — no real names, no finances, no venue hints). Seeded on
// first signed-in load if the table is empty, same race-proof protocol as
// the itinerary (§6f). Positions on the 10/20/30… lattice per category.
export const PACKING_SEED: PackingItem[] = [
  // ── documents ──────────────────────────────────────────────────────────
  { itemKey: 'pk-documents-passports', category: 'documents', label: 'Passports', checked: false, position: 10 },
  { itemKey: 'pk-documents-idp', category: 'documents', label: 'International Driving Permit (Fuji car leg)', checked: false, position: 20 },
  { itemKey: 'pk-documents-insurance', category: 'documents', label: 'Travel + driving insurance details', checked: false, position: 30 },
  { itemKey: 'pk-documents-esim', category: 'documents', label: 'eSIM installed and tested', checked: false, position: 40 },
  { itemKey: 'pk-documents-flights', category: 'documents', label: 'Flight details saved offline', checked: false, position: 50 },
  { itemKey: 'pk-documents-bookings', category: 'documents', label: 'Hotel booking confirmations', checked: false, position: 60 },

  // ── electronics ────────────────────────────────────────────────────────
  { itemKey: 'pk-electronics-adapters', category: 'electronics', label: 'Plug adapters (Japan type A)', checked: false, position: 10 },
  { itemKey: 'pk-electronics-chargers', category: 'electronics', label: 'Phone chargers + cables', checked: false, position: 20 },
  { itemKey: 'pk-electronics-battery', category: 'electronics', label: 'Battery pack, charged', checked: false, position: 30 },
  { itemKey: 'pk-electronics-camera', category: 'electronics', label: 'Camera + spare card', checked: false, position: 40 },
  { itemKey: 'pk-electronics-earphones', category: 'electronics', label: 'Earphones', checked: false, position: 50 },

  // ── clothing ───────────────────────────────────────────────────────────
  { itemKey: 'pk-clothing-layers', category: 'clothing', label: 'Light layers — warm days, cool evenings', checked: false, position: 10 },
  { itemKey: 'pk-clothing-shoes', category: 'clothing', label: 'Comfortable walking shoes, broken in', checked: false, position: 20 },
  { itemKey: 'pk-clothing-rain', category: 'clothing', label: 'Rain jacket or compact umbrella', checked: false, position: 30 },
  { itemKey: 'pk-clothing-onsen', category: 'clothing', label: 'Small towel for onsen/sento', checked: false, position: 40 },
  { itemKey: 'pk-clothing-laundry', category: 'clothing', label: 'Laundry bag (coin laundries are everywhere)', checked: false, position: 50 },

  // ── health ─────────────────────────────────────────────────────────────
  { itemKey: 'pk-health-medication', category: 'health', label: 'Regular medication, in original packaging', checked: false, position: 10 },
  { itemKey: 'pk-health-firstaid', category: 'health', label: 'Paracetamol + plasters + basics', checked: false, position: 20 },
  { itemKey: 'pk-health-sanitiser', category: 'health', label: 'Hand sanitiser (many toilets lack soap)', checked: false, position: 30 },

  // ── other ──────────────────────────────────────────────────────────────
  { itemKey: 'pk-other-coinpurse', category: 'other', label: 'Coin purse — ¥ coins pile up fast', checked: false, position: 10 },
  { itemKey: 'pk-other-totebag', category: 'other', label: 'Foldable tote for shopping + konbini runs', checked: false, position: 20 },
  { itemKey: 'pk-other-pen', category: 'other', label: 'Pen for immigration forms', checked: false, position: 30 },
  { itemKey: 'pk-other-daybag', category: 'other', label: 'Day bag', checked: false, position: 40 },
  { itemKey: 'pk-other-rubbishbag', category: 'other', label: 'Small bag for daytime rubbish (public bins are rare)', checked: false, position: 50 },
]
