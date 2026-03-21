from __future__ import annotations

from typing import Any, Dict, List, Tuple

import pytest

from app.db import init_db


class _StubResp:
    status_code = 200
    headers: Dict[str, str] = {}
    content = b"{stub}"

    def raise_for_status(self) -> None:
        return None

    def json(self) -> Dict[str, Any]:
        return {
            "web": {
                "results": [
                    {
                        "url": "https://example.com/a",
                        "title": "Result A",
                        "description": "Desc A",
                    },
                    {
                        "url": "https://example.com/b",
                        "title": "Result B",
                        "description": "Desc B",
                    },
                ]
            }
        }


class _DummyClient:
    def __init__(self, *args: Any, **kwargs: Any):
        self._calls = kwargs.get("_calls")

    def __enter__(self) -> "_DummyClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def get(self, url: str, headers: Dict[str, str] | None = None, params: Dict[str, Any] | None = None) -> _StubResp:
        if self._calls is not None:
            self._calls.append({"url": url, "params": dict(params or {})})
        return _StubResp()


def test_brave_web_search_uses_sqlite_cache_across_process_cache_clear(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    # Use a temp DB so the kv_cache table exists.
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "test.db"))
    init_db()

    # Provide a dummy key so brave_web_search doesn't fail.
    monkeypatch.setenv("TS_BRAVE_API_KEY", "dummy")

    from app import brave_search as bs

    calls: List[Dict[str, Any]] = []

    # Patch httpx.Client used inside brave_search
    monkeypatch.setattr(bs.httpx, "Client", lambda *a, **kw: _DummyClient(*a, **{**kw, "_calls": calls}))

    rl_calls: List[Tuple[str, int]] = []

    def _rl(key: str, cost: int = 1, now: float | None = None) -> None:
        rl_calls.append((key, int(cost)))

    monkeypatch.setattr(bs, "brave_consume_or_raise", _rl)

    # First call: hits API (stubbed), consumes rate limit.
    items1, cached1 = bs.brave_web_search(q="best coffee oslo", count=2, rate_limit_key="ip:1")
    assert cached1 is False
    assert len(items1) == 2
    assert len(calls) == 1
    assert rl_calls == [("ip:1", 1)]

    # Simulate reload: clear in-memory cache.
    bs._CACHE.clear()

    # Second call: should hit SQLite cache, no API call, no rate limit consume.
    items2, cached2 = bs.brave_web_search(q="best coffee oslo", count=2, rate_limit_key="ip:1")
    assert cached2 is True
    assert len(items2) == 2
    assert len(calls) == 1
    assert rl_calls == [("ip:1", 1)]


def test_rank_web_recs_uses_sqlite_cache(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "test.db"))
    init_db()

    from app import web_recs as wr

    search_calls: List[str] = []

    def stub_search_fn(**kwargs: Any):
        q = str(kwargs.get("q") or "")
        search_calls.append(q)
        return (
            [
                {
                    "id": "brave:1",
                    "name": f"Spicy ramen ({q})",
                    "url": "https://food.example.com/spicy",
                    "cat": "web",
                    "why": "",
                    "match": 0.0,
                    "source": "brave",
                    "snippet": "spicy chili curry",
                }
            ],
            False,
        )

    payload1 = wr.rank_web_recs(
        user_id="u1",
        mode="restaurants",
        destination="Oslo",
        prefs={"facet.food.spicy": 1.0},
        limit=5,
        max_queries=2,
        per_query=1,
        seed=1,
        cache_ttl_s=120,
        search_fn=stub_search_fn,
    )
    assert payload1["cached"] is False
    assert len(search_calls) >= 1

    # Clear in-memory cache to force DB lookup.
    wr._WEB_RECS_CACHE.clear()

    before = len(search_calls)

    payload2 = wr.rank_web_recs(
        user_id="u1",
        mode="restaurants",
        destination="Oslo",
        prefs={"facet.food.spicy": 1.0},
        limit=5,
        max_queries=2,
        per_query=1,
        seed=1,
        cache_ttl_s=120,
        search_fn=stub_search_fn,
    )

    assert payload2["cached"] is True
    assert before >= 1
    # critical: second call should not invoke provider again
    assert len(search_calls) == before
