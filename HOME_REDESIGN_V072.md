# Travel Swipe 0.7.2 — expressive home and direct profile refinement

## Changes

- Experiences and food/drink now have their own headline, lead, search label, profile prompt, accent palette and decorative swipe-card illustration.
- Improve/build profile and find places are equal-size action cards. Both fit in the initial 375×667 mobile viewport for a returning user with a ready profile.
- No search starts when switching category. The selected category and trip survive reload; the two preference histories remain separate.
- An unlearned category explicitly asks for card answers. Its search action remains visible but disabled until ready; the profile action starts the relevant card deck. A destination is still required.
- Stronger rounded/system typography, lime/lavender and peach accents, SVG illustrations, focus indicators and reduced-motion handling. No added fonts, image services, dependencies or tracking.
- English and Norwegian are covered. Unsupported saved language codes, including Swedish, retain the existing Norwegian fallback.
- The top-level profile navigation now says “My profile” / “Profilen min”.
- Choosing more cards for an already-ready profile opens the swipe deck directly, without immediately asking to see results. The results action stays available on the swipe screen. First-time readiness guidance is retained separately for each category.

## Verification

- `npm run check`: types, 180-card audit, profile engine, production build and PWA checks pass.
- Home cases cover both languages and themes, equal action dimensions, viewport fit, keyboard controls, profile persistence, destination/readiness guards and correct search-mode request bodies. Profile building stays available during a live-search cooldown.
- Final verification: all 54 browser cases passed in one full Chromium/mobile-WebKit run. This includes 10 uninterrupted refinement answers, reload/re-entry and first-time food guidance in EN/NO. A timing-sensitive swipe-animation test now records actual browser frames rather than measuring a card after its removal timer.
- Contrast checks cover visible text in both palettes and disabled states. Desktop/mobile screenshots reviewed.
- `npm run test:pwa:offline`: built service-worker assets, theme, profile and offline navigation pass.
- Provider responses in these UI tests are mocked. The live-search service and API contract are unchanged by this design work.

## Release status

Approved by Daniel on 2026-09-09 for release through the existing GitHub Pages `main/docs` pipeline. Release build: `v0.7.2+6198636`. The existing Store PWA loads this hosted app; no new Store binary or hosting-plan change is required. Publication and real-provider smoke checks are performed after the release merge.
