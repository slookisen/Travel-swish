# COWORK TS10: Recommendations Quality — Category Filter, Match Score, Limit

## Context
Files:
- `src/App.tsx` — frontend, calls `/recs/web` with `{ mode, destination, limit: 20 }`
- `backend/app/web_recs.py` — recommendation ranking pipeline
- `backend/app/query_gen.py` — generates search queries from prefs
- `backend/app/main.py` — `/recs/web` endpoint

## Problems to fix

### Problem 1: Wrong category results (restaurants in experiences, and vice versa)
The backend's `_infer_category()` in `web_recs.py` uses keyword heuristics to assign categories. But results for "experiences" mode still include restaurants, cafes, and bars.

**Fix in `web_recs.py`:**
Add a hard category filter after scoring:
```python
EXPERIENCE_EXCLUDE = {"restaurant", "restaurants", "cafe", "coffee", "brunch", "bbq", "streetfood", "fine"}
RESTAURANT_EXCLUDE = {"culture", "nature", "nightlife"}  # keep nightlife in recs only

def apply_mode_filter(items: list[dict], mode: str) -> list[dict]:
    if mode == "experiences":
        return [i for i in items if i.get("cat") not in EXPERIENCE_EXCLUDE]
    elif mode == "restaurants":
        return [i for i in items if i.get("cat") not in RESTAURANT_EXCLUDE]
    return items
```
Apply this filter after scoring, before `diversify_web()`.

Also: update `generate_queries()` in `query_gen.py` to include mode in the query strings:
- For experiences: append `"things to do"`, `"activities"`, `"experiences"` to search queries. Explicitly exclude `"restaurant"` from experience queries.
- For restaurants: append `"restaurant"`, `"where to eat"`, `"best food"` — and exclude `"activities"`, `"museum"`, `"hiking"`.

### Problem 2: Limit should be max 10 results shown, not 20
**Fix in `src/App.tsx`:**
- Change `limit: 20` in the `/recs/web` request body to `limit: 10`
- Also cap the displayed items: `const displayItems = items.slice(0, 10)` before rendering the results list

**Fix in `backend/app/main.py`:**
- The `/recs/web` endpoint already validates `limit = max(1, min(50, req.limit))` — no change needed there.

### Problem 3: Match % is not meaningful — must reflect actual user prefs
Currently `match` scores from the backend are based on simple keyword overlap between Brave results and preference facets, but it's not calibrated. A 95% match doesn't feel earned.

**Fix in `web_recs.py` — recalibrate the score:**
The current `score_item()` function returns a raw score. Map it to a 0–100 range that:
- Only shows ≥50% if there are ≥2 keyword hits from the user's top facets
- Caps at 95% (nothing is a perfect match)
- Shows a minimum of 40% for any item that passes the mode filter (it's relevant)

```python
def calibrate_match(raw_score: float, keyword_hits: int) -> int:
    """Map raw score to a believable 40-95% range."""
    if keyword_hits == 0:
        return 40
    # Soft cap: sigmoid-ish mapping, caps at 95
    base = min(raw_score, 1.0)
    calibrated = 40 + base * 55  # 40 at 0, 95 at 1.0
    return int(min(95, max(40, calibrated)))
```

**Fix in `src/App.tsx`:** Only show the `%` badge when `item.match` exists AND is ≥50. Below 50 → hide the badge (the result is still shown, just without a match label).

### Problem 4: "Why" text must reference actual swipe dimensions
The `why` field in results currently says generic things like "Matches your taste for adventure". It should reference what the user actually swiped.

**Fix in `web_recs.py`:** When building the `why` string, include the top 2 contributing dimensions from the user's actual prefs (not just keyword hits). The prefs are already available in `rank_web_recs()`.

Example output:
- `"Passer din profil: kulturell utforsker + naturnerd 🌿"` (NO)  
- `"Matches your taste: cultural explorer + nature lover 🌿"` (EN)

Use the existing `format_why()` from `algo.py` but extend it to also include the top 2 `prefs` dimensions by name.

## DoD
- [ ] Experiences mode: no restaurants/cafes in results
- [ ] Restaurant mode: no hikes/museums in results
- [ ] Max 10 results shown in frontend
- [ ] Match % is believable (40–95 range, calibrated to keyword hits)
- [ ] Match badge hidden when < 50%
- [ ] "Why" text references actual user swipe dimensions
- [ ] Backend tests still pass: `pytest backend/`
- [ ] `npm run build` passes
