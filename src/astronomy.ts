/**
 * The astronomy a Panchangam is made of: where the Sun and Moon actually are.
 *
 * Every element of a Telugu Panchangam reduces to two angles — the apparent geocentric
 * longitudes of the Sun and the Moon — plus the local sunrise. Tithi is their difference in
 * 12° steps, Nakshatram is the Moon's sidereal position in 13°20' steps, Yoga is their sum,
 * and the month is named for the Sun's rashi at the new moon that opened it. So this file
 * computes those angles and nothing else; the calendar meaning lives in panchangam.ts.
 *
 * Series are from Meeus, *Astronomical Algorithms* (2nd ed.): chapter 25 for the Sun and the
 * 59-term ELP subset of table 47.A for the Moon. That is roughly 10 arcseconds on the Moon,
 * which matters because the Moon moves about 0.55°/hour — so 10" is around half a minute of
 * error in a reported tithi ending. Well inside what a printed Panchangam rounds away.
 */

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const cos = (deg: number) => Math.cos(deg * RAD);

export const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Julian Day from a JS Date (which is always an absolute instant, so this is UTC-correct). */
export function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function fromJulianDay(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

const centuries = (jd: number) => (jd - 2451545.0) / 36525;

/** Nutation in longitude, arcseconds. Small (~17"), and it very nearly cancels in the
 *  Sun–Moon difference, but it is cheap and keeps the absolute positions honest. */
function nutation(T: number): number {
  const omega = 125.04452 - 1934.136261 * T;
  const L = 280.4665 + 36000.7698 * T;
  const Lp = 218.3165 + 481267.8813 * T;
  return -17.2 * sin(omega) - 1.32 * sin(2 * L) - 0.23 * sin(2 * Lp) + 0.21 * sin(2 * omega);
}

/** Apparent geocentric longitude of the Sun, degrees (tropical). Meeus ch. 25. */
export function sunLongitude(jd: number): number {
  const T = centuries(jd);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M)
    + 0.000289 * sin(3 * M);
  const trueLong = L0 + C;
  // aberration (-20.5") plus nutation gives the *apparent* place
  return norm360(trueLong - 0.00569 + nutation(T) / 3600);
}

/**
 * Meeus table 47.A — periodic terms for the Moon's longitude.
 * Columns: D, M, M', F, coefficient of sin(...) in units of 1e-6 degrees.
 */
const MOON_TERMS: number[][] = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

/** Apparent geocentric longitude of the Moon, degrees (tropical). Meeus ch. 47. */
export function moonLongitude(jd: number): number {
  const T = centuries(jd);
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;

  // Eccentricity of Earth's orbit decreases with time; terms involving the Sun's anomaly
  // must be scaled by it (once per power of M).
  const E = 1 - 0.002516 * T - 0.0000074 * T2;

  let sigma = 0;
  for (const [d, m, mp, f, coef] of MOON_TERMS) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const scale = m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E;
    sigma += coef * scale * sin(arg);
  }

  // Additive corrections from Venus, Jupiter and the flattening of the Earth (Meeus p. 342).
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  sigma += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);

  return norm360(Lp + sigma / 1000000 + nutation(T) / 3600);
}

/**
 * Lahiri (Chitrapaksha) ayanamsa — the offset between the tropical zodiac the maths produces
 * and the sidereal zodiac a Panchangam is written in. This is the one place where convention,
 * not astronomy, decides the answer: Lahiri is what the Indian Calendar Reform Committee
 * adopted and what Telugu Panchangams use, so it is what we use.
 *
 * Tithi never touches this — it is a difference of two longitudes, so the offset cancels.
 * Nakshatram, Yoga and the month name do depend on it.
 */
export function ayanamsa(jd: number): number {
  const T = centuries(jd);
  return 23.85228 + 1.3969713 * T + 0.0003086 * T * T;
}

export const siderealSun = (jd: number) => norm360(sunLongitude(jd) - ayanamsa(jd));
export const siderealMoon = (jd: number) => norm360(moonLongitude(jd) - ayanamsa(jd));

/** Sun→Moon elongation, 0–360°. Zero at new moon, 180 at full. The engine of the tithi. */
export const elongation = (jd: number) => norm360(moonLongitude(jd) - sunLongitude(jd));

/**
 * The instant a continuously increasing angle next reaches `target`, found by bisection.
 *
 * `value` must be expressed as a quantity that rises monotonically through the window so the
 * wrap at 360 cannot fool the search — callers pass an already-unwrapped angle.
 */
export function solveCrossing(
  value: (jd: number) => number,
  target: number,
  from: number,
  to: number,
): number {
  let lo = from, hi = to;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (value(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The moment the Moon's elongation next passes a multiple of `step` degrees after `jd`.
 * Used for tithi (12°), karana (6°), nakshatra (13°20' on the Moon alone) and yoga endings.
 */
export function nextMultiple(angleAt: (jd: number) => number, step: number, jd: number, searchDays: number): number {
  const start = angleAt(jd);
  const target = (Math.floor(start / step) + 1) * step;
  // Unwrap so the function rises monotonically across the 360 boundary.
  const unwrapped = (t: number) => {
    const a = angleAt(t);
    return a < start - 180 ? a + 360 : a;
  };
  return solveCrossing(unwrapped, target, jd, jd + searchDays);
}

/** The new moon at or before `jd`, as a Julian Day. */
export function previousNewMoon(jd: number): number {
  // Walk back in half-day steps until elongation jumps up, which means we crossed zero.
  let t = jd;
  for (let i = 0; i < 80; i++) {
    const here = elongation(t);
    const back = elongation(t - 0.5);
    if (back > here + 180) {
      // crossing lies in (t - 0.5, t); bisect on the unwrapped angle reaching 360
      const unwrapped = (x: number) => { const a = elongation(x); return a > 180 ? a - 360 : a; };
      return solveCrossing(unwrapped, 0, t - 0.5, t);
    }
    t -= 0.5;
  }
  return jd;
}

export const nextNewMoon = (jd: number) => previousNewMoon(jd + 30) > jd ? previousNewMoon(jd + 30) : previousNewMoon(jd + 45);

/**
 * Sunrise and sunset as Julian Days, for a civil date and a place.
 *
 * The longitude term means passing a local calendar date works worldwide, including where
 * local sunrise falls on the previous UTC day (Sydney) or the next one. Returns null where
 * the Sun does not cross the horizon at all, which the caller must handle rather than
 * silently reporting midnight.
 */
export function sunTimes(year: number, month: number, day: number, latitude: number, longitude: number): { sunrise: number; sunset: number; noon: number } | null {
  const jdDate = Date.UTC(year, month, day) / 86400000 + 2440587.5;
  const n = Math.round(jdDate - 2451545.0 + 0.0008);
  const Jstar = n - longitude / 360;
  const M = norm360(357.5291 + 0.98560028 * Jstar);
  const C = 1.9148 * sin(M) + 0.0200 * sin(2 * M) + 0.0003 * sin(3 * M);
  const lambda = norm360(M + C + 180 + 102.9372);
  const Jtransit = 2451545.0 + Jstar + 0.0053 * sin(M) - 0.0069 * sin(2 * lambda);
  const decl = Math.asin(sin(lambda) * sin(23.4397)) / RAD;
  // -0.833° accounts for refraction plus the Sun's semidiameter: the standard civil definition.
  const cosOmega = (sin(-0.833) - sin(latitude) * sin(decl)) / (cos(latitude) * cos(decl));
  if (cosOmega > 1 || cosOmega < -1) return null;   // polar day or polar night
  const omega = Math.acos(cosOmega) / RAD;
  return { sunrise: Jtransit - omega / 360, sunset: Jtransit + omega / 360, noon: Jtransit };
}
