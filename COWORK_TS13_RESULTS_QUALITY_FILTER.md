# COWORK TS13: Results Quality — Filter Scam/Warning/Listicle Pages

## Context
Files:
- `backend/app/web_recs.py` — recommendation ranking + filtering pipeline
- `backend/app/query_gen.py` — generates Brave search queries

## Problem
Brave Search returns irrelevant and actively harmful results:
- "Common Tourist Scams & How to Avoid Them" 
- "19 of the World's Worst Travel Scams"
- "r/TravelHacks: What are the biggest scams..."
- Travel insurance / safety warning pages
- Generic listicle articles ("Top 10 things to do in...")

These appear because the search queries are too generic and there's no quality filter on results.

## Fixes

### Fix 1: Block known junk domains and title patterns in `web_recs.py`

After fetching Brave results, before scoring, filter out junk:

```python
# Domains that consistently return non-actionable content
BLOCKED_DOMAINS = {
    "insuremytrip.com", "worldnomads.com", "safety.com",
    "travel.state.gov", "smartraveller.gov.au", "gov.uk",
    "reddit.com",  # too generic/discussion-based
    "quora.com", "tripadvisor.com",  # review aggregators, not specific places
}

# Title patterns that indicate listicles / safety articles (case-insensitive)
BLOCKED_TITLE_PATTERNS = [
    r"scam", r"fraud", r"tourist trap", r"avoid", r"warning",
    r"worst.*travel", r"travel.*worst", r"how to stay safe",
    r"travel insurance", r"travel safety", r"dangerous",
    r"\d+\s+(things|places|ways|tips|reasons)",  # "10 things to do in..."
    r"top \d+", r"best \d+",  # "Top 10 best..."
    r"ultimate guide", r"complete guide", r"everything you need",
]

import re as _re

def _is_junk_result(item: dict) -> bool:
    domain = str(item.get("domain") or "").lower()
    if domain in BLOCKED_DOMAINS:
        return True
    title = str(item.get("name") or "").lower()
    snippet = str(item.get("snippet") or "").lower()
    combined = title + " " + snippet
    for pattern in BLOCKED_TITLE_PATTERNS:
        if _re.search(pattern, combined, _re.IGNORECASE):
            return True
    return False
```

Apply this filter in `rank_web_recs()` after fetching, before scoring:
```python
raw_items = [item for item in raw_items if not _is_junk_result(item)]
```

### Fix 2: Better search queries in `query_gen.py`

The queries must be specific enough to return actual places, not articles about travel.

Update `generate_queries()` to:
- For **experiences mode**: always append `"things to do"` OR specific activity terms. Add `-scam -warning -avoid` to queries using Brave's negative search syntax (if supported) or just make queries more specific.
- Preferred query format: `"{activity type} in {destination}"` not just `"{destination} experiences"`

Examples of GOOD queries:
- `"hiking trails Oslo"`
- `"art galleries Oslo"`
- `"local markets Oslo"`
- `"live music venues Oslo"`

Examples of BAD queries (avoid):
- `"Oslo experiences"` → too broad, returns articles
- `"things to do Oslo"` → returns listicles
- `"Oslo travel"` → returns everything

Concretely: generate queries from the user's TOP preference dimensions, like:
- If user likes `cul` (cultural): `"museums {dest}"`, `"galleries {dest}"`, `"historic sites {dest}"`
- If user likes `nat` (nature): `"hiking {dest}"`, `"parks {dest}"`, `"nature trails {dest}"`
- If user likes `food`: `"local food {dest}"`, `"food market {dest}"`, `"street food {dest}"`
- If user likes `night`: `"live music {dest}"`, `"jazz bar {dest}"`, `"rooftop bar {dest}"`
- If user likes `act` (active): `"cycling {dest}"`, `"kayaking {dest}"`, `"climbing {dest}"`
- If user likes `lux` (luxury): `"spa {dest}"`, `"fine dining {dest}"`, `"luxury hotel {dest}"`

Add a mapping like:
```python
DIM_QUERIES = {
    "cul": ["{dest} museum", "{dest} art gallery", "{dest} historic site"],
    "nat": ["{dest} hiking trail", "{dest} national park", "{dest} viewpoint"],
    "food": ["{dest} food market", "{dest} local restaurant", "{dest} street food"],
    "night": ["{dest} live music venue", "{dest} jazz bar", "{dest} rooftop bar"],
    "act": ["{dest} cycling route", "{dest} kayaking", "{dest} climbing wall"],
    "lux": ["{dest} spa", "{dest} boutique hotel", "{dest} fine dining"],
    "adv": ["{dest} adventure tour", "{dest} rock climbing", "{dest} paragliding"],
    "soc": ["{dest} walking tour", "{dest} cooking class", "{dest} local event"],
    "spont": ["{dest} hidden gem", "{dest} off the beaten path", "{dest} local secret"],
}
```

Use the user's TOP 3 positive preference dimensions to pick queries.

### Fix 3: "Bootstrap match" must be hidden from users

The text "Bootstrap match (no prefs yet)" visible in screenshots should NEVER be shown to users — it's debug info.

**In `src/App.tsx`:** Find where `why` is rendered in result cards and:
- If `why` contains "Bootstrap match" or "no prefs" → don't render the why-section at all for that card
- Or replace with a neutral fallback: `"Populært reisemål i {destination}"` / `"Popular in {destination}"`

```ts
const displayWhy = (why: string) => {
  if (!why || /bootstrap|no prefs/i.test(why)) return null;
  return why;
};
```

### Fix 4: Minimum quality score threshold

In `web_recs.py`, after scoring:
- Don't return items with `match < 45` (they're noise)
- If fewer than 3 items pass the threshold, relax to `match >= 35`

## DoD
- [ ] Scam/warning/listicle results filtered out (junk domain + title pattern filter)
- [ ] Search queries are dimension-specific (not generic "experiences in X")
- [ ] "Bootstrap match (no prefs yet)" never shown to users
- [ ] Items below quality threshold filtered out
- [ ] Backend tests still pass: `pytest backend/`
- [ ] `npm run build` passes
- [ ] Manual test: search "Oslo experiences" → results are actual places, not articles
