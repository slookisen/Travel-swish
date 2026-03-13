import React, { useEffect, useMemo, useRef, useState } from 'react';

// --- Versioning (shows in footer; also helps debugging cached deploys)
const APP_VERSION = 'v0.1.1';

// --- Strings
const UI = {
  landingTitle: {
    no: 'Swipe → plan → book',
    en: 'Swipe → plan → book',
    sv: 'Swipe → plan → boka',
  },
  landingDesc: {
    no: 'Bygg en smakprofil på sekunder. Vi finner forslag som faktisk passer deg.',
    en: 'Build a taste profile in seconds. Get suggestions that actually fit you.',
    sv: 'Bygg en smakprofil på sekunder. Få förslag som faktiskt passar dig.',
  },
  getStarted: { no: 'Kom i gang', en: 'Get started', sv: 'Kom igång' },
  chooseMode: { no: 'Velg modus', en: 'Choose mode', sv: 'Välj läge' },
  destination: { no: 'Destinasjon', en: 'Destination', sv: 'Destination' },
  destinationMissing: { no: 'Destinasjon mangler', en: 'Destination required', sv: 'Destination krävs' },
  apiKeyNote: {
    no: 'Demo: nøkkelen lagres kun i nettleseren din. Lansering: flyttes til backend.',
    en: 'Demo: key is stored only in your browser. Launch: move to backend.',
    sv: 'Demo: nyckeln lagras bara i din webbläsare. Lansering: flyttas till backend.',
  },
  apiKeyMissing: { no: 'API-nøkkel mangler', en: 'API key required', sv: 'API-nyckel krävs' },
  back: { no: 'Tilbake', en: 'Back', sv: 'Tillbaka' },
  startMode: {
    no: (modeLabel: string) => `Start ${modeLabel}`,
    en: (modeLabel: string) => `Start ${modeLabel}`,
    sv: (modeLabel: string) => `Starta ${modeLabel}`,
  },
  swipeHint: { no: 'Sveip/velg kort for å lære profilen din.', en: 'Swipe/choose cards to learn your profile.', sv: 'Svajpa/välj kort för att lära din profil.' },
  total: { no: 'Totalt', en: 'Total', sv: 'Totalt' },
  yes: { no: 'JA', en: 'YES', sv: 'JA' },
  no: { no: 'NEI', en: 'NO', sv: 'NEJ' },
  fetch: { no: 'Finn forslag', en: 'Find suggestions', sv: 'Hitta förslag' },
  loading: { no: 'Henter…', en: 'Loading…', sv: 'Laddar…' },
  swipeAtLeast: { no: 'Sveip minst 10 kort først.', en: 'Swipe at least 10 cards first.', sv: 'Svajpa minst 10 kort först.' },
  openLink: { no: 'Åpne lenke', en: 'Open link', sv: 'Öppna länk' },
};

// --- Modes
export type Mode = 'experiences' | 'restaurants';

const MODE_LABELS: Record<Mode, { no: string; en: string; sv: string }> = {
  experiences: { no: 'Opplevelser', en: 'Experiences', sv: 'Upplevelser' },
  restaurants: { no: 'Restauranter', en: 'Restaurants', sv: 'Restauranger' },
};

// --- Theme
const T = {
  bg: '#0a0d1a',
  card: 'rgba(20,24,42,0.88)',
  gold: '#d4a574',
  teal: '#2dd4bf',
  txt: '#e8e2d8',
  dim: '#7a7b8e',
  red: '#f87171',
  green: '#34d399',
  border: 'rgba(255,255,255,0.06)',
};

// --- Storage
function keysFor(mode: Mode) {
  const suffix = mode === 'restaurants' ? '_restaurants' : '_experiences';
  return {
    swipes: `ts_swipes${suffix}`,
    totalSwipes: `ts_totalSwipes${suffix}`,
    seen: `ts_seen${suffix}`,
  };
}

function loadMemory(mode: Mode) {
  const K = keysFor(mode);
  try {
    const swipes = JSON.parse(localStorage.getItem(K.swipes) || '{}') as Record<string, number>;
    const totalSwipes = parseInt(localStorage.getItem(K.totalSwipes) || '0', 10);
    const seen = JSON.parse(localStorage.getItem(K.seen) || '[]') as string[];
    return { swipes, totalSwipes: Number.isFinite(totalSwipes) ? totalSwipes : 0, seen };
  } catch {
    return { swipes: {}, totalSwipes: 0, seen: [] as string[] };
  }
}

function saveSwipes(mode: Mode, swipes: Record<string, number>, totalSwipes: number) {
  const K = keysFor(mode);
  try {
    localStorage.setItem(K.swipes, JSON.stringify(swipes));
    localStorage.setItem(K.totalSwipes, String(totalSwipes));
  } catch {}
}

function saveSeen(mode: Mode, seen: string[]) {
  const K = keysFor(mode);
  try {
    localStorage.setItem(K.seen, JSON.stringify(seen));
  } catch {}
}

// --- Cards
export type Card = {
  id: string;
  emoji: string;
  q: string;
  desc: string;
  cat: string;
  dims: Record<string, number>;
};

// Keep same dimensions across modes to simplify the learning engine.
const DIMS = ['adv', 'soc', 'lux', 'act', 'cul', 'nat', 'food', 'night', 'spont'] as const;

type Lang = 'no' | 'en' | 'sv';

const PREFERENCE_CARDS: Partial<Record<Lang, Card[]>> = {
  // Larger deck so you don't run out after 2–3 swipes.
  // NO/EN are fully populated from the original deck; SV falls back to EN for cards (for now).
  no: [
    { id: 'p1', emoji: '🪂', q: 'Vil du hoppe i fallskjerm over reisemålet ditt?', desc: 'Adrenalin fra høyder og fritt fall.', cat: 'adrenalin', dims: { adv: 1, soc: .2, lux: .1, act: .9, cul: -.2, nat: .5, food: -.3, night: -.2, spont: .6 } },
    { id: 'p2', emoji: '🧗', q: 'Foretrekker du å klatre opp en fjellvegg fremfor å ta heisen?', desc: 'Fysisk utfordring gir deg energi.', cat: 'adrenalin', dims: { adv: .9, soc: .1, lux: -.4, act: 1, cul: -.1, nat: .8, food: -.2, night: -.3, spont: .3 } },
    { id: 'p3', emoji: '🏄', q: 'Vil du prøve surfing selv om du aldri har stått på et brett?', desc: 'Nye ferdigheter og bølger.', cat: 'adrenalin', dims: { adv: .8, soc: .4, lux: -.1, act: .9, cul: -.1, nat: .7, food: -.1, night: -.1, spont: .5 } },
    { id: 'p4', emoji: '🤿', q: 'Vil du dykke ned til et korallrev eller et skipsvrak?', desc: 'En verden under overflaten.', cat: 'adrenalin', dims: { adv: .9, soc: .3, lux: .2, act: .7, cul: .1, nat: .9, food: -.2, night: -.3, spont: .3 } },
    { id: 'p5', emoji: '🏍️', q: 'Er en tur på motorsykkel gjennom ukjente veier noe for deg?', desc: 'Frihet og fart uten plan.', cat: 'adrenalin', dims: { adv: .8, soc: .1, lux: -.2, act: .6, cul: .2, nat: .6, food: -.1, night: -.2, spont: .8 } },
    { id: 'p6', emoji: '🧖', q: 'Høres en hel dag på spa med massasje og badstue perfekt ut?', desc: 'Total avslapning for kropp og sinn.', cat: 'avslapning', dims: { adv: -.6, soc: .1, lux: .8, act: -.7, cul: .1, nat: -.1, food: .1, night: -.4, spont: -.3 } },
    { id: 'p7', emoji: '🧘', q: 'Vil du starte dagen med yoga ved soloppgang?', desc: 'Mindfulness og indre ro.', cat: 'avslapning', dims: { adv: -.3, soc: -.1, lux: .3, act: .3, cul: .3, nat: .4, food: -.1, night: -.6, spont: -.2 } },
    { id: 'p8', emoji: '🏖️', q: 'Er din drømmedag en hengekøy på stranden med en bok?', desc: 'Ingenting å gjøre, ingen plan.', cat: 'avslapning', dims: { adv: -.7, soc: -.3, lux: .2, act: -.8, cul: -.3, nat: .5, food: .1, night: -.3, spont: .1 } },
    { id: 'p9', emoji: '🌊', q: 'Vil du tilbringe timer ved å bare se på bølgene?', desc: 'Naturens meditasjon.', cat: 'avslapning', dims: { adv: -.5, soc: -.4, lux: 0, act: -.6, cul: -.2, nat: .8, food: -.1, night: -.5, spont: .1 } },
    { id: 'p10', emoji: '♨️', q: 'Tiltrekkes du av varme kilder og tradisjonelle bad?', desc: 'Helbredende vann med historie.', cat: 'avslapning', dims: { adv: -.2, soc: .2, lux: .5, act: -.4, cul: .5, nat: .4, food: -.1, night: -.3, spont: -.1 } },
    { id: 'p11', emoji: '🏛️', q: 'Kan du tilbringe en hel dag på et museum uten å kjede deg?', desc: 'Kunst og historie fascinerer deg.', cat: 'kultur', dims: { adv: -.2, soc: .1, lux: .3, act: -.3, cul: 1, nat: -.2, food: -.1, night: -.2, spont: -.4 } },
    { id: 'p12', emoji: '🎭', q: 'Vil du se en lokal teaterforestilling selv om den er på et annet språk?', desc: 'Kultur transcenderer språk.', cat: 'kultur', dims: { adv: .2, soc: .4, lux: .4, act: -.2, cul: .9, nat: -.3, food: -.1, night: .3, spont: .1 } },
    { id: 'p13', emoji: '📜', q: 'Fascineres du av ruiner og arkeologiske utgravninger?', desc: 'Fortidens mysterier trekker deg inn.', cat: 'kultur', dims: { adv: .3, soc: .1, lux: -.2, act: .4, cul: 1, nat: .3, food: -.2, night: -.4, spont: -.1 } },
    { id: 'p14', emoji: '🎨', q: 'Tiltrekkes du av street art og alternative kunstuttrykk?', desc: 'Byens kreative puls.', cat: 'kultur', dims: { adv: .4, soc: .3, lux: -.3, act: .4, cul: .8, nat: -.2, food: -.1, night: .3, spont: .5 } },
    { id: 'p15', emoji: '🍜', q: 'Vil du spise street food fra en bod du aldri har hørt om?', desc: 'De beste smakene er ofte de mest uventede.', cat: 'mat', dims: { adv: .6, soc: .4, lux: -.5, act: .2, cul: .6, nat: -.1, food: 1, night: .1, spont: .7 } },
    { id: 'p16', emoji: '👨‍🍳', q: 'Vil du ta et kokekurs med en lokal kokk?', desc: 'Lær hemmelighetene bak lokal mat.', cat: 'mat', dims: { adv: .3, soc: .6, lux: .3, act: .4, cul: .7, nat: -.1, food: .9, night: -.1, spont: -.1 } },
    { id: 'p17', emoji: '🍷', q: 'Er vinsmakinger og lokale bryggerier noe du prioriterer?', desc: 'Drikkekultur forteller historien om et sted.', cat: 'mat', dims: { adv: .2, soc: .6, lux: .6, act: -.1, cul: .5, nat: .1, food: .8, night: .4, spont: .2 } },
    { id: 'p18', emoji: '🌶️', q: 'Bestiller du alltid den mest eksotiske retten på menyen?', desc: 'Smaksløkene dine er eventyrlystne.', cat: 'mat', dims: { adv: .7, soc: .3, lux: 0, act: .1, cul: .5, nat: -.1, food: 1, night: .1, spont: .6 } },
    { id: 'p19', emoji: '🍽️', q: 'Er en Michelin-restaurant verdt å bruke reisebudsjettet på?', desc: 'Gastronomi som kunstopplevelse.', cat: 'mat', dims: { adv: .1, soc: .4, lux: 1, act: -.2, cul: .4, nat: -.2, food: .9, night: .2, spont: -.4 } },
    { id: 'p20', emoji: '☕', q: 'Leter du alltid etter den beste lokale kafeen?', desc: 'Kaffekultur og slow mornings.', cat: 'mat', dims: { adv: .1, soc: .2, lux: .2, act: -.2, cul: .4, nat: -.1, food: .6, night: -.3, spont: .2 } },
  ],
  en: [
    { id: 'p1', emoji: '🪂', q: 'Would you go skydiving over your travel destination?', desc: 'Adrenaline from heights and freefall.', cat: 'adrenaline', dims: { adv: 1, soc: .2, lux: .1, act: .9, cul: -.2, nat: .5, food: -.3, night: -.2, spont: .6 } },
    { id: 'p2', emoji: '🧗', q: 'Would you rather climb a cliff face than take the elevator?', desc: 'Physical challenge energizes you.', cat: 'adrenaline', dims: { adv: .9, soc: .1, lux: -.4, act: 1, cul: -.1, nat: .8, food: -.2, night: -.3, spont: .3 } },
    { id: 'p3', emoji: '🏄', q: 'Would you try surfing even if you have never stood on a board?', desc: 'New skills and waves.', cat: 'adrenaline', dims: { adv: .8, soc: .4, lux: -.1, act: .9, cul: -.1, nat: .7, food: -.1, night: -.1, spont: .5 } },
    { id: 'p4', emoji: '🤿', q: 'Would you dive down to a coral reef or a shipwreck?', desc: 'A world beneath the surface.', cat: 'adrenaline', dims: { adv: .9, soc: .3, lux: .2, act: .7, cul: .1, nat: .9, food: -.2, night: -.3, spont: .3 } },
    { id: 'p5', emoji: '🏍️', q: 'Is a motorcycle ride through unknown roads your kind of thing?', desc: 'Freedom and speed without a plan.', cat: 'adrenaline', dims: { adv: .8, soc: .1, lux: -.2, act: .6, cul: .2, nat: .6, food: -.1, night: -.2, spont: .8 } },
    { id: 'p6', emoji: '🧖', q: 'Does a full day at the spa with massage and sauna sound perfect?', desc: 'Total relaxation for body and mind.', cat: 'relaxation', dims: { adv: -.6, soc: .1, lux: .8, act: -.7, cul: .1, nat: -.1, food: .1, night: -.4, spont: -.3 } },
    { id: 'p7', emoji: '🧘', q: 'Would you start your day with yoga at sunrise?', desc: 'Mindfulness and inner peace.', cat: 'relaxation', dims: { adv: -.3, soc: -.1, lux: .3, act: .3, cul: .3, nat: .4, food: -.1, night: -.6, spont: -.2 } },
    { id: 'p8', emoji: '🏖️', q: 'Is your dream day a hammock on the beach with a book?', desc: 'Nothing to do, no plan.', cat: 'relaxation', dims: { adv: -.7, soc: -.3, lux: .2, act: -.8, cul: -.3, nat: .5, food: .1, night: -.3, spont: .1 } },
    { id: 'p9', emoji: '🌊', q: 'Would you spend hours just watching the waves?', desc: 'Nature as meditation.', cat: 'relaxation', dims: { adv: -.5, soc: -.4, lux: 0, act: -.6, cul: -.2, nat: .8, food: -.1, night: -.5, spont: .1 } },
    { id: 'p10', emoji: '♨️', q: 'Are you drawn to hot springs and traditional baths?', desc: 'Healing waters with history.', cat: 'relaxation', dims: { adv: -.2, soc: .2, lux: .5, act: -.4, cul: .5, nat: .4, food: -.1, night: -.3, spont: -.1 } },
    { id: 'p11', emoji: '🏛️', q: 'Could you spend an entire day in a museum without getting bored?', desc: 'Art and history fascinate you.', cat: 'culture', dims: { adv: -.2, soc: .1, lux: .3, act: -.3, cul: 1, nat: -.2, food: -.1, night: -.2, spont: -.4 } },
    { id: 'p12', emoji: '🎭', q: 'Would you watch a local theatre performance even in another language?', desc: 'Culture transcends language.', cat: 'culture', dims: { adv: .2, soc: .4, lux: .4, act: -.2, cul: .9, nat: -.3, food: -.1, night: .3, spont: .1 } },
    { id: 'p13', emoji: '📜', q: 'Are you fascinated by ruins and archaeological excavations?', desc: 'The mysteries of the past pull you in.', cat: 'culture', dims: { adv: .3, soc: .1, lux: -.2, act: .4, cul: 1, nat: .3, food: -.2, night: -.4, spont: -.1 } },
    { id: 'p14', emoji: '🎨', q: 'Are you drawn to street art and alternative artistic expressions?', desc: 'The creative pulse of the city.', cat: 'culture', dims: { adv: .4, soc: .3, lux: -.3, act: .4, cul: .8, nat: -.2, food: -.1, night: .3, spont: .5 } },
    { id: 'p15', emoji: '🍜', q: 'Would you eat street food from a stall you have never heard of?', desc: 'The best flavours are often the most unexpected.', cat: 'food', dims: { adv: .6, soc: .4, lux: -.5, act: .2, cul: .6, nat: -.1, food: 1, night: .1, spont: .7 } },
    { id: 'p16', emoji: '👨‍🍳', q: 'Would you take a cooking class with a local chef?', desc: 'Learn the secrets behind local food.', cat: 'food', dims: { adv: .3, soc: .6, lux: .3, act: .4, cul: .7, nat: -.1, food: .9, night: -.1, spont: -.1 } },
    { id: 'p17', emoji: '🍷', q: 'Are wine tastings and local breweries something you prioritize?', desc: 'Drinking culture tells the story of a place.', cat: 'food', dims: { adv: .2, soc: .6, lux: .6, act: -.1, cul: .5, nat: .1, food: .8, night: .4, spont: .2 } },
    { id: 'p18', emoji: '🌶️', q: 'Do you always order the most exotic dish on the menu?', desc: 'Your taste buds are adventurous.', cat: 'food', dims: { adv: .7, soc: .3, lux: 0, act: .1, cul: .5, nat: -.1, food: 1, night: .1, spont: .6 } },
    { id: 'p19', emoji: '🍽️', q: 'Is a Michelin restaurant worth spending your travel budget on?', desc: 'Gastronomy as an art experience.', cat: 'food', dims: { adv: .1, soc: .4, lux: 1, act: -.2, cul: .4, nat: -.2, food: .9, night: .2, spont: -.4 } },
    { id: 'p20', emoji: '☕', q: 'Do you always search for the best local coffee shop?', desc: 'Coffee culture and slow mornings.', cat: 'food', dims: { adv: .1, soc: .2, lux: .2, act: -.2, cul: .4, nat: -.1, food: .6, night: -.3, spont: .2 } },
  ],
};

const RESTAURANT_CARDS: Partial<Record<Lang, Card[]>> = {
  no: [
    { id: 'r1', emoji: '🍣', q: 'Er sushi og japansk mat en favoritt?', desc: 'Du liker rene smaker, kvalitet og presisjon.', cat: 'cuisine', dims: { adv: .2, soc: .2, lux: .4, act: -.2, cul: .6, nat: -.2, food: 1, night: .2, spont: -.1 } },
    { id: 'r2', emoji: '🍕', q: 'Kan en enkel pizza være den perfekte middag?', desc: 'Du liker komfortmat og uformell stemning.', cat: 'casual', dims: { adv: -.1, soc: .3, lux: -.4, act: -.2, cul: .1, nat: -.1, food: .6, night: .2, spont: .1 } },
    { id: 'r3', emoji: '🌶️', q: 'Velger du ofte sterk mat når du kan?', desc: 'Du tåler litt trøkk i smakene.', cat: 'spicy', dims: { adv: .4, soc: .1, lux: -.1, act: .1, cul: .2, nat: -.1, food: .9, night: .1, spont: .2 } },
    { id: 'r4', emoji: '🥂', q: 'Er det verdt å betale mer for en “wow”-middag?', desc: 'Du prioriterer kvalitet, service og atmosfære.', cat: 'fine', dims: { adv: .1, soc: .2, lux: 1, act: -.3, cul: .3, nat: -.2, food: .8, night: .2, spont: -.4 } },
    { id: 'r5', emoji: '🍔', q: 'Er burger og fries en go-to når du er sulten?', desc: 'Raskt, enkelt og digg.', cat: 'casual', dims: { adv: -.1, soc: .2, lux: -.5, act: -.1, cul: -.1, nat: -.2, food: .5, night: .1, spont: .2 } },
    { id: 'r6', emoji: '🥗', q: 'Foretrekker du ofte noe lett og friskt?', desc: 'Du liker rene råvarer og føler deg best etterpå.', cat: 'fresh', dims: { adv: -.2, soc: -.1, lux: .1, act: .3, cul: .2, nat: .2, food: .6, night: -.3, spont: -.2 } },
    { id: 'r7', emoji: '🍷', q: 'Er vinbar/et godt vinkart en stor pluss?', desc: 'Du liker å matche drikke og mat.', cat: 'drinks', dims: { adv: .1, soc: .5, lux: .6, act: -.2, cul: .4, nat: -.1, food: .5, night: .6, spont: .1 } },
    { id: 'r8', emoji: '🧆', q: 'Liker du å prøve lokale småretter (tapas/meze)?', desc: 'Deling, variasjon og nye smaker.', cat: 'sharing', dims: { adv: .3, soc: .8, lux: .2, act: -.1, cul: .6, nat: -.1, food: .8, night: .3, spont: .4 } },
    { id: 'r9', emoji: '🥩', q: 'Er en skikkelig biffmiddag noe du blir glad av?', desc: 'Du liker kraftige smaker og god metthet.', cat: 'hearty', dims: { adv: -.1, soc: .2, lux: .3, act: -.1, cul: .1, nat: -.1, food: .7, night: .2, spont: -.2 } },
    { id: 'r10', emoji: '🕯️', q: 'Foretrekker du romantisk stemning fremfor liv og røre?', desc: 'Rolig, intimt og koselig.', cat: 'ambience', dims: { adv: -.3, soc: -.1, lux: .5, act: -.4, cul: .2, nat: -.1, food: .4, night: -.1, spont: -.3 } },
    { id: 'r11', emoji: '🎉', q: 'Liker du restauranter med høy energi og folk?', desc: 'Du tåler lyd og liker puls.', cat: 'lively', dims: { adv: .2, soc: .8, lux: .1, act: .1, cul: .2, nat: -.2, food: .4, night: .8, spont: .3 } },
    { id: 'r12', emoji: '⏱️', q: 'Vil du ofte ha noe raskt og effektivt?', desc: 'Kort vei fra bestilling til mat.', cat: 'quick', dims: { adv: -.2, soc: -.1, lux: -.2, act: .1, cul: -.1, nat: -.1, food: .3, night: -.3, spont: .2 } },
    { id: 'r13', emoji: '🍜', q: 'Ramen/pho/nudler: ja takk?', desc: 'Du liker varme, rike buljonger og comfort.', cat: 'cuisine', dims: { adv: .2, soc: .1, lux: -.1, act: -.1, cul: .3, nat: -.1, food: .8, night: .1, spont: .2 } },
    { id: 'r14', emoji: '🧁', q: 'Er dessert et must når du spiser ute?', desc: 'Du liker en søt avslutning.', cat: 'dessert', dims: { adv: -.1, soc: .1, lux: .1, act: -.2, cul: .1, nat: -.1, food: .7, night: .1, spont: .1 } },
    { id: 'r15', emoji: '📍', q: 'Er “lokale skjulte perler” viktigere enn kjeder?', desc: 'Du vil ha unikt og autentisk.', cat: 'local', dims: { adv: .4, soc: .1, lux: .1, act: .2, cul: .7, nat: -.1, food: .6, night: .1, spont: .5 } },
    { id: 'r16', emoji: '🧑‍🍳', q: 'Synes du åpen kjøkken/chef’s counter er kult?', desc: 'Du liker håndverket bak maten.', cat: 'craft', dims: { adv: .2, soc: .2, lux: .4, act: -.1, cul: .4, nat: -.1, food: .6, night: .1, spont: .1 } },
    { id: 'r17', emoji: '🥘', q: 'Er du glad i gryteretter og “comfort food”?', desc: 'Varmt, mettende og trygt.', cat: 'hearty', dims: { adv: -.2, soc: .1, lux: -.1, act: -.2, cul: .1, nat: -.1, food: .7, night: -.1, spont: -.2 } },
    { id: 'r18', emoji: '🌿', q: 'Er vegetar/vegansk tilbud viktig for deg?', desc: 'Du vil ha gode alternativer uten kjøtt.', cat: 'diet', dims: { adv: .1, soc: .1, lux: .1, act: .2, cul: .2, nat: .1, food: .5, night: -.1, spont: .1 } },
    { id: 'r19', emoji: '👨‍👩‍👧‍👦', q: 'Trives du best på familievennlige steder?', desc: 'Lav terskel og enkel logistikk.', cat: 'family', dims: { adv: -.3, soc: .3, lux: -.3, act: -.2, cul: -.1, nat: -.1, food: .3, night: -.5, spont: -.2 } },
    { id: 'r20', emoji: '🎧', q: 'Blir du fort sliten av høy musikk mens du spiser?', desc: 'Du foretrekker å kunne prate.', cat: 'quiet', dims: { adv: -.2, soc: -.1, lux: .2, act: -.2, cul: .1, nat: -.1, food: .3, night: -.4, spont: -.2 } },
  ],
  en: [
    { id: 'r1', emoji: '🍣', q: 'Is sushi/Japanese food a favorite?', desc: 'You like clean flavors and quality.', cat: 'cuisine', dims: { adv: .2, soc: .2, lux: .4, act: -.2, cul: .6, nat: -.2, food: 1, night: .2, spont: -.1 } },
    { id: 'r2', emoji: '🍕', q: 'Can a simple pizza be the perfect dinner?', desc: 'Casual comfort and no fuss.', cat: 'casual', dims: { adv: -.1, soc: .3, lux: -.4, act: -.2, cul: .1, nat: -.1, food: .6, night: .2, spont: .1 } },
    { id: 'r3', emoji: '🌶️', q: 'Do you often choose spicy food when you can?', desc: 'You enjoy heat and bold flavors.', cat: 'spicy', dims: { adv: .4, soc: .1, lux: -.1, act: .1, cul: .2, nat: -.1, food: .9, night: .1, spont: .2 } },
    { id: 'r4', emoji: '🥂', q: 'Is it worth paying more for a “wow” dinner?', desc: 'You value quality, service and ambience.', cat: 'fine', dims: { adv: .1, soc: .2, lux: 1, act: -.3, cul: .3, nat: -.2, food: .8, night: .2, spont: -.4 } },
    { id: 'r5', emoji: '🍔', q: 'Burger and fries as a go-to?', desc: 'Fast, simple, satisfying.', cat: 'casual', dims: { adv: -.1, soc: .2, lux: -.5, act: -.1, cul: -.1, nat: -.2, food: .5, night: .1, spont: .2 } },
    { id: 'r6', emoji: '🥗', q: 'Do you often prefer something light and fresh?', desc: 'You like clean ingredients.', cat: 'fresh', dims: { adv: -.2, soc: -.1, lux: .1, act: .3, cul: .2, nat: .2, food: .6, night: -.3, spont: -.2 } },
    { id: 'r7', emoji: '🍷', q: 'Is a good wine list a big plus?', desc: 'You enjoy pairing drinks and food.', cat: 'drinks', dims: { adv: .1, soc: .5, lux: .6, act: -.2, cul: .4, nat: -.1, food: .5, night: .6, spont: .1 } },
    { id: 'r8', emoji: '🧆', q: 'Do you like sharing small plates (tapas/meze)?', desc: 'Variety and social eating.', cat: 'sharing', dims: { adv: .3, soc: .8, lux: .2, act: -.1, cul: .6, nat: -.1, food: .8, night: .3, spont: .4 } },
    { id: 'r9', emoji: '🥩', q: 'A proper steak dinner makes you happy?', desc: 'Hearty flavors and fullness.', cat: 'hearty', dims: { adv: -.1, soc: .2, lux: .3, act: -.1, cul: .1, nat: -.1, food: .7, night: .2, spont: -.2 } },
    { id: 'r10', emoji: '🕯️', q: 'Do you prefer romantic ambience over loud buzz?', desc: 'Calm and intimate.', cat: 'ambience', dims: { adv: -.3, soc: -.1, lux: .5, act: -.4, cul: .2, nat: -.1, food: .4, night: -.1, spont: -.3 } },
    { id: 'r11', emoji: '🎉', q: 'Do you enjoy high-energy, lively restaurants?', desc: 'You like buzz and people.', cat: 'lively', dims: { adv: .2, soc: .8, lux: .1, act: .1, cul: .2, nat: -.2, food: .4, night: .8, spont: .3 } },
    { id: 'r12', emoji: '⏱️', q: 'Do you often want something quick and efficient?', desc: 'From order to food fast.', cat: 'quick', dims: { adv: -.2, soc: -.1, lux: -.2, act: .1, cul: -.1, nat: -.1, food: .3, night: -.3, spont: .2 } },
    { id: 'r13', emoji: '🍜', q: 'Ramen/pho/noodles: yes please?', desc: 'Warm broths and comfort.', cat: 'cuisine', dims: { adv: .2, soc: .1, lux: -.1, act: -.1, cul: .3, nat: -.1, food: .8, night: .1, spont: .2 } },
    { id: 'r14', emoji: '🧁', q: 'Is dessert a must when dining out?', desc: 'You love a sweet finish.', cat: 'dessert', dims: { adv: -.1, soc: .1, lux: .1, act: -.2, cul: .1, nat: -.1, food: .7, night: .1, spont: .1 } },
    { id: 'r15', emoji: '📍', q: 'Do “local hidden gems” matter more than chains?', desc: 'You want unique and authentic.', cat: 'local', dims: { adv: .4, soc: .1, lux: .1, act: .2, cul: .7, nat: -.1, food: .6, night: .1, spont: .5 } },
    { id: 'r16', emoji: '🧑‍🍳', q: 'Do you like open kitchens/chef’s counters?', desc: 'You enjoy the craft.', cat: 'craft', dims: { adv: .2, soc: .2, lux: .4, act: -.1, cul: .4, nat: -.1, food: .6, night: .1, spont: .1 } },
    { id: 'r17', emoji: '🥘', q: 'Do you love stews and comfort food?', desc: 'Warm, filling, safe.', cat: 'hearty', dims: { adv: -.2, soc: .1, lux: -.1, act: -.2, cul: .1, nat: -.1, food: .7, night: -.1, spont: -.2 } },
    { id: 'r18', emoji: '🌿', q: 'Do you care about vegetarian/vegan options?', desc: 'You want strong meat-free choices.', cat: 'diet', dims: { adv: .1, soc: .1, lux: .1, act: .2, cul: .2, nat: .1, food: .5, night: -.1, spont: .1 } },
    { id: 'r19', emoji: '👨‍👩‍👧‍👦', q: 'Do you prefer family-friendly places?', desc: 'Low friction and easy logistics.', cat: 'family', dims: { adv: -.3, soc: .3, lux: -.3, act: -.2, cul: -.1, nat: -.1, food: .3, night: -.5, spont: -.2 } },
    { id: 'r20', emoji: '🎧', q: 'Does loud music while eating drain you?', desc: 'You prefer conversation.', cat: 'quiet', dims: { adv: -.2, soc: -.1, lux: .2, act: -.2, cul: .1, nat: -.1, food: .3, night: -.4, spont: -.2 } },
  ],
};

function cardsFor(mode: Mode, lang: Lang): Card[] {
  const src = (mode === 'restaurants' ? RESTAURANT_CARDS : PREFERENCE_CARDS);
  // For now, Swedish cards fall back to English until we have full SV translations.
  return (src[lang] || src.en || src.no || []) as Card[];
}

// --- Simple profile (kept explainable)
function calcProfile(swipes: Record<string, number>, cards: Card[]) {
  const dims: Record<string, number> = Object.fromEntries(DIMS.map(d => [d, 0]));
  const counts: Record<string, number> = Object.fromEntries(DIMS.map(d => [d, 0]));

  for (const card of cards) {
    const swipe = swipes[card.id];
    if (!swipe) continue;
    const weight = swipe > 0 ? 1.0 : -0.3;
    for (const dim of DIMS) {
      const v = card.dims[dim] || 0;
      dims[dim] += v * weight;
      counts[dim] += Math.abs(v);
    }
  }

  for (const dim of DIMS) {
    dims[dim] = counts[dim] > 0 ? (dims[dim] / counts[dim]) * 100 : 0;
    dims[dim] = Math.max(-100, Math.min(100, dims[dim]));
  }

  return dims;
}

function describeProfile(dims: Record<string, number>, lang: Lang) {
  const labels = lang === 'no'
    ? { adv: 'Aventyrlyst', soc: 'Sosial', lux: 'Luksus', act: 'Aktiv', cul: 'Kultur', nat: 'Natur', food: 'Mat', night: 'Uteliv', spont: 'Spontan' }
    : { adv: 'Adventurous', soc: 'Social', lux: 'Luxury', act: 'Active', cul: 'Cultural', nat: 'Nature', food: 'Food', night: 'Nightlife', spont: 'Spontaneous' };

  const parts: string[] = [];
  for (const [k, v] of Object.entries(dims)) {
    if (Math.abs(v) <= 10) continue;
    const level = Math.abs(v) > 70 ? (lang === 'no' ? 'svært' : 'very') : Math.abs(v) > 40 ? (lang === 'no' ? 'ganske' : 'moderately') : (lang === 'no' ? 'litt' : 'somewhat');
    const dir = v > 0 ? '' : (lang === 'no' ? ' ikke' : ' not');
    parts.push(`${level}${dir} ${String((labels as any)[k]).toLowerCase()} (${k}:${Math.round(v)})`);
  }
  return parts.join(', ') || (lang === 'no' ? 'balansert reisende' : 'balanced traveler');
}

// --- Claude request (client-side demo). For launch, this moves to a backend.
async function askClaude(prompt: string, apiKey: string) {
  const key = apiKey || (typeof window !== 'undefined' ? (window.localStorage?.getItem('apiKey') || '') : '');
  if (!key) throw new Error('API-nøkkel er påkrevd');

  const doFetch = () => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'Return ONLY a raw JSON array (no markdown).',
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  let attempt = 0;
  while (true) {
    const res = await doFetch();
    if (!res.ok) {
      if (res.status === 401) throw new Error('Ugyldig API-nøkkel');
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
        const waitS = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
        if (attempt < 2) {
          await sleep(Math.min(waitS * 1000, (2 ** attempt) * 2000));
          attempt += 1;
          continue;
        }
        throw new Error(`RATE_LIMIT:${waitS}`);
      }
      const errBody = await res.json().catch(() => ({} as any));
      throw new Error(errBody?.error?.message || `API-feil ${res.status}`);
    }

    const data = await res.json();
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text);
    return textBlocks.join('\n');
  }
}

function buildPrompt(mode: Mode, dest: string, profileText: string, lang: Lang, excludeNames: string[]) {
  const excludeStr = excludeNames.length
    ? (lang === 'no' ? `\nUNNGÅ disse som allerede er vist: ${excludeNames.join(', ')}.` : `\nEXCLUDE these already-shown items: ${excludeNames.join(', ')}.`)
    : '';

  const isRestaurants = mode === 'restaurants';

  if (lang === 'no') {
    return isRestaurants
      ? `Søk etter restauranter i ${dest} for denne profilen: ${profileText}.${excludeStr}\nReturner en JSON-array med 8-10 restauranter sortert etter match. Hvert objekt: {"name","why","quote","cat","url","price","match", "lat","lng"}. KUN JSON.`
      : `Søk etter opplevelser i ${dest} for denne profilen: ${profileText}.${excludeStr}\nReturner en JSON-array med 8-10 opplevelser sortert etter match. Hvert objekt: {"name","why","quote","cat","url","price","duration","match", "lat","lng"}. KUN JSON.`;
  }

  return isRestaurants
    ? `Search for restaurants in ${dest} for this profile: ${profileText}.${excludeStr}\nReturn a JSON array of 8-10 restaurants sorted by match. Each object: {"name","why","quote","cat","url","price","match","lat","lng"}. ONLY JSON.`
    : `Search for experiences in ${dest} for this profile: ${profileText}.${excludeStr}\nReturn a JSON array of 8-10 experiences sorted by match. Each object: {"name","why","quote","cat","url","price","duration","match","lat","lng"}. ONLY JSON.`;
}

type Page = 'landing' | 'home' | 'swipe' | 'results';

function shuffleArray<T>(arr: T[]) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type Item = {
  name: string;
  why?: string;
  quote?: string;
  cat?: string;
  url?: string;
  price?: string;
  duration?: string;
  match?: number;
  lat?: number;
  lng?: number;
};

function parseItems(result: string, lang: Lang): Item[] {
  const jsonMatch = result.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [{ name: lang === 'no' ? 'AI-svar mottatt' : lang === 'sv' ? 'AI-svar mottaget' : 'AI response received', why: result.slice(0, 400), match: 50 }];
}

function SwipeDeckCard({
  card,
  lang,
  onSwipe,
}: {
  card: Card;
  lang: Lang;
  onSwipe: (val: number) => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  const threshold = 90; // px

  function endDrag(finalDx: number) {
    setDragging(false);
    startX.current = null;

    if (finalDx > threshold) {
      onSwipe(1);
      setDx(0);
      return;
    }
    if (finalDx < -threshold) {
      onSwipe(-1);
      setDx(0);
      return;
    }

    // snap back
    setDx(0);
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        touchAction: 'pan-y',
      }}
    >
      <div
        onTouchStart={(e) => {
          setDragging(true);
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (startX.current == null) return;
          const cur = e.touches[0].clientX;
          setDx(cur - startX.current);
        }}
        onTouchEnd={() => endDrag(dx)}
        onMouseDown={(e) => {
          setDragging(true);
          startX.current = e.clientX;
        }}
        onMouseMove={(e) => {
          if (!dragging || startX.current == null) return;
          setDx(e.clientX - startX.current);
        }}
        onMouseUp={() => endDrag(dx)}
        onMouseLeave={() => dragging && endDrag(dx)}
        style={{
          width: '100%',
          maxWidth: 520,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          padding: 16,
          transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
          transition: dragging ? 'none' : 'transform 180ms ease',
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 28 }}>{card.emoji}</div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{card.q}</div>
        </div>
        <div style={{ color: T.dim, marginTop: 8, lineHeight: 1.5 }}>{card.desc}</div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button
            onClick={() => onSwipe(-1)}
            style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.red, cursor: 'pointer', fontWeight: 900 }}
          >
            {UI.no[lang]}
          </button>
          <button
            onClick={() => onSwipe(1)}
            style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.green, cursor: 'pointer', fontWeight: 900 }}
          >
            {UI.yes[lang]}
          </button>
          <div style={{ marginLeft: 'auto', color: T.dim, fontSize: 12, alignSelf: 'center' }}>
            {lang === 'no' ? 'Dra ←/→' : lang === 'sv' ? 'Dra ←/→' : 'Drag ←/→'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  // Default language for new users: English. Persist choice in localStorage.
  const [lang, setLang] = useState<Lang>(() => {
    // 1) explicit user choice (sticky)
    try {
      const saved = (localStorage.getItem('ts_lang') || '') as Lang;
      if (saved === 'no' || saved === 'en' || saved === 'sv') return saved;
    } catch {}

    // 2) auto-detect from browser language
    const nav = (typeof navigator !== 'undefined' ? (navigator.language || '') : '').toLowerCase();
    if (nav.startsWith('sv')) return 'sv';
    if (nav.startsWith('no') || nav.startsWith('nb') || nav.startsWith('nn')) return 'no';

    // 3) fallback
    return 'en';
  });

  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = (localStorage.getItem('ts_mode') || '') as Mode;
      if (saved === 'experiences' || saved === 'restaurants') return saved;
    } catch {}
    return 'experiences';
  });

  const [destination, setDestination] = useState(() => {
    try { return localStorage.getItem('ts_destination') || ''; } catch { return ''; }
  });

  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('apiKey') || ''; } catch { return ''; }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const seenNames = useRef<string[]>([]);

  // keep seen cache per mode
  useEffect(() => {
    const mem = loadMemory(mode);
    seenNames.current = mem.seen;
  }, [mode]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) {
        setCooldownUntil(0);
        setCooldownLeft(0);
      }
    }, 250);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const labels = MODE_LABELS[mode][lang];

  useEffect(() => {
    try { localStorage.setItem('ts_mode', mode); } catch {}
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem('ts_destination', destination); } catch {}
  }, [destination]);

  useEffect(() => {
    try { localStorage.setItem('apiKey', apiKey); } catch {}
  }, [apiKey]);

  const cards = useMemo(() => cardsFor(mode, lang), [mode, lang]);

  const mem = useMemo(() => loadMemory(mode), [mode]);

  const [swipes, setSwipes] = useState<Record<string, number>>(mem.swipes);
  const [totalSwipes, setTotalSwipes] = useState<number>(mem.totalSwipes);

  useEffect(() => {
    const m = loadMemory(mode);
    setSwipes(m.swipes);
    setTotalSwipes(m.totalSwipes);
  }, [mode]);

  // Build the deck: only unswiped cards
  const unswiped = useMemo(() => {
    const ids = new Set(Object.keys(swipes));
    return cards.filter(c => !ids.has(c.id));
  }, [cards, swipes]);

  const [deck, setDeck] = useState<Card[]>(() => []);
  const [deckIndex, setDeckIndex] = useState(0);

  useEffect(() => {
    // Refresh deck when mode or language changes or when swipes update.
    const fresh = shuffleArray(unswiped);
    setDeck(fresh);
    setDeckIndex(0);
  }, [mode, lang, unswiped.length]);

  const canSearch = totalSwipes >= 10 || Object.keys(swipes).length >= 10;

  async function findItems() {
    if (!apiKey.trim()) {
      setError(UI.apiKeyMissing[lang]);
      setPage('home');
      return;
    }
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(`For mange forespørsler. Vent ${cooldownLeft}s og prøv igjen.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const profile = calcProfile(swipes, cards);
      const profileText = describeProfile(profile, lang);
      const prompt = buildPrompt(mode, destination, profileText, lang, seenNames.current);
      const result = await askClaude(prompt, apiKey);
      const newItems = parseItems(result, lang).sort((a, b) => (b.match || 0) - (a.match || 0));

      const newNames = newItems.map(i => i.name).filter(Boolean);
      seenNames.current = [...seenNames.current, ...newNames];
      saveSeen(mode, seenNames.current);

      setItems(newItems);
      setPage('results');
    } catch (e: any) {
      const msg = String(e?.message || 'Unknown error');
      if (msg.startsWith('RATE_LIMIT:')) {
        const waitS = parseInt(msg.split(':')[1] || '60', 10) || 60;
        setCooldownUntil(Date.now() + waitS * 1000);
        setError(`Rate limit. Prøv igjen om ${waitS}s.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function swipeCard(card: Card, val: number) {
    const next = { ...swipes, [card.id]: val };
    const nextTotal = totalSwipes + 1;
    setSwipes(next);
    setTotalSwipes(nextTotal);
    saveSwipes(mode, next, nextTotal);

    // Advance deck
    setDeckIndex((i) => Math.min(i + 1, deck.length));
  }

  // Guard: never allow swipe/results without destination
  useEffect(() => {
    if ((page === 'swipe' || page === 'results') && !destination.trim()) {
      setError(UI.destinationMissing[lang]);
      setPage('home');
    }
  }, [page, destination, lang]);

  // --- UI (stable; with swipe deck)
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 800, color: T.gold }}>Travel‑Swish</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={lang}
            onChange={(e) => {
              const v = e.target.value as Lang;
              setLang(v);
              try { localStorage.setItem('ts_lang', v); } catch {}
            }}
            style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: '6px 10px', borderRadius: 10, cursor: 'pointer' }}
          >
            <option value="en">EN</option>
            <option value="no">NO</option>
            <option value="sv">SV</option>
          </select>
        </div>
      </div>

      {page === 'landing' && (
        <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ marginTop: 10 }}>{UI.landingTitle[lang]}</h1>
          <p style={{ color: T.dim, lineHeight: 1.6 }}>
            {UI.landingDesc[lang]}
          </p>
          <button onClick={() => setPage('home')} style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, fontWeight: 800 }}>
            {UI.getStarted[lang]}
          </button>
          <div style={{ marginTop: 18, color: T.dim, fontSize: 12 }}>Build: {APP_VERSION}</div>
        </div>
      )}

      {page === 'home' && (
        <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ marginTop: 0 }}>{UI.chooseMode[lang]}</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {(['experiences', 'restaurants'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  background: mode === m ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                  color: mode === m ? T.bg : T.txt,
                  fontWeight: 800,
                }}
              >
                {MODE_LABELS[m][lang]}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, color: T.dim }}>{UI.destination[lang]}</label>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder={lang === 'no' ? 'Barcelona, Oslo, Tokyo…' : lang === 'sv' ? 'Barcelona, Stockholm, Tokyo…' : 'Barcelona, Oslo, Tokyo…'}
              style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, color: T.txt }}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, color: T.dim }}>Anthropic API key</label>
            <input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${T.border}`, background: T.card, color: T.txt, fontFamily: 'monospace' }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: T.dim }}>
              {UI.apiKeyNote[lang]}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (!destination.trim()) { setError(UI.destinationMissing[lang]); return; }
                if (!apiKey.trim()) { setError(UI.apiKeyMissing[lang]); return; }
                localStorage.setItem('apiKey', apiKey.trim());
                setPage('swipe');
              }}
              style={{ padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, fontWeight: 800 }}
            >
              {UI.startMode[lang](labels)}
            </button>
            <button onClick={() => setPage('landing')} style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${T.border}`, cursor: 'pointer', background: 'transparent', color: T.txt }}>
              {UI.back[lang]}
            </button>
          </div>

          {error && <div style={{ marginTop: 14, color: T.red }}>{error}</div>}
        </div>
      )}

      {page === 'swipe' && (
        <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
          <button onClick={() => setPage('home')} style={{ marginBottom: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}>
            {UI.back[lang]}
          </button>

          <h2 style={{ marginTop: 0 }}>{labels}: {destination}</h2>
          <div style={{ color: T.dim, marginBottom: 10 }}>{UI.swipeHint[lang]}</div>
          <div style={{ color: T.dim, fontSize: 12, marginBottom: 16 }}>{UI.total[lang]}: {totalSwipes}</div>

          {/* Swipe deck */}
          <div style={{ position: 'relative', height: 220 }}>
            {deckIndex >= deck.length ? (
              <div style={{ color: T.dim, paddingTop: 40 }}>
                {lang === 'no' ? 'Ingen flere kort. Du kan gå tilbake og bytte modus, eller hente forslag.' : lang === 'sv' ? 'Inga fler kort. Gå tillbaka och byt läge, eller hämta förslag.' : 'No more cards. Go back and switch mode, or fetch suggestions.'}
              </div>
            ) : (
              <SwipeDeckCard
                key={deck[deckIndex].id}
                card={deck[deckIndex]}
                lang={lang}
                onSwipe={(val) => swipeCard(deck[deckIndex], val)}
              />
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={findItems}
              disabled={!canSearch || loading}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                cursor: !canSearch || loading ? 'not-allowed' : 'pointer',
                background: !canSearch || loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                color: !canSearch || loading ? T.dim : T.bg,
                fontWeight: 800,
              }}
            >
              {loading ? UI.loading[lang] : UI.fetch[lang]}
            </button>
            {!canSearch && <div style={{ color: T.dim, alignSelf: 'center' }}>{UI.swipeAtLeast[lang]}</div>}
          </div>

          {error && <div style={{ marginTop: 14, color: T.red }}>{error}</div>}
        </div>
      )}

      {page === 'results' && (
        <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
          <button onClick={() => setPage('swipe')} style={{ marginBottom: 10, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}>
            {lang === 'no' ? 'Tilbake' : 'Back'}
          </button>
          <h2 style={{ marginTop: 0 }}>{labels}: {destination}</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>{it.name}</div>
                  <div style={{ color: T.gold, fontWeight: 900 }}>{Math.round(it.match || 0)}%</div>
                </div>
                {it.cat && <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>{it.cat}</div>}
                {it.why && <div style={{ color: T.dim, marginTop: 8, lineHeight: 1.5 }}>{it.why}</div>}
                {it.url && (
                  <a href={it.url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 10, color: T.teal }}>
                    {lang === 'no' ? 'Åpne lenke' : 'Open link'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '18px 18px', color: T.dim, fontSize: 12, borderTop: `1px solid ${T.border}` }}>
        {APP_VERSION} • {mode} • {lang}
      </div>
    </div>
  );
}
