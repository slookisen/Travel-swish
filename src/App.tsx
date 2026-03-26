import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { T, globalCss, F, R, S, M } from './ui';
import { DIMS, getDeckCards, t as tData, type Card, type Lang, type Mode } from './dataset';
import { BUILD_META } from './buildMeta';

// --- Versioning (shows in footer; also helps debugging cached deploys)
const APP_VERSION = BUILD_META.version;

// Backend API (local dev default). On GitHub Pages we intentionally keep this empty.
const DEFAULT_BACKEND_URL =
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://127.0.0.1:8787'
    : '';
const BACKEND_URL = (String((import.meta as any).env?.VITE_BACKEND_URL || '').trim()) || DEFAULT_BACKEND_URL;
const BACKEND_DISPLAY = (() => {
  if (!BACKEND_URL) return '';
  try { return new URL(BACKEND_URL).origin; } catch { return BACKEND_URL; }
})();

// E2E/CI helper: enable deterministic mock results with ?mock=1
const MOCK_MODE =
  (typeof window !== 'undefined') &&
  (() => {
    try {
      const v = new URLSearchParams(window.location.search).get('mock');
      return v === '1' || v === 'true' || v === 'yes';
    } catch {
      return false;
    }
  })();

const MIN_SWIPES = 20;
const nowS = () => Math.floor(Date.now() / 1000);

function googleMapsSearchUrl(placeName: string, destination: string) {
  const q = `${String(placeName || '').trim()} ${String(destination || '').trim()}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

async function fetchJson(
  url: string,
  init: (RequestInit & { timeoutMs?: number }) = {},
): Promise<any> {
  const { timeoutMs = 8000, ...opts } = init as any;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...(opts as any), signal: ctrl.signal });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const isJson = ct.includes('application/json');
    const body = isJson
      ? await res.json().catch(() => null)
      : await res.text().catch(() => '');

    if (!res.ok) {
      const detail = body && typeof body === 'object' ? (body as any).detail : '';
      const msg = typeof detail === 'string' && detail
        ? detail
        : (typeof body === 'string' && body.trim() ? body.trim().slice(0, 180) : `HTTP ${res.status}`);
      throw new Error(msg);
    }

    return body;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Timeout');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// --- Strings
const UI: Record<string, any> = {
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
  landingTip: {
    no: 'Tips: Velg modus, skriv inn sted, sveip 20 kort og få forslag.',
    en: 'Tip: Pick a mode, enter a destination, swipe 20 cards, get suggestions.',
    sv: 'Tips: Välj läge, skriv in plats, svajpa 20 kort och få förslag.',
  },
  howItWorksTitle: {
    no: 'Slik fungerer det',
    en: 'How it works',
    sv: 'Så funkar det',
  },
  howItWorks1: {
    no: 'Velg modus (opplevelser eller restauranter).',
    en: 'Choose a mode (experiences or restaurants).',
    sv: 'Välj läge (upplevelser eller restauranger).',
  },
  howItWorks2: {
    no: 'Skriv inn destinasjon og sveip kort for å lære profilen din.',
    en: 'Enter a destination and swipe to teach your taste profile.',
    sv: 'Skriv in en destination och svajpa för att lära din profil.',
  },
  howItWorks3: {
    no: 'Trykk «Finn forslag» for treff + forklaring.',
    en: 'Tap "Find suggestions" for matches + explanations.',
    sv: 'Tryck "Hitta förslag" för träffar + förklaring.',
  },
  getStarted: { no: 'Kom i gang', en: 'Get started', sv: 'Kom igång' },
  chooseMode: { no: 'Velg modus', en: 'Choose mode', sv: 'Välj läge' },
  destination: { no: 'Destinasjon', en: 'Destination', sv: 'Destination' },
  destinationMissing: { no: 'Destinasjon mangler', en: 'Destination required', sv: 'Destination krävs' },
  destinationHelp: {
    no: 'Skriv inn et reisemål for å starte.',
    en: 'Enter a destination to get started.',
    sv: 'Skriv in en destination för att börja.',
  },
  apiKeyNote: {
    no: 'API-nøkkel er ikke lenger nødvendig i appen.',
    en: 'API key is no longer required in the app.',
    sv: 'API-nyckel behövs inte längre i appen.',
  },
  updateAvailable: {
    no: 'Oppdatering tilgjengelig',
    en: 'Update available',
    sv: 'Uppdatering finns',
  },
  updateBanner: {
    no: (remote: string, current: string) => `Oppdatering tilgjengelig: ${remote} (du har ${current})`,
    en: (remote: string, current: string) => `Update available: ${remote} (you are ${current})`,
    sv: (remote: string, current: string) => `Uppdatering finns: ${remote} (du har ${current})`,
  },
  refresh: { no: 'Oppdater', en: 'Refresh', sv: 'Uppdatera' },
  resultsHint: {
    no: 'Store kort, lite støy. Trykk på «Hvorfor» for forklaring.',
    en: 'Big cards, low noise. Tap "Why" for an explanation.',
    sv: 'Stora kort, lite brus. Tryck på "Varför" för förklaring.',
  },
  noResultsTitle: {
    no: 'Ingen treff ennå',
    en: 'No matches yet',
    sv: 'Inga träffar än',
  },
  noResults: {
    no: 'Hmm, vi fant ikke noe akkurat nå. Prøv igjen?',
    en: 'Hmm, nothing came up just now. Want to try again?',
    sv: 'Inga förslag än. Prova "Hitta fler" eller svajpa några fler kort.',
  },
  noResultsFiltered: {
    no: (cat: string) => `Ingen forslag i «${cat}». Prøv «Alle» eller «Finn flere».`,
    en: (cat: string) => `No suggestions in "${cat}". Try "All" or "Find more".`,
    sv: (cat: string) => `Inga förslag i "${cat}". Prova "Alla" eller "Hitta fler".`,
  },
  apiKeyMissing: { no: 'API-nøkkel mangler', en: 'API key required', sv: 'API-nyckel krävs' },
  back: { no: 'Tilbake', en: 'Back', sv: 'Tillbaka' },
  startMode: {
    no: (modeLabel: string) => `Start ${modeLabel}`,
    en: (modeLabel: string) => `Start ${modeLabel}`,
    sv: (modeLabel: string) => `Starta ${modeLabel}`,
  },
  swipeHint: {
    no: 'Sveip høyre = JA, venstre = NEI. Vi lærer profilen din.',
    en: 'Swipe right = YES, left = NO. We learn your taste profile.',
    sv: 'Svajpa höger = JA, vänster = NEJ. Vi lär oss din profil.',
  },
  total: { no: 'Totalt', en: 'Total', sv: 'Totalt' },
  yes: { no: 'JA', en: 'YES', sv: 'JA' },
  no: { no: 'NEI', en: 'NO', sv: 'NEJ' },
  fetch: { no: 'Finn forslag', en: 'Find suggestions', sv: 'Hitta förslag' },
  findMore: { no: 'Finn flere', en: 'Find more', sv: 'Hitta fler' },
  why: { no: 'Hvorfor', en: 'Why', sv: 'Varför' },
  resetDeck: { no: 'Start på nytt', en: 'Start over', sv: 'Börja om' },
  resetDeckHelp: {
    no: 'Du har sveipet gjennom alle kortene i denne modusen. Start på nytt for å få kort igjen.',
    en: 'You have swiped through all cards in this mode. Start over to get cards again.',
    sv: 'Du har svajpat igenom alla kort i detta läge. Börja om för att få kort igen.',
  },
  loading: { no: 'Henter…', en: 'Loading…', sv: 'Laddar…' },
  cooldown: {
    no: (s: number) => `Cooldown: ${s}s`,
    en: (s: number) => `Cooldown: ${s}s`,
    sv: (s: number) => `Cooldown: ${s}s`,
  },
  cooldownError: {
    no: (s: number) => `For mange forespørsler. Vent ${s}s og prøv igjen.`,
    en: (s: number) => `Too many requests. Wait ${s}s and try again.`,
    sv: (s: number) => `För många förfrågningar. Vänta ${s}s och försök igen.`,
  },
  backendColdStart: {
    no: 'Backend starter opp (cold start) - første kall kan time out. Vent litt og prøv igjen.',
    en: 'Backend is waking up (cold start) - the first call can time out. Wait a bit and try again.',
    sv: 'Backend vaknar (cold start) - första anropet kan time out. Vänta lite och försök igen.',
  },
  backendDown: {
    no: 'Backend utilgjengelig akkurat nå. Vi viser demo-forslag, men du kan prøve igjen.',
    en: 'Backend is unavailable right now. Showing demo suggestions - try again in a moment.',
    sv: 'Backend är otillgänglig just nu. Visar demo-förslag - försök igen om en stund.',
  },
  tryAgain: { no: 'Prøv igjen', en: 'Try again', sv: 'Försök igen' },
  swipeAtLeast: { no: 'Sveip noen flere kort først.', en: 'Swipe a few more cards first.', sv: 'Svajpa några fler kort först.' },
  swipeRemaining: {
    no: (n: number) => `Sveip ${n} til`,
    en: (n: number) => `Swipe ${n} more`,
    sv: (n: number) => `Svajpa ${n} till för att låsa upp förslag.`,
  },
  swipeMagicHint: {
    no: (n: number) => `${n} kort igjen før magien skjer ✨`,
    en: (n: number) => `${n} more swipes until the magic happens ✨`,
    sv: (n: number) => `${n} fler svajp innan magin händer ✨`,
  },
  resultsHeadline: {
    no: (dest: string) => `Her er dine treff i ${dest} 🎯`,
    en: (dest: string) => `Here's what we found in ${dest} for you 🎯`,
    sv: (dest: string) => `Här är dina träffar i ${dest} 🎯`,
  },
  deckEmptyTitle: { no: 'Ingen flere kort', en: 'No more cards', sv: 'Inga fler kort' },
  openLink: { no: 'Åpne lenke', en: 'Open link', sv: 'Öppna länk' },
  openMaps: { no: 'Åpne i Maps', en: 'Open in Maps', sv: 'Öppna i Maps' },

  // TS1: Settings / Delete history
  settingsTitle: { no: 'Innstillinger', en: 'Settings', sv: 'Inställningar' },
  deleteHistory: { no: 'Slett min historikk', en: 'Delete my history', sv: 'Radera min historik' },
  deleteConfirmTitle: { no: 'Start på nytt?', en: 'Start over?', sv: 'Börja om?' },
  deleteConfirmBody: {
    no: 'Vi glemmer alle sveipene dine og forrige resultater. Destinasjon og API-nøkkel beholdes.',
    en: 'We\u2019ll forget all your swipes and previous results. Destination and API key are kept.',
    sv: 'Vi glömmer alla dina svajpningar och tidigare resultat. Destination och API-nyckel behålls.',
  },
  deleteConfirmCancel: { no: 'Avbryt', en: 'Cancel', sv: 'Avbryt' },
  deleteConfirmOk: { no: 'Ja, start på nytt 🧹', en: 'Yes, start over 🧹', sv: 'Ja, börja om 🧹' },
  deleteSuccessToast: { no: 'Ferdig! Nytt eventyr venter 🌍', en: 'Done! A new adventure awaits 🌍', sv: 'Klart! Ett nytt äventyr väntar 🌍' },

  // TS1: Previous results
  lastResultsSeeAll: { no: 'Se alle', en: 'See all', sv: 'Se alla' },
  lastResultsJustNow: { no: 'akkurat nå', en: 'just now', sv: 'just nu' },

  // TS2: Landing + API guide
  landingHero: { no: 'Vanskelige valg?', en: 'Hard choices?', sv: 'Svåra val?' },
  landingSubtitle: {
    no: 'Fortell oss hva du elsker — vi finner resten 🗺️',
    en: 'Tell us what you love — we\'ll find the rest 🗺️',
    sv: 'Vi hjälper dig hitta det som faktiskt passar dig.',
  },
  landingCta: { no: '✈️  Kom i gang', en: '✈️  Get started', sv: '✈️  Kom igång' },
  landingTagline: {
    no: 'Ingen konto. Ingen reklame. Bare gode treff.',
    en: 'No account. No ads. Just great matches.',
    sv: 'Inget konto. Ingen reklam. Bara bra träffar.',
  },
  landingStep1: { no: '👆 Sveip 20 kort', en: '👆 Swipe 20 cards', sv: '👆 Svajpa 20 kort' },
  landingStep2: { no: '🧠 Vi lærer smaken din', en: '🧠 We learn your taste', sv: '🧠 Vi lär oss din smak' },
  landingStep3: { no: '🎯 Treff som passer deg', en: '🎯 Matches that fit you', sv: '🎯 Träffar som passar dig' },

  apiGuideTitle: { no: '🔑 API-nøkkel — 30 sekunder', en: '🔑 API Key — 30 seconds', sv: '🔑 API-nyckel — 30 sekunder' },
  apiGuideStep1: { no: 'Gå til console.anthropic.com', en: 'Go to console.anthropic.com', sv: 'Gå till console.anthropic.com' },
  apiGuideStep2: { no: 'Logg inn eller opprett konto (gratis)', en: 'Log in or create account (free)', sv: 'Logga in eller skapa konto (gratis)' },
  apiGuideStep3: { no: 'Klikk "API Keys" i venstremenyen', en: 'Click "API Keys" in the left menu', sv: 'Klicka "API Keys" i vänstermenyn' },
  apiGuideStep4: { no: 'Klikk "Create Key" og gi den et navn', en: 'Click "Create Key" and name it', sv: 'Klicka "Create Key" och namnge den' },
  apiGuideStep5: { no: 'Kopier nøkkelen og lim inn under', en: 'Copy the key and paste below', sv: 'Kopiera nyckeln och klistra in nedan' },
  apiGuideSave: { no: 'Lagre nøkkel ✓', en: 'Save key ✓', sv: 'Spara nyckel ✓' },
  apiGuidePrivacy: {
    no: 'Nøkkelen lagres kun i din nettleser. Vi ser den aldri.',
    en: 'The key is stored only in your browser. We never see it.',
    sv: 'Nyckeln lagras bara i din webbläsare. Vi ser den aldrig.',
  },
  apiGuideMenu: { no: '📜 API-nøkkel guide', en: '📜 API key guide', sv: '📜 API-nyckel guide' },

  // TS3: Profile
  profileTitle: { no: '🧠 Din smaksprofil så langt', en: '🧠 Your taste profile so far', sv: '🧠 Din smaksprofil hittills' },

  // TS4: Loading
  loadingCancel: { no: 'Avbryt', en: 'Cancel', sv: 'Avbryt' },

  // TS5: Swipe milestone
  swipeMilestone: {
    no: 'Bra! Du kan søke nå 🎯',
    en: 'Nice! You can search now 🎯',
    sv: 'Bra! Du kan söka nu 🎯',
  },

  // TS6: Map + Share
  viewList: { no: '📋 Liste', en: '📋 List', sv: '📋 Lista' },
  viewMap: { no: '🗺️ Kart', en: '🗺️ Map', sv: '🗺️ Karta' },
  shareButton: { no: 'Del 📤', en: 'Share 📤', sv: 'Dela 📤' },
  shareCopied: { no: 'Kopiert til utklippstavlen 📋', en: 'Copied to clipboard 📋', sv: 'Kopierat till urklipp 📋' },
  shareSuccess: { no: 'Delt! 🎉', en: 'Shared! 🎉', sv: 'Delat! 🎉' },
  mapNoCoordsAll: {
    no: 'Ingen av treffene har koordinater ennå. Prøv igjen og koordinater genereres automatisk.',
    en: 'None of the results have coordinates yet. Try again and they\'ll be generated automatically.',
    sv: 'Inga av träffarna har koordinater ännu. Prova igen så genereras de automatiskt.',
  },
};

// --- Modes

const MODE_LABELS: Record<Mode, { no: string; en: string; sv: string }> = {
  experiences: { no: 'Opplevelser', en: 'Experiences', sv: 'Upplevelser' },
  restaurants: { no: 'Restauranter', en: 'Restaurants', sv: 'Restauranger' },
};

const MODES_ORDERED: { mode: Mode; emoji: string }[] = [
  { mode: 'experiences', emoji: '🎭' },
  { mode: 'restaurants', emoji: '🍽️' },
];

// --- TS3: Dimension emoji map
const DIM_EMOJI: Record<string, string> = {
  adv: '🎒', soc: '👥', lux: '✨', act: '🏃', cul: '🏛️',
  nat: '🏔️', food: '🍜', night: '🌙', spont: '⚡',
};

// --- Storage
function keysFor(mode: Mode) {
  const suffix = mode === 'restaurants' ? '_restaurants' : '_experiences';
  return {
    swipes: `ts_swipes${suffix}`,
    totalSwipes: `ts_totalSwipes${suffix}`,
    seen: `ts_seen${suffix}`,
    catFilter: `ts_catFilter${suffix}`,
  };
}

function normalizeSeenKey(x: string) {
  if (x.startsWith('id:') || x.startsWith('name:')) return x;
  return `name:${x}`;
}

function itemSeenKey(it: Pick<RecItem, 'id' | 'name'>) {
  return it.id ? `id:${it.id}` : `name:${it.name}`;
}

function loadCatFilter(mode: Mode) {
  const K = keysFor(mode);
  try {
    return localStorage.getItem(K.catFilter) || '';
  } catch {
    return '';
  }
}

function saveCatFilter(mode: Mode, v: string) {
  const K = keysFor(mode);
  try {
    if (v) localStorage.setItem(K.catFilter, v);
    else localStorage.removeItem(K.catFilter);
  } catch {}
}

function loadMemory(mode: Mode) {
  const K = keysFor(mode);
  try {
    const swipes = JSON.parse(localStorage.getItem(K.swipes) || '{}') as Record<string, number>;
    const totalSwipes = parseInt(localStorage.getItem(K.totalSwipes) || '0', 10);
    const seenRaw = JSON.parse(localStorage.getItem(K.seen) || '[]') as any;
    const seen = Array.isArray(seenRaw)
      ? [...new Set(seenRaw.map((x: any) => normalizeSeenKey(String(x || ''))).filter(Boolean))]
      : [];
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
    const cleaned = [...new Set(seen.map((x) => normalizeSeenKey(String(x || ''))).filter(Boolean))];
    localStorage.setItem(K.seen, JSON.stringify(cleaned));
  } catch {}
}

function getOrCreateId(key: string) {
  try {
    const cur = localStorage.getItem(key);
    if (cur) return cur;
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `u_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

// --- TS1: Last results storage
function destSlug(dest: string): string {
  return dest.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
}

function saveLastResults(mode: Mode, dest: string, items: RecItem[], lang: Lang) {
  const slug = destSlug(dest);
  const key = `ts_last_results_${mode}_${slug}`;
  try {
    let toSave = items;
    const payload = JSON.stringify({ ts: Date.now(), dest, items: toSave, lang });
    if (payload.length > 80000) toSave = items.slice(0, 5);
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), dest, items: toSave, lang }));
  } catch {}
}

function loadLastResults(mode: Mode, dest: string): { ts: number; dest: string; items: RecItem[]; lang: Lang } | null {
  const slug = destSlug(dest);
  try {
    const raw = localStorage.getItem(`ts_last_results_${mode}_${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items)) return null;
    return parsed;
  } catch { return null; }
}

function deleteAllHistory() {
  try {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('ts_swipes_') || k.startsWith('ts_totalSwipes_') ||
        k.startsWith('ts_seen_') || k.startsWith('ts_catFilter_') ||
        k.startsWith('ts_last_results_')
      ) {
        keysToDelete.push(k);
      }
    }
    // Also delete without underscore suffix (legacy keys)
    for (const suffix of ['_experiences', '_restaurants']) {
      keysToDelete.push(`ts_swipes${suffix}`, `ts_totalSwipes${suffix}`, `ts_seen${suffix}`, `ts_catFilter${suffix}`);
    }
    const unique = [...new Set(keysToDelete)];
    unique.forEach(k => localStorage.removeItem(k));
  } catch {}
}

// --- Cards (dataset-driven)

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
  const labels = Object.fromEntries(DIMS.map((d) => [d, tData(lang, `dims.${d}`)])) as Record<string, string>;

  const parts: string[] = [];
  for (const [k, v] of Object.entries(dims)) {
    if (Math.abs(v) <= 10) continue;

    const abs = Math.abs(v);
    const level = abs > 70
      ? (lang === 'no' ? 'svært' : lang === 'sv' ? 'väldigt' : 'very')
      : abs > 40
        ? (lang === 'no' ? 'ganske' : lang === 'sv' ? 'ganska' : 'moderately')
        : (lang === 'no' ? 'litt' : lang === 'sv' ? 'lite' : 'somewhat');

    const dir = v > 0 ? '' : (lang === 'no' ? ' ikke' : lang === 'sv' ? ' inte' : ' not');
    const label = labels[k] || k;
    parts.push(`${level}${dir} ${label.toLowerCase()} (${k}:${Math.round(v)})`);
  }

  return parts.join(', ') || (lang === 'no' ? 'balansert reisende' : lang === 'sv' ? 'balanserad resenär' : 'balanced traveler');
}

// Clean version of describeProfile for UI display (strips dim keys)
function describeProfileClean(dims: Record<string, number>, lang: Lang) {
  const labels = Object.fromEntries(DIMS.map((d) => [d, tData(lang, `dims.${d}`)])) as Record<string, string>;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(dims)) {
    if (Math.abs(v) <= 10) continue;
    const abs = Math.abs(v);
    const level = abs > 70
      ? (lang === 'no' ? 'svært' : lang === 'sv' ? 'väldigt' : 'very')
      : abs > 40
        ? (lang === 'no' ? 'ganske' : lang === 'sv' ? 'ganska' : 'moderately')
        : (lang === 'no' ? 'litt' : lang === 'sv' ? 'lite' : 'somewhat');
    const dir = v > 0 ? '' : (lang === 'no' ? ' ikke' : lang === 'sv' ? ' inte' : ' not');
    const label = labels[k] || k;
    parts.push(`${level}${dir} ${label.toLowerCase()}`);
  }
  return parts.join(', ') || (lang === 'no' ? 'balansert reisende' : lang === 'sv' ? 'balanserad resenär' : 'balanced traveler');
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

type RecItem = {
  id?: string;
  name: string;
  cat?: string;
  match?: number;
  why?: string;
  url?: string;
  source?: string;
  snippet?: string;
  domain?: string;
  query_source?: string;
  quote?: string;
  price?: string;
  duration?: string;
  lat?: number;
  lng?: number;
};

function parseItems(result: string, lang: Lang): RecItem[] {
  const jsonMatch = result.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [{ name: lang === 'no' ? 'AI-svar mottatt' : lang === 'sv' ? 'AI-svar mottaget' : 'AI response received', why: result.slice(0, 400), match: 50 }];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function motionMs(ms: number) {
  try {
    const reduce = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduce ? 0 : ms;
  } catch {
    return ms;
  }
}

// --- TS1: Toast component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      padding: `${S.sm}px ${S.lg}px`,
      borderRadius: R.pill,
      background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
      color: T.bg,
      fontWeight: F.weight.black,
      fontSize: F.size.base,
      zIndex: 9500,
      animation: visible ? 'toastIn 300ms ease both' : 'toastOut 300ms ease both',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {message}
    </div>
  );
}

// --- TS1: ConfirmDialog
function ConfirmDialog({ title, body, cancelText, confirmText, onCancel, onConfirm }: {
  title: string; body: string; cancelText: string; confirmText: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9100, display: 'grid', placeItems: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: R.lg, padding: S.page,
          maxWidth: 380, width: '90%', boxShadow: T.shadow,
        }}
      >
        <div style={{ fontWeight: F.weight.black, fontSize: F.size.lg, marginBottom: S.sm }}>{title}</div>
        <div style={{ color: T.dim, lineHeight: 1.6, marginBottom: S.lg }}>{body}</div>
        <div style={{ display: 'flex', gap: S.sm }}>
          <button onClick={onCancel} className="btnPill" style={{ flex: 1, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className="btnPill btnPillPrimary" style={{ flex: 1 }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- TS1: SettingsMenu
function SettingsMenu({ lang, onDeleteHistory, onApiGuide, onClose }: {
  lang: Lang; onDeleteHistory: () => void; onApiGuide: () => void; onClose: () => void;
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 8900 }} />
      <div style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 8950,
        background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: R.lg,
        padding: `${S.sm}px 0`, minWidth: 220, boxShadow: T.shadow,
      }}>
        <div style={{ padding: `${S.xs2}px ${S.md}px`, color: T.dim, fontSize: F.size.sm, fontWeight: F.weight.bold }}>
          {UI.settingsTitle[lang]}
        </div>
        <button
          onClick={() => { onDeleteHistory(); onClose(); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: `${S.sm}px ${S.md}px`,
            background: 'transparent', border: 'none', color: T.red, cursor: 'pointer', fontSize: F.size.base,
          }}
        >
          🗑️ {UI.deleteHistory[lang]}
        </button>
        <button
          onClick={() => { onApiGuide(); onClose(); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: `${S.sm}px ${S.md}px`,
            background: 'transparent', border: 'none', color: T.txt, cursor: 'pointer', fontSize: F.size.base,
          }}
        >
          {UI.apiGuideMenu[lang]}
        </button>
      </div>
    </>
  );
}

// --- TS2: ApiKeyGuideModal
function ApiKeyGuideModal({ lang, onClose, onSave, currentKey }: {
  lang: Lang; onClose: () => void; onSave: (key: string) => void; currentKey: string;
}) {
  const [key, setKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000, display: 'grid', placeItems: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card, border: `1px solid ${T.borderSoft}`, borderRadius: R.lg, padding: S.page,
        maxWidth: 440, width: '92%', boxShadow: T.shadow, maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ fontWeight: F.weight.black, fontSize: F.size.lg, marginBottom: S.md }}>{UI.apiGuideTitle[lang]}</div>
        <ol style={{ margin: 0, paddingLeft: 20, color: T.txt, lineHeight: 2, fontSize: F.size.base }}>
          <li>{UI.apiGuideStep1[lang]} <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: T.teal }}>🔗</a></li>
          <li>{UI.apiGuideStep2[lang]}</li>
          <li>{UI.apiGuideStep3[lang]}</li>
          <li>{UI.apiGuideStep4[lang]}</li>
          <li>{UI.apiGuideStep5[lang]}</li>
        </ol>
        <div style={{ marginTop: S.md, position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              width: '100%', padding: `${S.sm2}px ${S.xl + 20}px ${S.sm2}px ${S.sm2}px`,
              borderRadius: R.md, border: `1px solid ${T.border}`, background: T.glassHi,
              color: T.txt, fontFamily: 'monospace', fontSize: F.size.sm,
            }}
          />
          <button onClick={() => setShowKey(!showKey)} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 16,
          }}>
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
        <button
          onClick={() => { onSave(key); onClose(); }}
          className="btnPill btnPillPrimary"
          style={{ width: '100%', marginTop: S.sm2 }}
        >
          {UI.apiGuideSave[lang]}
        </button>
        <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.sm, textAlign: 'center', lineHeight: 1.5 }}>
          {UI.apiGuidePrivacy[lang]}
        </div>
      </div>
    </div>
  );
}

// --- TS3: ModeTabBar
function ModeTabBar({ mode, lang, onChange }: { mode: Mode; lang: Lang; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: 'flex', gap: S.xs2, marginBottom: S.md }}>
      {MODES_ORDERED.map(({ mode: m, emoji }) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            flex: 1,
            padding: `${S.sm}px ${S.md}px`,
            borderRadius: R.pill,
            border: mode === m ? 'none' : `1px solid ${T.borderSoft}`,
            cursor: 'pointer',
            background: mode === m ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : 'transparent',
            color: mode === m ? T.bg : T.dim,
            fontWeight: F.weight.black,
            fontSize: F.size.base,
            transition: `all ${M.snap}ms ${M.ease}`,
          }}
        >
          {emoji} {MODE_LABELS[m][lang]}
        </button>
      ))}
    </div>
  );
}

// --- TS3: ProfileSummary
function ProfileSummary({ swipes, cards, lang, totalSwipes }: {
  swipes: Record<string, number>; cards: Card[]; lang: Lang; totalSwipes: number;
}) {
  const [open, setOpen] = useState(false);
  const minForProfile = 10;
  const remaining = Math.max(0, minForProfile - totalSwipes);

  if (totalSwipes < minForProfile) {
    return (
      <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.md, textAlign: 'center' }}>
        {lang === 'no' ? `Sveip ${remaining} til for å se smaksprofilen din` :
         lang === 'sv' ? `Svajpa ${remaining} till för att se din smakprofil` :
         `Swipe ${remaining} more to see your taste profile`}
      </div>
    );
  }

  const dims = calcProfile(swipes, cards);
  const topDims = Object.entries(dims)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5)
    .filter(([, v]) => Math.abs(v) > 10);

  const cleanDesc = describeProfileClean(dims, lang);

  return (
    <div style={{ marginTop: S.md }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: S.xs2, width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer', color: T.txt,
          fontWeight: F.weight.bold, fontSize: F.size.base, padding: `${S.xs2}px 0`,
        }}
      >
        {UI.profileTitle[lang]} <span style={{ color: T.dim, fontSize: F.size.sm }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ padding: S.sm2, background: T.glassHi, borderRadius: R.lg, border: `1px solid ${T.borderSoft}`, marginTop: S.xs2 }}>
          <div style={{
            padding: `${S.sm}px ${S.md}px`, background: T.glassLo, borderRadius: R.md,
            color: T.txt, lineHeight: 1.6, fontSize: F.size.base,
          }}>
            {lang === 'no' ? `Du virker som en ${cleanDesc} 🗺️` :
             lang === 'sv' ? `Du verkar vara en ${cleanDesc} resenär 🗺️` :
             `You seem like a ${cleanDesc} traveler 🗺️`}
          </div>

          <div style={{ display: 'flex', gap: S.xs2, flexWrap: 'wrap', marginTop: S.sm }}>
            {topDims.map(([k, v]) => {
              const positive = v > 0;
              const label = tData(lang, `dims.${k}`) || k;
              return (
                <span key={k} style={{
                  padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill, fontSize: F.size.sm, fontWeight: F.weight.bold,
                  border: `1px solid ${positive ? T.green : T.red}`,
                  background: positive ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                  color: positive ? T.green : T.red,
                }}>
                  {DIM_EMOJI[k] || '📊'} {label} {positive ? '+' : ''}{Math.round(v)}
                </span>
              );
            })}
          </div>

          <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.sm }}>
            {lang === 'no' ? `Basert på ${totalSwipes} av ${cards.length} kort` :
             lang === 'sv' ? `Baserat på ${totalSwipes} av ${cards.length} kort` :
             `Based on ${totalSwipes} of ${cards.length} cards`}
            <div style={{
              width: '100%', height: 3, borderRadius: R.pill, background: T.borderSoft, marginTop: S.xs2, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, (totalSwipes / cards.length) * 100)}%`,
                height: '100%', borderRadius: R.pill,
                background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                transition: `width 300ms ease`,
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- TS4: FlyLoadingScreen
const LANDMARKS = [
  { emoji: '🗼', name: 'Paris' }, { emoji: '🗽', name: 'New York' }, { emoji: '🏯', name: 'Tokyo' },
  { emoji: '🕌', name: 'Istanbul' }, { emoji: '⛩️', name: 'Kyoto' }, { emoji: '🏔️', name: 'Alps' },
  { emoji: '🏖️', name: 'Maldives' }, { emoji: '🏛️', name: 'Rome' }, { emoji: '🌋', name: 'Iceland' },
  { emoji: '🎡', name: 'London' }, { emoji: '🕍', name: 'Jerusalem' }, { emoji: '🏰', name: 'Prague' },
  { emoji: '🎠', name: 'Vienna' }, { emoji: '🌁', name: 'San Francisco' },
];

const FUN_FACTS: Record<Lang, string[]> = {
  no: [
    'Visste du? Barcelona har 4,4 km strender midt i storbyen.',
    'Tokyo har flere Michelin-stjerner enn noen annen by i verden.',
    'Island har ingen mygg. Ikke én.',
    'I Venezia er det flere kanaler enn veier.',
    'New Zealand er det første landet med universell stemmerett.',
    'Singapore forbyr tyggegummi. Selvsagt.',
    'Portugal er det eldste landet i Europa med uendrede grenser.',
    'Frankrike er det mest besøkte landet i verden — hvert år.',
    'Den store barriere-revet er synlig fra verdensrommet.',
    'Amsterdam har flere sykler enn innbyggere.',
    'Antarktis er den eneste kontinenten uten tidszone.',
    'Montana har tre ganger så mange kyr som mennesker.',
    'I Japan finnes det hoteller kun for katter.',
    'Kyoto var den opprinnelige japanske keiserhovedstaden i over tusen år.',
    'Machu Picchu ble ikke oppdaget av europeere før i 1911.',
  ],
  en: [
    'Did you know? Barcelona has 4.4 km of beaches right in the city.',
    'Tokyo has more Michelin stars than any other city on Earth.',
    'Iceland has no mosquitoes. Not a single one.',
    'Venice has more canals than roads.',
    'New Zealand was the first country with universal suffrage.',
    'Singapore banned chewing gum. Obviously.',
    'Portugal is the oldest country in Europe with unchanged borders.',
    'France is the world\'s most visited country — every single year.',
    'The Great Barrier Reef is visible from space.',
    'Amsterdam has more bikes than people.',
    'Antarctica is the only continent without a time zone.',
    'Montana has three times as many cows as humans.',
    'Japan has hotels exclusively for cats.',
    'Kyoto was Japan\'s imperial capital for over a thousand years.',
    'Machu Picchu wasn\'t discovered by Europeans until 1911.',
  ],
  sv: [
    'Visste du? Barcelona har 4,4 km stränder mitt i storstaden.',
    'Tokyo har fler Michelin-stjärnor än någon annan stad i världen.',
    'Island har inga myggor. Inte en enda.',
    'Venedig har fler kanaler än vägar.',
    'Nya Zeeland var det första landet med allmän rösträtt.',
    'Singapore förbjöd tuggummi. Självklart.',
    'Portugal är Europas äldsta land med oförändrade gränser.',
    'Frankrike är världens mest besökta land — varje enskilt år.',
    'Stora barriärrevet syns från rymden.',
    'Amsterdam har fler cyklar än invånare.',
    'Antarktis är den enda kontinenten utan tidszon.',
    'Montana har tre gånger fler kor än människor.',
    'Japan har hotell enbart för katter.',
    'Kyoto var Japans kejserliga huvudstad i över tusen år.',
    'Machu Picchu upptäcktes inte av européer förrän 1911.',
  ],
};

function FlyLoadingScreen({ destination, lang, mode, onCancel }: {
  destination: string; lang: Lang; mode: Mode; onCancel: () => void;
}) {
  const [factIndex, setFactIndex] = useState(0);
  const facts = FUN_FACTS[lang];

  // Pick 5 stable landmarks based on destination
  const chosenLandmarks = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < destination.length; i++) hash = ((hash << 5) - hash + destination.charCodeAt(i)) | 0;
    const shuffled = [...LANDMARKS].sort((a, b) => {
      const ha = ((hash * 31 + a.name.charCodeAt(0)) | 0) % 100;
      const hb = ((hash * 31 + b.name.charCodeAt(0)) | 0) % 100;
      return ha - hb;
    });
    return shuffled.slice(0, 5);
  }, [destination]);

  useEffect(() => {
    const iv = setInterval(() => setFactIndex(i => (i + 1) % facts.length), 4000);
    return () => clearInterval(iv);
  }, [facts.length]);

  const modeLabel = MODE_LABELS[mode][lang].toLowerCase();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000, background: T.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: S.page,
    }}>
      {/* Plane */}
      <div style={{
        fontSize: 48, animation: 'flyAcross 3.5s ease-in-out infinite alternate',
        position: 'absolute', top: '25%',
      }}>
        ✈️
      </div>

      {/* Landmarks */}
      <div style={{ display: 'flex', gap: S.xl, marginBottom: S.xl, marginTop: 80 }}>
        {chosenLandmarks.map((lm, i) => (
          <div key={lm.name} style={{
            fontSize: 36, animation: `landmarkPop 2.5s ease-in-out ${i * 0.3}s infinite`,
          }}>
            {lm.emoji}
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center', marginBottom: S.xl }}>
        <div style={{ fontSize: F.size.lg, fontWeight: F.weight.bold, color: T.txt }}>
          {lang === 'no' ? `Søker etter ${modeLabel} i` :
           lang === 'sv' ? `Söker efter ${modeLabel} i` :
           `Finding ${modeLabel} in`}
        </div>
        <div style={{ fontSize: F.size.hero, fontWeight: F.weight.ultra, color: T.gold, marginTop: S.xs2 }}>
          {destination}
        </div>
      </div>

      {/* Fun facts */}
      <div style={{
        maxWidth: 360, textAlign: 'center', borderTop: `1px solid ${T.borderSoft}`,
        borderBottom: `1px solid ${T.borderSoft}`, padding: `${S.md}px 0`,
        color: T.dim, fontStyle: 'italic', fontSize: F.size.base, lineHeight: 1.6,
        minHeight: 60,
      }}>
        <div key={factIndex} style={{ animation: 'factFade 4s ease both' }}>
          {facts[factIndex]}
        </div>
      </div>

      {/* Cancel */}
      <button onClick={onCancel} style={{
        marginTop: S.lg, background: 'transparent', border: 'none', color: T.dim,
        cursor: 'pointer', fontSize: F.size.sm, textDecoration: 'underline',
      }}>
        {UI.loadingCancel[lang]}
      </button>
    </div>
  );
}

// --- TS5 + Original: SwipeStack (enhanced)
function SwipeStack({
  cards,
  lang,
  onSwipe,
  totalSwipes,
}: {
  cards: Card[];
  lang: Lang;
  onSwipe: (card: Card, val: number) => void;
  totalSwipes: number;
}) {
  const top = cards[0];

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const thresholdX = 95;

  const badgeYesOpacity = clamp(dx / 90, 0, 1);
  const badgeNoOpacity = clamp(-dx / 90, 0, 1);

  // TS5: glow calculations
  const greenGlow = Math.min(1, Math.max(0, dx / 120));
  const redGlow = Math.min(1, Math.max(0, -dx / 120));
  const glowIntensity = Math.max(greenGlow, redGlow);
  const liftY = Math.abs(dx) > 30 ? -8 : 0;

  function reset() {
    setDx(0);
    setDy(0);
    setDragging(false);
    start.current = null;
  }

  function commitSwipe(val: number) {
    if (!top || animating) return;
    setAnimating(true);

    // TS5: small pop before fly-out
    setDx(val * 12);
    setDy(-8);

    window.setTimeout(() => {
      const offX = val * Math.max(440, Math.floor(window.innerWidth * 0.9));
      setDx(offX);
      setDy(dy - 20);

      window.setTimeout(() => {
        onSwipe(top, val);
        setAnimating(false);
        reset();
      }, motionMs(M.commit));
    }, motionMs(60));
  }

  function endGesture(finalDx: number) {
    setDragging(false);
    start.current = null;

    if (finalDx > thresholdX) {
      commitSwipe(1);
      return;
    }
    if (finalDx < -thresholdX) {
      commitSwipe(-1);
      return;
    }

    setDx(0);
    setDy(0);
  }

  const minProgressPct = Math.min(100, (totalSwipes / MIN_SWIPES) * 100);

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (animating) return;
        if (e.key === 'ArrowLeft') commitSwipe(-1);
        if (e.key === 'ArrowRight') commitSwipe(1);
      }}
      style={{
        position: 'relative',
        height: 'min(72vh, 520px)',
        width: '100%',
        maxWidth: 400,
        margin: '0 auto',
        outline: 'none',
      }}
    >
      {totalSwipes < MIN_SWIPES && (
        <div style={{ marginBottom: S.sm2 }}>
          <div style={{
            width: '100%',
            maxWidth: 400,
            height: 4,
            borderRadius: 4,
            background: T.borderSoft,
            overflow: 'hidden',
            margin: '0 auto',
          }}>
            <div style={{
              width: `${minProgressPct}%`,
              height: '100%',
              borderRadius: 4,
              background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
              transition: `width ${M.snap}ms ${M.ease}`,
            }} />
          </div>
          <div style={{ marginTop: S.xs2, textAlign: 'center', color: T.dim, fontSize: F.size.sm }}>
            {Math.min(totalSwipes, MIN_SWIPES)} / {MIN_SWIPES}
          </div>
        </div>
      )}

      {top && (
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            touchAction: 'pan-y',
          }}
        >
          <div
            onPointerDown={(e) => {
              if (animating) return;
              setDragging(true);
              start.current = { x: e.clientX, y: e.clientY };
              (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragging || !start.current) return;
              setDx(e.clientX - start.current.x);
              setDy(e.clientY - start.current.y);
            }}
            onPointerUp={() => endGesture(dx)}
            onPointerCancel={() => endGesture(dx)}
            style={{
              width: '100%',
              // TS5: direction-based glow
              background: glowIntensity > 0.05
                ? `radial-gradient(ellipse at ${dx > 0 ? '80%' : '20%'} 50%, rgba(${dx > 0 ? '52,211,153' : '248,113,113'}, ${glowIntensity * 0.18}) 0%, ${T.card} 60%)`
                : T.card,
              border: `1px solid ${Math.abs(dx) > 40 ? (dx > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)') : T.border}`,
              borderRadius: R.xl,
              padding: '32px 24px',
              // TS5: improved tilt + lift
              transform: `translate(${dx}px, ${dy + liftY}px) rotate(${dx / 15}deg)`,
              transition: dragging
                ? 'none'
                : animating
                  ? `transform ${M.commit}ms cubic-bezier(0.4, 0, 0.2, 1)`
                  : `transform ${M.snap}ms ${M.ease}`,
              // TS5: enhanced shadow on drag
              boxShadow: dragging
                ? `0 28px 80px rgba(0,0,0,0.65), 0 0 0 1px ${Math.abs(dx) > 40 ? (dx > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)') : T.border}`
                : T.shadow,
              userSelect: 'none',
              position: 'relative',
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            {/* TS5: Enhanced badges with pulse + backdrop blur */}
            <div
              style={{
                position: 'absolute',
                top: S.md,
                left: S.md,
                padding: '6px 14px',
                borderRadius: R.sm,
                border: `3px solid ${T.red}`,
                color: T.red,
                fontWeight: F.weight.ultra,
                fontSize: F.size.md,
                letterSpacing: 1,
                transform: 'rotate(-14deg)',
                opacity: dragging ? badgeNoOpacity : 0,
                background: T.overlay,
                backdropFilter: 'blur(4px)',
                animation: dragging && badgeNoOpacity > 0.7 ? 'badgePulse 0.6s ease infinite' : 'none',
              }}
            >
              {UI.no[lang]}
            </div>
            <div
              style={{
                position: 'absolute',
                top: S.md,
                right: S.md,
                padding: '6px 14px',
                borderRadius: R.sm,
                border: `3px solid ${T.green}`,
                color: T.green,
                fontWeight: F.weight.ultra,
                fontSize: F.size.md,
                letterSpacing: 1,
                transform: 'rotate(14deg)',
                opacity: dragging ? badgeYesOpacity : 0,
                background: T.overlay,
                backdropFilter: 'blur(4px)',
                animation: dragging && badgeYesOpacity > 0.7 ? 'badgePulseRight 0.6s ease infinite' : 'none',
              }}
            >
              {UI.yes[lang]}
            </div>

            <div style={{ fontSize: '4rem', textAlign: 'center', paddingTop: 24, lineHeight: 1 }}>
              {top.emoji}
            </div>
            <div style={{ fontWeight: F.weight.black, fontSize: '1.25rem', textAlign: 'center' }}>
              {top.q}
            </div>
            <div style={{ color: T.dim, fontSize: '0.95rem', textAlign: 'center', maxWidth: 280, lineHeight: 1.5 }}>
              {top.desc}
            </div>
            <div style={{ flex: 1 }} />
          </div>
        </div>
      )}
    </div>
  );
}

// --- TS6: MapView
function MapView({ items, destination, lang }: { items: RecItem[]; destination: string; lang: Lang }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  const validItems = useMemo(() => items.filter(i => typeof i.lat === 'number' && typeof i.lng === 'number'), [items]);

  useEffect(() => {
    if (!mapRef.current || typeof (window as any).L === 'undefined') return;
    const L = (window as any).L;

    if (leafletMap.current) {
      leafletMap.current.remove();
      leafletMap.current = null;
    }

    if (validItems.length === 0) return;

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
    leafletMap.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '\u00a9 OpenStreetMap contributors \u00a9 CARTO',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#d4a574,#2dd4bf);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#0a0d1a;box-shadow:0 2px 8px rgba(0,0,0,0.5);">★</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const markers: any[] = [];
    validItems.forEach((item) => {
      const marker = L.marker([item.lat!, item.lng!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;color:#0a0d1a;min-width:180px">
            <div style="font-weight:900;font-size:14px">${item.name}</div>
            ${item.cat ? `<div style="font-size:11px;margin-top:2px;opacity:0.7">${item.cat}</div>` : ''}
            ${item.match ? `<div style="margin-top:4px;font-size:12px;font-weight:700">Match: ${item.match}%</div>` : ''}
            ${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="display:block;margin-top:6px;font-size:12px;color:#0070f3">${lang === 'no' ? 'Åpne' : 'Open'} →</a>` : ''}
          </div>
        `);
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.3));
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [validItems, lang]);

  const noCoords = items.length - validItems.length;

  if (validItems.length === 0) {
    return (
      <div style={{ padding: S.page, textAlign: 'center', color: T.dim, lineHeight: 1.6 }}>
        {UI.mapNoCoordsAll[lang]}
      </div>
    );
  }

  return (
    <div>
      <div ref={mapRef} style={{ height: 420, borderRadius: R.lg, overflow: 'hidden', border: `1px solid ${T.borderSoft}` }} />
      {noCoords > 0 && (
        <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.xs2, textAlign: 'center' }}>
          {lang === 'no' ? `${noCoords} treff mangler koordinater og vises ikke på kartet.` :
           lang === 'sv' ? `${noCoords} träffar saknar koordinater och visas inte på kartan.` :
           `${noCoords} results have no coordinates and aren't shown on the map.`}
        </div>
      )}
    </div>
  );
}

// --- TS6: Share function
async function shareResults(items: RecItem[], destination: string, lang: Lang): Promise<'shared' | 'copied' | 'manual'> {
  const topItems = items.slice(0, 8);
  const lines = topItems.map((i, idx) =>
    `${idx + 1}. ${i.name}${i.match ? ` (${i.match}% match)` : ''}${i.url ? `\n   ${i.url}` : ''}`
  );

  const header = lang === 'no'
    ? `🗺️ Mine reisetreff i ${destination} (via Travel-Swish)\n\n`
    : lang === 'sv'
      ? `🗺️ Mina resefynd i ${destination} (via Travel-Swish)\n\n`
      : `🗺️ My travel finds in ${destination} (via Travel-Swish)\n\n`;

  const footer = `\nhttps://slookisen.github.io/Travel-swish`;
  const text = header + lines.join('\n\n') + footer;

  if (navigator.share) {
    try {
      await navigator.share({ title: `Travel-Swish: ${destination}`, text });
      return 'shared';
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'manual';
  }
}

// --- TS2: Landing page emoji rotation
const LANDING_EMOJI = ['🗼', '🗽', '🏯', '🏖️', '🎡', '🌋', '🏔️', '🎠', '🕌', '⛩️'];

// --- TS1: Relative time helper
function relativeTime(ts: number, lang: Lang): string {
  const diffMs = Date.now() - ts;
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (hours < 1) return UI.lastResultsJustNow[lang];
  if (hours < 24) return lang === 'no' ? `${hours}t siden` : lang === 'sv' ? `${hours}t sedan` : `${hours}h ago`;
  return lang === 'no' ? `${days} dager siden` : lang === 'sv' ? `${days} dagar sedan` : `${days} days ago`;
}

// ========================= MAIN APP =========================

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  const [lang, setLang] = useState<Lang>(() => {
    try {
      const saved = (localStorage.getItem('ts_lang') || '') as Lang;
      if (saved === 'no' || saved === 'en' || saved === 'sv') return saved;
    } catch {}
    const nav = (typeof navigator !== 'undefined' ? (navigator.language || '') : '').toLowerCase();
    if (nav.startsWith('sv')) return 'sv';
    if (nav.startsWith('no') || nav.startsWith('nb') || nav.startsWith('nn')) return 'no';
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
    try { return localStorage.getItem('ts_apiKey') || ''; } catch { return ''; }
  });
  const [userId] = useState(() => getOrCreateId('ts_user_id'));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [backendNotice, setBackendNotice] = useState<null | { kind: 'cold' | 'down'; msg: string }>(null);
  const backendRetryCount = useRef(0);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [items, setItems] = useState<RecItem[]>([]);
  const [catFilter, setCatFilter] = useState(() => loadCatFilter(mode));
  const seenKeys = useRef<string[]>([]);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);

  // TS1: Settings + confirm + toast
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApiGuide, setShowApiGuide] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // TS2: Landing emoji
  const [emojiIndex, setEmojiIndex] = useState(0);

  // TS5: milestone toast
  const milestoneShown = useRef(false);

  // TS6: results view tab
  const [resultsTab, setResultsTab] = useState<'list' | 'map'>('list');

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
    setTimeout(() => setToastMsg(''), 2500);
  }

  useEffect(() => {
    if (page !== 'home') return;
    setError('');
    const t = setTimeout(() => destinationInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [page]);

  // TS2: emoji rotation on landing
  useEffect(() => {
    if (page !== 'landing') return;
    const iv = setInterval(() => setEmojiIndex(i => (i + 1) % LANDING_EMOJI.length), 1800);
    return () => clearInterval(iv);
  }, [page]);

  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);
  useEffect(() => {
    const base = String((import.meta as any).env?.BASE_URL || '/');
    const url = `${base}version.json?ts=${Date.now()}`;
    fetch(url, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((j: any) => {
        const remote = String(j?.version || '').trim();
        if (remote && remote !== APP_VERSION) setUpdateAvailable(remote);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mem = loadMemory(mode);
    seenKeys.current = mem.seen;
    setCatFilter(loadCatFilter(mode));
    setInfo('');
    setBackendNotice(null);
    backendRetryCount.current = 0;
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

  useEffect(() => { try { localStorage.setItem('ts_mode', mode); } catch {} }, [mode]);
  useEffect(() => { try { localStorage.setItem('ts_destination', destination); } catch {} }, [destination]);
  useEffect(() => {
    try {
      if (apiKey) localStorage.setItem('ts_apiKey', apiKey);
      else localStorage.removeItem('ts_apiKey');
    } catch {}
  }, [apiKey]);

  const cards = useMemo(() => getDeckCards(mode, lang), [mode, lang]);
  const mem = useMemo(() => loadMemory(mode), [mode]);

  const [swipes, setSwipes] = useState<Record<string, number>>(mem.swipes);
  const [totalSwipes, setTotalSwipes] = useState<number>(mem.totalSwipes);

  useEffect(() => {
    const m = loadMemory(mode);
    setSwipes(m.swipes);
    setTotalSwipes(m.totalSwipes);
  }, [mode]);

  const unswiped = useMemo(() => {
    const ids = new Set(Object.keys(swipes));
    return cards.filter(c => !ids.has(c.id));
  }, [cards, swipes]);

  const [deck, setDeck] = useState<Card[]>(() => []);
  const [deckIndex, setDeckIndex] = useState(0);

  useEffect(() => {
    const fresh = shuffleArray(unswiped);
    setDeck(fresh);
    setDeckIndex(0);
  }, [mode, lang, unswiped.length]);

  const swipeCount = Math.max(totalSwipes, Object.keys(swipes).length);
  const canSearch = swipeCount >= MIN_SWIPES;
  const swipeRemaining = Math.max(0, MIN_SWIPES - swipeCount);

  // TS1: last results for home page
  const lastResults = useMemo(() => {
    if (!destination.trim()) return null;
    return loadLastResults(mode, destination.trim());
  }, [mode, destination, items]); // re-check when items change

  async function findItems() {
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(UI.cooldownError[lang](cooldownLeft));
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    setBackendNotice(null);

    try {
      const profile = calcProfile(swipes, cards);
      const prefs: Record<string, number> = Object.fromEntries(
        Object.entries(profile).map(([k, v]) => [k, Math.round((v / 100) * 1000) / 1000])
      );
      const dest = destination.trim();

      if (MOCK_MODE) {
        const mockItems: RecItem[] = [
          {
            id: `mock_${mode}_1`,
            name: mode === 'restaurants' ? 'Mock: Sjømatbistro' : 'Mock: Street food tour',
            url: 'https://example.com',
            cat: mode === 'restaurants' ? 'Restaurant' : 'Experience',
            match: 86,
            why: 'Mock mode: deterministic suggestion for QA/Playwright.',
            source: 'mock',
            snippet: 'Dette er et mock-resultat (ingen backend-kall).',
            domain: 'example.com',
          },
          {
            id: `mock_${mode}_2`,
            name: mode === 'restaurants' ? 'Mock: Ramen' : 'Mock: Museum crawl',
            url: 'https://example.com',
            cat: mode === 'restaurants' ? 'Restaurant' : 'Experience',
            match: 78,
            why: 'Mock mode: verifies results rendering + why panel.',
            source: 'mock',
            snippet: 'Mock-resultat #2.',
            domain: 'example.com',
          },
        ];

        const newKeys = mockItems.map(itemSeenKey).filter(Boolean);
        seenKeys.current = [...seenKeys.current, ...newKeys];
        saveSeen(mode, seenKeys.current);

        setItems(mockItems);
        saveLastResults(mode, dest, mockItems, lang);
        setPage('results');
        setInfo(lang === 'no' ? 'Mock mode aktiv (ingen backend-kall).' : 'Mock mode active (no backend calls).');
        return;
      }

      if (BACKEND_URL) {
        try {
          const warm = backendRetryCount.current > 0;
          const prefsTimeoutMs = warm ? 20000 : 8000;
          const recsTimeoutMs = warm ? 45000 : 20000;

          await fetchJson(`${BACKEND_URL}/prefs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, mode, prefs, updated_ts: nowS() }),
            timeoutMs: prefsTimeoutMs,
          });

          const j = await fetchJson(`${BACKEND_URL}/recs/web`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, mode, destination: dest, limit: 20 }),
            timeoutMs: recsTimeoutMs,
          });

          const raw = Array.isArray(j?.items) ? j.items : [];
          if (raw.length) {
            backendRetryCount.current = 0;
            setBackendNotice(null);

            let newItems: RecItem[] = raw
              .map((x: any) => ({
                id: String(x?.id || ''),
                name: String(x?.name || ''),
                url: String(x?.url || ''),
                cat: String(x?.cat || ''),
                match: typeof x?.match === 'number' ? x.match : undefined,
                why: typeof x?.why === 'string' ? x.why : '',
                source: String(x?.source || ''),
                snippet: typeof x?.snippet === 'string' ? x.snippet : '',
                domain: String(x?.domain || ''),
                query_source: String(x?.query_source || ''),
                lat: typeof x?.lat === 'number' ? x.lat : undefined,
                lng: typeof x?.lng === 'number' ? x.lng : undefined,
              }))
              .filter((i: RecItem) => i.name);

            const seen = new Set(seenKeys.current);
            const filtered = newItems.filter(i => !seen.has(itemSeenKey(i)));
            newItems = filtered.length ? filtered : newItems;

            const newKeys = newItems.map(itemSeenKey).filter(Boolean);
            seenKeys.current = [...seenKeys.current, ...newKeys];
            saveSeen(mode, seenKeys.current);

            setItems(newItems);
            saveLastResults(mode, dest, newItems, lang);
            setPage('results');
            return;
          }

          backendRetryCount.current = 0;
          setBackendNotice(null);

          setInfo(
            lang === 'no'
              ? 'Ingen treff fra backend ennå - viser demo-forslag.'
              : lang === 'sv'
                ? 'Inga träffar från backend ännu - visar demo-förslag.'
                : 'No backend hits yet - showing demo suggestions.'
          );
        } catch (e: any) {
          console.warn('Backend recs unavailable; trying Claude fallback.', e);

          const emsg = String(e?.message || '');
          const isTimeout = /timeout/i.test(emsg);
          if (isTimeout) backendRetryCount.current = Math.min(3, backendRetryCount.current + 1);

          if (apiKey) {
            try {
              const profileText = describeProfile(profile, lang);
              const excludeList = seenKeys.current.map(k => k.replace(/^(id:|name:)/, '')).slice(-20);
              const prompt = buildPrompt(mode, dest, profileText, lang, excludeList);
              const result = await askClaude(prompt, apiKey);
              const parsed = parseItems(result, lang);
              if (parsed.length > 0) {
                let newItems = parsed.filter((i: RecItem) => i.name);
                const seen = new Set(seenKeys.current);
                const filtered = newItems.filter((i: RecItem) => !seen.has(itemSeenKey(i)));
                newItems = filtered.length ? filtered : newItems;

                const newKeys = newItems.map(itemSeenKey).filter(Boolean);
                seenKeys.current = [...seenKeys.current, ...newKeys];
                saveSeen(mode, seenKeys.current);

                setItems(newItems);
                saveLastResults(mode, dest, newItems, lang);
                setPage('results');
                return;
              }
            } catch (claudeErr: any) {
              const msg = String(claudeErr?.message || '');
              if (msg.startsWith('RATE_LIMIT:')) {
                const waitS = parseInt(msg.split(':')[1], 10) || 60;
                setCooldownUntil(Date.now() + waitS * 1000);
                setCooldownLeft(waitS);
                setError(UI.cooldownError[lang](waitS));
                return;
              }
              console.warn('Claude fallback also failed:', claudeErr);
            }
          }

          setBackendNotice({ kind: isTimeout ? 'cold' : 'down', msg: isTimeout ? UI.backendColdStart[lang] : UI.backendDown[lang] });
          setInfo(
            lang === 'no'
              ? 'Backend utilgjengelig — viser demo-forslag.'
              : lang === 'sv'
                ? 'Backend otillgänglig — visar demo-förslag.'
                : 'Backend unavailable — showing demo suggestions.'
          );
        }
      } else if (apiKey) {
        try {
          const profileText = describeProfile(profile, lang);
          const excludeList = seenKeys.current.map(k => k.replace(/^(id:|name:)/, '')).slice(-20);
          const prompt = buildPrompt(mode, dest, profileText, lang, excludeList);
          const result = await askClaude(prompt, apiKey);
          const parsed = parseItems(result, lang);
          if (parsed.length > 0) {
            let newItems = parsed.filter((i: RecItem) => i.name);
            const seen = new Set(seenKeys.current);
            const filtered = newItems.filter((i: RecItem) => !seen.has(itemSeenKey(i)));
            newItems = filtered.length ? filtered : newItems;

            const newKeys = newItems.map(itemSeenKey).filter(Boolean);
            seenKeys.current = [...seenKeys.current, ...newKeys];
            saveSeen(mode, seenKeys.current);

            setItems(newItems);
            saveLastResults(mode, dest, newItems, lang);
            setPage('results');
            return;
          }
        } catch (claudeErr: any) {
          const msg = String(claudeErr?.message || '');
          if (msg.startsWith('RATE_LIMIT:')) {
            const waitS = parseInt(msg.split(':')[1], 10) || 60;
            setCooldownUntil(Date.now() + waitS * 1000);
            setCooldownLeft(waitS);
            setError(UI.cooldownError[lang](waitS));
            return;
          }
          console.warn('Claude API call failed:', claudeErr);
          setInfo(
            lang === 'no'
              ? 'AI-forespørsel feilet — viser demo-forslag.'
              : lang === 'sv'
                ? 'AI-förfrågan misslyckades — visar demo-förslag.'
                : 'AI request failed — showing demo suggestions.'
          );
        }
      } else {
        setInfo(
          lang === 'no'
            ? 'Legg til en API-nøkkel for AI-drevne forslag.'
            : lang === 'sv'
              ? 'Lägg till en API-nyckel för AI-drivna förslag.'
              : 'Add an API key for AI-powered suggestions.'
        );
      }

      const top = Object.entries(profile)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([k, v]) => `${k}:${Math.round(v)}`)
        .join(', ');

      const newItems: RecItem[] = [
        {
          id: `local_demo_${mode}_${dest.toLowerCase()}`,
          name: lang === 'no'
            ? `Forslag (lokal) for ${dest}`
            : lang === 'sv'
              ? `Förslag (lokalt) för ${dest}`
              : `Local suggestions for ${dest}`,
          cat: mode === 'restaurants'
            ? (lang === 'no' ? 'Restauranter' : 'Restaurants')
            : (lang === 'no' ? 'Opplevelser' : 'Experiences'),
          why: lang === 'no' ? `Basert på profilen din (${top}).` : `Based on your profile (${top}).`,
          match: 70,
          url: '',
        },
      ];

      const newKeys = newItems.map(itemSeenKey).filter(Boolean);
      seenKeys.current = [...seenKeys.current, ...newKeys];
      saveSeen(mode, seenKeys.current);

      setItems(newItems);
      saveLastResults(mode, dest, newItems, lang);
      setPage('results');
    } catch (e: any) {
      const msg = String(e?.message || 'Unknown error');
      setError(msg);
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

    // TS5: milestone toast
    if (nextTotal === MIN_SWIPES && !milestoneShown.current) {
      milestoneShown.current = true;
      showToast(UI.swipeMilestone[lang]);
    }

    setDeckIndex((i) => Math.min(i + 1, deck.length));
  }

  function resetDeck() {
    const K = keysFor(mode);
    try {
      localStorage.removeItem(K.swipes);
      localStorage.removeItem(K.totalSwipes);
      localStorage.removeItem(K.seen);
    } catch {}
    setSwipes({});
    setTotalSwipes(0);
    seenKeys.current = [];
    setItems([]);
    setDeckIndex(0);
    setError('');
    setInfo('');
  }

  // TS1: Delete all history
  function handleDeleteHistory() {
    deleteAllHistory();
    setSwipes({});
    setTotalSwipes(0);
    seenKeys.current = [];
    setItems([]);
    setDeckIndex(0);
    setError('');
    setInfo('');
    setPage('home');
    showToast(UI.deleteSuccessToast[lang]);
  }

  // Handle mode change (reset items + filter)
  function handleModeChange(m: Mode) {
    setMode(m);
    setItems([]);
    setCatFilter('');
    milestoneShown.current = false;
  }

  // Guard: never allow swipe/results without destination
  useEffect(() => {
    if ((page === 'swipe' || page === 'results') && !destination.trim()) {
      setError(UI.destinationMissing[lang]);
      setPage('home');
    }
  }, [page, destination, lang]);

  // --- RENDER
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.txt, fontFamily: F.system }}>
      <style>{globalCss}</style>

      {/* TS4: Loading screen overlay */}
      {loading && (
        <FlyLoadingScreen
          destination={destination}
          lang={lang}
          mode={mode}
          onCancel={() => setLoading(false)}
        />
      )}

      {/* TS1: Toast */}
      <Toast message={toastMsg} visible={toastVisible} />

      {/* TS1: Delete confirm dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={UI.deleteConfirmTitle[lang]}
          body={UI.deleteConfirmBody[lang]}
          cancelText={UI.deleteConfirmCancel[lang]}
          confirmText={UI.deleteConfirmOk[lang]}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); handleDeleteHistory(); }}
        />
      )}

      {/* TS2: API key guide modal */}
      {showApiGuide && (
        <ApiKeyGuideModal
          lang={lang}
          currentKey={apiKey}
          onClose={() => setShowApiGuide(false)}
          onSave={(key) => setApiKey(key)}
        />
      )}

      {/* Top bar */}
      <div style={{ padding: `${S.md}px ${S.lg}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div
          onClick={() => setPage('landing')}
          style={{ fontWeight: F.weight.black, color: T.gold, letterSpacing: 0.2, cursor: 'pointer' }}
        >
          ✈️ Travel-Swish
        </div>
        <div className="row" style={{ position: 'relative' }}>
          <select
            value={lang}
            onChange={(e) => {
              const v = e.target.value as Lang;
              setLang(v);
              try { localStorage.setItem('ts_lang', v); } catch {}
            }}
            className="pill"
            style={{ background: 'transparent', color: T.txt }}
          >
            <option value="en">EN</option>
            <option value="no">NO</option>
            <option value="sv">SV</option>
          </select>

          {/* TS1: Settings gear (visible on home, swipe, results) */}
          {page !== 'landing' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  background: 'transparent', border: 'none', color: T.dim, cursor: 'pointer',
                  fontSize: 18, padding: `${S.xxs}px ${S.xs}px`,
                }}
              >
                ⚙️
              </button>
              {showSettings && (
                <SettingsMenu
                  lang={lang}
                  onDeleteHistory={() => setShowDeleteConfirm(true)}
                  onApiGuide={() => setShowApiGuide(true)}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {updateAvailable && (
        <div
          style={{
            padding: `${S.sm}px ${S.lg}px`,
            borderBottom: `1px solid ${T.borderSoft}`,
            background: T.goldWash,
            display: 'flex',
            gap: S.sm2,
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: F.weight.black, color: T.gold, flex: '1 1 240px', lineHeight: 1.25, fontSize: F.size.base }}>
            {UI.updateBanner[lang](updateAvailable, APP_VERSION)}
          </div>
          <button
            className="pill"
            onClick={() => window.location.reload()}
            style={{ background: 'transparent', color: T.txt, border: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}
          >
            {UI.refresh[lang]}
          </button>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* ============ LANDING (TS2: New design) ============ */}
      {page === 'landing' && (
        <div className="container fadeUp" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: S.xl + 16 }}>
          {/* Emoji animation */}
          <div style={{ fontSize: 52, height: 64, marginBottom: S.lg }}>
            <span key={emojiIndex} style={{ display: 'inline-block', animation: 'emojiRotate 1.8s ease both' }}>
              {LANDING_EMOJI[emojiIndex]}
            </span>
          </div>

          {/* Hero headline */}
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 9vw, 44px)', lineHeight: 1.1, letterSpacing: -0.5, fontWeight: F.weight.ultra }}>
            {UI.landingHero[lang]}
          </h1>
          <p style={{ color: T.gold, fontSize: F.size.lg, marginTop: S.sm, maxWidth: 420, lineHeight: 1.5 }}>
            {UI.landingSubtitle[lang]}
          </p>

          {/* 3-step illustration */}
          <div style={{ display: 'flex', gap: S.sm2, marginTop: S.xl + 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[UI.landingStep1[lang], UI.landingStep2[lang], UI.landingStep3[lang]].map((step, i) => (
              <div key={i} style={{
                padding: `${S.sm2}px ${S.md}px`, borderRadius: R.lg,
                background: T.glassHi, border: `1px solid ${T.borderSoft}`,
                fontSize: F.size.base, fontWeight: F.weight.bold, minWidth: 140,
              }}>
                {step}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setPage('home')}
            className="btnPill btnPillPrimary"
            style={{ marginTop: S.xl + 8, fontSize: F.size.md, padding: `${S.md}px ${S.xl + 16}px` }}
          >
            {UI.landingCta[lang]}
          </button>

          {/* Tagline */}
          <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.md, lineHeight: 1.5 }}>
            {UI.landingTagline[lang]}
          </div>

          {/* Mode hint */}
          <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.xl }}>
            🍽️ {MODE_LABELS.restaurants[lang]}   🎭 {MODE_LABELS.experiences[lang]}
          </div>
        </div>
      )}

      {/* ============ HOME ============ */}
      {page === 'home' && (
        <div className="page">
          {/* TS3: Mode tab bar */}
          <ModeTabBar mode={mode} lang={lang} onChange={handleModeChange} />

          <div style={{ marginTop: S.sm }}>
            <label style={{ display: 'block', marginBottom: S.xs, color: T.dim }}>{UI.destination[lang]}</label>
            <input
              ref={destinationInputRef}
              value={destination}
              onChange={e => { setDestination(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (!destination.trim()) { setError(UI.destinationMissing[lang]); destinationInputRef.current?.focus(); return; }
                setPage('swipe');
              }}
              placeholder={lang === 'no' ? 'Barcelona, Oslo, Tokyo…' : lang === 'sv' ? 'Barcelona, Stockholm, Tokyo…' : 'Barcelona, Oslo, Tokyo…'}
              style={{ width: '100%', padding: S.sm2, borderRadius: R.md, border: `1px solid ${T.border}`, background: T.card, color: T.txt }}
            />
          </div>

          {/* TS1: Previous results section */}
          {lastResults && destination.trim() && (
            <div style={{
              marginTop: S.md, padding: S.sm2, background: T.glassHi, borderRadius: R.lg,
              border: `1px solid ${T.borderSoft}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xs2 }}>
                <div style={{ fontWeight: F.weight.bold, fontSize: F.size.base }}>
                  {lang === 'no' ? `📌 Forrige funn i ${lastResults.dest}` :
                   lang === 'sv' ? `📌 Tidigare fynd i ${lastResults.dest}` :
                   `📌 Previous finds in ${lastResults.dest}`}
                  <span style={{ color: T.dim, fontSize: F.size.sm, marginLeft: S.xs2 }}>
                    {relativeTime(lastResults.ts, lang)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setItems(lastResults.items);
                    setPage('results');
                  }}
                  style={{
                    background: 'transparent', border: `1px solid ${T.borderSoft}`,
                    color: T.teal, cursor: 'pointer', borderRadius: R.pill,
                    padding: `${S.xxs}px ${S.sm}px`, fontSize: F.size.sm, fontWeight: F.weight.bold,
                  }}
                >
                  {UI.lastResultsSeeAll[lang]}
                </button>
              </div>
              <div style={{ display: 'grid', gap: S.xs2 }}>
                {lastResults.items.slice(0, 3).map((it, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: `${S.xs}px ${S.sm}px`, background: T.glassLo, borderRadius: R.md,
                  }}>
                    <div style={{ fontWeight: F.weight.bold, fontSize: F.size.sm }}>{it.name}</div>
                    <div style={{ display: 'flex', gap: S.xs, alignItems: 'center' }}>
                      {it.cat && <span style={{ fontSize: F.size.sm, color: T.dim }}>{it.cat}</span>}
                      {it.match && (
                        <span style={{
                          fontSize: F.size.sm, fontWeight: F.weight.bold, color: T.gold,
                          padding: `${S.xxs - 2}px ${S.xs}px`, borderRadius: R.pill,
                          background: T.goldWash,
                        }}>
                          {it.match}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: S.md2, display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (!destination.trim()) { setError(UI.destinationMissing[lang]); destinationInputRef.current?.focus(); return; }
                setPage('swipe');
              }}
              disabled={!destination.trim()}
              className="btnPill btnPillPrimary btnFull"
              style={{ cursor: destination.trim() ? 'pointer' : 'not-allowed', opacity: destination.trim() ? 1 : 0.6 }}
            >
              {UI.startMode[lang](labels)}
            </button>
            <button
              onClick={() => setPage('landing')}
              className="btnPill"
              style={{ background: 'transparent', color: T.txt, border: `1px solid ${T.border}` }}
            >
              {UI.back[lang]}
            </button>
          </div>

          {!destination.trim() && (
            <div className="muted" style={{ marginTop: S.sm2, fontSize: F.size.sm, lineHeight: 1.5 }}>
              {UI.destinationHelp[lang]}
            </div>
          )}

          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
        </div>
      )}

      {/* ============ SWIPE ============ */}
      {page === 'swipe' && (
        <div className="page" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* TS3: Mode tab bar */}
          <ModeTabBar mode={mode} lang={lang} onChange={handleModeChange} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: S.sm, alignItems: 'center', marginTop: S.sm, marginBottom: S.sm }}>
            <h2 style={{ margin: 0 }}>{labels}: {destination}</h2>
            <button
              onClick={() => setPage('home')}
              className="btnPill"
              style={{ minHeight: 48, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt }}
            >
              {UI.back[lang]}
            </button>
          </div>

          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              background: T.bg,
              paddingBottom: S.sm2,
              marginBottom: S.sm,
            }}
          >
            <button
              onClick={findItems}
              disabled={!canSearch || loading}
              className="btnPill btnPillPrimary btnFull"
              style={{
                width: '100%',
                minHeight: 48,
                borderRadius: R.pill,
                cursor: !canSearch || loading ? 'not-allowed' : 'pointer',
                opacity: !canSearch || loading ? 0.55 : 1,
                background: !canSearch || loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                color: !canSearch || loading ? T.dim : T.bg,
              }}
            >
              {loading ? UI.loading[lang] : canSearch ? UI.fetch[lang] : UI.swipeRemaining[lang](swipeRemaining)}
            </button>
          </div>

          {/* Swipe deck */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
            {deckIndex >= deck.length ? (
              <div className="emptyState" style={{ marginTop: S.page, width: '100%' }}>
                <div style={{ fontWeight: F.weight.black, color: T.txt, marginBottom: S.xs }}>
                  {UI.deckEmptyTitle[lang]}
                </div>
                <div className="muted" style={{ lineHeight: 1.55 }}>
                  {UI.resetDeckHelp[lang]}
                </div>
                <div className="emptyActions">
                  <button onClick={resetDeck} className="btnPill btnPillPrimary btnFull">
                    {UI.resetDeck[lang]}
                  </button>
                  <button
                    onClick={() => setPage('home')}
                    className="btnPill"
                    style={{ background: 'transparent', color: T.txt, border: `1px solid ${T.border}` }}
                  >
                    {UI.back[lang]}
                  </button>
                </div>
              </div>
            ) : (
              <SwipeStack
                cards={deck.slice(deckIndex, deckIndex + 3)}
                lang={lang}
                onSwipe={(card, val) => swipeCard(card, val)}
                totalSwipes={swipeCount}
              />
            )}
          </div>

          {!canSearch && (
            <div style={{ marginTop: S.sm2, color: T.dim, textAlign: 'center', lineHeight: 1.4 }}>
              {UI.swipeMagicHint[lang](swipeRemaining)}
            </div>
          )}
          {swipeCount < 5 && (
            <div style={{
              margin: '8px auto 0',
              maxWidth: 400,
              display: 'flex',
              justifyContent: 'space-between',
              color: T.dim,
              fontSize: '0.8rem',
            }}>
              <span>← PASS</span>
              <span>♥ LOVE →</span>
            </div>
          )}

          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
          {info && <div style={{ marginTop: S.sm, color: T.dim }}>{info}</div>}
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {page === 'results' && (
        <div className="page">
          {/* TS3: Mode tab bar */}
          <ModeTabBar mode={mode} lang={lang} onChange={handleModeChange} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: S.sm2, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage('swipe')}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: `${S.xs2}px ${S.sm}px`, borderRadius: R.pill, cursor: 'pointer' }}
            >
              {UI.back[lang]}
            </button>

            <div style={{ display: 'flex', gap: S.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              {cooldownUntil && cooldownUntil > Date.now() ? (
                <div style={{ color: T.dim, fontSize: F.size.sm }}>
                  {UI.cooldown[lang](cooldownLeft)}
                </div>
              ) : null}

              {/* TS6: Share button */}
              <button
                onClick={async () => {
                  const result = await shareResults(items, destination, lang);
                  if (result === 'copied') showToast(UI.shareCopied[lang]);
                  else if (result === 'shared') showToast(UI.shareSuccess[lang]);
                }}
                style={{
                  padding: `${S.sm}px ${S.md}px`, borderRadius: R.pill,
                  border: `1px solid ${T.borderSoft}`, background: 'transparent',
                  color: T.txt, fontWeight: F.weight.bold, cursor: 'pointer',
                }}
              >
                {UI.shareButton[lang]}
              </button>

              <button
                onClick={findItems}
                disabled={loading || (cooldownUntil > 0 && cooldownUntil > Date.now())}
                style={{
                  padding: `${S.sm}px ${S.md}px`, borderRadius: R.pill, border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                  color: loading ? T.dim : T.bg, fontWeight: F.weight.black,
                }}
              >
                {loading ? UI.loading[lang] : UI.findMore[lang]}
              </button>
            </div>
          </div>

          <h2 style={{ margin: `${S.md}px 0 0 0`, letterSpacing: 0.2 }}>{UI.resultsHeadline[lang](destination)}</h2>
          <div style={{ color: T.dim, marginTop: S.xs, fontSize: F.size.sm }}>{UI.resultsHint[lang]}</div>
          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
          {info && <div style={{ color: T.dim, marginTop: S.xs2, fontSize: F.size.sm }}>{info}</div>}

          {backendNotice && (
            <div className={`notice ${backendNotice.kind === 'cold' ? 'noticeWarn' : ''}`} style={{ marginTop: S.md }}>
              <div className="muted" style={{ lineHeight: 1.55 }}>{backendNotice.msg}</div>
              <div className="noticeActions">
                <button
                  onClick={findItems}
                  disabled={loading || (cooldownUntil > 0 && cooldownUntil > Date.now())}
                  className="btnPill btnPillPrimary btnFull"
                >
                  {loading ? UI.loading[lang] : UI.tryAgain[lang]}
                </button>
              </div>
            </div>
          )}

          {/* TS6: List/Map tab bar */}
          <div style={{ display: 'flex', gap: S.xs2, marginTop: S.md }}>
            {(['list', 'map'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setResultsTab(tab)}
                style={{
                  padding: `${S.xs2}px ${S.md}px`, borderRadius: R.pill,
                  border: resultsTab === tab ? 'none' : `1px solid ${T.borderSoft}`,
                  background: resultsTab === tab ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : 'transparent',
                  color: resultsTab === tab ? T.bg : T.dim,
                  fontWeight: F.weight.black, cursor: 'pointer', fontSize: F.size.base,
                }}
              >
                {tab === 'list' ? UI.viewList[lang] : UI.viewMap[lang]}
              </button>
            ))}
          </div>

          {/* TS6: Map tab */}
          {resultsTab === 'map' && (
            <div style={{ marginTop: S.md }}>
              <MapView items={items} destination={destination} lang={lang} />
            </div>
          )}

          {/* List tab */}
          {resultsTab === 'list' && (() => {
            const cats = [...new Set(items.map(i => String(i.cat || '').trim()).filter(Boolean))];
            const active = cats.includes(catFilter) ? catFilter : '';
            const shown = active ? items.filter(i => i.cat === active) : items;
            const allLabel = lang === 'no' ? 'Alle' : lang === 'sv' ? 'Alla' : 'All';

            const pick = (v: string) => {
              setCatFilter(v);
              saveCatFilter(mode, v);
            };

            return (
              <>
                {cats.length > 1 && (
                  <div style={{ display: 'flex', gap: S.xs2, flexWrap: 'wrap', marginTop: S.md }}>
                    <button
                      onClick={() => pick('')}
                      style={{
                        padding: `${S.xs2}px ${S.sm2}px`, borderRadius: R.pill,
                        border: `1px solid ${T.borderSoft}`, cursor: 'pointer',
                        background: active === '' ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                        color: active === '' ? T.bg : T.txt, fontWeight: F.weight.bold,
                      }}
                    >
                      {allLabel}
                    </button>
                    {cats.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => pick(cat)}
                        style={{
                          padding: `${S.xs2}px ${S.sm2}px`, borderRadius: R.pill,
                          border: `1px solid ${T.borderSoft}`, cursor: 'pointer',
                          background: active === cat ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                          color: active === cat ? T.bg : T.txt, fontWeight: F.weight.bold,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gap: S.sm2, marginTop: S.md2 }}>
                  {shown.length === 0 ? (
                    <div className="emptyState">
                      <div style={{ fontWeight: F.weight.black, marginBottom: S.xs }}>
                        {UI.noResultsTitle[lang]}
                      </div>
                      <div className="muted" style={{ lineHeight: 1.55 }}>
                        {items.length && active ? UI.noResultsFiltered[lang](active) : UI.noResults[lang]}
                      </div>
                      <div className="emptyActions">
                        {active && (
                          <button onClick={() => pick('')} className="btnPill" style={{ background: T.card }}>
                            {allLabel}
                          </button>
                        )}
                        <button
                          onClick={findItems}
                          disabled={loading || (cooldownUntil > 0 && cooldownUntil > Date.now())}
                          className="btnPill btnPillPrimary btnFull"
                        >
                          {loading ? UI.loading[lang] : UI.findMore[lang]}
                        </button>
                        <button onClick={() => setPage('swipe')} className="btnPill" style={{ background: 'transparent', color: T.dim }}>
                          {UI.back[lang]}
                        </button>
                      </div>
                    </div>
                  ) : shown.map((it, idx) => {
                    const pct = Math.round(it.match || 0);
                    return (
                      <div
                        key={it.id || it.name || idx}
                        style={{
                          background: `linear-gradient(180deg, ${T.glassHi}, ${T.glassLo})`,
                          border: `1px solid ${T.border}`, borderRadius: R.lg,
                          padding: S.md2, boxShadow: T.shadowMd,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: S.sm2, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                            <div style={{ fontWeight: F.weight.ultra, fontSize: F.size.lg, lineHeight: 1.2, wordBreak: 'break-word' }}>
                              {it.name}
                            </div>
                            {it.snippet && (
                              <div className="clamp3" style={{ color: T.dim, marginTop: S.xs2, lineHeight: 1.55, fontSize: F.size.base }}>
                                {it.snippet}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: S.xs2, flexWrap: 'wrap', marginTop: S.sm, alignItems: 'center' }}>
                              {it.cat && (
                                <span style={{ fontSize: F.size.sm, color: T.txt, border: `1px solid ${T.borderSoft}`, padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill, background: T.glassLo }}>
                                  {it.cat}
                                </span>
                              )}
                              {it.source && (
                                <span style={{ fontSize: F.size.sm, color: T.teal, border: `1px solid ${T.borderSoft}`, padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill, background: 'transparent' }}>
                                  {it.source.toLowerCase() === 'brave' ? 'Brave' : it.source}
                                </span>
                              )}
                              {it.domain && (
                                <span style={{ fontSize: F.size.sm, color: T.dim, border: `1px solid ${T.borderSoft}`, padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill, background: 'transparent' }}>
                                  {it.domain}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{
                            flexShrink: 0, padding: `${S.xs}px ${S.sm}px`, borderRadius: R.pill,
                            background: T.goldWashHi, border: `1px solid ${T.goldBorder}`,
                            color: T.gold, fontWeight: F.weight.ultra, fontSize: F.size.sm,
                          }}>
                            {pct}%
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: S.sm, flexWrap: 'wrap', marginTop: S.sm2 }}>
                          {it.url && (
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                textDecoration: 'none', padding: `${S.xs2}px ${S.sm2}px`,
                                borderRadius: R.pill, border: `1px solid ${T.borderSoft}`,
                                background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                                color: T.bg, fontWeight: F.weight.black, fontSize: F.size.base,
                              }}
                            >
                              {UI.openLink[lang]}
                            </a>
                          )}
                          <a
                            href={googleMapsSearchUrl(it.name, destination)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              textDecoration: 'none', padding: `${S.xs2}px ${S.sm2}px`,
                              borderRadius: R.pill, border: `1px solid ${T.borderSoft}`,
                              background: 'transparent', color: T.txt, fontWeight: F.weight.bold, fontSize: F.size.base,
                            }}
                          >
                            {UI.openMaps[lang]}
                          </a>
                        </div>

                        {it.why && (
                          <div style={{
                            marginTop: S.sm2, padding: `${S.xs2}px ${S.sm}px`,
                            borderLeft: `3px solid ${pct >= 75 ? T.gold : pct >= 50 ? T.teal : T.dim}`,
                            background: T.glassLo, borderRadius: `0 ${R.sm}px ${R.sm}px 0`,
                          }}>
                            <div style={{ color: T.txt, lineHeight: 1.55, fontSize: F.size.base }}>{it.why}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
      </div>

      <div style={{ padding: `${S.lg}px ${S.lg}px`, color: T.dim, fontSize: F.size.sm, borderTop: `1px solid ${T.border}` }}>
        {APP_VERSION} • {mode} • {lang} • backend: {BACKEND_DISPLAY || 'off'}
      </div>
    </div>
  );
}
