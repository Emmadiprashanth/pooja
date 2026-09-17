import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { supabase } from './supabase';
import { styles as s } from './theme';

type PoojaCategory = 'daily' | 'day_wise' | 'festival' | 'special';

type PoojaRecord = {
  id: string;
  name: string;
  slug: string;
  category: PoojaCategory;
  weekday: string | null;
  language: string;
  description: string;
  deity_name: string;
  image_path: string | null;
  audio_path: string | null;
  visibility_starts_at: string | null;
  visibility_ends_at: string | null;
  is_published: boolean;
};

type SamagriDraft = {
  key: string;
  item_name: string;
  group_name: string;
  image_path: string | null;
};

type PoojaDraft = Omit<PoojaRecord, 'id' | 'visibility_starts_at' | 'visibility_ends_at'> & {
  id: string | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

const categories: { value: PoojaCategory; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'day_wise', label: 'Day-wise' },
  { value: 'festival', label: 'Festival' },
  { value: 'special', label: 'Special' },
];
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const languages = ['Telugu', 'English'];

const blankPooja = (): PoojaDraft => ({
  id: null,
  name: '',
  slug: '',
  category: 'daily',
  weekday: null,
  language: 'Telugu',
  description: '',
  deity_name: '',
  image_path: null,
  audio_path: null,
  startDate: '',
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
  is_published: false,
});

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const splitLocalDateTime = (value: string | null, defaultTime: string) => {
  if (!value) return { date: '', time: defaultTime };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: defaultTime };
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
};

const toIso = (date: string, time: string) => {
  if (!date) return null;
  const parsed = new Date(`${date}T${time || '00:00'}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const fileLabel = (path: string | null) => path?.split('/').pop() ?? '';

function ChoiceRow({ values, selected, onSelect }: { values: string[]; selected: string | null; onSelect: (value: string) => void }) {
  return <View style={s.adminChoiceRow}>{values.map(value => <Pressable key={value} onPress={() => onSelect(value)} style={[s.adminChoice, selected === value && s.adminChoiceActive]}><Text style={[s.adminChoiceText, selected === value && s.adminChoiceTextActive]}>{value}</Text></Pressable>)}</View>;
}

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={s.adminField}><Text style={s.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A98D7E" multiline={multiline} style={[s.input, multiline && s.adminTextArea]} /></View>;
}

export default function AdminPooja({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [poojas, setPoojas] = useState<PoojaRecord[]>([]);
  const [draft, setDraft] = useState<PoojaDraft>(blankPooja);
  const [samagri, setSamagri] = useState<SamagriDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');

  const loadPoojas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('poojas').select('*').order('updated_at', { ascending: false });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setPoojas((data ?? []) as PoojaRecord[]);
  }, []);

  useEffect(() => { void loadPoojas(); }, [loadPoojas]);

  const startNew = () => {
    setDraft(blankPooja());
    setSamagri([]);
    setMessage('New Pooja draft ready.');
  };

  const editPooja = async (pooja: PoojaRecord) => {
    if (!supabase) return;
    const start = splitLocalDateTime(pooja.visibility_starts_at, '00:00');
    const end = splitLocalDateTime(pooja.visibility_ends_at, '23:59');
    setDraft({
      ...pooja,
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
    });
    setMessage('Loading Samagri…');
    const { data, error } = await supabase.from('pooja_samagri').select('id, item_name, group_name, image_path').eq('pooja_id', pooja.id).order('display_order');
    if (error) {
      setMessage(error.message);
      return;
    }
    setSamagri((data ?? []).map(item => ({ key: item.id, item_name: item.item_name, group_name: item.group_name, image_path: item.image_path })));
    setMessage('Editing saved Pooja.');
  };

  const pickAndUpload = async (kind: 'image' | 'audio', onUploaded: (path: string) => void) => {
    if (!supabase || !userId) return;
    setMessage('');
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === 'image' ? 'image/*' : 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const limit = kind === 'audio' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (asset.size && asset.size > limit) {
      setMessage(kind === 'audio' ? 'Audio must be 100 MB or smaller.' : 'Image must be 10 MB or smaller.');
      return;
    }
    setUploading(kind);
    try {
      const response = await fetch(asset.uri);
      const body = await response.arrayBuffer();
      const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${userId}/${Date.now()}-${safeName}`;
      const bucket = kind === 'image' ? 'pooja-images' : 'pooja-audio';
      const { error } = await supabase.storage.from(bucket).upload(path, body, {
        contentType: asset.mimeType ?? (kind === 'image' ? 'image/jpeg' : 'audio/mpeg'),
        upsert: false,
      });
      if (error) throw error;
      onUploaded(path);
      setMessage(`${kind === 'image' ? 'Image' : 'Audio'} uploaded. Save the Pooja to attach it.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setUploading('');
    }
  };

  const addSamagri = () => setSamagri(items => [...items, { key: `new-${Date.now()}-${items.length}`, item_name: '', group_name: 'Common offerings', image_path: null }]);

  const save = async () => {
    if (!supabase || saving) return;
    const name = draft.name.trim();
    const slug = slugify(draft.slug || draft.name);
    if (!name || !slug) {
      setMessage('Pooja name and slug are required.');
      return;
    }
    const startsAt = toIso(draft.startDate, draft.startTime);
    const endsAt = toIso(draft.endDate, draft.endTime);
    if (startsAt === undefined || endsAt === undefined) {
      setMessage('Use dates in YYYY-MM-DD format and time in HH:MM format.');
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setMessage('Visibility end must be after the start.');
      return;
    }
    setSaving(true);
    setMessage('Saving Pooja…');
    const payload = {
      name,
      slug,
      category: draft.category,
      weekday: draft.category === 'day_wise' ? draft.weekday : null,
      language: draft.language,
      description: draft.description.trim(),
      deity_name: draft.deity_name.trim(),
      image_path: draft.image_path,
      audio_path: draft.audio_path,
      visibility_starts_at: startsAt,
      visibility_ends_at: endsAt,
      is_published: draft.is_published,
      updated_by: userId,
      ...(draft.id ? {} : { created_by: userId }),
    };
    const query = draft.id
      ? supabase.from('poojas').update(payload).eq('id', draft.id).select().single()
      : supabase.from('poojas').insert(payload).select().single();
    const { data: saved, error } = await query;
    if (error || !saved) {
      setSaving(false);
      setMessage(error?.message ?? 'Unable to save the Pooja.');
      return;
    }
    const cleanItems = samagri.filter(item => item.item_name.trim());
    const { error: deleteError } = await supabase.from('pooja_samagri').delete().eq('pooja_id', saved.id);
    const { error: insertError } = deleteError || cleanItems.length === 0
      ? { error: null }
      : await supabase.from('pooja_samagri').insert(cleanItems.map((item, index) => ({
        pooja_id: saved.id,
        item_name: item.item_name.trim(),
        group_name: item.group_name.trim() || 'Samagri',
        image_path: item.image_path,
        display_order: index,
      })));
    setSaving(false);
    if (deleteError || insertError) {
      setMessage((deleteError ?? insertError)?.message ?? 'Pooja saved, but Samagri could not be updated.');
      return;
    }
    setDraft(current => ({ ...current, id: saved.id, slug }));
    setMessage(draft.is_published ? 'Pooja saved and published.' : 'Draft saved. Only admins can see it.');
    await loadPoojas();
  };

  return <ScrollView contentContainerStyle={s.adminContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={s.adminHeader}><Pressable onPress={onBack} style={s.back}><Text style={s.backText}>‹</Text></Pressable><View style={s.grow}><Text style={s.adminTitle}>Pooja Content Studio</Text><Text style={s.adminSubtitle}>Create, schedule and publish guided Poojas</Text></View><Pressable style={s.adminNewButton} onPress={startNew}><Text style={s.adminNewButtonText}>+ New Pooja</Text></Pressable></View>
    {message ? <View style={s.adminNotice}><Text style={s.adminNoticeText}>{message}</Text></View> : null}
    <View style={[s.adminWorkspace, wide && s.adminWorkspaceWide]}>
      <View style={[s.adminLibrary, wide && s.adminLibraryWide]}><Text style={s.adminSectionTitle}>Pooja library</Text><Text style={s.adminHelp}>{poojas.length} saved Poojas</Text>
        {loading ? <ActivityIndicator color="#96351F" style={s.adminLoader} /> : poojas.length === 0 ? <View style={s.adminEmpty}><Text style={s.adminEmptyIcon}>🪔</Text><Text style={s.adminHelp}>No Poojas added yet</Text></View> : poojas.map(pooja => <Pressable key={pooja.id} onPress={() => void editPooja(pooja)} style={[s.adminPoojaRow, draft.id === pooja.id && s.adminPoojaRowActive]}><View style={[s.adminStatusDot, pooja.is_published && s.adminStatusDotLive]} /><View style={s.grow}><Text style={s.cardTitle}>{pooja.name}</Text><Text style={s.adminMeta}>{categories.find(item => item.value === pooja.category)?.label} · {pooja.language}</Text></View><Text style={[s.adminStatus, pooja.is_published && s.adminStatusLive]}>{pooja.is_published ? 'Published' : 'Draft'}</Text><Text style={s.chevron}>›</Text></Pressable>)}
      </View>
      <View style={s.adminEditor}><View style={s.adminEditorHeading}><View style={s.grow}><Text style={s.adminSectionTitle}>{draft.id ? 'Edit Pooja' : 'Add a Pooja'}</Text><Text style={s.adminHelp}>{draft.is_published ? 'Visible to customers within its schedule' : 'Saved as an admin-only draft'}</Text></View><View style={s.adminPublishRow}><Text style={s.adminPublishLabel}>{draft.is_published ? 'Published' : 'Draft'}</Text><Switch value={draft.is_published} onValueChange={value => setDraft(current => ({ ...current, is_published: value }))} trackColor={{ false: '#D9C8BC', true: '#E6A77D' }} thumbColor={draft.is_published ? '#96351F' : '#FFFFFF'} /></View></View>
        <View style={[s.adminFormRow, wide && s.adminFormRowWide]}><Field label="POOJA NAME" value={draft.name} onChangeText={value => setDraft(current => ({ ...current, name: value, slug: current.id ? current.slug : slugify(value) }))} placeholder="Example: Vinayaka Chavithi Pooja" /><Field label="URL SLUG" value={draft.slug} onChangeText={value => setDraft(current => ({ ...current, slug: slugify(value) }))} placeholder="vinayaka-chavithi-pooja" /></View>
        <Text style={s.inputLabel}>TYPE</Text><ChoiceRow values={categories.map(item => item.label)} selected={categories.find(item => item.value === draft.category)?.label ?? null} onSelect={label => setDraft(current => ({ ...current, category: categories.find(item => item.label === label)!.value }))} />
        {draft.category === 'day_wise' && <><Text style={s.inputLabel}>DAY OF THE WEEK</Text><ChoiceRow values={weekdays} selected={draft.weekday} onSelect={weekday => setDraft(current => ({ ...current, weekday }))} /></>}
        <Text style={s.inputLabel}>LANGUAGE</Text><ChoiceRow values={languages} selected={draft.language} onSelect={language => setDraft(current => ({ ...current, language }))} />
        <View style={[s.adminFormRow, wide && s.adminFormRowWide]}><Field label="DEITY" value={draft.deity_name} onChangeText={value => setDraft(current => ({ ...current, deity_name: value }))} placeholder="Lord Ganesha" /><Field label="SHORT DESCRIPTION" value={draft.description} onChangeText={value => setDraft(current => ({ ...current, description: value }))} placeholder="Shown on the Services page" multiline /></View>
        <View style={[s.adminUploadGrid, wide && s.adminFormRowWide]}><View style={s.adminUploadCard}><Text style={s.adminUploadIcon}>▧</Text><Text style={s.cardTitle}>Pooja image</Text><Text style={s.adminHelp}>{fileLabel(draft.image_path) || 'PNG or JPG · up to 10 MB'}</Text><Pressable disabled={Boolean(uploading)} style={s.adminUploadButton} onPress={() => void pickAndUpload('image', path => setDraft(current => ({ ...current, image_path: path })))}><Text style={s.adminUploadButtonText}>{uploading === 'image' ? 'Uploading…' : draft.image_path ? 'Replace image' : 'Choose image'}</Text></Pressable></View><View style={s.adminUploadCard}><Text style={s.adminUploadIcon}>♫</Text><Text style={s.cardTitle}>Poojari audio</Text><Text style={s.adminHelp}>{fileLabel(draft.audio_path) || 'MP3 or audio · up to 100 MB'}</Text><Pressable disabled={Boolean(uploading)} style={s.adminUploadButton} onPress={() => void pickAndUpload('audio', path => setDraft(current => ({ ...current, audio_path: path })))}><Text style={s.adminUploadButtonText}>{uploading === 'audio' ? 'Uploading…' : draft.audio_path ? 'Replace audio' : 'Choose audio'}</Text></Pressable></View></View>
        <View style={s.adminSectionHeader}><View><Text style={s.adminSectionTitle}>Samagri</Text><Text style={s.adminHelp}>Add each item and an optional reference picture</Text></View><Pressable style={s.adminSmallButton} onPress={addSamagri}><Text style={s.adminSmallButtonText}>+ Add item</Text></Pressable></View>
        {samagri.length === 0 && <View style={s.adminEmpty}><Text style={s.adminEmptyIcon}>◌</Text><Text style={s.adminHelp}>Add the first Samagri item</Text></View>}
        {samagri.map((item, index) => <View key={item.key} style={s.adminSamagriRow}><View style={s.adminOrder}><Text style={s.adminOrderText}>{index + 1}</Text></View><View style={s.grow}><TextInput value={item.item_name} onChangeText={value => setSamagri(items => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, item_name: value } : entry))} style={s.adminInlineInput} placeholder="Item name" placeholderTextColor="#A98D7E" /><TextInput value={item.group_name} onChangeText={value => setSamagri(items => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, group_name: value } : entry))} style={s.adminInlineInputSmall} placeholder="Group" placeholderTextColor="#A98D7E" /></View><Pressable disabled={Boolean(uploading)} style={s.adminIconButton} onPress={() => void pickAndUpload('image', path => setSamagri(items => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, image_path: path } : entry)))}><Text style={s.adminIconButtonText}>{item.image_path ? '✓ Photo' : '+ Photo'}</Text></Pressable><Pressable style={s.removeMember} onPress={() => setSamagri(items => items.filter((_, itemIndex) => itemIndex !== index))}><Text style={s.removeMemberText}>×</Text></Pressable></View>)}
        <View style={s.adminSectionHeader}><View><Text style={s.adminSectionTitle}>Festival visibility</Text><Text style={s.adminHelp}>Optional · dates use your device’s local time</Text></View></View>
        <View style={[s.adminScheduleGrid, wide && s.adminFormRowWide]}><View style={s.adminScheduleCard}><Text style={s.inputLabel}>SHOW FROM</Text><View style={s.adminDateRow}><TextInput value={draft.startDate} onChangeText={value => setDraft(current => ({ ...current, startDate: value }))} style={[s.input, s.adminDateInput]} placeholder="YYYY-MM-DD" /><TextInput value={draft.startTime} onChangeText={value => setDraft(current => ({ ...current, startTime: value }))} style={[s.input, s.adminTimeInput]} placeholder="HH:MM" /></View></View><View style={s.adminScheduleCard}><Text style={s.inputLabel}>HIDE AFTER</Text><View style={s.adminDateRow}><TextInput value={draft.endDate} onChangeText={value => setDraft(current => ({ ...current, endDate: value }))} style={[s.input, s.adminDateInput]} placeholder="YYYY-MM-DD" /><TextInput value={draft.endTime} onChangeText={value => setDraft(current => ({ ...current, endTime: value }))} style={[s.input, s.adminTimeInput]} placeholder="HH:MM" /></View></View></View>
        <Pressable disabled={saving || Boolean(uploading)} style={[s.adminSaveButton, (saving || Boolean(uploading)) && s.adminButtonDisabled]} onPress={() => void save()}><Text style={s.adminSaveButtonText}>{saving ? 'Saving…' : draft.is_published ? 'Save & publish' : 'Save draft'}</Text></Pressable>
      </View>
    </View>
  </ScrollView>;
}
