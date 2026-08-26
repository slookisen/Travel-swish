from __future__ import annotations

"""Profile-aware queries for hotels, organized trips and free-form discovery."""

import random
import re
from typing import Any, Mapping

from .query_gen import GeneratedQuery


_DIM_TERMS: dict[str, dict[str, list[str]]] = {
    "hotels": {
        "adv": ["adventure lodge", "activity hotel"],
        "soc": ["social hotel", "friendly hostel", "hotel with social spaces"],
        "lux": ["boutique luxury hotel", "spa hotel", "design hotel"],
        "act": ["active hotel", "hotel near hiking"],
        "cul": ["historic hotel", "hotel in cultural district"],
        "nat": ["eco lodge", "scenic nature hotel", "hotel with sea view"],
        "food": ["hotel with excellent breakfast", "gastronomy hotel"],
        "night": ["hotel near nightlife", "hotel with rooftop bar"],
        "spont": ["hidden gem hotel", "unique small hotel"],
    },
    "tours": {
        "adv": ["adventure small group tour", "active expedition"],
        "soc": ["social small group tour", "group tour for solo travelers"],
        "lux": ["premium escorted tour", "small group luxury tour"],
        "act": ["active multi day tour", "hiking group tour"],
        "cul": ["cultural escorted tour", "local history group tour"],
        "nat": ["nature small group tour", "wildlife organized tour"],
        "food": ["culinary group tour", "food and wine organized tour"],
        "night": ["festival group trip", "nightlife group trip"],
        "spont": ["off the beaten path group tour", "unusual organized adventure"],
    },
    "custom": {
        "adv": ["adventurous"], "soc": ["social"], "lux": ["premium"],
        "act": ["active"], "cul": ["cultural"], "nat": ["nature"],
        "food": ["local food"], "night": ["nightlife"], "spont": ["hidden gem"],
    },
}

_PARTY_TERMS = {
    "solo": "for solo travelers", "couple": "for couples",
    "friends": "for friends", "family": "for families",
}
_AGE_TERMS = {
    "18-29": "for ages 18 to 29", "30-49": "for ages 30 to 49",
    "50-64": "for ages 50 to 64", "65+": "for ages 65 plus",
}
_BUDGET_TERMS = {
    "value": "good value", "budget": "budget friendly",
    "balanced": "mid range", "midrange": "mid range", "premium": "premium",
}
_DURATION_TERMS = {"weekend": "weekend", "week": "7 day", "two_weeks": "10 to 14 day"}


def clean_search_text(value: str, *, max_len: int = 160) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:max_len]


def _top_dims(prefs: Mapping[str, Any], limit: int = 3) -> list[str]:
    ranked: list[tuple[str, float]] = []
    for dim, value in (prefs or {}).items():
        if dim not in {"adv", "soc", "lux", "act", "cul", "nat", "food", "night", "spont"}:
            continue
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        if score > 0.1:
            ranked.append((dim, score))
    ranked.sort(key=lambda pair: (-pair[1], pair[0]))
    return [dim for dim, _ in ranked[:limit]]


def generate_profile_search_queries(
    *,
    search_kind: str,
    destination: str,
    prefs: Mapping[str, Any],
    query_text: str = "",
    trip_context: Mapping[str, str] | None = None,
    max_queries: int = 5,
    seed: int = 42,
) -> list[GeneratedQuery]:
    kind = search_kind if search_kind in {"hotels", "tours", "custom"} else "custom"
    destination = clean_search_text(destination, max_len=120)
    query_text = clean_search_text(query_text)
    context = dict(trip_context or {})
    rng = random.Random(int(seed))
    max_queries = max(1, min(8, int(max_queries)))

    suffixes: list[str] = []
    if kind == "tours":
        for mapping, key in (
            (_PARTY_TERMS, "party"), (_AGE_TERMS, "age_band"),
            (_BUDGET_TERMS, "budget"), (_DURATION_TERMS, "duration"),
        ):
            term = mapping.get(clean_search_text(context.get(key, ""), max_len=24))
            if term:
                suffixes.append(term)

    base = {"hotels": "hotel", "tours": "organized multi day group tour", "custom": query_text or "things to do"}[kind]
    if query_text and kind != "custom":
        base = f"{query_text} {base}"

    candidates: list[tuple[str, str, float]] = [
        (f"{base} {destination} {' '.join(suffixes)}".strip(), "trip-context" if suffixes else "search-intent", 1.25 if suffixes else 1.15)
    ]
    terms = _DIM_TERMS[kind]
    for rank, dim in enumerate(_top_dims(prefs)):
        choices = list(terms.get(dim, []))
        rng.shuffle(choices)
        if choices:
            candidates.append((f"{choices[0]} {destination} {' '.join(suffixes)}".strip(), f"dim:{dim}", 1.0 - rank * 0.08))

    fallbacks = {
        "hotels": ["boutique hotel", "best rated hotel", "local independent hotel"],
        "tours": ["small group organized adventure", "guided multi day tour", "fixed departure group trip"],
        "custom": [query_text or "local recommendations", f"{query_text or 'local'} hidden gem"],
    }[kind]
    rng.shuffle(fallbacks)
    for phrase in fallbacks:
        candidates.append((f"{phrase} {destination} {' '.join(suffixes)}".strip(), "fallback", 0.7))

    negatives = {
        "hotels": ["jobs", "real estate", "long term rental"],
        "tours": ["jobs", "forum", "travel insurance", "scam"],
        "custom": ["jobs", "forum", "scam"],
    }[kind]
    out: list[GeneratedQuery] = []
    seen: set[str] = set()
    for query, source, weight in candidates:
        query = clean_search_text(query, max_len=220)
        if not query or query.casefold() in seen:
            continue
        seen.add(query.casefold())
        out.append(GeneratedQuery(query=query, weight=weight, source=source, negatives=list(negatives)))
        if len(out) >= max_queries:
            break
    return out
