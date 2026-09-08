# V0.7.1 — dark theme and honest search errors

## User-facing changes

- Light, dark and system appearance in the header. System follows the device;
  a manual choice is saved separately from profile data. Norwegian and English
  labels are included; unsupported languages retain the existing Norwegian fallback.
- Deep blue-green surfaces, mint/lime actions, clear focus rings and readable
  secondary/disabled text. Applies to onboarding, swipe cards, profile, search,
  results, feedback, dialogs and offline privacy/support pages.
- First-paint theme initialization and theme assets in the PWA offline cache.
  Fixed double base-path expansion in the development HTML.
- Search distinguishes network failure, offline state, timeout, authentication,
  rate limit and incompatible API. It no longer presents every failure as a
  sleeping server. Existing results and local answers remain intact.

## Live-search diagnosis / deployment gate

Read-only checks on 8 September 2026 found the hosted service reports `0.6.0`,
does not expose `/recs/personalized`, and rejects the local preview's CORS
preflight. Both the newer backend route and the explicit preview origins are
needed. Prepared `render.yaml` includes only the two exact loopback preview
origins, not wildcard access. Sync the Render environment/Blueprint too.

No production redeploy or main merge was performed for this change. Approval
to risk losing server-side SQLite search/feedback history on Render Free remains
pending. Device-local profiles/saved tips are separate and are not erased by
deploying the backend. Do not silently fall back to the legacy non-atomic API.

## Verification

- `npm run check`: types, 180-card audit, profiling tests, production build, PWA assets.
- `npm run test:e2e -- --workers=2`: isolated Chromium and WebKit mobile flows;
  added theme persistence, OS changes, contrast, disabled controls and error tests.
- `npm run test:pwa:offline`: real built worker, offline profile/theme/legal pages.
- Backend `pytest tests -q`: includes exact preview CORS and API validation checks.
- Visual review of the local preview. Provider responses in automated browser
  tests are mocks; this is not a claim of end-to-end production live-search success.
