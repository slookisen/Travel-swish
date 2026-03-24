# COWORK TS2 — Ny landing + API-nøkkel guide

## Mål
Landingssiden er første inntrykk. Den skal stoppe brukeren og få dem til å ville prøve appen — ikke forklare alt på én gang. Energisk, klar, litt morsom. Og hvis de trenger en API-nøkkel, skal det føles som en 30-sekunders operasjon, ikke en DevOps-oppgave.

## Tone / vibe
Tenk: smart reisevenn som vet hva de snakker om, men ikke er kjedelig om det. Visuelt: premium dark + gull/teal-akksentfarger som finnes i designsystemet. Ingen reklame-greier. Ingen corpo-spreak.

---

## Del 1 — Ny landing-side

### Erstatt eksisterende `LandingPage`-komponent fullstendig

### Struktur (top → bunn, én side uten scroll)
```
┌──────────────────────────────────────────┐
│  ✈️  Travel-Swish          [NO / EN / SV] │  ← topbar
├──────────────────────────────────────────┤
│                                          │
│   [emoji-animasjon: roterende globus     │
│    eller reiserelaterte emoji i loop]    │
│                                          │
│   Vanskelige valg?                       │  ← hero headline
│   Vi finner det som faktisk passer deg.  │  ← subtitle
│                                          │
│   ┌────────────────────────────────┐     │
│   │ Sveip 20 kort  →  Få treff    │     │  ← 3-steg illustrasjon
│   │    som matcher akkurat deg     │     │
│   └────────────────────────────────┘     │
│                                          │
│        [✈️  Kom i gang]                  │  ← CTA-knapp (primær)
│                                          │
│   🍽️ Restauranter   🎭 Opplevelser       │  ← mode-hint
│   Ikke sikker på hva du vil? Det er OK. │
│                                          │
└──────────────────────────────────────────┘
```

### Hero-animasjon (emoji-globus)
- En rekke emoji i en `<div>` roterer/fader inn-ut i loop (CSS animation):
  `🗼 🗽 🏯 🏖️ 🎡 🌋 🏔️ 🎠 🕌 ⛩️`
- Én emoji vises om gangen, fade-in/out, 1.8s per emoji
- Plasser sentralt over headlinen, font-size: 52px

### Headline
- NO: "Vanskelige valg?" (stor, bold/ultra) + "Vi hjelper deg finne det som faktisk passer deg." (litt mindre, gold-farget)
- EN: "Hard choices?" + "We help you find what actually fits you."
- SV: "Svåra val?" + "Vi hjälper dig hitta det som faktiskt passar dig."

### 3-steg illustrasjon (erstatter "Slik fungerer det"-listen)
Tre inline-bokser på rad (eller stablet på mobil) med ikoner:
```
👆 Sveip 20 kort    🧠 Vi lærer smaken din    🎯 Treff som passer deg
```
- Kort, punchline-stil — ikke lange forklaringer
- Bakgrunn: `T.glassHi`, border: `T.borderSoft`, borderRadius: `R.lg`

### Tagline under CTA
```
Ingen konto. Ingen reklame. Bare gode treff.
```
- Liten tekst, `T.dim`, under CTA-knappen

### CTA-knapp
- Tekst (NO): "✈️  Kom i gang" 
- Stor, primær stil (`.btnPillPrimary`)
- `onClick` → `setPage('home')`

### Fjern fra landing
- Gammel "Slik fungerer det"-liste
- "Tips:"-teksten
- API-nøkkel-felt på landing (det flyttes til settings-menyen)

---

## Del 2 — API-nøkkel guide (modal)

Denne åpnes fra Settings-menyen (implementert i TS1) når bruker trykker "📜 API-nøkkel guide".

### Modal-komponent: `ApiKeyGuideModal`

Props: `{ lang: Lang; onClose: () => void; onSave: (key: string) => void; currentKey: string }`

### Innhold i modalen

**Tittel:** "API-nøkkel — 30 sekunder" 🔑

**Steg-for-steg (kompakt liste):**
```
1. Gå til console.anthropic.com  [🔗 Åpne]
2. Logg inn / opprett konto (gratis)
3. Klikk "API Keys" i venstremenyen
4. Klikk "Create Key" — gi den et navn (f.eks. "travel-swish")
5. Kopier nøkkelen (starter med "sk-ant-...")
6. Lim inn under:
```

**Input-felt:** 
- Placeholder: `sk-ant-...`
- Type: password (med "vis/skjul"-toggle 👁)
- Lagre-knapp: "Lagre nøkkel ✓"
- `onSave(key)` → lagrer til localStorage + lukker modal

**Bunntekst:**
> "Nøkkelen lagres kun i din nettleser. Vi ser den aldri."
> Liten, `T.dim`

### i18n-strenger (minimal, bare norsk og engelsk er viktigst her)
```ts
apiGuideTitle: { no: '🔑 API-nøkkel — 30 sekunder', en: '🔑 API Key — 30 seconds', sv: '🔑 API-nyckel — 30 sekunder' },
apiGuideStep1: { no: 'Gå til console.anthropic.com', en: 'Go to console.anthropic.com', sv: 'Gå till console.anthropic.com' },
apiGuideStep2: { no: 'Logg inn eller opprett konto (gratis)', en: 'Log in or create account (free)', sv: 'Logga in eller skapa konto (gratis)' },
apiGuideStep3: { no: 'Klikk "API Keys" i venstremenyen', en: 'Click "API Keys" in the left menu', sv: 'Klicka "API Keys" i vänstermenyn' },
apiGuideStep4: { no: 'Klikk "Create Key" og gi den et navn', en: 'Click "Create Key" and name it', sv: 'Klicka "Create Key" och namnge den' },
apiGuideStep5: { no: 'Kopier nøkkelen og lim inn under', en: 'Copy the key and paste below', sv: 'Kopiera nyckeln och klistra in nedan' },
apiGuidePlaceholder: { no: 'sk-ant-...', en: 'sk-ant-...', sv: 'sk-ant-...' },
apiGuideSave: { no: 'Lagre nøkkel ✓', en: 'Save key ✓', sv: 'Spara nyckel ✓' },
apiGuidePrivacy: {
  no: 'Nøkkelen lagres kun i din nettleser. Vi ser den aldri.',
  en: 'The key is stored only in your browser. We never see it.',
  sv: 'Nyckeln lagras bara i din webbläsare. Vi ser den aldrig.',
},
```

---

## Tekniske krav
- Alle farger fra `T.*`, spacing fra `S.*`, radius fra `R.*`
- Modal-bakgrunn: `rgba(0,0,0,0.65)` fixed fullscreen, z-index: 9000
- Emoji-globus-animasjon: CSS `@keyframes` — legg til i `globalCss` i `src/ui.ts`
- Landing skal ikke vise scrollbar (alt fit-to-screen, eller scrollable men pent)
- Ingen nye npm-avhengigheter
- TypeScript strict

## Ikke gjør
- Ikke fjern landingssiden — erstatt den
- Ikke vis API-nøkkel-feltet direkte på landing (kun i guide-modal via settings)
- Ikke skriv lange "om oss"-tekster
