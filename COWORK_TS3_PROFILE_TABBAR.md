# COWORK TS3 — Preferanse-profil UI + Mode tab-bar

## Mål
To ting som begge handler om å gi brukeren følelsen av kontroll og innsikt:
1. En **visuell smaksprofil** som viser hva appen har lært om dem — morsom, personlig, ikke for teknisk
2. En **tab-bar for modes** som erstatter dropdown-valget — rask å bytte, alltid synlig

## Tone / vibe
Smaksprofilen skal føles som at appen "ser" brukeren. Ikke som en rapport med søylediagrammer — mer som noen som sier "Du er litt slik... og litt sånn 😄". Lett, varm, med litt sjel.

---

## Del 1 — Mode tab-bar

### Erstatt dagens mode-valg (dropdown/select i home-viewet)

### Komponent: `ModeTabBar`
- En fast rad med tabs (pill-stil) som alltid vises i `home`, `swipe` og `results` (ikke på landing)
- Plassering: under topbar/header, eller som en del av navigasjonsstrukturen

### Visning
```
[ 🎭 Opplevelser ]  [ 🍽️ Restauranter ]   ← mer modes kan legges til seinere
```
- Aktiv tab: bakgrunn gradient `T.gold` → `T.teal` (som `.btnPillPrimary`), tekst mørk
- Inaktiv tab: transparent, border `T.borderSoft`, tekst `T.dim`
- Hover: lys opp lett (opacity / border-color)
- Tab-bytting resetter items, catFilter (samme logikk som i dag)

### Modes og labels
Definer en liste i koden (slik at det er enkelt å legge til fremtidige modes):
```ts
const MODES_ORDERED: { mode: Mode; emoji: string }[] = [
  { mode: 'experiences', emoji: '🎭' },
  { mode: 'restaurants', emoji: '🍽️' },
  // fremtidige: { mode: 'shopping', emoji: '🛍️' }, { mode: 'nightlife', emoji: '🎉' }
];
```
- Labels hentes fra eksisterende `MODE_LABELS[mode][lang]`

### Ny i18n (ingen ny nødvendig — bruk `MODE_LABELS`)

---

## Del 2 — Preferanse-profil UI

### Plassering
- I `swipe`-viewet: vises som en **sammenleggbar seksjon** UNDER swipe-kortstakken og progress-bar
- Vises kun etter >= 10 swipes (vis "Swipe 10 til for å se smaksprofilen din" under det)
- Label: "🧠 Din smaksprofil så langt" med et chevron-ikon (▾/▴ for åpne/lukke)
- Default: lukket — brukeren kan åpne den manuelt

### Smaksprofil-visning (når åpnet)

**Seksjon 1: Fritekst-oppsummering**
- Bruk eksisterende `describeProfile(dims, lang)`-funksjon — den finnes allerede
- Men erstatt den tekniske dim-parentes-nøkkelen med menneskelig tekst:
  - I stedet for "svært kulturell (culture:78)" → bare "svært kulturell"
  - Strip ut `(key:verdi)`-delen fra output
- Vis som en liten "boble" med tekst:
  > "Du virker som en svært kulturell og ganske urban reisende 🗺️"

**Seksjon 2: Dimensjons-chips**
- Vis de topp 5 dimensjonene med sterkest signal (høyest |verdi|)
- Hver dimensjon vises som en liten chip:
  ```
  [🏛️ Kulturell +82]  [🌆 Urban +67]  [🎒 Eventyrlysten -45]
  ```
- Grønn chip (border `T.green`, bakgrunn rgba(52,211,153,0.08)) for positive dims
- Rød chip (border `T.red`) for negative dims  
- Emoji per dimensjon:

```ts
const DIM_EMOJI: Record<string, string> = {
  culture: '🏛️',
  outdoor: '🏔️',
  urban: '🌆',
  budget: '💸',
  luxury: '✨',
  adventure: '🎒',
  foodie: '🍜',
  social: '👥',
  relaxation: '🛋️',
  // legg til for alle DIMS i datasettet
};
```

**Seksjon 3: Progress-ring (valgfri hvis det er mye kode)**
- En liten "sveip-bredde"-indikator:
  > "Basert på 14 av 40 kort — sveip flere for bedre match"
- Kan gjøres som en enkel tekst + horisontal progress-bar (0-40 swipes)

### Komponent-navn: `ProfileSummary`
Props: `{ swipes: Record<string, number>; cards: Card[]; lang: Lang; totalSwipes: number }`

---

## i18n-strenger (legg til i `UI`-objektet)
```ts
profileTitle: { no: '🧠 Din smaksprofil så langt', en: '🧠 Your taste profile so far', sv: '🧠 Din smaksprofil hittills' },
profileTooFew: {
  no: (n: number) => `Sveip ${n} til for å se smaksprofilen din`,
  en: (n: number) => `Swipe ${n} more to see your taste profile`,
  sv: (n: number) => `Svajpa ${n} till för att se din smakprofil`,
},
profileBasis: {
  no: (n: number, total: number) => `Basert på ${n} av ${total} kort`,
  en: (n: number, total: number) => `Based on ${n} of ${total} cards`,
  sv: (n: number, total: number) => `Baserat på ${n} av ${total} kort`,
},
profileYouSeem: {
  no: (desc: string) => `Du virker som en ${desc} 🗺️`,
  en: (desc: string) => `You seem like a ${desc} traveler 🗺️`,
  sv: (desc: string) => `Du verkar vara en ${desc} resenär 🗺️`,
},
```

---

## Tekniske krav
- Alle farger fra `T.*`, spacing fra `S.*`, radius fra `R.*`
- `ProfileSummary` og `ModeTabBar` er separate React-komponenter definert i `App.tsx`
- Sammenleggbar seksjon: bruk `useState<boolean>` for åpen/lukket, CSS transition på høyde (eller bare `display: none / block` med animasjon)
- Ingen nye npm-avhengigheter
- TypeScript strict
- Respekter `prefers-reduced-motion` på alle animasjoner

## Ikke gjør
- Ikke lag søylediagrammer eller radar-charts (ingen ekstra libs)
- Ikke vis alle dimensjonene — maks 5
- Ikke gjør profil-seksjonen obligatorisk å se (den skal være opt-in/sammenleggbar)
