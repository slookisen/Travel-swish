from __future__ import annotations

import threading
import time

from app.google_places import _normalize
from app.places_recs import rank_places_recs


def test_google_place_exposes_official_website_and_maps_separately() -> None:
    item = _normalize(
        {
            "id": "place-1",
            "displayName": {"text": "Casa Azul"},
            "formattedAddress": "Málaga, Spain",
            "types": ["hotel", "lodging"],
            "websiteUri": "https://casa-azul.example/",
            "googleMapsUri": "https://maps.google.com/example",
            "rating": 4.7,
            "userRatingCount": 120,
        }
    )
    assert item is not None
    assert item["cat"] == "hotels"
    assert item["website_url"] == "https://casa-azul.example/"
    assert item["maps_url"] == "https://maps.google.com/example"
    assert item["url"] == item["website_url"]
    assert item["domain"] == "casa-azul.example"


def test_google_place_builds_valid_maps_fallback_with_query_and_place_id() -> None:
    item = _normalize(
        {
            "id": "place id/with spaces",
            "displayName": {"text": "Cliff & Sea"},
            "types": ["tourist_attraction"],
        }
    )
    assert item is not None
    assert "api=1" in item["maps_url"]
    assert "query=Cliff+%26+Sea" in item["maps_url"]
    assert "query_place_id=place+id%2Fwith+spaces" in item["maps_url"]


def test_places_queries_run_in_parallel_and_hotel_filter_is_strict() -> None:
    thread_ids: set[int] = set()
    lock = threading.Lock()

    def stub_search(query: str, **kwargs):
        with lock:
            thread_ids.add(threading.get_ident())
        time.sleep(0.04)
        slug = str(abs(hash(query)))
        return ([{
            "id": slug,
            "name": query,
            "url": f"https://hotel-{slug}.example",
            "website_url": f"https://hotel-{slug}.example",
            "maps_url": f"https://maps.google.com/{slug}",
            "cat": "hotels",
            "snippet": "Hotel",
            "domain": f"hotel-{slug}.example",
            "source": "google_places",
            "rating": 4.6,
            "rating_count": 100,
            "types": ["hotel", "lodging"],
        }], False)

    payload = rank_places_recs(
        user_id="u1",
        mode="experiences",
        destination="Málaga",
        prefs={"lux": 0.8, "nat": 0.5},
        search_kind="hotels",
        query_text="quiet",
        max_queries=4,
        limit=4,
        search_fn=stub_search,
    )
    assert len(thread_ids) > 1
    assert payload["provider"] == "google_places"
    assert payload["items"]
    assert all(item["cat"] == "hotels" for item in payload["items"])
