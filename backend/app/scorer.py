"""scorer.py — Cosine similarity scoring for place recommendations."""
from __future__ import annotations

import math
from typing import Any, Mapping

TYPE_DIM_VECTOR: dict[str, dict[str, float]] = {
    "museum": {"cul": 1.0},
    "art_gallery": {"cul": 0.9, "lux": 0.2},
    "art_museum": {"cul": 1.0, "lux": 0.2},
    "history_museum": {"cul": 1.0},
    "historical_place": {"cul": 0.9, "nat": 0.1},
    "cultural_landmark": {"cul": 0.9, "soc": 0.2},
    "performing_arts_theater": {"cul": 0.8, "soc": 0.4, "night": 0.3},
    "castle": {"cul": 1.0, "adv": 0.2},
    "monument": {"cul": 0.8},
    "park": {"nat": 0.7, "act": 0.2},
    "national_park": {"nat": 1.0, "act": 0.3, "adv": 0.2},
    "hiking_area": {"nat": 0.9, "act": 0.7, "adv": 0.3},
    "beach": {"nat": 0.8, "act": 0.3, "spont": 0.2},
    "botanical_garden": {"nat": 0.7, "cul": 0.3},
    "scenic_spot": {"nat": 0.9, "spont": 0.4},
    "mountain_peak": {"nat": 1.0, "adv": 0.6, "act": 0.5},
    "nature_preserve": {"nat": 1.0},
    "adventure_sports_center": {"adv": 1.0, "act": 0.7},
    "amusement_park": {"adv": 0.7, "soc": 0.5, "act": 0.3},
    "water_park": {"adv": 0.6, "act": 0.5, "soc": 0.4},
    "sports_center": {"act": 0.9},
    "cycling_park": {"act": 0.8, "nat": 0.3},
    "swimming_pool": {"act": 0.7},
    "stadium": {"act": 0.5, "soc": 0.6},
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
    "bar": {"night": 0.8, "soc": 0.4},
    "night_club": {"night": 1.0, "soc": 0.5},
    "cocktail_bar": {"night": 0.8, "lux": 0.4},
    "wine_bar": {"night": 0.6, "lux": 0.5, "food": 0.3},
    "live_music_venue": {"night": 0.7, "cul": 0.3, "soc": 0.5},
    "pub": {"night": 0.6, "soc": 0.5},
    "spa": {"lux": 0.9},
    "hotel": {"lux": 0.45, "soc": 0.2},
    "lodging": {"lux": 0.35, "soc": 0.15},
    "resort_hotel": {"lux": 1.0},
    "hostel": {"soc": 0.8, "spont": 0.3},
    "bed_and_breakfast": {"soc": 0.45, "food": 0.35, "spont": 0.25},
    "guest_house": {"soc": 0.4, "spont": 0.35},
    "inn": {"cul": 0.3, "soc": 0.25},
    "motel": {"act": 0.15},
    "wellness_center": {"lux": 0.6},
    "cultural_center": {"soc": 0.7, "cul": 0.4},
    "community_center": {"soc": 0.8},
    "event_venue": {"soc": 0.7},
    "market": {"soc": 0.5, "food": 0.4, "spont": 0.3},
    "tourist_attraction": {"spont": 0.5, "cul": 0.3},
    "visitor_center": {"spont": 0.3},
    "plaza": {"spont": 0.4, "soc": 0.3},
    "observation_deck": {"spont": 0.5, "nat": 0.3},
    "vineyard": {"spont": 0.5, "food": 0.4, "lux": 0.3},
}

ALL_DIMS = ["adv", "soc", "lux", "act", "cul", "nat", "food", "night", "spont"]


def _item_vector(item: Mapping[str, Any]) -> dict[str, float]:
    vec: dict[str, float] = {d: 0.0 for d in ALL_DIMS}
    for place_type in item.get("types", []):
        type_vec = TYPE_DIM_VECTOR.get(place_type, {})
        for dim, val in type_vec.items():
            vec[dim] = max(vec[dim], val)
    return vec


def _cosine_sim(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a.get(d, 0.0) * b.get(d, 0.0) for d in ALL_DIMS)
    mag_a = math.sqrt(sum(v * v for v in a.values())) or 1e-9
    mag_b = math.sqrt(sum(v * v for v in b.values())) or 1e-9
    return dot / (mag_a * mag_b)


def _context_adjustment(item: Mapping[str, Any], taste: dict[str, Any] | None) -> float:
    """Small, bounded trip-level adjustment kept separate from durable taste."""
    if not taste or not isinstance(taste.get("context"), dict):
        return 0.0

    context = taste["context"]
    types = {str(value) for value in item.get("types", [])}
    rating_count = int(item.get("rating_count") or 0)
    price_level = str(item.get("price_level") or "")
    adjustment = 0.0

    discovery = context.get("discovery")
    if discovery == "hidden":
        if 30 <= rating_count <= 600:
            adjustment += 0.09
        elif rating_count > 5000:
            adjustment -= 0.05
    elif discovery == "icons" and rating_count >= 1500:
        adjustment += 0.06

    budget = context.get("budget")
    expensive = price_level in {"PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"}
    inexpensive = price_level in {"PRICE_LEVEL_FREE", "PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"}
    if budget == "value" and expensive:
        adjustment -= 0.12
    elif budget == "value" and inexpensive:
        adjustment += 0.05
    elif budget == "premium" and expensive:
        adjustment += 0.07

    if context.get("party") == "family":
        if types & {"amusement_park", "park", "museum", "aquarium", "zoo"}:
            adjustment += 0.05
        if types & {"night_club", "bar"}:
            adjustment -= 0.12

    if context.get("pace") == "slow" and types & {"spa", "park", "botanical_garden", "museum"}:
        adjustment += 0.04
    elif context.get("pace") == "full" and types & {"hiking_area", "adventure_sports_center", "sports_center"}:
        adjustment += 0.04

    return max(-0.16, min(0.14, adjustment))


def score_item(item: Mapping[str, Any], prefs: dict[str, float], taste: dict[str, Any] | None = None) -> float:
    item_vec = _item_vector(item)
    cos = _cosine_sim(item_vec, prefs)

    cat_boost = 0.0
    if taste and taste.get("cats"):
        item_cat = str(item.get("cat") or "")
        internal_to_card_cat = {
            "culture": "culture",
            "nature": "nature",
            "food": "food",
            "nightlife": "nightlife",
            "restaurants": "food",
            "coffee": "food",
            "wellness": "luxury",
            "hotels": "luxury",
            "experiences": "adrenaline",
            "shopping": "shopping",
        }
        card_cat = internal_to_card_cat.get(item_cat, item_cat)
        cat_sentiment = float(taste["cats"].get(card_cat, 0))
        cat_boost = max(-0.3, min(0.5, cat_sentiment * 0.5))

    rating = float(item.get("rating") or 0)
    rating_count = int(item.get("rating_count") or 0)
    rating_norm = max(0.0, rating - 4.0) / 1.0
    count_norm = min(1.0, math.log1p(rating_count) / math.log1p(1000))
    quality = rating_norm * 0.7 + count_norm * 0.3

    novelty = 0.0
    spont_score = float(prefs.get("spont", 0))
    if spont_score > 0.2:
        if 30 < rating_count < 500:
            novelty = spont_score * 0.8
        elif rating_count < 30 and rating >= 4.5:
            novelty = spont_score * 0.4

    context_adjustment = _context_adjustment(item, taste)
    final = cos * 0.45 + cat_boost * 0.20 + quality * 0.20 + novelty * 0.15 + context_adjustment
    return max(0.0, min(1.0, final))


def build_why(
    item: Mapping[str, Any],
    prefs: dict[str, float],
    taste: dict[str, Any] | None = None,
    *,
    language: str = "en",
) -> str:
    parts: list[str] = []

    rating = item.get("rating")
    rating_count = item.get("rating_count", 0)
    if rating and rating_count:
        review_label = "omtaler" if language == "no" else "reviews"
        parts.append(f"⭐ {float(rating):.1f} ({int(rating_count):,} {review_label})")

    item_vec = _item_vector(item)
    matching_dims = sorted(
        [
            (d, item_vec[d] * float(prefs.get(d, 0)))
            for d in ALL_DIMS
            if item_vec[d] > 0.3 and float(prefs.get(d, 0)) > 0.1
        ],
        key=lambda x: -x[1],
    )[:2]

    dim_labels = ({
        "adv": "eventyr", "soc": "sosialt", "lux": "komfort", "act": "aktivt",
        "cul": "kultur", "nat": "natur", "food": "matopplevelser",
        "night": "uteliv", "spont": "skjult perle",
    } if language == "no" else {
        "adv": "adventure", "soc": "social", "lux": "high-end", "act": "active",
        "cul": "cultural", "nat": "nature", "food": "gastronomy",
        "night": "nightlife", "spont": "hidden gem",
    })
    for dim, _ in matching_dims:
        parts.append(dim_labels.get(dim, dim))

    if taste and taste.get("cats"):
        item_cat = str(item.get("cat") or "")
        internal_to_card = {
            "culture": "culture",
            "nature": "nature",
            "food": "food",
            "nightlife": "nightlife",
            "restaurants": "food",
            "wellness": "luxury",
            "coffee": "food",
        }
        card_cat = internal_to_card.get(item_cat, item_cat)
        if float(taste["cats"].get(card_cat, 0)) > 0.5:
            parts.append("treffer smaken din" if language == "no" else "matches your taste")

    context = taste.get("context", {}) if isinstance(taste, dict) else {}
    if isinstance(context, dict):
        if context.get("discovery") == "hidden":
            parts.append("passer ønsket om lokale funn" if language == "no" else "fits your hidden-gem brief")
        elif context.get("discovery") == "icons":
            parts.append("passer ønsket om klassikere" if language == "no" else "fits your iconic-sights brief")
        if context.get("party") == "family":
            parts.append("vurdert for familietur" if language == "no" else "screened for a family trip")

    fallback = "Anbefalt for deg" if language == "no" else "Recommended for you"
    return " · ".join(parts) if parts else fallback
