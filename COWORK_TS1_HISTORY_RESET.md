# COWORK TS1 — Historikk, reset og "forrige resultater"

## Mål
Gi brukeren full kontroll over dataene sine, og la dem se hva appen fant sist — uten at det føles som et ryddig Word-dokument. Det skal føles som å åpne en reisedagbok.

## Tone / vibe
Profesjonell overflate, varm undertone. Når noe slettes, ikke si "Data slettet." — si noe som "Ferdig! Nytt eventyr venter 🌍". Feil skal aldri føles kalde eller tekniske.

---

## Del 1 — "Slett alt"-funksjon

### Plassering
- Legg til et ⚙️ / ⋮ (three-dot) ikon øverst i høyre hjørne i `home`-viewet og `swipe`-viewet
- Ikonet åpner en liten **SettingsMenu**-komponent (absolutt posisjonert dropdown, lukkes ved klikk utenfor)

### Innhold i menyen
```
⚙️  Innstillinger

[🗑️ Slett min historikk]    ← nuker alt
[📜 API-nøkkel guide]       ← link/modal (implementeres i TS2)
[❓ Om appen]               ← kan vente til senere
```

### Slett-funksjon
- Slett-knappen viser en **ConfirmDialog** (ikke browser `confirm()` — lag en egen liten modal)
- Tekst i dialog (NO): 
  > "Er du sikker? Vi glemmer alle sveipene dine og forrige resultater. Destinasjon og API-nøkkel beholdes."
- Knapper: [Avbryt] [Ja, start på nytt 🧹]
- Når bekreftet: slett disse localStorage-nøklene:
  - `ts_swipes_experiences`, `ts_totalSwipes_experiences`, `ts_seen_experiences`, `ts_catFilter_experiences`
  - `ts_swipes_restaurants`, `ts_totalSwipes_restaurants`, `ts_seen_restaurants`, `ts_catFilter_restaurants`
  - `ts_last_results_experiences_*`, `ts_last_results_restaurants_*` (bruk `Object.keys(localStorage).filter(k => k.startsWith('ts_last_results_'))`)
- Behold: `ts_user_id`, `ts_lang`, `ts_mode`, `ts_destination`, `ts_apiKey`
- Etter sletting: naviger til `'home'`, vis en liten toast/info-melding (2-3 sek): "Ferdig! Nytt eventyr venter 🌍"
- Sett React state tilbake: `swipes = {}`, `totalSwipes = 0`, `items = []`

### i18n-strenger (legg til i `UI`-objektet)
```ts
settingsTitle: { no: 'Innstillinger', en: 'Settings', sv: 'Inställningar' },
deleteHistory: { no: 'Slett min historikk', en: 'Delete my history', sv: 'Radera min historik' },
deleteConfirmTitle: { no: 'Start på nytt?', en: 'Start over?', sv: 'Börja om?' },
deleteConfirmBody: {
  no: 'Vi glemmer alle sveipene dine og forrige resultater. Destinasjon og API-nøkkel beholdes.',
  en: 'We'll forget all your swipes and previous results. Destination and API key are kept.',
  sv: 'Vi glömmer alla dina svajpningar och tidigare resultat. Destination och API-nyckel behålls.',
},
deleteConfirmCancel: { no: 'Avbryt', en: 'Cancel', sv: 'Avbryt' },
deleteConfirmOk: { no: 'Ja, start på nytt 🧹', en: 'Yes, start over 🧹', sv: 'Ja, börja om 🧹' },
deleteSuccessToast: { no: 'Ferdig! Nytt eventyr venter 🌍', en: 'Done! A new adventure awaits 🌍', sv: 'Klart! Ett nytt äventyr väntar 🌍' },
```

---

## Del 2 — Lagring og visning av forrige resultater

### Lagring
Etter en vellykket `findItems()` (backend ELLER Claude-fallback — når `setItems(newItems)` kalles og `setPage('results')`):
- Serialiser resultatet til localStorage med nøkkelen:
  `ts_last_results_<mode>_<destination_slug>` 
  der `destination_slug = dest.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40)`
- Lagre som JSON: `{ ts: Date.now(), dest: dest, items: newItems, lang }`
- Maks størrelse-guard: hvis JSON.stringify > 80 000 chars, lagre bare de 5 første itemsa
- Wrap i try/catch (localStorage kan være full)

### Funksjon for å hente forrige resultater
```ts
function loadLastResults(mode: Mode, dest: string): { ts: number; dest: string; items: RecItem[]; lang: Lang } | null {
  const slug = dest.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
  try {
    const raw = localStorage.getItem(`ts_last_results_${mode}_${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items)) return null;
    return parsed;
  } catch { return null; }
}
```

### Visning — "Forrige funn"-seksjon
- I `home`-viewet: etter mode-valg og destinasjonsinput, men FØR "Finn forslag"-knappen
- Vis kun hvis `loadLastResults(mode, destination)` returnerer data OG destination er fylt inn
- Utseende: en diskret, sammenleggbar seksjon med tittelen:
  > "📌 Forrige funn i [Dest]" + timestamp (f.eks. "for 2 dager siden")
- Vis maks 3 resultater som kompakte "mini-kort": navn, kategori-chip, match%
- En "Se alle"-lenke/knapp som navigerer til `results`-viewet med de lagrede dataene (ikke nytt API-kall)
- Timestamp-formatering: < 1h → "akkurat nå", < 24h → "X timer siden", ellers "X dager siden"

### i18n-strenger
```ts
lastResultsTitle: {
  no: (dest: string) => `📌 Forrige funn i ${dest}`,
  en: (dest: string) => `📌 Previous finds in ${dest}`,
  sv: (dest: string) => `📌 Tidigare fynd i ${dest}`,
},
lastResultsSeeAll: { no: 'Se alle', en: 'See all', sv: 'Se alla' },
lastResultsJustNow: { no: 'akkurat nå', en: 'just now', sv: 'just nu' },
lastResultsHoursAgo: { no: (h: number) => `${h}t siden`, en: (h: number) => `${h}h ago`, sv: (h: number) => `${h}t sedan` },
lastResultsDaysAgo: { no: (d: number) => `${d} dager siden`, en: (d: number) => `${d} days ago`, sv: (d: number) => `${d} dagar sedan` },
```

---

## Tekniske krav
- Bruk eksisterende designtokens: `T.*`, `R.*`, `S.*`, `F.*`, `M.*` — ingen hardkodede farger/px
- Modal/dialog: bakgrunn `rgba(0,0,0,0.6)`, innhold som `.card`-stil
- Toast: posisjonert `fixed bottom: 24px left: 50% transform: translateX(-50%)`, vises 2.5 sek, fade ut
- Animasjoner: respekter `prefers-reduced-motion`
- Ingen nye npm-avhengigheter
- Koden skrives inn i `src/App.tsx` (og evt. `src/ui.ts` for nye tokens)
- TypeScript strict — ingen `any` der det er unngåelig

## Ikke gjør
- Ikke legg til "Om appen" eller API-guide nå (det er TS2)
- Ikke bytt ut eksisterende reset-logikk i swipe-viewet — legg til som separat funksjon
- Ikke bruk `window.confirm()` eller `window.alert()`
