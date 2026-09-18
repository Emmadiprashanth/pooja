export type CalendarLocation = {
  name: string;
  region: string;
  country: string;
  countryCode: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

export type SolarDay = {
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  moonPhase: string;
  moonIllumination: number | null;
};

export type ReviewedPanchangam = {
  teluguMonth: string;
  paksham: string;
  tithi: string;
  nakshatram: string;
  yogam: string;
  karanam: string;
  festivalName: string;
  festivalPoojaSlug: string | null;
  notes: string;
  sourceName: string;
};

export const popularLocations: CalendarLocation[] = [
  { name: 'Hyderabad', region: 'Telangana', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', latitude: 17.385, longitude: 78.4867 },
  { name: 'Chennai', region: 'Tamil Nadu', country: 'India', countryCode: 'IN', timezone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', timezone: 'Asia/Dubai', latitude: 25.2048, longitude: 55.2708 },
  { name: 'London', region: 'England', country: 'United Kingdom', countryCode: 'GB', timezone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'New York', region: 'New York', country: 'United States', countryCode: 'US', timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { name: 'Los Angeles', region: 'California', country: 'United States', countryCode: 'US', timezone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Helsinki', region: 'Uusimaa', country: 'Finland', countryCode: 'FI', timezone: 'Europe/Helsinki', latitude: 60.1699, longitude: 24.9384 },
  { name: 'Sydney', region: 'New South Wales', country: 'Australia', countryCode: 'AU', timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Singapore', region: 'Singapore', country: 'Singapore', countryCode: 'SG', timezone: 'Asia/Singapore', latitude: 1.3521, longitude: 103.8198 },
];

type GeocodingResponse = {
  results?: Array<{
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
    timezone?: string;
    latitude: number;
    longitude: number;
  }>;
};

export async function searchCalendarLocations(query: string): Promise<CalendarLocation[]> {
  const value = query.trim();
  if (value.length < 2) return [];
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=8&language=en&format=json`);
  if (!response.ok) throw new Error('Location search is temporarily unavailable.');
  const body = await response.json() as GeocodingResponse;
  return (body.results ?? []).filter(item => item.timezone && item.country_code).map(item => ({
    name: item.name,
    region: item.admin1 ?? '',
    country: item.country ?? '',
    countryCode: item.country_code ?? '',
    timezone: item.timezone ?? 'UTC',
    latitude: item.latitude,
    longitude: item.longitude,
  }));
}

type SolarResponse = {
  sunrise?: string | null;
  sunset?: string | null;
  moonrise?: string | null;
  moonset?: string | null;
  moon_phase?: string;
  moon_illumination?: number | null;
  error?: string;
  message?: string;
};

export async function loadSolarDay(location: CalendarLocation, date: string): Promise<SolarDay> {
  const query = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
    date,
    tz: location.timezone,
  });
  const response = await fetch(`https://api.sunrise-sunset.org/v2?${query.toString()}`);
  const body = await response.json() as SolarResponse;
  if (!response.ok || body.error) throw new Error(body.message || 'Local solar timings are temporarily unavailable.');
  return {
    sunrise: body.sunrise ?? null,
    sunset: body.sunset ?? null,
    moonrise: body.moonrise ?? null,
    moonset: body.moonset ?? null,
    moonPhase: body.moon_phase ?? '',
    moonIllumination: body.moon_illumination ?? null,
  };
}

export function formatLocationTime(value: string | null, timezone: string) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
}

export function calculateRahuKalam(sunrise: string | null, sunset: string | null, date: string, _timezone: string) {
  if (!sunrise || !sunset) return null;
  const sunriseTime = new Date(sunrise).getTime();
  const sunsetTime = new Date(sunset).getTime();
  if (!Number.isFinite(sunriseTime) || !Number.isFinite(sunsetTime) || sunsetTime <= sunriseTime) return null;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const segment = [7, 1, 6, 4, 5, 3, 2][weekday];
  const duration = (sunsetTime - sunriseTime) / 8;
  return {
    start: new Date(sunriseTime + duration * segment).toISOString(),
    end: new Date(sunriseTime + duration * (segment + 1)).toISOString(),
  };
}

export function locationLabel(location: CalendarLocation) {
  return [location.name, location.region, location.country].filter(Boolean).join(', ');
}
