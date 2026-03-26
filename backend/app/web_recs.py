from __future__ import annotations

"""web_recs.py — Web recommendation ranking using Brave results + learned prefs.

Flow:
- Load prefs (done in main.py)
- Generate diverse queries from prefs × destination × mode (query_gen.generate_queries)
- Call Brave web search for each query (brave_search.brave_web_search)
- Normalize + de-dup results
- Score results against prefs using simple keyword/facet matching + explainability
- Apply diversity constraints (domain + category round-robin)

This is a pragmatic first cut for the Brave demo MVP. It aims to be:
- deterministic-ish (seeded query ordering)
- cost-controlled (small query count, per-query count, and caching)
- explainable (why string references top contributing facets)
"""

import hashlib
import json
import os
import re
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from .algo import format_why
from .brave_search import brave_web_search
from .db_cache import cache_get, cache_set
from .query_gen import GeneratedQuery, generate_queries, to_search_string


@dataclass(frozen=True)
class WebRecsCacheEntry:
    expires_at: float
    payload: Dict[str, Any]


_WEB_RECS_CACHE: Dict[str, WebRecsCacheEntry] = {}


def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def _env_int(name: str, default: int) -> int:
    try:
        return int(str(os.getenv(name) or "").strip() or default)
    except Exception:
        return int(default)


def _prefs_hash(prefs: Mapping[str, Any]) -> str:
    try:
        raw = json.dumps(prefs or {}, sort_keys=True, ensure_ascii=False)
    except Exception:
        raw = str(prefs)
    return _sha1(raw)


def _cache_key(
    user_id: str,
    mode: str,
    destination: str,
    prefs: Mapping[str, Any],
    limit: int,
    max_queries: int,
    per_query: int,
    seed: int,
    country: str | None,
    search_lang: str | None,
    freshness: str | None,
    safesearch: str,
) -> str:
    raw = "\n".join(
        [
            f"u={user_id}",
            f"m={mode}",
            f"d={destination.lower().strip()}",
            f"ph={_prefs_hash(prefs)}",
            f"limit={limit}",
            f"maxq={max_queries}",
            f"perq={per_query}",
            f"seed={seed}",
            f"country={country}",
            f"lang={search_lang}",
            f"fresh={freshness}",
            f"safe={safesearch}",
        ]
    )
    return _sha1(raw)


_TRACKING_QS_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "mc_cid",
    "mc_eid",
}


def canonical_url(url: str) -> str:
    """Normalize URL for dedup.

    - lower-case scheme/host
    - remove fragment
    - strip common tracking query params
    """

    url = (url or "").strip()
    if not url:
        return ""
    try:
        p = urlparse(url)
        scheme = (p.scheme or "https").lower()
        netloc = (p.netloc or "").lower()
        path = p.path or ""
        # remove tracking QS keys
        qs = [(k, v) for (k, v) in parse_qsl(p.query, keep_blank_values=True) if k not in _TRACKING_QS_KEYS]
        query = urlencode(qs, doseq=True)
        return urlunparse((scheme, netloc, path, "", query, ""))
    except Exception:
        return url


def domain_from_url(url: str) -> str:
    url = canonical_url(url)
    if not url:
        return ""
    try:
        netloc = urlparse(url).netloc.lower()
        return netloc[4:] if netloc.startswith("www.") else netloc
    except Exception:
        return ""


_WORD_SPLIT_RE = re.compile(r"[\s._\-/]+")


def _facet_tokens(facet: str) -> List[str]:
    """Convert facet id into tokens we can match in text."""

    facet = (facet or "").strip().lower()
    if not facet:
        return []
    # prefer the last dotted segment
    last = facet.split(".")[-1]
    toks = [t for t in _WORD_SPLIT_RE.split(last) if t]
    return toks[:4]


# Small expansion dictionary (covers common Travel-Swish facets).
_FACET_EXPANSIONS: Dict[str, List[str]] = {
    "spicy": ["spicy", "hot", "chili", "curry"],
    "seafood": ["seafood", "fish", "sushi", "oyster"],
    "bbq": ["bbq", "barbecue", "smokehouse", "grill"],
    "coffee": ["coffee", "espresso", "roastery", "cafe"],
    "brunch": ["brunch", "breakfast", "pancake", "eggs benedict"],
    "culture": ["museum", "gallery", "heritage", "historic"],
    "nature": ["hike", "trail", "park", "nature"],
    "nightlife": ["bar", "club", "nightlife", "rooftop"],
    "luxury": ["luxury", "vip", "fine dining", "michelin"],
    "local": ["local", "where locals", "hidden gem", "authentic"],
    "streetfood": ["street food", "food stall", "night market", "hawker"],
    "fine": ["fine dining", "michelin", "tasting menu"],
}


def facet_keywords(facet: str) -> List[str]:
    """Keyword list for a facet id.

    Uses:
    - expansion dict for known facets
    - tokens from the facet id itself
    """

    facet = (facet or "").strip()
    if not facet:
        return []

    low = facet.lower()
    last = low.split(".")[-1]

    kws: List[str] = []

    # expansions by suffix match
    for k, ex in _FACET_EXPANSIONS.items():
        if last == k or last.endswith("_" + k) or last.endswith("-" + k) or last.endswith(k):
            kws.extend(ex)
            break

    # add token-based fallback
    toks = _facet_tokens(facet)
    if toks:
        # join multi-token phrases too
        kws.extend(toks)
        if len(toks) >= 2:
            kws.append(" ".join(toks[:2]))

    # dedup, keep order
    out: List[str] = []
    seen = set()
    for kw in kws:
        kw = (kw or "").strip().lower()
        if not kw or kw in seen:
            continue
        out.append(kw)
        seen.add(kw)

    return out[:10]


def _count_keyword_hits(text: str, keywords: Sequence[str]) -> int:
    if not text or not keywords:
        return 0
    hits = 0
    for kw in keywords:
        if not kw:
            continue
        # phrase match with word boundaries for single tokens
        if " " in kw:
            if kw in text:
                hits += 1
        else:
            if re.search(rf"\b{re.escape(kw)}\b", text):
                hits += 1
    return hits


def _infer_category(text: str, mode: str) -> str:
    """Coarse category heuristics for additional diversity."""

    t = (text or "").lower()
    if mode == "restaurants":
        if any(w in t for w in ["cafe", "coffee", "roastery", "espresso"]):
            return "coffee"
        if any(w in t for w in ["brunch", "breakfast"]):
            return "brunch"
        if any(w in t for w in ["bbq", "barbecue", "smokehouse"]):
            return "bbq"
        if any(w in t for w in ["street food", "night market", "hawker"]):
            return "streetfood"
        if any(w in t for w in ["michelin", "fine dining", "tasting menu"]):
            return "fine"
        return "restaurants"

    # experiences
    if any(w in t for w in ["museum", "gallery", "historic", "heritage"]):
        return "culture"
    if any(w in t for w in ["hike", "trail", "national park", "waterfall"]):
        return "nature"
    if any(w in t for w in ["bar", "club", "nightlife", "pub crawl"]):
        return "nightlife"
    return "experiences"


def diversify_web(
    items: List[Dict[str, Any]],
    *,
    limit: int,
    max_per_domain: int = 2,
) -> List[Dict[str, Any]]:
    """Diversity pass: round-robin by category, while enforcing per-domain caps."""

    limit = max(1, min(200, int(limit)))
    max_per_domain = max(1, min(10, int(max_per_domain)))

    buckets: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()
    for it in items:
        cat = it.get("cat") or "_uncategorized"
        buckets.setdefault(cat, []).append(it)

    picked: List[Dict[str, Any]] = []
    domain_counts: Dict[str, int] = {}

    # safeguard against infinite loops when all remaining items violate domain cap
    safety = 0
    while len(picked) < limit and buckets and safety < 5000:
        safety += 1
        progressed = False

        for cat in list(buckets.keys()):
            if len(picked) >= limit:
                break

            bucket = buckets.get(cat) or []
            if not bucket:
                buckets.pop(cat, None)
                continue

            it = bucket.pop(0)
            dom = it.get("domain") or ""

            if dom and domain_counts.get(dom, 0) >= max_per_domain:
                # push to end; maybe later after other picks
                bucket.append(it)
            else:
                picked.append(it)
                if dom:
                    domain_counts[dom] = domain_counts.get(dom, 0) + 1
                progressed = True

            if not bucket:
                buckets.pop(cat, None)

        if not progressed:
            # cannot make progress due to caps; relax by allowing one more per domain
            max_per_domain += 1

    return picked




# Domains and title/snippet patterns that are consistently non-actionable for place recs.
BLOCKED_DOMAINS = {
    "insuremytrip.com",
    "worldnomads.com",
    "safety.com",
    "travel.state.gov",
    "smartraveller.gov.au",
    "gov.uk",
    "reddit.com",
    "quora.com",
    "tripadvisor.com",
    "ricksteves.com",  # travel forum/articles, not specific venues
    "lonelyplanet.com",
    "fodors.com",
    "frommers.com",
    "roughguides.com",
    "nomadicmatt.com",
    "theguardian.com",
    "nytimes.com",
    "timeout.com",  # listicle site
    "thepointsguy.com",
    "travelandleisure.com",
}

# Only block clearly harmful/useless content — keep it narrow to avoid over-filtering
BLOCKED_TITLE_PATTERNS = [
    r"scam",
    r"fraud",
    r"tourist trap",
    r"\btourist traps\b",
    r"how to stay safe",
    r"travel insurance",
    r"travel safety",
    r"\bdangerous\b",
    r"worst.*travel",
    r"travel.*worst",
    r"travel forum",
    r"travel community",
    r"\bforum\b",
    r"\bcommunity\b.*discuss",
    r"ultimate guide",
    r"complete guide",
    r"everything you need to know",
]


def _is_blocked_domain(domain: str) -> bool:
    d = (domain or "").lower().strip()
    if not d:
        return False
    return any(d == bd or d.endswith("." + bd) for bd in BLOCKED_DOMAINS)


def _is_junk_result(item: Mapping[str, Any]) -> bool:
    domain = str(item.get("domain") or "").lower()
    if _is_blocked_domain(domain):
        return True

    title = str(item.get("name") or "").lower()
    snippet = str(item.get("snippet") or "").lower()
    combined = f"{title} {snippet}"

    for pattern in BLOCKED_TITLE_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True
    return False


SearchFn = Callable[..., Tuple[List[Dict[str, Any]], bool]]


def rank_web_recs(
    *,
    user_id: str,
    mode: str,
    destination: str,
    prefs: Mapping[str, Any],
    limit: int = 20,
    max_queries: int = 5,
    per_query: int = 7,
    seed: int = 42,
    country: str | None = None,
    search_lang: str | None = None,
    freshness: str | None = None,
    safesearch: str = "moderate",
    cache_ttl_s: int = 120,
    search_timeout_s: float = 8.0,
    search_max_retries: int = 2,
    rate_limit_key: str | None = None,
    search_fn: SearchFn = brave_web_search,
) -> Dict[str, Any]:
    """Return ranked web recs payload.

    Output dict shape matches WebRecsResponse.
    """

    limit = max(1, min(200, int(limit)))
    max_queries = max(1, min(10, int(max_queries)))
    per_query = max(1, min(20, int(per_query)))

    # Allow env override for caching in deployed demos.
    cache_ttl_s = _env_int("TS_WEB_RECS_CACHE_TTL_S", int(cache_ttl_s))

    ck = _cache_key(
        user_id,
        mode,
        destination,
        prefs,
        limit,
        max_queries,
        per_query,
        seed,
        country,
        search_lang,
        freshness,
        safesearch,
    )
    now = time.time()
    ent = _WEB_RECS_CACHE.get(ck)
    if ent and ent.expires_at > now:
        payload = dict(ent.payload)
        payload["cached"] = True
        return payload

    # Optional persistence layer (SQLite) to survive reloads.
    db_hit = cache_get(namespace="web_recs", key=ck, now=int(now))
    if db_hit:
        payload0, expires_ts = db_hit
        payload = dict(payload0 or {})
        payload["cached"] = True
        _WEB_RECS_CACHE[ck] = WebRecsCacheEntry(expires_at=float(expires_ts), payload=payload)
        return payload

    gqs: List[GeneratedQuery] = generate_queries(
        mode,
        destination,
        prefs,
        max_queries=max_queries,
        seed=seed,
    )

    # collect raw results (annotated by query source)
    raw: List[Dict[str, Any]] = []
    for gq in gqs:
        q = to_search_string(gq)
        items, _cached = search_fn(
            q=q,
            count=per_query,
            country=country,
            search_lang=search_lang,
            safesearch=safesearch,
            freshness=freshness,
            timeout_s=search_timeout_s,
            max_retries=search_max_retries,
            cache_ttl_s=300,
            rate_limit_key=rate_limit_key,
        )
        for i, it in enumerate(items):
            it2 = dict(it)
            it2["query"] = q
            it2["query_source"] = gq.source
            it2["query_weight"] = float(gq.weight)
            it2["query_rank"] = i + 1
            it2["domain"] = domain_from_url(it2.get("url") or "")
            raw.append(it2)

    # remove known junk (scam/warning/listicle pages) before scoring
    raw = [item for item in raw if not _is_junk_result(item)]

    # de-dup by canonical URL
    deduped: Dict[str, Dict[str, Any]] = {}
    for it in raw:
        url = it.get("url") or ""
        key = canonical_url(url) or (it.get("id") or it.get("name") or "")
        if not key:
            continue
        prev = deduped.get(key)
        if not prev:
            deduped[key] = it
        else:
            # merge: keep richer snippet, keep best query weight / earliest rank
            if (len(it.get("snippet") or "") > len(prev.get("snippet") or "")):
                prev["snippet"] = it.get("snippet")
            # keep a combined source label set
            prev_sources = set(str(prev.get("query_source") or "").split("|"))
            prev_sources.discard("")
            prev_sources.add(str(it.get("query_source") or ""))
            prev["query_source"] = "|".join(sorted(prev_sources))
            prev["query_weight"] = max(float(prev.get("query_weight") or 0.0), float(it.get("query_weight") or 0.0))
            prev["query_rank"] = min(int(prev.get("query_rank") or 999), int(it.get("query_rank") or 999))

    items2: List[Dict[str, Any]] = list(deduped.values())

    # scoring
    scored: List[Dict[str, Any]] = []
    for it in items2:
        title = str(it.get("name") or "")
        snippet = str(it.get("snippet") or "")
        text = f"{title} {snippet}".lower()

        contributions: List[Tuple[str, float]] = []
        score = 0.0

        # keyword/facet matching contributions
        for facet, w in (prefs or {}).items():
            try:
                w = float(w)
            except Exception:
                continue
            if w == 0.0:
                continue

            kws = facet_keywords(str(facet))
            hits = _count_keyword_hits(text, kws)
            if hits <= 0:
                continue

            # convert hit-count to a soft tag-value in [0.6..1.2]
            tv = min(1.2, 0.6 + 0.2 * hits)
            contrib = float(w) * tv
            score += contrib
            contributions.append((str(facet), contrib))

        # query-driven boost (even if facet keyword matching is weak)
        q_w = float(it.get("query_weight") or 0.0)
        q_rank = int(it.get("query_rank") or 999)
        rank_boost = max(0.0, 1.0 - (q_rank - 1) / max(1.0, float(per_query)))

        # Keep boosts bounded and interpretable
        score += 0.25 * q_w + 0.10 * rank_boost

        match = 50.0 + score * 50.0
        match = max(0.0, min(100.0, match))

        # category: use query_source when available, but fall back to heuristic
        cat = (it.get("query_source") or "").split("|")[0] or _infer_category(text, mode)

        it_out = {
            "id": str(it.get("id") or ""),
            "name": title,
            "url": str(it.get("url") or ""),
            "cat": str(cat),
            "match": float(round(match, 2)),
            "why": format_why(contributions, top_n=5),
            "source": str(it.get("source") or "brave"),
            "snippet": snippet,
            "domain": str(it.get("domain") or ""),
            "query_source": str(it.get("query_source") or ""),
        }
        scored.append(it_out)

    scored.sort(key=lambda x: float(x.get("match") or 0.0), reverse=True)

    # quality floor: relax when prefs are sparse (user hasn't swiped much yet)
    has_prefs = any(abs(float(v)) > 0.1 for v in (prefs or {}).values() if isinstance(v, (int, float)))
    quality_floor = 45.0 if has_prefs else 30.0
    quality_filtered = [it for it in scored if float(it.get("match") or 0.0) >= quality_floor]
    if len(quality_filtered) < 3:
        quality_filtered = scored  # last resort: return everything that passed junk filter

    # diversity — allow max 2 per domain, but ensure we fill up to limit
    final = diversify_web(quality_filtered, limit=limit, max_per_domain=2)
    # if diversity was too strict and we got fewer than min(10, limit), relax to 3 per domain
    if len(final) < min(10, limit):
        final = diversify_web(quality_filtered, limit=limit, max_per_domain=3)

    payload = {
        "ok": True,
        "cached": False,
        "items": final,
        "model_version": "v2-web-ranker",
        "queries": [
            {
                "query": to_search_string(gq),
                "weight": gq.weight,
                "source": gq.source,
                "negatives": gq.negatives,
            }
            for gq in gqs
        ],
    }

    ttl = max(1, int(cache_ttl_s))
    _WEB_RECS_CACHE[ck] = WebRecsCacheEntry(expires_at=now + ttl, payload=payload)
    cache_set(
        namespace="web_recs",
        key=ck,
        payload=payload,
        ttl_s=ttl,
        now=int(now),
        max_rows=_env_int("TS_WEB_RECS_CACHE_MAX_ROWS", 800),
    )
    return payload
