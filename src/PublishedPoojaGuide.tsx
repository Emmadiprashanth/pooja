import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { loadPublishedPoojaDetails, type PublishedPooja, type PublishedPoojaDetails } from './content';
import { styles as s } from './theme';

type Participant = { id: number; name: string; gotram: string };

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function PublishedPoojaGuide({ pooja, name, gotram, family, onBack, onComplete }: {
  pooja: PublishedPooja;
  name: string;
  gotram: string;
  family: string[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [details, setDetails] = useState<PublishedPoojaDetails | null>(null);
  const [message, setMessage] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([{ id: 0, name, gotram }]);
  const nextParticipantId = useRef(1);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState(1);
  const [progressWidth, setProgressWidth] = useState(1);
  const [dragTime, setDragTime] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setDetails(null);
    setMessage('');
    void loadPublishedPoojaDetails(pooja).then(result => {
      if (!active) return;
      setDetails(result);
      if (result.audioUrl) player.replace(result.audioUrl);
    }).catch(error => {
      if (active) setMessage(error instanceof Error ? error.message : 'Unable to load this Pooja.');
    });
    return () => {
      active = false;
      player.pause();
    };
  }, [player, pooja]);

  const addParticipant = (participantName = '') => setParticipants(items => [
    ...items,
    { id: nextParticipantId.current++, name: participantName, gotram },
  ]);
  const setPlaybackSpeed = (value: number) => {
    setSpeed(value);
    player.setPlaybackRate(value);
  };
  const timeFromGesture = (event: GestureResponderEvent) => Math.max(
    0,
    Math.min(status.duration, event.nativeEvent.locationX / progressWidth * status.duration),
  );
  const finishDrag = (event: GestureResponderEvent) => {
    if (status.duration > 0) void player.seekTo(timeFromGesture(event));
    setDragTime(null);
  };
  const shownTime = dragTime ?? status.currentTime;

  return <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={s.publishedHeader}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={s.grow}><Text style={s.headerTitle}>{pooja.name}</Text><Text style={s.publishedMeta}>{pooja.language}{pooja.weekday ? ` · ${pooja.weekday}` : ''}</Text></View></View>
    {pooja.imageUrl ? <Image source={{ uri: pooja.imageUrl }} accessibilityLabel={`${pooja.name} image`} style={s.publishedHeroImage} resizeMode="cover" /> : <View style={s.publishedHeroFallback}><Text style={s.audioOm}>ॐ</Text></View>}
    <Text style={s.centerTitle}>{pooja.name}</Text>
    {pooja.description ? <Text style={s.centerBody}>{pooja.description}</Text> : null}
    {pooja.deityName ? <Text style={s.publishedDeity}>{pooja.deityName}</Text> : null}

    <Text style={s.profileSectionTitle}>Pooja participants</Text>
    <Text style={s.intro}>Add everyone taking part in this Pooja.</Text>
    {participants.map(person => <View key={person.id} style={s.publishedParticipant}>
      <TextInput accessibilityLabel="Participant name" placeholder="Participant name" value={person.name} style={s.input} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, name: value } : item))} />
      <TextInput accessibilityLabel="Participant Gotram" placeholder="Gotram (optional)" value={person.gotram} style={s.input} onChangeText={value => setParticipants(items => items.map(item => item.id === person.id ? { ...item, gotram: value } : item))} />
      <Pressable onPress={() => setParticipants(items => items.filter(item => item.id !== person.id))}><Text style={s.sectionLink}>Remove participant</Text></Pressable>
    </View>)}
    {family.filter(member => member.trim() && !participants.some(person => person.name === member)).map((member, index) => <Pressable key={`${member}-${index}`} style={s.publishedAddButton} onPress={() => addParticipant(member)}><Text style={s.publishedAddButtonText}>+ Add {member}</Text></Pressable>)}
    <Pressable style={s.publishedAddButton} onPress={() => addParticipant()}><Text style={s.publishedAddButtonText}>+ Add participant</Text></Pressable>

    {!details && !message ? <View style={s.publishedLoading}><ActivityIndicator color="#96351F" /><Text style={s.cardBody}>Loading Pooja…</Text></View> : null}
    {message ? <Text style={s.authMessage}>{message}</Text> : null}
    {details ? <View style={s.poojaSession}>
      <View style={s.samagriPanel}><Text style={s.panelEyebrow}>POOJA SAMAGRI</Text>
        {details.samagri.length === 0 ? <Text style={s.samagriMiniText}>List coming soon</Text> : null}
        {details.samagri.map((item, index) => <React.Fragment key={item.id}>
          {(index === 0 || item.groupName !== details.samagri[index - 1].groupName) ? <Text style={s.samagriGroupMini}>{item.groupName}</Text> : null}
          <View style={s.samagriMiniRow}><View style={s.samagriPictureSmall}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={s.samagriImage} /> : <Text>🪷</Text>}</View><View style={s.samagriNumber}><Text style={s.samagriNumberText}>{index + 1}</Text></View><Text style={s.samagriMiniText}>{item.itemName}</Text></View>
        </React.Fragment>)}
      </View>
      <View style={s.audioPanel}><Text style={s.panelEyebrow}>POOJARI AUDIO</Text>{pooja.imageUrl ? <Image source={{ uri: pooja.imageUrl }} style={s.guideDeityPhoto} resizeMode="cover" /> : <Text style={s.audioOm}>ॐ</Text>}
        {details.audioUrl ? <Pressable accessibilityLabel={status.playing ? 'Pause Pooja audio' : 'Play Pooja audio'} style={s.sessionPlay} onPress={() => status.playing ? player.pause() : player.play()}><Text style={s.sessionPlayText}>{status.playing ? 'Ⅱ' : '▶'}</Text></Pressable> : <Text style={s.audioState}>Recording coming soon</Text>}
        {details.audioUrl ? <Text style={s.audioState}>{status.isBuffering ? 'Loading audio…' : status.playing ? 'Playing' : 'Tap to listen'}</Text> : null}
      </View>
    </View> : null}
    {details?.audioUrl ? <>
      <View accessibilityLabel="Drag to seek audio" onLayout={event => setProgressWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={event => setDragTime(timeFromGesture(event))} onResponderMove={event => setDragTime(timeFromGesture(event))} onResponderRelease={finishDrag} onResponderTerminate={() => setDragTime(null)} style={s.audioSeekArea}><View pointerEvents="none" style={s.audioProgress}><View style={[s.audioProgressFill, { width: `${status.duration > 0 ? Math.min(100, shownTime / status.duration * 100) : 0}%` }]} /></View></View>
      <View style={s.audioTimeRow}><Text style={s.audioTime}>{formatTime(shownTime)}</Text><Text style={s.audioTime}>{formatTime(status.duration)}</Text></View>
      <View style={s.speedRow}><Text style={s.speedLabel}>Speed</Text>{[0.75, 1, 1.25, 1.5].map(value => <Pressable key={value} onPress={() => setPlaybackSpeed(value)} style={[s.speedButton, speed === value && s.speedButtonActive]}><Text style={[s.speedButtonText, speed === value && s.speedButtonTextActive]}>{value}×</Text></Pressable>)}</View>
    </> : null}
    <Text style={s.personalizedNote}>Participants: {participants.map(person => person.name.trim()).filter(Boolean).join(', ') || 'None selected'}</Text>
    <Pressable style={s.adminSaveButton} onPress={() => { player.pause(); onComplete(); }}><Text style={s.adminSaveButtonText}>Complete Pooja</Text></Pressable>
  </ScrollView>;
}
