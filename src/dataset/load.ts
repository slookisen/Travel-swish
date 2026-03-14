import cardsData from './cards/all.json';
import decksData from './decks/decks.json';
import { CardsFileSchema, DeckFileSchema } from './schema';
import { DIMS, type Card, type CardEntry, type Deck, type DimId, type Lang, type Mode } from './types';
import { t } from './i18n';

const parsedCards = CardsFileSchema.parse(cardsData);
const parsedDecks = DeckFileSchema.parse(decksData);

const cardById = new Map<string, CardEntry>();
for (const c of parsedCards.cards as unknown as CardEntry[]) {
  if (cardById.has(c.id)) {
    // Fail fast on duplicate IDs.
    throw new Error(`Duplicate card id: ${c.id}`);
  }
  cardById.set(c.id, c);
}

function fillDims(partial: Partial<Record<DimId, number>>): Record<DimId, number> {
  const full = Object.fromEntries(DIMS.map((d) => [d, 0])) as Record<DimId, number>;
  for (const [k, v] of Object.entries(partial || {})) {
    if (!(DIMS as readonly string[]).includes(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) {
      (full as any)[k] = v;
    }
  }
  return full;
}

export function getDeck(mode: Mode): Deck {
  const deck = (parsedDecks.decks as unknown as Deck[]).find((d) => d.mode === mode);
  if (!deck) throw new Error(`No deck found for mode: ${mode}`);
  return deck;
}

export function getDeckCards(mode: Mode, lang: Lang): Card[] {
  const deck = getDeck(mode);
  const out: Card[] = [];

  for (const id of deck.cardIds) {
    const entry = cardById.get(id);
    if (!entry) throw new Error(`Deck ${deck.id} references missing card id: ${id}`);
    if (!entry.modes.includes(mode)) throw new Error(`Card ${id} not enabled for mode ${mode} (modes=${entry.modes.join(',')})`);

    out.push({
      id: entry.id,
      emoji: entry.emoji,
      q: t(lang, entry.qKey),
      desc: t(lang, entry.descKey),
      cat: entry.cat,
      dims: fillDims(entry.dims),
    });
  }

  return out;
}

export function getDatasetCounts() {
  const exp = getDeck('experiences').cardIds.length;
  const rest = getDeck('restaurants').cardIds.length;
  return { experiences: exp, restaurants: rest, total: parsedCards.cards.length };
}
