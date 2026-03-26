"""google_places.py — Google Places API (New) wrapper for Travel-Swish."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any

import httpx

from .db_cache import cache_get, cache_set

log = logging.getLogger(__name__)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.types,"
    "places.rating,places.priceLevel,places.userRatingCount,"
    "places.location,places.websiteUri,places.editorialSummary,"
    "places.primaryTypeDisplayName"
)

# Map Google place types to our internal categories.
TYPE_TO_CAT = {
    "museum": "culture",
    "art_gallery": "culture",
    "tourist_attraction": "culture",
    "historic_site": "culture",
    "church": "culture",
    "park": "nature",
    "hiking_area": "nature",
    "national_park": "nature",
    "beach": "nature",
    "restaurant": "restaurants",
    "cafe": "coffee",
    "bar": "nightlife",
    "night_club": "nightlife",
    "spa": "wellness",
    "shopping_mall": "shopping",
    "market": "food",
    "food_market": "food",
    "amusement_park": "experiences",
    "aquarium": "experiences",
    "zoo": "experiences",
    "stadium": "experiences",
    "performing_arts_theater": "culture",
}


def _get_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY")


def _cache_key(query: str, max_results: int) -> str:
    raw = f"{query}|{max_results}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def google_places_search(
    query: str,
    *,
    max_results: int = 10,
    cache_ttl_s: int = 3600,
) -> tuple[list[dict[str, Any]], bool]:
    """Search Google Places and return normalized items + cache_hit flag."""
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY not set")

    ck = _cache_key(query, max_results)
    now = int(time.time())

    cached = cache_get(namespace="google_places", key=ck, now=now)
    if cached:
        try:
            return json.loads(cached["payload"]), True
        except Exception:
            pass

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "maxResultCount": min(max_results, 20),
        "languageCode": "en",
    }

    try:
        resp = httpx.post(PLACES_URL, json=body, headers=headers, timeout=10.0)
        resp.raise_for_status()
        places = resp.json().get("places", [])
    except Exception as e:
        log.warning("google_places_search failed query=%r: %s", query, e)
        return [], False

    items = [_normalize(p) for p in places]
    items = [i for i in items if i]
    cache_set(namespace="google_places", key=ck, payload=json.dumps(items), ttl_s=cache_ttl_s, now=now)
    return items, False


def _normalize(place: dict[str, Any]) -> dict[str, Any] | None:
    """Convert Google Places result to Travel-Swish item format."""
    try:
        name = place.get("displayName", {}).get("text", "")
        if not name:
            return None

        primary_type = place.get("primaryTypeDisplayName", {}).get("text", "")
        types = place.get("types", [])
        cat = "experiences"
        for t in types:
            if t in TYPE_TO_CAT:
                cat = TYPE_TO_CAT[t]
                break

        summary = place.get("editorialSummary", {}).get("text", "")
        address = place.get("formattedAddress", "")
        snippet = summary or address

        loc = place.get("location", {})
        lat = loc.get("latitude")
        lng = loc.get("longitude")

        rating = place.get("rating")
        rating_count = place.get("userRatingCount", 0)
        price_level = place.get("priceLevel", "")

        url = place.get("websiteUri", "")
        if not url:
            place_id = place.get("id", "")
            if place_id:
                url = f"https://maps.google.com/?cid={place_id}"

        return {
            "id": place.get("id", ""),
            "name": name,
            "url": url,
            "cat": cat,
            "snippet": snippet,
            "domain": "maps.google.com",
            "source": "google_places",
            "lat": lat,
            "lng": lng,
            "rating": rating,
            "rating_count": rating_count,
            "price_level": price_level,
            "types": types,
            "primary_type": primary_type,
        }
    except Exception as e:
        log.warning("_normalize failed: %s", e)
        return None
