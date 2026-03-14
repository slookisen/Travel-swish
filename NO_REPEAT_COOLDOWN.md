# Travel‑Swish v2 — No‑repeat + cooldown strategy (baseline)

This documents the **minimum viable** strategy to avoid repeats in the swipe deck and to avoid hammering the LLM/search endpoints.

## 1) Swipe deck: “no repeats”

### Current behavior (implemented)

- **Per mode memory:** we store `swipes` keyed by `card.id` in `localStorage` using mode-specific keys.
- **Deck rendering:** the deck is built from dataset cards **minus** IDs already present in `swipes`.
- Result: you will not see the same card twice until you **reset** that mode.

### Why this is good enough (for now)

- Deterministic and easy to explain.
- No server required.
- Works offline.

### Next upgrade (optional)

- Add a **time-based cooldown** instead of permanent “seen”:
  - Store `{ id -> lastSeenTs }`.
  - When building deck, include cards only if `now - lastSeenTs > cooldownMs`.
  - This allows “spaced repetition” without hard resets.

## 2) Results: “avoid showing the same places again”

### Current behavior (implemented)

- We maintain a **seen names** list per mode (also in `localStorage`).
- Each fetch includes an `EXCLUDE` list to the model to reduce repeats.
- Each response adds new names to the seen list.

### Limitations

- Name matching is fuzzy (different spelling / aliases can slip through).
- We currently exclude only by `name`, not a stable external ID.

### Next upgrade (optional)

- Normalize items to a stable key, e.g.:
  - `host + normalizedName + roundedLatLng`.
- Keep a `seenItems` set per destination + mode.

## 3) API cooldown / rate limiting

### Current behavior (implemented)

- If the Anthropic call returns **HTTP 429**, we read `Retry-After` (if present).
- We set a `cooldownUntil` timestamp and block additional fetches until it passes.
- User sees a countdown.

### Next upgrade (optional)

- Add a soft client-side throttle even without 429:
  - e.g. minimum 5–10 seconds between calls.
- Add exponential backoff with jitter.

## 4) Dataset-driven decks: diversity strategy (future)

The dataset now contains a simple taxonomy facet (`category`). That enables:

- Category quotas per session (e.g. ensure you see at least 1–2 cards from each category early).
- Diversity constraints (don’t show 5 food cards in a row).
- Weighted sampling (rare categories appear slightly more often until balanced).

A simple rule-based approach is enough at v2:

1. Keep a rolling window of last N categories.
2. When picking the next card, down-weight categories seen in the window.
3. Re-shuffle within those constraints.
