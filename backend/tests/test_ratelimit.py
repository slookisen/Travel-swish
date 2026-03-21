from __future__ import annotations

import pytest

from app.ratelimit import RateLimitError, brave_consume_or_raise


def test_brave_rate_limit_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TS_BRAVE_RL_WINDOW_S", "60")
    monkeypatch.setenv("TS_BRAVE_RL_MAX_CALLS", "2")

    key = "brave:test"
    brave_consume_or_raise(key=key, cost=1, now=1000.0)
    brave_consume_or_raise(key=key, cost=1, now=1001.0)

    with pytest.raises(RateLimitError) as e:
        brave_consume_or_raise(key=key, cost=1, now=1002.0)

    assert e.value.key == key
    assert e.value.limit == 2
    assert e.value.window_s == 60
    assert e.value.retry_after_s > 0
