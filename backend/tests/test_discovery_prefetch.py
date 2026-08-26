from __future__ import annotations

from app.discovery_queries import generate_profile_search_queries
from app.prefetch import clear_for_tests, get_status, mark_failed, mark_ready, reserve, take


def test_tour_queries_apply_profile_and_request_only_filters() -> None:
    queries = generate_profile_search_queries(
        search_kind="tours",
        destination="Portugal",
        prefs={"act": 0.9, "soc": 0.7, "lux": -0.4},
        query_text="surf and hiking",
        trip_context={"party": "solo", "age_band": "30-49", "duration": "week", "budget": "value"},
        max_queries=5,
        seed=9,
    )

    rendered = " | ".join(query.query for query in queries).lower()
    assert "surf and hiking" in rendered
    assert "for solo travelers" in rendered
    assert "ages 30 to 49" in rendered
    assert "7 day" in rendered
    assert "active" in rendered
    assert all("occupation" not in query.query.lower() for query in queries)


def test_hotel_queries_use_profile_without_sensitive_trip_fields() -> None:
    queries = generate_profile_search_queries(
        search_kind="hotels",
        destination="Málaga",
        prefs={"food": 0.8, "nat": 0.6},
        query_text="quiet",
        trip_context={"age_band": "18-29", "party": "couple"},
        max_queries=4,
    )

    rendered = " | ".join(query.query for query in queries).lower()
    assert "quiet hotel" in rendered
    assert any(term in rendered for term in ("breakfast", "gastronomy", "nature", "sea view"))
    assert "ages 18" not in rendered


def test_prefetch_token_is_scoped_single_use_and_transient() -> None:
    clear_for_tests()
    token = reserve("profile-search-signature")
    assert get_status(token) == "preparing"
    assert take(token, "different-signature") == ("mismatch", None)

    mark_ready(token, {"items": [{"id": "next-1"}]})
    assert get_status(token) == "ready"
    status, payload = take(token, "profile-search-signature")
    assert status == "ready"
    assert payload == {"items": [{"id": "next-1"}]}
    assert get_status(token) == "expired"


def test_failed_prefetch_is_reported_without_payload() -> None:
    clear_for_tests()
    token = reserve("signature")
    mark_failed(token)
    assert take(token, "signature") == ("failed", None)
