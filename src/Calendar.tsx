import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { styles as s } from './theme';
import Screen, { Press } from './Screen';
import { Kolam, Lotus, MoonPhase } from './sacred';
import { haptic } from './motion';
import { City, Panchangam, civilDate, festivalsInMonth, localTime, panchangamFor } from './panchangam';

/** One labelled reading in the expanded day card. */
function Row({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={s.readingRow}>
    <Text style={s.readingLabel}>{label}</Text>
    <View style={s.grow}>
      <Text style={s.readingValue}>{value}</Text>
      {!!detail && <Text style={s.readingDetail}>{detail}</Text>}
    </View>
  </View>;
}

/**
 * The full reading for one day.
 *
 * Tithi and nakshatram carry their end times because that is the question people actually
 * have — not "which tithi is it" but "how long do I have". A bare name would look complete
 * while withholding the useful half.
 */
function DayReading({ p, city }: { p: Panchangam; city: City }) {
  const t = (d: Date | null) => localTime(city, d);
  return <View style={s.reading}>
    <Text style={s.readingTitle}>
      {p.date.day} {new Date(Date.UTC(p.date.year, p.date.month, p.date.day)).toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })} · {city.name}
    </Text>
    <Text style={s.readingSummary}>
      {p.samvatsara} · {p.masam.adhika ? 'Adhika ' : ''}{p.masam.name} masam · {p.tithi.paksha} paksha · {p.vaara}
    </Text>

    {p.festivals.map(festival => <View key={festival.name} style={s.festivalBanner}>
      <Lotus size={26} />
      <View style={s.grow}>
        <Text style={s.festivalName}>{festival.name}</Text>
        <Text style={s.festivalRule}>{festival.rule}</Text>
      </View>
    </View>)}

    <Row label="Tithi" value={`${p.tithi.paksha} ${p.tithi.name}`} detail={`till ${t(p.tithi.endsAt)}, then ${p.tithi.nextName}`} />
    <Row label="Nakshatram" value={p.nakshatra.name} detail={`till ${t(p.nakshatra.endsAt)}, then ${p.nakshatra.nextName}`} />
    <Row label="Yoga" value={p.yoga.name} detail={`till ${t(p.yoga.endsAt)}, then ${p.yoga.nextName}`} />
    <Row label="Karana" value={p.karana.name} detail={`till ${t(p.karana.endsAt)}, then ${p.karana.nextName}`} />
    <Row label="Sun" value={`Rises ${t(p.sunrise)}`} detail={`Sets ${t(p.sunset)} · in ${p.sunRashi}`} />
    <View style={s.readingRow}>
      <Text style={s.readingLabel}>Moon</Text>
      <View style={s.grow}>
        <View style={s.moonRow}>
          <MoonPhase size={34} elongationDeg={p.moonPhase} />
          <Text style={s.moonCaption}>
            {p.tithi.paksha === 'Shukla' ? 'Waxing' : 'Waning'} · {Math.round((1 - Math.cos((p.moonPhase * Math.PI) / 180)) / 2 * 100)}% lit
          </Text>
        </View>
      </View>
    </View>
    {!!p.rahuKalam && <Row label="Rahu Kalam" value={`${t(p.rahuKalam.start)} – ${t(p.rahuKalam.end)}`} detail={p.yamagandam ? `Yamagandam ${t(p.yamagandam.start)} – ${t(p.yamagandam.end)}` : undefined} />}
    {!p.sunrise && <Text style={s.note}>The Sun does not rise or set at this latitude on this date, so sunrise-based timings are unavailable.</Text>}
  </View>;
}

export default function Calendar({ city, onSelectCity, cities }: { city: City; onSelectCity: (city: City) => void; cities: City[] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [month, setMonth] = useState(() => {
    const here = civilDate(city, new Date());
    return { year: here.year, month: here.month };
  });
  const [selected, setSelected] = useState<number | null>(null);

  const days = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(month.year, month.month, 1)).getUTCDay();
  const today = civilDate(city, now);
  const showsToday = today.year === month.year && today.month === month.month;

  const localDate = new Intl.DateTimeFormat('en', { timeZone: city.timeZone, dateStyle: 'full' }).format(now);
  const clock = new Intl.DateTimeFormat('en', { timeZone: city.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' }).format(now);

  // One pass per month rather than per day; the engine caches, but the map is what draws the dots.
  const festivals = useMemo(() => festivalsInMonth(city, month.year, month.month), [city, month.year, month.month]);
  const reading = useMemo(
    () => (selected === null ? null : panchangamFor(city, month.year, month.month, selected)),
    [city, month.year, month.month, selected],
  );

  const move = (offset: number) => {
    haptic.light();
    const next = new Date(Date.UTC(month.year, month.month + offset, 1));
    setMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    setSelected(null);
  };

  const monthLabel = new Date(Date.UTC(month.year, month.month, 1)).toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return <Screen title="Telugu Calendar" subtitle="Panchangam computed for the city you choose">
    <View style={s.tags}>
      {cities.map(place => <Press
        key={place.name}
        style={[s.cityChip, city.name === place.name && s.cityChipOn]}
        onPress={() => { onSelectCity(place); setSelected(null); }}
        feedback="select"
        accessibilityLabel={`Show the Panchangam for ${place.name}`}
      >
        <Text style={[s.cityChipText, city.name === place.name && s.cityChipTextOn]}>{place.name}</Text>
      </Press>)}
    </View>

    <View style={[s.panchangam, s.clockCard]}>
      <Text style={s.cardTitle}>Local time in {city.name}</Text>
      <Text style={s.monthTitle}>{clock}</Text>
      <Text style={s.intro}>{localDate} · {city.timeZone}</Text>
    </View>

    <View style={s.monthHeader}>
      <Press style={s.monthNav} onPress={() => move(-1)} scale={0.88} accessibilityLabel="Previous month"><Text style={s.monthArrow}>‹</Text></Press>
      <Text style={s.monthTitle}>{monthLabel}</Text>
      <Press style={s.monthNav} onPress={() => move(1)} scale={0.88} accessibilityLabel="Next month"><Text style={s.monthArrow}>›</Text></Press>
    </View>

    <View style={s.calendarCard}><View style={s.calendarGrid}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <View key={day} style={s.calendarCell}><Text style={s.weekDay}>{day}</Text></View>)}
      {Array.from({ length: firstWeekday }, (_, i) => <View key={`blank-${i}`} style={s.calendarCell} />)}
      {Array.from({ length: days }, (_, i) => i + 1).map(day => {
        const isToday = showsToday && day === today.day;
        const isSelected = selected === day;
        const dayFestivals = festivals.get(day);
        return <Press
          key={day}
          containerStyle={s.calendarCell}
          style={s.calendarCellFill}
          scale={0.86}
          feedback="select"
          onPress={() => setSelected(isSelected ? null : day)}
          accessibilityLabel={`${day} ${monthLabel}${isToday ? ', today' : ''}${dayFestivals ? `, ${dayFestivals.map(f => f.name).join(' and ')}` : ''}`}
        >
          <View style={[s.dateCircle, isToday && !isSelected && s.dateToday, isSelected && s.dateSelected]}>
            <Text style={[s.dateNumber, isToday && !isSelected && s.dateTodayText, isSelected && s.dateNumberSelected]}>{day}</Text>
          </View>
          {/* A dot, not a colour change: the date circle already carries "today" and
              "selected", and a third state on the same surface would be unreadable. */}
          {!!dayFestivals && <View style={[s.festivalDot, isSelected && s.festivalDotSelected]} />}
        </Press>;
      })}
    </View></View>

    <View style={s.kolamWrap}><Kolam width={200} dots={11} opacity={0.4} /></View>
    <View style={s.legend}>
      <View style={s.legendDot} />
      <Text style={s.calendarHint}>Festival day · tap any date for its full Panchangam</Text>
    </View>

    {reading && <DayReading p={reading} city={city} />}

    <Press onPress={() => Linking.openURL('https://www.eenadu.net/calendar')} accessibilityRole="link" accessibilityLabel="Open the Eenadu calendar reference" style={s.linkRow} feedback="select">
      <Text style={s.sectionLink}>Open Eenadu calendar reference ↗</Text>
    </Press>
    <Text style={s.note}>
      Computed on this device from the Sun and Moon positions using the Lahiri ayanamsa, for {city.name} local time.
      Festival days follow the stated rule; regional traditions differ, so confirm with your family Poojari or temple before observing.
    </Text>
  </Screen>;
}
