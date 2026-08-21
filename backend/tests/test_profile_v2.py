from __future__ import annotations

from app.query_builder import build_queries
from app.scorer import build_why, score_item
from app.web_recs import _apply_trip_context
from app.query_gen import GeneratedQuery


def test_trip_budget_overrides_durable_luxury_for_places_queries() -> None:
    queries = build_queries(
        destination="Lisbon",
        mode="restaurants",
        prefs={"lux": 0.9, "food": 0.8},
        taste={
            "cats": {"food": 0.8},
            "context": {"budget": "value", "party": "couple", "pace": "slow", "discovery": "hidden"},
        },
        max_queries=3,
        seed=7,
    )

    assert queries
    assert all(q.price_levels == ["PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE"] for q in queries)
    assert all("local hidden gem" in q.text_query for q in queries)


def test_experience_queries_keep_food_taste_but_exclude_food_venues() -> None:
    queries = build_queries(
        destination="Oslo",
        mode="experiences",
        prefs={"food": 0.9, "lux": 0.8},
        taste={"cats": {"food": 0.9, "luxury": 0.8}, "context": {}},
        max_queries=6,
        seed=3,
    )

    assert queries
    assert all(q.included_type not in {"bakery", "cafe", "restaurant", "fine_dining_restaurant"} for q in queries)
    assert all("restaurant" not in q.text_query.lower() for q in queries)


def test_supported_destination_gets_a_country_hint() -> None:
    queries = build_queries(
        destination="Malaga",
        mode="experiences",
        prefs={"nat": 0.8},
        taste={"cats": {"nature": 0.8}, "context": {}},
        max_queries=2,
        seed=2,
    )

    assert queries
    assert all("Málaga, Spain" in query.text_query for query in queries)


def test_hidden_gem_context_changes_score_and_explanation() -> None:
    item = {
        "types": ["museum"],
        "cat": "culture",
        "rating": 4.7,
        "rating_count": 220,
        "price_level": "PRICE_LEVEL_MODERATE",
    }
    prefs = {"cul": 0.8}
    plain = score_item(item, prefs, None)
    contextual = score_item(item, prefs, {"context": {"discovery": "hidden", "budget": "value"}})

    assert contextual > plain
    assert "hidden-gem brief" in build_why(item, prefs, {"context": {"discovery": "hidden"}})


def test_brave_queries_receive_trip_context_without_mutating_original() -> None:
    original = GeneratedQuery(query="museum Lisbon", weight=1.0, source="cul", negatives=[])
    contextual = _apply_trip_context(
        [original],
        {"context": {"party": "family", "budget": "value", "discovery": "icons"}},
    )

    assert original.query == "museum Lisbon"
    assert contextual[0].query.startswith("family friendly good value iconic")
    assert "adults only" in contextual[0].negatives
