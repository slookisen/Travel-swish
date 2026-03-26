"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations

import logging
import random
from typing import Any, Mapping

from .google_places import google_places_search

log = logging.getLogger(__name__)

# Dimension → rich query templates (use {dest} placeholder for destination)
DIM_QUERIES: dict[str, list[str]] = {
    "adv": [
        "adventure sports {dest}",
        "extreme activities {dest}",
        "rock climbing {dest}",
        "zip line {dest}",
        "outdoor adventure {dest}",
    ],
    "soc": [
        "best local market {dest}",
        "cooking class {dest}",
        "food tour {dest}",
        "walking tour {dest}",
        "social activities {dest}",
    ],
    "lux": [
        "fine dining restaurant {dest}",
        "michelin star restaurant {dest}",
        "luxury spa {dest}",
        "rooftop restaurant {dest}",
        "upscale cocktail bar {dest}",
    ],
    "act": [
        "cycling route {dest}",
        "kayaking {dest}",
        "swimming {dest}",
        "sports activities {dest}",
        "running trail {dest}",
    ],
    "cul": [
        "museum {dest}",
        "art gallery {dest}",
        "historic site {dest}",
        "cultural experience {dest}",
        "local neighborhood {dest}",
    ],
    "nat": [
        "nature park {dest}",
        "hiking trail {dest}",
        "viewpoint {dest}",
        "waterfall {dest}",
        "beach {dest}",
    ],
    "food": [
        "local restaurant {dest}",
        "street food {dest}",
        "food market {dest}",
        "traditional cuisine {dest}",
        "best breakfast {dest}",
    ],
    "night": [
        "bar {dest}",
        "live music {dest}",
        "cocktail bar {dest}",
        "nightclub {dest}",
        "rooftop bar {dest}",
    ],
    "spont": [
        "hidden gem {dest}",
        "off the beaten path {dest}",
        "local secret {dest}",
        "unusual attraction {dest}",
        "quirky {dest}",
    ],
}

# Combo queries for top-2 dim pairs
_COMBO_MAP: dict[tuple[str, str], str] = {
    ("lux", "food"): "fine dining {dest}",
    ("food", "lux"): "fine dining {dest}",
    ("lux", "cul"): "upscale cultural experience {dest}",
    ("cul", "lux"): "upscale cultural experience {dest}",
    ("food", "soc"): "food tour {dest}",
    ("soc", "food"): "food tour {dest}",
    ("nat", "adv"): "outdoor adventure {dest}",
    ("adv", "nat"): "outdoor adventure {dest}",
    ("nat", "act"): "active outdoor {dest}",
    ("act", "nat"): "active outdoor {dest}",
    ("night", "soc"): "bar crawl social {dest}",
    ("soc", "night"): "bar crawl social {dest}",
    ("cul", "soc"): "walking tour {dest}",
    ("soc", "cul"): "walking tour {dest}",
    ("food", "night"): "restaurant bar {dest}",
    ("night", "food"): "restaurant bar {dest}",
}


def _build_queries(
    pos_dims: list[tuple[str, float]],
    destination: str,
    max_queries: int,
    seed: int = 42,
) -> list[str]:
    """Build seed-varied queries from positive dims."""
    rng = random.Random(seed)
    candidates: list[tuple[str, float]] = []
    for dim, score in pos_dims:
        templates = list(DIM_QUERIES.get(dim, []))
        rng.shuffle(templates)
        weight = max(1, round(score * 3))
        for t in templates[:weight]:
            candidates.append((t.format(dest=destination), score))

    # Sort by score desc, then pick max_queries
    candidates.sort(key=lambda x: -x[1])
    queries = [q for q, _ in candidates[:max_queries]]

    # Add combo query for top-2 dims
    if len(pos_dims) >= 2:
        d1, d2 = pos_dims[0][0], pos_dims[1][0]
        combo = _COMBO_MAP.get((d1, d2))
        if combo:
            queries.insert(0, combo.format(dest=destination))

    return queries[:max_queries]


def rank_places_recs(
    *,
    user_id: str,
    mode: str,
    destination: str,
    prefs: Mapping[str, Any],
    limit: int = 10,
    max_queries: int = 8,
    seed: int = 42,
) -> dict[str, Any]:
    """Fetch and rank Google Places results against user prefs."""

    _ = user_id  # currently unused, reserved for future personalization features.

    pos_dims = sorted(
        [(d, float(v)) for d, v in prefs.items() if isinstance(v, (int, float)) and float(v) > 0.1],
        key=lambda x: -x[1],
    )[:3]

    if pos_dims:
        queries = _build_queries(pos_dims, destination, max_queries, seed=seed)
    else:
        # Fallback for empty profile (new user, no swipes)
        if mode == "restaurants":
            queries = [
                f"best restaurant {destination}",
                f"local food {destination}",
                f"popular cafe {destination}",
            ]
        else:
            queries = [
                f"top attraction {destination}",
                f"things to do {destination}",
                f"popular experience {destination}",
            ]

    queries = queries[:max_queries]

    all_items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for query in queries:
        try:
            items, _cached = google_places_search(query, max_results=10)
            for item in items:
                pid = item.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    item["_query"] = query
                    all_items.append(item)
        except Exception as e:
            log.warning("places query failed: %s — %s", query, e)

    if mode == "restaurants":
        all_items = [i for i in all_items if i.get("cat") in ("restaurants", "coffee", "food", "streetfood", "fine")]
    else:
        all_items = [i for i in all_items if i.get("cat") not in ("restaurants", "coffee")]

    scored: list[dict[str, Any]] = []
    for item in all_items:
        score = _score_item(item, prefs)
        item["match"] = round(min(95, max(40, 50 + score * 45)), 1)
        item["why"] = _build_why(item)
        scored.append(item)

    scored.sort(
        key=lambda x: (
            -float(x.get("match") or 0),
            -(float(x.get("rating") or 0) * min(float(x.get("rating_count") or 0), 1000)),
        )
    )

    final = scored[:limit]

    return {
        "ok": True,
        "items": final,
        "cached": False,
        "model_version": "v3-google-places",
        "queries": [{"query": q, "weight": 1.0, "source": "google_places", "negatives": []} for q in queries],
    }


def _score_item(item: Mapping[str, Any], prefs: Mapping[str, Any]) -> float:
    """Score a place against user prefs using type/category matching."""
    score = 0.0
    cat = str(item.get("cat") or "")
    types = [str(t) for t in item.get("types", [])]

    cat_dim_map = {
        "culture": "cul",
        "nature": "nat",
        "food": "food",
        "nightlife": "night",
        "wellness": "lux",
        "experiences": "act",
        "restaurants": "food",
        "coffee": "food",
        "fine": "lux",
    }

    matched_dim = cat_dim_map.get(cat)
    if matched_dim and matched_dim in prefs:
        score += float(prefs[matched_dim]) * 0.8

    # Google Places type bonuses
    type_dim_map = {
        "spa": "lux",
        "fine_dining_restaurant": "lux",
        "hiking_area": "nat",
        "park": "nat",
        "national_park": "nat",
        "museum": "cul",
        "art_gallery": "cul",
        "tourist_attraction": "cul",
        "bar": "night",
        "night_club": "night",
        "restaurant": "food",
        "food_market": "food",
        "amusement_park": "adv",
    }
    for gtype in types:
        dim = type_dim_map.get(gtype)
        if dim and dim in prefs:
            score += float(prefs[dim]) * 0.4

    # Prefer spontaneous / hidden gems for high "spont" users
    if float(prefs.get("spont", 0)) > 0.3:
        rating_count = int(item.get("rating_count") or 0)
        if 50 < rating_count < 500:
            score += float(prefs["spont"]) * 0.3

    rating = float(item.get("rating") or 0)
    if rating >= 4.7:
        score += 0.4
    elif rating >= 4.5:
        score += 0.25
    elif rating >= 4.0:
        score += 0.1

    return score


def _build_why(item: Mapping[str, Any]) -> str:
    cat = str(item.get("cat") or "")
    rating = item.get("rating")
    rating_count = item.get("rating_count", 0)

    parts: list[str] = []
    if rating and rating_count:
        parts.append(f"⭐ {float(rating):.1f} ({int(rating_count):,} reviews)")

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
