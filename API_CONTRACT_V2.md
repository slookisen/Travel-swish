# Travel-Swish API Contract v2

> **Version:** 0.1.0  
> **Last updated:** 2026-03-15  
> **Status:** Development — no auth, no rate limiting yet

---

## Base URL & Versioning

| Environment | Base URL |
|---|---|
| Local dev | `http://127.0.0.1:8000` |

No URL-based versioning yet. All endpoints live at the root (`/`).  
When we version, plan is `/v2/…` prefix or header-based negotiation.

CORS is configured for local Vite dev server (`localhost:5173`, `localhost:8090`).

---

## Endpoints

### `GET /health`

Health check. Always returns 200 if the server is up.

**Response** `200 OK`

```json
{
  "ok": true,
  "service": "travel-swish-backend"
}
```

**Schema:** `Health`

| Field | Type | Description |
|---|---|---|
| `ok` | `bool` | Always `true` |
| `service` | `string` | Service identifier |

---

### `POST /events`

Ingest a user interaction event (swipe, tap, view, etc.).

**Side effect:** If the event references a `card_id` and looks like a swipe (like/dislike), user preferences are **automatically updated** via the pref_stats accumulator. No separate `/prefs` call needed for swipe-driven learning.

#### Swipe detection logic

The backend detects swipe direction from (in priority order):
1. `payload.dir` — numeric, `≥ 0` = like, `< 0` = dislike
2. `payload.liked` — boolean
3. Event `name` heuristic — matches against `like|right|swipe_right` or `nope|dislike|left|swipe_left`

Swipe weights: **like = +1.0**, **dislike = −0.3** (asymmetric to avoid rapid preference collapse from dislikes).

Preference update: for each facet in the card's `delta` (or `dims`) object, the contribution `weight × facet_value` is accumulated in `pref_stats`, then the full prefs vector is recomputed as `clamp(num/den, -1, 1)`.

**Request body** (`EventIn`)

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | ✅ | User identifier |
| `session_id` | `string` | ✅ | Session identifier |
| `ts` | `int` | ✅ | Unix timestamp (seconds) |
| `name` | `string` | ✅ | Event name (e.g. `swipe_right`, `view`, `tap`) |
| `mode` | `string` | ✅ | Game/experience mode (e.g. `food`, `activities`) |
| `destination` | `string` | ❌ | Destination name (default: `""`) |
| `card_id` | `string \| null` | ❌ | Card that triggered the event |
| `payload` | `object` | ❌ | Arbitrary event data (default: `{}`) |

**Example request:**

```json
{
  "user_id": "u-abc123",
  "session_id": "sess-001",
  "ts": 1742043600,
  "name": "swipe_right",
  "mode": "food",
  "destination": "Bangkok",
  "card_id": "card-thai-street",
  "payload": { "dir": 1 }
}
```

**Response** `200 OK`

```json
{
  "ok": true,
  "id": "e7b2c1d4-...",
  "prefs_updated": true
}
```

| Field | Type | Description |
|---|---|---|
| `ok` | `bool` | Success flag |
| `id` | `string` | Generated event UUID |
| `prefs_updated` | `bool` | Whether prefs were auto-updated from this swipe |

---

### `GET /events`

List recent events with optional filters. Results ordered by `ts` descending.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | ❌ | Filter by user |
| `session_id` | `string` | ❌ | Filter by session |
| `mode` | `string` | ❌ | Filter by mode |
| `destination` | `string` | ❌ | Filter by destination (case-insensitive) |
| `limit` | `int` | ❌ | Max results, 1–200 (default: `50`) |

**Example:** `GET /events?user_id=u-abc123&mode=food&limit=10`

**Response** `200 OK` (`EventsResponse`)

```json
{
  "ok": true,
  "items": [
    {
      "id": "e7b2c1d4-...",
      "user_id": "u-abc123",
      "session_id": "sess-001",
      "ts": 1742043600,
      "name": "swipe_right",
      "mode": "food",
      "destination": "Bangkok",
      "card_id": "card-thai-street",
      "payload": { "dir": 1 }
    }
  ]
}
```

**Schema:** `EventOut`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Event UUID |
| `user_id` | `string` | User identifier |
| `session_id` | `string` | Session identifier |
| `ts` | `int` | Unix timestamp |
| `name` | `string` | Event name |
| `mode` | `string` | Mode |
| `destination` | `string` | Destination |
| `card_id` | `string \| null` | Associated card |
| `payload` | `object` | Event data |

---

### `GET /prefs`

Get computed preference weights for a user+mode.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | ✅ | User identifier |
| `mode` | `string` | ✅ | Mode |

**Example:** `GET /prefs?user_id=u-abc123&mode=food`

**Response** `200 OK`

```json
{
  "ok": true,
  "prefs": {
    "spicy": 0.72,
    "street_food": 0.45,
    "fine_dining": -0.15
  },
  "updated_ts": 1742043600
}
```

Returns `{"ok": true, "prefs": {}, "updated_ts": 0}` if no prefs exist yet.

---

### `POST /prefs`

Directly set/overwrite preference weights for a user+mode. Useful for manual overrides or importing saved prefs.

**Request body** (`PrefsUpsert`)

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | ✅ | User identifier |
| `mode` | `string` | ✅ | Mode |
| `prefs` | `object` | ✅ | Facet → weight map (e.g. `{"spicy": 0.8}`) |
| `updated_ts` | `int` | ✅ | Unix timestamp for this update |

**Example request:**

```json
{
  "user_id": "u-abc123",
  "mode": "food",
  "prefs": { "spicy": 0.8, "street_food": 0.6 },
  "updated_ts": 1742043600
}
```

**Response** `200 OK`

```json
{
  "ok": true
}
```

> ⚠️ **Note:** This overwrites the `prefs` row directly. It does **not** update `pref_stats`. If the user continues swiping after a manual override, `pref_stats` may recompute and overwrite these values.

---

### `GET /cards`

List content cards for a given mode.

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `mode` | `string` | ✅ | Mode |
| `limit` | `int` | ❌ | Max results (default: `200`) |

**Example:** `GET /cards?mode=food`

**Response** `200 OK` (`CardsResponse`)

```json
{
  "ok": true,
  "items": [
    {
      "id": "card-thai-street",
      "mode": "food",
      "card": {
        "title": "Thai Street Food",
        "image": "https://...",
        "delta": { "spicy": 0.9, "street_food": 1.0 }
      },
      "updated_ts": 1742000000
    }
  ]
}
```

**Schema:** `Card`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Card identifier |
| `mode` | `string` | Mode |
| `card` | `object` | Full card JSON (includes `delta`/`dims` for facet weights) |
| `updated_ts` | `int` | Last update timestamp |

---

### `GET /taxonomy`

Get the taxonomy definition (facet categories, labels, metadata).

**Response** `200 OK` (`TaxonomyResponse`)

```json
{
  "ok": true,
  "taxonomy": {
    "food": {
      "facets": ["spicy", "street_food", "fine_dining", "local", "fusion"],
      "labels": { "spicy": "Spicy Food", "street_food": "Street Food" }
    }
  },
  "updated_ts": 1742000000
}
```

Returns `{"ok": true, "taxonomy": {}, "updated_ts": 0}` if no taxonomy is seeded.

---

### `GET /search/brave`

Server-side **Brave Web Search** proxy. Uses a server-side API key (no key is exposed to the browser).

**API key env (first one found wins):**
- `BRAVE_SEARCH_API_KEY` (preferred)
- `BRAVE_API_KEY`
- `OPENCLAW_BRAVE_API_KEY`
- `TS_BRAVE_API_KEY` (Travel‑Swish fallback)

**Query parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `q` | `string` | ✅ | Search query |
| `count` | `int` | ❌ | Results count, 1–20 (default: `10`) |
| `country` | `string` | ❌ | Brave `country` param (optional) |
| `search_lang` | `string` | ❌ | Brave `search_lang` param (optional) |
| `safesearch` | `string` | ❌ | `moderate` (default), `strict`, `off` |
| `freshness` | `string` | ❌ | Brave `freshness` param (optional) |

**Response** `200 OK` (`WebSearchResponse`)

```json
{
  "ok": true,
  "q": "best street food bangkok",
  "provider": "brave",
  "cached": false,
  "items": [
    {
      "id": "brave:5a9f3c9d1b4d2e11",
      "name": "10 Best Street Food Spots in Bangkok",
      "url": "https://example.com/bangkok-street-food",
      "cat": "web",
      "why": "Brave web search result (rank 1)",
      "match": 0,
      "source": "brave",
      "snippet": "From Chinatown to Victory Monument..."
    }
  ]
}
```

**Normalized item shape:** `{id,name,url,cat,why,match,source,snippet}` (RecItem-like + `source` + `snippet`).

**Reliability (baseline):**
- Timeouts + retries on transient errors (429/5xx)
- Minimal in-process TTL cache (~5 min) to avoid hammering

---

### `POST /recs`

Get personalized recommendations for a destination. Uses dot-product scoring with category diversity and facet-level explainability.

**Scoring algorithm (v1-diverse):**
1. For each POI, compute `score = Σ(pref_weight × tag_value)` across all matching facets
2. Normalize to 0–100: `match = clamp(50 + score × 50, 0, 100)`
3. Sort by match descending
4. Apply **category diversity**: round-robin pick across `cat` values so no single category dominates the result list

**Explainability:** Each result includes a `why` field listing the top 5 contributing facets with direction (+/−) and magnitude.

**Request body** (`RecsRequest`)

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | `string` | ✅ | User identifier |
| `mode` | `string` | ✅ | Mode |
| `destination` | `string` | ✅ | Destination (case-insensitive match) |
| `limit` | `int` | ❌ | Max results, 1–200 (default: `20`) |

**Example request:**

```json
{
  "user_id": "u-abc123",
  "mode": "food",
  "destination": "Bangkok",
  "limit": 10
}
```

**Response** `200 OK` (`RecsResponse`)

```json
{
  "ok": true,
  "items": [
    {
      "id": "poi-som-tam",
      "name": "Som Tam Alley",
      "match": 82.5,
      "why": "Top factors: spicy (+0.65), street_food (+0.45), local (+0.12)",
      "url": "https://...",
      "cat": "street_food"
    },
    {
      "id": "poi-gaggan",
      "name": "Gaggan Anand",
      "match": 71.0,
      "why": "Top factors: fine_dining (+0.40), fusion (+0.30), spicy (+0.20)",
      "url": "https://...",
      "cat": "fine_dining"
    }
  ],
  "model_version": "v1-diverse"
}
```

**Schema:** `RecItem`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | POI identifier |
| `name` | `string` | Display name |
| `match` | `float` | Match score 0–100 |
| `why` | `string` | Human-readable explanation |
| `url` | `string` | Link to POI |
| `cat` | `string` | Category |

**Error** `400` — if `destination` is empty.

---

## Error Handling

Standard HTTP status codes. Error responses follow FastAPI's default format:

```json
{
  "detail": "destination required"
}
```

| Code | When |
|---|---|
| `200` | Success |
| `400` | Validation error or missing required field |
| `422` | Pydantic validation failure (auto-generated by FastAPI) |
| `500` | Unexpected server error |

FastAPI 422 responses include field-level details:

```json
{
  "detail": [
    {
      "loc": ["body", "user_id"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Authentication

**Current:** None. All endpoints are open.

**Planned:** Token-based auth (likely JWT or simple API key). The `user_id` field in requests will be validated against the authenticated identity.

---

## Rate Limiting

**Current:** None.

**Planned:** Per-user rate limiting on write endpoints (`POST /events`, `POST /prefs`, `POST /recs`).

---

## Database Schema Overview

SQLite with `PRAGMA foreign_keys = ON`. DB path configurable via `TS_DB_PATH` env var (default: `backend/data/travel_swish.db`).

### Tables

| Table | PK | Description |
|---|---|---|
| `users` | `id` | User accounts |
| `events` | `id` | Interaction event log |
| `prefs` | `(user_id, mode)` | Computed preference weights |
| `cards` | `id` | Swipeable content cards with facet deltas |
| `taxonomy` | `id` | Facet taxonomy definition |
| `pref_stats` | `(user_id, mode, facet)` | Running numerator/denominator accumulators per facet |
| `pois` | `id` | Points of interest for recommendations |

### Key relationships

- `events.user_id → users.id`
- `prefs.user_id → users.id`
- `pref_stats.user_id → users.id`

### Indexes

- `idx_events_user_ts` — `events(user_id, ts)`
- `idx_events_session_ts` — `events(session_id, ts)`
- `idx_cards_mode_id` — `cards(mode, id)`
- `idx_pois_mode_dest` — `pois(mode, lower(destination))`

See [`backend/migrations/001_initial.sql`](backend/migrations/001_initial.sql) for full CREATE TABLE statements.
