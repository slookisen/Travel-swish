# Dataset (v2)

This folder makes the swipe deck **data-driven**.

## Layout

- `cards/`
  - `all.json` — canonical list of cards (schema-validated at runtime via Zod)
- `decks/`
  - `decks.json` — which card IDs are active per mode
- `taxonomy/`
  - `facets.json` — minimal facet taxonomy (currently `category` + `dim`)
- `i18n/`
  - `en.json`, `no.json`, `sv.json` — flat key/value translations

## Card model (high level)

A card is stored as an entry with i18n keys:

- `qKey` → question text
- `descKey` → short description

At runtime, `getDeckCards(mode, lang)` resolves keys via `t(lang, key)` and returns UI-ready cards.

## Validation

- `src/dataset/schema.ts` contains Zod schemas.
- Validation runs when importing the dataset module (fail fast in dev/build).

## Regenerating cards

The initial v2 batch is generated from legacy cards + additional seeds:

```bash
npm run cards:gen
```

This overwrites:

- `src/dataset/cards/all.json`
- `src/dataset/decks/decks.json`
- `src/dataset/i18n/*.json`
- `src/dataset/taxonomy/facets.json`
