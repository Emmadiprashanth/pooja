import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { dayWisePoojas, specialPoojas } from './src/data';
import { getPooja } from './src/poojas';
import { styles as s } from './src/theme';
import Calendar from './src/Calendar';

type Screen = 'login' | 'home' | 'services' | 'calendar' | 'prepare' | 'payment' | 'guide' | 'profile';
const SessionContext = React.createContext({ title: 'Daily Pooja', choose: (title: string) => {}, family: [] as string[] });

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, pressed && s.pressed]}><Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text></Pressable>;
}

function Header({ title, onBack }: { title?: string; onBack?: () => void }) {
  return <View style={s.header}>
    {onBack ? <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable> : <View style={s.logo}><Text style={s.logoText}>DP</Text></View>}
    <View style={s.headerCopy}><Text style={s.headerTitle}>{title ?? 'Divya Pooja'}</Text>{!title && <Text style={s.headerSubtitle}>Your Pooja · Your Guide</Text>}</View>
    <View style={s.avatar}><Text style={s.avatarText}>PS</Text></View>
  </View>;
}

function Login({ onContinue }: { onContinue: (name: string, gotram: string) => void }) {
  const [register, setRegister] = useState(true);
  const [name, setName] = useState('Prashanth Kumar');
  const [gotram, setGotram] = useState('Amarushi');
  const submit = () => { if (name.trim()) onContinue(name.trim(), gotram.trim() || 'Amarushi'); };
  return <ScrollView contentContainerStyle={s.loginContent} keyboardShouldPersistTaps="handled">
    <View style={s.loginBrand}><View style={s.logo}><Text style={s.logoText}>DP</Text></View><Text style={s.loginBrandName}>Divya Pooja</Text><Text style={s.loginTagline}>Your Pooja · Your Guide</Text></View>
    <View style={s.loginCard}><Text style={s.loginTitle}>{register ? 'Begin your Pooja journey' : 'Welcome back'}</Text><Text style={s.loginBody}>{register ? 'Create your local demo profile to personalize every Pooja.' : 'Continue with your devotee profile.'}</Text>
      {register && <><Text style={s.inputLabel}>NAME</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="Your full name" autoCapitalize="words" /></>}
      <Text style={s.inputLabel}>GOTRAM</Text><TextInput value={gotram} onChangeText={setGotram} style={s.input} placeholder="Your Gotram" autoCapitalize="words" />
      <Button label={register ? 'Create local profile' : 'Continue'} onPress={submit} />
      <Pressable onPress={() => setRegister(value => !value)}><Text style={s.loginSwitch}>{register ? 'Already have a profile? Sign in' : 'New here? Create a profile'}</Text></Pressable>
      <Text style={s.note}>Local MVP only · No data is sent to a server</Text>
    </View>
  </ScrollView>;
}

function Section({ title, link }: { title: string; link: string }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionLink}>{link}</Text></View>;
}

function Icon({ value, photo, title }: { value: string; photo?: number; title?: string }) { return <View style={s.icon}>{photo ? <Image accessibilityLabel={`${title ?? 'Pooja'} deity photo`} source={photo} style={s.iconPhoto} resizeMode="cover" /> : <Text style={s.iconText}>{value}</Text>}</View>; }

function PoojaCard({ icon, title, subtitle, highlighted, onPress }: { icon: string; title: string; subtitle: string; highlighted?: boolean; onPress: () => void }) {
  const session = React.useContext(SessionContext);
  const photo = getPooja(title).deityImage;
  return <Pressable style={[s.poojaCard, highlighted && s.highlight]} onPress={() => { session.choose(title); onPress(); }}>
    {photo ? <Image accessibilityLabel={`${title} deity photo`} source={photo} style={s.poojaCardPhoto} resizeMode="cover" /> : <Text style={s.emoji}>{icon}</Text>}<Text style={s.cardTitle}>{title}</Text><Text style={s.cardBody}>{subtitle}</Text>
    <View style={s.tags}><Text style={s.tag}>{title === 'Daily Pooja' ? '10 min' : '18 min'}</Text><Text style={s.tag}>{title === 'Daily Pooja' ? 'Free' : '🔊 Audio'}</Text></View>
  </Pressable>;
}

function Home({ go, omPlaying, toggleOm }: { go: (screen: Screen) => void; omPlaying: boolean; toggleOm: () => void }) {
  const session = React.useContext(SessionContext);
  const [reminderOn, setReminderOn] = useState(true);
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header />
    <Text style={s.date}><Text style={s.dateStrong}>Saturday, 5 September</Text> · Bhadrapada Masam</Text>
    <View style={s.hero}>
      <Text style={s.eyebrow}>TODAY'S FESTIVAL</Text><Text style={s.heroTitle}>Vinayaka Chavithi</Text>
      <Text style={s.heroBody}>Complete English audio guidance from preparation to Harathi</Text>
      <Pressable style={s.heroButton} onPress={() => { session.choose('Vinayaka Chavithi Pooja'); go('prepare'); }}><Text style={s.heroButtonText}>Start Pooja  →</Text></Pressable><Text style={s.om}>ॐ</Text>
    </View>
    <View style={s.quickControls}>
      <Pressable style={s.audioControl} onPress={toggleOm}><View style={s.controlIcon}><Text style={s.controlIconText}>ॐ</Text></View><View style={s.grow}><Text style={s.cardTitle}>Om ambience</Text><Text style={s.cardBody}>{omPlaying ? 'Playing softly in the background' : 'Tap to play background audio'}</Text></View><View style={[s.miniPlay, omPlaying && s.miniPlayOn]}><Text style={s.miniPlayText}>{omPlaying ? 'Ⅱ' : '▶'}</Text></View></Pressable>
      <View style={s.reminderCard}><View style={s.controlIcon}><Text style={s.controlIconText}>🔔</Text></View><View style={s.grow}><Text style={s.cardTitle}>Festival reminder</Text><Text style={s.cardBody}>Vinayaka Chavithi · Today, 7:00 AM</Text></View><Switch value={reminderOn} onValueChange={setReminderOn} trackColor={{ false: '#D9C8BC', true: '#E6A77D' }} thumbColor={reminderOn ? '#96351F' : '#FFFFFF'} /></View>
    </View>
    <Section title="Recommended today" link="Saturday" />
    <View style={s.columns}><PoojaCard icon="🪷" title="Sri Venkateswara Swamy Pooja" subtitle="Recommended for today" highlighted onPress={() => go('guide')} /><PoojaCard icon="🪔" title="Daily Pooja" subtitle="A simple daily practice" onPress={() => go('guide')} /></View>
    <Section title="Upcoming Pooja" link="View all" />
    <Pressable style={s.rowCard} onPress={() => go('services')}><Icon value="🌺" photo={getPooja('Varalakshmi Vratham').deityImage} title="Varalakshmi Vratham" /><View style={s.grow}><Text style={s.cardTitle}>Varalakshmi Vratham</Text><Text style={s.cardBody}>Preparation checklist available three days before</Text></View><Text style={s.chevron}>›</Text></Pressable>
  </ScrollView>;
}

function Services({ go }: { go: (screen: Screen) => void }) {
  const session = React.useContext(SessionContext);
  const openPooja = (title: string) => { session.choose(title); go('guide'); };
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Pooja Services" /><Text style={s.intro}>Choose the Pooja you want to perform</Text>
    <Pressable style={s.featureCard} onPress={() => openPooja('Vinayaka Pooja')}><Icon value="🐘" photo={getPooja('Vinayaka Pooja').deityImage} title="Vinayaka Pooja" /><View style={s.grow}><Text style={s.cardTitle}>Vinayaka Pooja · Demo ready</Text><Text style={s.cardBody}>Wednesday Pooja with your recording and Samagri list</Text></View><Text style={s.chevron}>›</Text></Pressable>
    <Pressable style={s.featureCard} onPress={() => openPooja('Daily Pooja')}><Icon value="🪔" /><View style={s.grow}><Text style={s.cardTitle}>Daily Pooja</Text><Text style={s.cardBody}>Recording being prepared</Text></View><Text style={s.chevron}>›</Text></Pressable>
    <Section title="Day-wise Poojas" link="Monday–Sunday" />
    {dayWisePoojas.map(item => <Pressable key={item.day} style={s.compactRow} onPress={() => openPooja(item.title)}><Text style={s.dayBadge}>{item.day.slice(0, 3)}</Text>{getPooja(item.title).deityImage ? <Image accessibilityLabel={`${item.title} deity photo`} source={getPooja(item.title).deityImage} style={s.dayPhoto} resizeMode="cover" /> : <Text style={s.listEmoji}>{item.icon}</Text>}<Text style={s.listTitle}>{item.title}</Text><Text style={s.chevron}>›</Text></Pressable>)}
    <Section title="Special Poojas" link="Important Poojas" />
    {specialPoojas.map(item => <Pressable key={item.title} style={s.rowCard} onPress={() => openPooja(item.title)}><Icon value={item.icon} photo={getPooja(item.title).deityImage} title={item.title} /><View style={s.grow}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardBody}>{item.detail}</Text></View><Text style={s.chevron}>›</Text></Pressable>)}
    <Section title="Today's Panchangam" link="Hyderabad" />
    <View style={s.panchangam}><Text style={s.panchangamTitle}>Bhadrapada Shukla Chavithi</Text><Text style={s.cardBody}>Nakshatram: Chitra · Rahu Kalam: 9:00–10:30</Text><View style={s.tags}><Text style={s.tag}>Sunrise 6:03</Text><Text style={s.tag}>Auspicious time</Text></View></View>
  </ScrollView>;
}


function Prepare({ go }: { go: (screen: Screen) => void }) {
  const session = React.useContext(SessionContext);
  const pooja = getPooja(session.title);
  const [checked, setChecked] = useState<boolean[]>(() => pooja.samagri.map(() => false));
  const count = checked.filter(Boolean).length;
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Prepare for Pooja" onBack={() => go('home')} /><View style={s.deity}>{pooja.deityImage ? <Image accessibilityLabel={`${pooja.title} deity photo`} source={pooja.deityImage} style={s.deityPhoto} resizeMode="cover" /> : <Text style={s.deityText}>🪔</Text>}</View>
    <Text style={s.centerTitle}>{pooja.title}</Text><Text style={s.centerBody}>{pooja.audio ? 'Poojari demo audio available' : pooja.samagri.length ? 'Samagri list ready · Recording being prepared' : 'Recording and Samagri are being prepared'}</Text>
    {pooja.samagri.length > 0 && <><View style={s.progress}><View style={[s.progressFill, { width: `${count / pooja.samagri.length * 100}%` }]} /></View><Section title="Samagri checklist" link={`${count} of ${checked.length} ready`} />
    {pooja.samagri.map((item, index) => <React.Fragment key={item.name}>{(index === 0 || item.group !== pooja.samagri[index - 1].group) && <Text style={s.samagriGroup}>{item.group}</Text>}<Pressable style={s.checkRow} onPress={() => setChecked(values => values.map((value, i) => i === index ? !value : value))}><View style={s.samagriPicture}>{item.image ? <Image source={item.image} style={s.samagriImage} /> : <Text style={s.samagriPictureText}>{item.illustration}</Text>}</View><View style={[s.checkbox, checked[index] && s.checkboxOn]}><Text style={s.checkmark}>{checked[index] ? '✓' : ''}</Text></View><Text style={s.checkText}>{item.name}</Text></Pressable></React.Fragment>)}</>}
    {pooja.samagri.length === 0 && <Text style={s.intro}>This Pooja’s Samagri list will appear here once it is added.</Text>}
    <Button label="Continue" onPress={() => go(pooja.audio ? 'payment' : 'guide')} />
  </ScrollView>;
}

function Payment({ go }: { go: (screen: Screen) => void }) {
  const [plan, setPlan] = useState<'single' | 'monthly'>('single');
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Unlock this Pooja" onBack={() => go('prepare')} /><View style={s.deity}><Text style={s.deityText}>🔊</Text></View>
    <Text style={s.centerTitle}>Poojari Audio Demo</Text><Text style={s.centerBody}>Listen to the Pooja recording. Personalized Sankalpam is planned for a later version.</Text>
    <Text style={s.price}>{plan === 'single' ? '₹49' : '₹79'}</Text><Text style={s.centerBody}>{plan === 'single' ? 'One-time purchase' : 'Monthly subscription'}</Text>
    <Pressable style={[s.plan, plan === 'single' && s.planSelected]} onPress={() => setPlan('single')}><View style={s.grow}><Text style={s.cardTitle}>This Pooja only</Text><Text style={s.cardBody}>Keep access in your account</Text></View><Text style={s.planPrice}>₹49</Text></Pressable>
    <Pressable style={[s.plan, plan === 'monthly' && s.planSelected]} onPress={() => setPlan('monthly')}><View style={s.grow}><Text style={s.cardTitle}>All Poojas for one month</Text><Text style={s.cardBody}>Daily, day based and festival Poojas</Text></View><Text style={s.planPrice}>₹79</Text></Pressable>
    <Button label="Unlock demo" onPress={() => go('guide')} /><Text style={s.note}>The MVP demo does not process a real payment</Text>
  </ScrollView>;
}

function Guide({ go, name, gotram }: { go: (screen: Screen) => void; name: string; gotram: string }) {
  const session = React.useContext(SessionContext);
  const pooja = getPooja(session.title);
  const [participants, setParticipants] = useState([{ id: 0, name, gotram }]);
  const nextId = React.useRef(1);
  const addParticipant = (participantName = '') => setParticipants(items => [...items, { id: nextId.current++, name: participantName, gotram }]);
  const player = useAudioPlayer(pooja.audio ?? null);
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState(1);
  const [progressWidth, setProgressWidth] = useState(1);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const subtitleIndex = pooja.subtitles.length && status.duration > 0
    ? Math.min(pooja.subtitles.length - 1, Math.floor(status.currentTime / (status.duration / pooja.subtitles.length)))
    : 0;
  const togglePoojaAudio = () => { if (pooja.audio) status.playing ? player.pause() : player.play(); };
  const setPlaybackSpeed = (value: number) => { setSpeed(value); player.setPlaybackRate(value); };
  const timeFromGesture = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    return Math.max(0, Math.min(status.duration, x / progressWidth * status.duration));
  };
  const startDrag = (event: GestureResponderEvent) => { if (status.duration > 0) setDragTime(timeFromGesture(event)); };
  const moveDrag = (event: GestureResponderEvent) => { if (status.duration > 0) setDragTime(timeFromGesture(event)); };
  const endDrag = (event: GestureResponderEvent) => {
    if (status.duration > 0) void player.seekTo(timeFromGesture(event));
    setDragTime(null);
  };
  const shownTime = dragTime ?? status.currentTime;
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title={session.title} onBack={() => go('services')} />
    <Text style={s.profileSectionTitle}>Pooja participants</Text>
    <Text style={s.intro}>Add everyone taking part in this Pooja.</Text>
    {participants.map(person => <View key={person.id} style={s.panchangam}>
      <TextInput accessibilityLabel="Participant name" placeholder="Participant name" value={person.name} style={s.input} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, name: value } : item))} />
      <TextInput accessibilityLabel="Participant Gotram" placeholder="Gotram (optional)" value={person.gotram} style={s.input} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, gotram: value } : item))} />
      <Pressable accessibilityLabel={`Remove ${person.name || 'participant'}`} onPress={() => setParticipants(items => items.filter(item => item.id !== person.id))}><Text style={s.sectionLink}>Remove participant</Text></Pressable>
    </View>)}
    {session.family.filter(member => member.trim() && !participants.some(p => p.name === member)).map((member, i) => <Button key={`${member}-${i}`} secondary label={`Add ${member}`} onPress={() => addParticipant(member)} />)}
    <Button secondary label="+ Add participant" onPress={() => addParticipant()} />
    <Text style={s.intro}>{pooja.audio ? 'Keep the Samagri ready and follow the complete Poojari audio.' : pooja.samagri.length ? 'Samagri list is ready. The Poojari recording is being prepared.' : 'The recording and Samagri for this Pooja are being prepared.'}</Text>
    <View style={s.poojaSession}>
      <View style={s.samagriPanel}><Text style={s.panelEyebrow}>POOJA SAMAGRI</Text>{pooja.samagri.length === 0 && <Text style={s.samagriMiniText}>List coming soon</Text>}{pooja.samagri.map((item, index) => <React.Fragment key={item.name}>{(index === 0 || item.group !== pooja.samagri[index - 1].group) && <Text style={s.samagriGroupMini}>{item.group}</Text>}<View style={s.samagriMiniRow}><View style={s.samagriPictureSmall}>{item.image ? <Image source={item.image} style={s.samagriImage} /> : <Text>{item.illustration}</Text>}</View><View style={s.samagriNumber}><Text style={s.samagriNumberText}>{index + 1}</Text></View><Text style={s.samagriMiniText}>{item.name}</Text></View></React.Fragment>)}</View>
      <View style={s.audioPanel}><Text style={s.panelEyebrow}>POOJARI AUDIO</Text>{pooja.deityImage ? <Image accessibilityLabel={`${pooja.title} deity photo`} source={pooja.deityImage} style={s.guideDeityPhoto} resizeMode="cover" /> : <Text style={s.audioOm}>ॐ</Text>}{pooja.audio ? <Pressable accessibilityLabel={status.playing ? 'Pause Pooja audio' : 'Play Pooja audio'} style={s.sessionPlay} onPress={togglePoojaAudio}><Text style={s.sessionPlayText}>{status.playing ? 'Ⅱ' : '▶'}</Text></Pressable> : <Text style={s.audioState}>Recording coming soon</Text>}{pooja.audio && <Text style={s.audioState}>{status.playing ? 'Playing' : 'Tap to listen'}</Text>}</View>
    </View>
    {pooja.audio && <><View accessibilityLabel="Drag to seek audio" onLayout={event => setProgressWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={startDrag} onResponderMove={moveDrag} onResponderRelease={endDrag} onResponderTerminate={() => setDragTime(null)} style={s.audioSeekArea}><View pointerEvents="none" style={s.audioProgress}><View style={[s.audioProgressFill, { width: `${status.duration > 0 ? Math.min(100, shownTime / status.duration * 100) : 0}%` }]} /></View></View>
    <View style={s.audioTimeRow}><Text style={s.audioTime}>{formatTime(shownTime)}</Text><Text style={s.audioTime}>{formatTime(status.duration)}</Text></View>
    <View style={s.speedRow}><Text style={s.speedLabel}>Speed</Text>{[0.75, 1, 1.25, 1.5].map(value => <Pressable key={value} onPress={() => setPlaybackSpeed(value)} style={[s.speedButton, speed === value && s.speedButtonActive]}><Text style={[s.speedButtonText, speed === value && s.speedButtonTextActive]}>{value}×</Text></Pressable>)}</View></>}
    {pooja.subtitles.length > 0 && <View style={s.subtitleCard}><Text style={s.subtitleLabel}>SUBTITLES · PREVIEW</Text><Text style={s.subtitleText}>{pooja.subtitles[subtitleIndex]}</Text></View>}
    <Text style={s.personalizedNote}>Participants: {participants.map(p => p.name.trim()).filter(Boolean).join(', ') || 'None selected'}</Text>
    {pooja.audio && <Text style={s.note}>Demo audio. Participant voice personalization is not connected yet.</Text>}
    {!pooja.audio && <Button label="Try Vinayaka Pooja demo" onPress={() => session.choose('Vinayaka Pooja')} />}
    <Button secondary={!pooja.audio} label={pooja.audio ? 'Complete Pooja' : 'Back to services'} onPress={() => { player.pause(); go(pooja.audio ? 'home' : 'services'); }} />
  </ScrollView>;
}

function Profile({ name, setName, gotram, setGotram, familyMembers, setFamilyMembers, go }: { name: string; setName: (x: string) => void; gotram: string; setGotram: (x: string) => void; familyMembers: string[]; setFamilyMembers: React.Dispatch<React.SetStateAction<string[]>>; go: (screen: Screen) => void }) {
  const session = React.useContext(SessionContext);
  const [newMember, setNewMember] = useState('');
  const addMember = () => {
    const member = newMember.trim();
    if (!member) return;
    setFamilyMembers(members => [...members, member]);
    setNewMember('');
  };
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Header title="Family Profile" />
    <Text style={s.profileSectionTitle}>Primary devotee</Text>
    <Text style={s.inputLabel}>NAME</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="Your name" />
    <Text style={s.inputLabel}>GOTRAM</Text><TextInput value={gotram} onChangeText={setGotram} style={s.input} placeholder="Your Gotram" />
    <Text style={s.inputLabel}>LOCATION</Text><TextInput defaultValue="Hyderabad, Telangana" style={s.input} />
    <View style={s.familyHeader}><View><Text style={s.profileSectionTitle}>Family members</Text><Text style={s.familyHelp}>Add every name to include in family Poojas</Text></View><View style={s.memberCount}><Text style={s.memberCountText}>{familyMembers.length}</Text></View></View>
    {familyMembers.length === 0 && <View style={s.emptyFamily}><Text style={s.emptyFamilyIcon}>♙</Text><Text style={s.emptyFamilyText}>No family members added yet</Text></View>}
    {familyMembers.map((member, index) => <View key={`${member}-${index}`} style={s.familyRow}><View style={s.familyAvatar}><Text style={s.familyAvatarText}>{member.trim().slice(0, 1).toUpperCase() || '?'}</Text></View><TextInput value={member} onChangeText={value => setFamilyMembers(members => members.map((item, itemIndex) => itemIndex === index ? value : item))} style={s.familyNameInput} placeholder="Family member name" /><Pressable style={s.removeMember} onPress={() => setFamilyMembers(members => members.filter((_, itemIndex) => itemIndex !== index))}><Text style={s.removeMemberText}>×</Text></Pressable></View>)}
    <View style={s.addFamilyRow}><TextInput value={newMember} onChangeText={setNewMember} onSubmitEditing={addMember} returnKeyType="done" style={s.addFamilyInput} placeholder="Enter family member name" placeholderTextColor="#A98D7E" /><Pressable style={s.addMemberButton} onPress={addMember}><Text style={s.addMemberButtonText}>+ Add</Text></Pressable></View>
    <View style={s.verified}><Text style={s.verifiedIcon}>✓</Text><View><Text style={s.cardTitle}>Your details</Text><Text style={s.cardBody}>Ready for future personalized audio</Text></View></View>
    <Button label="Listen to Vinayaka Pooja demo" onPress={() => { session.choose('Vinayaka Pooja'); go('guide'); }} />
  </ScrollView>;
}

function Nav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const items: { screen: Screen; icon: string; label: string }[] = [{ screen: 'home', icon: '⌂', label: 'Home' }, { screen: 'services', icon: '🪔', label: 'Services' }, { screen: 'calendar', icon: '▣', label: 'Calendar' }, { screen: 'profile', icon: '♙', label: 'Profile' }];
  return <View style={s.nav}>{items.map(item => <Pressable key={item.screen} style={s.navItem} onPress={() => go(item.screen)}><Text style={[s.navIcon, screen === item.screen && s.navActive]}>{item.icon}</Text><Text style={[s.navLabel, screen === item.screen && s.navActive]}>{item.label}</Text></Pressable>)}</View>;
}

export default function App() {
  const [poojaTitle, setPoojaTitle] = useState('Daily Pooja');
  const demoScreen = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('screen') as Screen | null : null;
  const [screen, setScreen] = useState<Screen>(demoScreen ?? 'login'); const [name, setName] = useState('Prashanth Kumar'); const [gotram, setGotram] = useState('Amarushi'); const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const omPlayer = useAudioPlayer(require('./assets/om-background.wav'));
  const omStatus = useAudioPlayerStatus(omPlayer);
  useEffect(() => { omPlayer.loop = true; omPlayer.volume = 0.22; }, [omPlayer]);
  const toggleOm = () => omStatus.playing ? omPlayer.pause() : omPlayer.play();
  let page = <Login onContinue={(nextName, nextGotram) => { setName(nextName); setGotram(nextGotram); setScreen('home'); }} />;
  if (screen === 'home') page = <Home go={setScreen} omPlaying={omStatus.playing} toggleOm={toggleOm} />;
  if (screen === 'services') page = <Services go={setScreen} />;
  if (screen === 'calendar') page = <Calendar />;
  if (screen === 'prepare') page = <Prepare go={setScreen} />;
  if (screen === 'payment') page = <Payment go={setScreen} />;
  if (screen === 'guide') page = <Guide key={poojaTitle} go={setScreen} name={name} gotram={gotram} />;
  if (screen === 'profile') page = <Profile go={setScreen} name={name} setName={setName} gotram={gotram} setGotram={setGotram} familyMembers={familyMembers} setFamilyMembers={setFamilyMembers} />;
  return <SessionContext.Provider value={{ title: poojaTitle, choose: setPoojaTitle, family: familyMembers }}><SafeAreaView style={s.safe}><StatusBar style="dark" /><View style={s.page}>{page}</View><Nav screen={screen} go={setScreen} /></SafeAreaView></SessionContext.Provider>;
}
