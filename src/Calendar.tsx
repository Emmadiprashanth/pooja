import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { styles as s } from './theme';

const cities = [
  ['Hyderabad', 'Asia/Kolkata'], ['Chennai', 'Asia/Kolkata'],
  ['New York', 'America/New_York'], ['Los Angeles', 'America/Los_Angeles'],
  ['London', 'Europe/London'], ['Dubai', 'Asia/Dubai'],
  ['Sydney', 'Australia/Sydney'], ['Singapore', 'Asia/Singapore'],
];

export default function Calendar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [city, setCity] = useState(cities[0]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<number | null>(null);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = new Intl.DateTimeFormat('en', { timeZone: city[1], dateStyle: 'full' }).format(now);
  const localTime = new Intl.DateTimeFormat('en', { timeZone: city[1], hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short' }).format(now);
  const move = (offset: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); setSelected(null); };
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.headerTitle}>Telugu Calendar</Text>
    <Text style={s.intro}>Choose your city</Text>
    <View style={s.tags}>{cities.map(place => <Pressable key={place[0]} accessibilityRole="button" accessibilityState={{ selected: city[0] === place[0] }} onPress={() => { setCity(place); setSelected(null); }}><Text style={[s.tag, city[0] === place[0] && { backgroundColor: '#F6C968' }]}>{place[0]}</Text></Pressable>)}</View>
    <View style={s.panchangam}>
      <Text style={s.cardTitle}>Local time in {city[0]}</Text>
      <Text style={s.monthTitle}>{localTime}</Text>
      <Text style={s.intro}>{today} · {city[1]}</Text>
    </View>
    <View style={s.monthHeader}>
      <Pressable accessibilityLabel="Previous month" onPress={() => move(-1)}><Text style={s.monthArrow}>‹</Text></Pressable>
      <Text style={s.monthTitle}>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</Text>
      <Pressable accessibilityLabel="Next month" onPress={() => move(1)}><Text style={s.monthArrow}>›</Text></Pressable>
    </View>
    <View style={s.calendarCard}><View style={s.calendarGrid}>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <View key={day} style={s.calendarCell}><Text style={s.weekDay}>{day}</Text></View>)}
      {Array.from({ length: month.getDay() }, (_, i) => <View key={`blank-${i}`} style={s.calendarCell} />)}
      {Array.from({ length: days }, (_, i) => i + 1).map(day => <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Date ${day}`} accessibilityState={{ selected: selected === day }} style={s.calendarCell} onPress={() => setSelected(selected === day ? null : day)}><View style={[s.dateCircle, selected === day && s.dateSelected]}><Text style={[s.dateNumber, selected === day && s.dateNumberSelected]}>{day}</Text></View></Pressable>)}
    </View></View>
    <Text style={s.calendarHint}>Tap a date to expand its details</Text>
    {selected !== null && <View style={s.panchangam}><Text style={s.cardTitle}>{selected} {month.toLocaleDateString('en', { month: 'long', year: 'numeric' })} · {city[0]}</Text><Text style={s.intro}>Verified local Panchangam is not available yet. Festival dates, Tithi and Nakshatram will appear after the reviewed calendar data is connected.</Text></View>}
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://www.eenadu.net/calendar')}><Text style={s.sectionLink}>Open Eenadu calendar reference ↗</Text></Pressable>
    <Text style={s.note}>External reference. Overseas festival dates require location-specific verification.</Text>
  </ScrollView>;
}
