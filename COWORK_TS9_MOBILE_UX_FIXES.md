# COWORK TS9: Mobile UX Fixes — Button Placement, Layout, Tone

## Context
File: `src/App.tsx` (single-file React/Vite app)
Design system: `src/ui.ts`

These are mobile UX fixes based on real phone testing. The app works but has layout issues on small screens.

## Fixes

### Fix 1: "Finn opplevelser"-knappen vises ikke uten scrolling
The CTA button to get recommendations ("Finn opplevelser" / "Find experiences") appears below the fold on mobile after swiping because the layout doesn't account for small viewport heights.

**Solution:**
- In the swipe page (`page === 'swipe'`), move the CTA button **above** the card area, not below.
- Show it as a sticky-ish bar at the top of the swipe page, below the ModeTabBar and destination display.
- Button should be disabled (and styled dimmed) until `totalSwipes >= MIN_SWIPES`.
- When disabled show remaining swipes: `Sveip ${remaining} til` / `Swipe ${remaining} more`.
- When enabled: bright gradient pill button, full-width, `borderRadius: R.pill`.

Layout order for swipe page (top → bottom):
```
[ModeTabBar]
[Destination display + settings button]
[CTA button — disabled/enabled]
[SwipeCard — takes remaining space]
[Swipe hint (← PASS  ♥ LOVE →)]
```

### Fix 2: Fyll tomrom — appen skal ta opp hele skjermen
The app currently has lots of dead space on mobile. Make it feel native/app-like:
- Root container: `minHeight: '100dvh'` (dynamic viewport height), `display: flex; flex-direction: column`
- The swipe card area should `flex: 1` to fill available space
- No large blank areas below cards or buttons

### Fix 3: Tone — profesjonell men morsom og varm
Replace stiff/flat labels with personality. Examples:
- Landing: `"Swipe → plan → book"` stays, but subheadline changes to something like:
  - NO: `"Fortell oss hva du elsker — vi finner resten 🗺️"`
  - EN: `"Tell us what you love — we'll find the rest 🗺️"`
- Swipe page hint (when disabled button): instead of just "Swipe X more":
  - NO: `"${remaining} kort igjen før magien skjer ✨"`
  - EN: `"${remaining} more swipes until the magic happens ✨"`
- Results page headline: instead of `"Opplevelser: Oslo"`:
  - NO: `"Her er dine treff i ${dest} 🎯"`
  - EN: `"Here's what we found in ${dest} for you 🎯"`
- Empty results: instead of generic "no results":
  - NO: `"Hmm, vi fant ikke noe akkurat nå. Prøv igjen?"`
  - EN: `"Hmm, nothing came up just now. Want to try again?"`

### Fix 4: Consistent padding and spacing on mobile
- All page containers: use `padding: S.page` (already defined) but also add `paddingBottom: 32px` to avoid content hiding behind mobile browser chrome
- Buttons: minimum touch target 48px height
- All full-width buttons: `width: '100%'`, `minHeight: 48`

## DoD
- [ ] "Finn opplevelser" button visible without scrolling on iPhone SE / small phones
- [ ] App fills full screen height, no dead space
- [ ] Tone changes applied (landing, swipe, results pages)
- [ ] All interactive elements have ≥48px touch target height
- [ ] `npm run build` passes
