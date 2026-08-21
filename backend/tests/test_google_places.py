from app.google_places import _normalize


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
