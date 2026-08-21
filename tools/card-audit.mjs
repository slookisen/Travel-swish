import fs from 'node:fs';

const cardsFile = JSON.parse(fs.readFileSync('src/dataset/cards/all.json', 'utf8'));
const decksFile = JSON.parse(fs.readFileSync('src/dataset/decks/decks.json', 'utf8'));
const languages = ['no', 'en', 'sv'];
const translations = Object.fromEntries(languages.map((lang) => [
  lang,
  JSON.parse(fs.readFileSync(`src/dataset/i18n/${lang}.json`, 'utf8')),
]));
const cardById = new Map(cardsFile.cards.map((card) => [card.id, card]));
const failures = [];

for (const deck of decksFile.decks) {
  const seenIds = new Set();
  const seenText = Object.fromEntries(languages.map((lang) => [lang, new Map()]));
  const categories = new Set();
  for (const id of deck.cardIds) {
    const card = cardById.get(id);
    if (!card) { failures.push(`${deck.id}: missing card ${id}`); continue; }
    if (seenIds.has(id)) failures.push(`${deck.id}: duplicate id ${id}`);
    seenIds.add(id);
    if (!card.modes.includes(deck.mode)) failures.push(`${deck.id}: ${id} is not enabled for ${deck.mode}`);
    categories.add(card.cat);

    for (const lang of languages) {
      const question = translations[lang][card.qKey];
      const description = translations[lang][card.descKey];
      if (!question || !description) {
        failures.push(`${deck.id}: ${id} lacks ${lang} question/description`);
        continue;
      }
      const fingerprint = `${question.trim().toLowerCase()}|${description.trim().toLowerCase()}`;
      const previous = seenText[lang].get(fingerprint);
      if (previous) failures.push(`${deck.id}: ${lang} text repeated by ${previous} and ${id}`);
      seenText[lang].set(fingerprint, id);
    }
  }
  if (deck.cardIds.length < 50) failures.push(`${deck.id}: fewer than 50 active cards`);
  if (categories.size < 8) failures.push(`${deck.id}: fewer than 8 active categories`);
  console.log(`${deck.id}: ${deck.cardIds.length} active cards, ${categories.size} categories`);
}

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('card-audit: ok');
