import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, SafeAreaView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dayWisePoojas, samagri, specialPoojas } from './src/data';
import { HERO_GRADIENT, colors, styles as s } from './src/theme';
import Calendar from './src/Calendar';
import { Navigator, useNav } from './src/Navigator';
import Screen, { ActionBar, Press, StepTrail } from './src/Screen';
import TabBar, { Tab } from './src/TabBar';
import { haptic, useAnimatedValue, useBreathe, useEntrance } from './src/motion';
import { Diya, Halo, Kolam, Mandala, MoonPhase, PetalFall, Torana } from './src/sacred';
import { useOmAmbience } from './src/useOmAmbience';
import { CITIES, City, localTime } from './src/panchangam';
import { useToday } from './src/useToday';

type ScreenName = 'home' | 'services' | 'calendar' | 'prepare' | 'payment' | 'guide' | 'profile';

const TABS: Tab<ScreenName>[] = [
  { key: 'home', icon: '⌂', label: 'Home' },
  { key: 'services', icon: '🪔', label: 'Services' },
  { key: 'calendar', icon: '▣', label: 'Calendar' },
  { key: 'profile', icon: '♙', label: 'Profile' },
];

/** The three screens between deciding to do a Pooja and doing one. Named so every step in the
 *  flow can show where it sits without each screen hardcoding the sequence. */
const RITUAL = ['Prepare', 'Unlock', 'Pooja'];

type Session = {
  title: string;
  choose: (title: string) => void;
  family: string[];
  name: string;
  gotram: string;
  /** Shared so Home, Services and the Calendar never disagree about which sky they mean. */
  city: City;
};
const SessionContext = React.createContext<Session>({ title: 'Daily Pooja', choose: () => {}, family: [], name: '', gotram: '', city: CITIES[0] });

function Section({ title, link }: { title: string; link?: string }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{!!link && <Text style={s.sectionLink}>{link}</Text>}</View>;
}

function Icon({ value }: { value: string }) { return <View style={s.icon}><Text style={s.iconText}>{value}</Text></View>; }

function PoojaCard({ icon, title, subtitle, highlighted, onPress }: { icon: string; title: string; subtitle: string; highlighted?: boolean; onPress: () => void }) {
  const session = React.useContext(SessionContext);
  return <Press grow style={[s.poojaCard, highlighted && s.highlight]} onPress={() => { session.choose(title); onPress(); }} accessibilityLabel={`${title}. ${subtitle}`}>
    <Text style={s.emoji}>{icon}</Text><Text style={s.cardTitle}>{title}</Text><Text style={s.cardBody}>{subtitle}</Text>
    <View style={s.tags}><Text style={s.tag}>{title === 'Daily Pooja' ? '10 min' : '18 min'}</Text><Text style={s.tag}>{title === 'Daily Pooja' ? 'Free' : '🔊 Audio'}</Text></View>
  </Press>;
}

/**
 * The swell made visible. A sound that takes eighteen seconds to arrive needs to say so, or the
 * first few seconds of near-silence read as a broken control and the user taps again. The meter
 * costs one line and converts "did that work?" into "it is building".
 */
function OmCard({ playing, level, onToggle }: { playing: boolean; level: number; onToggle: () => void }) {
  const glow = useAnimatedValue(0);
  useEffect(() => {
    if (!playing) { Animated.timing(glow, { toValue: 0, duration: 400, useNativeDriver: true }).start(); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 2600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [glow, playing]);
  const breathe = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const status = !playing ? 'Tap to begin the Om' : level < 0.99 ? 'Rising softly…' : 'Steady';
  return <Press style={s.audioControl} onPress={onToggle} feedback="medium" accessibilityLabel={playing ? 'Stop Om ambience' : 'Start Om ambience'}>
    <Animated.View style={[s.controlIcon, { transform: [{ scale: playing ? breathe : 1 }] }]}><Text style={s.controlIconText}>ॐ</Text></Animated.View>
    <View style={s.grow}>
      <Text style={s.cardTitle}>Om ambience</Text>
      <Text style={s.cardBody}>{status}</Text>
      <View style={s.swell}><View style={[s.swellFill, { width: `${Math.round(level * 100)}%` }]} /></View>
    </View>
    <View style={[s.miniPlay, playing && s.miniPlayOn]}><Text style={s.miniPlayText}>{playing ? 'Ⅱ' : '▶'}</Text></View>
  </Press>;
}

/**
 * Today's reading, in one line, in the language people already use to describe a day.
 * "Tuesday, 15 September · Bhadrapada Shukla Chaviti" says both calendars at once, which is
 * how a Telugu household actually holds a date in mind.
 */
function DateLine({ today }: { today: ReturnType<typeof useToday> }) {
  const { panchangam: p, date } = today;
  const civil = new Date(Date.UTC(date.year, date.month, date.day))
    .toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return <Text style={s.dateLine}>
    <Text style={s.dateLineStrong}>{civil}</Text>
    {`  ·  ${p.masam.adhika ? 'Adhika ' : ''}${p.masam.name} ${p.tithi.paksha} ${p.tithi.name}`}
  </Text>;
}

const screen = Dimensions.get('window');
const heroWidth = screen.width - 36;   // page padding either side

function Home({ om }: { om: ReturnType<typeof useOmAmbience> }) {
  const nav = useNav<ScreenName>();
  const session = React.useContext(SessionContext);
  const today = useToday(session.city);
  const [reminderOn, setReminderOn] = useState(true);

  const p = today.panchangam;
  const todaysFestival = p.festivals[0];
  const upcoming = today.upcoming;
  // The hero shows today's observance when there is one and otherwise counts down to the next,
  // because "nothing today" is a worse answer than "Deepavali, in 54 days" for someone deciding
  // whether they need to start buying Samagri.
  const hero = todaysFestival
    ? { eyebrow: "TODAY'S FESTIVAL", title: todaysFestival.name, body: 'Complete English audio guidance from preparation to Harathi', pooja: todaysFestival.pooja }
    : upcoming
      ? { eyebrow: upcoming.daysAway === 1 ? 'TOMORROW' : `IN ${upcoming.daysAway} DAYS`, title: upcoming.festival.name, body: `${upcoming.date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} · preparation checklist and full audio guidance`, pooja: upcoming.festival.pooja }
      : { eyebrow: 'DAILY PRACTICE', title: 'Daily Pooja', body: 'A simple guided Pooja for any morning', pooja: 'Daily Pooja' };

  const weekday = dayWisePoojas[(p.weekday + 6) % 7];   // data starts at Monday, JS at Sunday
  const weekdayName = new Date(Date.UTC(today.date.year, today.date.month, today.date.day))
    .toLocaleDateString('en', { weekday: 'long', timeZone: 'UTC' });

  return <Screen
    title="Divya Pooja"
    trailing={<View style={s.avatar}><Text style={s.avatarText}>{session.name.trim().slice(0, 2).toUpperCase() || 'DP'}</Text></View>}
  >
    <DateLine today={today} />
    <View style={s.hero}>
      {/* Layered back to front: dawn gradient, turning mandala, temple arch, then the words.
          Each layer is quieter than the one above it, so the ornament never fights the title. */}
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={s.heroFill} />
      <View style={s.heroMandala} pointerEvents="none"><Mandala size={230} color="#FFFFFF" opacity={0.1} period={120000} /></View>
      <Torana width={heroWidth} height={128} color="#FFE1A0" opacity={0.3} crown />
      <View style={s.heroInner}>
        <Text style={s.eyebrow}>{hero.eyebrow}</Text><Text style={s.heroTitle}>{hero.title}</Text>
        <Text style={s.heroBody}>{hero.body}</Text>
        <Press
          style={s.heroButton}
          onPress={() => { session.choose(hero.pooja ?? hero.title); nav.push('prepare'); }}
          feedback="medium"
          accessibilityLabel={`Start the ${hero.title} Pooja`}
        >
          <Text style={s.heroButtonText}>Start Pooja  →</Text>
        </Press>
      </View>
      <View style={s.heroDiya} pointerEvents="none"><Diya size={72} /></View>
    </View>
    <View style={s.quickControls}>
      <OmCard playing={om.playing} level={om.level} onToggle={om.toggle} />
      <View style={s.reminderCard}>
        <View style={s.controlIcon}><Text style={s.controlIconText}>🔔</Text></View>
        <View style={s.grow}>
          <Text style={s.cardTitle}>Festival reminder</Text>
          <Text style={s.cardBody}>{upcoming ? `${upcoming.festival.name} · ${upcoming.daysAway === 0 ? 'today' : upcoming.daysAway === 1 ? 'tomorrow' : `in ${upcoming.daysAway} days`}` : 'No festival in the next few months'}</Text>
        </View>
        <Press style={[s.toggle, reminderOn && s.toggleOn]} onPress={() => { haptic.select(); setReminderOn(value => !value); }} scale={0.94} feedback="none" accessibilityLabel={`Festival reminder ${reminderOn ? 'on' : 'off'}`}>
          <View style={[s.knob, reminderOn && s.knobOn]} />
        </Press>
      </View>
    </View>

    <View style={s.kolamWrap}><Kolam width={heroWidth * 0.62} opacity={0.4} /></View>
    <Section title="Today's Panchangam" link={session.city.name} />
    <Press style={s.panchangam} onPress={() => nav.selectTab('calendar')} accessibilityLabel={`Today's Panchangam for ${session.city.name}. ${p.tithi.paksha} ${p.tithi.name}, ${p.nakshatra.name} nakshatram. Open the calendar.`}>
      <Text style={s.panchangamTitle}>{p.masam.adhika ? 'Adhika ' : ''}{p.masam.name} {p.tithi.paksha} {p.tithi.name}</Text>
      <Text style={s.cardBody}>Nakshatram: {p.nakshatra.name} · Rahu Kalam: {p.rahuKalam ? `${localTime(session.city, p.rahuKalam.start)}–${localTime(session.city, p.rahuKalam.end)}` : '—'}</Text>
      <View style={s.tags}>
        <Text style={s.tag}>Sunrise {localTime(session.city, p.sunrise)}</Text>
        <Text style={s.tag}>{p.samvatsara}</Text>
        <Text style={s.tag}>{p.vaara}</Text>
      </View>
      {/* The tithi drawn as the Moon actually looks tonight. It turns an unfamiliar Sanskrit
          name into something anyone can check by stepping outside and looking up. */}
      <View style={s.moonRow}>
        <MoonPhase size={38} elongationDeg={p.moonPhase} />
        <Text style={s.moonCaption}>
          {p.tithi.paksha === 'Shukla' ? 'Waxing toward Pournami' : 'Waning toward Amavasya'} · this is the Moon tonight
        </Text>
      </View>
    </Press>

    <Section title="Recommended today" link={weekdayName} />
    <View style={s.columns}>
      <PoojaCard icon={weekday.icon} title={weekday.title} subtitle={`Traditional for ${weekdayName}`} highlighted onPress={() => nav.push('guide')} />
      <PoojaCard icon="🪔" title="Daily Pooja" subtitle="A simple daily practice" onPress={() => nav.push('guide')} />
    </View>

    {!!upcoming && <>
      <Section title="Upcoming Pooja" link="View all" />
      <Press style={s.rowCard} onPress={() => nav.selectTab('calendar')} accessibilityLabel={`${upcoming.festival.name}, ${upcoming.date.toDateString()}. Open the calendar.`}>
        <Icon value="🌺" />
        <View style={s.grow}>
          <Text style={s.cardTitle}>{upcoming.festival.name}</Text>
          <Text style={s.cardBody}>{upcoming.date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} · preparation checklist available three days before</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Press>
    </>}
  </Screen>;
}

function Services() {
  const nav = useNav<ScreenName>();
  const session = React.useContext(SessionContext);
  const p = useToday(session.city).panchangam;
  const openPooja = (title: string) => { session.choose(title); nav.push('guide'); };
  return <Screen title="Pooja Services" subtitle="Choose the Pooja you want to perform">
    <Press style={s.featureCard} onPress={() => openPooja('Daily Pooja')} accessibilityLabel="Daily Pooja, everyday audio guidance">
      <Icon value="🪔" /><View style={s.grow}><Text style={s.cardTitle}>Daily Pooja</Text><Text style={s.cardBody}>Everyday audio guidance</Text></View><Text style={s.chevron}>›</Text>
    </Press>
    <Section title="Day-wise Poojas" link="Monday–Sunday" />
    <View style={s.groupedList}>
      {dayWisePoojas.map((item, index) => <Press key={item.day} style={[s.compactRow, index === dayWisePoojas.length - 1 && s.lastRow]} onPress={() => openPooja(item.title)} accessibilityLabel={`${item.day}: ${item.title}`}>
        <Text style={s.dayBadge}>{item.day.slice(0, 3)}</Text><Text style={s.listEmoji}>{item.icon}</Text><Text style={s.listTitle}>{item.title}</Text><Text style={s.chevron}>›</Text>
      </Press>)}
    </View>
    <Section title="Special Poojas" link="Important Poojas" />
    {specialPoojas.map(item => <Press key={item.title} style={s.rowCard} onPress={() => openPooja(item.title)} accessibilityLabel={`${item.title}. ${item.detail}`}>
      <Icon value={item.icon} /><View style={s.grow}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardBody}>{item.detail}</Text></View><Text style={s.chevron}>›</Text>
    </Press>)}
    <View style={s.kolamWrap}><Kolam width={heroWidth * 0.62} opacity={0.4} /></View>
    <Section title="Today's Panchangam" link={session.city.name} />
    <View style={s.panchangam}>
      <Text style={s.panchangamTitle}>{p.masam.adhika ? 'Adhika ' : ''}{p.masam.name} {p.tithi.paksha} {p.tithi.name}</Text>
      <Text style={s.cardBody}>
        Nakshatram: {p.nakshatra.name} · Rahu Kalam: {p.rahuKalam ? `${localTime(session.city, p.rahuKalam.start)}–${localTime(session.city, p.rahuKalam.end)}` : '—'}
      </Text>
      <View style={s.tags}>
        <Text style={s.tag}>Sunrise {localTime(session.city, p.sunrise)}</Text>
        <Text style={s.tag}>Sunset {localTime(session.city, p.sunset)}</Text>
        <Text style={s.tag}>{p.yoga.name} yoga</Text>
      </View>
    </View>
  </Screen>;
}

function Prepare() {
  const nav = useNav<ScreenName>();
  const session = React.useContext(SessionContext);
  const [checked, setChecked] = useState([true, true, true, false, false, false]);
  const count = checked.filter(Boolean).length;
  const ready = count === checked.length;
  const deityIcon = specialPoojas.find(item => item.title === session.title)?.icon
    ?? dayWisePoojas.find(item => item.title === session.title)?.icon
    ?? '🪔';
  return <Screen
    title="Prepare"
    subtitle={`${session.title} · about 35 minutes`}
    onBack={nav.pop}
    backLabel="Home"
    action={<ActionBar label="Continue" hint={ready ? 'Everything is ready' : `${count} of ${checked.length} items ready · you can continue anyway`} onPress={() => nav.push('payment')} />}
  >
    <StepTrail step={1} total={3} labels={RITUAL} />
    {/* Now that the title follows the day's actual observance, a fixed Ganesha icon would be
        asserting the wrong deity for most of them. Falls back to a lamp, which is never wrong. */}
    <View style={s.deityHalo}>
      <Halo size={150} />
      <View style={s.deity}><Text style={s.deityText}>{deityIcon}</Text></View>
    </View>
    <View style={s.progress}><View style={[s.progressFill, { width: `${Math.max(4, count / checked.length * 100)}%` }]} /></View>
    <Section title="Samagri checklist" link={`${count} of ${checked.length} ready`} />
    <View style={s.groupedList}>
      {samagri.map((item, index) => <Press
        key={item}
        style={[s.checkRow, index === samagri.length - 1 && s.lastRow]}
        onPress={() => { haptic.select(); setChecked(values => values.map((value, i) => i === index ? !value : value)); }}
        feedback="none"
        scale={0.995}
        accessibilityLabel={`${item}, ${checked[index] ? 'ready' : 'not ready'}`}
      >
        <View style={[s.checkbox, checked[index] && s.checkboxOn]}><Text style={s.checkmark}>{checked[index] ? '✓' : ''}</Text></View>
        <Text style={[s.checkText, checked[index] && s.checkTextDone]}>{item}</Text>
      </Press>)}
    </View>
  </Screen>;
}

function Payment() {
  const nav = useNav<ScreenName>();
  const [plan, setPlan] = useState<'single' | 'monthly'>('single');
  return <Screen
    title="Unlock this Pooja"
    subtitle="Your name and Gotram spoken naturally in the Sankalpam"
    onBack={nav.pop}
    backLabel="Prepare"
    action={<ActionBar label={`Unlock demo · ${plan === 'single' ? '₹49' : '₹79'}`} hint="The MVP demo does not process a real payment" onPress={() => nav.push('guide')} />}
  >
    <StepTrail step={2} total={3} labels={RITUAL} />
    <View style={s.deityHalo}>
      <Halo size={150} />
      <View style={s.deity}><Text style={s.deityText}>🔊</Text></View>
    </View>
    <Text style={s.price}>{plan === 'single' ? '₹49' : '₹79'}</Text>
    <Text style={s.centerBody}>{plan === 'single' ? 'One-time purchase' : 'Monthly subscription'}</Text>
    <Press style={[s.plan, plan === 'single' && s.planSelected]} onPress={() => setPlan('single')} feedback="select" accessibilityLabel="This Pooja only, ₹49">
      <View style={[s.radio, plan === 'single' && s.radioOn]}>{plan === 'single' && <View style={s.radioDot} />}</View>
      <View style={s.grow}><Text style={s.cardTitle}>This Pooja only</Text><Text style={s.cardBody}>Keep access in your account</Text></View><Text style={s.planPrice}>₹49</Text>
    </Press>
    <Press style={[s.plan, plan === 'monthly' && s.planSelected]} onPress={() => setPlan('monthly')} feedback="select" accessibilityLabel="All Poojas for one month, ₹79">
      <View style={[s.radio, plan === 'monthly' && s.radioOn]}>{plan === 'monthly' && <View style={s.radioDot} />}</View>
      <View style={s.grow}><Text style={s.cardTitle}>All Poojas for one month</Text><Text style={s.cardBody}>Daily, day based and festival Poojas</Text></View><Text style={s.planPrice}>₹79</Text>
    </Press>
  </Screen>;
}

function Guide({ onComplete }: { onComplete: () => void }) {
  const nav = useNav<ScreenName>();
  const session = React.useContext(SessionContext);
  const { name, gotram } = session;
  const [participants, setParticipants] = useState([{ id: 0, name, gotram }]);
  const nextId = React.useRef(1);
  const addParticipant = (participantName = '') => setParticipants(items => [...items, { id: nextId.current++, name: participantName, gotram }]);
  const player = useAudioPlayer(require('./assets/pooja-guide-demo.wav'));
  const status = useAudioPlayerStatus(player);
  const subtitles = [
    `${name || 'Prashanth'}, ${gotram || 'Amararushi'} Gotrasya. Let us begin the Pooja.`,
    'Light the lamp and offer turmeric, kumkum, flowers and akshata.',
    'Pray with devotion while listening to the mantra.',
    'Now offer Naivedyam and complete the Pooja with Harathi.',
  ];
  const segmentLength = status.duration > 0 ? status.duration / subtitles.length : 4;
  const subtitleIndex = Math.min(subtitles.length - 1, Math.floor(status.currentTime / segmentLength));
  const togglePoojaAudio = () => status.playing ? player.pause() : player.play();
  return <Screen
    title={session.title}
    subtitle="Keep the Samagri ready and follow the complete Poojari audio"
    onBack={nav.pop}
    backLabel="Back"
    action={<ActionBar
      label="Complete Pooja"
      hint={status.playing ? 'Playing' : 'You can finish whenever you are ready'}
      onPress={() => { player.pause(); onComplete(); nav.finish(); }}
      secondary={{ label: status.playing ? 'Pause' : 'Play', onPress: togglePoojaAudio }}
    />}
  >
    <StepTrail step={3} total={3} labels={RITUAL} />
    <View style={s.poojaSession}>
      <View style={s.samagriPanel}><Text style={s.panelEyebrow}>POOJA SAMAGRI</Text>{samagri.map((item, index) => <View key={item} style={s.samagriMiniRow}><View style={s.samagriNumber}><Text style={s.samagriNumberText}>{index + 1}</Text></View><Text style={s.samagriMiniText}>{item}</Text></View>)}</View>
      <View style={s.audioPanel}>
        <Text style={s.panelEyebrow}>POOJARI AUDIO</Text>
        <Diya size={56} />
        {/* The halo only breathes while the audio does, so the glow is a status light rather
            than decoration: one glance says whether the Pooja is running. */}
        <View style={s.playHalo}>
          {status.playing && <Halo size={124} color={colors.orange} strength={0.72} />}
          <Press style={s.sessionPlay} onPress={togglePoojaAudio} feedback="medium" accessibilityLabel={status.playing ? 'Pause Poojari audio' : 'Play Poojari audio'}>
            <Text style={s.sessionPlayText}>{status.playing ? 'Ⅱ' : '▶'}</Text>
          </Press>
        </View>
        <Text style={s.audioState}>{status.playing ? 'Playing' : 'Tap to listen'}</Text>
      </View>
    </View>
    <View style={s.audioProgress}><View style={[s.audioProgressFill, { width: `${status.duration > 0 ? Math.min(100, status.currentTime / status.duration * 100) : 0}%` }]} /></View>
    <View style={s.subtitleCard}><Text style={s.subtitleLabel}>SUBTITLES</Text><Text style={s.subtitleText}>{subtitles[subtitleIndex]}</Text></View>

    <Section title="Pooja participants" />
    <Text style={s.intro}>Add everyone taking part in this Pooja.</Text>
    {participants.map(person => <View key={person.id} style={s.participantCard}>
      <TextInput accessibilityLabel="Participant name" placeholder="Participant name" value={person.name} style={s.input} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, name: value } : item))} />
      <TextInput accessibilityLabel="Participant Gotram" placeholder="Gotram (optional)" value={person.gotram} style={[s.input, s.inputSpaced]} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, gotram: value } : item))} />
      <Press onPress={() => setParticipants(items => items.filter(item => item.id !== person.id))} accessibilityLabel={`Remove ${person.name || 'participant'}`} style={s.removeRow} feedback="select">
        <Text style={s.removeText}>Remove participant</Text>
      </Press>
    </View>)}
    <View style={s.chipRow}>
      {session.family.filter(member => member.trim() && !participants.some(p => p.name === member)).map((member, i) => <Press key={`${member}-${i}`} style={s.chip} onPress={() => addParticipant(member)} feedback="select" accessibilityLabel={`Add ${member}`}><Text style={s.chipText}>+ {member}</Text></Press>)}
      <Press style={[s.chip, s.chipOutline]} onPress={() => addParticipant()} feedback="select" accessibilityLabel="Add a participant"><Text style={s.chipText}>+ Add participant</Text></Press>
    </View>
    <Text style={s.personalizedNote}>Participants: {participants.map(p => p.name.trim()).filter(Boolean).join(', ') || 'None selected'}</Text>
    <Text style={s.note}>Audio preview. Participant voice personalization is not connected yet.</Text>
  </Screen>;
}

function Profile({ name, setName, gotram, setGotram, familyMembers, setFamilyMembers }: {
  name: string; setName: (x: string) => void; gotram: string; setGotram: (x: string) => void;
  familyMembers: string[]; setFamilyMembers: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const nav = useNav<ScreenName>();
  const [newMember, setNewMember] = useState('');
  const addMember = () => {
    const member = newMember.trim();
    if (!member) return;
    haptic.success();
    setFamilyMembers(members => [...members, member]);
    setNewMember('');
  };
  return <Screen title="Family Profile" subtitle="Used to personalise your Sankalpam">
    <Text style={s.profileSectionTitle}>Primary devotee</Text>
    <Text style={s.inputLabel}>NAME</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="Your name" />
    <Text style={s.inputLabel}>GOTRAM</Text><TextInput value={gotram} onChangeText={setGotram} style={s.input} placeholder="Your Gotram" />
    <Text style={s.inputLabel}>LOCATION</Text><TextInput defaultValue="Hyderabad, Telangana" style={s.input} />
    <View style={s.familyHeader}><View><Text style={s.profileSectionTitle}>Family members</Text><Text style={s.familyHelp}>Add every name to include in family Poojas</Text></View><View style={s.memberCount}><Text style={s.memberCountText}>{familyMembers.length}</Text></View></View>
    {familyMembers.length === 0 && <View style={s.emptyFamily}><Text style={s.emptyFamilyIcon}>♙</Text><Text style={s.emptyFamilyText}>No family members added yet</Text></View>}
    {familyMembers.map((member, index) => <View key={`${member}-${index}`} style={s.familyRow}>
      <View style={s.familyAvatar}><Text style={s.familyAvatarText}>{member.trim().slice(0, 1).toUpperCase() || '?'}</Text></View>
      <TextInput value={member} onChangeText={value => setFamilyMembers(members => members.map((item, itemIndex) => itemIndex === index ? value : item))} style={s.familyNameInput} placeholder="Family member name" />
      <Press style={s.removeMember} onPress={() => setFamilyMembers(members => members.filter((_, itemIndex) => itemIndex !== index))} scale={0.88} feedback="select" accessibilityLabel={`Remove ${member}`}><Text style={s.removeMemberText}>×</Text></Press>
    </View>)}
    <View style={s.addFamilyRow}>
      <TextInput value={newMember} onChangeText={setNewMember} onSubmitEditing={addMember} returnKeyType="done" style={s.addFamilyInput} placeholder="Enter family member name" placeholderTextColor="#A98D7E" />
      <Press style={s.addMemberButton} onPress={addMember} disabled={!newMember.trim()} feedback="none" accessibilityLabel="Add family member"><Text style={s.addMemberButtonText}>+ Add</Text></Press>
    </View>
    <View style={s.verified}><Text style={s.verifiedIcon}>✓</Text><View><Text style={s.cardTitle}>Audio pronunciation</Text><Text style={s.cardBody}>Confirmed</Text></View></View>
    <Press style={s.listenButton} onPress={() => nav.push('guide')} feedback="medium" accessibilityLabel="Hear my personalized Sankalpam">
      <Text style={s.listenButtonText}>Hear my personalized Sankalpam</Text>
    </Press>
  </Screen>;
}

export default function App() {
  const [poojaTitle, setPoojaTitle] = useState('Daily Pooja');
  const [name, setName] = useState('Prashanth');
  const [gotram, setGotram] = useState('Amararushi');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [city, setCity] = useState<City>(CITIES[0]);
  const [celebrating, setCelebrating] = useState(false);
  const om = useOmAmbience(require('./assets/om-background.wav'));

  const renderScreen = (screen: ScreenName) => {
    if (screen === 'services') return <Services />;
    if (screen === 'calendar') return <Calendar city={city} onSelectCity={setCity} cities={CITIES} />;
    if (screen === 'prepare') return <Prepare />;
    if (screen === 'payment') return <Payment />;
    if (screen === 'guide') return <Guide key={poojaTitle} onComplete={() => setCelebrating(true)} />;
    if (screen === 'profile') return <Profile name={name} setName={setName} gotram={gotram} setGotram={setGotram} familyMembers={familyMembers} setFamilyMembers={setFamilyMembers} />;
    return <Home om={om} />;
  };

  return <SessionContext.Provider value={{ title: poojaTitle, choose: setPoojaTitle, family: familyMembers, name, gotram, city }}>
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <Navigator<ScreenName>
        initial="home"
        tabs={TABS.map(tab => tab.key)}
        renderScreen={renderScreen}
        renderTabBar={({ active, select, visible }) => <TabBar tabs={TABS} active={active} onSelect={select} visible={visible} />}
      />
      {/* Rendered above the navigator so the petals fall across whatever screen the ritual
          released the user onto, rather than being clipped by the card that is leaving. */}
      {celebrating && <PetalFall width={screen.width} height={screen.height} onDone={() => setCelebrating(false)} />}
    </SafeAreaView>
  </SessionContext.Provider>;
}
