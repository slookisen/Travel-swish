"""Regressions discovered with real production requests, not just health checks."""
import httpx
import pytest

from app.google_places import _normalize, google_places_search
from app.places_recs import DestinationProviderUnavailable, _is_mode_appropriate, rank_places_recs
from app.query_builder import build_queries


@pytest.mark.parametrize("budget", ["value", "premium", None])
@pytest.mark.parametrize("kind", ["experiences", "hotels"])
def test_unsupported_places_never_receive_restaurant_price_filter(budget, kind):
    queries = build_queries(destination="Oslo", mode="experiences", search_kind=kind,
                            prefs={"nat": .8, "lux": .9},
                            taste={"cats": {"nature": .8}, "context": {"budget": budget}})
    assert queries
    assert all(query.price_levels is None for query in queries)
    if kind == "hotels" and budget == "value":
        assert all("good value" in query.text_query for query in queries)


def test_default_value_budget_still_returns_free_experiences():
    def provider(query, **kwargs):
        # Real Google behavior: unsupported types disappear with priceLevels.
        if kwargs.get("price_levels"):
            return [], False
        return [{"id": "park", "name": "Park", "cat": "nature", "types": ["park"]}], False

    result = rank_places_recs(user_id="qa", mode="experiences", destination="Oslo", prefs={"nat": .8},
                             taste={"context": {"budget": "value"}}, search_fn=provider, require_bounds=False)
    assert [item["id"] for item in result["items"]] == ["park"]


def test_food_queries_do_not_spend_requests_on_non_food_types():
    queries = build_queries(destination="Malaga", mode="restaurants", prefs={"food": .9, "soc": .8, "night": .7},
                            taste={"cats": {"social": .9, "nightlife": .8}, "context": {"budget": "value"}})
    assert queries
    assert all(query.included_type not in {"cultural_center", "event_venue", "night_club", "bar"} for query in queries)
    assert any(query.price_levels for query in queries)
    assert not _is_mode_appropriate({"cat": "nightlife", "types": ["night_club"]}, "restaurants")
    assert _is_mode_appropriate({"cat": "nightlife", "types": ["bar", "restaurant"]}, "restaurants")


def test_provider_receives_strict_type_and_primary_category_is_authoritative(monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    calls = []

    def post(url, **kwargs):
        calls.append(kwargs)
        return httpx.Response(200, json={"places": []}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", post)
    google_places_search("hotel Lisbon", included_type="hotel")
    assert calls[0]["json"]["strictTypeFiltering"] is True
    assert "places.primaryType" in calls[0]["headers"]["X-Goog-FieldMask"].split(",")
    item = _normalize({"id": "hotel", "displayName": {"text": "Hotel"}, "primaryType": "hotel",
                       "types": ["restaurant", "spa", "hotel", "lodging"]})
    assert item["cat"] == "hotels"


@pytest.mark.parametrize("status", [400, 403, 429, 503])
def test_provider_errors_are_not_empty_success(monkeypatch, status):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(status, json={}, request=httpx.Request("POST", url)))
    with pytest.raises(RuntimeError, match="search_provider_unavailable"):
        google_places_search("park Oslo")


def test_all_queries_failing_is_service_error_but_partial_success_is_usable():
    def provider(query, **kwargs):
        raise RuntimeError("search_provider_unavailable")

    args = dict(user_id="qa", mode="experiences", destination="Oslo", prefs={}, require_bounds=False)
    with pytest.raises(DestinationProviderUnavailable):
        rank_places_recs(**args, search_fn=provider)

    def partial(query, **kwargs):
        if "top attractions" not in query:
            raise RuntimeError("search_provider_unavailable")
        return [{"id": "park", "name": "Park", "cat": "nature", "types": ["park"]}], False

    assert len(rank_places_recs(**args, search_fn=partial)["items"]) == 1
    # A successful provider response with no places really is an empty search.
    assert rank_places_recs(**args, search_fn=lambda *a, **kw: ([], False))["items"] == []
