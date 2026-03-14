# Travel‑Swish — Smoke Test Checklist (manual)

Goal: catch regressions fast (no blank screen; base path OK; core flow works).

## Preconditions
- Use a fresh incognito/private window once (to catch localStorage edge cases).
- Make sure URL base path is correct:
  - GitHub Pages: `https://slookisen.github.io/Travel-swish/`
  - Local dev: `http://127.0.0.1:5173/Travel-swish/`

## Invariants (must hold)
1) **No blank/black screen** at any point.
2) Cannot start swiping without **destination**.
3) Cannot fetch suggestions without **API key** (demo mode).
4) Separate memory per mode (experiences vs restaurants).
5) Rate-limit handling (429) is user-friendly (cooldown + retry/backoff).

## Flow A — Landing → Home
1. Open app → Landing renders.
2. Tap **Kom i gang**.
3. Home shows:
   - Mode selector (Opplevelser/Restauranter)
   - Destination input
   - API key input (or stored key)

## Flow B — Guard rails
1. Clear destination → try Start → should block / show destination required.
2. Enter destination (e.g. `Oslo`) but no API key:
   - You can swipe
   - **Finn forslag** should remain disabled until ≥10 swipes
   - When enabled (after 10), clicking should require key (route to Home / show message)

## Flow C — Swipe (Experiences)
1. Choose **Opplevelser**.
2. Enter destination.
3. Start.
4. Swipe 10 cards using:
   - Buttons **JA/NEI**
   - Keyboard arrows (desktop)
   - Drag gesture (mobile)
5. Confirm no UI glitches:
   - Swipe stack animates offscreen
   - YES/NO badges appear while dragging

## Flow D — Results (API key path)
1. Enter a **valid API key**.
2. Click **Finn forslag**.
3. Results page:
   - Shows list of cards (Tinder-clean)
   - Each item has match pill + chips
   - "Hvorfor" is expandable
   - "Finn flere" fetches more (unless cooldown)

## Flow E — Mode switching + separate memory
1. Go back to Home.
2. Switch to **Restauranter**.
3. Start and swipe a few cards.
4. Switch back to **Opplevelser** and verify it still has its own history/memory.

## Flow F — Rate limit / cooldown (best-effort)
1. Trigger repeated fetches quickly.
2. If rate limit happens:
   - Error message is understandable
   - Cooldown timer counts down
   - Retry works after cooldown.

## Pass criteria
- All flows complete without blank screen.
- Guards behave correctly.
- Swipe stack feels stable.
- Results are readable on mobile.

