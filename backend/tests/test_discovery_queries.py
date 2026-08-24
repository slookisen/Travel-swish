from __future__ import annotations

from app.discovery_queries import generate_profile_search_queries


def test_hotel_queries_use_profile_and_free_text() -> None:
    queries = generate_profile_search_queries(
        search_kind="hotels",
        destination="Málaga",
        prefs={"lux": 0.9, "nat": 0.7},
        query_text="quiet pool",
        max_queries=5,
        seed=7,
    )
    text = " | ".join(query.query.lower() for query in queries)
    assert "málaga" in text
    assert "quiet pool" in text
    assert any(term in text for term in ("luxury", "spa", "design", "eco lodge", "scenic", "nature"))


def test_tour_queries_include_only_selected_trip_context() -> None:
    queries = generate_profile_search_queries(
        search_kind="tours",
        destination="Portugal",
        prefs={"soc": 0.8, "act": 0.6},
        query_text="coastal hiking",
        trip_context={"party": "solo", "age_band": "30-49", "duration": "week", "budget": "midrange"},
        max_queries=4,
        seed=9,
    )
    text = " | ".join(query.query.lower() for query in queries)
    assert "coastal hiking" in text
    assert "solo travelers" in text
    assert "ages 30 to 49" in text
    assert "7 day" in text
    assert "mid range" in text


def test_unknown_context_values_are_ignored() -> None:
    queries = generate_profile_search_queries(
        search_kind="tours",
        destination="Oslo",
        prefs={},
        trip_context={"party": "unexpected-value", "occupation": "doctor"},
        max_queries=2,
    )
    text = " | ".join(query.query.lower() for query in queries)
    assert "unexpected-value" not in text
    assert "doctor" not in text
