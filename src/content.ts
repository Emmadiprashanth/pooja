import { supabase } from './supabase';

export type PublishedPooja = {
  id: string;
  name: string;
  slug: string;
  category: 'daily' | 'day_wise' | 'festival' | 'special';
  weekday: string | null;
  language: string;
  description: string;
  deityName: string;
  imagePath: string | null;
  audioPath: string | null;
  imageUrl: string | null;
  visibilityStartsAt: string | null;
  visibilityEndsAt: string | null;
};

export type PublishedSamagri = {
  id: string;
  itemName: string;
  groupName: string;
  imagePath: string | null;
  imageUrl: string | null;
  displayOrder: number;
};

export type PublishedPoojaDetails = {
  pooja: PublishedPooja;
  samagri: PublishedSamagri[];
  audioUrl: string | null;
};

type PoojaRow = {
  id: string;
  name: string;
  slug: string;
  category: PublishedPooja['category'];
  weekday: string | null;
  language: string;
  description: string;
  deity_name: string;
  image_path: string | null;
  audio_path: string | null;
  visibility_starts_at: string | null;
  visibility_ends_at: string | null;
};

const visibleNow = (pooja: Pick<PoojaRow, 'visibility_starts_at' | 'visibility_ends_at'>) => {
  const now = Date.now();
  const starts = pooja.visibility_starts_at ? new Date(pooja.visibility_starts_at).getTime() : null;
  const ends = pooja.visibility_ends_at ? new Date(pooja.visibility_ends_at).getTime() : null;
  return (starts === null || starts <= now) && (ends === null || ends >= now);
};

const signedMediaUrl = async (bucket: 'pooja-images' | 'pooja-audio', path: string | null) => {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
};

const toPublishedPooja = async (row: PoojaRow): Promise<PublishedPooja> => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  category: row.category,
  weekday: row.weekday,
  language: row.language,
  description: row.description,
  deityName: row.deity_name,
  imagePath: row.image_path,
  audioPath: row.audio_path,
  imageUrl: await signedMediaUrl('pooja-images', row.image_path),
  visibilityStartsAt: row.visibility_starts_at,
  visibilityEndsAt: row.visibility_ends_at,
});

export async function loadPublishedPoojas(): Promise<PublishedPooja[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('poojas')
    .select('id, name, slug, category, weekday, language, description, deity_name, image_path, audio_path, visibility_starts_at, visibility_ends_at')
    .eq('is_published', true)
    .order('name');
  if (error) throw error;
  const visible = ((data ?? []) as PoojaRow[]).filter(visibleNow);
  return Promise.all(visible.map(toPublishedPooja));
}

export async function loadPublishedPoojaDetails(pooja: PublishedPooja): Promise<PublishedPoojaDetails> {
  if (!supabase) return { pooja, samagri: [], audioUrl: null };
  const { data, error } = await supabase
    .from('pooja_samagri')
    .select('id, item_name, group_name, image_path, display_order')
    .eq('pooja_id', pooja.id)
    .order('display_order');
  if (error) throw error;
  const samagri = await Promise.all((data ?? []).map(async item => ({
    id: item.id,
    itemName: item.item_name,
    groupName: item.group_name,
    imagePath: item.image_path,
    imageUrl: await signedMediaUrl('pooja-images', item.image_path),
    displayOrder: item.display_order,
  })));
  return {
    pooja,
    samagri,
    audioUrl: await signedMediaUrl('pooja-audio', pooja.audioPath),
  };
}
