# COWORK TS8: Swipe Card — Full-Height Tinder-Style Cards

## Context
File: `src/App.tsx` (single-file React/Vite app)
Design system: `src/ui.ts` (T = colors, S = spacing, R = radii, F = fonts, M = motion)

The current SwipeCard container is `height: 330px` with back-cards stacked behind the top card with blur + scale effects. The back cards are a visual distraction — they peek through but represent completely different cards from what will actually appear next.

## Goal
Make swiping feel like Tinder: one tall card, full focus, no ghost cards peeking behind.

## Deliverables

### 1. Remove back-card stack
- Delete the `{rest.slice().reverse().map(...)}` block that renders stacked back-cards.
- Keep only the top card render block.

### 2. Make the card tall and portrait-format
- Change the container from `height: 330` to a dynamic height: `min(72vh, 520px)` — fills the screen on mobile, caps on desktop.
- Card should be `width: 100%` within a `maxWidth: 400px` centered container.
- The card itself should flex-column with content filling the height naturally.

### 3. Card content layout (tall card)
The card has: emoji + question + description. In the taller format, spread them out vertically:
```
[emoji — large, centered top]
[question — large bold, center-aligned]
[description — smaller, dim color, center-aligned]
[spacer that fills remaining height]
[YES/NO badge only when dragging — absolute positioned]
```
- Emoji: `font-size: 4rem`, centered, top padding ~24px
- Question: `font-size: 1.25rem`, bold, `text-align: center`, margin auto
- Description: `font-size: 0.95rem`, `color: T.dim`, centered, max-width 280px
- The card should have `padding: 32px 24px` and `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px`

### 4. Swipe feel
Keep existing pointer drag logic as-is. Keep rotation (`dx / 15`), glow effect on drag, and commit animation. These are already good.

### 5. Swipe hint below card
Below the card, show a small hint bar:
```
← PASS     ♥ LOVE →
```
Style: `display: flex; justify-content: space-between`, `color: T.dim`, `font-size: 0.8rem`, `maxWidth: 400px`, `margin: 8px auto 0`

Remove this hint after the user has made ≥5 swipes in this session (use existing `totalSwipes` state).

### 6. Progress indicator
Show a small dot-row or thin progress bar above or below the card showing how many of the 20 minimum swipes have been completed. E.g.:
```
██████░░░░░░░░░░░░░░  6 / 20
```
Style: thin bar (height 4px), `borderRadius: 4px`, background `T.borderSoft`, fill `linear-gradient(T.gold, T.teal)`, `maxWidth: 400px margin: auto`, show only when `totalSwipes < MIN_SWIPES`.

## DoD
- [ ] Back-card stack removed — only one card visible at a time
- [ ] Card height fills most of the viewport on mobile (min 72vh, max 520px)
- [ ] Content vertically centered and spaced nicely
- [ ] Swipe hint shows for first 5 swipes, then disappears
- [ ] Progress bar shows until 20 swipes reached
- [ ] No regressions: drag, glow, badges, commit animation all still work
- [ ] Build passes: `npm run build`
