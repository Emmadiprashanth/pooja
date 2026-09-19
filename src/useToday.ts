import { useEffect, useMemo, useState } from 'react';
import { City, Festival, Panchangam, civilDate, nextFestival, panchangamFor } from './panchangam';

export type Today = {
  now: Date;
  date: { year: number; month: number; day: number };
  panchangam: Panchangam;
  /** The next observance on or after today, or null if none falls inside the horizon. */
  upcoming: { date: Date; festival: Festival; daysAway: number } | null;
};

/**
 * Today's Panchangam for a city, refreshed as the day turns.
 *
 * Today's own reading is computed synchronously because it is cheap — one sunrise and a
 * handful of bisections — and the screen has nothing to say without it. Scanning ahead for the
 * next festival is not cheap in the same way: it can walk several lunar months, so it runs
 * after the first paint and fills in. The distinction matters on a phone, where doing both
 * synchronously would cost a visibly dropped frame on launch for information that is not
 * needed in the first instant.
 */
export function useToday(city: City): Today {
  const [now, setNow] = useState(() => new Date());

  // Re-read on the minute so the reading rolls over at local midnight without a relaunch.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const date = useMemo(() => civilDate(city, now), [city, now.getTime()]);
  const stamp = `${city.name}|${date.year}-${date.month}-${date.day}`;
  const panchangam = useMemo(() => panchangamFor(city, date.year, date.month, date.day), [stamp]);

  const [upcoming, setUpcoming] = useState<Today['upcoming']>(null);
  useEffect(() => {
    let alive = true;
    const handle = setTimeout(() => {
      const found = nextFestival(city, now);
      if (!alive || !found) { if (alive) setUpcoming(null); return; }
      const today = Date.UTC(date.year, date.month, date.day);
      setUpcoming({
        date: found.date,
        festival: found.festival,
        daysAway: Math.round((found.date.getTime() - today) / 86400000),
      });
    }, 0);
    return () => { alive = false; clearTimeout(handle); };
  }, [stamp]);

  return { now, date, panchangam, upcoming };
}
