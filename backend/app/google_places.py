"""google_places.py — Google Places API (New) wrapper for Travel-Swish."""
from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx

log = logging.getLogger(__name__)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.types,"
    "places.rating,places.priceLevel,places.userRatingCount,"
    "places.location,places.websiteUri,places.editorialSummary,"
    "places.primaryTypeDisplayName,places.googleMapsUri"
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
    "hotel": "hotels",
    "lodging": "hotels",
    "resort_hotel": "hotels",
    "hostel": "hotels",
    "bed_and_breakfast": "hotels",
    "guest_house": "hotels",
    "inn": "hotels",
    "motel": "hotels",
}


def _get_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY")


def google_places_search(
    query: str,
    *,
    max_results: int = 10,
    cache_ttl_s: int = 0,
    included_type: str | None = None,
    min_rating: float | None = None,
    price_levels: list[str] | None = None,
    language_code: str = "en",
) -> tuple[list[dict[str, Any]], bool]:
    """Search Google Places and return normalized items.

    Places content is deliberately not prefetched or cached. Google permits
    durable storage of place IDs, but not general Places content. The unused
    ``cache_ttl_s`` argument remains for backwards-compatible callers.
    """
    _ = cache_ttl_s
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY not set")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "maxResultCount": min(max_results, 20),
        "languageCode": language_code if language_code in {"en", "no", "sv"} else "en",
    }
    if included_type:
        body["includedType"] = included_type
    if min_rating is not None:
        body["minRating"] = min_rating
    if price_levels:
        body["priceLevels"] = price_levels

    try:
        resp = httpx.post(PLACES_URL, json=body, headers=headers, timeout=10.0)
        resp.raise_for_status()
        places = resp.json().get("places", [])
    except Exception as e:
        log.warning("google_places_search failed query=%r: %s", query, e)
        return [], False

    items = [_normalize(p) for p in places]
    items = [i for i in items if i]
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

        website_url = str(place.get("websiteUri") or "")
        maps_url = str(place.get("googleMapsUri") or "")
        if not maps_url:
            place_id = place.get("id", "")
            if place_id:
                maps_url = "https://www.google.com/maps/search/?" + urlencode(
                    {"api": "1", "query": name, "query_place_id": place_id}
                )
        url = website_url or maps_url
        domain = ""
        if website_url:
            try:
                domain = urlparse(website_url).netloc.lower().removeprefix("www.")
            except Exception:
                domain = ""

        return {
            "id": place.get("id", ""),
            "name": name,
            "url": url,
            "website_url": website_url,
            "maps_url": maps_url,
            "cat": cat,
            "snippet": snippet,
            "domain": domain,
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
