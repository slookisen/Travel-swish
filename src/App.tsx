import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    no: 'Ingen forslag ennå. Prøv «Finn flere» eller sveip noen flere kort.',
    en: 'No suggestions yet. Try “Find more” or swipe a few more cards.',
    sv: 'Inga förslag än. Prova “Hitta fler” eller svajpa några fler kort.',
  },
  noResultsFiltered: {
    no: (cat: string) => `Ingen forslag i «${cat}». Prøv «Alle» eller «Finn flere».`,
    en: (cat: string) => `No suggestions in "${cat}". Try "All" or "Find more".`,
    sv: (cat: string) => `Inga förslag i "${cat}". Prova "Alla" eller "Hitta fler".`,
  },
  // kept for backwards compatibility (not used)
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
    no: (n: number) => `Sveip ${n} til for å låse opp forslag.`,
    en: (n: number) => `Swipe ${n} more to unlock suggestions.`,
    sv: (n: number) => `Svajpa ${n} till för att låsa upp förslag.`,
  },
  deckEmptyTitle: { no: 'Ingen flere kort', en: 'No more cards', sv: 'Inga fler kort' },
  openLink: { no: 'Åpne lenke', en: 'Open link', sv: 'Öppna länk' },
  openMaps: { no: 'Åpne i Maps', en: 'Open in Maps', sv: 'Öppna i Maps' },
};

// --- Modes

const MODE_LABELS: Record<Mode, { no: string; en: string; sv: string }> = {
  experiences: { no: 'Opplevelser', en: 'Experiences', sv: 'Upplevelser' },
  restaurants: { no: 'Restauranter', en: 'Restaurants', sv: 'Restauranger' },
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
      ? [...new Set(seenRaw.map((x) => normalizeSeenKey(String(x || ''))).filter(Boolean))]
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
  // id may be missing for local/demo items
  id?: string;
  name: string;

  // common rec fields
  cat?: string;
  match?: number; // 0-100
  why?: string;
  url?: string;

  // web rec extras
  source?: string; // e.g. "brave"
  snippet?: string;
  domain?: string;
  query_source?: string;

  // legacy/demo fields (kept for backwards compat)
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
          borderRadius: R.lg,
          padding: S.md2,
          transform: `translateX(${dx}px) rotate(${dx / 18}deg)`,
          transition: dragging ? 'none' : `transform ${M.snap}ms ${M.ease}`,
          boxShadow: T.shadow,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: S.sm, alignItems: 'center' }}>
          <div style={{ fontSize: F.size.emoji }}>{card.emoji}</div>
          <div style={{ fontWeight: F.weight.black, fontSize: F.size.md }}>{card.q}</div>
        </div>
        <div style={{ color: T.dim, marginTop: S.xs2, lineHeight: 1.5 }}>{card.desc}</div>

        <div style={{ display: 'flex', gap: S.sm, marginTop: S.md }}>
          <button
            onClick={() => onSwipe(-1)}
            style={{ padding: `${S.sm}px ${S.sm2}px`, borderRadius: R.md, border: `1px solid ${T.border}`, background: 'transparent', color: T.red, cursor: 'pointer', fontWeight: F.weight.black }}
          >
            {UI.no[lang]}
          </button>
          <button
            onClick={() => onSwipe(1)}
            style={{ padding: `${S.sm}px ${S.sm2}px`, borderRadius: R.md, border: `1px solid ${T.border}`, background: 'transparent', color: T.green, cursor: 'pointer', fontWeight: F.weight.black }}
          >
            {UI.yes[lang]}
          </button>
          <div style={{ marginLeft: 'auto', color: T.dim, fontSize: F.size.sm, alignSelf: 'center' }}>
            {lang === 'no' ? 'Dra ←/→' : lang === 'sv' ? 'Dra ←/→' : 'Drag ←/→'}
          </div>
        </div>
      </div>
    </div>
  );
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

function SwipeStack({
  cards,
  lang,
  onSwipe,
}: {
  cards: Card[];
  lang: Lang;
  onSwipe: (card: Card, val: number) => void;
}) {
  const top = cards[0];
  const rest = cards.slice(1, 3);

  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const thresholdX = 95;

  const badgeYesOpacity = clamp(dx / 90, 0, 1);
  const badgeNoOpacity = clamp(-dx / 90, 0, 1);

  function reset() {
    setDx(0);
    setDy(0);
    setDragging(false);
    start.current = null;
  }

  function commitSwipe(val: number) {
    if (!top || animating) return;
    setAnimating(true);

    const offX = val * Math.max(420, Math.floor(window.innerWidth * 0.85));
    setDx(offX);
    setDy(dy);

    window.setTimeout(() => {
      onSwipe(top, val);
      setAnimating(false);
      reset();
    }, motionMs(M.commit));
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

    // snap back
    setDx(0);
    setDy(0);
  }

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
        height: 330,
        maxWidth: 560,
        margin: '0 auto',
        outline: 'none',
      }}
    >
      {/* Back cards */}
      {rest
        .slice()
        .reverse()
        .map((c, idxFromBack) => {
          const idx = rest.length - 1 - idxFromBack + 1; // 1..2
          const scale = 1 - idx * 0.04;
          const y = idx * 10;
          return (
            <div
              key={c.id}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: R.xl,
                  padding: S.md2,
                  transform: `translateY(${y}px) scale(${scale})`,
                  boxShadow: T.shadow,
                  opacity: 0.55,
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', gap: S.sm, alignItems: 'center' }}>
                  <div style={{ fontSize: F.size.emoji }}>{c.emoji}</div>
                  <div style={{ fontWeight: F.weight.black, fontSize: F.size.md }}>{c.q}</div>
                </div>
                <div style={{ color: T.dim, marginTop: S.xs2, lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            </div>
          );
        })}

      {/* Top card */}
      {top && (
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
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: R.xl,
              padding: S.md2,
              transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`,
              transition: dragging
                ? 'none'
                : animating
                  ? `transform ${M.commit}ms ${M.ease}`
                  : `transform ${M.snap}ms ${M.ease}`,
              boxShadow: T.shadow,
              userSelect: 'none',
              position: 'relative',
            }}
          >
            {/* Badges */}
            <div
              style={{
                position: 'absolute',
                top: S.md,
                left: S.md,
                padding: `${S.xs}px ${S.sm}px`,
                borderRadius: R.sm,
                border: `3px solid ${T.red}`,
                color: T.red,
                fontWeight: F.weight.ultra /* closest to 1000 */,
                letterSpacing: 1,
                transform: 'rotate(-14deg)',
                opacity: badgeNoOpacity,
                background: T.overlay,
              }}
            >
              {UI.no[lang]}
            </div>
            <div
              style={{
                position: 'absolute',
                top: S.md,
                right: S.md,
                padding: `${S.xs}px ${S.sm}px`,
                borderRadius: R.sm,
                border: `3px solid ${T.green}`,
                color: T.green,
                fontWeight: F.weight.ultra /* closest to 1000 */,
                letterSpacing: 1,
                transform: 'rotate(14deg)',
                opacity: badgeYesOpacity,
                background: T.overlay,
              }}
            >
              {UI.yes[lang]}
            </div>

            <div style={{ display: 'flex', gap: S.sm, alignItems: 'center' }}>
              <div style={{ fontSize: F.size.emoji }}>{top.emoji}</div>
              <div style={{ fontWeight: F.weight.black, fontSize: F.size.md }}>{top.q}</div>
            </div>
            <div style={{ color: T.dim, marginTop: S.xs2, lineHeight: 1.5 }}>{top.desc}</div>

            <div style={{ display: 'flex', gap: S.sm, marginTop: S.md, alignItems: 'center' }}>
              <button
                onClick={() => commitSwipe(-1)}
                disabled={animating}
                style={{ padding: `${S.sm}px ${S.sm2}px`, borderRadius: R.md, border: `1px solid ${T.border}`, background: 'transparent', color: T.red, cursor: animating ? 'not-allowed' : 'pointer', fontWeight: F.weight.black }}
              >
                {UI.no[lang]}
              </button>
              <button
                onClick={() => commitSwipe(1)}
                disabled={animating}
                style={{ padding: `${S.sm}px ${S.sm2}px`, borderRadius: R.md, border: `1px solid ${T.border}`, background: 'transparent', color: T.green, cursor: animating ? 'not-allowed' : 'pointer', fontWeight: F.weight.black }}
              >
                {UI.yes[lang]}
              </button>
              <div style={{ marginLeft: 'auto', color: T.dim, fontSize: F.size.sm }}>
                {lang === 'no' ? 'Dra ←/→' : lang === 'sv' ? 'Dra ←/→' : 'Drag ←/→'}
              </div>
            </div>
          </div>
        </div>
      )}
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

  // API key: optional, for client-side Claude fallback when backend is unavailable
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('ts_apiKey') || ''; } catch { return ''; }
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
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

  useEffect(() => {
    if (page !== 'home') return;
    setError('');
    const t = setTimeout(() => destinationInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [page]);

  // If the browser shows a cached build after a deploy, we want a simple
  // "new version available" banner that can force a reload.
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

  // keep seen + filters cache per mode
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

  useEffect(() => {
    try { localStorage.setItem('ts_mode', mode); } catch {}
  }, [mode]);

  useEffect(() => {
    try { localStorage.setItem('ts_destination', destination); } catch {}
  }, [destination]);

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

  const swipeCount = Math.max(totalSwipes, Object.keys(swipes).length);
  const canSearch = swipeCount >= MIN_SWIPES;
  const swipeRemaining = Math.max(0, MIN_SWIPES - swipeCount);

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

      // v2: backend-first (local dev). If backend isn't available, fall back to local placeholder.
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
        setPage('results');
        setInfo(lang === 'no' ? 'Mock mode aktiv (ingen backend-kall).' : 'Mock mode active (no backend calls).');
        return;
      }

      if (BACKEND_URL) {
        try {
          const warm = backendRetryCount.current > 0;
          const prefsTimeoutMs = warm ? 20000 : 8000;
          const recsTimeoutMs = warm ? 45000 : 20000;

          // Persist prefs so /recs/web can use them.
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
              }))
              .filter((i: RecItem) => i.name);

            const seen = new Set(seenKeys.current);
            const filtered = newItems.filter(i => !seen.has(itemSeenKey(i)));
            newItems = filtered.length ? filtered : newItems;

            const newKeys = newItems.map(itemSeenKey).filter(Boolean);
            seenKeys.current = [...seenKeys.current, ...newKeys];
            saveSeen(mode, seenKeys.current);

            setItems(newItems);
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

          // If we have an API key, try client-side Claude
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
        // No backend — use client-side Claude API with web search
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

      // Minimal local suggestions (placeholder) based on strongest dims.
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

    // Advance deck
    setDeckIndex((i) => Math.min(i + 1, deck.length));
  }

  function resetDeck() {
    const K = keysFor(mode);
    try {
      localStorage.removeItem(K.swipes);
      localStorage.removeItem(K.totalSwipes);
      localStorage.removeItem(K.seen);
    } catch {}
    // reset state
    setSwipes({});
    setTotalSwipes(0);
    seenKeys.current = [];
    setItems([]);
    setDeckIndex(0);
    setError('');
    setInfo('');
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
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt, fontFamily: F.system }}>
      <style>{globalCss}</style>
      <div style={{ padding: `${S.md}px ${S.lg}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontWeight: F.weight.black, color: T.gold, letterSpacing: 0.2 }}>Travel-Swish</div>
        <div className="row">
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
          <div
            style={{
              fontWeight: F.weight.black,
              color: T.gold,
              flex: '1 1 240px',
              lineHeight: 1.25,
              fontSize: F.size.base,
            }}
          >
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

      {page === 'landing' && (
        <div className="container fadeUp">
          <div className="card" style={{ padding: `${S.xl + 8}px`, overflow: 'hidden', position: 'relative' }}>
            {/* Decorative gradient orb */}
            <div style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${T.goldWashHi}, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              bottom: -60,
              left: -60,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(45,212,191,0.08), transparent 70%)`,
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: S.sm }}>
                <div>
                  <div style={{ fontSize: F.size.sm, fontWeight: F.weight.bold, letterSpacing: 1.5, color: T.gold, textTransform: 'uppercase' as const }}>Travel-Swish</div>
                  <h1 style={{ margin: `${S.sm}px 0 ${S.xs}px 0`, fontSize: 'clamp(30px, 8vw, 40px)', lineHeight: 1.15, letterSpacing: -0.5 }}>
                    {lang === 'no' ? 'Finn opplevelser som passer deg' : lang === 'sv' ? 'Hitta upplevelser som passar dig' : 'Find experiences that fit you'}
                  </h1>
                  <p className="muted" style={{ lineHeight: 1.7, marginTop: S.xs2, maxWidth: 440, fontSize: F.size.md }}>
                    {UI.landingDesc[lang]}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: S.xl, display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
                <button className="btn btnPrimary btnFull" style={{ fontSize: F.size.md, padding: `${S.md}px ${S.xl}px` }} onClick={() => setPage('home')}>
                  {UI.getStarted[lang]} →
                </button>
              </div>

              {/* How it works */}
              <div style={{ marginTop: S.xl + 8, display: 'grid', gap: S.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                {[
                  { emoji: '🎯', title: lang === 'no' ? 'Velg modus' : lang === 'sv' ? 'Välj läge' : 'Pick a mode', desc: UI.howItWorks1[lang] },
                  { emoji: '👆', title: lang === 'no' ? 'Sveip kort' : lang === 'sv' ? 'Svajpa kort' : 'Swipe cards', desc: UI.howItWorks2[lang] },
                  { emoji: '✨', title: lang === 'no' ? 'Få forslag' : lang === 'sv' ? 'Få förslag' : 'Get matches', desc: UI.howItWorks3[lang] },
                ].map((step, i) => (
                  <div key={i} style={{
                    padding: S.md,
                    borderRadius: R.lg,
                    background: T.glassLo,
                    border: `1px solid ${T.borderSoft}`,
                  }}>
                    <div style={{ fontSize: 24, marginBottom: S.xs }}>{step.emoji}</div>
                    <div style={{ fontWeight: F.weight.black, fontSize: F.size.base, marginBottom: S.xxs }}>{step.title}</div>
                    <div className="muted" style={{ fontSize: F.size.sm, lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {page === 'home' && (
        <div className="page">
          <h2 style={{ marginTop: 0 }}>{UI.chooseMode[lang]}</h2>
          <div style={{ display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
            {(['experiences', 'restaurants'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  borderRadius: R.pill,
                  border: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  background: mode === m ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                  color: mode === m ? T.bg : T.txt,
                  fontWeight: F.weight.bold,
                }}
              >
                {MODE_LABELS[m][lang]}
              </button>
            ))}
          </div>

          <div style={{ marginTop: S.lg }}>
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

          {/* Optional API key for AI-powered suggestions */}
          <div style={{ marginTop: S.md }}>
            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.dim,
                cursor: 'pointer',
                fontSize: F.size.sm,
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {showApiKeyInput
                ? (lang === 'no' ? 'Skjul API-nøkkel' : lang === 'sv' ? 'Dölj API-nyckel' : 'Hide API key')
                : (lang === 'no' ? 'Legg til Anthropic API-nøkkel for AI-forslag' : lang === 'sv' ? 'Lägg till Anthropic API-nyckel för AI-förslag' : 'Add Anthropic API key for AI suggestions')
              }
            </button>
            {apiKey && !showApiKeyInput && (
              <span style={{ color: T.green, fontSize: F.size.sm, marginLeft: S.sm }}>
                {lang === 'no' ? 'Nøkkel satt' : lang === 'sv' ? 'Nyckel inställd' : 'Key set'}
              </span>
            )}
            {showApiKeyInput && (
              <div style={{ marginTop: S.xs2 }}>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{
                    width: '100%',
                    padding: S.sm2,
                    borderRadius: R.md,
                    border: `1px solid ${T.border}`,
                    background: T.card,
                    color: T.txt,
                    fontFamily: 'monospace',
                    fontSize: F.size.sm,
                  }}
                />
                <div style={{ color: T.dim, fontSize: F.size.sm, marginTop: S.xs, lineHeight: 1.5 }}>
                  {lang === 'no'
                    ? 'Brukes for AI-drevne forslag med websøk når backend er utilgjengelig. Nøkkelen lagres kun i nettleseren din.'
                    : lang === 'sv'
                      ? 'Används för AI-drivna förslag med webbsökning när backend inte finns. Nyckeln sparas bara i din webbläsare.'
                      : 'Powers AI suggestions with web search when backend is unavailable. Key is stored only in your browser.'}
                </div>
              </div>
            )}
          </div>

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

      {page === 'swipe' && (
        <div className="page">
          <button
            onClick={() => setPage('home')}
            className="btnPill"
            style={{ marginBottom: S.sm, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt }}
          >
            {UI.back[lang]}
          </button>

          <h2 style={{ marginTop: 0 }}>{labels}: {destination}</h2>
          <div style={{ color: T.dim, marginBottom: S.sm }}>{UI.swipeHint[lang]}</div>
          {/* Progress bar toward minimum swipes */}
          <div style={{ marginBottom: S.md2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xs }}>
              <div style={{ color: T.dim, fontSize: F.size.sm }}>
                {swipeCount} / {MIN_SWIPES} {lang === 'no' ? 'sveip' : lang === 'sv' ? 'svajp' : 'swipes'}
              </div>
              {canSearch && (
                <div style={{ color: T.green, fontSize: F.size.sm, fontWeight: F.weight.bold }}>
                  {lang === 'no' ? 'Klar for forslag!' : lang === 'sv' ? 'Redo för förslag!' : 'Ready for suggestions!'}
                </div>
              )}
            </div>
            <div style={{
              width: '100%',
              height: 6,
              borderRadius: R.pill,
              background: T.border,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, (swipeCount / MIN_SWIPES) * 100)}%`,
                height: '100%',
                borderRadius: R.pill,
                background: canSearch
                  ? `linear-gradient(135deg, ${T.gold}, ${T.teal})`
                  : T.teal,
                transition: `width ${M.snap}ms ${M.ease}`,
              }} />
            </div>
          </div>

          {/* Swipe deck (stacked, Tinder-like) */}
          <div style={{ position: 'relative', minHeight: 360 }}>
            {deckIndex >= deck.length ? (
              <div className="emptyState" style={{ marginTop: S.page }}>
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
              />
            )}
          </div>

          <div style={{ marginTop: S.md2, display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
            <button
              onClick={findItems}
              disabled={!canSearch || loading}
              className="btnPill btnPillPrimary btnFull"
              style={{
                cursor: !canSearch || loading ? 'not-allowed' : 'pointer',
                opacity: !canSearch || loading ? 0.55 : 1,
                background: !canSearch || loading ? T.card : undefined,
                color: !canSearch || loading ? T.dim : undefined,
              }}
            >
              {loading ? UI.loading[lang] : UI.fetch[lang]}
            </button>
            {!canSearch && (
              <div style={{ color: T.dim, alignSelf: 'center', lineHeight: 1.4 }}>
                {UI.swipeRemaining[lang](swipeRemaining)}
              </div>
            )}
          </div>

          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
          {info && <div style={{ marginTop: S.sm, color: T.dim }}>{info}</div>}
        </div>
      )}

      {page === 'results' && (
        <div className="page">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: S.sm2, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage('swipe')}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: `${S.xs2}px ${S.sm}px`, borderRadius: R.pill, cursor: 'pointer' }}
            >
              {UI.back[lang]}
            </button>

            <div style={{ display: 'flex', gap: S.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              {cooldownUntil && cooldownUntil > Date.now() && (
                <div style={{ color: T.dim, fontSize: F.size.sm }}>
                  {UI.cooldown[lang](cooldownLeft)}
                </div>
              )}
              <button
                onClick={findItems}
                disabled={loading || (cooldownUntil > 0 && cooldownUntil > Date.now())}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  borderRadius: R.pill,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                  color: loading ? T.dim : T.bg,
                  fontWeight: F.weight.black,
                }}
                title={
                  lang === 'no'
                    ? 'Hent flere forslag basert på profilen din'
                    : lang === 'sv'
                      ? 'Hämta fler förslag baserat på din profil'
                      : 'Fetch more suggestions based on your profile'
                }
              >
                {loading ? UI.loading[lang] : UI.findMore[lang]}
              </button>
            </div>
          </div>

          <h2 style={{ margin: `${S.md}px 0 0 0`, letterSpacing: 0.2 }}>{labels}: {destination}</h2>
          <div style={{ color: T.dim, marginTop: S.xs, fontSize: F.size.sm }}>{UI.resultsHint[lang]}</div>
          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
          {info && <div style={{ color: T.dim, marginTop: S.xs2, fontSize: F.size.sm }}>{info}</div>}

          {backendNotice && (
            <div
              className={`notice ${backendNotice.kind === 'cold' ? 'noticeWarn' : ''}`}
              style={{ marginTop: S.md }}
            >
              <div className="muted" style={{ lineHeight: 1.55 }}>
                {backendNotice.msg}
              </div>
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

          {(() => {
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
                        padding: `${S.xs2}px ${S.sm2}px`,
                        borderRadius: R.pill,
                        border: `1px solid ${T.borderSoft}`,
                        cursor: 'pointer',
                        background: active === '' ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                        color: active === '' ? T.bg : T.txt,
                        fontWeight: F.weight.bold,
                      }}
                    >
                      {allLabel}
                    </button>
                    {cats.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => pick(cat)}
                        style={{
                          padding: `${S.xs2}px ${S.sm2}px`,
                          borderRadius: R.pill,
                          border: `1px solid ${T.borderSoft}`,
                          cursor: 'pointer',
                          background: active === cat ? `linear-gradient(135deg, ${T.gold}, ${T.teal})` : T.card,
                          color: active === cat ? T.bg : T.txt,
                          fontWeight: F.weight.bold,
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
                          <button
                            onClick={() => pick('')}
                            className="btnPill"
                            title={lang === 'no' ? 'Vis alle kategorier' : lang === 'sv' ? 'Visa alla kategorier' : 'Show all categories'}
                            style={{ background: T.card }}
                          >
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

                        <button
                          onClick={() => setPage('swipe')}
                          className="btnPill"
                          style={{ background: 'transparent', color: T.dim }}
                        >
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
                          border: `1px solid ${T.border}`,
                          borderRadius: R.lg,
                          padding: S.md2,
                          boxShadow: T.shadowMd,
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
                            flexShrink: 0,
                            padding: `${S.xs}px ${S.sm}px`,
                            borderRadius: R.pill,
                            background: T.goldWashHi,
                            border: `1px solid ${T.goldBorder}`,
                            color: T.gold,
                            fontWeight: F.weight.ultra,
                            fontSize: F.size.sm,
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
                                textDecoration: 'none',
                                padding: `${S.xs2}px ${S.sm2}px`,
                                borderRadius: R.pill,
                                border: `1px solid ${T.borderSoft}`,
                                background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                                color: T.bg,
                                fontWeight: F.weight.black,
                                fontSize: F.size.base,
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
                              textDecoration: 'none',
                              padding: `${S.xs2}px ${S.sm2}px`,
                              borderRadius: R.pill,
                              border: `1px solid ${T.borderSoft}`,
                              background: 'transparent',
                              color: T.txt,
                              fontWeight: F.weight.bold,
                              fontSize: F.size.base,
                            }}
                          >
                            {UI.openMaps[lang]}
                          </a>
                        </div>

                        {it.why && (
                          <div style={{
                            marginTop: S.sm2,
                            padding: `${S.xs2}px ${S.sm}px`,
                            borderLeft: `3px solid ${pct >= 75 ? T.gold : pct >= 50 ? T.teal : T.dim}`,
                            background: T.glassLo,
                            borderRadius: `0 ${R.sm}px ${R.sm}px 0`,
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

      <div style={{ padding: `${S.lg}px ${S.lg}px`, color: T.dim, fontSize: F.size.sm, borderTop: `1px solid ${T.border}` }}>
        {APP_VERSION} • {mode} • {lang} • backend: {BACKEND_DISPLAY || 'off'}
      </div>
    </div>
  );
}
