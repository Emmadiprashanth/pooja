import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { dayWisePoojas, samagri, specialPoojas } from './src/data';
import { styles as s } from './src/theme';
import Calendar from './src/Calendar';

type Screen = 'home' | 'services' | 'calendar' | 'prepare' | 'payment' | 'guide' | 'profile';
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

function Section({ title, link }: { title: string; link: string }) {
  return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text><Text style={s.sectionLink}>{link}</Text></View>;
}

function Icon({ value }: { value: string }) { return <View style={s.icon}><Text style={s.iconText}>{value}</Text></View>; }

function PoojaCard({ icon, title, subtitle, highlighted, onPress }: { icon: string; title: string; subtitle: string; highlighted?: boolean; onPress: () => void }) {
  const session = React.useContext(SessionContext);
  return <Pressable style={[s.poojaCard, highlighted && s.highlight]} onPress={() => { session.choose(title); onPress(); }}>
    <Text style={s.emoji}>{icon}</Text><Text style={s.cardTitle}>{title}</Text><Text style={s.cardBody}>{subtitle}</Text>
    <View style={s.tags}><Text style={s.tag}>{title === 'Daily Pooja' ? '10 min' : '18 min'}</Text><Text style={s.tag}>{title === 'Daily Pooja' ? 'Free' : '🔊 Audio'}</Text></View>
  </Pressable>;
}

function Home({ go, omPlaying, toggleOm }: { go: (screen: Screen) => void; omPlaying: boolean; toggleOm: () => void }) {
  const [reminderOn, setReminderOn] = useState(true);
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header />
    <Text style={s.date}><Text style={s.dateStrong}>Saturday, 5 September</Text> · Bhadrapada Masam</Text>
    <View style={s.hero}>
      <Text style={s.eyebrow}>TODAY'S FESTIVAL</Text><Text style={s.heroTitle}>Vinayaka Chavithi</Text>
      <Text style={s.heroBody}>Complete English audio guidance from preparation to Harathi</Text>
      <Pressable style={s.heroButton} onPress={() => go('prepare')}><Text style={s.heroButtonText}>Start Pooja  →</Text></Pressable><Text style={s.om}>ॐ</Text>
    </View>
    <View style={s.quickControls}>
      <Pressable style={s.audioControl} onPress={toggleOm}><View style={s.controlIcon}><Text style={s.controlIconText}>ॐ</Text></View><View style={s.grow}><Text style={s.cardTitle}>Om ambience</Text><Text style={s.cardBody}>{omPlaying ? 'Playing softly in the background' : 'Tap to play background audio'}</Text></View><View style={[s.miniPlay, omPlaying && s.miniPlayOn]}><Text style={s.miniPlayText}>{omPlaying ? 'Ⅱ' : '▶'}</Text></View></Pressable>
      <View style={s.reminderCard}><View style={s.controlIcon}><Text style={s.controlIconText}>🔔</Text></View><View style={s.grow}><Text style={s.cardTitle}>Festival reminder</Text><Text style={s.cardBody}>Vinayaka Chavithi · Today, 7:00 AM</Text></View><Switch value={reminderOn} onValueChange={setReminderOn} trackColor={{ false: '#D9C8BC', true: '#E6A77D' }} thumbColor={reminderOn ? '#96351F' : '#FFFFFF'} /></View>
    </View>
    <Section title="Recommended today" link="Saturday" />
    <View style={s.columns}><PoojaCard icon="🪷" title="Sri Venkateswara Pooja" subtitle="Recommended for today" highlighted onPress={() => go('guide')} /><PoojaCard icon="🪔" title="Daily Pooja" subtitle="A simple daily practice" onPress={() => go('guide')} /></View>
    <Section title="Upcoming Pooja" link="View all" />
    <Pressable style={s.rowCard} onPress={() => go('services')}><Icon value="🌺" /><View style={s.grow}><Text style={s.cardTitle}>Varalakshmi Vratham</Text><Text style={s.cardBody}>Preparation checklist available three days before</Text></View><Text style={s.chevron}>›</Text></Pressable>
  </ScrollView>;
}

function Services({ go }: { go: (screen: Screen) => void }) {
  const session = React.useContext(SessionContext);
  const openPooja = (title: string) => { session.choose(title); go('guide'); };
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Pooja Services" /><Text style={s.intro}>Choose the Pooja you want to perform</Text>
    <Pressable style={s.featureCard} onPress={() => openPooja('Daily Pooja')}><Icon value="🪔" /><View style={s.grow}><Text style={s.cardTitle}>Daily Pooja</Text><Text style={s.cardBody}>Everyday audio guidance</Text></View><Text style={s.chevron}>›</Text></Pressable>
    <Section title="Day-wise Poojas" link="Monday–Sunday" />
    {dayWisePoojas.map(item => <Pressable key={item.day} style={s.compactRow} onPress={() => openPooja(item.title)}><Text style={s.dayBadge}>{item.day.slice(0, 3)}</Text><Text style={s.listEmoji}>{item.icon}</Text><Text style={s.listTitle}>{item.title}</Text><Text style={s.chevron}>›</Text></Pressable>)}
    <Section title="Special Poojas" link="Important Poojas" />
    {specialPoojas.map(item => <Pressable key={item.title} style={s.rowCard} onPress={() => openPooja(item.title)}><Icon value={item.icon} /><View style={s.grow}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.cardBody}>{item.detail}</Text></View><Text style={s.chevron}>›</Text></Pressable>)}
    <Section title="Today's Panchangam" link="Hyderabad" />
    <View style={s.panchangam}><Text style={s.panchangamTitle}>Bhadrapada Shukla Chavithi</Text><Text style={s.cardBody}>Nakshatram: Chitra · Rahu Kalam: 9:00–10:30</Text><View style={s.tags}><Text style={s.tag}>Sunrise 6:03</Text><Text style={s.tag}>Auspicious time</Text></View></View>
  </ScrollView>;
}


function Prepare({ go }: { go: (screen: Screen) => void }) {
  const session = React.useContext(SessionContext);
  useEffect(() => { session.choose('Vinayaka Chavithi Pooja'); }, []);
  const [checked, setChecked] = useState([true, true, true, false, false, false]);
  const count = checked.filter(Boolean).length;
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Prepare for Pooja" onBack={() => go('home')} /><View style={s.deity}><Text style={s.deityText}>🐘</Text></View>
    <Text style={s.centerTitle}>Vinayaka Chavithi Pooja</Text><Text style={s.centerBody}>About 35 minutes · Complete audio guidance</Text>
    <View style={s.progress}><View style={[s.progressFill, { width: `${Math.max(10, count / checked.length * 100)}%` }]} /></View><Section title="Samagri checklist" link={`${count} of ${checked.length} ready`} />
    {samagri.map((item, index) => <Pressable key={item} style={s.checkRow} onPress={() => setChecked(values => values.map((value, i) => i === index ? !value : value))}><View style={[s.checkbox, checked[index] && s.checkboxOn]}><Text style={s.checkmark}>{checked[index] ? '✓' : ''}</Text></View><Text style={s.checkText}>{item}</Text></Pressable>)}
    <Button label="Continue" onPress={() => go('payment')} />
  </ScrollView>;
}

function Payment({ go }: { go: (screen: Screen) => void }) {
  const [plan, setPlan] = useState<'single' | 'monthly'>('single');
  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Header title="Unlock this Pooja" onBack={() => go('prepare')} /><View style={s.deity}><Text style={s.deityText}>🔊</Text></View>
    <Text style={s.centerTitle}>Personalized Poojari Audio</Text><Text style={s.centerBody}>Your name and Gotram spoken naturally in the Sankalpam</Text>
    <Text style={s.price}>{plan === 'single' ? '₹49' : '₹79'}</Text><Text style={s.centerBody}>{plan === 'single' ? 'One-time purchase' : 'Monthly subscription'}</Text>
    <Pressable style={[s.plan, plan === 'single' && s.planSelected]} onPress={() => setPlan('single')}><View style={s.grow}><Text style={s.cardTitle}>This Pooja only</Text><Text style={s.cardBody}>Keep access in your account</Text></View><Text style={s.planPrice}>₹49</Text></Pressable>
    <Pressable style={[s.plan, plan === 'monthly' && s.planSelected]} onPress={() => setPlan('monthly')}><View style={s.grow}><Text style={s.cardTitle}>All Poojas for one month</Text><Text style={s.cardBody}>Daily, day based and festival Poojas</Text></View><Text style={s.planPrice}>₹79</Text></Pressable>
    <Button label="Unlock demo" onPress={() => go('guide')} /><Text style={s.note}>The MVP demo does not process a real payment</Text>
  </ScrollView>;
}

function Guide({ go, name, gotram }: { go: (screen: Screen) => void; name: string; gotram: string }) {
  const session = React.useContext(SessionContext);
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
    <Text style={s.intro}>Keep the Samagri ready and follow the complete Poojari audio.</Text>
    <View style={s.poojaSession}>
      <View style={s.samagriPanel}><Text style={s.panelEyebrow}>POOJA SAMAGRI</Text>{samagri.map((item, index) => <View key={item} style={s.samagriMiniRow}><View style={s.samagriNumber}><Text style={s.samagriNumberText}>{index + 1}</Text></View><Text style={s.samagriMiniText}>{item}</Text></View>)}</View>
      <View style={s.audioPanel}><Text style={s.panelEyebrow}>POOJARI AUDIO</Text><Text style={s.audioOm}>ॐ</Text><Pressable style={s.sessionPlay} onPress={togglePoojaAudio}><Text style={s.sessionPlayText}>{status.playing ? 'Ⅱ' : '▶'}</Text></Pressable><Text style={s.audioState}>{status.playing ? 'Playing' : 'Tap to listen'}</Text></View>
    </View>
    <View style={s.audioProgress}><View style={[s.audioProgressFill, { width: `${status.duration > 0 ? Math.min(100, status.currentTime / status.duration * 100) : 0}%` }]} /></View>
    <View style={s.subtitleCard}><Text style={s.subtitleLabel}>SUBTITLES</Text><Text style={s.subtitleText}>{subtitles[subtitleIndex]}</Text></View>
    <Text style={s.personalizedNote}>Participants: {participants.map(p => p.name.trim()).filter(Boolean).join(', ') || 'None selected'}</Text>
    <Text style={s.note}>Audio preview. Participant voice personalization is not connected yet.</Text>
    <Button label="Complete Pooja" onPress={() => { player.pause(); go('home'); }} />
  </ScrollView>;
}

function Profile({ name, setName, gotram, setGotram, familyMembers, setFamilyMembers, go }: { name: string; setName: (x: string) => void; gotram: string; setGotram: (x: string) => void; familyMembers: string[]; setFamilyMembers: React.Dispatch<React.SetStateAction<string[]>>; go: (screen: Screen) => void }) {
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
    <View style={s.verified}><Text style={s.verifiedIcon}>✓</Text><View><Text style={s.cardTitle}>Audio pronunciation</Text><Text style={s.cardBody}>Confirmed</Text></View></View>
    <Button label="Hear my personalized Sankalpam" onPress={() => go('guide')} />
  </ScrollView>;
}

function Nav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const items: { screen: Screen; icon: string; label: string }[] = [{ screen: 'home', icon: '⌂', label: 'Home' }, { screen: 'services', icon: '🪔', label: 'Services' }, { screen: 'calendar', icon: '▣', label: 'Calendar' }, { screen: 'profile', icon: '♙', label: 'Profile' }];
  return <View style={s.nav}>{items.map(item => <Pressable key={item.screen} style={s.navItem} onPress={() => go(item.screen)}><Text style={[s.navIcon, screen === item.screen && s.navActive]}>{item.icon}</Text><Text style={[s.navLabel, screen === item.screen && s.navActive]}>{item.label}</Text></Pressable>)}</View>;
}

export default function App() {
  const [poojaTitle, setPoojaTitle] = useState('Daily Pooja');
  const demoScreen = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('screen') as Screen | null : null;
  const [screen, setScreen] = useState<Screen>(demoScreen ?? 'home'); const [name, setName] = useState('Prashanth'); const [gotram, setGotram] = useState('Amararushi'); const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const omPlayer = useAudioPlayer(require('./assets/om-background.wav'));
  const omStatus = useAudioPlayerStatus(omPlayer);
  useEffect(() => { omPlayer.loop = true; omPlayer.volume = 0.22; }, [omPlayer]);
  const toggleOm = () => omStatus.playing ? omPlayer.pause() : omPlayer.play();
  let page = <Home go={setScreen} omPlaying={omStatus.playing} toggleOm={toggleOm} />;
  if (screen === 'services') page = <Services go={setScreen} />;
  if (screen === 'calendar') page = <Calendar />;
  if (screen === 'prepare') page = <Prepare go={setScreen} />;
  if (screen === 'payment') page = <Payment go={setScreen} />;
  if (screen === 'guide') page = <Guide key={poojaTitle} go={setScreen} name={name} gotram={gotram} />;
  if (screen === 'profile') page = <Profile go={setScreen} name={name} setName={setName} gotram={gotram} setGotram={setGotram} familyMembers={familyMembers} setFamilyMembers={setFamilyMembers} />;
  return <SessionContext.Provider value={{ title: poojaTitle, choose: setPoojaTitle, family: familyMembers }}><SafeAreaView style={s.safe}><StatusBar style="dark" /><View style={s.page}>{page}</View><Nav screen={screen} go={setScreen} /></SafeAreaView></SessionContext.Provider>;
}
