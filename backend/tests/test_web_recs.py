from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pytest

from app.query_gen import generate_queries, to_search_string
from app.web_recs import canonical_url, rank_web_recs


def test_query_gen_smoke_negatives() -> None:
    prefs = {"facet.food.spicy": 1.0, "facet.budget": 0.2}
    gqs = generate_queries("restaurants", "Oslo", prefs, max_queries=3, seed=1)
    assert 1 <= len(gqs) <= 3
    s = to_search_string(gqs[0])
    # Should include at least one -"..." negative keyword when global negatives present.
    assert ' -"' in (" " + s)


def test_canonical_url_strips_tracking() -> None:
    u1 = "https://example.com/a?utm_source=x&x=1#frag"
    u2 = canonical_url(u1)
    assert u2 == "https://example.com/a?x=1"


def test_rank_web_recs_scores_keyword_matches_higher() -> None:
    # Arrange: prefs strongly like spicy
    prefs = {"facet.food.spicy": 1.0}

    def stub_search_fn(**kwargs: Any) -> Tuple[List[Dict[str, Any]], bool]:
        q = kwargs.get("q") or ""
        # Return two items regardless of query
        return (
            [
                {
                    "id": "brave:1",
                    "name": f"Spicy ramen guide ({q})",
                    "url": "https://food.example.com/spicy-ramen",
                    "cat": "web",
                    "why": "",
                    "match": 0.0,
                    "source": "brave",
                    "snippet": "A list of spicy ramen places with chili and curry.",
                },
                {
                    "id": "brave:2",
                    "name": "Quiet cafes in Oslo",
                    "url": "https://food.example.com/cafes",
                    "cat": "web",
                    "why": "",
                    "match": 0.0,
                    "source": "brave",
                    "snippet": "Coffee and espresso.",
                },
            ],
            False,
        )

    payload = rank_web_recs(
        user_id="u1",
        mode="restaurants",
        destination="Oslo",
        prefs=prefs,
        limit=5,
        max_queries=2,
        per_query=2,
        seed=42,
        search_fn=stub_search_fn,
        cache_ttl_s=0,
    )

    items = payload["items"]
    assert len(items) >= 2
    assert items[0]["url"].endswith("/spicy-ramen")
    assert items[0]["match"] >= items[1]["match"]
    assert "facet.food.spicy" in items[0]["why"]


def test_rank_web_recs_dedup_and_domain_diversity() -> None:
    prefs = {"facet.food.spicy": 1.0, "facet.culture": 0.8}

    def stub_search_fn(**kwargs: Any) -> Tuple[List[Dict[str, Any]], bool]:
        q = kwargs.get("q") or ""
        if "spicy" in q.lower():
            return (
                [
                    {
                        "id": "brave:a",
                        "name": "Spicy food in Oslo",
                        "url": "https://same.example.com/x?utm_source=aa",
                        "cat": "web",
                        "why": "",
                        "match": 0.0,
                        "source": "brave",
                        "snippet": "spicy chili",
                    },
                    {
                        "id": "brave:b",
                        "name": "More spicy food",
                        "url": "https://same.example.com/y",
                        "cat": "web",
                        "why": "",
                        "match": 0.0,
                        "source": "brave",
                        "snippet": "spicy curry",
                    },
                    {
                        "id": "brave:c",
                        "name": "Even more spicy food",
                        "url": "https://same.example.com/z",
                        "cat": "web",
                        "why": "",
                        "match": 0.0,
                        "source": "brave",
                        "snippet": "spicy",
                    },
                ],
                False,
            )

        # culture query
        return (
            [
                {
                    "id": "brave:d",
                    "name": f"Museum guide ({q})",
                    "url": "https://other.example.org/museums",
                    "cat": "web",
                    "why": "",
                    "match": 0.0,
                    "source": "brave",
                    "snippet": "museum gallery heritage",
                },
                # duplicate of spicy URL (should be deduped)
                {
                    "id": "brave:dup",
                    "name": "Duplicate spicy",
                    "url": "https://same.example.com/x",
                    "cat": "web",
                    "why": "",
                    "match": 0.0,
                    "source": "brave",
                    "snippet": "spicy",
                },
            ],
            False,
        )

    payload = rank_web_recs(
        user_id="u1",
        mode="restaurants",
        destination="Oslo",
        prefs=prefs,
        limit=4,
        max_queries=2,
        per_query=3,
        seed=7,
        search_fn=stub_search_fn,
        cache_ttl_s=0,
    )

    items = payload["items"]
    # Dedup should remove exact URL duplicate
    urls = [it["url"] for it in items]
    assert len(urls) == len(set(urls))

    # Domain cap is 2 by default; with 4 results we should not exceed 2 from same.example.com
    doms = [it["domain"] for it in items]
    assert doms.count("same.example.com") <= 2
    assert "other.example.org" in doms
