from app.google_places import _normalize
from app.places_recs import _diversify, _is_mode_appropriate


def test_normalize_prefers_canonical_google_maps_uri() -> None:
    item = _normalize({
        "id": "ChIJ-not-a-cid",
        "displayName": {"text": "Test place"},
        "formattedAddress": "Oslo",
        "types": ["museum"],
        "googleMapsUri": "https://maps.google.com/?cid=123456",
        "websiteUri": "https://example.org",
    })

    assert item is not None
    assert item["url"] == "https://maps.google.com/?cid=123456"
    assert item["website_url"] == "https://example.org"


def test_bakery_is_classified_as_food_and_rejected_from_experiences() -> None:
    item = _normalize({
        "id": "bakery-1",
        "displayName": {"text": "Morning Bun"},
        "formattedAddress": "Oslo",
        "types": ["bakery", "food_store"],
    })

    assert item is not None
    assert item["cat"] == "bakery"
    assert _is_mode_appropriate(item, "restaurants") is True
    assert _is_mode_appropriate(item, "experiences") is False


def test_specific_restaurant_type_never_falls_back_to_experiences() -> None:
    item = _normalize({
        "id": "sushi-1",
        "displayName": {"text": "Sushi Place"},
        "formattedAddress": "Oslo",
        "types": ["sushi_restaurant", "restaurant"],
    })

    assert item is not None
    assert item["cat"] == "restaurants"
    assert _is_mode_appropriate(item, "experiences") is False


def test_diversity_caps_repeated_primary_place_type() -> None:
    items = [
        {"id": f"museum-{index}", "cat": "culture", "types": ["museum"]}
        for index in range(5)
    ] + [
        {"id": "park-1", "cat": "nature", "types": ["park"]},
        {"id": "gallery-1", "cat": "culture", "types": ["art_gallery"]},
    ]

    result = _diversify(items, 6)
    assert sum(item["types"][0] == "museum" for item in result) == 2
    assert any(item["id"] == "park-1" for item in result)
