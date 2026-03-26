# TS17 — Advanced Multi-Layer Matching Engine

## Goal

Replace the current flat dim→query→score pipeline with a 3-layer matching system
that produces significantly better, more personalized recommendations.

## Current Architecture (what to replace)

`backend/app/places_recs.py` currently:
1. Takes 9 dim scores (adv, soc, lux, act, cul, nat, food, night, spont) as floats
2. Picks top 3 positive dims → generates freetext queries like "museum {dest}"
3. Sends freetext queries to Google Places Text Search
4. Scores results with simple category→dim mapping
5. Returns ranked list

**Problems:**
- "food=0.7" doesn't distinguish street food lover from fine dining fan
- Queries are generic freetext — ignores Google Places structured filters
- Scoring is flat: a museum is a museum regardless of type
- No exploration/exploitation balance

## New Architecture: 3-Layer Profile + Structured Search

### Layer 1: Taste Profile (frontend → backend)

The frontend already has rich swipe data. Currently it reduces everything to 9 dim scores.

**Change in frontend (`src/App.tsx`):**

In `findItems()`, after computing `prefs` (the dim scores), also compute and send a `taste` object:

```typescript
// Build taste profile from individual card swipes
function buildTasteProfile(swipes: Record<string, number>, cards: Card[]): TasteProfile {
  const catLikes: Record<string, number> = {};   // category → net sentiment
  const catCounts: Record<string, number> = {};
  const dimPairs: Record<string, number> = {};    // "dim1+dim2" → co-occurrence strength

  for (const card of cards) {
    const val = swipes[card.id];
    if (!val) continue;
    const w = val > 0 ? 1.0 : -0.5;

    // Category sentiment
    const cat = card.cat;
    catLikes[cat] = (catLikes[cat] || 0) + w;
    catCounts[cat] = (catCounts[cat] || 0) + 1;

    // Dim co-occurrence (which dims appear together in liked cards)
    if (val > 0) {
      const activeDims = Object.entries(card.dims)
        .filter(([_, v]) => v > 0.3)
        .map(([k]) => k)
        .sort();
      for (let i = 0; i < activeDims.length; i++) {
        for (let j = i + 1; j < activeDims.length; j++) {
          const pair = `${activeDims[i]}+${activeDims[j]}`;
          dimPairs[pair] = (dimPairs[pair] || 0) + 1;
        }
      }
    }
  }

  // Normalize cat sentiment to -1..+1
  const cats: Record<string, number> = {};
  for (const [cat, sum] of Object.entries(catLikes)) {
    const count = catCounts[cat] || 1;
    cats[cat] = Math.max(-1, Math.min(1, sum / count));
  }

  // Top dim pairs (co-occurrence patterns)
  const topPairs = Object.entries(dimPairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => ({ pair, count }));

  return { cats, topPairs, totalSwipes: Object.keys(swipes).length };
}
```

**Type definition** (add near top of App.tsx or in a types section):
```typescript
type TasteProfile = {
  cats: Record<string, number>;       // card category → sentiment (-1 to +1)
  topPairs: Array<{ pair: string; count: number }>;  // "adv+nat" → 3
  totalSwipes: number;
};
```

**Send in the request body** (in the `/recs/web` POST):
```typescript
body: JSON.stringify({
  user_id: userId,
  mode,
  destination: dest,
  limit: 20,
  seed: Date.now() % 100000,
  taste: buildTasteProfile(swipes, cards),  // NEW
}),
```

### Layer 2: Structured Query Builder (backend)

**New file: `backend/app/query_builder.py`**

This replaces the current `_build_queries` function. It uses the taste profile
to generate *structured* Google Places requests.

```python
"""query_builder.py — Multi-layer query generation from taste profile."""
from __future__ import annotations
import random
from typing import Any

# Map card categories to Google Places includedType values
# See: https://developers.google.com/maps/documentation/places/web-service/place-types
CAT_TO_PLACE_TYPES: dict[str, list[str]] = {
    "adrenaline":  ["adventure_sports_center", "amusement_park", "water_park"],
    "relaxation":  ["spa", "wellness_center", "botanical_garden", "park"],
    "culture":     ["museum", "art_gallery", "historical_place", "cultural_landmark", "performing_arts_theater"],
    "food":        ["restaurant", "food_market", "bakery", "cafe"],
    "nature":      ["national_park", "hiking_area", "beach", "scenic_spot", "park"],
    "social":      ["cultural_center", "community_center", "event_venue", "market"],
    "nightlife":   ["bar", "night_club", "live_music_venue", "cocktail_bar", "wine_bar"],
    "luxury":      ["fine_dining_restaurant", "spa", "resort_hotel"],
    "spontaneous": ["tourist_attraction", "visitor_center", "plaza", "vineyard"],
    "learning":    ["museum", "library", "art_gallery", "planetarium"],
    "shopping":    ["shopping_mall", "market"],
    # Restaurant mode categories
    "italian":     ["italian_restaurant"],
    "asian":       ["japanese_restaurant", "thai_restaurant", "chinese_restaurant", "korean_restaurant", "vietnamese_restaurant", "indian_restaurant", "sushi_restaurant", "ramen_restaurant"],
    "local":       ["restaurant"],
    "seafood":     ["seafood_restaurant"],
    "vegetarian":  ["vegan_restaurant", "vegetarian_restaurant"],
    "brunch":      ["brunch_restaurant", "breakfast_restaurant", "cafe"],
    "street_food": ["fast_food_restaurant", "food_market"],
    "fine_dining": ["fine_dining_restaurant", "steak_house"],
    "coffee":      ["coffee_shop", "cafe"],
    "pizza":       ["pizza_restaurant"],
    "mexican":     ["mexican_restaurant", "taco_restaurant"],
    "mediterranean": ["mediterranean_restaurant", "greek_restaurant", "turkish_restaurant", "lebanese_restaurant"],
}

# Dim pairs → search intent (freetext queries when structured types aren't enough)
DIM_PAIR_QUERIES: dict[str, list[str]] = {
    "adv+nat":   ["outdoor adventure {dest}", "nature adventure {dest}"],
    "adv+act":   ["extreme sports {dest}", "adventure activities {dest}"],
    "cul+soc":   ["guided walking tour {dest}", "cultural tour {dest}"],
    "food+soc":  ["food tour {dest}", "cooking class {dest}"],
    "food+lux":  ["fine dining {dest}", "michelin restaurant {dest}"],
    "lux+cul":   ["luxury cultural experience {dest}", "private museum tour {dest}"],
    "nat+act":   ["hiking {dest}", "kayaking {dest}", "cycling {dest}"],
    "night+soc": ["pub crawl {dest}", "live music {dest}"],
    "food+spont":["hidden gem restaurant {dest}", "local food market {dest}"],
    "nat+spont": ["off beaten path nature {dest}", "secret viewpoint {dest}"],
    "cul+nat":   ["outdoor museum {dest}", "historic garden {dest}"],
    "lux+night": ["rooftop bar {dest}", "cocktail lounge {dest}"],
    "act+soc":   ["group sports {dest}", "team activity {dest}"],
}

# Dim → minimum Google Places rating (luxury users want higher-rated places)
DIM_MIN_RATING: dict[str, float] = {
    "lux": 4.5,
}

# Dim → Google Places price level filter
DIM_PRICE_LEVELS: dict[str, list[str]] = {
    "lux": ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"],
}


class PlacesQuery:
    """A structured query to send to Google Places."""
    def __init__(
        self,
        text_query: str,
        *,
        included_type: str | None = None,
        min_rating: float | None = None,
        price_levels: list[str] | None = None,
        weight: float = 1.0,
        source: str = "",
    ):
        self.text_query = text_query
        self.included_type = included_type
        self.min_rating = min_rating
        self.price_levels = price_levels
        self.weight = weight
        self.source = source

    def to_dict(self) -> dict[str, Any]:
        return {
            "query": self.text_query,
            "weight": self.weight,
            "source": self.source,
            "negatives": [],
        }


def build_queries(
    *,
    destination: str,
    mode: str,
    prefs: dict[str, float],
    taste: dict[str, Any] | None = None,
    max_queries: int = 8,
    seed: int = 42,
) -> list[PlacesQuery]:
    """Build structured queries from multi-layer profile."""

    rng = random.Random(seed)
    queries: list[PlacesQuery] = []

    # --- Phase 1: Category-driven type searches (from taste profile) ---
    if taste and taste.get("cats"):
        cat_scores = sorted(
            [(cat, float(score)) for cat, score in taste["cats"].items() if float(score) > 0.1],
            key=lambda x: -x[1],
        )

        # Positive categories → structured type searches
        for cat, score in cat_scores[:4]:
            place_types = CAT_TO_PLACE_TYPES.get(cat, [])
            if not place_types:
                continue
            rng.shuffle(place_types)
            # Pick 1-2 types based on strength
            n_types = 1 if score < 0.5 else 2
            for pt in place_types[:n_types]:
                q = PlacesQuery(
                    text_query=f"{pt.replace('_', ' ')} in {destination}",
                    included_type=pt,
                    weight=score,
                    source=f"cat:{cat}",
                )
                queries.append(q)

        # Negative categories → used later for filtering, not searching
        neg_cats = [cat for cat, score in taste["cats"].items() if float(score) < -0.3]
        # Store for use in scoring (pass via return or side channel)

    # --- Phase 2: Dim-pair intent queries (co-occurrence patterns) ---
    if taste and taste.get("topPairs"):
        for pair_info in taste["topPairs"][:3]:
            pair_key = pair_info.get("pair", "")
            pair_templates = DIM_PAIR_QUERIES.get(pair_key, [])
            if pair_templates:
                template = rng.choice(pair_templates)
                q = PlacesQuery(
                    text_query=template.format(dest=destination),
                    weight=1.2,  # boost co-occurrence queries
                    source=f"pair:{pair_key}",
                )
                queries.append(q)

    # --- Phase 3: Dim-driven fallback (if taste is thin or missing) ---
    if len(queries) < 3:
        pos_dims = sorted(
            [(d, float(v)) for d, v in prefs.items() if isinstance(v, (int, float)) and float(v) > 0.1],
            key=lambda x: -x[1],
        )[:3]
        for dim, score in pos_dims:
            # Use dim to pick a Google Places type
            dim_to_types = {
                "adv": ["adventure_sports_center", "amusement_park"],
                "soc": ["cultural_center", "event_venue"],
                "lux": ["fine_dining_restaurant", "spa"],
                "act": ["sports_center", "hiking_area"],
                "cul": ["museum", "art_gallery", "historical_place"],
                "nat": ["national_park", "park", "hiking_area"],
                "food": ["restaurant", "food_market"],
                "night": ["bar", "night_club"],
                "spont": ["tourist_attraction"],
            }
            types = dim_to_types.get(dim, [])
            if types:
                pt = rng.choice(types)
                q = PlacesQuery(
                    text_query=f"{pt.replace('_', ' ')} in {destination}",
                    included_type=pt,
                    weight=score,
                    source=f"dim:{dim}",
                )
                queries.append(q)

    # --- Phase 4: Cold start (no profile at all) ---
    if not queries:
        if mode == "restaurants":
            for text in ["best restaurants", "popular cafe", "local food"]:
                queries.append(PlacesQuery(
                    text_query=f"{text} {destination}",
                    weight=0.5,
                    source="cold_start",
                ))
        else:
            for text in ["top attractions", "things to do", "popular experiences"]:
                queries.append(PlacesQuery(
                    text_query=f"{text} {destination}",
                    weight=0.5,
                    source="cold_start",
                ))

    # --- Apply global filters from profile ---
    # Luxury users get minRating boost
    lux_score = float(prefs.get("lux", 0))
    if lux_score > 0.5:
        for q in queries:
            if q.min_rating is None:
                q.min_rating = 4.0 + (lux_score * 0.5)  # up to 4.5

    # Budget constraint from lux dimension
    if lux_score > 0.7:
        for q in queries:
            if q.price_levels is None:
                q.price_levels = ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"]

    # Dedupe by text_query
    seen = set()
    unique: list[PlacesQuery] = []
    for q in queries:
        key = q.text_query.lower()
        if key not in seen:
            seen.add(key)
            unique.append(q)

    return unique[:max_queries]
```

### Layer 3: Cosine Similarity Scorer (backend)

**New file: `backend/app/scorer.py`**

```python
"""scorer.py — Cosine similarity scoring for place recommendations."""
from __future__ import annotations
import math
from typing import Any, Mapping

# Google Places types → dim vector (which dims does this type satisfy?)
TYPE_DIM_VECTOR: dict[str, dict[str, float]] = {
    # Culture
    "museum": {"cul": 1.0},
    "art_gallery": {"cul": 0.9, "lux": 0.2},
    "art_museum": {"cul": 1.0, "lux": 0.2},
    "history_museum": {"cul": 1.0},
    "historical_place": {"cul": 0.9, "nat": 0.1},
    "cultural_landmark": {"cul": 0.9, "soc": 0.2},
    "performing_arts_theater": {"cul": 0.8, "soc": 0.4, "night": 0.3},
    "castle": {"cul": 1.0, "adv": 0.2},
    "monument": {"cul": 0.8},
    # Nature
    "park": {"nat": 0.7, "act": 0.2},
    "national_park": {"nat": 1.0, "act": 0.3, "adv": 0.2},
    "hiking_area": {"nat": 0.9, "act": 0.7, "adv": 0.3},
    "beach": {"nat": 0.8, "act": 0.3, "spont": 0.2},
    "botanical_garden": {"nat": 0.7, "cul": 0.3},
    "scenic_spot": {"nat": 0.9, "spont": 0.4},
    "mountain_peak": {"nat": 1.0, "adv": 0.6, "act": 0.5},
    "nature_preserve": {"nat": 1.0},
    # Adventure
    "adventure_sports_center": {"adv": 1.0, "act": 0.7},
    "amusement_park": {"adv": 0.7, "soc": 0.5, "act": 0.3},
    "water_park": {"adv": 0.6, "act": 0.5, "soc": 0.4},
    # Active
    "sports_center": {"act": 0.9},
    "cycling_park": {"act": 0.8, "nat": 0.3},
    "swimming_pool": {"act": 0.7},
    "stadium": {"act": 0.5, "soc": 0.6},
    # Food
    "restaurant": {"food": 0.8},
    "food_market": {"food": 0.9, "soc": 0.3, "spont": 0.3},
    "bakery": {"food": 0.6},
    "cafe": {"food": 0.4, "soc": 0.3},
    "coffee_shop": {"food": 0.3, "soc": 0.3},
    "fine_dining_restaurant": {"food": 0.7, "lux": 1.0},
    "steak_house": {"food": 0.8, "lux": 0.4},
    "seafood_restaurant": {"food": 0.9},
    "sushi_restaurant": {"food": 0.8, "lux": 0.3},
    "ramen_restaurant": {"food": 0.8, "spont": 0.2},
    "street_food": {"food": 0.9, "spont": 0.5},
    "fast_food_restaurant": {"food": 0.5},
    # Nightlife
    "bar": {"night": 0.8, "soc": 0.4},
    "night_club": {"night": 1.0, "soc": 0.5},
    "cocktail_bar": {"night": 0.8, "lux": 0.4},
    "wine_bar": {"night": 0.6, "lux": 0.5, "food": 0.3},
    "live_music_venue": {"night": 0.7, "cul": 0.3, "soc": 0.5},
    "pub": {"night": 0.6, "soc": 0.5},
    # Luxury
    "spa": {"lux": 0.9},
    "resort_hotel": {"lux": 1.0},
    "wellness_center": {"lux": 0.6},
    # Social
    "cultural_center": {"soc": 0.7, "cul": 0.4},
    "community_center": {"soc": 0.8},
    "event_venue": {"soc": 0.7},
    "market": {"soc": 0.5, "food": 0.4, "spont": 0.3},
    # Spontaneous
    "tourist_attraction": {"spont": 0.5, "cul": 0.3},
    "visitor_center": {"spont": 0.3},
    "plaza": {"spont": 0.4, "soc": 0.3},
    "observation_deck": {"spont": 0.5, "nat": 0.3},
    "vineyard": {"spont": 0.5, "food": 0.4, "lux": 0.3},
}

ALL_DIMS = ["adv", "soc", "lux", "act", "cul", "nat", "food", "night", "spont"]


def _item_vector(item: Mapping[str, Any]) -> dict[str, float]:
    """Build a dim vector for a place based on its Google Places types."""
    vec: dict[str, float] = {d: 0.0 for d in ALL_DIMS}
    types = item.get("types", [])

    for t in types:
        type_vec = TYPE_DIM_VECTOR.get(t, {})
        for dim, val in type_vec.items():
            vec[dim] = max(vec[dim], val)  # max-pool, not sum (avoid double-counting)

    return vec


def _cosine_sim(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity between two dim vectors."""
    dot = sum(a.get(d, 0) * b.get(d, 0) for d in ALL_DIMS)
    mag_a = math.sqrt(sum(v * v for v in a.values())) or 1e-9
    mag_b = math.sqrt(sum(v * v for v in b.values())) or 1e-9
    return dot / (mag_a * mag_b)


def score_item(
    item: Mapping[str, Any],
    prefs: dict[str, float],
    taste: dict[str, Any] | None = None,
) -> float:
    """Score a place using cosine similarity + quality signals.

    Returns a score between 0.0 and 1.0.
    Components:
    - cosine_sim(item_vector, user_prefs): 0-1, weight 0.45
    - category_match (taste profile): 0 or boost, weight 0.20
    - quality (rating + review count): 0-1, weight 0.20
    - novelty (hidden gem bonus for spontaneous users): 0-1, weight 0.15
    """

    # 1. Cosine similarity between item's type vector and user prefs
    item_vec = _item_vector(item)
    cos = _cosine_sim(item_vec, prefs)

    # 2. Category match from taste profile
    cat_boost = 0.0
    if taste and taste.get("cats"):
        item_cat = str(item.get("cat") or "")
        # Map our internal categories to card categories
        internal_to_card_cat = {
            "culture": "culture",
            "nature": "nature",
            "food": "food",
            "nightlife": "nightlife",
            "restaurants": "food",
            "coffee": "food",
            "wellness": "luxury",
            "experiences": "adrenaline",
            "shopping": "shopping",
        }
        card_cat = internal_to_card_cat.get(item_cat, item_cat)
        cat_sentiment = float(taste["cats"].get(card_cat, 0))
        cat_boost = max(-0.3, min(0.5, cat_sentiment * 0.5))

    # 3. Quality signal
    rating = float(item.get("rating") or 0)
    rating_count = int(item.get("rating_count") or 0)
    # Normalize: 4.0=0.0, 5.0=1.0 (below 4.0 is negative)
    rating_norm = max(0, (rating - 4.0)) / 1.0
    # Review count: log scale, cap at ~1000
    count_norm = min(1.0, math.log1p(rating_count) / math.log1p(1000))
    quality = rating_norm * 0.7 + count_norm * 0.3

    # 4. Novelty bonus (for spontaneous/hidden gem seekers)
    novelty = 0.0
    spont_score = float(prefs.get("spont", 0))
    if spont_score > 0.2:
        # Sweet spot: 50-500 reviews (not tourist trap, not unknown)
        if 30 < rating_count < 500:
            novelty = spont_score * 0.8
        elif rating_count < 30 and rating >= 4.5:
            novelty = spont_score * 0.4  # risky but could be great

    # Weighted combination
    final = (
        cos * 0.45
        + cat_boost * 0.20
        + quality * 0.20
        + novelty * 0.15
    )

    return max(0.0, min(1.0, final))


def build_why(
    item: Mapping[str, Any],
    prefs: dict[str, float],
    taste: dict[str, Any] | None = None,
) -> str:
    """Build human-readable explanation of why this place was recommended."""
    parts: list[str] = []

    # Rating
    rating = item.get("rating")
    rating_count = item.get("rating_count", 0)
    if rating and rating_count:
        parts.append(f"⭐ {float(rating):.1f} ({int(rating_count):,} reviews)")

    # Which dims match
    item_vec = _item_vector(item)
    matching_dims = sorted(
        [(d, item_vec[d] * float(prefs.get(d, 0)))
         for d in ALL_DIMS
         if item_vec[d] > 0.3 and float(prefs.get(d, 0)) > 0.1],
        key=lambda x: -x[1],
    )[:2]

    dim_labels = {
        "adv": "adventure",
        "soc": "social",
        "lux": "high-end",
        "act": "active",
        "cul": "cultural",
        "nat": "nature",
        "food": "gastronomy",
        "night": "nightlife",
        "spont": "hidden gem",
    }
    for dim, _ in matching_dims:
        parts.append(dim_labels.get(dim, dim))

    # Taste match
    if taste and taste.get("cats"):
        item_cat = str(item.get("cat") or "")
        internal_to_card = {
            "culture": "culture", "nature": "nature", "food": "food",
            "nightlife": "nightlife", "restaurants": "food",
            "wellness": "luxury", "coffee": "food",
        }
        card_cat = internal_to_card.get(item_cat, item_cat)
        if float(taste["cats"].get(card_cat, 0)) > 0.5:
            parts.append("matches your taste")

    return " · ".join(parts) if parts else "Recommended for you"
```

### Changes to existing files

#### `backend/app/google_places.py`

Add support for structured query parameters. Modify `google_places_search()` to accept
optional `included_type`, `min_rating`, `price_levels`:

```python
def google_places_search(
    query: str,
    *,
    max_results: int = 10,
    cache_ttl_s: int = 3600,
    included_type: str | None = None,
    min_rating: float | None = None,
    price_levels: list[str] | None = None,
) -> tuple[list[dict[str, Any]], bool]:
```

And in the request body:
```python
body = {
    "textQuery": query,
    "maxResultCount": min(max_results, 20),
    "languageCode": "en",
}
if included_type:
    body["includedType"] = included_type
if min_rating is not None:
    body["minRating"] = min_rating
if price_levels:
    body["priceLevels"] = price_levels
```

Update the cache key to include these new params:
```python
def _cache_key(query: str, max_results: int, included_type: str | None = None,
               min_rating: float | None = None, price_levels: list[str] | None = None) -> str:
    raw = f"{query}|{max_results}|{included_type}|{min_rating}|{price_levels}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()
```

#### `backend/app/places_recs.py`

**Complete rewrite.** Import from `query_builder` and `scorer` instead of doing everything inline.

```python
"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations

import logging
from typing import Any, Mapping

from .google_places import google_places_search
from .query_builder import PlacesQuery, build_queries
from .scorer import score_item, build_why

log = logging.getLogger(__name__)


def rank_places_recs(
    *,
    user_id: str,
    mode: str,
    destination: str,
    prefs: Mapping[str, Any],
    taste: dict[str, Any] | None = None,
    limit: int = 10,
    max_queries: int = 8,
    seed: int = 42,
) -> dict[str, Any]:
    """Fetch and rank Google Places results using multi-layer matching."""

    prefs_dict = {k: float(v) for k, v in prefs.items() if isinstance(v, (int, float))}

    queries = build_queries(
        destination=destination,
        mode=mode,
        prefs=prefs_dict,
        taste=taste,
        max_queries=max_queries,
        seed=seed,
    )

    all_items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for pq in queries:
        try:
            items, _cached = google_places_search(
                pq.text_query,
                max_results=10,
                included_type=pq.included_type,
                min_rating=pq.min_rating,
                price_levels=pq.price_levels,
            )
            for item in items:
                pid = item.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    item["_query"] = pq.text_query
                    item["_query_weight"] = pq.weight
                    all_items.append(item)
        except Exception as e:
            log.warning("places query failed: %s — %s", pq.text_query, e)

    # Mode filter
    if mode == "restaurants":
        all_items = [i for i in all_items if i.get("cat") in (
            "restaurants", "coffee", "food", "streetfood", "fine",
        )]
    else:
        all_items = [i for i in all_items if i.get("cat") not in ("restaurants", "coffee")]

    # Score and rank
    scored: list[dict[str, Any]] = []
    for item in all_items:
        raw_score = score_item(item, prefs_dict, taste)
        # Apply query weight boost
        query_weight = float(item.get("_query_weight", 1.0))
        boosted = raw_score * (0.8 + 0.2 * min(query_weight, 2.0))

        item["match"] = round(min(95, max(30, boosted * 100)), 1)
        item["why"] = build_why(item, prefs_dict, taste)
        scored.append(item)

    # Sort: match desc, then quality tiebreaker
    scored.sort(
        key=lambda x: (
            -float(x.get("match") or 0),
            -(float(x.get("rating") or 0) * min(float(x.get("rating_count") or 0), 1000)),
        )
    )

    # Category diversity: don't show 10 museums in a row
    final = _diversify(scored, limit)

    return {
        "ok": True,
        "items": final,
        "cached": False,
        "model_version": "v4-multi-layer",
        "queries": [q.to_dict() for q in queries],
    }


def _diversify(items: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    """Round-robin across categories to ensure diversity."""
    if len(items) <= limit:
        return items

    by_cat: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        cat = str(item.get("cat") or "other")
        by_cat.setdefault(cat, []).append(item)

    result: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    cats = list(by_cat.keys())

    # Round-robin
    idx = 0
    while len(result) < limit and any(by_cat.values()):
        cat = cats[idx % len(cats)]
        if by_cat.get(cat):
            item = by_cat[cat].pop(0)
            iid = item.get("id", "")
            if iid not in seen_ids:
                seen_ids.add(iid)
                result.append(item)
        idx += 1
        # Safety valve
        if idx > limit * 10:
            break

    return result
```

#### `backend/app/main.py`

In `recs_web()`, extract `taste` from request and pass to `rank_places_recs`:

```python
# After getting prefs from DB:
taste = None
if hasattr(req, 'taste') and req.taste:
    taste = req.taste
```

And pass `taste=taste` to `rank_places_recs()`.

#### `backend/app/schemas.py`

Add `taste` field to `WebRecsRequest`:

```python
class WebRecsRequest(BaseModel):
    # ... existing fields ...
    taste: dict | None = None  # Multi-layer taste profile from frontend
```

### Test plan

After implementing, run:
```bash
cd backend && .venv312\Scripts\python -m pytest tests/ -x -q
```

All existing tests must pass. The changes should be backward-compatible:
- `taste` is optional (None by default)
- If taste is None, the system falls back to dim-only queries (Layer 3)
- Structured Google Places filters are optional and additive

### Verification

Test with curl:
```bash
curl -X POST https://travel-swish-backend.onrender.com/recs/web \
  -H "Content-Type: application/json" \
  -H "Origin: https://slookisen.github.io" \
  -d '{
    "user_id": "test",
    "mode": "experiences",
    "destination": "Barcelona",
    "limit": 10,
    "taste": {
      "cats": {"culture": 0.8, "food": 0.6, "nightlife": -0.5},
      "topPairs": [{"pair": "cul+food", "count": 3}],
      "totalSwipes": 15
    }
  }'
```

Expected: Should return museums, food markets, galleries — NOT nightclubs.

### Files to create
- `backend/app/query_builder.py` (new)
- `backend/app/scorer.py` (new)

### Files to modify
- `backend/app/google_places.py` (add structured params)
- `backend/app/places_recs.py` (rewrite to use new modules)
- `backend/app/schemas.py` (add taste to WebRecsRequest)
- `backend/app/main.py` (pass taste through)
- `src/App.tsx` (build and send taste profile)

### Branch
`codex/advanced-matching-engine`

### Commit message
`feat: multi-layer matching engine with taste profile, structured Places queries, and cosine similarity scoring`
