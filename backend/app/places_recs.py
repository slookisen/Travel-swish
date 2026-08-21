"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations

import logging
from typing import Any, Mapping

from .google_places import google_places_search
from .query_builder import build_queries
from .scorer import build_why, score_item

log = logging.getLogger(__name__)

FOOD_ONLY_TYPES = {
    "bakery", "cafe", "coffee_shop", "food_court", "meal_delivery", "meal_takeaway",
    "restaurant", "fine_dining_restaurant", "bar_and_grill",
}
FOOD_CATEGORIES = {"restaurants", "bakery", "coffee", "food", "streetfood", "fine", "brunch"}


def _is_food_venue(item: Mapping[str, Any]) -> bool:
    types = {str(place_type) for place_type in item.get("types", [])}
    return bool(
        types.intersection(FOOD_ONLY_TYPES)
        or any(place_type.endswith("_restaurant") for place_type in types)
        or str(item.get("cat") or "") in FOOD_CATEGORIES
    )


def _is_mode_appropriate(item: Mapping[str, Any], mode: str) -> bool:
    if mode == "restaurants":
        return _is_food_venue(item) or str(item.get("cat") or "") == "nightlife"
    return not _is_food_venue(item)


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
    language: str = "no",
) -> dict[str, Any]:
    """Fetch and rank Google Places results using multi-layer matching."""
    _ = user_id

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
                language=language,
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

    all_items = [item for item in all_items if _is_mode_appropriate(item, mode)]

    scored: list[dict[str, Any]] = []
    for item in all_items:
        raw_score = score_item(item, prefs_dict, taste)
        query_weight = float(item.get("_query_weight", 1.0))
        boosted = raw_score * (0.8 + 0.2 * min(query_weight, 2.0))

        item["match"] = round(min(95, max(30, boosted * 100)), 1)
        item["why"] = build_why(item, prefs_dict, taste, language=language)
        scored.append(item)

    scored.sort(
        key=lambda x: (
            -float(x.get("match") or 0),
            -(float(x.get("rating") or 0) * min(float(x.get("rating_count") or 0), 1000)),
        )
    )

    final = _diversify(scored, limit)

    return {
        "ok": True,
        "items": final,
        "cached": False,
        "provider": "google_places",
        "model_version": "v6-mode-safe-diverse",
        "queries": [q.to_dict() for q in queries],
    }


def _diversify(items: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    """Round-robin categories and cap repeated venue types in the visible slate."""

    by_cat: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        cat = str(item.get("cat") or "other")
        by_cat.setdefault(cat, []).append(item)

    result: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    type_counts: dict[str, int] = {}
    category_counts: dict[str, int] = {}
    cats = list(by_cat.keys())

    idx = 0
    while len(result) < limit and any(by_cat.values()):
        cat = cats[idx % len(cats)]
        if by_cat.get(cat):
            item = by_cat[cat].pop(0)
            iid = item.get("id", "")
            types = item.get("types") if isinstance(item.get("types"), list) else []
            narrow_type = str(types[0] if types else item.get("primary_type") or cat)
            if (
                iid not in seen_ids
                and type_counts.get(narrow_type, 0) < 2
                and category_counts.get(cat, 0) < 3
            ):
                seen_ids.add(iid)
                result.append(item)
                type_counts[narrow_type] = type_counts.get(narrow_type, 0) + 1
                category_counts[cat] = category_counts.get(cat, 0) + 1
        idx += 1
        if idx > limit * 10:
            break

    return result
