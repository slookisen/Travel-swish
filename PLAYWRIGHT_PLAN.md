# Travel‑Swish — Light Automation Plan (Playwright)

Scope: keep this tiny (3–6 tests). Goal is to catch black screens, base-path breaks, and core flow regressions.

## Suggested setup
- Add Playwright later when UI settles (avoid churn).
- Run against:
  - local `npm run dev`
  - built preview (`vite preview`) if you add it
  - GitHub Pages (optional, flaky depending on deploy timing)

## Minimal suite (high ROI)
1) **Loads without blank screen**
   - Open `/Travel-swish/`
   - Expect landing title text visible

2) **Home guard rails**
   - Click "Kom i gang"
   - Try start without destination → expect validation message

3) **Swipe progression**
   - Start Opplevelser with destination + dummy key
   - Click JA/NEI 10 times
   - Expect "Finn forslag" enabled after 10

4) **Results layout smoke (no assertion on AI content)**
   - If you mock the network: return a fixed JSON list
   - Expect results cards render + expandable "Hvorfor"

5) **Mode separation**
   - Swipe a few in Opplevelser
   - Switch to Restauranter
   - Verify memory keys differ (localStorage keys) or visible counters reset

## Mocking recommendation
- Don’t hit Anthropic in CI.
- Provide a local mock mode (query param `?mock=1`) or intercept request in Playwright and return a fixed payload.

