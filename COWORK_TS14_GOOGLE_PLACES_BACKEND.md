# COWORK TS14: Replace Brave Search with Google Places API

## Context
Files:
- `backend/app/web_recs.py` — current recommendation pipeline (Brave-based)
- `backend/app/query_gen.py` — query generation
- `backend/app/brave_search.py` — Brave API wrapper
- `backend/app/schemas.py` — request/response models
- `backend/app/main.py` — `/recs/web` endpoint
- `render.yaml` — environment config for Render deploy

## Goal
Replace Brave Search with Google Places API (New) for structured, accurate place data.
Google Places returns actual venues (museums, restaurants, parks etc.) with category, rating,
price level, coordinates, and photos — not web articles about places.

The API key will be provided via environment variable `GOOGLE_PLACES_API_KEY`.

## Google Places API (New) — Key Info
- Base URL: `https://places.googleapis.com/v1/places:searchText`
- Method: POST
- Auth: `X-Goog-Api-Key: {API_KEY}` header
- Field mask: `X-Goog-FieldMask` header controls which fields to return (cost control)

### Recommended field mask (balance cost vs data):
```
places.id,places.displayName,places.formattedAddress,places.types,
places.rating,places.priceLevel,places.userRatingCount,
places.location,places.websiteUri,places.editorialSummary,
places.primaryTypeDisplayName
```

### Example request:
```python
import httpx

def google_places_search(query: str, api_key: str, max_results: int = 10) -> list[dict]:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.rating,places.priceLevel,places.userRatingCount,places.location,places.websiteUri,places.editorialSummary,places.primaryTypeDisplayName",
    }
    body = {
        "textQuery": query,
        "maxResultCount": min(max_results, 20),
        "languageCode": "en",
    }
    resp = httpx.post(
        "https://places.googleapis.com/v1/places:searchText",
        json=body,
        headers=headers,
        timeout=10.0,
    )
    resp.raise_for_status()
    return resp.json().get("places", [])
```

## Deliverables

### 1. New file: `backend/app/google_places.py`

```python
"""google_places.py — Google Places API (New) wrapper for Travel-Swish."""
from __future__ import annotations
import os
import hashlib
import json
import logging
import time
from typing import Any

import httpx

from .db_cache import cache_get, cache_set

log = logging.getLogger(__name__)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.types,"
    "places.rating,places.priceLevel,places.userRatingCount,"
    "places.location,places.websiteUri,places.editorialSummary,"
    "places.primaryTypeDisplayName"
)

# Map Google place types to our internal categories
TYPE_TO_CAT = {
    "museum": "culture",
    "art_gallery": "culture",
    "tourist_attraction": "culture",
    "historic_site": "culture",
    "church": "culture",
    "park": "nature",
    "hiking_area": "nature",
    "national_park": "nature",
    "beach": "nature",
    "restaurant": "restaurants",
    "cafe": "coffee",
    "bar": "nightlife",
    "night_club": "nightlife",
    "spa": "wellness",
    "shopping_mall": "shopping",
    "market": "food",
    "food_market": "food",
    "amusement_park": "experiences",
    "aquarium": "experiences",
    "zoo": "experiences",
    "stadium": "experiences",
    "performing_arts_theater": "culture",
}

def _get_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY")

def _cache_key(query: str, max_results: int) -> str:
    raw = f"{query}|{max_results}"
    return hashlib.sha1(raw.encode()).hexdigest()

def google_places_search(
    query: str,
    *,
    max_results: int = 10,
    cache_ttl_s: int = 3600,  # cache for 1 hour
) -> tuple[list[dict[str, Any]], bool]:
    """Search Google Places and return normalized items + cache_hit flag."""
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY not set")

    ck = _cache_key(query, max_results)
    now = int(time.time())

    # Check cache first
    cached = cache_get(namespace="google_places", key=ck, now=now)
    if cached:
        try:
            return json.loads(cached["payload"]), True
        except Exception:
            pass

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "maxResultCount": min(max_results, 20),
        "languageCode": "en",
    }

    try:
        resp = httpx.post(PLACES_URL, json=body, headers=headers, timeout=10.0)
        resp.raise_for_status()
        places = resp.json().get("places", [])
    except Exception as e:
        log.warning("google_places_search failed query=%r: %s", query, e)
        return [], False

    items = [_normalize(p) for p in places]
    items = [i for i in items if i]  # filter None

    # Cache result
    cache_set(namespace="google_places", key=ck, payload=json.dumps(items), ttl_s=cache_ttl_s, now=now)

    return items, False


def _normalize(place: dict[str, Any]) -> dict[str, Any] | None:
    """Convert Google Places result to Travel-Swish item format."""
    try:
        name = place.get("displayName", {}).get("text", "")
        if not name:
            return None

        # Category from primary type
        primary_type = place.get("primaryTypeDisplayName", {}).get("text", "")
        types = place.get("types", [])
        cat = "experiences"
        for t in types:
            if t in TYPE_TO_CAT:
                cat = TYPE_TO_CAT[t]
                break

        # Summary / snippet
        summary = place.get("editorialSummary", {}).get("text", "")
        address = place.get("formattedAddress", "")
        snippet = summary or address

        # Coordinates
        loc = place.get("location", {})
        lat = loc.get("latitude")
        lng = loc.get("longitude")

        # Rating info for match scoring
        rating = place.get("rating")
        rating_count = place.get("userRatingCount", 0)
        price_level = place.get("priceLevel", "")  # PRICE_LEVEL_INEXPENSIVE etc.

        url = place.get("websiteUri", "")
        if not url:
            # Fallback: Google Maps link
            place_id = place.get("id", "")
            if place_id:
                url = f"https://maps.google.com/?cid={place_id}"

        return {
            "id": place.get("id", ""),
            "name": name,
            "url": url,
            "cat": cat,
            "snippet": snippet,
            "domain": "maps.google.com",
            "source": "google_places",
            "lat": lat,
            "lng": lng,
            "rating": rating,
            "rating_count": rating_count,
            "price_level": price_level,
            "types": types,
            "primary_type": primary_type,
        }
    except Exception as e:
        log.warning("_normalize failed: %s", e)
        return None
```

### 2. New file: `backend/app/places_recs.py`

This replaces the Brave-based `rank_web_recs()` for the Google Places flow.

```python
"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations
import logging
import os
from typing import Any, Mapping

from .google_places import google_places_search
from .query_gen import generate_queries, to_search_string, DIM_QUERIES
from .algo import format_why

log = logging.getLogger(__name__)

# Dimension → Google Places search type hints (append to queries)
DIM_PLACE_HINTS = {
    "cul": ["museum", "art gallery", "historic site"],
    "nat": ["park", "hiking trail", "viewpoint"],
    "food": ["food market", "local restaurant", "street food"],
    "night": ["bar", "live music venue", "rooftop bar"],
    "act": ["sports center", "cycling route", "kayaking"],
    "lux": ["spa", "fine dining restaurant", "boutique hotel"],
    "adv": ["adventure tour", "rock climbing", "paragliding"],
    "soc": ["cooking class", "walking tour", "local market"],
    "spont": ["hidden gem", "local neighborhood", "viewpoint"],
}


def rank_places_recs(
    *,
    user_id: str,
    mode: str,
    destination: str,
    prefs: Mapping[str, Any],
    limit: int = 10,
    max_queries: int = 8,
) -> dict[str, Any]:
    """Fetch and rank Google Places results against user prefs."""

    # Get top positive dimensions
    pos_dims = sorted(
        [(d, float(v)) for d, v in prefs.items() if isinstance(v, (int, float)) and float(v) > 0.1],
        key=lambda x: -x[1]
    )[:3]

    # Build queries from top dims + mode
    queries = []
    if pos_dims:
        for dim, _ in pos_dims:
            hints = DIM_PLACE_HINTS.get(dim, [])
            for hint in hints[:2]:  # max 2 per dim
                queries.append(f"{hint} in {destination}")
    
    # Fallback generic queries if no prefs
    if not queries:
        if mode == "restaurants":
            queries = [f"restaurants in {destination}", f"local food {destination}", f"cafes {destination}"]
        else:
            queries = [f"things to do {destination}", f"attractions {destination}", f"experiences {destination}"]

    # Limit queries
    queries = queries[:max_queries]

    # Fetch from Google Places
    all_items: list[dict] = []
    seen_ids: set[str] = set()

    for query in queries:
        try:
            items, cached = google_places_search(query, max_results=10)
            for item in items:
                pid = item.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    item["_query"] = query
                    all_items.append(item)
        except Exception as e:
            log.warning("places query failed: %s — %s", query, e)

    # Filter by mode
    if mode == "restaurants":
        all_items = [i for i in all_items if i.get("cat") in ("restaurants", "coffee", "food", "streetfood", "fine")]
    else:
        all_items = [i for i in all_items if i.get("cat") not in ("restaurants", "coffee")]

    # Score against prefs
    scored = []
    for item in all_items:
        score = _score_item(item, prefs)
        item["match"] = round(min(95, max(40, 50 + score * 45)), 1)
        item["why"] = _build_why(item, prefs)
        scored.append(item)

    # Sort by match desc, boost highly rated places
    scored.sort(key=lambda x: (
        -float(x.get("match") or 0),
        -(float(x.get("rating") or 0) * min(float(x.get("rating_count") or 0), 1000))
    ))

    final = scored[:limit]

    return {
        "ok": True,
        "items": final,
        "cached": False,
        "model_version": "v3-google-places",
        "queries": [{"query": q, "weight": 1.0, "source": "google_places", "negatives": []} for q in queries],
    }


def _score_item(item: dict, prefs: Mapping[str, Any]) -> float:
    """Score a place against user prefs using type/category matching."""
    score = 0.0
    cat = str(item.get("cat") or "")
    types = [str(t) for t in (item.get("types") or [])]

    # Category → dimension mapping
    cat_dim_map = {
        "culture": "cul", "nature": "nat", "food": "food",
        "nightlife": "night", "wellness": "lux", "experiences": "act",
        "restaurants": "food", "coffee": "food",
    }

    matched_dim = cat_dim_map.get(cat)
    if matched_dim and matched_dim in prefs:
        score += float(prefs[matched_dim]) * 0.8

    # Rating boost (well-rated places score higher)
    rating = float(item.get("rating") or 0)
    if rating >= 4.5:
        score += 0.3
    elif rating >= 4.0:
        score += 0.15

    return score


def _build_why(item: dict, prefs: Mapping[str, Any]) -> str:
    cat = str(item.get("cat") or "")
    rating = item.get("rating")
    rating_count = item.get("rating_count", 0)

    parts = []
    if rating and rating_count:
        parts.append(f"⭐ {rating:.1f} ({rating_count:,} reviews)")

    cat_labels = {
        "culture": "cultural experience",
        "nature": "nature & outdoors",
        "food": "food & local cuisine",
        "nightlife": "nightlife",
        "restaurants": "dining",
        "coffee": "café",
        "wellness": "wellness & relaxation",
    }
    if cat in cat_labels:
        parts.append(cat_labels[cat])

    return " · ".join(parts) if parts else "Matches your taste profile"
```

### 3. Update `backend/app/main.py` — use Google Places when API key is available

In the `/recs/web` endpoint, add fallback logic:

```python
# At top of file, add import:
from .places_recs import rank_places_recs

# In recs_web(), replace the rank_web_recs call with:
google_key = os.getenv("GOOGLE_PLACES_API_KEY")
if google_key:
    payload = rank_places_recs(
        user_id=req.user_id,
        mode=req.mode,
        destination=req.destination,
        prefs=prefs,
        limit=req.limit,
        max_queries=req.max_queries,
    )
else:
    # Fallback to Brave if Google Places key not set
    payload = rank_web_recs(...)  # keep existing call
```

### 4. Update `render.yaml` — add env var placeholder

Add to the env section:
```yaml
- key: GOOGLE_PLACES_API_KEY
  sync: false  # set manually in Render dashboard
```

### 5. Update `requirements.txt`

Add:
```
httpx>=0.27.0
```

(Check if already present — Brave uses it too. If not, add it.)

## Setup Instructions (for Daniel after deploy)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable "Places API (New)" 
4. Go to "APIs & Services" → "Credentials" → "Create API Key"
5. Restrict key to "Places API (New)" for security
6. In Render dashboard → travel-swish-backend → Environment → add:
   `GOOGLE_PLACES_API_KEY = <your key>`
7. Redeploy (or it auto-deploys)

## DoD
- [ ] `backend/app/google_places.py` created with search + normalize
- [ ] `backend/app/places_recs.py` created with ranking logic
- [ ] `backend/app/main.py` updated to use Google Places when key is available, Brave as fallback
- [ ] `render.yaml` updated with env var placeholder
- [ ] `requirements.txt` has `httpx`
- [ ] Manual test: set `GOOGLE_PLACES_API_KEY` locally and call `/recs/web` → returns actual venues with ratings and coordinates
- [ ] Results have `lat`/`lng` → map tab works automatically (fixes TS11 too)
- [ ] `pytest backend/` passes
