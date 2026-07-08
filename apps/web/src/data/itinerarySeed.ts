import type { ItinerarySlot } from './types'

// ITINERARY_SEED — the initial slot dataset (DATA_MODEL.md §6b), ~1 slot every
// 1.5–2.5h across each of the 14 days.
//
// SOURCE NOTE: PLAN.md/DATA_MODEL.md describe this seed as coming from "the
// owner's prototype". That prototype lives under the gitignored `Japan
// Itinerary/` folder, which CLAUDE.md and this repo's .gitignore forbid
// reading into anything written here ("the Google-Sheet export has finances,
// flights and the 22nd surprise" — .gitignore's own comment). That rule is
// absolute and outranks this cross-reference, so this seed is built instead
// from the CURRENT LIVE SITE's `itinerary` array (index.html) — the day's
// travel/acts/note strings, which DATA_MODEL.md §6a explicitly says "fold
// into the slot seed" — expanded into slots at the prototype's cadence, with
// generic wayfinding filler (breakfast/lunch/dinner/free time/wind-down)
// added to reach a natural ~6–9 slots/day. ~94 slots total, well within the
// spec's "~100" approximation. No file under `Japan Itinerary/` was read to
// produce this.
//
// Day 3 (Tue 22 Sep) is the one exception needing no substitution at all:
// DATA_MODEL.md §6b spells out its exact daytime sequence (breakfast → Edo-
// Tokyo Museum → lunch → Akihabara → Super Potato → arcade) and gives the
// evening slot's exact literal object, both reproduced verbatim below.
// Nothing occupies day 3 after 18:00; no seed entry anywhere hints at a venue
// for that evening.
//
// `slotKey`s are deterministic (dNN-HHMM-slug) and permanent sync handles —
// never rename after first commit. `position` seeds on the 10/20/30… lattice
// in time order within each day.
export const ITINERARY_SEED: ItinerarySlot[] = [
  // ── Day 1 · Sun 20 Sep · Tokyo — arrival ──────────────────────────────────
  { slotKey: 'd01-0700-haneda-arrival', day: 1, position: 10, time: '07:00', type: 'travel', text: '✈️ Land at Haneda — immigration & baggage' },
  { slotKey: 'd01-0900-transfer-shinjuku', day: 1, position: 20, time: '09:00', type: 'travel', text: "🚕 Transfer to Shinjuku — check in when the room's ready" },
  { slotKey: 'd01-1100-lunch', day: 1, position: 30, time: '11:00', type: 'food', text: '🍜 Light lunch near the hotel' },
  { slotKey: 'd01-1300-shinjuku-gyoen', day: 1, position: 40, time: '13:00', type: 'culture', text: '🌳 Shinjuku Gyoen National Garden' },
  { slotKey: 'd01-1530-wander-shinjuku', day: 1, position: 50, time: '15:30', type: 'free', text: '🚶 Wander Shinjuku, get your bearings' },
  { slotKey: 'd01-1800-dinner', day: 1, position: 60, time: '18:00', type: 'food', text: '🍣 Dinner — keep it easy on day one' },
  { slotKey: 'd01-2000-early-night', day: 1, position: 70, time: '20:00', type: 'sleep', text: '🛌 Early night — beat the jetlag' },

  // ── Day 2 · Mon 21 Sep · Tokyo ─────────────────────────────────────────────
  { slotKey: 'd02-0800-breakfast', day: 2, position: 10, time: '08:00', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd02-0930-meiji-jingu', day: 2, position: 20, time: '09:30', type: 'culture', text: '⛩️ Meiji Jingu Shrine — forest walk' },
  { slotKey: 'd02-1130-harajuku', day: 2, position: 30, time: '11:30', type: 'culture', text: '🛍️ Harajuku & Takeshita Street' },
  { slotKey: 'd02-1330-lunch', day: 2, position: 40, time: '13:30', type: 'food', text: '🍱 Lunch in Harajuku' },
  { slotKey: 'd02-1500-mandarake', day: 2, position: 50, time: '15:00', type: 'culture', text: '🎨 Mandarake, Shibuya' },
  { slotKey: 'd02-1700-shibuya-wander', day: 2, position: 60, time: '17:00', type: 'free', text: '🌆 Free time — Shibuya wander' },
  { slotKey: 'd02-1900-dinner', day: 2, position: 70, time: '19:00', type: 'food', text: '🍶 Dinner' },
  { slotKey: 'd02-2100-wind-down', day: 2, position: 80, time: '21:00', type: 'sleep', text: '🛌 Wind down' },

  // ── Day 3 · Tue 22 Sep · Tokyo — daytime per DATA_MODEL.md §6b's exact
  //    sequence; evening is the exact required surprise object. ─────────────
  { slotKey: 'd03-0800-breakfast', day: 3, position: 10, time: '08:00', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd03-0930-edo-tokyo-museum', day: 3, position: 20, time: '09:30', type: 'culture', text: '🏛️ Edo-Tokyo Museum' },
  { slotKey: 'd03-1200-lunch', day: 3, position: 30, time: '12:00', type: 'food', text: '🍜 Lunch' },
  { slotKey: 'd03-1330-akihabara', day: 3, position: 40, time: '13:30', type: 'culture', text: '🔌 Akihabara Electric Town' },
  { slotKey: 'd03-1500-super-potato', day: 3, position: 50, time: '15:00', type: 'culture', text: '🕹️ Super Potato retro games' },
  { slotKey: 'd03-1630-arcade-taiko', day: 3, position: 60, time: '16:30', type: 'free', text: '🎮 Arcade — Taiko no Tatsujin' },
  { slotKey: 'd03-1800-surprise', day: 3, position: 70, time: '18:00', type: 'surprise', text: 'Evening — Booked up 🤫' },

  // ── Day 4 · Wed 23 Sep · Fuji ──────────────────────────────────────────────
  { slotKey: 'd04-0800-breakfast', day: 4, position: 10, time: '08:00', type: 'food', text: '🍳 Breakfast, check out of the Tokyo hotel' },
  { slotKey: 'd04-0930-car-pickup', day: 4, position: 20, time: '09:30', type: 'travel', text: '🚗 Pick up the hire car — remember the ETC card' },
  { slotKey: 'd04-1100-drive-to-fuji', day: 4, position: 30, time: '11:00', type: 'travel', text: '🏔️ Drive to Fuji (~2h)' },
  { slotKey: 'd04-1330-lunch', day: 4, position: 40, time: '13:30', type: 'food', text: '🍱 Lunch on the way' },
  { slotKey: 'd04-1530-hakone-ropeway', day: 4, position: 50, time: '15:30', type: 'culture', text: '🚡 Hakone Ropeway & Lake Ashi' },
  { slotKey: 'd04-1800-ryokan-checkin', day: 4, position: 60, time: '18:00', type: 'sleep', text: '🧳 Check in to the ryokan' },
  { slotKey: 'd04-1930-dinner', day: 4, position: 70, time: '19:30', type: 'food', text: '🍲 Dinner at the ryokan' },

  // ── Day 5 · Thu 24 Sep · Fuji — free drive-out day ────────────────────────
  { slotKey: 'd05-0830-breakfast', day: 5, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast at the ryokan' },
  { slotKey: 'd05-1000-fuji-viewpoints', day: 5, position: 20, time: '10:00', type: 'free', text: '🗻 Free drive-out day — Mt Fuji viewpoints' },
  { slotKey: 'd05-1230-lunch', day: 5, position: 30, time: '12:30', type: 'food', text: '🍜 Lunch out' },
  { slotKey: 'd05-1400-narusawa-ice-cave', day: 5, position: 40, time: '14:00', type: 'culture', text: '🧊 Narusawa Ice Cave' },
  { slotKey: 'd05-1600-lake-kawaguchiko', day: 5, position: 50, time: '16:00', type: 'free', text: '🌅 Lake Kawaguchiko viewpoints' },
  { slotKey: 'd05-1830-sauna', day: 5, position: 60, time: '18:30', type: 'sleep', text: '♨️ Private sauna back at the ryokan' },
  { slotKey: 'd05-2000-dinner', day: 5, position: 70, time: '20:00', type: 'food', text: '🍲 Dinner' },

  // ── Day 6 · Fri 25 Sep · Fuji ──────────────────────────────────────────────
  { slotKey: 'd06-0830-breakfast', day: 6, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd06-1000-hakone-shrine', day: 6, position: 20, time: '10:00', type: 'culture', text: '⛩️ Hakone Shrine — lakeside torii' },
  { slotKey: 'd06-1200-lunch', day: 6, position: 30, time: '12:00', type: 'food', text: '🍱 Lunch' },
  { slotKey: 'd06-1400-drive-out', day: 6, position: 40, time: '14:00', type: 'free', text: '🚗 Drive-out around Fuji / Hakone' },
  { slotKey: 'd06-1630-free-time', day: 6, position: 50, time: '16:30', type: 'free', text: '🛍️ Free time — local shops' },
  { slotKey: 'd06-1830-pack', day: 6, position: 60, time: '18:30', type: 'default', text: "🧳 Pack for tomorrow's move" },
  { slotKey: 'd06-2000-dinner', day: 6, position: 70, time: '20:00', type: 'food', text: '🍲 Last dinner at the ryokan' },

  // ── Day 7 · Sat 26 Sep · Hiroshima — travel + Peace Park + Miyajima ───────
  { slotKey: 'd07-0700-checkout-drive', day: 7, position: 10, time: '07:00', type: 'travel', text: '🧳 Check out, drive to Nagoya' },
  { slotKey: 'd07-0930-car-dropoff', day: 7, position: 20, time: '09:30', type: 'travel', text: '🚗 Drop the hire car off' },
  { slotKey: 'd07-1100-shinkansen', day: 7, position: 30, time: '11:00', type: 'travel', text: '🚄 Shinkansen to Hiroshima' },
  { slotKey: 'd07-1400-peace-park', day: 7, position: 40, time: '14:00', type: 'culture', text: '🕊️ Hiroshima Peace Memorial Park' },
  { slotKey: 'd07-1600-miyajima', day: 7, position: 50, time: '16:00', type: 'culture', text: '⛴️ Ferry to Miyajima — Itsukushima Shrine' },
  { slotKey: 'd07-1830-miyajima-evening', day: 7, position: 60, time: '18:30', type: 'free', text: '🦌 Evening on Miyajima' },
  { slotKey: 'd07-2000-dinner', day: 7, position: 70, time: '20:00', type: 'food', text: '🍲 Dinner' },

  // ── Day 8 · Sun 27 Sep · Hiroshima — open day ─────────────────────────────
  { slotKey: 'd08-0830-breakfast', day: 8, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd08-1000-open-day', day: 8, position: 20, time: '10:00', type: 'free', text: '🌤️ Open day — plans to come' },
  { slotKey: 'd08-1230-lunch', day: 8, position: 30, time: '12:30', type: 'food', text: '🍜 Lunch' },
  { slotKey: 'd08-1430-free-exploring', day: 8, position: 40, time: '14:30', type: 'free', text: '🚶 Free exploring' },
  { slotKey: 'd08-1700-free-time', day: 8, position: 50, time: '17:00', type: 'free', text: '🛍️ Free time — shops' },
  { slotKey: 'd08-1900-dinner', day: 8, position: 60, time: '19:00', type: 'food', text: '🍲 Dinner' },

  // ── Day 9 · Mon 28 Sep · Osaka — travel + open day ────────────────────────
  { slotKey: 'd09-0830-breakfast', day: 9, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast, check out' },
  { slotKey: 'd09-1000-train-to-osaka', day: 9, position: 20, time: '10:00', type: 'travel', text: '🚄 Train Hiroshima → Osaka' },
  { slotKey: 'd09-1230-osaka-checkin', day: 9, position: 30, time: '12:30', type: 'sleep', text: '🧳 Check in to the Osaka hotel' },
  { slotKey: 'd09-1400-lunch', day: 9, position: 40, time: '14:00', type: 'food', text: '🍱 Lunch' },
  { slotKey: 'd09-1530-open-day', day: 9, position: 50, time: '15:30', type: 'free', text: '🌤️ Open day — plans to come' },
  { slotKey: 'd09-1800-dotonbori', day: 9, position: 60, time: '18:00', type: 'food', text: '🐙 Dotonbori food crawl' },
  { slotKey: 'd09-2030-evening-wander', day: 9, position: 70, time: '20:30', type: 'free', text: '🌃 Evening wander' },

  // ── Day 10 · Tue 29 Sep · Osaka — open day ────────────────────────────────
  { slotKey: 'd10-0830-breakfast', day: 10, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd10-1000-open-day', day: 10, position: 20, time: '10:00', type: 'free', text: '🌤️ Open day — plans to come' },
  { slotKey: 'd10-1230-lunch', day: 10, position: 30, time: '12:30', type: 'food', text: '🍜 Lunch' },
  { slotKey: 'd10-1430-free-exploring', day: 10, position: 40, time: '14:30', type: 'free', text: '🚶 Free exploring Osaka' },
  { slotKey: 'd10-1700-free-time', day: 10, position: 50, time: '17:00', type: 'free', text: '🛍️ Free time — shops' },
  { slotKey: 'd10-1900-dinner', day: 10, position: 60, time: '19:00', type: 'food', text: '🍲 Dinner' },

  // ── Day 11 · Wed 30 Sep · Kyoto — travel + Gion ───────────────────────────
  { slotKey: 'd11-0830-breakfast', day: 11, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast, check out' },
  { slotKey: 'd11-1000-train-to-kyoto', day: 11, position: 20, time: '10:00', type: 'travel', text: '🚄 Train Osaka → Kyoto (~30 min)' },
  { slotKey: 'd11-1100-kyoto-checkin', day: 11, position: 30, time: '11:00', type: 'sleep', text: '🧳 Check in to the Kyoto hotel' },
  { slotKey: 'd11-1230-lunch', day: 11, position: 40, time: '12:30', type: 'food', text: '🍱 Lunch' },
  { slotKey: 'd11-1400-gion', day: 11, position: 50, time: '14:00', type: 'culture', text: '🎎 Gion District — geisha area' },
  { slotKey: 'd11-1700-kyoto-wander', day: 11, position: 60, time: '17:00', type: 'free', text: '🌸 Free time — Kyoto wander' },
  { slotKey: 'd11-1900-dinner', day: 11, position: 70, time: '19:00', type: 'food', text: '🍲 Dinner' },

  // ── Day 12 · Thu 1 Oct · Kyoto — Nishiki Market + Nijo Castle ─────────────
  { slotKey: 'd12-0830-breakfast', day: 12, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast' },
  { slotKey: 'd12-1000-nijo-castle', day: 12, position: 20, time: '10:00', type: 'culture', text: '🏯 Nijo Castle' },
  { slotKey: 'd12-1200-lunch', day: 12, position: 30, time: '12:00', type: 'food', text: '🍜 Lunch' },
  { slotKey: 'd12-1330-nishiki-market', day: 12, position: 40, time: '13:30', type: 'culture', text: '🥢 Nishiki Market' },
  { slotKey: 'd12-1530-free-time', day: 12, position: 50, time: '15:30', type: 'free', text: '🌳 Free time — temples & gardens' },
  { slotKey: 'd12-1800-dinner', day: 12, position: 60, time: '18:00', type: 'food', text: '🍲 Dinner — splurge night!' },
  { slotKey: 'd12-2000-evening-wander', day: 12, position: 70, time: '20:00', type: 'free', text: '🚶 Evening wander' },

  // ── Day 13 · Fri 2 Oct · Tokyo — return, staying near Haneda ─────────────
  { slotKey: 'd13-0830-breakfast', day: 13, position: 10, time: '08:30', type: 'food', text: '🍳 Breakfast, check out' },
  { slotKey: 'd13-1000-shinkansen-return', day: 13, position: 20, time: '10:00', type: 'travel', text: '🚄 Shinkansen back to Tokyo (~2.5h)' },
  { slotKey: 'd13-1300-haneda-checkin', day: 13, position: 30, time: '13:00', type: 'sleep', text: '🧳 Check in near Haneda' },
  { slotKey: 'd13-1430-lunch', day: 13, position: 40, time: '14:30', type: 'food', text: '🍱 Late lunch' },
  { slotKey: 'd13-1600-souvenirs', day: 13, position: 50, time: '16:00', type: 'free', text: '🛍️ Last-minute souvenirs' },
  { slotKey: 'd13-1830-final-dinner', day: 13, position: 60, time: '18:30', type: 'food', text: '🍲 Final dinner in Japan' },
  { slotKey: 'd13-2030-pack', day: 13, position: 70, time: '20:30', type: 'default', text: '🎒 Pack for the early flight' },

  // ── Day 14 · Sat 3 Oct · Home — fly home ──────────────────────────────────
  { slotKey: 'd14-0530-checkout-transfer', day: 14, position: 10, time: '05:30', type: 'travel', text: '🧳 Check out, airport transfer' },
  { slotKey: 'd14-0700-haneda-checkin', day: 14, position: 20, time: '07:00', type: 'travel', text: '🛫 Haneda check-in & security' },
  { slotKey: 'd14-0855-flight-home', day: 14, position: 30, time: '08:55', type: 'travel', text: '✈️ Flight home — safe travels!' },
  { slotKey: 'd14-1545-heathrow-landing', day: 14, position: 40, time: '15:45', type: 'travel', text: '🏠 Land at Heathrow — welcome home' },
]
