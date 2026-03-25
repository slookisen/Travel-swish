# COWORK TS11: Map — Fix "No GPS Results" + Geocoding Fallback

## Context
Files:
- `src/App.tsx` — `LeafletMap` component (~line 1380), `MapView` component
- `backend/app/web_recs.py` — builds items returned to frontend

## Problem
When users tap "Kart" in results, they see "Ingen GPS-resultater" because Brave Search results don't include `lat`/`lng` coordinates. The frontend checks `item.lat && item.lng` to determine valid map items, and gets none.

## Fix

### Part 1: Backend — geocode results using OpenStreetMap Nominatim (free, no API key)
In `web_recs.py`, after building the final ranked list but before returning, attempt to add coordinates using Nominatim.

```python
import urllib.request

def geocode_nominatim(name: str, destination: str) -> tuple[float, float] | None:
    """Best-effort geocode using Nominatim. Returns (lat, lng) or None."""
    query = f"{name}, {destination}"
    url = (
        "https://nominatim.openstreetmap.org/search"
        f"?q={urllib.parse.quote(query)}&format=json&limit=1"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "travel-swish/0.1"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None
```

**Important constraints:**
- Only geocode if item doesn't already have coordinates
- Max 5 geocode calls per request (to stay within Nominatim's 1 req/sec limit)
- Cache geocode results in the SQLite DB (namespace=`"geocode"`, TTL=30 days) using existing `cache_get`/`cache_set` from `db_cache.py`
- If geocoding fails or times out, item is still returned — just without coordinates

Add `lat: float | None = None` and `lng: float | None = None` to the item dict.

### Part 2: Frontend — graceful map fallback
In `src/App.tsx`, the `LeafletMap` component:

When `validItems.length === 0` (no coords), instead of showing "Ingen GPS-resultater og vis ikke", show:
```
🗺️ Kartet er tomt denne gang.
Koordinater mangler for disse stedene, men du kan åpne hvert sted i Google Maps via listen.
```

Also add a "Åpne i Maps"-button to each result card in the list view that links to `googleMapsSearchUrl(name, destination)` — this is already defined in `App.tsx`. Make sure it's visible and well-sized (min 44px touch target).

### Part 3: Frontend — map centering
When `validItems.length > 0`, center the map on the destination city (not the first item). Use Nominatim geocoding from the frontend (one call for the destination name):

```ts
async function geocodeDestination(dest: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dest)}&format=json&limit=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'travel-swish/0.1' } });
    const d = await r.json();
    if (d[0]) return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
  } catch {}
  return null;
}
```

Use this in `LeafletMap` to set `map.setView([lat, lng], 13)` on load.

## DoD
- [ ] Backend geocodes up to 5 items per request, cached in SQLite
- [ ] Items with coords show on map correctly
- [ ] Map centered on destination, not first result
- [ ] When no coords: friendly message + Open in Maps buttons on each result card
- [ ] Open in Maps button visible on mobile (≥44px touch target)
- [ ] No performance regression (geocoding is async, cached, capped)
- [ ] `pytest backend/` passes
- [ ] `npm run build` passes
