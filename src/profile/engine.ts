import { DIMS, type Card, type DimId, type Mode } from '../dataset';

export type Reaction = 'love' | 'like' | 'skip' | 'dislike';

export type ReactionRecord = {
  cardId: string;
  reaction: Reaction;
  answeredAt: number;
};

export type TripContext = {
  party: 'solo' | 'couple' | 'friends' | 'family';
  pace: 'slow' | 'balanced' | 'full';
  budget: 'value' | 'balanced' | 'premium';
  discovery: 'icons' | 'mix' | 'hidden';
};

export type AxisScore = {
  value: number;
  confidence: number;
  evidence: number;
};

export type PreferenceProfile = {
  dims: Record<DimId, AxisScore>;
  categories: Record<string, AxisScore>;
  informativeCount: number;
  skippedCount: number;
  categoryCoverage: number;
  readiness: number;
  ready: boolean;
};

export type StoredProfile = {
  version: 2;
  reactions: Record<Mode, Record<string, ReactionRecord>>;
  corrections: Partial<Record<DimId, number>>;
};

const REACTION_WEIGHT: Record<Reaction, number> = {
  love: 1.2,
  like: 0.7,
  skip: 0,
  // A rejection of a multi-attribute card is ambiguous, so it is intentionally
  // weaker than a positive response.
  dislike: -0.55,
};

const DIM_PRIOR = 1.8;
const CATEGORY_PRIOR = 1.2;
const MANUAL_EVIDENCE = 4.5;

function clamp(value: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function confidenceFromEvidence(evidence: number) {
  return clamp(1 - Math.exp(-evidence / 4.2), 0, 1);
}

function emptyDims(): Record<DimId, { numerator: number; evidence: number }> {
  return Object.fromEntries(
    DIMS.map((dim) => [dim, { numerator: 0, evidence: 0 }]),
  ) as Record<DimId, { numerator: number; evidence: number }>;
}

export function createEmptyStoredProfile(): StoredProfile {
  return {
    version: 2,
    reactions: { experiences: {}, restaurants: {} },
    corrections: {},
  };
}

export function computeProfile(
  reactions: Record<string, ReactionRecord>,
  cards: Card[],
  corrections: Partial<Record<DimId, number>> = {},
): PreferenceProfile {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const dimStats = emptyDims();
  const categoryStats: Record<string, { numerator: number; evidence: number }> = {};
  let informativeCount = 0;
  let skippedCount = 0;

  for (const record of Object.values(reactions)) {
    const card = cardById.get(record.cardId);
    if (!card) continue;

    const weight = REACTION_WEIGHT[record.reaction];
    if (weight === 0) {
      skippedCount += 1;
      continue;
    }

    informativeCount += 1;
    const category = categoryStats[card.cat] ?? { numerator: 0, evidence: 0 };
    category.numerator += weight;
    category.evidence += Math.abs(weight);
    categoryStats[card.cat] = category;

    // A negative reaction should not invert every weak attribute on a composite
    // card. Limit it to the three strongest axes; positive signals use the full card.
    const activeDims = record.reaction === 'dislike'
      ? new Set(
          Object.entries(card.dims)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 3)
            .map(([dim]) => dim),
        )
      : null;

    for (const dim of DIMS) {
      if (activeDims && !activeDims.has(dim)) continue;
      const cardValue = Number(card.dims[dim] ?? 0);
      if (Math.abs(cardValue) < 0.12) continue;
      const evidence = Math.abs(cardValue) * Math.abs(weight);
      dimStats[dim].numerator += weight * cardValue;
      dimStats[dim].evidence += evidence;
    }
  }

  const dims = Object.fromEntries(
    DIMS.map((dim) => {
      const stat = dimStats[dim];
      const correction = corrections[dim];
      const hasCorrection = typeof correction === 'number' && Number.isFinite(correction);
      const evidence = stat.evidence + (hasCorrection ? MANUAL_EVIDENCE : 0);
      const numerator = stat.numerator + (hasCorrection ? clamp(correction) * MANUAL_EVIDENCE : 0);
      return [
        dim,
        {
          value: clamp(numerator / (evidence + DIM_PRIOR)),
          confidence: confidenceFromEvidence(evidence),
          evidence,
        },
      ];
    }),
  ) as Record<DimId, AxisScore>;

  const categories = Object.fromEntries(
    Object.entries(categoryStats).map(([category, stat]) => [
      category,
      {
        value: clamp(stat.numerator / (stat.evidence + CATEGORY_PRIOR)),
        confidence: confidenceFromEvidence(stat.evidence),
        evidence: stat.evidence,
      },
    ]),
  );

  const categoryCoverage = Object.values(categoryStats).filter((stat) => stat.evidence > 0).length;
  const meanConfidence = DIMS.reduce((sum, dim) => sum + dims[dim].confidence, 0) / DIMS.length;
  const readiness = clamp(
    meanConfidence * 0.52
      + Math.min(1, categoryCoverage / 6) * 0.28
      + Math.min(1, informativeCount / 8) * 0.2,
    0,
    1,
  );

  return {
    dims,
    categories,
    informativeCount,
    skippedCount,
    categoryCoverage,
    readiness,
    ready: informativeCount >= 5 && readiness >= 0.31,
  };
}

function stableJitter(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

export function selectNextCard(
  cards: Card[],
  reactions: Record<string, ReactionRecord>,
  profile: PreferenceProfile,
): Card | null {
  const answered = new Set(Object.keys(reactions));
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const categoryCounts: Record<string, number> = {};
  for (const record of Object.values(reactions)) {
    const card = cardById.get(record.cardId);
    if (card && record.reaction !== 'skip') {
      categoryCounts[card.cat] = (categoryCounts[card.cat] ?? 0) + 1;
    }
  }

  const candidates = cards.filter((card) => !answered.has(card.id));
  if (!candidates.length) return null;

  return candidates
    .map((card) => {
      const uncertainty = DIMS.reduce(
        (sum, dim) => sum + Math.abs(card.dims[dim] ?? 0) * (1 - profile.dims[dim].confidence),
        0,
      );
      const discrimination = DIMS.reduce(
        (sum, dim) => sum + Math.max(0, Math.abs(card.dims[dim] ?? 0) - 0.25),
        0,
      );
      const categoryNovelty = categoryCounts[card.cat] ? 0 : 2.3;
      const categoryBalance = 1 / (1 + (categoryCounts[card.cat] ?? 0));
      const knownTasteProbe = DIMS.reduce(
        (sum, dim) => sum + Math.abs(card.dims[dim] ?? 0) * Math.abs(profile.dims[dim].value),
        0,
      );
      const jitter = stableJitter(`${card.id}:${profile.informativeCount}`) * 0.35;
      return {
        card,
        score: uncertainty + discrimination * 0.28 + categoryNovelty + categoryBalance + knownTasteProbe * 0.12 + jitter,
      };
    })
    .sort((a, b) => b.score - a.score)[0].card;
}

export function profileToBackend(
  profile: PreferenceProfile,
  context: TripContext,
) {
  const prefs = Object.fromEntries(
    DIMS.map((dim) => [dim, Number(profile.dims[dim].value.toFixed(3))]),
  );
  const confidence = Object.fromEntries(
    DIMS.map((dim) => [dim, Number(profile.dims[dim].confidence.toFixed(3))]),
  );
  const cats = Object.fromEntries(
    Object.entries(profile.categories).map(([category, score]) => [
      category,
      Number(score.value.toFixed(3)),
    ]),
  );

  return {
    prefs,
    taste: {
      version: 2,
      cats,
      confidence,
      context,
      totalSignals: profile.informativeCount,
      readiness: Number(profile.readiness.toFixed(3)),
    },
  };
}
