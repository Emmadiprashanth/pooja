import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { dayWisePoojas, specialPoojas } from './src/data';
import { getPooja } from './src/poojas';
import { isSupabaseConfigured, supabase } from './src/supabase';
import { styles as s } from './src/theme';
import Calendar from './src/Calendar';
import CaptchaGate, { type CaptchaGateHandle } from './src/CaptchaGate';
import AdminPooja from './src/AdminPooja';

type Screen = 'login' | 'home' | 'services' | 'calendar' | 'prepare' | 'payment' | 'guide' | 'profile' | 'admin';
type LoginRegion = 'india' | 'international';
const brandLogo = require('./assets/branding/divya-pooja-full-logo-white-gold-512.png');
const SessionContext = React.createContext({ title: 'Daily Pooja', choose: (title: string) => {}, family: [] as string[] });

function suggestLoginRegion(): LoginRegion {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) return timeZone === 'Asia/Kolkata' ? 'india' : 'international';
    const locale = typeof navigator !== 'undefined' ? navigator.language : '';
    return /[-_]IN$/i.test(locale) ? 'india' : 'international';
  } catch {
    return 'india';
  }
}

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, pressed && s.pressed]}><Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text></Pressable>;
}

function Header({ title, onBack }: { title?: string; onBack?: () => void }) {
  return <View style={s.header}>
    {onBack ? <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable> : <View style={s.headerBrand}><Image accessibilityLabel="Divya Pooja — Your Pooja, Your Guide" source={brandLogo} style={s.headerBrandLogo} resizeMode="contain" /></View>}
    {onBack && <View style={s.headerCopy}><Text style={s.headerTitle}>{title}</Text></View>}
    <View style={s.avatar}><Text style={s.avatarText}>ॐ</Text></View>
  </View>;
}

function Login({ onDemoContinue }: { onDemoContinue: () => void }) {
  const captchaRef = useRef<CaptchaGateHandle>(null);
  const [register, setRegister] = useState(true);
  const [suggestedRegion] = useState<LoginRegion>(suggestLoginRegion);
  const [region, setRegion] = useState<LoginRegion>(suggestedRegion);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const captchaSiteKey = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY ?? '';
  const normalizedPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`;
  const otpLength = region === 'india' ? 6 : 8;
  const sendOtp = async () => {
    setMessage('');
    if (!isSupabaseConfigured || !supabase) {
      onDemoContinue();
      return;
    }
    if (region === 'india' && phone.replace(/\D/g, '').length !== 10) {
      setMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (region === 'international' && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (!captchaSiteKey) {
      setMessage('Security verification is not configured yet.');
      return;
    }
    setBusy(true);
    let captchaToken: string;
    try {
      captchaToken = await captchaRef.current!.execute();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : 'Verification failed. Please try again.');
      return;
    }
    const options = {
      shouldCreateUser: register,
      captchaToken,
    };
    const result = region === 'india'
      ? await supabase.auth.signInWithOtp({ phone: normalizedPhone, options })
      : await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setOtpSent(true);
    setMessage(region === 'india' ? `OTP sent to ${normalizedPhone}.` : `OTP sent to ${email.trim().toLowerCase()}.`);
  };
  const verifyOtp = async () => {
    setMessage('');
    if (!supabase || otp.trim().length !== otpLength) {
      setMessage(`Enter the ${otpLength}-digit OTP.`);
      return;
    }
    setBusy(true);
    const result = region === 'india'
      ? await supabase.auth.verifyOtp({ phone: normalizedPhone, token: otp.trim(), type: 'sms' })
      : await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: 'email' });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage('OTP verified. Signing you in…');
  };
  return <ScrollView contentContainerStyle={s.loginContent} keyboardShouldPersistTaps="handled">
    <View style={s.loginBrand}><Image accessibilityLabel="Divya Pooja — Your Pooja, Your Guide" source={brandLogo} style={s.loginLogoImage} resizeMode="contain" /></View>
    <View style={s.loginCard}><Text style={s.loginTitle}>{register ? 'Begin your Pooja journey' : 'Welcome back'}</Text><Text style={s.loginBody}>{isSupabaseConfigured ? 'Choose your region. We will send a one-time password—no password to remember.' : 'OTP authentication is ready. Connect Supabase to enable real accounts.'}</Text>
      {isSupabaseConfigured && <View style={s.authModeRow}><Pressable style={[s.authMode, region === 'india' && s.authModeActive]} onPress={() => { setRegion('india'); setOtpSent(false); setOtp(''); setMessage(''); }}><Text style={[s.authModeText, region === 'india' && s.authModeTextActive]}>🇮🇳 India</Text></Pressable><Pressable style={[s.authMode, region === 'international' && s.authModeActive]} onPress={() => { setRegion('international'); setOtpSent(false); setOtp(''); setMessage(''); }}><Text style={[s.authModeText, region === 'international' && s.authModeTextActive]}>🌍 International</Text></Pressable></View>}
      {isSupabaseConfigured && !otpSent && <Text style={s.note}>Suggested from this device: {suggestedRegion === 'india' ? 'India' : 'International'}. You can change it above.</Text>}
      {isSupabaseConfigured && !otpSent && region === 'india' && <><Text style={s.inputLabel}>MOBILE NUMBER</Text><View style={s.phoneRow}><View style={s.phonePrefix}><Text style={s.phonePrefixText}>+91</Text></View><TextInput value={phone} onChangeText={value => setPhone(value.replace(/\D/g, '').slice(0, 10))} style={s.phoneInput} placeholder="10-digit mobile number" keyboardType="phone-pad" textContentType="telephoneNumber" /></View></>}
      {isSupabaseConfigured && !otpSent && region === 'international' && <><Text style={s.inputLabel}>EMAIL</Text><TextInput value={email} onChangeText={setEmail} style={s.input} placeholder="you@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" /></>}
      {isSupabaseConfigured && otpSent && <><Text style={s.inputLabel}>ONE-TIME PASSWORD</Text><TextInput value={otp} onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, otpLength))} style={[s.input, s.otpInput]} placeholder={`${otpLength}-digit OTP`} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={otpLength} /><Pressable onPress={() => { setOtpSent(false); setOtp(''); setMessage(''); }}><Text style={s.loginSwitch}>Change {region === 'india' ? 'mobile number' : 'email address'}</Text></Pressable></>}
      {message ? <Text style={s.authMessage}>{message}</Text> : null}
      <Button label={busy ? 'Please wait…' : isSupabaseConfigured ? (otpSent ? 'Verify OTP' : 'Send OTP') : 'Continue local demo'} onPress={() => { if (!busy) void (otpSent ? verifyOtp() : sendOtp()); }} />
      {isSupabaseConfigured && !otpSent && <Pressable onPress={() => { setRegister(value => !value); setMessage(''); }}><Text style={s.loginSwitch}>{register ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></Pressable>}
      <Text style={s.note}>{isSupabaseConfigured ? (region === 'india' ? 'Indian users receive an SMS OTP on +91 mobile numbers.' : 'International users receive an OTP by email.') : 'Add the two EXPO_PUBLIC_SUPABASE values in .env to activate real login.'}</Text>
      {isSupabaseConfigured && captchaSiteKey ? <CaptchaGate ref={captchaRef} siteKey={captchaSiteKey} /> : null}
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

function Profile({ name, setName, gotram, setGotram, location, setLocation, familyMembers, setFamilyMembers, go, email, saving, saveMessage, onSave, onSignOut, isAdmin }: { name: string; setName: (x: string) => void; gotram: string; setGotram: (x: string) => void; location: string; setLocation: (x: string) => void; familyMembers: string[]; setFamilyMembers: React.Dispatch<React.SetStateAction<string[]>>; go: (screen: Screen) => void; email: string; saving: boolean; saveMessage: string; onSave: () => void; onSignOut: () => void; isAdmin: boolean }) {
  const session = React.useContext(SessionContext);
  const [newMember, setNewMember] = useState('');
  const addMember = () => {
    const member = newMember.trim();
    if (!member) return;
    setFamilyMembers(members => [...members, member]);
    setNewMember('');
  };
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Header title="Family Profile" />
    {email ? <Text style={s.signedInAs}>Signed in as {email}</Text> : null}
    <Text style={s.profileSectionTitle}>Primary devotee</Text>
    <Text style={s.inputLabel}>NAME</Text><TextInput value={name} onChangeText={setName} style={s.input} placeholder="Your name" />
    <Text style={s.inputLabel}>GOTRAM</Text><TextInput value={gotram} onChangeText={setGotram} style={s.input} placeholder="Your Gotram" />
    <Text style={s.inputLabel}>LOCATION</Text><TextInput value={location} onChangeText={setLocation} placeholder="City, State or Country" style={s.input} />
    <View style={s.familyHeader}><View><Text style={s.profileSectionTitle}>Family members</Text><Text style={s.familyHelp}>Add every name to include in family Poojas</Text></View><View style={s.memberCount}><Text style={s.memberCountText}>{familyMembers.length}</Text></View></View>
    {familyMembers.length === 0 && <View style={s.emptyFamily}><Text style={s.emptyFamilyIcon}>♙</Text><Text style={s.emptyFamilyText}>No family members added yet</Text></View>}
    {familyMembers.map((member, index) => <View key={`${member}-${index}`} style={s.familyRow}><View style={s.familyAvatar}><Text style={s.familyAvatarText}>{member.trim().slice(0, 1).toUpperCase() || '?'}</Text></View><TextInput value={member} onChangeText={value => setFamilyMembers(members => members.map((item, itemIndex) => itemIndex === index ? value : item))} style={s.familyNameInput} placeholder="Family member name" /><Pressable style={s.removeMember} onPress={() => setFamilyMembers(members => members.filter((_, itemIndex) => itemIndex !== index))}><Text style={s.removeMemberText}>×</Text></Pressable></View>)}
    <View style={s.addFamilyRow}><TextInput value={newMember} onChangeText={setNewMember} onSubmitEditing={addMember} returnKeyType="done" style={s.addFamilyInput} placeholder="Enter family member name" placeholderTextColor="#A98D7E" /><Pressable style={s.addMemberButton} onPress={addMember}><Text style={s.addMemberButtonText}>+ Add</Text></Pressable></View>
    <View style={s.verified}><Text style={s.verifiedIcon}>✓</Text><View><Text style={s.cardTitle}>Your details</Text><Text style={s.cardBody}>Ready for future personalized audio</Text></View></View>
    {saveMessage ? <Text style={s.authMessage}>{saveMessage}</Text> : null}
    <Button label={saving ? 'Saving…' : 'Save profile'} onPress={() => { if (!saving) onSave(); }} />
    <Button label="Listen to Vinayaka Pooja demo" onPress={() => { session.choose('Vinayaka Pooja'); go('guide'); }} />
    {isAdmin && <View style={s.adminProfileCard}><View style={s.grow}><Text style={s.cardTitle}>Pooja Content Studio</Text><Text style={s.cardBody}>Upload audio, images and Samagri, then schedule publication</Text></View><Pressable style={s.adminProfileButton} onPress={() => go('admin')}><Text style={s.adminProfileButtonText}>Open admin</Text></Pressable></View>}
    {isSupabaseConfigured && <Button secondary label="Sign out" onPress={onSignOut} />}
  </ScrollView>;
}

function Nav({ screen, go }: { screen: Screen; go: (screen: Screen) => void }) {
  const items: { screen: Screen; icon: string; label: string }[] = [{ screen: 'home', icon: '⌂', label: 'Home' }, { screen: 'services', icon: '🪔', label: 'Services' }, { screen: 'calendar', icon: '▣', label: 'Calendar' }, { screen: 'profile', icon: '♙', label: 'Profile' }];
  return <View style={s.nav}>{items.map(item => <Pressable key={item.screen} style={s.navItem} onPress={() => go(item.screen)}><Text style={[s.navIcon, screen === item.screen && s.navActive]}>{item.icon}</Text><Text style={[s.navLabel, screen === item.screen && s.navActive]}>{item.label}</Text></Pressable>)}</View>;
}

export default function App() {
  const [poojaTitle, setPoojaTitle] = useState('Daily Pooja');
  const demoScreen = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('screen') as Screen | null : null;
  const [screen, setScreen] = useState<Screen>('login');
  const [name, setName] = useState('');
  const [gotram, setGotram] = useState('');
  const [location, setLocation] = useState('Hyderabad, Telangana');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [authUserId, setAuthUserId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const omPlayer = useAudioPlayer(require('./assets/om-background.wav'));
  const omStatus = useAudioPlayerStatus(omPlayer);
  useEffect(() => { omPlayer.loop = true; omPlayer.volume = 0.22; }, [omPlayer]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const applyUser = async (user: { id: string; email?: string; phone?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;
      if (!user) {
        setAuthUserId('');
        setAuthEmail('');
        setIsAdmin(false);
        setFamilyMembers([]);
        setScreen('login');
        setAuthReady(true);
        return;
      }

      setAuthUserId(user.id);
      setAuthEmail(user.email ?? user.phone ?? '');
      const [{ data: profile }, { data: family }, { data: admin }] = await Promise.all([
        client.from('profiles').select('full_name, gotram, city').eq('id', user.id).maybeSingle(),
        client.from('family_members').select('full_name').eq('user_id', user.id).order('display_order'),
        client.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (!active) return;
      const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
      const metadataGotram = typeof user.user_metadata?.gotram === 'string' ? user.user_metadata.gotram : '';
      setName(profile?.full_name || metadataName || '');
      setGotram(profile?.gotram || metadataGotram || '');
      setLocation(profile?.city || 'Hyderabad, Telangana');
      setFamilyMembers((family ?? []).map(member => member.full_name));
      const adminAccess = Boolean(admin?.user_id);
      setIsAdmin(adminAccess);
      setScreen(demoScreen === 'admin' && !adminAccess ? 'home' : (demoScreen ?? 'home'));
      setAuthReady(true);
    };

    void client.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [demoScreen]);

  const toggleOm = () => omStatus.playing ? omPlayer.pause() : omPlayer.play();
  const saveProfile = async () => {
    setProfileMessage('');
    if (!supabase || !authUserId) {
      setProfileMessage('Local demo changes are saved only for this session.');
      return;
    }
    setProfileSaving(true);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authUserId,
      full_name: name.trim(),
      gotram: gotram.trim(),
      city: location.trim(),
    });
    const cleanFamily = familyMembers.map(member => member.trim()).filter(Boolean);
    const { error: familyError } = profileError
      ? { error: null }
      : await supabase.rpc('replace_family_members', { member_names: cleanFamily });
    setProfileSaving(false);
    const error = profileError ?? familyError;
    setProfileMessage(error ? error.message : 'Profile and family members saved securely.');
  };
  const signOut = async () => {
    if (!supabase) return;
    setProfileMessage('');
    await supabase.auth.signOut();
  };

  let page = <Login onDemoContinue={() => { setName(''); setGotram(''); setScreen(demoScreen ?? 'home'); }} />;
  if (!authReady) page = <View style={s.authLoading}><ActivityIndicator size="large" color="#96351F" /><Text style={s.loginBody}>Restoring your secure session…</Text></View>;
  if (screen === 'home') page = <Home go={setScreen} omPlaying={omStatus.playing} toggleOm={toggleOm} />;
  if (screen === 'services') page = <Services go={setScreen} />;
  if (screen === 'calendar') page = <Calendar />;
  if (screen === 'prepare') page = <Prepare go={setScreen} />;
  if (screen === 'payment') page = <Payment go={setScreen} />;
  if (screen === 'guide') page = <Guide key={poojaTitle} go={setScreen} name={name} gotram={gotram} />;
  if (screen === 'profile') page = <Profile go={setScreen} name={name} setName={setName} gotram={gotram} setGotram={setGotram} location={location} setLocation={setLocation} familyMembers={familyMembers} setFamilyMembers={setFamilyMembers} email={authEmail} saving={profileSaving} saveMessage={profileMessage} onSave={() => { void saveProfile(); }} onSignOut={() => { void signOut(); }} isAdmin={isAdmin} />;
  if (screen === 'admin') page = isAdmin ? <AdminPooja userId={authUserId} onBack={() => setScreen('profile')} /> : <View style={s.authLoading}><Text style={s.loginTitle}>Admin access required</Text><Text style={s.loginBody}>This page is available only to approved Divya Pooja administrators.</Text><Button label="Back to profile" onPress={() => setScreen('profile')} /></View>;
  const showNavigation = authReady && screen !== 'login';
  return <SessionContext.Provider value={{ title: poojaTitle, choose: setPoojaTitle, family: familyMembers }}><SafeAreaView style={s.safe}><StatusBar style="dark" /><View style={s.page}>{page}</View>{showNavigation && <Nav screen={screen} go={setScreen} />}</SafeAreaView></SessionContext.Provider>;
}
