import React, { useEffect, useMemo, useRef, useState } from 'react';
import { T, globalCss } from './ui';
import { DIMS, getDeckCards, t as tData, type Card, type Lang, type Mode } from './dataset';

// --- Versioning (shows in footer; also helps debugging cached deploys)
const APP_VERSION = 'v0.1.4';

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
  findMore: { no: 'Finn flere', en: 'Find more', sv: 'Hitta fler' },
  why: { no: 'Hvorfor', en: 'Why', sv: 'Varför' },
  resetDeck: { no: 'Start på nytt', en: 'Start over', sv: 'Börja om' },
  resetDeckHelp: {
    no: 'Du har brukt opp kortstokken i denne modusen. Start på nytt for å få kort igjen.',
    en: 'You have used up the deck in this mode. Start over to get cards again.',
    sv: 'Du har använt upp kortleken i detta läge. Börja om för att få kort igen.',
  },
  loading: { no: 'Henter…', en: 'Loading…', sv: 'Laddar…' },
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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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
    }, 220);
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
                  borderRadius: 20,
                  padding: 16,
                  transform: `translateY(${y}px) scale(${scale})`,
                  boxShadow: T.shadow,
                  opacity: 0.55,
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontSize: 28 }}>{c.emoji}</div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{c.q}</div>
                </div>
                <div style={{ color: T.dim, marginTop: 8, lineHeight: 1.5 }}>{c.desc}</div>
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
              borderRadius: 20,
              padding: 16,
              transform: `translate(${dx}px, ${dy}px) rotate(${dx / 18}deg)`,
              transition: dragging ? 'none' : animating ? 'transform 220ms ease' : 'transform 180ms ease',
              boxShadow: T.shadow,
              userSelect: 'none',
              position: 'relative',
            }}
          >
            {/* Badges */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                padding: '6px 10px',
                borderRadius: 10,
                border: `3px solid ${T.red}`,
                color: T.red,
                fontWeight: 1000,
                letterSpacing: 1,
                transform: 'rotate(-14deg)',
                opacity: badgeNoOpacity,
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              {UI.no[lang]}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                padding: '6px 10px',
                borderRadius: 10,
                border: `3px solid ${T.green}`,
                color: T.green,
                fontWeight: 1000,
                letterSpacing: 1,
                transform: 'rotate(14deg)',
                opacity: badgeYesOpacity,
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              {UI.yes[lang]}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 28 }}>{top.emoji}</div>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{top.q}</div>
            </div>
            <div style={{ color: T.dim, marginTop: 8, lineHeight: 1.5 }}>{top.desc}</div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <button
                onClick={() => commitSwipe(-1)}
                disabled={animating}
                style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.red, cursor: animating ? 'not-allowed' : 'pointer', fontWeight: 900 }}
              >
                {UI.no[lang]}
              </button>
              <button
                onClick={() => commitSwipe(1)}
                disabled={animating}
                style={{ padding: '10px 12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'transparent', color: T.green, cursor: animating ? 'not-allowed' : 'pointer', fontWeight: 900 }}
              >
                {UI.yes[lang]}
              </button>
              <div style={{ marginLeft: 'auto', color: T.dim, fontSize: 12 }}>
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
    seenNames.current = [];
    setDeckIndex(0);
    setError('');
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
      <style>{globalCss}</style>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ fontWeight: 900, color: T.gold, letterSpacing: 0.2 }}>Travel‑Swish</div>
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

      {page === 'landing' && (
        <div className="container fadeUp">
          <div className="card" style={{ padding: 22 }}>
            <div className="row wrap" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontWeight: 800, letterSpacing: 0.4 }}>TRAVEL‑SWISH</div>
                <h1 style={{ margin: '8px 0 6px 0', fontSize: 34 }}>{UI.landingTitle[lang]}</h1>
                <p className="muted" style={{ lineHeight: 1.6, marginTop: 0 }}>{UI.landingDesc[lang]}</p>
              </div>
              <div className="pill muted" style={{ alignSelf: 'flex-start' }}>Build {APP_VERSION}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn btnPrimary" onClick={() => setPage('home')}>{UI.getStarted[lang]}</button>
            </div>

            <div style={{ marginTop: 16 }} className="muted">
              {lang === 'no'
                ? 'Tips: Velg modus, skriv sted, legg inn nøkkel, swipe 10 kort og få forslag.'
                : lang === 'sv'
                  ? 'Tips: Välj läge, skriv plats, lägg in nyckel, svajpa 10 kort och få förslag.'
                  : 'Tip: Pick mode, enter destination, paste key, swipe 10 cards, get suggestions.'}
            </div>
          </div>
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

          {/* Swipe deck (stacked, Tinder-like) */}
          <div style={{ position: 'relative', minHeight: 360 }}>
            {deckIndex >= deck.length ? (
              <div style={{ color: T.dim, paddingTop: 28 }}>
                <div style={{ fontWeight: 900, color: T.txt, marginBottom: 6 }}>
                  {lang === 'no' ? 'Ingen flere kort' : lang === 'sv' ? 'Inga fler kort' : 'No more cards'}
                </div>
                <div style={{ lineHeight: 1.5 }}>
                  {UI.resetDeckHelp[lang]}
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={resetDeck}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${T.borderSoft}`,
                      background: 'transparent',
                      color: T.txt,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {UI.resetDeck[lang]}
                  </button>
                  <button
                    onClick={() => setPage('home')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${T.borderSoft}`,
                      background: 'transparent',
                      color: T.dim,
                      fontWeight: 800,
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage('swipe')}
              style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.txt, padding: '8px 10px', borderRadius: 999, cursor: 'pointer' }}
            >
              {UI.back[lang]}
            </button>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {cooldownUntil && cooldownUntil > Date.now() && (
                <div style={{ color: T.dim, fontSize: 12 }}>
                  {lang === 'no' ? `Cooldown: ${cooldownLeft}s` : lang === 'sv' ? `Cooldown: ${cooldownLeft}s` : `Cooldown: ${cooldownLeft}s`}
                </div>
              )}
              <button
                onClick={findItems}
                disabled={loading || (cooldownUntil && cooldownUntil > Date.now())}
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? T.card : `linear-gradient(135deg, ${T.gold}, ${T.teal})`,
                  color: loading ? T.dim : T.bg,
                  fontWeight: 900,
                }}
                title={lang === 'no' ? 'Hent flere forslag basert på profilen din' : 'Fetch more suggestions based on your profile'}
              >
                {loading ? UI.loading[lang] : UI.findMore[lang]}
              </button>
            </div>
          </div>

          <h2 style={{ margin: '14px 0 0 0', letterSpacing: 0.2 }}>{labels}: {destination}</h2>
          <div style={{ color: T.dim, marginTop: 6, fontSize: 12 }}>{lang === 'no' ? 'Tinder clean: store kort, lite støy. Klikk for «hvorfor».' : 'Big cards, low noise. Tap for “why”.'}</div>

          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {items.map((it, idx) => {
              const pct = Math.round(it.match || 0);
              return (
                <div
                  key={idx}
                  style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`,
                    border: `1px solid ${T.border}`,
                    borderRadius: 18,
                    padding: 16,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {it.name}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                        {it.cat && (
                          <span style={{ fontSize: 12, color: T.dim, border: `1px solid ${T.borderSoft}`, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.02)' }}>
                            {it.cat}
                          </span>
                        )}
                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: T.teal, textDecoration: 'none', border: `1px solid ${T.borderSoft}`, padding: '4px 10px', borderRadius: 999 }}
                          >
                            {UI.openLink[lang]}
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{
                      flexShrink: 0,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(212,165,116,0.14)',
                      border: '1px solid rgba(212,165,116,0.28)',
                      color: T.gold,
                      fontWeight: 950,
                      fontSize: 12,
                    }}>
                      {pct}%
                    </div>
                  </div>

                  {it.why && (
                    <details style={{ marginTop: 12 }}>
                      <summary style={{ cursor: 'pointer', color: T.dim, fontWeight: 800 }}>
                        {UI.why[lang]}
                      </summary>
                      <div style={{ color: T.dim, marginTop: 8, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{it.why}</div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '18px 18px', color: T.dim, fontSize: 12, borderTop: `1px solid ${T.border}` }}>
        {APP_VERSION} • {mode} • {lang}
      </div>
    </div>
  );
}
