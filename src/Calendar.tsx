import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  calculateRahuKalam,
  formatLocationTime,
  loadSolarDay,
  locationLabel,
  popularLocations,
  searchCalendarLocations,
  type CalendarLocation,
  type ReviewedPanchangam,
  type SolarDay,
} from './locationCalendar';
import { supabase } from './supabase';
import { styles as s } from './theme';

type PanchangamRow = {
  location_scope: 'global' | 'country' | 'timezone' | 'city';
  country_code: string | null;
  timezone: string | null;
  city: string | null;
  telugu_month: string;
  paksham: string;
  tithi: string;
  nakshatram: string;
  yogam: string;
  karanam: string;
  festival_name: string;
  festival_pooja_slug: string | null;
  notes: string;
  source_name: string;
  is_published: boolean;
  reviewed_at: string | null;
};

const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = (month: Date, day: number) => `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(day)}`;

const toReviewed = (row: PanchangamRow): ReviewedPanchangam => ({
  teluguMonth: row.telugu_month,
  paksham: row.paksham,
  tithi: row.tithi,
  nakshatram: row.nakshatram,
  yogam: row.yogam,
  karanam: row.karanam,
  festivalName: row.festival_name,
  festivalPoojaSlug: row.festival_pooja_slug,
  notes: row.notes,
  sourceName: row.source_name,
});

function chooseBestPanchangam(rows: PanchangamRow[], location: CalendarLocation) {
  const eligible = rows.filter(row => row.is_published && row.reviewed_at);
  const score = (row: PanchangamRow) => {
    if (row.location_scope === 'city' && row.city?.toLowerCase() === location.name.toLowerCase()) return 400;
    if (row.location_scope === 'timezone' && row.timezone === location.timezone) return 300;
    if (row.location_scope === 'country' && row.country_code === location.countryCode) return 200;
    if (row.location_scope === 'global') return 100;
    return 0;
  };
  return eligible.map(row => ({ row, score: score(row) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score)[0]?.row ?? null;
}

export default function Calendar({ userId, savedLocation, onLocationSaved }: { userId: string; savedLocation: string; onLocationSaved: (name: string) => void }) {
  const [now, setNow] = useState(() => new Date());
  const [location, setLocation] = useState<CalendarLocation>(() => popularLocations.find(item => item.name.toLowerCase() === savedLocation.toLowerCase()) ?? popularLocations[0]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CalendarLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [solar, setSolar] = useState<SolarDay | null>(null);
  const [panchangam, setPanchangam] = useState<ReviewedPanchangam | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayMessage, setDayMessage] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    void supabase.from('profiles').select('city, country_code, timezone, latitude, longitude').eq('id', userId).maybeSingle().then(({ data }) => {
      if (!active || !data) return;
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number' && data.timezone) {
        setLocation({ name: data.city || savedLocation || 'Saved location', region: '', country: '', countryCode: data.country_code || '', timezone: data.timezone, latitude: data.latitude, longitude: data.longitude });
      }
    });
    return () => { active = false; };
  }, [savedLocation, userId]);

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Intl.DateTimeFormat('en', { timeZone: location.timezone, dateStyle: 'full' }).format(now);
  const localTime = new Intl.DateTimeFormat('en', { timeZone: location.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' }).format(now);
  const selectedDate = selected === null ? null : isoDate(month, selected);
  const rahuKalam = useMemo(() => selectedDate ? calculateRahuKalam(solar?.sunrise ?? null, solar?.sunset ?? null, selectedDate, location.timezone) : null, [location.timezone, selectedDate, solar]);

  useEffect(() => {
    if (!selectedDate) { setSolar(null); setPanchangam(null); setDayMessage(''); return; }
    let active = true;
    setDayLoading(true);
    setDayMessage('');
    const solarRequest = loadSolarDay(location, selectedDate);
    const panchangamRequest = supabase
      ? supabase.from('panchangam_days').select('location_scope, country_code, timezone, city, telugu_month, paksham, tithi, nakshatram, yogam, karanam, festival_name, festival_pooja_slug, notes, source_name, is_published, reviewed_at').eq('calendar_date', selectedDate)
      : Promise.resolve({ data: [], error: null });
    void Promise.all([solarRequest, panchangamRequest]).then(([solarData, calendarResult]) => {
      if (!active) return;
      setSolar(solarData);
      if (calendarResult.error) {
        setPanchangam(null);
        setDayMessage('Reviewed Telugu calendar details are not available for this date yet.');
      } else {
        const best = chooseBestPanchangam((calendarResult.data ?? []) as PanchangamRow[], location);
        setPanchangam(best ? toReviewed(best) : null);
        setDayMessage(best ? '' : 'Reviewed Telugu calendar details are not available for this date yet.');
      }
      setDayLoading(false);
    }).catch(error => {
      if (!active) return;
      setSolar(null);
      setPanchangam(null);
      setDayMessage(error instanceof Error ? error.message : 'Unable to load calendar data.');
      setDayLoading(false);
    });
    return () => { active = false; };
  }, [location, selectedDate]);

  const move = (offset: number) => { setMonth(value => new Date(value.getFullYear(), value.getMonth() + offset, 1)); setSelected(null); };
  const search = async () => {
    if (query.trim().length < 2) { setLocationMessage('Enter at least two letters of a city or postal code.'); return; }
    setSearching(true); setLocationMessage('');
    try {
      const locations = await searchCalendarLocations(query);
      setResults(locations);
      if (locations.length === 0) setLocationMessage('No matching location found. Try adding the country name.');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Location search failed.');
    } finally { setSearching(false); }
  };
  const chooseLocation = async (next: CalendarLocation) => {
    setLocation(next); setSelected(null); setResults([]); setQuery(''); onLocationSaved(next.name); setLocationMessage('');
    if (!supabase || !userId) return;
    const { error } = await supabase.from('profiles').update({ city: next.name, country_code: next.countryCode, timezone: next.timezone, latitude: next.latitude, longitude: next.longitude }).eq('id', userId);
    setLocationMessage(error ? error.message : `${next.name} saved as your calendar location.`);
  };

  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.headerTitle}>Telugu Calendar</Text><Text style={s.intro}>Panchangam timings for your location</Text>
    <View style={s.calendarLocationCard}>
      <Text style={s.inputLabel}>SEARCH CITY OR POSTAL CODE</Text>
      <View style={s.calendarSearchRow}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => { void search(); }} returnKeyType="search" placeholder="Example: Helsinki, Finland" style={s.calendarSearchInput} /><Pressable onPress={() => { void search(); }} style={s.calendarSearchButton}><Text style={s.calendarSearchButtonText}>{searching ? '…' : 'Search'}</Text></Pressable></View>
      {results.map((item, index) => <Pressable key={`${item.name}-${item.latitude}-${index}`} onPress={() => { void chooseLocation(item); }} style={s.calendarResult}><View style={s.grow}><Text style={s.cardTitle}>{item.name}</Text><Text style={s.cardBody}>{[item.region, item.country].filter(Boolean).join(', ')}</Text></View><Text style={s.chevron}>›</Text></Pressable>)}
      {locationMessage ? <Text style={s.calendarMessage}>{locationMessage}</Text> : null}
      <Text style={s.inputLabel}>POPULAR LOCATIONS</Text><View style={s.tags}>{popularLocations.map(place => <Pressable key={place.name} accessibilityRole="button" accessibilityState={{ selected: location.name === place.name && location.timezone === place.timezone }} onPress={() => { void chooseLocation(place); }}><Text style={[s.tag, location.name === place.name && location.timezone === place.timezone && s.calendarTagActive]}>{place.name}</Text></Pressable>)}</View>
    </View>
    <View style={s.panchangam}><Text style={s.cardTitle}>Local time in {location.name}</Text><Text style={s.monthTitle}>{localTime}</Text><Text style={s.intro}>{today} · {location.timezone}</Text><Text style={s.calendarCoordinates}>{locationLabel(location)} · {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</Text></View>
    <View style={s.monthHeader}><Pressable accessibilityLabel="Previous month" onPress={() => move(-1)}><Text style={s.monthArrow}>‹</Text></Pressable><Text style={s.monthTitle}>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityLabel="Next month" onPress={() => move(1)}><Text style={s.monthArrow}>›</Text></Pressable></View>
    <View style={s.calendarCard}><View style={s.calendarGrid}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <View key={day} style={s.calendarCell}><Text style={s.weekDay}>{day}</Text></View>)}{Array.from({ length: month.getDay() }, (_, index) => <View key={`blank-${index}`} style={s.calendarCell} />)}{Array.from({ length: days }, (_, index) => index + 1).map(day => <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Date ${day}`} accessibilityState={{ selected: selected === day }} style={s.calendarCell} onPress={() => setSelected(selected === day ? null : day)}><View style={[s.dateCircle, selected === day && s.dateSelected]}><Text style={[s.dateNumber, selected === day && s.dateNumberSelected]}>{day}</Text></View></Pressable>)}</View></View>
    <Text style={s.calendarHint}>Tap a date to load details for {location.name}</Text>
    {selectedDate ? <View style={s.calendarDayCard}><Text style={s.cardTitle}>{selected} {month.toLocaleDateString('en', { month: 'long', year: 'numeric' })} · {location.name}</Text>{dayLoading ? <View style={s.calendarDayLoading}><ActivityIndicator color="#96351F" /><Text style={s.cardBody}>Calculating local timings…</Text></View> : <><View style={s.calendarTimingGrid}><View style={s.calendarTiming}><Text style={s.calendarTimingLabel}>SUNRISE</Text><Text style={s.calendarTimingValue}>{formatLocationTime(solar?.sunrise ?? null, location.timezone)}</Text></View><View style={s.calendarTiming}><Text style={s.calendarTimingLabel}>SUNSET</Text><Text style={s.calendarTimingValue}>{formatLocationTime(solar?.sunset ?? null, location.timezone)}</Text></View><View style={s.calendarTiming}><Text style={s.calendarTimingLabel}>RAHU KALAM</Text><Text style={s.calendarTimingValue}>{rahuKalam ? `${formatLocationTime(rahuKalam.start, location.timezone)}–${formatLocationTime(rahuKalam.end, location.timezone)}` : 'Not available'}</Text></View><View style={s.calendarTiming}><Text style={s.calendarTimingLabel}>MOON</Text><Text style={s.calendarTimingValue}>{solar?.moonPhase || 'Not available'}</Text></View></View>{panchangam ? <View style={s.reviewedPanchangam}>{panchangam.festivalName ? <Text style={s.calendarFestival}>{panchangam.festivalName}</Text> : null}<Text style={s.panchangamTitle}>{[panchangam.teluguMonth, panchangam.paksham].filter(Boolean).join(' · ')}</Text><Text style={s.calendarDetail}>Tithi: {panchangam.tithi || '—'}</Text><Text style={s.calendarDetail}>Nakshatram: {panchangam.nakshatram || '—'}</Text>{panchangam.yogam ? <Text style={s.calendarDetail}>Yogam: {panchangam.yogam}</Text> : null}{panchangam.karanam ? <Text style={s.calendarDetail}>Karanam: {panchangam.karanam}</Text> : null}{panchangam.notes ? <Text style={s.cardBody}>{panchangam.notes}</Text> : null}<Text style={s.calendarSource}>Reviewed source: {panchangam.sourceName || 'Divya Pooja editorial team'}</Text></View> : <Text style={s.calendarUnavailable}>{dayMessage}</Text>}</>}</View> : null}
    <View style={s.calendarCredits}><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://sunrise-sunset.org/')}><Text style={s.sectionLink}>Solar and moon data: Sunrise-Sunset.org ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://open-meteo.com/')}><Text style={s.sectionLink}>Location search: Open-Meteo/GeoNames ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.eenadu.net/calendar')}><Text style={s.sectionLink}>Eenadu calendar reference ↗</Text></Pressable></View><Text style={s.note}>Religious calendar fields appear only after annual data is reviewed and published by the Divya Pooja team.</Text>
  </ScrollView>;
}
