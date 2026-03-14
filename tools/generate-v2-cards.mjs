import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

const OUT_CARDS = path.join(ROOT, 'src/dataset/cards/all.json');
const OUT_DECKS = path.join(ROOT, 'src/dataset/decks/decks.json');
const OUT_I18N_EN = path.join(ROOT, 'src/dataset/i18n/en.json');
const OUT_I18N_NO = path.join(ROOT, 'src/dataset/i18n/no.json');
const OUT_I18N_SV = path.join(ROOT, 'src/dataset/i18n/sv.json');
const OUT_TAXONOMY = path.join(ROOT, 'src/dataset/taxonomy/facets.json');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function between(s, startMarker, endMarker) {
  const a = s.indexOf(startMarker);
  if (a < 0) throw new Error(`Marker not found: ${startMarker}`);
  const b = s.indexOf(endMarker, a + startMarker.length);
  if (b < 0) throw new Error(`End marker not found: ${endMarker}`);
  return s.slice(a + startMarker.length, b);
}

function parseCardLines(arrText) {
  const rx = /\{id:'([^']+)',\s*emoji:'([^']*)',\s*q:'([^']*)',\s*desc:'([^']*)',\s*cat:'([^']*)',\s*dims:\{([^}]*)\}\}/g;
  const out = [];
  let m;
  while ((m = rx.exec(arrText))) {
    const [, id, emoji, q, desc, cat, dimsRaw] = m;
    const dims = {};
    for (const part of dimsRaw.split(',')) {
      const [k, v] = part.split(':').map((x) => x.trim()).filter(Boolean);
      if (!k) continue;
      dims[k] = Number(v);
    }
    out.push({ id, emoji, q, desc, cat, dims });
  }
  return out;
}

const EXP_CAT_CANON = {
  adrenalin: 'adrenaline',
  avslapning: 'relaxation',
  kultur: 'culture',
  mat: 'food',
  natur: 'nature',
  sosial: 'social',
  uteliv: 'nightlife',
  luksus: 'luxury',
  spontan: 'spontaneous',
  'læring': 'learning',
  tempo: 'pace',
  shopping: 'shopping',
};

const DIM_LABELS = {
  en: {
    adv: 'Adventurous',
    soc: 'Social',
    lux: 'Luxury',
    act: 'Active',
    cul: 'Cultural',
    nat: 'Nature',
    food: 'Food',
    night: 'Nightlife',
    spont: 'Spontaneous',
  },
  no: {
    adv: 'Aventyrlyst',
    soc: 'Sosial',
    lux: 'Luksus',
    act: 'Aktiv',
    cul: 'Kultur',
    nat: 'Natur',
    food: 'Mat',
    night: 'Uteliv',
    spont: 'Spontan',
  },
  sv: {
    adv: 'Äventyrlig',
    soc: 'Social',
    lux: 'Lyx',
    act: 'Aktiv',
    cul: 'Kultur',
    nat: 'Natur',
    food: 'Mat',
    night: 'Nattliv',
    spont: 'Spontan',
  },
};

const CAT_LABELS = {
  experiences: {
    adrenaline: { en: 'Adrenaline', no: 'Adrenalin', sv: 'Adrenalin' },
    relaxation: { en: 'Relaxation', no: 'Avslapning', sv: 'Avkoppling' },
    culture: { en: 'Culture', no: 'Kultur', sv: 'Kultur' },
    food: { en: 'Food & drink', no: 'Mat & drikke', sv: 'Mat & dryck' },
    nature: { en: 'Nature', no: 'Natur', sv: 'Natur' },
    social: { en: 'Social', no: 'Sosial', sv: 'Socialt' },
    nightlife: { en: 'Nightlife', no: 'Uteliv', sv: 'Nattliv' },
    luxury: { en: 'Luxury', no: 'Luksus', sv: 'Lyx' },
    spontaneous: { en: 'Spontaneous', no: 'Spontan', sv: 'Spontant' },
    learning: { en: 'Learning', no: 'Læring', sv: 'Lärande' },
    shopping: { en: 'Shopping', no: 'Shopping', sv: 'Shopping' },
    pace: { en: 'Pace', no: 'Tempo', sv: 'Tempo' },
  },
  restaurants: {
    cuisine: { en: 'Cuisine', no: 'Kjøkken', sv: 'Kök' },
    casual: { en: 'Casual', no: 'Uformelt', sv: 'Avslappnat' },
    spicy: { en: 'Spicy', no: 'Sterkt', sv: 'Starkt' },
    fine: { en: 'Fine dining', no: 'Fine dining', sv: 'Fine dining' },
    fresh: { en: 'Fresh & light', no: 'Friskt & lett', sv: 'Fräscht & lätt' },
    drinks: { en: 'Drinks', no: 'Drikke', sv: 'Dryck' },
    sharing: { en: 'Sharing', no: 'Deling', sv: 'Dela' },
    hearty: { en: 'Hearty', no: 'Mettende', sv: 'Mättande' },
    ambience: { en: 'Ambience', no: 'Stemning', sv: 'Stämning' },
    lively: { en: 'Lively', no: 'Livlig', sv: 'Livligt' },
    quick: { en: 'Quick', no: 'Raskt', sv: 'Snabbt' },
    dessert: { en: 'Dessert', no: 'Dessert', sv: 'Efterrätt' },
    local: { en: 'Local gems', no: 'Lokale perler', sv: 'Lokala pärlor' },
    craft: { en: 'Craft', no: 'Håndverk', sv: 'Hantverk' },
    diet: { en: 'Diet-friendly', no: 'Tilpasset kost', sv: 'Kostanpassat' },
    family: { en: 'Family-friendly', no: 'Familievennlig', sv: 'Familjevänligt' },
    quiet: { en: 'Quiet', no: 'Rolig', sv: 'Lugnt' },
    brunch: { en: 'Brunch', no: 'Brunsj', sv: 'Brunch' },
    seafood: { en: 'Seafood', no: 'Sjømat', sv: 'Skaldjur' },
    bbq: { en: 'BBQ & grill', no: 'BBQ & grill', sv: 'BBQ & grill' },
    streetfood: { en: 'Street food', no: 'Street food', sv: 'Street food' },
    coffee: { en: 'Coffee', no: 'Kaffe', sv: 'Kaffe' },
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const BASE_DIMS_EXP = {
  adrenaline: { adv: 0.9, soc: 0.2, lux: 0.0, act: 0.9, cul: 0.0, nat: 0.6, food: -0.2, night: -0.1, spont: 0.5 },
  relaxation: { adv: -0.6, soc: -0.1, lux: 0.6, act: -0.6, cul: 0.2, nat: 0.3, food: 0.1, night: -0.5, spont: -0.2 },
  culture: { adv: 0.1, soc: 0.2, lux: 0.2, act: 0.1, cul: 0.9, nat: -0.1, food: 0.1, night: 0.0, spont: 0.1 },
  food: { adv: 0.3, soc: 0.4, lux: 0.2, act: 0.1, cul: 0.5, nat: 0.0, food: 1.0, night: 0.2, spont: 0.3 },
  nature: { adv: 0.5, soc: 0.1, lux: -0.3, act: 0.7, cul: 0.0, nat: 1.0, food: -0.1, night: -0.3, spont: 0.2 },
  social: { adv: 0.3, soc: 1.0, lux: 0.0, act: 0.2, cul: 0.4, nat: -0.1, food: 0.2, night: 0.3, spont: 0.5 },
  nightlife: { adv: 0.3, soc: 0.8, lux: 0.3, act: 0.2, cul: 0.2, nat: -0.3, food: 0.1, night: 1.0, spont: 0.5 },
  luxury: { adv: -0.1, soc: 0.2, lux: 1.0, act: -0.2, cul: 0.2, nat: 0.1, food: 0.3, night: 0.1, spont: -0.3 },
  spontaneous: { adv: 0.6, soc: 0.3, lux: -0.2, act: 0.3, cul: 0.3, nat: 0.1, food: 0.2, night: 0.1, spont: 1.0 },
  learning: { adv: 0.1, soc: 0.3, lux: 0.0, act: 0.1, cul: 0.8, nat: -0.1, food: 0.0, night: -0.2, spont: 0.1 },
  shopping: { adv: 0.0, soc: 0.3, lux: 0.3, act: 0.2, cul: 0.4, nat: -0.2, food: 0.1, night: 0.1, spont: 0.2 },
  pace: { adv: 0.1, soc: 0.2, lux: 0.1, act: 0.0, cul: 0.2, nat: 0.0, food: 0.1, night: 0.1, spont: 0.0 },
};

const BASE_DIMS_REST = {
  cuisine: { adv: 0.2, soc: 0.2, lux: 0.1, act: -0.1, cul: 0.4, nat: -0.1, food: 1.0, night: 0.1, spont: 0.1 },
  casual: { adv: -0.1, soc: 0.2, lux: -0.6, act: -0.1, cul: 0.0, nat: -0.1, food: 0.6, night: 0.1, spont: 0.2 },
  spicy: { adv: 0.4, soc: 0.1, lux: -0.1, act: 0.1, cul: 0.2, nat: -0.1, food: 0.9, night: 0.1, spont: 0.2 },
  fine: { adv: 0.0, soc: 0.2, lux: 1.0, act: -0.3, cul: 0.3, nat: -0.2, food: 0.9, night: 0.2, spont: -0.4 },
  fresh: { adv: -0.1, soc: -0.1, lux: 0.1, act: 0.3, cul: 0.1, nat: 0.2, food: 0.6, night: -0.3, spont: -0.1 },
  drinks: { adv: 0.1, soc: 0.5, lux: 0.5, act: -0.2, cul: 0.2, nat: -0.1, food: 0.4, night: 0.8, spont: 0.2 },
  sharing: { adv: 0.2, soc: 0.8, lux: 0.2, act: -0.1, cul: 0.4, nat: -0.1, food: 0.8, night: 0.3, spont: 0.4 },
  hearty: { adv: -0.1, soc: 0.2, lux: 0.1, act: -0.1, cul: 0.0, nat: -0.1, food: 0.8, night: 0.1, spont: 0.0 },
  ambience: { adv: -0.2, soc: -0.1, lux: 0.5, act: -0.3, cul: 0.2, nat: 0.0, food: 0.4, night: 0.0, spont: -0.2 },
  lively: { adv: 0.1, soc: 0.8, lux: 0.1, act: 0.1, cul: 0.1, nat: -0.2, food: 0.4, night: 0.9, spont: 0.3 },
  quick: { adv: -0.2, soc: -0.1, lux: -0.2, act: 0.1, cul: -0.1, nat: -0.1, food: 0.4, night: -0.3, spont: 0.3 },
  dessert: { adv: -0.1, soc: 0.1, lux: 0.1, act: -0.2, cul: 0.1, nat: -0.1, food: 0.7, night: 0.1, spont: 0.1 },
  local: { adv: 0.3, soc: 0.1, lux: 0.1, act: 0.2, cul: 0.7, nat: -0.1, food: 0.6, night: 0.1, spont: 0.6 },
  craft: { adv: 0.1, soc: 0.2, lux: 0.4, act: -0.1, cul: 0.4, nat: -0.1, food: 0.6, night: 0.1, spont: 0.1 },
  diet: { adv: 0.1, soc: 0.1, lux: 0.1, act: 0.2, cul: 0.1, nat: 0.1, food: 0.5, night: -0.1, spont: 0.1 },
  family: { adv: -0.3, soc: 0.3, lux: -0.3, act: -0.2, cul: -0.1, nat: -0.1, food: 0.3, night: -0.6, spont: -0.1 },
  quiet: { adv: -0.2, soc: -0.1, lux: 0.2, act: -0.2, cul: 0.1, nat: -0.1, food: 0.3, night: -0.5, spont: -0.1 },
  brunch: { adv: 0.0, soc: 0.4, lux: 0.1, act: -0.1, cul: 0.1, nat: 0.1, food: 0.6, night: -0.4, spont: 0.2 },
  seafood: { adv: 0.1, soc: 0.2, lux: 0.2, act: -0.1, cul: 0.2, nat: 0.2, food: 0.8, night: 0.1, spont: 0.1 },
  bbq: { adv: 0.0, soc: 0.4, lux: 0.0, act: -0.1, cul: 0.1, nat: 0.1, food: 0.8, night: 0.2, spont: 0.2 },
  streetfood: { adv: 0.5, soc: 0.4, lux: -0.6, act: 0.2, cul: 0.4, nat: -0.1, food: 0.9, night: 0.2, spont: 0.8 },
  coffee: { adv: -0.1, soc: 0.1, lux: 0.1, act: -0.2, cul: 0.2, nat: -0.1, food: 0.4, night: -0.6, spont: 0.1 },
};

function buildDims(base, tweak = {}) {
  const out = { ...base };
  for (const [k, v] of Object.entries(tweak)) {
    out[k] = (out[k] ?? 0) + v;
  }
  for (const k of Object.keys(out)) {
    out[k] = clamp(out[k], -1, 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parse existing cards from Travel-Swish.tsx (p1..p50 + r1..r20)
// ---------------------------------------------------------------------------

let legacy = read(path.join(ROOT, 'Travel-Swish.tsx'));
legacy = legacy.replace(/\r\n/g, '\n');

const prefBlock = between(legacy, 'const PREFERENCE_CARDS = {', '// Mode: restaurants');
const prefNoText = between(prefBlock, 'no: [', '],\n  en: [');
const prefEnText = between(prefBlock, 'en: [', ']\n};');

const restBlock = between(legacy, 'const RESTAURANT_CARDS = {', 'const PREF_CAT_GRAD');
const restNoText = between(restBlock, 'no: [', '],\n  en: [');
const restEnText = between(restBlock, 'en: [', ']\n};');

const prefNo = parseCardLines(prefNoText);
const prefEn = parseCardLines(prefEnText);
const restNo = parseCardLines(restNoText);
const restEn = parseCardLines(restEnText);

function indexById(arr) {
  const m = new Map();
  for (const c of arr) m.set(c.id, c);
  return m;
}

const prefNoById = indexById(prefNo);
const prefEnById = indexById(prefEn);
const restNoById = indexById(restNo);
const restEnById = indexById(restEn);

// ---------------------------------------------------------------------------
// New v2 cards (p51..p100, r21..r100)
// ---------------------------------------------------------------------------

const NEW_EXP = [
  // Adrenaline
  { id: 'p51', emoji: '🪢', cat: 'adrenaline', dimsTweak: { nat: 0.1, spont: 0.1 },
    no: { q: 'Vil du prøve strikkhopp (bungee) hvis det finnes i nærheten?', desc: 'Kort frykt. Langt minne.' },
    en: { q: 'Would you try bungee jumping if it is available nearby?', desc: 'A short fear. A long memory.' },
  },
  { id: 'p52', emoji: '🛶', cat: 'adrenaline', dimsTweak: { nat: 0.2, soc: 0.1 },
    no: { q: 'Høres rafting i stryk ut som en god dag?', desc: 'Vann, fart og teamfølelse.' },
    en: { q: 'Does white-water rafting sound like a great day?', desc: 'Water, speed, and teamwork.' },
  },
  { id: 'p53', emoji: '🪂', cat: 'adrenaline', dimsTweak: { lux: 0.1, nat: 0.1 },
    no: { q: 'Vil du teste paragliding for å se landskapet fra lufta?', desc: 'Frihet med utsikt.' },
    en: { q: 'Would you try paragliding to see the landscape from above?', desc: 'Freedom with a view.' },
  },
  { id: 'p54', emoji: '🧗', cat: 'adrenaline', dimsTweak: { act: 0.1, nat: 0.2 },
    no: { q: 'Kunne du blitt med på via ferrata (klatrerute med vaier)?', desc: 'Klatring med litt ekstra trygghet.' },
    en: { q: 'Would you join a via ferrata route (climbing with cables)?', desc: 'Climbing with a bit of extra safety.' },
  },
  { id: 'p55', emoji: '🏜️', cat: 'adrenaline', dimsTweak: { nat: 0.2, spont: 0.1 },
    no: { q: 'Vil du prøve sandboarding i sanddynene?', desc: 'Som snowboard — bare varmere.' },
    en: { q: 'Would you try sandboarding on the dunes?', desc: 'Like snowboarding — just warmer.' },
  },
  { id: 'p56', emoji: '🧊', cat: 'adrenaline', dimsTweak: { nat: 0.3, act: 0.1 },
    no: { q: 'Høres en guidet brevandring (glacier hike) fristende ut?', desc: 'Is, sprekker og rå natur.' },
    en: { q: 'Does a guided glacier hike sound tempting?', desc: 'Ice, crevasses, and raw nature.' },
  },
  { id: 'p57', emoji: '🌋', cat: 'adrenaline', dimsTweak: { nat: 0.3, cul: 0.1 },
    no: { q: 'Vil du gå en vulkantur for å se landskapet fra toppen?', desc: 'Når naturen føles litt farlig (på en god måte).' },
    en: { q: 'Would you hike a volcano to see the view from the top?', desc: 'When nature feels a little dangerous (in a good way).' },
  },
  { id: 'p58', emoji: '🛵', cat: 'adrenaline', dimsTweak: { spont: 0.2, soc: 0.1 },
    no: { q: 'Kunne du leid scooter og utforsket uten fast rute?', desc: 'Små omveier blir dagens høydepunkt.' },
    en: { q: 'Would you rent a scooter and explore without a fixed route?', desc: 'Small detours become the highlight.' },
  },
  { id: 'p59', emoji: '🪁', cat: 'adrenaline', dimsTweak: { nat: 0.2, act: 0.2 },
    no: { q: 'Vil du prøve kitesurfing hvis forholdene er fine?', desc: 'Vind, vann og mestring.' },
    en: { q: 'Would you try kitesurfing if conditions are good?', desc: 'Wind, water, and progress.' },
  },
  { id: 'p60', emoji: '🚵', cat: 'adrenaline', dimsTweak: { nat: 0.2, act: 0.2 },
    no: { q: 'Høres sti-sykling (mountain bike) i naturen ut som deg?', desc: 'Adrenalin uten motor.' },
    en: { q: 'Does mountain biking on trails sound like you?', desc: 'Adrenaline without an engine.' },
  },

  // Relaxation
  { id: 'p61', emoji: '🔥', cat: 'relaxation', dimsTweak: { nat: 0.1 },
    no: { q: 'Vil du gjøre et skikkelig badstu-rituale (varmt/kaldt)?', desc: 'Stress ut, pust inn.' },
    en: { q: 'Would you do a proper sauna ritual (hot/cold cycles)?', desc: 'Stress out, breathe in.' },
  },
  { id: 'p62', emoji: '🍵', cat: 'relaxation', dimsTweak: { cul: 0.3, lux: 0.1 },
    no: { q: 'Kunne du dratt på en te-seremoni eller “slow tasting”?', desc: 'Rolig fokus på små detaljer.' },
    en: { q: 'Would you go to a tea ceremony or “slow tasting”?', desc: 'Calm focus on small details.' },
  },
  { id: 'p63', emoji: '🫧', cat: 'relaxation', dimsTweak: { lux: 0.2, act: -0.1 },
    no: { q: 'Høres float/spa i saltvann ut som en perfekt pause?', desc: 'Null tyngdekraft, null mas.' },
    en: { q: 'Does a float/saltwater spa sound like a perfect break?', desc: 'Zero gravity, zero rush.' },
  },
  { id: 'p64', emoji: '🎧', cat: 'relaxation', dimsTweak: { cul: 0.1, night: -0.2 },
    no: { q: 'Vil du prøve en “sound bath”/lydmeditasjon?', desc: 'Avslapning som skjer i kroppen.' },
    en: { q: 'Would you try a sound bath / sound meditation?', desc: 'Relaxation you can feel in your body.' },
  },
  { id: 'p65', emoji: '🧺', cat: 'relaxation', dimsTweak: { nat: 0.2, soc: 0.1 },
    no: { q: 'Kunne du valgt en enkel piknik i parken fremfor en “must see”?', desc: 'Lavt tempo, høy trivsel.' },
    en: { q: 'Would you choose a simple park picnic over a “must-see” sight?', desc: 'Low pace, high comfort.' },
  },
  { id: 'p66', emoji: '💆', cat: 'relaxation', dimsTweak: { lux: 0.2 },
    no: { q: 'Er massasje på reise noe du faktisk prioriterer?', desc: 'Restitusjon er også en aktivitet.' },
    en: { q: 'Do you actually prioritize getting a massage while traveling?', desc: 'Recovery is an activity too.' },
  },
  { id: 'p67', emoji: '🌅', cat: 'relaxation', dimsTweak: { nat: 0.2, night: -0.2 },
    no: { q: 'Vil du heller ha en rolig soloppgangstur enn en sen kveld?', desc: 'Tidlig ro slår sen puls.' },
    en: { q: 'Would you rather do a calm sunrise outing than a late night?', desc: 'Early calm beats late buzz.' },
  },
  { id: 'p68', emoji: '📓', cat: 'relaxation', dimsTweak: { cul: 0.1, soc: -0.1 },
    no: { q: 'Liker du å sette av tid til journaling/skriving på reise?', desc: 'Sortere tanker og inntrykk.' },
    en: { q: 'Do you like setting aside time for journaling while traveling?', desc: 'Sorting thoughts and impressions.' },
  },
  { id: 'p69', emoji: '🌿', cat: 'relaxation', dimsTweak: { nat: 0.2, food: 0.1 },
    no: { q: 'Høres en rolig “slow lunch” på et grønt sted ut som deg?', desc: 'En time som føles som tre.' },
    en: { q: 'Does a calm “slow lunch” in a green spot sound like you?', desc: 'An hour that feels like three.' },
  },
  { id: 'p70', emoji: '🛏️', cat: 'relaxation', dimsTweak: { act: -0.2, lux: 0.1 },
    no: { q: 'Setter du pris på å ha rom for en skikkelig “ingenting-dag”?', desc: 'Hvile gjør resten bedre.' },
    en: { q: 'Do you value leaving room for a proper “do nothing” day?', desc: 'Rest makes the rest better.' },
  },

  // Culture / learning
  { id: 'p71', emoji: '🏰', cat: 'culture', dimsTweak: { cul: 0.1, act: 0.1 },
    no: { q: 'Vil du på guidet historisk vandring (med historier, ikke fakta-dryss)?', desc: 'Byen gir mening når du kjenner fortellingene.' },
    en: { q: 'Would you do a guided history walk (stories, not just facts)?', desc: 'A city makes sense when you know the stories.' },
  },
  { id: 'p72', emoji: '🖼️', cat: 'culture', dimsTweak: { cul: 0.2 },
    no: { q: 'Kunne du brukt en ettermiddag på gallerier og små utstillinger?', desc: 'Små rom, store ideer.' },
    en: { q: 'Could you spend an afternoon on galleries and small exhibitions?', desc: 'Small rooms, big ideas.' },
  },
  { id: 'p73', emoji: '🎻', cat: 'culture', dimsTweak: { lux: 0.2, night: 0.2 },
    no: { q: 'Er opera/klassisk konsert en kul kveld ute for deg?', desc: 'Stemning uten club-lyd.' },
    en: { q: 'Is an opera/classical concert a great night out for you?', desc: 'Atmosphere without club volume.' },
  },
  { id: 'p74', emoji: '📷', cat: 'learning', dimsTweak: { cul: 0.2, act: 0.1 },
    no: { q: 'Vil du ta en foto-workshop for å lære å se bedre?', desc: 'Litt teknikk, mye blikk.' },
    en: { q: 'Would you do a photography workshop to learn to see better?', desc: 'A bit of technique, a lot of perspective.' },
  },
  { id: 'p75', emoji: '💃', cat: 'learning', dimsTweak: { soc: 0.2, night: 0.1 },
    no: { q: 'Kunne du prøvd en lokal danseklasse (selv som nybegynner)?', desc: 'Kroppen lærer fortere enn hodet.' },
    en: { q: 'Would you try a local dance class (even as a beginner)?', desc: 'Your body learns faster than your head.' },
  },
  { id: 'p76', emoji: '🧑‍🎨', cat: 'learning', dimsTweak: { cul: 0.1, lux: 0.1 },
    no: { q: 'Vil du prøve en kunst-/håndverksworkshop (keramikk, maling, tekstil)?', desc: 'Lag noe du faktisk tar med hjem.' },
    en: { q: 'Would you try an art/craft workshop (ceramics, painting, textiles)?', desc: 'Make something you actually bring home.' },
  },
  { id: 'p77', emoji: '🕌', cat: 'culture', dimsTweak: { cul: 0.1 },
    no: { q: 'Synes du det er fint å besøke templer/kirker for ro og arkitektur?', desc: 'Stillhet som opplevelse.' },
    en: { q: 'Do you enjoy visiting temples/churches for calm and architecture?', desc: 'Silence as an experience.' },
  },
  { id: 'p78', emoji: '🎬', cat: 'culture', dimsTweak: { night: 0.1, soc: 0.1 },
    no: { q: 'Kunne du dratt på en lokal kino/utendørsfilm på reise?', desc: 'En liten bit hverdagskultur.' },
    en: { q: 'Would you go to a local cinema/outdoor movie while traveling?', desc: 'A small slice of everyday culture.' },
  },
  { id: 'p79', emoji: '🗣️', cat: 'learning', dimsTweak: { soc: 0.2, spont: 0.1 },
    no: { q: 'Vil du bli med på en språkkafé/language exchange-kveld?', desc: 'Nye venner via små ord.' },
    en: { q: 'Would you join a language exchange night?', desc: 'New friends through small words.' },
  },
  { id: 'p80', emoji: '🧑‍🍳', cat: 'food', dimsTweak: { soc: 0.2, cul: 0.1 },
    no: { q: 'Kunne du gjort en matmarkedstur med smaksprøver?', desc: 'Mye smak på kort tid.' },
    en: { q: 'Would you do a food market tour with tastings?', desc: 'A lot of flavor in little time.' },
  },

  // Nature
  { id: 'p81', emoji: '🏞️', cat: 'nature', dimsTweak: { act: 0.1 },
    no: { q: 'Vil du prioritere nasjonalpark/dagstur ut av byen?', desc: 'Store linjer og frisk luft.' },
    en: { q: 'Would you prioritize a national park / day trip out of the city?', desc: 'Big views and fresh air.' },
  },
  { id: 'p82', emoji: '💦', cat: 'nature', dimsTweak: { act: 0.1, nat: 0.1 },
    no: { q: 'Høres en tur til en foss (med litt gåing) ut som deg?', desc: 'Natur som faktisk bråker.' },
    en: { q: 'Does a waterfall trip (with some walking) sound like you?', desc: 'Nature that actually makes noise.' },
  },
  { id: 'p83', emoji: '🔭', cat: 'nature', dimsTweak: { night: 0.3, soc: -0.1 },
    no: { q: 'Vil du dra på stjernekikking et sted med lite lysforurensing?', desc: 'Når himmelen blir en attraksjon.' },
    en: { q: 'Would you go stargazing somewhere with low light pollution?', desc: 'When the sky is the attraction.' },
  },
  { id: 'p84', emoji: '🐢', cat: 'nature', dimsTweak: { nat: 0.2, adv: 0.1 },
    no: { q: 'Vil du snorkle hvis sjansen for å se skilpadder/fisk er stor?', desc: 'En annen verden — uten dykkesertifikat.' },
    en: { q: 'Would you snorkel if the chances of seeing turtles/fish are high?', desc: 'Another world — no certification required.' },
  },
  { id: 'p85', emoji: '🎈', cat: 'nature', dimsTweak: { lux: 0.3, adv: 0.2 },
    no: { q: 'Høres luftballong ved soloppgang ut som en once-in-a-life ting?', desc: 'Rolig svev, stor utsikt.' },
    en: { q: 'Does a sunrise hot-air balloon ride sound like a once-in-a-lifetime thing?', desc: 'Quiet floating, big views.' },
  },
  { id: 'p86', emoji: '🦜', cat: 'nature', dimsTweak: { cul: 0.1, soc: 0.1 },
    no: { q: 'Kunne du blitt med på fuglekikking/wildlife-walk med guide?', desc: 'Se mer ved å vite hva du ser.' },
    en: { q: 'Would you join a birdwatching/wildlife walk with a guide?', desc: 'See more by knowing what you see.' },
  },
  { id: 'p87', emoji: '🚣', cat: 'nature', dimsTweak: { act: 0.2, nat: 0.1 },
    no: { q: 'Vil du heller padle i rolig vann enn å ta en buss sightseeing?', desc: 'Du får stillhet og bevegelse samtidig.' },
    en: { q: 'Would you rather paddle calm waters than take a sightseeing bus?', desc: 'Silence and movement at the same time.' },
  },
  { id: 'p88', emoji: '🏕️', cat: 'nature', dimsTweak: { lux: -0.2, spont: 0.2 },
    no: { q: 'Kunne du sovet i telt eller enkel hytte for å være nær naturen?', desc: 'Komfort ned, opplevelse opp.' },
    en: { q: 'Could you sleep in a tent or simple cabin to be close to nature?', desc: 'Less comfort, more experience.' },
  },
  { id: 'p89', emoji: '🌌', cat: 'nature', dimsTweak: { night: 0.4, nat: 0.2 },
    no: { q: 'Vil du dra på “northern lights”/nattsafari hvis stedet er riktig?', desc: 'Natt som belønner deg.' },
    en: { q: 'Would you go on a northern lights / night safari if the location is right?', desc: 'A night that pays you back.' },
  },
  { id: 'p90', emoji: '🏖️', cat: 'nature', dimsTweak: { act: -0.2, lux: 0.1 },
    no: { q: 'Høres en enkel stranddag med bare bading og sol ut som deg?', desc: 'Null plan, null dårlig samvittighet.' },
    en: { q: 'Does a simple beach day with just swimming and sun sound like you?', desc: 'No plan, no guilt.' },
  },

  // Social / nightlife / spontaneous / luxury / pace
  { id: 'p91', emoji: '🍻', cat: 'nightlife', dimsTweak: { soc: 0.1 },
    no: { q: 'Kunne du blitt med på pub crawl hvis du reiser med venner?', desc: 'Byen gjennom barer og samtaler.' },
    en: { q: 'Would you join a pub crawl if you are traveling with friends?', desc: 'A city through bars and conversations.' },
  },
  { id: 'p92', emoji: '🤝', cat: 'social', dimsTweak: { cul: 0.2, act: 0.1 },
    no: { q: 'Vil du gjøre en frivillig aktivitet (strandrydding, matutdeling) på reise?', desc: 'En opplevelse som også gir.' },
    en: { q: 'Would you do a volunteer activity (beach cleanup, community kitchen) while traveling?', desc: 'An experience that also gives back.' },
  },
  { id: 'p93', emoji: '🧳', cat: 'spontaneous', dimsTweak: { spont: 0.0 },
    no: { q: 'Liker du å bestemme deg samme dag for hva du skal gjøre?', desc: 'Planen er en følelse, ikke et skjema.' },
    en: { q: 'Do you like deciding what to do on the same day?', desc: 'The plan is a feeling, not a spreadsheet.' },
  },
  { id: 'p94', emoji: '🚆', cat: 'spontaneous', dimsTweak: { adv: 0.1, cul: 0.1 },
    no: { q: 'Kunne du tatt en impulsiv dagstur med tog til en naboby?', desc: 'Små bytter, nye inntrykk.' },
    en: { q: 'Could you take an impulsive train day trip to a nearby town?', desc: 'Small changes, new impressions.' },
  },
  { id: 'p95', emoji: '🚗', cat: 'luxury', dimsTweak: { lux: 0.1, spont: -0.1 },
    no: { q: 'Er privat sjåfør/taxi en ting du betaler for for å spare tid?', desc: 'Friksjon ned, opplevelser opp.' },
    en: { q: 'Would you pay for a private driver/taxi to save time?', desc: 'Less friction, more moments.' },
  },
  { id: 'p96', emoji: '🛍️', cat: 'shopping', dimsTweak: { lux: 0.2, cul: 0.1 },
    no: { q: 'Liker du å shoppe lokalt design (ikke bare suvenirer)?', desc: 'Finn noe du faktisk bruker etterpå.' },
    en: { q: 'Do you like shopping local design (not just souvenirs)?', desc: 'Find something you will actually use later.' },
  },
  { id: 'p97', emoji: '🥂', cat: 'luxury', dimsTweak: { night: 0.2, soc: 0.1 },
    no: { q: 'Høres en rooftop-bar med utsikt ut som en prioritet?', desc: 'En dyr drink som føles verdt det.' },
    en: { q: 'Does a rooftop bar with a view feel like a priority?', desc: 'An expensive drink that feels worth it.' },
  },
  { id: 'p98', emoji: '🏃', cat: 'pace', dimsTweak: { act: 0.8, spont: -0.1 },
    no: { q: 'Er du typen som liker å “maksimere dagen” med tidlig start og mye innhold?', desc: 'Full kalender = lykkelig hode.' },
    en: { q: 'Are you the type who likes to “maximize the day” with early starts and packed plans?', desc: 'A full calendar = a happy mind.' },
  },
  { id: 'p99', emoji: '🧘', cat: 'pace', dimsTweak: { act: -0.5, lux: 0.1 },
    no: { q: 'Foretrekker du heller få ting i løpet av dagen — men bra ting?', desc: 'Kvalitet over kvantitet.' },
    en: { q: 'Do you prefer fewer things per day — but good things?', desc: 'Quality over quantity.' },
  },
  { id: 'p100', emoji: '🎫', cat: 'spontaneous', dimsTweak: { cul: 0.1, soc: 0.1 },
    no: { q: 'Kjøper du gjerne “last minute”-billetter hvis noe virker gøy?', desc: 'Ja til muligheter.' },
    en: { q: 'Do you happily buy last-minute tickets if something looks fun?', desc: 'Yes to opportunities.' },
  },
];

const NEW_REST = [
  // Cuisine variety
  { id: 'r21', emoji: '🌮', cat: 'cuisine', dimsTweak: { spont: 0.2 },
    no: { q: 'Er du glad i tacos med skikkelig salsa og lime?', desc: 'Syre, krydder og street-vibbe.' },
    en: { q: 'Do you love tacos with proper salsa and lime?', desc: 'Acid, spice, and street vibes.' },
  },
  { id: 'r22', emoji: '🥟', cat: 'cuisine', dimsTweak: { cul: 0.1 },
    no: { q: 'Dumplings/dim sum: får du lyst med én gang?', desc: 'Små biter, stor glede.' },
    en: { q: 'Dumplings / dim sum: instant yes?', desc: 'Small bites, big joy.' },
  },
  { id: 'r23', emoji: '🍛', cat: 'cuisine', dimsTweak: { adv: 0.1 },
    no: { q: 'Er indisk curry (sterkt eller mildt) noe du alltid finner?', desc: 'Krydder som bygger smak.' },
    en: { q: 'Is Indian curry (hot or mild) something you always look for?', desc: 'Spices that build flavor.' },
  },
  { id: 'r24', emoji: '🥘', cat: 'cuisine', dimsTweak: { soc: 0.1 },
    no: { q: 'Liker du paella/risretter som deles på bordet?', desc: 'Deling + mye smak.' },
    en: { q: 'Do you like paella/rice dishes meant to be shared?', desc: 'Sharing + big flavor.' },
  },
  { id: 'r25', emoji: '🥙', cat: 'cuisine', dimsTweak: { spont: 0.2, lux: -0.2 },
    no: { q: 'Kebab/shawarma fra et lite sted: ja?', desc: 'Raskt, saftig, ekte.' },
    en: { q: 'Kebab/shawarma from a small spot: yes?', desc: 'Fast, juicy, real.' },
  },
  { id: 'r26', emoji: '🍜', cat: 'cuisine', dimsTweak: { lux: -0.1 },
    no: { q: 'Nudler som “comfort” (ramen/udon): er det deg?', desc: 'Varme boller og dyp smak.' },
    en: { q: 'Comfort noodles (ramen/udon): is that you?', desc: 'Warm bowls and deep flavor.' },
  },
  { id: 'r27', emoji: '🥡', cat: 'cuisine', dimsTweak: { },
    no: { q: 'Er du svak for ekte, enkel kinesisk mat (ikke bare “takeaway classic”)?', desc: 'Når menyen har ting du ikke kan uttale.' },
    en: { q: 'Do you crave authentic simple Chinese food (not just classic takeout)?', desc: 'When the menu has things you can’t pronounce.' },
  },
  { id: 'r28', emoji: '🍣', cat: 'cuisine', dimsTweak: { lux: 0.2 },
    no: { q: 'Foretrekker du omakase/tasting hos sushi hvis du først går?', desc: 'La kokken styre.' },
    en: { q: 'If you do sushi, do you prefer omakase/tasting?', desc: 'Let the chef drive.' },
  },
  { id: 'r29', emoji: '🍝', cat: 'cuisine', dimsTweak: { },
    no: { q: 'Pasta som hovedgrunn til å velge restaurant?', desc: 'Enkelhet gjort perfekt.' },
    en: { q: 'Is pasta a main reason you pick a restaurant?', desc: 'Simplicity done right.' },
  },
  { id: 'r30', emoji: '🥗', cat: 'fresh', dimsTweak: { act: 0.1 },
    no: { q: 'Velger du ofte salat/bowl hvis det finnes et bra alternativ?', desc: 'Lett, friskt og energigivende.' },
    en: { q: 'Do you often choose a salad/bowl if there is a great option?', desc: 'Light, fresh, energizing.' },
  },

  // Brunch / coffee
  { id: 'r31', emoji: '🥞', cat: 'brunch', dimsTweak: { soc: 0.1 },
    no: { q: 'Er brunsj med pancakes/eggs en ting du jakter på?', desc: 'Sen frokost, god stemning.' },
    en: { q: 'Do you hunt for brunch with pancakes/eggs?', desc: 'Late breakfast, good mood.' },
  },
  { id: 'r32', emoji: '🥐', cat: 'brunch', dimsTweak: { lux: 0.1 },
    no: { q: 'Prioriterer du bakerier med skikkelige croissanter?', desc: 'Smør, sprø skorpe, kaffe.' },
    en: { q: 'Do you prioritize bakeries with proper croissants?', desc: 'Butter, crunch, coffee.' },
  },
  { id: 'r33', emoji: '☕', cat: 'coffee', dimsTweak: { cul: 0.1 },
    no: { q: 'Er “spesialkaffe” (pour-over/espresso) en liten hobby for deg?', desc: 'Små detaljer i en kopp.' },
    en: { q: 'Is specialty coffee (pour-over/espresso) a small hobby for you?', desc: 'Small details in a cup.' },
  },
  { id: 'r34', emoji: '🧇', cat: 'brunch', dimsTweak: { spont: 0.1 },
    no: { q: 'Kunne du droppet lunch og heller gått all-in på en stor brunsj?', desc: 'En måltidsstrategi.' },
    en: { q: 'Could you skip lunch and go all-in on a big brunch instead?', desc: 'A meal strategy.' },
  },
  { id: 'r35', emoji: '🥪', cat: 'quick', dimsTweak: { spont: 0.2 },
    no: { q: 'Er en skikkelig god sandwich/baguette et “ja” for deg?', desc: 'Raskt, men fortsatt bra.' },
    en: { q: 'Is a really good sandwich/baguette a “yes” for you?', desc: 'Fast, but still great.' },
  },

  // Seafood / BBQ
  { id: 'r36', emoji: '🦐', cat: 'seafood', dimsTweak: { lux: 0.1 },
    no: { q: 'Blir du ekstra glad av sjømat når du er i en kystby?', desc: 'Smak av stedet.' },
    en: { q: 'Do you get extra happy about seafood in a coastal city?', desc: 'Taste the place.' },
  },
  { id: 'r37', emoji: '🦪', cat: 'seafood', dimsTweak: { lux: 0.2 },
    no: { q: 'Kunne du bestilt østers hvis de ser bra ut?', desc: 'Litt luksus, litt salt hav.' },
    en: { q: 'Would you order oysters if they look good?', desc: 'A bit of luxury, a bit of sea.' },
  },
  { id: 'r38', emoji: '🐟', cat: 'seafood', dimsTweak: { },
    no: { q: 'Foretrekker du grillet fisk fremfor kjøtt hvis det står mellom?', desc: 'Ren smak, lett kropp.' },
    en: { q: 'Do you prefer grilled fish over meat if you have the choice?', desc: 'Clean flavor, lighter feel.' },
  },
  { id: 'r39', emoji: '🍖', cat: 'bbq', dimsTweak: { soc: 0.2, night: 0.2 },
    no: { q: 'Er BBQ/smoked meats verdt en omvei?', desc: 'Røyk, saus, og litt kaos.' },
    en: { q: 'Is BBQ/smoked meats worth a detour?', desc: 'Smoke, sauce, and a bit of chaos.' },
  },
  { id: 'r40', emoji: '🔥', cat: 'bbq', dimsTweak: { soc: 0.1 },
    no: { q: 'Koreansk BBQ: liker du å grille selv ved bordet?', desc: 'Middag som aktivitet.' },
    en: { q: 'Korean BBQ: do you like grilling at the table yourself?', desc: 'Dinner as an activity.' },
  },

  // Street food
  { id: 'r41', emoji: '🧆', cat: 'streetfood', dimsTweak: { spont: 0.1 },
    no: { q: 'Er falafel/gyros fra bod bedre enn “fin” restaurant noen ganger?', desc: 'Enkelt, varmt, ekte.' },
    en: { q: 'Is falafel/gyros from a stall better than “fancy” sometimes?', desc: 'Simple, warm, real.' },
  },
  { id: 'r42', emoji: '🍢', cat: 'streetfood', dimsTweak: { night: 0.1 },
    no: { q: 'Liker du å spise på night markets eller matgater?', desc: 'Mange lukter, mange valg.' },
    en: { q: 'Do you like eating at night markets or food streets?', desc: 'Many smells, many choices.' },
  },
  { id: 'r43', emoji: '🍗', cat: 'streetfood', dimsTweak: { spont: 0.2 },
    no: { q: 'Kunne du spist “friterte greier” hvis det ser digg ut?', desc: 'Noen ganger er det lov.' },
    en: { q: 'Would you eat “fried stuff” if it looks amazing?', desc: 'Sometimes it is allowed.' },
  },

  // Vibe / constraints
  { id: 'r44', emoji: '🌿', cat: 'ambience', dimsTweak: { nat: 0.2, lux: 0.1 },
    no: { q: 'Er uteservering/terrasse et stort pluss?', desc: 'Mat smaker bedre ute.' },
    en: { q: 'Is outdoor seating/terrace a big plus?', desc: 'Food tastes better outside.' },
  },
  { id: 'r45', emoji: '🏙️', cat: 'ambience', dimsTweak: { lux: 0.2, night: 0.1 },
    no: { q: 'Rooftop eller utsikt: prioriterer du det når du kan?', desc: 'Stemning er halve måltidet.' },
    en: { q: 'Rooftop or a view: do you prioritize that when you can?', desc: 'Atmosphere is half the meal.' },
  },
  { id: 'r46', emoji: '🕯️', cat: 'ambience', dimsTweak: { soc: -0.1 },
    no: { q: 'Foretrekker du lav belysning og rolig atmosfære?', desc: 'Intimt fremfor bråkete.' },
    en: { q: 'Do you prefer low lighting and a calm atmosphere?', desc: 'Intimate over noisy.' },
  },
  { id: 'r47', emoji: '🎶', cat: 'lively', dimsTweak: { night: 0.1 },
    no: { q: 'Liker du steder med musikk og litt “buzz”?', desc: 'Energi i rommet.' },
    en: { q: 'Do you like places with music and some buzz?', desc: 'Energy in the room.' },
  },
  { id: 'r48', emoji: '🍷', cat: 'drinks', dimsTweak: { lux: 0.1 },
    no: { q: 'Bestiller du gjerne en god vin/cocktail til maten?', desc: 'Drikke er en del av opplevelsen.' },
    en: { q: 'Do you like ordering a good wine/cocktail with your meal?', desc: 'Drinks are part of the experience.' },
  },
  { id: 'r49', emoji: '🍸', cat: 'drinks', dimsTweak: { night: 0.2 },
    no: { q: 'Er du mer “cocktailbar” enn “pub”?', desc: 'Mindre øl, mer miks.' },
    en: { q: 'Are you more “cocktail bar” than “pub”?', desc: 'Less beer, more mix.' },
  },
  { id: 'r50', emoji: '🧁', cat: 'dessert', dimsTweak: { lux: 0.1 },
    no: { q: 'Blir du lett fristet av dessertdisken?', desc: 'Søtt er en egen mage.' },
    en: { q: 'Do you get easily tempted by the dessert display?', desc: 'Sweet has its own stomach.' },
  },

  // Diet / local / craft
  { id: 'r51', emoji: '🥦', cat: 'diet', dimsTweak: { act: 0.1 },
    no: { q: 'Er du ofte i humør for vegetarmat hvis det gjøres skikkelig?', desc: 'Grønt kan være heavy på smak.' },
    en: { q: 'Are you often in the mood for vegetarian food when it is done right?', desc: 'Green can be heavy on flavor.' },
  },
  { id: 'r52', emoji: '🌾', cat: 'diet', dimsTweak: { cul: 0.0 },
    no: { q: 'Er glutenfrie alternativer viktig å finne?', desc: 'Trygghet gjør maten bedre.' },
    en: { q: 'Is it important to find gluten-free options?', desc: 'Safety makes food better.' },
  },
  { id: 'r53', emoji: '🧑‍🍳', cat: 'craft', dimsTweak: { lux: 0.1 },
    no: { q: 'Liker du steder som lager alt fra bunnen (saus, brød, pasta)?', desc: 'Håndverket smaker.' },
    en: { q: 'Do you like places that make things from scratch (sauces, bread, pasta)?', desc: 'You can taste the craft.' },
  },
  { id: 'r54', emoji: '📍', cat: 'local', dimsTweak: { spont: 0.2 },
    no: { q: 'Spør du gjerne locals om hvor de selv spiser?', desc: 'Du vil bort fra turistfella.' },
    en: { q: 'Do you like asking locals where they actually eat?', desc: 'You want away from tourist traps.' },
  },
  { id: 'r55', emoji: '🧂', cat: 'craft', dimsTweak: { cul: 0.1 },
    no: { q: 'Synes du “fermentert” og “pickles” er spennende på menyen?', desc: 'Syre gir liv.' },
    en: { q: 'Do you get excited by “fermented” and “pickles” on a menu?', desc: 'Acid brings life.' },
  },

  // Family / quiet / quick / casual
  { id: 'r56', emoji: '👨‍👩‍👧‍👦', cat: 'family', dimsTweak: { soc: 0.1 },
    no: { q: 'Er det viktig at det er greit å komme innom uten stress (og med barn)?', desc: 'Enkel logistikk.' },
    en: { q: 'Is it important that it is easy to drop in without stress (and with kids)?', desc: 'Easy logistics.' },
  },
  { id: 'r57', emoji: '🔇', cat: 'quiet', dimsTweak: { soc: -0.1 },
    no: { q: 'Setter du pris på steder der du faktisk kan høre samtalen?', desc: 'Lydnivå betyr mer enn man tror.' },
    en: { q: 'Do you value places where you can actually hear the conversation?', desc: 'Noise level matters more than you think.' },
  },
  { id: 'r58', emoji: '⏱️', cat: 'quick', dimsTweak: { spont: 0.1 },
    no: { q: 'Er “raskt inn, raskt ut” en feature, ikke en bug?', desc: 'Mat er drivstoff (noen ganger).' },
    en: { q: 'Is “in and out quickly” a feature, not a bug?', desc: 'Food is fuel (sometimes).' },
  },
  { id: 'r59', emoji: '🍔', cat: 'casual', dimsTweak: { lux: -0.1 },
    no: { q: 'Er du glad i smashburger/enkle “diner”-steder?', desc: 'Ukomplisert og digg.' },
    en: { q: 'Do you like smash burgers / simple diner spots?', desc: 'Uncomplicated and satisfying.' },
  },
  { id: 'r60', emoji: '🍕', cat: 'casual', dimsTweak: { soc: 0.1 },
    no: { q: 'Er “slice”/pizza på farta en perfekt løsning?', desc: 'Rett i hånda.' },
    en: { q: 'Is grabbing a slice of pizza on the go perfect?', desc: 'Straight in your hand.' },
  },

  // Sharing / fine
  { id: 'r61', emoji: '🧆', cat: 'sharing', dimsTweak: { soc: 0.1 },
    no: { q: 'Liker du å bestille mange småretter i stedet for én hovedrett?', desc: 'Variasjon slår alt.' },
    en: { q: 'Do you like ordering many small plates instead of one main?', desc: 'Variety beats everything.' },
  },
  { id: 'r62', emoji: '🥂', cat: 'fine', dimsTweak: { lux: 0.0 },
    no: { q: 'Er tasting menu (mange små serveringer) noe du liker?', desc: 'La kjøkkenet fortelle en historie.' },
    en: { q: 'Do you enjoy tasting menus (many small courses)?', desc: 'Let the kitchen tell a story.' },
  },
  { id: 'r63', emoji: '⭐', cat: 'fine', dimsTweak: { lux: 0.0 },
    no: { q: 'Er du villig til å booke langt i forveien for et “top spot”?', desc: 'Planlegging for kvalitet.' },
    en: { q: 'Are you willing to book far ahead for a top spot?', desc: 'Planning for quality.' },
  },
  { id: 'r64', emoji: '💸', cat: 'fine', dimsTweak: { lux: 0.0 },
    no: { q: 'Er du ok med å betale litt mer for råvarer og service?', desc: 'Når totalen sitter.' },
    en: { q: 'Are you okay paying more for ingredients and service?', desc: 'When the whole package works.' },
  },

  // Local gems / coffee / dessert
  { id: 'r65', emoji: '🥖', cat: 'local', dimsTweak: { cul: 0.1 },
    no: { q: 'Liker du “nabolagsbistro” fremfor trendy steder?', desc: 'Stabilt og ekte.' },
    en: { q: 'Do you prefer a neighbourhood bistro over a trendy spot?', desc: 'Reliable and real.' },
  },
  { id: 'r66', emoji: '🍨', cat: 'dessert', dimsTweak: { spont: 0.1 },
    no: { q: 'Er gelato/isbar en fast tradisjon på tur?', desc: 'En liten lykkepause.' },
    en: { q: 'Is gelato/ice cream a travel tradition for you?', desc: 'A small happiness break.' },
  },
  { id: 'r67', emoji: '🍰', cat: 'dessert', dimsTweak: { lux: 0.1 },
    no: { q: 'Kake/konditori: prioriterer du det i nye byer?', desc: 'Søtt + kaffe = kartlegging.' },
    en: { q: 'Pastry shops: do you prioritize them in new cities?', desc: 'Sweet + coffee = exploration.' },
  },
  { id: 'r68', emoji: '☕', cat: 'coffee', dimsTweak: { soc: 0.1 },
    no: { q: 'Liker du kaféer der du kan sitte lenge og se på folk?', desc: 'En stol, en kopp, en by.' },
    en: { q: 'Do you like cafés where you can sit for a long time and people-watch?', desc: 'A chair, a cup, a city.' },
  },

  // Streetfood continue
  { id: 'r69', emoji: '🍲', cat: 'streetfood', dimsTweak: { night: 0.1 },
    no: { q: 'Er “noodle soup” fra et lite sted et trygt valg for deg?', desc: 'Varmt og raskt.' },
    en: { q: 'Is a bowl of noodle soup from a small spot a safe pick for you?', desc: 'Warm and quick.' },
  },
  { id: 'r70', emoji: '🥤', cat: 'streetfood', dimsTweak: { soc: 0.1 },
    no: { q: 'Liker du å prøve lokale drikker (bubble tea, limonade, etc.)?', desc: 'Smak som souvenir.' },
    en: { q: 'Do you like trying local drinks (bubble tea, lemonade, etc.)?', desc: 'Flavor as a souvenir.' },
  },

  // Fill to r100 with additional balanced cards
  ...Array.from({ length: 30 }, (_, i) => {
    const n = 71 + i;
    const id = `r${n}`;
    // Rotate categories to ensure coverage.
    const picks = [
      { cat: 'cuisine', emoji: '🍲', noQ: 'Liker du å bestille dagens spesial for å prøve noe nytt?', enQ: 'Do you like ordering the daily special to try something new?', noD: 'Litt risiko, ofte belønning.', enD: 'A bit of risk, often rewarded.', tweak: { spont: 0.2 } },
      { cat: 'sharing', emoji: '🍽️', noQ: 'Synes du “bestill litt av alt” er den beste strategien?', enQ: 'Do you think “order a bit of everything” is the best strategy?', noD: 'Flere små ja enn ett stort valg.', enD: 'Many small yeses over one big decision.', tweak: { soc: 0.1 } },
      { cat: 'local', emoji: '🧭', noQ: 'Kan du gå et stykke til fots for en lokal favoritt?', enQ: 'Would you walk a bit further for a local favourite?', noD: 'Du liker å “tjene” maten.', enD: 'You like to earn the meal.', tweak: { act: 0.1, spont: 0.1 } },
      { cat: 'ambience', emoji: '🪟', noQ: 'Er et vindusbord eller fin utsikt en stor bonus?', enQ: 'Is a window table or a great view a big bonus?', noD: 'Du merker detaljer.', enD: 'You notice details.', tweak: { lux: 0.1 } },
      { cat: 'quick', emoji: '🥡', noQ: 'Er “bra takeaway” helt topp på reise?', enQ: 'Is good takeout a top-tier travel move?', noD: 'Mindre tid, mer by.', enD: 'Less time, more city.', tweak: { spont: 0.1 } },
      { cat: 'diet', emoji: '🥜', noQ: 'Er du opptatt av allergi-/ingredienstransparens?', enQ: 'Do you care about allergy/ingredient transparency?', noD: 'Trygghet først.', enD: 'Safety first.', tweak: { } },
      { cat: 'lively', emoji: '🎉', noQ: 'Liker du steder der det er litt kø og “happening”?', enQ: 'Do you like places with a bit of a line and a “happening” vibe?', noD: 'Energi smitter.', enD: 'Energy is contagious.', tweak: { night: 0.1 } },
      { cat: 'quiet', emoji: '🪑', noQ: 'Foretrekker du rolige steder med lange pauser mellom bordene?', enQ: 'Do you prefer calm places with space between tables?', noD: 'Lavt stress, bedre samtaler.', enD: 'Lower stress, better conversations.', tweak: { } },
      { cat: 'brunch', emoji: '🍳', noQ: 'Er frokost hele dagen en favoritt?', enQ: 'Is breakfast-all-day a favourite?', noD: 'Egg + kaffe = lykke.', enD: 'Eggs + coffee = happiness.', tweak: { } },
      { cat: 'seafood', emoji: '🐙', noQ: 'Synes du blekksprut/calamari er godt når det er gjort riktig?', enQ: 'Do you like octopus/calamari when it is done right?', noD: 'Mykt, grillet, sitron.', enD: 'Tender, grilled, lemon.', tweak: { } },
    ];
    const pick = picks[i % picks.length];
    return {
      id,
      emoji: pick.emoji,
      cat: pick.cat,
      dimsTweak: pick.tweak,
      no: { q: pick.noQ, desc: pick.noD },
      en: { q: pick.enQ, desc: pick.enD },
    };
  }),
];

// Flatten NEW_REST (since we appended an array at the end)
const NEW_REST_FLAT = NEW_REST.flat();

// ---------------------------------------------------------------------------
// Build dataset entries + i18n
// ---------------------------------------------------------------------------

const cards = [];
const i18nEn = {};
const i18nNo = {};
const i18nSv = {};

function addI18n(key, { en, no, sv }) {
  i18nEn[key] = en;
  i18nNo[key] = no;
  i18nSv[key] = sv ?? en;
}

// Dims + deck names
for (const [dim, label] of Object.entries(DIM_LABELS.en)) {
  addI18n(`dims.${dim}`, { en: label, no: DIM_LABELS.no[dim], sv: DIM_LABELS.sv[dim] });
}
addI18n('decks.experiences', { en: 'Experiences', no: 'Opplevelser', sv: 'Upplevelser' });
addI18n('decks.restaurants', { en: 'Restaurants', no: 'Restauranter', sv: 'Restauranger' });
addI18n('facet.category', { en: 'Category', no: 'Kategori', sv: 'Kategori' });
addI18n('facet.dim', { en: 'Dimension', no: 'Dimensjon', sv: 'Dimension' });

// Categories
for (const [cat, labels] of Object.entries(CAT_LABELS.experiences)) {
  addI18n(`cats.${cat}`, { en: labels.en, no: labels.no, sv: labels.sv });
}
for (const [cat, labels] of Object.entries(CAT_LABELS.restaurants)) {
  addI18n(`cats.${cat}`, { en: labels.en, no: labels.no, sv: labels.sv });
}

function pushCard({ id, emoji, modes, cat, dims, qNo, dNo, qEn, dEn }) {
  const qKey = `cards.${id}.q`;
  const descKey = `cards.${id}.desc`;

  cards.push({
    id,
    emoji,
    modes,
    cat,
    qKey,
    descKey,
    dims,
    facets: [{ facetId: 'category', valueId: cat }],
  });

  addI18n(qKey, { en: qEn, no: qNo, sv: qEn });
  addI18n(descKey, { en: dEn, no: dNo, sv: dEn });
}

// Legacy experiences
for (const id of [...prefEnById.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
  const en = prefEnById.get(id);
  const no = prefNoById.get(id);
  if (!en || !no) throw new Error(`Missing legacy pref translations for ${id}`);

  const canonCat = EXP_CAT_CANON[no.cat] ?? en.cat;
  pushCard({
    id,
    emoji: en.emoji,
    modes: ['experiences'],
    cat: canonCat,
    dims: en.dims,
    qNo: no.q,
    dNo: no.desc,
    qEn: en.q,
    dEn: en.desc,
  });
}

// Legacy restaurants
for (const id of [...restEnById.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
  const en = restEnById.get(id);
  const no = restNoById.get(id);
  if (!en || !no) throw new Error(`Missing legacy restaurant translations for ${id}`);

  pushCard({
    id,
    emoji: en.emoji,
    modes: ['restaurants'],
    cat: en.cat,
    dims: en.dims,
    qNo: no.q,
    dNo: no.desc,
    qEn: en.q,
    dEn: en.desc,
  });
}

// New experiences
for (const c of NEW_EXP) {
  const base = BASE_DIMS_EXP[c.cat];
  if (!base) throw new Error(`Unknown base dims exp cat: ${c.cat}`);
  const dims = buildDims(base, c.dimsTweak);
  pushCard({
    id: c.id,
    emoji: c.emoji,
    modes: ['experiences'],
    cat: c.cat,
    dims,
    qNo: c.no.q,
    dNo: c.no.desc,
    qEn: c.en.q,
    dEn: c.en.desc,
  });
}

// New restaurants
for (const c of NEW_REST_FLAT) {
  const base = BASE_DIMS_REST[c.cat];
  if (!base) throw new Error(`Unknown base dims rest cat: ${c.cat}`);
  const dims = buildDims(base, c.dimsTweak);
  pushCard({
    id: c.id,
    emoji: c.emoji,
    modes: ['restaurants'],
    cat: c.cat,
    dims,
    qNo: c.no.q,
    dNo: c.no.desc,
    qEn: c.en.q,
    dEn: c.en.desc,
  });
}

// Counts + decks
const expIds = cards.filter((c) => c.modes.includes('experiences')).map((c) => c.id).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
const restIds = cards.filter((c) => c.modes.includes('restaurants')).map((c) => c.id).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

if (expIds.length < 100) throw new Error(`experiences deck too small: ${expIds.length}`);
if (restIds.length < 100) throw new Error(`restaurants deck too small: ${restIds.length}`);

writeJson(OUT_CARDS, { version: 'v2.0.0', cards });
writeJson(OUT_DECKS, {
  version: 'v2.0.0',
  decks: [
    { id: 'experiences-default', mode: 'experiences', nameKey: 'decks.experiences', cardIds: expIds },
    { id: 'restaurants-default', mode: 'restaurants', nameKey: 'decks.restaurants', cardIds: restIds },
  ],
});

// i18n (sv currently mirrors en for cards; dims/categories have sv strings)
writeJson(OUT_I18N_EN, i18nEn);
writeJson(OUT_I18N_NO, i18nNo);
writeJson(OUT_I18N_SV, i18nSv);

// Taxonomy (facets)
const taxonomy = {
  version: 'v2.0.0',
  facets: [
    {
      id: 'category',
      labelKey: 'facet.category',
      values: [
        ...Object.keys(CAT_LABELS.experiences).map((id) => ({ id, labelKey: `cats.${id}`, modes: ['experiences'] })),
        ...Object.keys(CAT_LABELS.restaurants).map((id) => ({ id, labelKey: `cats.${id}`, modes: ['restaurants'] })),
      ],
    },
    {
      id: 'dim',
      labelKey: 'facet.dim',
      values: Object.keys(DIM_LABELS.en).map((id) => ({ id, labelKey: `dims.${id}` })),
    },
  ],
};
writeJson(OUT_TAXONOMY, taxonomy);

console.log(`Generated cards: experiences=${expIds.length}, restaurants=${restIds.length}, total=${cards.length}`);
