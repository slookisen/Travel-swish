# Travel Swipe V0.7 — mobile return flow and feedback learning

Date: 7 September 2026. Implementation branch: `codex/mobile-profile-v07`.
Status: local release candidate. Not pushed, merged, deployed or submitted to Microsoft Store by this work.

## What changes for the user

- Returning visitors open **Find something now**, using their saved destination and taste. Food and experiences retain separate card histories. Today's context is optional under **Adjust for today**.
- A right swipe means **Like**, just like the Yes button. The heart remains the stronger positive signal. Diagonal touch movement is more forgiving. Buttons are locked during the card throw to avoid duplicate answers.
- **Undo** reverses the most recent answer and restores that exact card. Up to 20 answers can be undone in the current visit; history is not removed on reload. The undo stack itself is session-only.
- Compact mobile cards keep the answer controls and result action visible. **Larger text** provides a scrollable reading alternative. Pinch zoom remains available. A result prompt appears once after enough varied answers, not repeatedly after dismissal.
- Initially three recommendations appear. **Show three more** reveals already-returned candidates immediately without another provider search, up to nine. Descriptions and feedback are under **More about this idea**; official website, map, save and sharing remain available.
- Slow searches can be cancelled. Errors preserve the previous results and the profile. HTTP 429 respects `Retry-After`; starter ideas are an explicit alternative, never silently labelled live. An old backend gives a visible upgrade message.
- NO and EN cover all new controls. SV remains the existing Norwegian interface fallback; this is not a new fully translated Swedish release.

## Taste model V3

The model remains transparent and rule-based, not a trained or clinically validated personality model. There is no claim that profile readiness or a match label is a probability of satisfaction.

Card contributions gradually decay toward half their original weight, with a one-year half-life for the decaying component. Conflicting dimensional signals lower the evidence indicator instead of increasing certainty solely by count. An explicit manual correction sets the selected dimension directly. Manual dimensions are the existing shared taste overrides; food and experience card histories and outcome learning remain separate.

Voluntary result feedback contributes only to safely mapped categories in the selected mode:

| Feedback | Category contribution | Other effect |
|---|---:|---|
| Tried and enjoyed | +1.80 | Stronger than interest alone |
| Good tip | +0.25 | Weak positive signal |
| Not my taste | −0.85 | Exclude the place from later searches |
| Not now | 0 | Exclude for one day at this destination |
| Visited | 0 | No assumption that a visit was enjoyable |
| Wrong/closed | 0 | Exclude the place; do not infer taste |

Outcomes do not manufacture card readiness or infer axes such as luxury from a hotel's category. A later outcome for the same place and mode replaces the prior local learning signal. Old `travel_swish_app_v3` profiles load unchanged; the optional outcome field defaults to empty. Raw swipe history stays on the device; the backend receives the computed profile when a search is requested. Failed feedback uploads remain local and are not silently claimed to be stored centrally. There is no durable offline feedback-upload queue yet.

## Search correctness and architecture

New `POST /recs/personalized` requires `current_prefs` (up to nine recognized finite facet weights in [−1, 1]). It searches with this supplied profile and stores the preferences, session and recommendation run transactionally afterwards. The frontend no longer depends on successful sequential `/sessions` and `/prefs` calls. `/recs/web` remains available for older clients.

Requests carry taste V3, destination, mode, current context, language, search kind and exclusions. Changed profile/context/language invalidates pending responses and prepared selections. Cancellation aborts the client request and ignores late responses; it does not guarantee cancellation of provider work already running on the server.

For Google Places, one geographical area is resolved before searching. Queries receive a bounding rectangle; returned coordinates are checked again. Missing coordinates or places outside the rectangle are rejected. Ambiguous or over-broad areas require a clearer destination. Provider outages are service errors, not an accusation that the user's destination is invalid. This is a viewport-based safety check, not a precise municipal polygon or proof that every similarly named destination is unambiguous. It requires live-provider validation before rollout.

Places-backed requests no longer automatically prepare a different Brave result set. The nine candidates in the current response support immediate local pagination. A genuinely new Places selection still needs a provider request. Existing short-lived Brave prefetch remains for tours/custom searches or when Places is not configured. Brave results do not have the same coordinate guarantee; broad hotel/tour search is still discovery, not verified availability, booking or eligibility matching.

The service worker now prepares the main hashed JS/CSS before activation, removes only this app's old caches, and caches legal navigation separately from the app shell. Offline startup preserves local profiles; live recommendation search still requires a connection.

## Verification

Run from the repository:

```powershell
npm run check
npx playwright install chromium webkit
npm run test:e2e -- --workers=2
npm run test:pwa:offline
cd backend
.\.venv-store\Scripts\python.exe -m pytest tests -q
```

On another machine use its configured Python virtual environment instead of `.venv-store`.

- Production build, TypeScript, 180-card audit and deterministic profile regressions.
- 28 browser cases across Chromium and mobile WebKit: saved profiles, separate modes, destination requirement, swipe/undo, small viewport, reading mode, NO/EN, atomic requests, local pagination, website URLs, sharing, feedback persistence, cooldown, cancellation and old-backend failure.
- Real touch-gesture simulation in Chromium; WebKit tests touch buttons and mobile layout. A raw-CDP-input problem reproduced on an empty page was isolated from the app, then the test used Chromium's complete touch gesture. This is not a substitute for physical iPhone testing.
- Real built-PWA offline test: hashed assets, preservation of unrelated caches, local profile retention, and offline navigation between the app and privacy page.
- 80 backend tests include migration preservation, current-profile use, reversible scoped exclusions, geographic filtering, date-line bounds, ambiguous destinations and provider outages. All provider calls in these tests are fixtures, not live searches.

## Safe rollout — backend first

1. Review this branch. Confirm the production repository/revision and actual Render service configuration; `render.yaml` alone does not prove which plan is active.
2. Take a consistent SQLite backup using the backup API or an equivalent WAL-aware procedure. Check where `TS_DB_PATH` resolves and whether it is on durable storage. Do not copy just a live `.db` file while ignoring its WAL.
3. Deploy the backend first. Startup applies migration 003 in a transaction, retaining feedback rows and extending allowed values. Check `/health` version 0.7.0, database health and the new route. Old clients remain compatible.
4. Run a small authorized live-search set: Oslo/Norway, Malaga/Spain, an explicitly disambiguated common city name, food, experiences and hotels. Check coordinates, category, official URL, warm/cold latency and errors. No live-provider quality claim is made by fixture tests.
5. Publish rebuilt `docs/` only after the backend passes. Verify `/Travel-swish/` assets return 200 and an installed PWA updates without data loss.
6. Test on a physical iPhone in Safari and standalone PWA: diagonal and edge swipes, rapid repeated input, Undo, pinch zoom, VoiceOver, larger text, result prompt and offline relaunch. Check the installed Windows app too; this work does not create a new signed Store package.
7. Observe 5–8 users and measure successful useful tips, not just swipe count. Compare recommendations against a simple non-personalized baseline before claiming improved prediction accuracy.

Rollback: revert frontend to the previous known working `docs/` while retaining the new backward-compatible backend. Do not destructively downgrade the migrated database to remove new feedback values; use a verified backup and a planned recovery if database rollback is actually necessary.

## Still needs a separate decision or later iteration

- Always-on backend, durable storage and backups: no paid plan or infrastructure change was enabled. The checked-in Render blueprint still says free and has no persistent disk; the previous cold-start observation is not fixed by UI changes.
- No new advertising analytics, account requirement, social-media import, automatic posting or cross-device profile sync.
- Real provider images, verified distance/opening hours/prices, better single-attribute profiling cards and real-world quality evaluation come next. Images require the relevant provider attribution/usage handling.
- Itinerary building and optional group-profile matching are useful next products, but not added to this first mobile-quality release. Hotel/tour search remains behind the existing secondary discovery control to keep the main experience simple.
