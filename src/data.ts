export const samagri = [
  'Photo or small deity',
  'Akshatas',
  'Flowers',
  'Fruits or dates',
  'Two Panchapatras',
  'Deepam (2)',
  'Agarbatti',
  'Aarathi',
  'Ganta',
];

// Each Pooja can provide its own picture for the same Samagri slot.
// These lightweight illustrations are used in the local MVP and can be
// replaced with bundled JPG/PNG assets when the final photo set is ready.
export const samagriIllustrations = ['🛕', '🌾', '🌸', '🍎', '🥣', '🪔', '🕯️', '🔥', '🔔'];

export const vinayakaPooja = {
  title: 'Vinayaka Pooja',
  day: 'Wednesday',
  participant: '',
  gotram: '',
  subtitles: [
    'Maarjanamu: Om apavitrah pavitrovaa sarvaavasthaam gato pivaa yah smaret Pundareekaaksham sabaahyaabhyantara shuchih.',
    'Ganapati / Guru Praarthana: Shuklaambaradharam Vishnum… sarva vighnopashaantaye.',
    'Deepaaraadhana: Deepatvam brahmarooposi jyotishaam prabhuravyayah…',
    'Aachamanamu: Keshavaaya namah, Naaraayanaaya namah, Maadhavaaya namah, Govindaaya namah.',
    'Bhootocchaatana and Praanaayaamamu: Uthishthantu bhoota-pishaachaah… praanayaama idam proktam.',
    'Sankalpamu: Sri Vinaayaka devataam uddishya yaavachchhakti poojaam karishye.',
    'Panchopachaara Pooja and Ganapati Stuti: Pranamya shirasa devam… aayuh kaamaartha siddhaye.',
    'Dhoopam, Deepam, Naivedyam and Neeraajanam: Sri Mahaaganaadhipataye namah samarpayaami.',
    'Mangalam: Lokah samastaah sukhino bhavantu. Pooja complete.',
  ],
};

export const poojaSteps = [
  { title: 'Lighting the lamp', instruction: 'Light the lamp and prepare the Pooja space.' },
  { title: 'Achamanam', instruction: 'Take a little water in your right hand and repeat after the Poojari.' },
  { title: 'Sankalpam', instruction: 'Hold akshata in your right hand and repeat after the Poojari.' },
  { title: 'Ganesha Dhyanam', instruction: 'Meditate on Lord Ganesha and offer a flower.' },
  { title: 'Shodashopachara Pooja', instruction: 'Offer each item as the audio guide announces it.' },
  { title: 'Naivedyam and Harathi', instruction: 'Offer Naivedyam and perform Harathi with your family.' },
];

export const dayWisePoojas = [
  { day: 'Monday', icon: '🔱', title: 'Lord Shiva Pooja' },
  { day: 'Tuesday', icon: '🙏', title: 'Lord Hanuman Pooja' },
  { day: 'Wednesday', icon: '🐘', title: 'Vinayaka Pooja' },
  { day: 'Thursday', icon: '🕉️', title: 'Lord Vishnu Pooja' },
  { day: 'Friday', icon: '🪷', title: 'Lakshmi Devi Pooja' },
  { day: 'Saturday', icon: '🌺', title: 'Sri Venkateswara Swamy Pooja' },
  { day: 'Sunday', icon: '☀️', title: 'Surya Narayana Pooja' },
];

export const specialPoojas = [
  { icon: '🍌', title: 'Satyanarayana Swamy Vratham', detail: 'For family wellbeing and prosperity' },
  { icon: '🪷', title: 'Varalakshmi Vratham', detail: 'Traditional Lakshmi Devi worship' },
  { icon: '🐘', title: 'Vinayaka Chavithi Pooja', detail: 'Complete festival Pooja guidance' },
  { icon: '💰', title: 'Lakshmi Kubera Pooja', detail: 'For prosperity and abundance' },
  { icon: '🏡', title: 'Gruha Pravesham Pooja', detail: 'Blessings for a new home' },
];
