export type Mode = 'experiences' | 'restaurants';
export type Lang = 'no' | 'en' | 'sv';

export const DIMS = ['adv', 'soc', 'lux', 'act', 'cul', 'nat', 'food', 'night', 'spont'] as const;
export type DimId = (typeof DIMS)[number];

export type Card = {
  id: string;
  emoji: string;
  q: string;
  desc: string;
  cat: string;
  dims: Record<DimId, number>;
};

export type CardEntry = {
  id: string;
  emoji: string;
  modes: Mode[];
  cat: string;
  qKey: string;
  descKey: string;
  dims: Partial<Record<DimId, number>>;
  facets: Array<{ facetId: string; valueId: string }>;
  tags?: string[];
};

export type Deck = {
  id: string;
  mode: Mode;
  nameKey: string;
  cardIds: string[];
};
