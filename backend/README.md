# Travel‑Swish Backend (v2 foundation)

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
uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Open:
- http://127.0.0.1:8787/health
- http://127.0.0.1:8787/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/events` | Ingest a single event |
| GET | `/events` | List recent events (filters: `user_id`, `session_id`, `mode`, `destination`, `limit` 1‑200) |
| GET | `/prefs` | Get user prefs for a mode |
| POST | `/prefs` | Upsert user prefs |
| GET | `/cards` | List cards by mode |
| GET | `/taxonomy` | Get taxonomy |
| POST | `/recs` | Get ranked recommendations |

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

## Notes
- This is **local-only** initially.
- No real auth yet. Before any public deployment we add auth + rate limits.
