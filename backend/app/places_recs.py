"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations

import logging
from typing import Any, Mapping

from .google_places import google_places_search

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

    _ = user_id  # currently unused, reserved for future personalization features.

    pos_dims = sorted(
        [(d, float(v)) for d, v in prefs.items() if isinstance(v, (int, float)) and float(v) > 0.1],
        key=lambda x: -x[1],
    )[:3]

    queries = []
    if pos_dims:
        for dim, _score in pos_dims:
            hints = DIM_PLACE_HINTS.get(dim, [])
            for hint in hints[:2]:
                queries.append(f"{hint} in {destination}")

    if not queries:
        if mode == "restaurants":
            queries = [f"restaurants in {destination}", f"local food {destination}", f"cafes {destination}"]
        else:
            queries = [f"things to do {destination}", f"attractions {destination}", f"experiences {destination}"]

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

    cat_dim_map = {
        "culture": "cul",
        "nature": "nat",
        "food": "food",
        "nightlife": "night",
        "wellness": "lux",
        "experiences": "act",
        "restaurants": "food",
        "coffee": "food",
    }

    matched_dim = cat_dim_map.get(cat)
    if matched_dim and matched_dim in prefs:
        score += float(prefs[matched_dim]) * 0.8

    rating = float(item.get("rating") or 0)
    if rating >= 4.5:
        score += 0.3
    elif rating >= 4.0:
        score += 0.15

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
