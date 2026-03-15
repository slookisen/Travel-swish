import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T, globalCss, F, R, S, M } from './ui';
import { DIMS, getDeckCards, t as tData, type Card, type Lang, type Mode } from './dataset';
import { BUILD_META } from './buildMeta';

// --- Versioning (shows in footer; also helps debugging cached deploys)
const APP_VERSION = BUILD_META.version;

// Backend API (local dev default). On GitHub Pages we intentionally keep this empty.
const DEFAULT_BACKEND_URL =
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://127.0.0.1:8000'
    : '';
const BACKEND_URL = (String((import.meta as any).env?.VITE_BACKEND_URL || '').trim()) || DEFAULT_BACKEND_URL;

const nowS = () => Math.floor(Date.now() / 1000);

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
    no: 'Tips: Velg modus, skriv inn sted, swipe 10 kort og få forslag.',
    en: 'Tip: Pick a mode, enter a destination, swipe 10 cards, get suggestions.',
    sv: 'Tips: Välj läge, skriv in plats, svajpa 10 kort och få förslag.',
  },
  getStarted: { no: 'Kom i gang', en: 'Get started', sv: 'Kom igång' },
  chooseMode: { no: 'Velg modus', en: 'Choose mode', sv: 'Välj läge' },
  destination: { no: 'Destinasjon', en: 'Destination', sv: 'Destination' },
  destinationMissing: { no: 'Destinasjon mangler', en: 'Destination required', sv: 'Destination krävs' },
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
    en: 'Big cards, low noise. Tap “Why” for an explanation.',
    sv: 'Stora kort, lite brus. Tryck på “Varför” för förklaring.',
  },
  noResults: {
    no: 'Ingen forslag ennå. Prøv «Finn flere» eller swipe noen flere kort.',
    en: 'No suggestions yet. Try “Find more” or swipe a few more cards.',
    sv: 'Inga förslag än. Prova ”Hitta fler” eller svajpa några fler kort.',
  },
  // kept for backwards compatibility (not used)
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
  findMore: { no: 'Finn flere', en: 'Find more', sv: 'Hitta fler' },
  why: { no: 'Hvorfor', en: 'Why', sv: 'Varför' },
  resetDeck: { no: 'Start på nytt', en: 'Start over', sv: 'Börja om' },
  resetDeckHelp: {
    no: 'Du har brukt opp kortstokken i denne modusen. Start på nytt for å få kort igjen.',
    en: 'You have used up the deck in this mode. Start over to get cards again.',
    sv: 'Du har använt upp kortleken i detta läge. Börja om för att få kort igen.',
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
  swipeAtLeast: { no: 'Sveip minst 10 kort først.', en: 'Swipe at least 10 cards first.', sv: 'Svajpa minst 10 kort först.' },
  openLink: { no: 'Åpne lenke', en: 'Open link', sv: 'Öppna länk' },
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

function itemSeenKey(it: Pick<Item, 'id' | 'name'>) {
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

type Item = {
  id?: string;
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

  // API key removed (backend-first). Keep legacy localStorage key untouched.
  const apiKey = '';
  const [userId] = useState(() => getOrCreateId('ts_user_id'));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [catFilter, setCatFilter] = useState(() => loadCatFilter(mode));
  const seenKeys = useRef<string[]>([]);

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

  // (no apiKey persistence)

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

  const canSearch = totalSwipes >= 10 || Object.keys(swipes).length >= 10;

  async function findItems() {
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(UI.cooldownError[lang](cooldownLeft));
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const profile = calcProfile(swipes, cards);

      // v2: backend-first (local dev). If backend isn't available, fall back to local placeholder.
      const prefs: Record<string, number> = Object.fromEntries(
        Object.entries(profile).map(([k, v]) => [k, Math.round((v / 100) * 1000) / 1000])
      );

      const dest = destination.trim();

      if (BACKEND_URL) {
        try {
          // Persist prefs so /recs can use them.
          await fetchJson(`${BACKEND_URL}/prefs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, mode, prefs, updated_ts: nowS() }),
            timeoutMs: 8000,
          });

          const j = await fetchJson(`${BACKEND_URL}/recs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, mode, destination: dest, limit: 20 }),
            timeoutMs: 12000,
          });

          const raw = Array.isArray(j?.items) ? j.items : [];
          if (raw.length) {
            let newItems: Item[] = raw
              .map((x: any) => ({
                id: String(x?.id || ''),
                name: String(x?.name || ''),
                cat: String(x?.cat || ''),
                why: String(x?.why || ''),
                url: String(x?.url || ''),
                match: typeof x?.match === 'number' ? Math.round(x.match) : undefined,
              }))
              .filter(i => i.name);

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

          setInfo(
            lang === 'no'
              ? 'Ingen treff fra backend ennå — viser demo-forslag.'
              : lang === 'sv'
                ? 'Inga träffar från backend ännu — visar demo-förslag.'
                : 'No backend hits yet — showing demo suggestions.'
          );
        } catch (e) {
          // Keep app usable even if backend is down.
          console.warn('Backend recs unavailable; falling back to local suggestions.', e);
          setInfo(
            lang === 'no'
              ? 'Backend utilgjengelig — viser demo-forslag.'
              : lang === 'sv'
                ? 'Backend otillgänglig — visar demo-förslag.'
                : 'Backend unavailable — showing demo suggestions.'
          );
        }
      } else {
        setInfo(
          lang === 'no'
            ? 'Backend ikke konfigurert — viser demo-forslag.'
            : lang === 'sv'
              ? 'Backend är inte konfigurerad — visar demo-förslag.'
              : 'Backend not configured — showing demo suggestions.'
        );
      }

      // Minimal local suggestions (placeholder) based on strongest dims.
      const top = Object.entries(profile)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 3)
        .map(([k, v]) => `${k}:${Math.round(v)}`)
        .join(', ');

      const newItems: Item[] = [
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
        <div style={{ fontWeight: F.weight.black, color: T.gold, letterSpacing: 0.2 }}>Travel‑Swish</div>
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
          <div className="card" style={{ padding: S.xl }}>
            <div className="row wrap" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontWeight: F.weight.bold, letterSpacing: 0.4 }}>TRAVEL‑SWISH</div>
                <h1 style={{ margin: `${S.xs2}px 0 ${S.xs}px 0`, fontSize: F.size.hero }}>{UI.landingTitle[lang]}</h1>
                <p className="muted" style={{ lineHeight: 1.6, marginTop: 0 }}>{UI.landingDesc[lang]}</p>
              </div>
              <div className="pill muted" style={{ alignSelf: 'flex-start' }}>Build {APP_VERSION}</div>
            </div>

            <div style={{ marginTop: S.md2 }}>
              <button className="btn btnPrimary" onClick={() => setPage('home')}>{UI.getStarted[lang]}</button>
            </div>

            <div style={{ marginTop: S.md2 }} className="muted">
              {UI.landingTip[lang]}
            </div>
          </div>
        </div>
      )}

      {page === 'home' && (
        <div style={{ padding: S.page, maxWidth: 760, margin: '0 auto' }}>
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
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder={lang === 'no' ? 'Barcelona, Oslo, Tokyo…' : lang === 'sv' ? 'Barcelona, Stockholm, Tokyo…' : 'Barcelona, Oslo, Tokyo…'}
              style={{ width: '100%', padding: S.sm2, borderRadius: R.md, border: `1px solid ${T.border}`, background: T.card, color: T.txt }}
            />
          </div>

          <div className="muted" style={{ marginTop: S.xs2, fontSize: F.size.sm }}>
            {UI.apiKeyNote[lang]}
          </div>

          <div style={{ marginTop: S.md2, display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (!destination.trim()) { setError(UI.destinationMissing[lang]); return; }
                setPage('swipe');
              }}
              style={{ padding: `${S.sm2}px ${S.md2}px`, borderRadius: R.md, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.gold}, ${T.teal})`, color: T.bg, fontWeight: F.weight.bold }}
            >
              {UI.startMode[lang](labels)}
            </button>
            <button onClick={() => setPage('landing')} style={{ padding: `${S.sm2}px ${S.md2}px`, borderRadius: R.md, border: `1px solid ${T.border}`, cursor: 'pointer', background: 'transparent', color: T.txt }}>
              {UI.back[lang]}
            </button>
          </div>

          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
        </div>
      )}

      {page === 'swipe' && (
        <div style={{ padding: S.page, maxWidth: 760, margin: '0 auto' }}>
          <button onClick={() => setPage('home')} style={{ marginBottom: S.sm, background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: `${S.xs2}px ${S.sm}px`, borderRadius: R.sm, cursor: 'pointer' }}>
            {UI.back[lang]}
          </button>

          <h2 style={{ marginTop: 0 }}>{labels}: {destination}</h2>
          <div style={{ color: T.dim, marginBottom: S.sm }}>{UI.swipeHint[lang]}</div>
          <div style={{ color: T.dim, fontSize: F.size.sm, marginBottom: S.md2 }}>{UI.total[lang]}: {totalSwipes}</div>

          {/* Swipe deck (stacked, Tinder-like) */}
          <div style={{ position: 'relative', minHeight: 360 }}>
            {deckIndex >= deck.length ? (
              <div style={{ color: T.dim, paddingTop: S.page + S.xxs }}>
                <div style={{ fontWeight: F.weight.black, color: T.txt, marginBottom: S.xs }}>
                  {lang === 'no' ? 'Ingen flere kort' : lang === 'sv' ? 'Inga fler kort' : 'No more cards'}
                </div>
                <div style={{ lineHeight: 1.5 }}>
                  {UI.resetDeckHelp[lang]}
                </div>
                <div style={{ marginTop: S.md, display: 'flex', gap: S.sm, flexWrap: 'wrap' }}>
                  <button
                    onClick={resetDeck}
                    style={{
                      padding: `${S.sm}px ${S.md}px`,
                      borderRadius: R.pill,
                      border: `1px solid ${T.borderSoft}`,
                      background: 'transparent',
                      color: T.txt,
                      fontWeight: F.weight.black,
                      cursor: 'pointer',
                    }}
                  >
                    {UI.resetDeck[lang]}
                  </button>
                  <button
                    onClick={() => setPage('home')}
                    style={{
                      padding: `${S.sm}px ${S.md}px`,
                      borderRadius: R.pill,
                      border: `1px solid ${T.borderSoft}`,
                      background: 'transparent',
                      color: T.dim,
                      fontWeight: F.weight.bold,
                      cursor: 'pointer',
                    }}
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
              style={{
                padding: `${S.sm2}px ${S.md2}px`,
                borderRadius: R.md,
                border: 'none',
                cursor: !canSearch || loading ? 'not-allowed' : 'pointer',
                background: !canSearch || loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                color: !canSearch || loading ? T.dim : T.bg,
                fontWeight: F.weight.bold,
              }}
            >
              {loading ? UI.loading[lang] : UI.fetch[lang]}
            </button>
            {!canSearch && <div style={{ color: T.dim, alignSelf: 'center' }}>{UI.swipeAtLeast[lang]}</div>}
          </div>

          {error && <div style={{ marginTop: S.md, color: T.red }}>{error}</div>}
          {info && <div style={{ marginTop: S.sm, color: T.dim }}>{info}</div>}
        </div>
      )}

      {page === 'results' && (
        <div style={{ padding: S.page, maxWidth: 760, margin: '0 auto' }}>
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
                disabled={loading || (cooldownUntil && cooldownUntil > Date.now())}
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
                    <div className="muted" style={{ padding: S.md2 }}>
                      {UI.noResults[lang]}
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
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: F.weight.ultra, fontSize: F.size.md, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.name}
                            </div>
                            <div style={{ display: 'flex', gap: S.xs2, flexWrap: 'wrap', marginTop: S.xs2, alignItems: 'center' }}>
                              {it.cat && (
                                <span style={{ fontSize: F.size.sm, color: T.dim, border: `1px solid ${T.borderSoft}`, padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill, background: T.glassLo }}>
                                  {it.cat}
                                </span>
                              )}
                              {it.url && (
                                <a
                                  href={it.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: F.size.sm, color: T.teal, textDecoration: 'none', border: `1px solid ${T.borderSoft}`, padding: `${S.xxs}px ${S.sm}px`, borderRadius: R.pill }}
                                >
                                  {UI.openLink[lang]}
                                </a>
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

                        {it.why && (
                          <details style={{ marginTop: S.sm2 }}>
                            <summary style={{ cursor: 'pointer', color: T.dim, fontWeight: F.weight.bold }}>
                              {UI.why[lang]}
                            </summary>
                            <div style={{ color: T.dim, marginTop: S.xs2, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{it.why}</div>
                          </details>
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
        {APP_VERSION} • {mode} • {lang}
      </div>
    </div>
  );
}
