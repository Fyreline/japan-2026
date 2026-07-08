import type { ItineraryDay } from './types'

// 14 day-metadata records, ported from the current index.html `itinerary`
// array (day/date/city/leg/hotel/hotelBooked only — DATA_MODEL.md §6a). The
// old travel/acts/note/secret strings do NOT carry over as fields here; their
// content folds into the slot seed instead (itinerarySeed.ts). No per-day
// budget field — finance data stays out of this public repo.
export const ITINERARY_DAYS: ItineraryDay[] = [
  { day: 1, date: 'Sun 20 Sep', city: 'Tokyo', leg: 'Tokyo', hotel: 'APA Hotel Higashi Shinjuku Kabukicho Tower', hotelBooked: true },
  { day: 2, date: 'Mon 21 Sep', city: 'Tokyo', leg: 'Tokyo', hotel: 'APA Hotel Higashi Shinjuku Kabukicho Tower', hotelBooked: true },
  { day: 3, date: 'Tue 22 Sep', city: 'Tokyo', leg: 'Tokyo', hotel: 'APA Hotel Higashi Shinjuku Kabukicho Tower', hotelBooked: true },
  { day: 4, date: 'Wed 23 Sep', city: 'Mt. Fuji / Hakone', leg: 'Fuji', hotel: 'Mt Fuji View & Private Sauna Ryokan Shizuku しずく', hotelBooked: true },
  { day: 5, date: 'Thu 24 Sep', city: 'Mt. Fuji / Hakone', leg: 'Fuji', hotel: 'Mt Fuji View & Private Sauna Ryokan Shizuku しずく', hotelBooked: true },
  { day: 6, date: 'Fri 25 Sep', city: 'Mt. Fuji / Hakone', leg: 'Fuji', hotel: 'Mt Fuji View & Private Sauna Ryokan Shizuku しずく', hotelBooked: true },
  { day: 7, date: 'Sat 26 Sep', city: 'Hiroshima', leg: 'Hiroshima', hotel: '', hotelBooked: false },
  { day: 8, date: 'Sun 27 Sep', city: 'Hiroshima', leg: 'Hiroshima', hotel: '', hotelBooked: false },
  { day: 9, date: 'Mon 28 Sep', city: 'Osaka', leg: 'Osaka', hotel: '', hotelBooked: false },
  { day: 10, date: 'Tue 29 Sep', city: 'Osaka', leg: 'Osaka', hotel: '', hotelBooked: false },
  { day: 11, date: 'Wed 30 Sep', city: 'Kyoto', leg: 'Kyoto', hotel: '', hotelBooked: false },
  { day: 12, date: 'Thu 1 Oct', city: 'Kyoto', leg: 'Kyoto', hotel: '', hotelBooked: false },
  { day: 13, date: 'Fri 2 Oct', city: 'Tokyo', leg: 'Tokyo', hotel: 'Somewhere cheap near Haneda', hotelBooked: false },
  { day: 14, date: 'Sat 3 Oct', city: 'Homeward bound', leg: 'Home', hotel: '', hotelBooked: false },
]
