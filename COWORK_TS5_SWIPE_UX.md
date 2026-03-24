# COWORK TS5 — Swipe UX oppgradering

## Mål
Swipe-opplevelsen er kjernen i appen. Den skal føles som den beste versjonen av seg selv — taktil, responsiv, litt tilfredsstillende å bruke. Når man sveiper høyre på noe man vil, skal det nesten føles som å pakke kofferten.

## Tone / vibe
Dette er den mest "game-like" delen av appen. Det er OK å overdrive litt her — ikke nok til å virke barnslig, men nok til at det setter et smil. Swipe-lyd er ut av scope (ingen audio-API), men visuell feedback skal kompensere.

---

## Endringer i `SwipeStack`-komponenten

### 1. Forbedret tilt + physics

Eksisterende: `rotate(${dx / 18}deg)` — fungerer men er litt flat.

Ny: 
- Kombiner `dx` og `dy` for mer naturlig bevegelse:
  ```ts
  const rot = dx / 15; // litt mer responsiv rotasjon
  const liftY = Math.abs(dx) > 30 ? -8 : 0; // kortet løfter seg litt ved drag
  transform: `translate(${dx}px, ${dy + liftY}px) rotate(${rot}deg)`
  ```
- Box-shadow intensiveres ved drag (mer dybde):
  ```ts
  boxShadow: dragging 
    ? `0 28px 80px rgba(0,0,0,0.65), 0 0 0 1px ${Math.abs(dx) > 40 ? (dx > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)') : T.border}`
    : T.shadow
  ```

### 2. Bakgrunnsglow ved swipe-retning

Endre kort-bakgrunnen progressivt basert på `dx`:
```ts
const greenGlow = Math.min(1, Math.max(0, dx / 120)); // 0→1 mot høyre
const redGlow = Math.min(1, Math.max(0, -dx / 120));  // 0→1 mot venstre

background: `radial-gradient(ellipse at ${dx > 0 ? '80%' : '20%'} 50%, 
  rgba(${dx > 0 ? '52,211,153' : '248,113,113'}, ${Math.max(greenGlow, redGlow) * 0.18}) 0%, 
  ${T.card} 60%)`
```

### 3. JA/NEI badge forbedring

Eksisterende badges er allerede gode. Forbedringer:
- Øk badge-størrelse litt: `fontSize: F.size.md`, `padding: '6px 14px'`
- Legg til backdrop-blur på badge: `backdropFilter: 'blur(4px)'`
- Badge for NEI (venstre): tilsvarende til venstre øverst ✓ (eksisterer)
- Badge for JA (høyre): tilsvarende til høyre øverst ✓ (eksisterer)
- Legg til en liten puls-animasjon på badge når opacity > 0.7:
  ```css
  @keyframes badgePulse {
    0%, 100% { transform: rotate(-14deg) scale(1); }
    50% { transform: rotate(-14deg) scale(1.08); }
  }
  ```
  Appliser kun når opacity > 0.7 (sett `animation: none` ellers).

### 4. Kortstack-bakgrunn forbedring

Eksisterende: 2-3 bakgrunnskort, `opacity: 0.55`, `scale` steppet.

Forbedring:
- Legg til `blur(1px)` på andre bakgrunnskort: `filter: 'blur(1px)'`
- Sett `opacity: 0.45` (litt mer nedtonet) og `scale: 0.96` (litt tydeligere stacking)
- Gi bakgrunnskortene en liten `box-shadow: 0 4px 20px rgba(0,0,0,0.3)` for dybde

### 5. Swipe-commit animasjon

Eksisterende: kortet flyger rett ut av skjermen.

Forbedring:
- Legg til `scale(1.05)` på `commitSwipe` før utkast:
  ```ts
  function commitSwipe(val: number) {
    if (!top || animating) return;
    setAnimating(true);
    // Liten "pop" opp før det flyger ut
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
  ```
- Transition på det animerende kortet: `transform ${M.commit}ms cubic-bezier(0.4, 0, 0.2, 1)`

### 6. Progress-bar forbedring

Eksisterende: enkel tekst-teller.

Ny: legg til en visuell progress-bar under kortstakken:
- Horisontal bar, 100% bredde, `height: 3px`, bakgrunn `T.borderSoft`
- Fylt del: gradient `T.gold → T.teal`, bredde = `(swipeCount / totalCards) * 100%`
- Transition: `width 300ms ease`
- Milestones: ved 10, 20, 30 swipes vises en liten "✓"-markør over baren (absolutt posisjonert)

```ts
// Vis "Bra! Du kan søke nå 🎯" ved swipeCount === MIN_SWIPES
// Vis som en liten toast (samme toast-system fra TS1)
```

### 7. Tomme-ikoner for JA/NEI knapper

Erstatt plain "JA" / "NEI" tekst-knappene med emojiknapper som er mer indbydende:
```
[✗ Nei]   [✓ Ja]   ← disse er knappene under kortet
```
Men behold tastatur-piler og swipe — bare knapp-utseendet endres.

---

## i18n-strenger (legg til / oppdater)
```ts
swipeMilestone: {
  no: 'Bra! Du kan søke nå 🎯',
  en: 'Nice! You can search now 🎯',
  sv: 'Bra! Du kan söka nu 🎯',
},
```

---

## CSS @keyframes (legg til i `globalCss`)
```css
@keyframes badgePulse {
  0%, 100% { transform: rotate(-14deg) scale(1); }
  50% { transform: rotate(-14deg) scale(1.08); }
}
@keyframes badgePulseRight {
  0%, 100% { transform: rotate(14deg) scale(1); }
  50% { transform: rotate(14deg) scale(1.08); }
}
@keyframes cardPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}
```

---

## Tekniske krav
- Alle endringer er innenfor eksisterende `SwipeStack`-komponent (og evt. `SwipeDeckCard` fjernes da `SwipeStack` tar over alt)
- Ingen nye avhengigheter
- Respekter `prefers-reduced-motion` — deaktiver alle tilleggsanimasjoner, behold kun basis-swipe
- TypeScript strict

## Ikke gjør
- Ikke bytt ut swipe-logikken (pointerEvents, threshold, commitSwipe) — kun visuell polish
- Ikke legg til lyd
- Ikke legg til haptic feedback (Web Vibration API) — for påtrengende
- Ikke lag Tinder-klon-estetikk — behold Travel-Swish sin mørke, premium identitet
