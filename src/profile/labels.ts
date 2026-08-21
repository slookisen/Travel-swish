import type { DimId } from '../dataset';
import type { AppLanguage } from '../app/i18n';

export const DIM_LABELS: Record<DimId, { label: string; low: string; high: string; icon: string }> = {
  adv: { label: 'Eventyrlyst', low: 'Trygt', high: 'Pulshøyde', icon: '↗' },
  soc: { label: 'Sosialt', low: 'For meg selv', high: 'Møte folk', icon: '◎' },
  lux: { label: 'Komfort', low: 'Enkelt', high: 'Premium', icon: '✦' },
  act: { label: 'Aktivitet', low: 'Rolig', high: 'I bevegelse', icon: '≈' },
  cul: { label: 'Kultur', low: 'Lett', high: 'Fordypning', icon: '◫' },
  nat: { label: 'Natur', low: 'Urbant', high: 'Ut i det fri', icon: '⌁' },
  food: { label: 'Matfokus', low: 'Praktisk', high: 'Gastronomi', icon: '◇' },
  night: { label: 'Kveldsliv', low: 'Tidlig kveld', high: 'Etter midnatt', icon: '◐' },
  spont: { label: 'Oppdagelse', low: 'Ikonisk', high: 'Skjulte funn', icon: '✺' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  adrenaline: 'adrenalin',
  relaxation: 'ro',
  culture: 'kultur',
  food: 'mat',
  nature: 'natur',
  social: 'sosialt',
  nightlife: 'kveldsliv',
  luxury: 'komfort',
  spontaneous: 'skjulte funn',
  learning: 'læring',
  shopping: 'shopping',
  pace: 'tempo',
  cuisine: 'kjøkken',
  casual: 'uformelt',
  spicy: 'sterkt',
  fine: 'fine dining',
  fresh: 'friskt',
  drinks: 'drikke',
  sharing: 'deling',
  hearty: 'rustikt',
  ambience: 'atmosfære',
  lively: 'livlig',
  quick: 'raskt',
  dessert: 'dessert',
  local: 'lokalt',
  craft: 'håndverk',
  diet: 'kosthold',
  family: 'familie',
  quiet: 'rolig',
  brunch: 'brunsj',
  seafood: 'sjømat',
  bbq: 'grill',
  streetfood: 'gatemat',
  coffee: 'kaffe',
};

export const DIM_LABELS_EN: typeof DIM_LABELS = {
  adv: { label: 'Adventure', low: 'Safe', high: 'Adrenaline', icon: '↗' },
  soc: { label: 'Social', low: 'Time alone', high: 'Meet people', icon: '◎' },
  lux: { label: 'Comfort', low: 'Simple', high: 'Premium', icon: '✦' },
  act: { label: 'Activity', low: 'Relaxed', high: 'On the move', icon: '≈' },
  cul: { label: 'Culture', low: 'Light', high: 'Immersive', icon: '◫' },
  nat: { label: 'Nature', low: 'Urban', high: 'Outdoors', icon: '⌁' },
  food: { label: 'Food focus', low: 'Practical', high: 'Gastronomy', icon: '◇' },
  night: { label: 'Nightlife', low: 'Early night', high: 'After midnight', icon: '◐' },
  spont: { label: 'Discovery', low: 'Iconic', high: 'Hidden gems', icon: '✺' },
};

export const CATEGORY_LABELS_EN: Record<string, string> = {
  adrenaline: 'adrenaline', relaxation: 'relaxation', culture: 'culture', food: 'food', nature: 'nature', social: 'social',
  nightlife: 'nightlife', luxury: 'comfort', spontaneous: 'hidden gems', learning: 'learning', shopping: 'shopping', pace: 'pace',
  cuisine: 'cuisine', casual: 'casual', spicy: 'spicy', fine: 'fine dining', fresh: 'fresh', drinks: 'drinks', sharing: 'sharing',
  hearty: 'hearty', ambience: 'ambience', lively: 'lively', quick: 'quick', dessert: 'dessert', local: 'local', craft: 'craft',
  diet: 'diet', family: 'family', quiet: 'quiet', brunch: 'brunch', seafood: 'seafood', bbq: 'barbecue', streetfood: 'street food', coffee: 'coffee',
};

export function getDimLabels(language: AppLanguage) {
  return language === 'en' ? DIM_LABELS_EN : DIM_LABELS;
}

export function getCategoryLabel(language: AppLanguage, category: string) {
  const labels = language === 'en' ? CATEGORY_LABELS_EN : CATEGORY_LABELS;
  return labels[category] || category;
}
