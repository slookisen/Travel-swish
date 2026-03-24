# COWORK TS4 — Fly-loading animasjon

## Mål
Erstatt den kjedelige "Henter…"-spinneren med noe som faktisk er verdt å vente på. Et fly som flyr rundt jordkloden, kjente steder som dukker opp, og en rullende tekst som holder brukeren underholdt mens AI-et jobber. Loading-skjermen er et øyeblikk appen kan bruke til å bygge forventning — ikke bare si "vent litt".

## Tone / vibe
Lekent men pent. Ikke barnslig, ikke kjedelig. Tror du at planeten er stor og full av spennende ting — og at de beste jobbene er verdt å vente på.

---

## Komponent: `FlyLoadingScreen`

Props: `{ destination: string; lang: Lang }`

Rendres i stedet for eksisterende loading-tilstand i `App` (der `loading === true` vises nå). Fullscreen overlay over app-innholdet, z-index: 8000.

---

## Visuell struktur

```
┌──────────────────────────────────────────┐
│                                          │
│         🏔️🗼  🌍  🗽🏯                    │  ← Attraksjoner flyr forbi
│                                          │
│              ✈️  ────────                 │  ← Fly i bue
│                                          │
│       Søker etter opplevelser            │
│           i Barcelona...                 │  ← Destinasjon
│                                          │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │  ← Rullende fun-facts
│  "Visste du at Barcelona har 4,4 km      │
│   med strender inne i en storby?"        │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄   │
│                                          │
└──────────────────────────────────────────┘
```

---

## Animasjon 1: Flyet

### SVG-fly (inline, enkel)
```svg
<svg viewBox="0 0 48 48" width="48" height="48">
  <text y="38" font-size="40">✈️</text>
</svg>
```
Bruk emoji-fly for enkelhet (kan erstattes med SVG-path seinere).

### Bevegelse
- Flyet følger en CSS `@keyframes flyArc`-bue fra venstre til høyre og litt opp-ned
- Buen: start `translateX(-60px) translateY(20px)`, midtpunkt `translateX(50%) translateY(-30px)`, slutt `translateX(calc(100vw - 80px)) translateY(10px)`
- Duration: 3.5s, `ease-in-out`, `infinite alternate`
- Fly-retning: tilsvarende rotasjon langs buen (`rotate(-10deg)` ved start → `rotate(0deg)` → `rotate(10deg)` ved slutt)

### Alternativ (enklere å implementere korrekt)
I stedet for kompleks bue: animer `left: -60px → calc(100% + 20px)` og `top: 40% → 30% → 40%` med `animation-timing-function: ease-in-out` + `infinite`. Flyet roterer lett med `rotate(-8deg)`.

---

## Animasjon 2: Attraksjoner

En rekke emoji dukker opp og forsvinner under flybanen.

### Attraksjons-emoji pool
```ts
const LANDMARKS = [
  { emoji: '🗼', name: 'Paris' },
  { emoji: '🗽', name: 'New York' },
  { emoji: '🏯', name: 'Tokyo' },
  { emoji: '🕌', name: 'Istanbul' },
  { emoji: '⛩️', name: 'Kyoto' },
  { emoji: '🏔️', name: 'Alps' },
  { emoji: '🏖️', name: 'Maldives' },
  { emoji: '🏛️', name: 'Rome' },
  { emoji: '🌋', name: 'Iceland' },
  { emoji: '🎡', name: 'London' },
  { emoji: '🕍', name: 'Jerusalem' },
  { emoji: '🏰', name: 'Prague' },
  { emoji: '🎠', name: 'Vienna' },
  { emoji: '🌁', name: 'San Francisco' },
];
```

### Visning
- Velg 5 tilfeldige (stabile per render, f.eks. basert på `destination`-hash)
- Plasser dem i en horisontal rad under flyets bane, med jevn avstand
- Animasjon: `@keyframes popIn` — scale 0 → 1 → 0.95 med stagger (hver 0.3s forsinkelse)
- Opacity: inn-ut med 1s intervall for live-feeling, stagger per element

---

## Animasjon 3: Rullende fun facts

### Fun facts array (legg inn som konstant, min. 15 stk — blanding NO/EN/SV basert på lang)
Eksempler (NO):
```ts
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
    'Visste du? Barcelona har 4,4 km stränder mitt i storstan.',
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
```

### Visning
- Én fact vises om gangen i en tekstboks
- Bytt fact hvert 4. sekund med fade-transition (opacity 1 → 0 → 1)
- Bruk `useEffect + setInterval` med index `% facts.length`
- Layout: sentralt, maks 360px bred, tekst `T.dim`, liten kursiv, border-top + border-bottom `T.borderSoft`

---

## Status-melding (destinasjonstekst)
Over fun-facts, vis:
```
Søker etter [opplevelser / restauranter]
i [destination]...
```
- "destination" i `T.gold`-farge for å framheve den

### i18n
```ts
loadingSearchingFor: {
  no: (mode: string, dest: string) => `Søker etter ${mode} i`,
  en: (mode: string, dest: string) => `Finding ${mode} in`,
  sv: (mode: string, dest: string) => `Söker efter ${mode} i`,
},
```

---

## CSS @keyframes (legg til i `globalCss` i `src/ui.ts`)
```css
@keyframes flyAcross {
  0%   { transform: translateX(-60px) translateY(20px) rotate(-8deg); }
  50%  { transform: translateX(calc(50vw - 24px)) translateY(-30px) rotate(0deg); }
  100% { transform: translateX(calc(100vw + 20px)) translateY(15px) rotate(8deg); }
}
@keyframes landmarkPop {
  0%   { opacity: 0; transform: scale(0.5) translateY(10px); }
  20%  { opacity: 1; transform: scale(1) translateY(0); }
  80%  { opacity: 1; transform: scale(1) translateY(0); }
  100% { opacity: 0; transform: scale(0.8) translateY(-5px); }
}
@keyframes factFade {
  0%, 100% { opacity: 0; }
  10%, 90%  { opacity: 1; }
}
```

---

## Tekniske krav
- Hele komponenten er CSS-animasjoner — ingen animasjonsbiblioteker
- `FlyLoadingScreen` rendres som fullscreen `position: fixed, inset: 0, z-index: 8000` med bakgrunn `T.bg`
- Respekter `prefers-reduced-motion`: vis kun status-tekst + spinner-prikk hvis reduced-motion er på
- Ingen nye npm-avhengigheter
- TypeScript strict

## Ikke gjør
- Ikke lag en faktisk SVG-globus (for mye arbeid) — emoji er godt nok
- Ikke blokker "Avbryt"-knapp — vis en diskret "Avbryt"-lenke under loading (kaller `setLoading(false)`)
- Ikke la loading-skjermen brukes til annet enn `loading === true`-tilstanden
