// Quick-reference content — DATA_MODEL.md §15, canonical and verbatim.
// Entirely in-repo, no storage of any kind (works offline by construction
// once the shell is precached). Implementation transcribes this file;
// content judgement already happened in the doc — don't "improve" it.

export interface EmergencyEntry {
  label: string
  value: string
}

export const EMERGENCY_NUMBERS: EmergencyEntry[] = [
  { label: 'Police', value: '110' },
  { label: 'Fire / ambulance', value: '119' },
]

export const EMERGENCY_NOTE = 'Both work from any phone, SIM or not.'

// Deliberate: no embassy phone number is hardcoded — it cannot be verified
// as current from here, and a wrong emergency number is worse than a link.
// The gov.uk page is the stable, maintained source.
export const UK_TRAVEL_ADVICE = {
  context: 'UK government travel advice (incl. embassy contact)',
  linkText: 'check before you go',
  href: 'https://www.gov.uk/foreign-travel-advice/japan',
}

export interface Phrase {
  jp: string
  romaji: string
  en: string
}

// DATA_MODEL.md §15b — ten phrases, verbatim.
export const PHRASES: Phrase[] = [
  { jp: 'ありがとうございます', romaji: 'arigatou gozaimasu', en: 'Thank you' },
  { jp: 'すみません', romaji: 'sumimasen', en: 'Excuse me / sorry (also calls staff over)' },
  { jp: 'お願いします', romaji: 'onegai shimasu', en: 'Please' },
  { jp: '英語が話せますか？', romaji: 'eigo ga hanasemasu ka?', en: 'Do you speak English?' },
  { jp: 'トイレはどこですか？', romaji: 'toire wa doko desu ka?', en: 'Where is the toilet?' },
  { jp: 'これはいくらですか？', romaji: 'kore wa ikura desu ka?', en: 'How much is this?' },
  { jp: 'これをください', romaji: 'kore o kudasai', en: 'This one, please' },
  { jp: '大丈夫です', romaji: 'daijoubu desu', en: "I'm fine / no thank you" },
  { jp: '美味しかったです', romaji: 'oishikatta desu', en: 'That was delicious' },
  { jp: '乾杯', romaji: 'kanpai', en: 'Cheers' },
]

// DATA_MODEL.md §15c — etiquette & practicalities, verbatim, plain list.
export const ETIQUETTE: string[] = [
  'No tipping, anywhere — it can genuinely confuse. Great service is the default.',
  'Shoes off where you see a genkan step or shoe lockers — restaurants, ryokan, temples, fitting rooms.',
  "Don't eat while walking; stand aside or find a spot. Drinking from a bottle by the vending machine is fine.",
  "Trains are quiet: phones on silent, calls wait until you're off.",
  'Public bins are rare — carry your rubbish home (see the packing list).',
  'Cash still rules small places; top up IC cards (Suica) at machines with cash. 7-Eleven ATMs take UK cards.',
  "Stand left on escalators in Tokyo, right in Osaka. You'll be corrected by the crowd either way.",
  'Onsen: wash and rinse thoroughly *before* the bath; towels stay out of the water; tattoo rules vary — check signs.',
  "Queue like it's a national sport, because it is: marked lines on platforms, orderly everywhere.",
  'Convenience stores (konbini) solve most problems: food, coffee, ATMs, toilets, parcel post.',
]
