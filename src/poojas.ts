import { dayWisePoojas, specialPoojas, vinayakaPooja } from './data';

export type SamagriItem = { name: string; group: string; illustration: string; image?: number };
export type PoojaRecord = {
  id: string;
  title: string;
  category: 'daily' | 'day-wise' | 'festival' | 'special';
  day?: string;
  deityImage?: number;
  samagri: SamagriItem[];
  audio?: number;
  subtitles: string[];
};

export const commonSamagri: SamagriItem[] = [
  { group: 'Purification & setup', name: 'Pasupu (turmeric)', illustration: '🟡' },
  { group: 'Purification & setup', name: 'Kumkuma (vermillion)', illustration: '🔴' },
  { group: 'Purification & setup', name: 'Gandham (sandalwood paste)', illustration: '🥣' },
  { group: 'Purification & setup', name: 'Akshintalu (yellow rice)', illustration: '🌾' },
  { group: 'Purification & setup', name: 'Panchapatra with Uddharini (water vessel & spoon)', illustration: '🥄' },
  { group: 'Deeparadhana', name: 'Brass or silver lamp', illustration: '🪔' },
  { group: 'Deeparadhana', name: 'Patti Vattulu (cotton wicks)', illustration: '🧵' },
  { group: 'Deeparadhana', name: 'Nuvvula Nune (sesame oil) or Aavu Neyyi (cow ghee)', illustration: '🫙' },
  { group: 'Aromatics', name: 'Agarbattilu (incense sticks) with stand', illustration: '🕯️' },
  { group: 'Aromatics', name: 'Karpuramu (camphor) for Haarati', illustration: '🔥' },
  { group: 'Aromatics', name: 'Sambrani (dhoop)', illustration: '💨' },
  { group: 'Common offerings', name: 'Tamalapakulu (betel leaves)', illustration: '🍃' },
  { group: 'Common offerings', name: 'Vakkalu (betel nuts)', illustration: '🟤' },
  { group: 'Common offerings', name: 'Arati pandlu (bananas)', illustration: '🍌' },
  { group: 'Common offerings', name: 'Fresh flowers', illustration: '🌸' },
];

const vinayakaItems: SamagriItem[] = [
  ...commonSamagri,
  { group: 'Vinayaka extras', name: 'Ganesh photo or small deity', illustration: '🛕', image: require('../assets/deities/ganesh.png') },
  { group: 'Vinayaka extras', name: 'Fruits or dates', illustration: '🍎' },
  { group: 'Vinayaka extras', name: 'Second Panchapatra (two total)', illustration: '🥣' },
  { group: 'Vinayaka extras', name: 'Second Deepam (two total)', illustration: '🪔' },
  { group: 'Vinayaka extras', name: 'Ganta (bell)', illustration: '🔔' },
];

const deityImages: Record<string, number> = {
  'Vinayaka Pooja': require('../assets/deities/ganesh.png'),
  'Vinayaka Chavithi Pooja': require('../assets/deities/ganesh.png'),
  'Lord Shiva Pooja': require('../assets/deities/shiva.png'),
  'Lord Hanuman Pooja': require('../assets/deities/hanuman.png'),
  'Lord Vishnu Pooja': require('../assets/deities/vishnu.png'),
  'Lakshmi Devi Pooja': require('../assets/deities/lakshmi.png'),
  'Sri Venkateswara Swamy Pooja': require('../assets/deities/venkateshwara.png'),
  'Surya Narayana Pooja': require('../assets/deities/surya.png'),
  'Satyanarayana Swamy Vratham': require('../assets/deities/vishnu.png'),
  'Varalakshmi Vratham': require('../assets/deities/lakshmi.png'),
  'Lakshmi Kubera Pooja': require('../assets/deities/lakshmi.png'),
};

// Add new recordings here with their own Samagri and subtitles. An absent audio
// source keeps an unrecorded Pooja in the catalog without playing another Pooja's MP3.
export const poojas: PoojaRecord[] = [
  {
    id: 'vinayaka-wednesday',
    title: vinayakaPooja.title,
    category: 'day-wise',
    day: vinayakaPooja.day,
    deityImage: deityImages[vinayakaPooja.title],
    samagri: vinayakaItems,
    audio: require('../assets/vinayaka-pooja-demo.mp3'),
    subtitles: vinayakaPooja.subtitles,
  },
  { id: 'daily', title: 'Daily Pooja', category: 'daily', samagri: commonSamagri, subtitles: [] },
  ...dayWisePoojas.filter(item => item.title !== vinayakaPooja.title).map(item => ({
    id: `day-${item.day.toLowerCase()}`,
    title: item.title,
    category: 'day-wise' as const,
    day: item.day,
    deityImage: deityImages[item.title],
    samagri: commonSamagri,
    subtitles: [],
  })),
  ...specialPoojas.map(item => ({
    id: `special-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: item.title,
    category: item.title === 'Vinayaka Chavithi Pooja' ? 'festival' as const : 'special' as const,
    deityImage: deityImages[item.title],
    samagri: [],
    subtitles: [],
  })),
];

export const getPooja = (title: string): PoojaRecord => poojas.find(item => item.title === title) ?? {
  id: 'unlisted', title, category: 'special', samagri: [], subtitles: [],
};
