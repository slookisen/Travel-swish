/**
 * queryGen.ts — Query generation from user preferences × destination × mode
 *
 * Produces diverse, weighted search queries (e.g. for Google Places, Unsplash,
 * GetYourGuide) by combining:
 *   1. Mode-specific query templates
 *   2. Facet → keyword mappings (what the user swiped right on)
 *   3. Destination-aware local colour (landmarks, cuisines, neighbourhoods)
 *   4. Negative keywords to filter irrelevant noise
 *
 * Design goals:
 *   - Pure functions, zero side-effects, no network calls
 *   - Deterministic given the same inputs (seeded shuffle via simple hash)
 *   - Works in browser and Node (no DOM/fs deps)
 *
 * @module queryGen
 */

// ─── Types ──────────────────────────────────────────────────────────────────

import type { Mode, DimId } from './dataset/types';

/** A user's preference profile (dimension scores from swiping). */
export type PrefProfile = Partial<Record<DimId, number>>;

/** A single generated query with metadata. */
export interface GeneratedQuery {
  /** The actual search string. */
  query: string;
  /** Relative weight 0..1 (higher = more relevant to the profile). */
  weight: number;
  /** Which facet/category drove this query (for dedup/debug). */
  source: string;
  /** Negative keywords to exclude from results. */
  negatives: string[];
}

/** Options bag for `generateQueries`. */
export interface QueryGenOptions {
  /** Max queries to return (default 5). */
  maxQueries?: number;
  /** Language hint for locale-aware phrasing (default 'en'). */
  lang?: 'en' | 'no' | 'sv';
  /** Optional seed for deterministic ordering. */
  seed?: number;
}

// ─── Constants: Facet → Keyword mappings ────────────────────────────────────

/**
 * Maps each experience-mode facet category to an array of search keyword
 * fragments. These get combined with destination + template.
 */
export const EXPERIENCE_KEYWORDS: Record<string, string[]> = {
  adrenaline: [
    'extreme sports', 'adventure tour', 'bungee jumping', 'paragliding',
    'zip-line', 'white water rafting', 'skydiving experience',
  ],
  relaxation: [
    'spa retreat', 'wellness experience', 'yoga class', 'hammam',
    'thermal baths', 'meditation session', 'sunset cruise',
  ],
  culture: [
    'museum tour', 'art gallery', 'historical walking tour', 'heritage site',
    'local festival', 'traditional performance', 'archaeological tour',
  ],
  food: [
    'food tour', 'cooking class', 'street food walk', 'market tour',
    'wine tasting', 'farm to table', 'culinary workshop',
  ],
  nature: [
    'hiking trail', 'nature walk', 'national park tour', 'wildlife safari',
    'botanical garden', 'kayaking', 'snorkelling trip',
  ],
  social: [
    'pub crawl', 'group tour', 'meetup event', 'hostel social',
    'beach party', 'dance class', 'local community event',
  ],
  nightlife: [
    'nightclub', 'rooftop bar', 'live music venue', 'jazz club',
    'cocktail bar', 'late night food', 'night market',
  ],
  luxury: [
    'private tour', 'luxury yacht', 'fine dining experience', 'helicopter tour',
    'five star hotel', 'VIP access', 'champagne tasting',
  ],
  spontaneous: [
    'hidden gem', 'off the beaten path', 'surprise experience', 'secret spot',
    'local hangout', 'unplanned adventure', 'serendipity walk',
  ],
  learning: [
    'workshop', 'language class', 'pottery class', 'photography tour',
    'history lecture', 'science museum', 'craft workshop',
  ],
  shopping: [
    'local market', 'vintage shop', 'souvenir shopping', 'artisan crafts',
    'flea market', 'designer boutique', 'antique store',
  ],
  pace: [
    'slow travel', 'leisurely stroll', 'scenic route', 'bike tour',
    'canal cruise', 'countryside drive', 'train journey',
  ],
};

/**
 * Maps each restaurant-mode facet category to search keyword fragments.
 */
export const RESTAURANT_KEYWORDS: Record<string, string[]> = {
  cuisine: [
    'best local restaurant', 'authentic cuisine', 'traditional dishes',
    'regional food', 'signature dish',
  ],
  casual: [
    'casual dining', 'bistro', 'neighbourhood cafe', 'cozy restaurant',
    'laid back eatery',
  ],
  spicy: [
    'spicy food', 'hot chili restaurant', 'Thai restaurant', 'Sichuan cuisine',
    'Mexican cantina', 'curry house',
  ],
  fine: [
    'fine dining', 'Michelin star', 'tasting menu', 'upscale restaurant',
    'chef table experience',
  ],
  fresh: [
    'fresh seafood', 'salad bar', 'organic restaurant', 'farm fresh',
    'raw bar', 'poke bowl',
  ],
  drinks: [
    'wine bar', 'cocktail restaurant', 'craft beer pub', 'sake bar',
    'speakeasy', 'mezcal bar',
  ],
  sharing: [
    'tapas bar', 'mezze restaurant', 'shared plates', 'dim sum',
    'izakaya', 'family style dining',
  ],
  hearty: [
    'comfort food', 'steak house', 'BBQ restaurant', 'slow cooked',
    'ramen shop', 'soul food',
  ],
  ambience: [
    'romantic restaurant', 'candlelit dinner', 'scenic dining', 'garden restaurant',
    'waterfront restaurant', 'rooftop dining',
  ],
  lively: [
    'buzzy restaurant', 'live music dinner', 'open kitchen', 'food hall',
    'night market food', 'social dining',
  ],
  quick: [
    'fast casual', 'grab and go', 'food truck', 'counter service',
    'quick lunch spot',
  ],
  dessert: [
    'pastry shop', 'gelato', 'chocolate shop', 'bakery cafe',
    'dessert bar', 'sweet shop',
  ],
  local: [
    'local favourite', 'hidden gem restaurant', 'no tourist trap',
    'where locals eat', 'neighbourhood spot',
  ],
  craft: [
    'artisan bakery', 'craft coffee', 'small batch', 'handmade pasta',
    'sourdough pizza', 'micro roastery',
  ],
  diet: [
    'vegan restaurant', 'gluten free', 'vegetarian friendly',
    'plant based', 'health food',
  ],
  family: [
    'family friendly restaurant', 'kids menu', 'casual family dining',
    'all ages restaurant',
  ],
  quiet: [
    'quiet restaurant', 'intimate dining', 'peaceful cafe',
    'secluded table', 'library cafe',
  ],
  brunch: [
    'brunch spot', 'bottomless brunch', 'eggs benedict', 'pancake house',
    'morning cafe', 'weekend brunch',
  ],
  seafood: [
    'seafood restaurant', 'oyster bar', 'fish market restaurant',
    'sushi restaurant', 'ceviche bar',
  ],
  bbq: [
    'BBQ joint', 'smokehouse', 'grill restaurant', 'charcoal grill',
    'asado restaurant',
  ],
  streetfood: [
    'street food stall', 'hawker centre', 'food cart', 'night market food',
    'roadside eatery',
  ],
  coffee: [
    'specialty coffee', 'third wave coffee', 'coffee roastery',
    'espresso bar', 'latte art cafe',
  ],
};

// ─── Destination-aware local flavour ────────────────────────────────────────

/**
 * Per-destination overrides/extras that inject local colour into queries.
 * Only a curated subset — for unlisted destinations we fall back to generic.
 */
export const DESTINATION_COLOUR: Record<string, {
  /** Extra keywords to weave in. */
  keywords: string[];
  /** Famous neighbourhoods / areas to diversify location. */
  areas: string[];
  /** Iconic local food terms. */
  localFood: string[];
}> = {
  'tokyo': {
    keywords: ['izakaya', 'onsen', 'temple', 'anime district'],
    areas: ['Shibuya', 'Shinjuku', 'Asakusa', 'Harajuku', 'Ginza', 'Roppongi'],
    localFood: ['ramen', 'sushi', 'tempura', 'yakitori', 'matcha', 'okonomiyaki'],
  },
  'bangkok': {
    keywords: ['tuk-tuk tour', 'floating market', 'temple tour', 'Muay Thai'],
    areas: ['Sukhumvit', 'Khao San Road', 'Silom', 'Chinatown', 'Thonburi'],
    localFood: ['pad thai', 'som tam', 'mango sticky rice', 'tom yum', 'khao soi'],
  },
  'paris': {
    keywords: ['Eiffel Tower', 'Seine river', 'Montmartre', 'Louvre'],
    areas: ['Le Marais', 'Saint-Germain', 'Montmartre', 'Bastille', 'Belleville'],
    localFood: ['croissant', 'croque-monsieur', 'escargot', 'macaron', 'boeuf bourguignon'],
  },
  'barcelona': {
    keywords: ['Gaudi architecture', 'Gothic Quarter', 'Sagrada Familia', 'La Rambla'],
    areas: ['El Born', 'Gràcia', 'Barceloneta', 'Eixample', 'Raval'],
    localFood: ['tapas', 'paella', 'jamón ibérico', 'cava', 'pan con tomate'],
  },
  'new york': {
    keywords: ['Broadway show', 'Central Park', 'Statue of Liberty', 'Brooklyn Bridge'],
    areas: ['Manhattan', 'Brooklyn', 'Williamsburg', 'Harlem', 'SoHo', 'Lower East Side'],
    localFood: ['New York pizza', 'bagel', 'cheesecake', 'pastrami sandwich', 'hot dog'],
  },
  'roma': {
    keywords: ['Colosseum', 'Vatican', 'Trevi Fountain', 'Roman Forum'],
    areas: ['Trastevere', 'Testaccio', 'Monti', 'Centro Storico', 'Prati'],
    localFood: ['carbonara', 'cacio e pepe', 'supplì', 'gelato', 'pizza al taglio'],
  },
  'london': {
    keywords: ['Big Ben', 'Tower of London', 'West End show', 'Thames river'],
    areas: ['Soho', 'Shoreditch', 'Camden', 'Notting Hill', 'Borough', 'Brixton'],
    localFood: ['fish and chips', 'Sunday roast', 'full English', 'pie and mash', 'afternoon tea'],
  },
  'istanbul': {
    keywords: ['Hagia Sophia', 'Grand Bazaar', 'Bosphorus cruise', 'Blue Mosque'],
    areas: ['Sultanahmet', 'Beyoğlu', 'Kadıköy', 'Balat', 'Karaköy'],
    localFood: ['kebab', 'baklava', 'meze', 'börek', 'Turkish tea', 'lahmacun'],
  },
  'marrakech': {
    keywords: ['medina', 'Jemaa el-Fna', 'riad', 'souk'],
    areas: ['Medina', 'Gueliz', 'Mellah', 'Kasbah'],
    localFood: ['tagine', 'couscous', 'mint tea', 'pastilla', 'harira'],
  },
  'mexico city': {
    keywords: ['Frida Kahlo museum', 'Zócalo', 'Chapultepec', 'Xochimilco'],
    areas: ['Roma Norte', 'Condesa', 'Coyoacán', 'Polanco', 'Centro Histórico'],
    localFood: ['tacos al pastor', 'mole', 'churros', 'elote', 'mezcal'],
  },
  'seoul': {
    keywords: ['Gyeongbokgung Palace', 'Bukchon Hanok', 'K-pop', 'DMZ tour'],
    areas: ['Gangnam', 'Hongdae', 'Itaewon', 'Myeongdong', 'Insadong', 'Jongno'],
    localFood: ['bibimbap', 'Korean BBQ', 'tteokbokki', 'kimchi jjigae', 'soju'],
  },
  'bali': {
    keywords: ['rice terrace', 'temple ceremony', 'surf lesson', 'volcano trek'],
    areas: ['Ubud', 'Seminyak', 'Canggu', 'Uluwatu', 'Nusa Dua'],
    localFood: ['nasi goreng', 'babi guling', 'satay', 'jamu', 'mie goreng'],
  },
  'cape town': {
    keywords: ['Table Mountain', 'Cape Point', 'Robben Island', 'V&A Waterfront'],
    areas: ['Bo-Kaap', 'Woodstock', 'Camps Bay', 'Constantia', 'Long Street'],
    localFood: ['braai', 'bobotie', 'biltong', 'Cape Malay curry', 'rooibos'],
  },
  'buenos aires': {
    keywords: ['tango show', 'La Boca', 'Recoleta Cemetery', 'Plaza de Mayo'],
    areas: ['Palermo', 'San Telmo', 'Recoleta', 'La Boca', 'Puerto Madero'],
    localFood: ['asado', 'empanada', 'dulce de leche', 'choripán', 'malbec wine'],
  },
  'lisbon': {
    keywords: ['tram 28', 'Alfama', 'Belém Tower', 'fado music'],
    areas: ['Alfama', 'Bairro Alto', 'Chiado', 'Mouraria', 'LX Factory'],
    localFood: ['pastel de nata', 'bacalhau', 'francesinha', 'ginjinha', 'sardines'],
  },
  'amsterdam': {
    keywords: ['canal cruise', 'Rijksmuseum', 'Anne Frank House', 'Vondelpark'],
    areas: ['Jordaan', 'De Pijp', 'Oud-West', 'Negen Straatjes', 'Noord'],
    localFood: ['stroopwafel', 'bitterballen', 'herring', 'poffertjes', 'Dutch cheese'],
  },
  'oslo': {
    keywords: ['Vigeland Park', 'Opera House', 'Munch Museum', 'fjord cruise'],
    areas: ['Grünerløkka', 'Aker Brygge', 'Tjuvholmen', 'Tøyen', 'Majorstuen'],
    localFood: ['brunost', 'fårikål', 'raspeball', 'smoked salmon', 'aquavit'],
  },
};

// ─── Global negative keywords (per mode) ────────────────────────────────────

export const NEGATIVE_KEYWORDS: Record<Mode, string[]> = {
  experiences: [
    'timeshare', 'multilevel marketing', 'scam', 'tourist trap',
    'overpriced souvenir', 'chain restaurant', 'airport transfer only',
  ],
  restaurants: [
    'fast food chain', "McDonald's", 'Subway', 'Burger King',
    'airport food court', 'hospital cafeteria', 'vending machine',
  ],
};

/** Per-facet negative keywords for more targeted exclusion. */
export const FACET_NEGATIVES: Record<string, string[]> = {
  luxury:       ['budget', 'hostel', 'backpacker'],
  relaxation:   ['extreme', 'adrenaline', 'crowded'],
  adrenaline:   ['spa', 'meditation', 'gentle'],
  quiet:        ['loud', 'party', 'nightclub'],
  nightlife:    ['morning', 'sunrise', 'early bird'],
  fine:         ['fast food', 'takeaway', 'drive through'],
  diet:         ['deep fried', 'all you can eat buffet'],
  family:       ['bar only', 'adults only', '18+'],
};

// ─── Query template system ──────────────────────────────────────────────────

/**
 * Templates use `{dest}`, `{kw}`, `{area}`, `{localFood}` placeholders.
 * We pick diverse templates to avoid repetitive queries.
 */
const EXPERIENCE_TEMPLATES: string[] = [
  'best {kw} in {dest}',
  '{kw} {dest} for tourists',
  'top rated {kw} near {area} {dest}',
  '{dest} {kw} unique experience',
  'authentic {kw} {dest} local guide',
  'things to do {dest} {kw}',
  '{dest} {area} {kw} activity',
];

const RESTAURANT_TEMPLATES: string[] = [
  'best {kw} in {dest}',
  '{kw} restaurant {dest} {area}',
  'top rated {kw} near {area} {dest}',
  '{dest} authentic {kw} dining',
  'where to eat {localFood} in {dest}',
  '{dest} {kw} restaurant local favourite',
  '{area} {dest} {kw} food',
];

// ─── Core logic ─────────────────────────────────────────────────────────────

/** Simple deterministic hash for seed-based shuffle. */
function hashSeed(s: number, i: number): number {
  let h = (s * 2654435761 + i * 340573321) >>> 0;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return (h >>> 0) / 0xffffffff;
}

/** Pick a random element via seed. */
function pick<T>(arr: readonly T[], seed: number, idx: number): T {
  return arr[Math.floor(hashSeed(seed, idx) * arr.length)];
}

/** Get the top-N scoring facets from the preference profile. */
function topFacets(
  profile: PrefProfile,
  mode: Mode,
  n: number,
): Array<{ facet: string; score: number }> {
  const keywordMap = mode === 'restaurants' ? RESTAURANT_KEYWORDS : EXPERIENCE_KEYWORDS;
  const validFacets = new Set(Object.keys(keywordMap));

  // DimId → facet mapping: dims influence which facets are relevant.
  // We also accept direct facet names in the profile for flexibility.
  const DIM_TO_FACETS: Partial<Record<DimId, string[]>> = {
    adv:   ['adrenaline', 'spontaneous'],
    soc:   ['social', 'lively', 'sharing'],
    lux:   ['luxury', 'fine', 'ambience'],
    act:   ['adrenaline', 'nature', 'bbq'],
    cul:   ['culture', 'learning', 'local'],
    nat:   ['nature', 'relaxation', 'fresh'],
    food:  ['food', 'cuisine', 'streetfood', 'seafood', 'hearty', 'brunch'],
    night: ['nightlife', 'drinks', 'lively'],
    spont: ['spontaneous', 'quick', 'streetfood'],
  };

  // Accumulate scores per facet
  const scores = new Map<string, number>();
  for (const [dim, val] of Object.entries(profile)) {
    const mapped = DIM_TO_FACETS[dim as DimId] ?? [];
    for (const f of mapped) {
      if (validFacets.has(f)) {
        scores.set(f, (scores.get(f) ?? 0) + (val ?? 0));
      }
    }
  }

  // Also accept raw facet names in profile
  for (const [key, val] of Object.entries(profile)) {
    if (validFacets.has(key) && typeof val === 'number') {
      scores.set(key, (scores.get(key) ?? 0) + val);
    }
  }

  return [...scores.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([facet, score]) => ({ facet, score }));
}

/**
 * Fill a template string with the given values.
 */
function fillTemplate(
  template: string,
  dest: string,
  kw: string,
  area: string,
  localFood: string,
): string {
  return template
    .replace('{dest}', dest)
    .replace('{kw}', kw)
    .replace('{area}', area)
    .replace('{localFood}', localFood)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generate diverse, weighted search queries from a user's preference profile.
 *
 * @param mode        - 'experiences' or 'restaurants'
 * @param destination - destination slug (lowercase key from DEST_DB_COORDS, e.g. 'tokyo')
 * @param profile     - the user's swipe-derived preference scores
 * @param opts        - optional overrides
 * @returns           - array of GeneratedQuery, sorted by descending weight
 *
 * @example
 * ```ts
 * const queries = generateQueries('restaurants', 'tokyo', {
 *   food: 0.8, lux: 0.3, soc: 0.6, night: 0.4,
 * });
 * // → [
 * //   { query: 'best ramen shop in Tokyo', weight: 0.95, source: 'cuisine', negatives: [...] },
 * //   { query: 'izakaya Tokyo Shibuya local favourite', weight: 0.82, source: 'sharing', ... },
 * //   ...
 * // ]
 * ```
 */
export function generateQueries(
  mode: Mode,
  destination: string,
  profile: PrefProfile,
  opts: QueryGenOptions = {},
): GeneratedQuery[] {
  const { maxQueries = 5, seed = 42 } = opts;
  const destKey = destination.toLowerCase();
  const destDisplay = capitalise(destination);

  const colour = DESTINATION_COLOUR[destKey] ?? { keywords: [], areas: [], localFood: [] };
  const defaultArea = colour.areas[0] ?? 'city centre';
  const defaultFood = colour.localFood[0] ?? 'local speciality';

  const templates = mode === 'restaurants' ? RESTAURANT_TEMPLATES : EXPERIENCE_TEMPLATES;
  const keywordMap = mode === 'restaurants' ? RESTAURANT_KEYWORDS : EXPERIENCE_KEYWORDS;
  const globalNegs = NEGATIVE_KEYWORDS[mode];

  // 1. Rank facets by user preference
  const ranked = topFacets(profile, mode, maxQueries + 2);
  if (ranked.length === 0) {
    // Fallback: use the first 3 facets from the keyword map
    const fallbacks = Object.keys(keywordMap).slice(0, 3);
    for (const f of fallbacks) {
      ranked.push({ facet: f, score: 0.5 });
    }
  }

  // Normalise scores to 0..1 for weights
  const maxScore = Math.max(...ranked.map((r) => r.score), 0.001);

  // 2. Generate one query per top facet, using diverse templates and keywords
  const results: GeneratedQuery[] = [];
  const usedTemplates = new Set<number>();

  for (let i = 0; i < Math.min(ranked.length, maxQueries); i++) {
    const { facet, score } = ranked[i];
    const kws = keywordMap[facet] ?? ['things to do'];
    const kw = pick(kws, seed, i);

    // Pick a template we haven't used yet for diversity
    let tplIdx = Math.floor(hashSeed(seed, i + 100) * templates.length);
    let attempts = 0;
    while (usedTemplates.has(tplIdx) && attempts < templates.length) {
      tplIdx = (tplIdx + 1) % templates.length;
      attempts++;
    }
    usedTemplates.add(tplIdx);

    // Rotate through areas for location diversity
    const area = colour.areas.length > 0
      ? colour.areas[i % colour.areas.length]
      : defaultArea;
    const food = colour.localFood.length > 0
      ? colour.localFood[i % colour.localFood.length]
      : defaultFood;

    const query = fillTemplate(templates[tplIdx], destDisplay, kw, area, food);
    const weight = Math.round((0.5 + 0.5 * (score / maxScore)) * 100) / 100;

    // Combine global negatives with facet-specific ones
    const facetNegs = FACET_NEGATIVES[facet] ?? [];
    const negatives = [...new Set([...globalNegs, ...facetNegs])];

    results.push({ query, weight, source: facet, negatives });
  }

  // 3. Inject one local-colour bonus query if we have destination data
  if (colour.keywords.length > 0 && results.length < maxQueries) {
    const bonusKw = pick(colour.keywords, seed, 999);
    const bonusArea = pick(colour.areas.length > 0 ? colour.areas : [''], seed, 998);
    const bonusTpl = mode === 'restaurants'
      ? 'where to eat {localFood} in {dest}'
      : '{dest} {kw} unique experience';
    const bonusFood = pick(
      colour.localFood.length > 0 ? colour.localFood : [defaultFood],
      seed,
      997,
    );
    const query = fillTemplate(bonusTpl, destDisplay, bonusKw, bonusArea, bonusFood);

    results.push({
      query,
      weight: 0.6,
      source: 'destination-colour',
      negatives: globalNegs,
    });
  }

  // Sort by weight descending
  results.sort((a, b) => b.weight - a.weight);

  return results.slice(0, maxQueries);
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Convenience: build a `-keyword` exclusion string (e.g. for Google search).
 */
export function negativeString(negatives: string[]): string {
  return negatives.map((n) => `-"${n}"`).join(' ');
}

/**
 * Convenience: format a GeneratedQuery into a full search string with negatives.
 */
export function toSearchString(gq: GeneratedQuery): string {
  const negs = negativeString(gq.negatives);
  return negs ? `${gq.query} ${negs}` : gq.query;
}
