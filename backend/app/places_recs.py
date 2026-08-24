"""places_recs.py — Recommendation ranking using Google Places API."""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Mapping

from .google_places import google_places_search
from .query_builder import build_queries
from .scorer import build_why, score_item

log = logging.getLogger(__name__)
PlacesSearchFn = Callable[..., tuple[list[dict[str, Any]], bool]]


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
    search_kind: str | None = None,
    query_text: str = "",
    exclude_ids: list[str] | None = None,
    language_code: str = "en",
    search_fn: PlacesSearchFn = google_places_search,
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
        search_kind=search_kind,
        query_text=query_text,
    )

    all_items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    def fetch_query(pq):
        return search_fn(
                pq.text_query,
                max_results=10,
                included_type=pq.included_type,
                min_rating=pq.min_rating,
                price_levels=pq.price_levels,
                language_code=language_code,
            )

    # Text Search calls are independent. Running a small bounded fan-out makes
    # the result set wait for the slowest query instead of the sum of all queries.
    with ThreadPoolExecutor(max_workers=max(1, min(4, len(queries)))) as executor:
        futures = [executor.submit(fetch_query, pq) for pq in queries]
        for pq, future in zip(queries, futures):
            try:
                items, _cached = future.result()
            except Exception as e:
                log.warning("places query failed: %s — %s", pq.text_query, e)
                continue
            for item in items:
                pid = item.get("id", "")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    item["_query"] = pq.text_query
                    item["_query_weight"] = pq.weight
                    all_items.append(item)
    excluded = {str(value) for value in (exclude_ids or []) if value}
    if excluded:
        all_items = [item for item in all_items if str(item.get("id") or "") not in excluded]

    kind = search_kind or mode
    if kind == "restaurants":
        all_items = [i for i in all_items if i.get("cat") in ("restaurants", "coffee", "food", "streetfood", "fine")]
    elif kind == "hotels":
        all_items = [i for i in all_items if i.get("cat") == "hotels"]
    else:
        all_items = [i for i in all_items if i.get("cat") not in ("restaurants", "coffee", "food", "hotels")]

    scored: list[dict[str, Any]] = []
    for item in all_items:
        raw_score = score_item(item, prefs_dict, taste)
        query_weight = float(item.get("_query_weight", 1.0))
        boosted = raw_score * (0.8 + 0.2 * min(query_weight, 2.0))

        item["match"] = round(min(95, max(30, boosted * 100)), 1)
        item["why"] = build_why(item, prefs_dict, taste)
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
        "model_version": "v4-multi-layer",
        "provider": "google_places",
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
        if idx > limit * 10:
            break

    return result
