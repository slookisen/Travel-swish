"""google_places.py — Google Places API (New) wrapper for Travel-Swish."""
from __future__ import annotations

import logging
import math
import os
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx

log = logging.getLogger(__name__)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.types,"
    "places.rating,places.priceLevel,places.userRatingCount,"
    "places.location,places.googleMapsUri,places.websiteUri,places.editorialSummary,"
    "places.primaryTypeDisplayName,places.primaryType"
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
    "bakery": "bakery",
    "cafe": "coffee",
    "coffee_shop": "coffee",
    "brunch_restaurant": "brunch",
    "breakfast_restaurant": "brunch",
    "fast_food_restaurant": "streetfood",
    "food_court": "food",
    "meal_delivery": "restaurants",
    "meal_takeaway": "restaurants",
    "fine_dining_restaurant": "fine",
    "bar_and_grill": "restaurants",
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
    language: str = "en",
    cache_ttl_s: int = 0,
    included_type: str | None = None,
    min_rating: float | None = None,
    price_levels: list[str] | None = None,
    bounds: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], bool]:
    """Search Google Places without persisting or prefetching Places content."""
    _ = cache_ttl_s  # Kept for backwards-compatible callers.
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY not set")

    language_code = "en" if language == "en" else "no"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {
        "textQuery": query,
        "pageSize": min(max_results, 20),
        "languageCode": language_code,
    }
    if included_type:
        body["includedType"] = included_type
        body["strictTypeFiltering"] = True
    if min_rating is not None:
        body["minRating"] = min_rating
    if price_levels:
        body["priceLevels"] = price_levels
    if bounds:
        body["locationRestriction"] = {"rectangle": bounds}

    try:
        resp = httpx.post(PLACES_URL, json=body, headers=headers, timeout=10.0)
        resp.raise_for_status()
        places = resp.json().get("places", [])
    except Exception as e:
        log.warning("google_places_search failed query=%r: %s", query, e)
        # A provider outage is not a successful search with zero matches.
        raise RuntimeError("search_provider_unavailable") from e

    items = [_normalize(p) for p in places]
    items = [i for i in items if i]
    return items, False


def resolve_destination_bounds(destination: str, language: str = "en") -> dict[str, Any] | None:
    """Resolve one geographical area per request; never persist provider content.

    Do not accept a similarly named business, ambiguous cities, or a whole country
    as a local recommendation area. A caller must fail closed if this fails.
    """
    api_key = _get_api_key()
    if not api_key:
        return None
    try:
        response = httpx.post(PLACES_URL, headers={
            "Content-Type": "application/json", "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "places.types,places.viewport",
        }, json={"textQuery": destination, "pageSize": 3, "languageCode": "en" if language == "en" else "no"}, timeout=8.0)
        response.raise_for_status()
        area_types = {"locality", "postal_town", "sublocality", "administrative_area_level_2", "administrative_area_level_1"}
        areas = [place for place in response.json().get("places", []) if set(place.get("types", [])) & area_types]
        if len(areas) != 1:
            return None
        bounds = areas[0].get("viewport", {})
        low, high = bounds["low"], bounds["high"]
        south, north = float(low["latitude"]), float(high["latitude"])
        west, east = float(low["longitude"]), float(high["longitude"])
        if not all(math.isfinite(v) for v in (south, north, west, east)):
            return None
        lon_span = (east - west) % 360
        if not (-90 <= south < north <= 90 and -180 <= west <= 180 and -180 <= east <= 180 and 0 < north - south <= 10 and 0 < lon_span <= 15):
            return None
        return {"low": {"latitude": south, "longitude": west}, "high": {"latitude": north, "longitude": east}}
    except httpx.HTTPError as exc:
        # Provider outages/authentication errors are not invalid destinations.
        raise RuntimeError("destination_provider_unavailable") from exc
    except (ValueError, KeyError, TypeError):
        log.warning("destination area could not be resolved")
        return None


def within_bounds(item: dict[str, Any], bounds: dict[str, Any]) -> bool:
    """Defensive post-filter, including missing coordinates and date-line areas."""
    try:
        lat, lng = float(item["lat"]), float(item["lng"])
        low, high = bounds["low"], bounds["high"]
        west, east = low["longitude"], high["longitude"]
        longitude_ok = west <= lng <= east if west <= east else lng >= west or lng <= east
        return math.isfinite(lat) and math.isfinite(lng) and -180 <= lng <= 180 and low["latitude"] <= lat <= high["latitude"] and longitude_ok
    except (KeyError, ValueError, TypeError):
        return False


def _normalize(place: dict[str, Any]) -> dict[str, Any] | None:
    """Convert Google Places result to Travel-Swish item format."""
    try:
        name = place.get("displayName", {}).get("text", "")
        if not name:
            return None

        primary_type = place.get("primaryTypeDisplayName", {}).get("text", "")
        primary_type_id = str(place.get("primaryType") or "")
        types = place.get("types", [])
        cat = "experiences"
        for t in ([primary_type_id] if primary_type_id else []) + types:
            if t in TYPE_TO_CAT:
                cat = TYPE_TO_CAT[t]
                break
            if t.endswith("_restaurant"):
                cat = "restaurants"
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
        if not maps_url and place.get("id"):
            maps_url = "https://www.google.com/maps/search/?" + urlencode(
                {"api": "1", "query": name, "query_place_id": str(place["id"])}
            )
        url = maps_url or website_url
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
            "primary_type_id": primary_type_id,
            "website_url": website_url,
            "maps_url": maps_url,
        }
    except Exception as e:
        log.warning("_normalize failed: %s", e)
        return None
