/**
 * The Telugu Panchangam, derived from the Sun and Moon rather than hardcoded.
 *
 * Everything here is computed on the device from the series in astronomy.ts — no network, no
 * key, no licensed feed, and it works for any date and any of the listed cities. What it is
 * *not* is a Poojari's review: the astronomy is objective, but which tithi "counts" for a
 * given observance is convention, and conventions vary by region and by sampradayam. The
 * engine states the rule it applied so a reviewer can disagree with it specifically, and the
 * UI says plainly that these are computed. That is the honest version of the promise in
 * INTEGRATION-STATUS.md: never present a convention as if it were verified.
 *
 * Panchangam convention throughout: a day takes the tithi, nakshatram, yoga and karana that
 * are running **at local sunrise**. That is why sunrise is computed first and everything else
 * is evaluated at that instant, rather than at midnight or "now".
 */

import {
  elongation, fromJulianDay, nextMultiple, norm360,
  previousNewMoon, siderealMoon, siderealSun, sunTimes, toJulianDay,
} from './astronomy';

export type City = { name: string; timeZone: string; latitude: number; longitude: number };

export const CITIES: City[] = [
  { name: 'Hyderabad', timeZone: 'Asia/Kolkata', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Chennai', timeZone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707 },
  { name: 'New York', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Los Angeles', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { name: 'London', timeZone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Dubai', timeZone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708 },
  { name: 'Sydney', timeZone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Singapore', timeZone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198 },
];

/** Tithi 1–15 within a paksha; the fifteenth is named for the moon itself. */
const TITHI_NAMES = [
  'Padyami', 'Vidiya', 'Tadiya', 'Chaviti', 'Panchami', 'Shashti', 'Saptami', 'Ashtami',
  'Navami', 'Dasami', 'Ekadasi', 'Dwadasi', 'Trayodasi', 'Chaturdasi',
];

export const NAKSHATRA_NAMES = [
  'Aswini', 'Bharani', 'Krittika', 'Rohini', 'Mrigasira', 'Arudra', 'Punarvasu', 'Pushyami',
  'Aslesha', 'Makha', 'Pubba', 'Uttara', 'Hasta', 'Chitta', 'Swati', 'Visakha', 'Anuradha',
  'Jyeshta', 'Moola', 'Purvashadha', 'Uttarashadha', 'Sravanam', 'Dhanishta', 'Satabhisham',
  'Purvabhadra', 'Uttarabhadra', 'Revati',
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Sobhana', 'Atiganda', 'Sukarman', 'Dhriti',
  'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata',
  'Variyan', 'Parigha', 'Siva', 'Siddha', 'Sadhya', 'Subha', 'Sukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const MOVABLE_KARANA = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garija', 'Vanija', 'Vishti'];

/**
 * Sixty half-tithis make a lunar month. The first and the last three are fixed karanas; the
 * seven movable ones cycle eight times through the 56 in between.
 */
function nameOfKarana(index: number): string {
  if (index === 0) return 'Kimstughna';
  if (index <= 56) return MOVABLE_KARANA[(index - 1) % 7];
  return ['Sakuni', 'Chatushpada', 'Naga'][index - 57];
}

export const MASAM_NAMES = [
  'Chaitra', 'Vaisakha', 'Jyeshtha', 'Ashadha', 'Sravana', 'Bhadrapada',
  'Aswayuja', 'Kartika', 'Margasira', 'Pushya', 'Magha', 'Phalguna',
];

const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karkataka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanassu', 'Makara', 'Kumbha', 'Meena',
];

const VAARA_NAMES = ['Bhanuvaram', 'Somavaram', 'Mangalavaram', 'Budhavaram', 'Guruvaram', 'Sukravaram', 'Sanivaram'];

/** The sixty-year cycle. 2025–26 is Viswavasu, which anchors the offset below. */
const SAMVATSARA_NAMES = [
  'Prabhava', 'Vibhava', 'Sukla', 'Pramodyuta', 'Prajotpatti', 'Angirasa', 'Srimukha', 'Bhava',
  'Yuva', 'Dhata', 'Iswara', 'Bahudhanya', 'Pramadi', 'Vikrama', 'Vrusha', 'Chitrabhanu',
  'Swabhanu', 'Tarana', 'Parthiva', 'Vyaya', 'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikruti',
  'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi', 'Hevilambi', 'Vilambi',
  'Vikari', 'Sarvari', 'Plava', 'Subhakrit', 'Sobhakrit', 'Krodhi', 'Viswavasu', 'Parabhava',
  'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadicha',
  'Ananda', 'Rakshasa', 'Nala', 'Pingala', 'Kalayukti', 'Siddharthi', 'Raudri', 'Durmati',
  'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya',
];

/**
 * Inauspicious windows, as eighths of the daylight span. These are pure weekday arithmetic —
 * no astronomy beyond sunrise and sunset — which is why they can be stated without hedging.
 * Indexed by JS weekday (0 = Sunday), value = which eighth of the day, zero-based.
 */
const RAHU_SEGMENT = [7, 1, 6, 4, 5, 3, 2];
const YAMA_SEGMENT = [4, 3, 2, 1, 0, 6, 5];
const GULIKA_SEGMENT = [6, 5, 4, 3, 2, 1, 0];

export type Span = { start: Date; end: Date };
export type Element = {
  index: number;
  name: string;
  endsAt: Date;
  /** What takes over when this one ends. A day's reading looks self-contradictory without it:
   *  the sunrise tithi can be Tadiya while the day's festival is Chaviti, and only naming the
   *  successor shows that both are true. */
  nextName: string;
};

export type Festival = {
  name: string;
  /** The Pooja in the app's catalog this day calls for, when there is one. */
  pooja?: string;
  /** The rule that produced this date, so a reviewer can check the convention, not just the day. */
  rule: string;
};

export type Panchangam = {
  city: City;
  /** Local civil date this Panchangam describes. */
  date: { year: number; month: number; day: number };
  vaara: string;
  weekday: number;
  sunrise: Date | null;
  sunset: Date | null;
  tithi: Element & { paksha: 'Shukla' | 'Krishna'; number: number };
  nakshatra: Element;
  yoga: Element;
  karana: Element;
  masam: { name: string; adhika: boolean };
  samvatsara: string;
  sunRashi: string;
  /** Sun→Moon elongation at sunrise, 0–360°. The tithi *is* this angle in 12° steps, so it is
   *  also exactly what draws the Moon's shape tonight. */
  moonPhase: number;
  rahuKalam: Span | null;
  yamagandam: Span | null;
  gulika: Span | null;
  festivals: Festival[];
};

/** Local civil midnight for a city, as a Julian Day — the anchor for a "day". */
function localMidnightJD(city: City, year: number, month: number, day: number): number {
  // Find the UTC instant whose local calendar date/time in `city` is this date at 00:00.
  const guess = Date.UTC(year, month, day, 12, 0, 0);
  const offsetMinutes = timeZoneOffset(city.timeZone, new Date(guess));
  return toJulianDay(new Date(Date.UTC(year, month, day) - offsetMinutes * 60000));
}

/** Minutes that `timeZone` is ahead of UTC at `instant`, DST included. */
export function timeZoneOffset(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUTC - instant.getTime()) / 60000);
}

/** The local civil date in `city` at a given instant. */
export function civilDate(city: City, instant: Date): { year: number; month: number; day: number } {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: city.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instant).split('-').map(Number);
  return { year, month: month - 1, day };
}

/**
 * The lunar month containing `jd`, named by the Sun's rashi at the new moon that opened it.
 *
 * Chaitra is the month that begins while the Sun is still in Meena, which is why the name is
 * the rashi index plus one. A month during which the Sun changes no rashi at all contains no
 * sankranti and is therefore adhika — an intercalary repeat of the following month's name.
 * Skipping that check would silently misname every month after a leap month in that year.
 */
function lunarMonth(jd: number): { index: number; adhika: boolean; startJD: number } {
  const start = previousNewMoon(jd);
  const end = previousNewMoon(start + 45);       // the next new moon closes this month
  const rashiAt = (t: number) => Math.floor(siderealSun(t) / 30);
  const startRashi = rashiAt(start + 0.01);
  const endRashi = rashiAt(end - 0.01);
  return { index: (startRashi + 1) % 12, adhika: startRashi === endRashi, startJD: start };
}

function spanOfDay(sunrise: number, sunset: number, segment: number): Span {
  const eighth = (sunset - sunrise) / 8;
  return { start: fromJulianDay(sunrise + eighth * segment), end: fromJulianDay(sunrise + eighth * (segment + 1)) };
}

/**
 * The full Panchangam for one local day in one city.
 *
 * Returns `sunrise: null` where the Sun never rises or sets — above the Arctic circle the
 * sunrise convention simply has no referent, and inventing one would be worse than admitting it.
 */
const dayCache = new Map<string, Panchangam>();

export function panchangamFor(city: City, year: number, month: number, day: number): Panchangam {
  const cacheKey = `${city.name}|${year}|${month}|${day}`;
  const cached = dayCache.get(cacheKey);
  if (cached) return cached;
  const computed = computePanchangam(city, year, month, day);
  // A few hundred days is far more than any session scrolls through, and each entry is small.
  if (dayCache.size > 400) dayCache.clear();
  dayCache.set(cacheKey, computed);
  return computed;
}

function computePanchangam(city: City, year: number, month: number, day: number): Panchangam {
  const times = sunTimes(year, month, day, city.latitude, city.longitude);
  const midnight = localMidnightJD(city, year, month, day);
  // Where there is no sunrise, fall back to local noon purely so the elements still have an
  // instant to be evaluated at; the UI is told sunrise is unavailable.
  const reference = times ? times.sunrise : midnight + 0.5;
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();

  const tithiIndex = Math.floor(elongation(reference) / 12);    // 0..29 across the lunar month
  const nameOfTithi = (index: number) => {
    const wrapped = ((index % 30) + 30) % 30;
    const inPaksha = (wrapped % 15) + 1;
    if (inPaksha < 15) return TITHI_NAMES[inPaksha - 1];
    return wrapped < 15 ? 'Pournami' : 'Amavasya';
  };
  const paksha: 'Shukla' | 'Krishna' = tithiIndex < 15 ? 'Shukla' : 'Krishna';
  const number = (tithiIndex % 15) + 1;
  const tithiName = nameOfTithi(tithiIndex);

  const nakIndex = Math.floor(siderealMoon(reference) / (360 / 27));
  const yogaAngle = (t: number) => norm360(siderealSun(t) + siderealMoon(t));
  const yogaIndex = Math.floor(yogaAngle(reference) / (360 / 27));

  const karanaIndex = Math.floor(elongation(reference) / 6);     // 0..59
  const karanaName = nameOfKarana(karanaIndex);

  const month_ = lunarMonth(reference);
  // The lunar year opened `index` months back; Ugadi always falls in March or April, so the
  // Gregorian year of that instant identifies the samvatsara unambiguously.
  const ugadiJD = month_.startJD - month_.index * 29.53;
  const ugadiYear = fromJulianDay(ugadiJD).getUTCFullYear();

  const result: Panchangam = {
    city,
    date: { year, month, day },
    weekday,
    vaara: VAARA_NAMES[weekday],
    sunrise: times ? fromJulianDay(times.sunrise) : null,
    sunset: times ? fromJulianDay(times.sunset) : null,
    tithi: {
      index: tithiIndex, name: tithiName, paksha, number,
      nextName: nameOfTithi(tithiIndex + 1),
      endsAt: fromJulianDay(nextMultiple(elongation, 12, reference, 2)),
    },
    nakshatra: {
      index: nakIndex, name: NAKSHATRA_NAMES[nakIndex],
      nextName: NAKSHATRA_NAMES[(nakIndex + 1) % 27],
      endsAt: fromJulianDay(nextMultiple(siderealMoon, 360 / 27, reference, 2)),
    },
    yoga: {
      index: yogaIndex, name: YOGA_NAMES[yogaIndex],
      nextName: YOGA_NAMES[(yogaIndex + 1) % 27],
      endsAt: fromJulianDay(nextMultiple(yogaAngle, 360 / 27, reference, 2)),
    },
    karana: {
      index: karanaIndex, name: karanaName,
      nextName: nameOfKarana((karanaIndex + 1) % 60),
      endsAt: fromJulianDay(nextMultiple(elongation, 6, reference, 1)),
    },
    masam: { name: MASAM_NAMES[month_.index], adhika: month_.adhika },
    samvatsara: SAMVATSARA_NAMES[(((ugadiYear - 1987) % 60) + 60) % 60],
    sunRashi: RASHI_NAMES[Math.floor(siderealSun(reference) / 30)],
    moonPhase: elongation(reference),
    rahuKalam: times ? spanOfDay(times.sunrise, times.sunset, RAHU_SEGMENT[weekday]) : null,
    yamagandam: times ? spanOfDay(times.sunrise, times.sunset, YAMA_SEGMENT[weekday]) : null,
    gulika: times ? spanOfDay(times.sunrise, times.sunset, GULIKA_SEGMENT[weekday]) : null,
    festivals: [],
  };

  result.festivals = festivalsFor(result);
  return result;
}


/**
 * Which part of the day an observance is decided by.
 *
 * This is the piece a naive implementation gets wrong, and it gets it wrong in a way that is
 * invisible until someone performs the ritual on the wrong day. A tithi lasts roughly 24
 * hours but drifts against the clock, so it routinely touches two civil days; which day
 * "owns" the festival is settled by whether the tithi is running during a specific window,
 * and the window differs per observance. Vinayaka Chavithi is decided at midday, Shivaratri
 * at midnight, Deepavali at dusk. Applying sunrise to all of them puts most of the calendar
 * one day late, which is exactly what it did before this existed.
 */
type Kala = 'sunrise' | 'madhyahna' | 'aparahna' | 'pradosha' | 'nishita';

const KALA_LABEL: Record<Kala, string> = {
  sunrise: 'running at sunrise',
  madhyahna: 'running at madhyahna (midday)',
  aparahna: 'running at aparahna (afternoon)',
  pradosha: 'running at pradosha (dusk)',
  nishita: 'running at nishita (midnight)',
};

const SYNODIC = 29.530588853;

/**
 * The instant, within the lunar month beginning at `monthStart`, when the Moon's elongation
 * reaches `degrees`. Elongation rises monotonically from 0 to 360 across a month, so a
 * bracketed bisection is exact; the bracket is generous because the Moon's speed varies by a
 * third between perigee and apogee.
 */
function elongationTime(monthStart: number, degrees: number): number {
  if (degrees <= 0) return monthStart;
  const approx = monthStart + (degrees / 360) * SYNODIC;
  const unwrapped = (t: number) => {
    let e = elongation(t);
    if (degrees > 270 && e < 90) e += 360;
    if (degrees < 90 && e > 270) e -= 360;
    return e;
  };
  let lo = approx - 2.5, hi = approx + 2.5;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (unwrapped(mid) < degrees) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/** The elongation band a tithi occupies: Shukla 1 is 0–12°, Krishna 15 (Amavasya) is 348–360°. */
function tithiBand(paksha: 'Shukla' | 'Krishna', number: number): [number, number] {
  const index = paksha === 'Shukla' ? number - 1 : 14 + number;
  return [index * 12, (index + 1) * 12];
}

/** The civil date, in a city's own clock, containing an instant given as a Julian Day. */
function civilDayOf(city: City, jd: number) {
  return civilDate(city, fromJulianDay(jd));
}

/** The window a given kala occupies on a given civil day, as Julian Days. */
function kalaWindow(city: City, year: number, month: number, day: number, kala: Kala): { start: number; end: number } | null {
  const times = sunTimes(year, month, day, city.latitude, city.longitude);
  if (!times) return null;
  const { sunrise, sunset } = times;
  const daylight = sunset - sunrise;
  switch (kala) {
    case 'sunrise':
      return { start: sunrise, end: sunrise + 1 / 1440 };
    // Daylight in fifths: madhyahna is the third, aparahna the fourth.
    case 'madhyahna':
      return { start: sunrise + daylight * 0.4, end: sunrise + daylight * 0.6 };
    case 'aparahna':
      return { start: sunrise + daylight * 0.6, end: sunrise + daylight * 0.8 };
    case 'pradosha':
      return { start: sunset, end: sunset + 0.1 };          // the ~2h24m after sunset
    case 'nishita': {
      const next = sunTimes(year, month, day + 1, city.latitude, city.longitude);
      const nightEnd = next ? next.sunrise : sunset + 0.5;
      const middle = (sunset + nightEnd) / 2;
      return { start: middle - 1 / 60, end: middle + 1 / 60 };   // the midnight muhurta, ±24 min
    }
  }
}

const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

/**
 * Assign a tithi occurrence to the civil day that owns it.
 *
 * Candidates are the days the tithi actually touches, scored by how much of the deciding kala
 * falls inside it; ties go to the earlier day, which is the usual convention when a tithi
 * spans the same window twice. A tithi short enough to fall entirely between two instances of
 * the window — a kshaya tithi, which is how Ugadi 2026 behaves — scores zero everywhere, and
 * is assigned to the day it begins rather than being dropped. Dropping it was the bug that
 * made Ugadi disappear from the calendar entirely.
 */
function dayForTithi(city: City, tithiStart: number, tithiEnd: number, kala: Kala) {
  const first = civilDayOf(city, tithiStart);
  let best: { day: typeof first; score: number } | null = null;
  for (let offset = -1; offset <= 1; offset++) {
    const probe = new Date(Date.UTC(first.year, first.month, first.day + offset));
    const candidate = { year: probe.getUTCFullYear(), month: probe.getUTCMonth(), day: probe.getUTCDate() };
    const window = kalaWindow(city, candidate.year, candidate.month, candidate.day, kala);
    if (!window) continue;
    const score = overlap(window, { start: tithiStart, end: tithiEnd });
    if (score > 0 && (!best || score > best.score)) best = { day: candidate, score };
  }
  return best ? best.day : first;
}

type FestivalRule = {
  masam: number;
  paksha: 'Shukla' | 'Krishna';
  tithi: number;
  kala: Kala;
  name: string;
  pooja?: string;
};

const LUNAR_FESTIVALS: FestivalRule[] = [
  { masam: 0, paksha: 'Shukla', tithi: 1, kala: 'sunrise', name: 'Ugadi' },
  { masam: 0, paksha: 'Shukla', tithi: 9, kala: 'madhyahna', name: 'Sri Rama Navami' },
  { masam: 1, paksha: 'Shukla', tithi: 3, kala: 'sunrise', name: 'Akshaya Tritiya' },
  { masam: 4, paksha: 'Shukla', tithi: 15, kala: 'sunrise', name: 'Sravana Pournami' },
  { masam: 4, paksha: 'Krishna', tithi: 8, kala: 'nishita', name: 'Krishnashtami' },
  { masam: 5, paksha: 'Shukla', tithi: 4, kala: 'madhyahna', name: 'Vinayaka Chavithi', pooja: 'Vinayaka Chavithi Pooja' },
  { masam: 5, paksha: 'Shukla', tithi: 14, kala: 'sunrise', name: 'Ananta Padmanabha Vratham' },
  { masam: 5, paksha: 'Krishna', tithi: 15, kala: 'aparahna', name: 'Mahalaya Amavasya' },
  { masam: 6, paksha: 'Shukla', tithi: 10, kala: 'aparahna', name: 'Vijayadasami' },
  { masam: 6, paksha: 'Krishna', tithi: 14, kala: 'sunrise', name: 'Naraka Chaturdasi' },
  { masam: 6, paksha: 'Krishna', tithi: 15, kala: 'pradosha', name: 'Deepavali', pooja: 'Lakshmi Kubera Pooja' },
  { masam: 7, paksha: 'Shukla', tithi: 15, kala: 'sunrise', name: 'Karthika Pournami' },
  { masam: 10, paksha: 'Krishna', tithi: 14, kala: 'nishita', name: 'Maha Shivaratri', pooja: 'Lord Shiva Pooja' },
  { masam: 11, paksha: 'Shukla', tithi: 15, kala: 'pradosha', name: 'Holika Pournami' },
];

type Dated = { year: number; month: number; day: number };
const key = (d: Dated) => `${d.year}-${String(d.month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;

/** Every lunar month whose span touches [fromJD, toJD]. */
function lunarMonthsOverlapping(fromJD: number, toJD: number) {
  const months: { index: number; adhika: boolean; startJD: number }[] = [];
  let start = previousNewMoon(fromJD);
  while (start < toJD) {
    const next = previousNewMoon(start + SYNODIC + 3);
    const rashiAt = (t: number) => Math.floor(siderealSun(t) / 30);
    const startRashi = rashiAt(start + 0.01);
    const endRashi = rashiAt(next - 0.01);
    months.push({ index: (startRashi + 1) % 12, adhika: startRashi === endRashi, startJD: start });
    start = next;
  }
  return months;
}

/**
 * Festivals across a date range, bucketed by the civil day that owns each one.
 *
 * Driven from the lunar months rather than by asking each day "are you a festival?" — that
 * inversion is what lets a tithi be placed by its own timing and its own kala instead of
 * having to coincide with whatever instant the day-loop happened to sample.
 */
export function festivalsInRange(city: City, fromJD: number, toJD: number): Map<string, Festival[]> {
  const found = new Map<string, Festival[]>();
  const add = (day: Dated, festival: Festival) => {
    const k = key(day);
    const list = found.get(k);
    if (list) list.push(festival); else found.set(k, [festival]);
  };

  for (const month of lunarMonthsOverlapping(fromJD - 40, toJD + 5)) {
    if (month.adhika) continue;    // observances belong to the nija month, never the intercalary one

    for (const rule of LUNAR_FESTIVALS) {
      if (rule.masam !== month.index) continue;
      const [from, to] = tithiBand(rule.paksha, rule.tithi);
      const tithiStart = elongationTime(month.startJD, from);
      const tithiEnd = elongationTime(month.startJD, to);
      const day = dayForTithi(city, tithiStart, tithiEnd, rule.kala);
      const jd = toJulianDay(new Date(Date.UTC(day.year, day.month, day.day, 12)));
      if (jd < fromJD - 1 || jd > toJD + 1) continue;
      const tithiLabel = rule.tithi === 15 ? (rule.paksha === 'Shukla' ? 'Pournami' : 'Amavasya') : TITHI_NAMES[rule.tithi - 1];
      add(day, {
        name: rule.name,
        pooja: rule.pooja,
        rule: `${MASAM_NAMES[rule.masam]} ${rule.paksha} ${tithiLabel}, ${KALA_LABEL[rule.kala]}`,
      });
    }

    // Varalakshmi Vratham is fixed by weekday, not by tithi: the last Friday of Sravana
    // Shukla paksha before the Pournami. When the Pournami itself is a Friday the observance
    // still belongs to the Friday before it, so the search starts a day early.
    if (month.index === 4) {
      const [from] = tithiBand('Shukla', 15);
      const pournami = dayForTithi(city, elongationTime(month.startJD, from), elongationTime(month.startJD, from + 12), 'sunrise');
      const probe = new Date(Date.UTC(pournami.year, pournami.month, pournami.day - 1));
      while (probe.getUTCDay() !== 5) probe.setUTCDate(probe.getUTCDate() - 1);
      const day = { year: probe.getUTCFullYear(), month: probe.getUTCMonth(), day: probe.getUTCDate() };
      const jd = toJulianDay(new Date(Date.UTC(day.year, day.month, day.day, 12)));
      if (jd >= fromJD - 1 && jd <= toJD + 1) {
        add(day, { name: 'Varalakshmi Vratham', pooja: 'Varalakshmi Vratham', rule: 'The last Friday of Sravana Shukla paksha before Pournami' });
      }
    }
  }

  // Sankranti is solar: the Sun's entry into a rashi. Makara Sankranti is the one the app
  // observes. By Telugu convention an ingress after sunset carries the observance to the next
  // morning, since the punya kalam cannot begin in darkness.
  for (let jd = Math.floor(fromJD) - 2; jd <= toJD + 2; jd++) {
    const before = Math.floor(siderealSun(jd) / 30);
    const after = Math.floor(siderealSun(jd + 1) / 30);
    if (before === after || after !== 9) continue;
    let lo = jd, hi = jd + 1;
    for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (Math.floor(siderealSun(mid) / 30) === before) lo = mid; else hi = mid; }
    const ingress = (lo + hi) / 2;
    let day = civilDayOf(city, ingress);
    const times = sunTimes(day.year, day.month, day.day, city.latitude, city.longitude);
    if (times && ingress > times.sunset) {
      const next = new Date(Date.UTC(day.year, day.month, day.day + 1));
      day = { year: next.getUTCFullYear(), month: next.getUTCMonth(), day: next.getUTCDate() };
    }
    add(day, { name: 'Makara Sankranti', pooja: 'Surya Narayana Pooja', rule: 'The day the Sun enters Makara rashi, carried to the next morning if the ingress is after sunset' });
  }

  return found;
}

/** Per-month festival maps are reused across every day the user scrolls through. */
const festivalCache = new Map<string, Map<string, Festival[]>>();

export function festivalsInMonth(city: City, year: number, month: number): Map<number, Festival[]> {
  const cacheKey = `${city.name}|${year}|${month}`;
  let table = festivalCache.get(cacheKey);
  if (!table) {
    const from = toJulianDay(new Date(Date.UTC(year, month, 1)));
    const to = toJulianDay(new Date(Date.UTC(year, month + 1, 0, 23, 59)));
    table = festivalsInRange(city, from, to);
    festivalCache.set(cacheKey, table);
  }
  const byDay = new Map<number, Festival[]>();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    const list = table.get(key({ year, month, day }));
    if (list) byDay.set(day, list);
  }
  return byDay;
}

function festivalsFor(p: Panchangam): Festival[] {
  return festivalsInMonth(p.city, p.date.year, p.date.month).get(p.date.day) ?? [];
}

/** The next festival on or after `from`, for the home screen's hero. */
export function nextFestival(city: City, from: Date, horizonDays = 200): { date: Date; festival: Festival } | null {
  const start = civilDate(city, from);
  let cursor = { year: start.year, month: start.month };
  for (let step = 0; step < 8; step++) {
    const table = festivalsInMonth(city, cursor.year, cursor.month);
    const days = [...table.keys()].sort((a, b) => a - b);
    for (const day of days) {
      const probe = new Date(Date.UTC(cursor.year, cursor.month, day));
      const today = new Date(Date.UTC(start.year, start.month, start.day));
      if (probe >= today && (probe.getTime() - today.getTime()) / 86400000 <= horizonDays) {
        return { date: probe, festival: table.get(day)![0] };
      }
    }
    const next = new Date(Date.UTC(cursor.year, cursor.month + 1, 1));
    cursor = { year: next.getUTCFullYear(), month: next.getUTCMonth() };
  }
  return null;
}

/** Formats an instant in a city's local clock, e.g. "06:04 AM". */
export function localTime(city: City, instant: Date | null): string {
  if (!instant) return '—';
  return new Intl.DateTimeFormat('en', { timeZone: city.timeZone, hour: '2-digit', minute: '2-digit', hour12: true }).format(instant);
}
