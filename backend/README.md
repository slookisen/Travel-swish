# Travel Swipe Backend (V0.6 test foundation)

Goal: move the preference engine + destination-aware recommendations out of the browser.

## Stack (initial)
- Python + **FastAPI**
- SQLite for local dev (easy to ship, easy migrations)

### Windows note (Python 3.14)
On this machine Python is 3.14. For now we run the backend in a **Python 3.12** venv to avoid native build friction.
(With 3.14, `pydantic-core` may need to compile, which can be blocked by policy.)

## Run (local)
```powershell
cd C:\Users\dafre\Travel-Swish\backend
# Use Python 3.12 for now (avoids native build friction on 3.14)
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open:
- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

## CORS (GitHub Pages / public frontend)
By default the API only allows local dev origins (Vite dev server + the local dashboard).

To allow a GitHub Pages frontend, set a comma-separated allowlist:

```powershell
$env:TS_CORS_ORIGINS = "https://<your-user>.github.io"
```

Notes:
- Origin is **scheme + host + port** (no path). For Pages it’s typically `https://<user>.github.io`.
- If you include `*`, the backend will automatically set `allow_credentials=False` (required by CORS rules).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/events` | Ingest a single event |
| GET | `/events` | List recent events (filters: `user_id`, `session_id`, `mode`, `destination`, `limit` 1‑200) |
| GET | `/prefs` | Get user prefs for a mode |
| POST | `/prefs` | Upsert user prefs |
| POST | `/sessions` | Upsert a profiling/recommendation session |
| POST | `/feedback` | Store explicit feedback on a result |
| GET | `/cards` | List cards by mode |
| GET | `/taxonomy` | Get taxonomy |
| POST | `/recs` | Get ranked recommendations (local POIs DB) |
| POST | `/recs/web` | Profilrangerte treff fra Google Places eller Brave; støtter hotell, turer, fritekst og engangs-prefetch |
| GET | `/recs/prefetch/{token}` | Status for et kortlivet, forhåndsklargjort utvalg |
| GET | `/search/brave` | Brave web search proxy (server-side key) |

## Database lifecycle

`app.db.init_db()` applies numbered SQL files from `backend/migrations/` once and records them in `schema_migrations`. SQLite uses foreign keys, a five-second busy timeout, WAL journaling and `PRAGMA optimize`. Migration 002 adds sessions, recommendation exposure runs and result feedback so ranking improvements can be evaluated from explicit signals instead of clicks alone.

## Providers, prefetch og lagring

Google Places brukes til strukturerte steder og hotell. `websiteUri` og `googleMapsUri` returneres separat slik at klienten kan vise både offisiell hjemmeside og kart. Places-innhold mellomlagres eller forhåndshentes ikke.

Brave brukes til vanlig weboppdagelse, organiserte turer og fritekstsøk. Etter et vellykket uttrekk reserverer `/recs/web` et tilfeldig, signaturbundet token og lager neste Brave-utvalg som en FastAPI-bakgrunnsoppgave. Utvalget ligger kun i prosessminnet, utløper etter tre minutter og slettes ved første vellykkede bruk. Dette gir raskere «Nytt utvalg» uten en vedvarende kopi av leverandørdata.

Ved flere serverprosesser må den flyktige køen senere flyttes til en delt TTL-tjeneste, for eksempel Redis, uten permanent lagring av leverandørresultater.

## Brave Search (server-side)

Env (first one found wins):
- `BRAVE_SEARCH_API_KEY` (preferred)
- `BRAVE_API_KEY`
- `OPENCLAW_BRAVE_API_KEY`
- `TS_BRAVE_API_KEY` (Travel‑Swish fallback)

Cost control:
- **Rate limit** (process-local, fixed-window):
  - `TS_BRAVE_RL_WINDOW_S` (default 60)
  - `TS_BRAVE_RL_MAX_CALLS` (default 25)
- **Caching**
  - Flyktig in-memory TTL-cache (nullstilles ved omstart).
  - SQLite-cache er av som standard. Den aktiveres bare med `TS_BRAVE_STORAGE_RIGHTS=1` når valgt avtale uttrykkelig tillater lagring:
    - `TS_BRAVE_CACHE_TTL_S` (default 300)
    - `TS_WEB_RECS_CACHE_TTL_S` (default 120)
    - `TS_BRAVE_CACHE_MAX_ROWS` (default 1500)
    - `TS_WEB_RECS_CACHE_MAX_ROWS` (default 800)
    - `TS_CACHE_MAX_ROWS` (global cap, default 2000)

Quick smoke (after starting uvicorn):

```powershell
# 1) Sanity: Python syntax compile
py -3.12 -m compileall -q .\app

# 2) Brave search endpoint
curl "http://127.0.0.1:8000/search/brave?q=best%20coffee%20oslo&count=3"
```

## Swipe → prefs (automatic)
When you `POST /events` with:
- `card_id` present, and
- the event indicates swipe direction via:
  - `payload.dir` (>=0 like, <0 dislike), or
  - `payload.liked` (boolean), or
  - `name` matching like/right vs nope/left

…the backend will update `pref_stats` and recompute normalized weights into `prefs` for that `user_id` + `mode`.

Weights:
- Like: `+1.0`
- Dislike: `-0.3`
- Normalization: per facet/dim `weight = clamp(num / den, -1..1)` where `den` accumulates `abs(delta)`.

## `/recs` scoring, diversity & explainability (v1-diverse)

**Scoring:** For each POI, compute the dot-product of the user's learned pref weights and the POI's tag values. The raw score is normalized into a 0–100 `match` value via `50 + score × 50` (clamped).

**Explainability:** The `why` field now lists the top 5 contributing facets with their signed contribution (e.g. `"Top factors: adventure (+0.42), culture (+0.31), nightlife (−0.18)"`). When no prefs exist yet the string says "Bootstrap match (no prefs yet)".

**Diversity:** After scoring and sorting, a round-robin diversifier interleaves results across categories (`cat`) so the final list doesn't cluster items from a single category. Within each category, score order is preserved.

## Reset / reseed DB

A small CLI script lives in `scripts/reset_db.py`.  
Run it **from the `backend/` directory** with the 3.12 venv active:

```powershell
cd C:\Users\dafre\Travel-Swish\backend
.\.venv312\Scripts\Activate.ps1          # or whichever venv you use

# 1. Dry-run – just print DB path & status (safe, changes nothing)
py -3.12 -m scripts.reset_db

# 2. Re-seed empty tables (additive, won't touch existing data)
py -3.12 -m scripts.reset_db --reseed

# 3. Full reset – DELETE the DB, recreate tables, seed demo data
py -3.12 -m scripts.reset_db --force
```

> **Safety:** without `--force` or `--reseed`, the script only prints info and exits.

## Auth-lite + rate limiting (public demo)
This backend is used by a public GitHub Pages frontend, so we add a pragmatic abuse guard:

- Protected endpoints require **either**:
  - an allowed **Origin** header (same allowlist as CORS), **or**
  - an API key header (for scripts)
- Protected endpoints also get a basic **process-local fixed-window rate limit**.

This is **not real authentication**. It’s just a speedbump to reduce random abuse.

Env:
- `TS_AUTH_MODE` (default `origin_or_key`, set to `off` to disable)
- `TS_API_KEY` (optional; if set, allow header access for non-browser clients)
- `TS_AUTH_HEADER` (default `X-TS-API-Key`)
- `TS_API_RL_WINDOW_S` (default 60)
- `TS_API_RL_MAX_COST` (default 120)

Protected endpoints:
- `POST /sessions` (cost 1)
- `POST /feedback` (cost 1)
- `POST /events` (cost 1)
- `POST /prefs` (cost 2)
- `POST /recs` (cost 2)
- `POST /recs/web` (cost 8)
- `GET /search/brave` (cost 4)

Notes:
- If your CORS origins include `*`, origin checks are meaningless; set `TS_API_KEY`.
- Rate limits are in-process only; multi-worker deploys need shared storage (Redis/etc.).
