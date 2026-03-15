from __future__ import annotations

import hashlib
import os
import random
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import httpx

# Brave Search API docs: https://api.search.brave.com/app/documentation/web-search/get-started
_BRAVE_WEB_URL = "https://api.search.brave.com/res/v1/web/search"


def _get_brave_api_key() -> str | None:
    """Resolve Brave API key from env.

    Prefer OpenClaw-provided env (if present), but also support TS_BRAVE_API_KEY.
    """
    return (
        os.getenv("BRAVE_SEARCH_API_KEY")
        or os.getenv("BRAVE_API_KEY")
        or os.getenv("OPENCLAW_BRAVE_API_KEY")
        or os.getenv("TS_BRAVE_API_KEY")
    )


@dataclass(frozen=True)
class CacheEntry:
    expires_at: float
    payload: List[Dict[str, Any]]


# Minimal in-memory cache stub (process-local, resets on reload)
_CACHE: Dict[str, CacheEntry] = {}


def _cache_key(q: str, count: int, country: str | None, search_lang: str | None, safesearch: str, freshness: str | None) -> str:
    raw = f"q={q}\ncount={count}\ncountry={country}\nlang={search_lang}\nsafesearch={safesearch}\nfreshness={freshness}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _stable_id_from_url(url: str) -> str:
    h = hashlib.sha1((url or "").encode("utf-8")).hexdigest()[:16]
    return f"brave:{h}"


def brave_web_search(
    *,
    q: str,
    count: int = 10,
    country: str | None = None,
    search_lang: str | None = None,
    safesearch: str = "moderate",
    freshness: str | None = None,
    timeout_s: float = 10.0,
    max_retries: int = 3,
    cache_ttl_s: int = 300,
) -> Tuple[List[Dict[str, Any]], bool]:
    """Call Brave Web Search API.

    Returns (items, cached).

    Normalized item shape (RecItem-like + fields we need downstream):
      {id,name,url,cat,why,match,source,snippet}
    """

    q = (q or "").strip()
    if not q:
        return ([], False)

    count = max(1, min(20, int(count)))

    ck = _cache_key(q, count, country, search_lang, safesearch, freshness)
    now = time.time()
    ent = _CACHE.get(ck)
    if ent and ent.expires_at > now:
        return (ent.payload, True)

    api_key = _get_brave_api_key()
    if not api_key:
        raise RuntimeError(
            "Brave API key missing. Set one of BRAVE_SEARCH_API_KEY / BRAVE_API_KEY / OPENCLAW_BRAVE_API_KEY / TS_BRAVE_API_KEY"
        )

    headers = {
        "Accept": "application/json",
        "X-Subscription-Token": api_key,
        "User-Agent": "travel-swish-backend/0.1",
    }

    params: Dict[str, Any] = {
        "q": q,
        "count": count,
        "safesearch": safesearch,
    }
    if country:
        params["country"] = country
    if search_lang:
        params["search_lang"] = search_lang
    if freshness:
        params["freshness"] = freshness

    timeout = httpx.Timeout(timeout_s, connect=min(5.0, timeout_s))

    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.get(_BRAVE_WEB_URL, headers=headers, params=params)

            # Retry on transient errors
            if resp.status_code == 429 or 500 <= resp.status_code <= 599:
                retry_after = resp.headers.get("Retry-After")
                if retry_after:
                    try:
                        sleep_s = float(retry_after)
                    except Exception:
                        sleep_s = 0.0
                else:
                    # exponential backoff with jitter
                    sleep_s = (0.6 * (2**attempt)) + random.random() * 0.25
                time.sleep(min(6.0, max(0.0, sleep_s)))
                continue

            resp.raise_for_status()
            data = resp.json() if resp.content else {}

            results = ((data or {}).get("web") or {}).get("results") or []
            items: List[Dict[str, Any]] = []
            for i, r in enumerate(results):
                url = (r or {}).get("url") or ""
                title = (r or {}).get("title") or url or ""
                desc = (r or {}).get("description") or ""

                items.append(
                    {
                        "id": _stable_id_from_url(url or title),
                        "name": title,
                        "url": url,
                        "cat": "web",
                        "why": f"Brave web search result (rank {i + 1})",
                        "match": 0.0,
                        "source": "brave",
                        "snippet": desc,
                    }
                )

            # cache (even empty) to avoid hammering
            _CACHE[ck] = CacheEntry(expires_at=now + max(1, cache_ttl_s), payload=items)
            return (items, False)

        except Exception as e:  # noqa: BLE001 - boundary layer
            last_err = e
            # exponential backoff with jitter
            sleep_s = (0.6 * (2**attempt)) + random.random() * 0.25
            time.sleep(min(6.0, sleep_s))

    # raise the last error after retries
    raise last_err or RuntimeError("Brave search failed")
