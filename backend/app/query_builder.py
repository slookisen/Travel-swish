"""query_builder.py — Multi-layer query generation from taste profile."""
from __future__ import annotations

import random
from typing import Any

CAT_TO_PLACE_TYPES: dict[str, list[str]] = {
    "adrenaline": ["adventure_sports_center", "amusement_park", "water_park"],
    "relaxation": ["spa", "wellness_center", "botanical_garden", "park"],
    "culture": ["museum", "art_gallery", "historical_place", "cultural_landmark", "performing_arts_theater"],
    "food": ["restaurant", "food_market", "bakery", "cafe"],
    "nature": ["national_park", "hiking_area", "beach", "scenic_spot", "park"],
    "social": ["cultural_center", "community_center", "event_venue", "market"],
    "nightlife": ["bar", "night_club", "live_music_venue", "cocktail_bar", "wine_bar"],
    "luxury": ["fine_dining_restaurant", "spa", "resort_hotel"],
    "spontaneous": ["tourist_attraction", "visitor_center", "plaza", "vineyard"],
    "learning": ["museum", "library", "art_gallery", "planetarium"],
    "shopping": ["shopping_mall", "market"],
    "italian": ["italian_restaurant"],
    "asian": [
        "japanese_restaurant",
        "thai_restaurant",
        "chinese_restaurant",
        "korean_restaurant",
        "vietnamese_restaurant",
        "indian_restaurant",
        "sushi_restaurant",
        "ramen_restaurant",
    ],
    "local": ["restaurant"],
    "seafood": ["seafood_restaurant"],
    "vegetarian": ["vegan_restaurant", "vegetarian_restaurant"],
    "brunch": ["brunch_restaurant", "breakfast_restaurant", "cafe"],
    "street_food": ["fast_food_restaurant", "food_market"],
    "fine_dining": ["fine_dining_restaurant", "steak_house"],
    "coffee": ["coffee_shop", "cafe"],
    "pizza": ["pizza_restaurant"],
    "mexican": ["mexican_restaurant", "taco_restaurant"],
    "mediterranean": ["mediterranean_restaurant", "greek_restaurant", "turkish_restaurant", "lebanese_restaurant"],
}

DIM_PAIR_QUERIES: dict[str, list[str]] = {
    "adv+nat": ["outdoor adventure {dest}", "nature adventure {dest}"],
    "adv+act": ["extreme sports {dest}", "adventure activities {dest}"],
    "cul+soc": ["guided walking tour {dest}", "cultural tour {dest}"],
    "food+soc": ["food tour {dest}", "cooking class {dest}"],
    "food+lux": ["fine dining {dest}", "michelin restaurant {dest}"],
    "lux+cul": ["luxury cultural experience {dest}", "private museum tour {dest}"],
    "nat+act": ["hiking {dest}", "kayaking {dest}", "cycling {dest}"],
    "night+soc": ["pub crawl {dest}", "live music {dest}"],
    "food+spont": ["hidden gem restaurant {dest}", "local food market {dest}"],
    "nat+spont": ["off beaten path nature {dest}", "secret viewpoint {dest}"],
    "cul+nat": ["outdoor museum {dest}", "historic garden {dest}"],
    "lux+night": ["rooftop bar {dest}", "cocktail lounge {dest}"],
    "act+soc": ["group sports {dest}", "team activity {dest}"],
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
    _ = mode

    rng = random.Random(seed)
    queries: list[PlacesQuery] = []

    if taste and taste.get("cats"):
        cat_scores = sorted(
            [(cat, float(score)) for cat, score in taste["cats"].items() if float(score) > 0.1],
            key=lambda x: -x[1],
        )
        for cat, score in cat_scores[:4]:
            place_types = CAT_TO_PLACE_TYPES.get(cat, [])
            if not place_types:
                continue
            rng.shuffle(place_types)
            n_types = 1 if score < 0.5 else 2
            for place_type in place_types[:n_types]:
                queries.append(
                    PlacesQuery(
                        text_query=f"{place_type.replace('_', ' ')} in {destination}",
                        included_type=place_type,
                        weight=score,
                        source=f"cat:{cat}",
                    )
                )

    if taste and taste.get("topPairs"):
        for pair_info in taste["topPairs"][:3]:
            pair_key = pair_info.get("pair", "")
            pair_templates = DIM_PAIR_QUERIES.get(pair_key, [])
            if pair_templates:
                template = rng.choice(pair_templates)
                queries.append(
                    PlacesQuery(
                        text_query=template.format(dest=destination),
                        weight=1.2,
                        source=f"pair:{pair_key}",
                    )
                )

    if len(queries) < 3:
        pos_dims = sorted(
            [(d, float(v)) for d, v in prefs.items() if isinstance(v, (int, float)) and float(v) > 0.1],
            key=lambda x: -x[1],
        )[:3]
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
        for dim, score in pos_dims:
            types = dim_to_types.get(dim, [])
            if types:
                place_type = rng.choice(types)
                queries.append(
                    PlacesQuery(
                        text_query=f"{place_type.replace('_', ' ')} in {destination}",
                        included_type=place_type,
                        weight=score,
                        source=f"dim:{dim}",
                    )
                )

    if not queries:
        if mode == "restaurants":
            for text in ["best restaurants", "popular cafe", "local food"]:
                queries.append(PlacesQuery(text_query=f"{text} {destination}", weight=0.5, source="cold_start"))
        else:
            for text in ["top attractions", "things to do", "popular experiences"]:
                queries.append(PlacesQuery(text_query=f"{text} {destination}", weight=0.5, source="cold_start"))

    lux_score = float(prefs.get("lux", 0))
    if lux_score > 0.5:
        for q in queries:
            if q.min_rating is None:
                q.min_rating = 4.0 + (lux_score * 0.5)
    if lux_score > 0.7:
        for q in queries:
            if q.price_levels is None:
                q.price_levels = ["PRICE_LEVEL_EXPENSIVE", "PRICE_LEVEL_VERY_EXPENSIVE"]

    seen: set[str] = set()
    unique: list[PlacesQuery] = []
    for q in queries:
        key = q.text_query.lower()
        if key not in seen:
            seen.add(key)
            unique.append(q)

    return unique[:max_queries]
