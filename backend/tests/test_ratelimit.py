from __future__ import annotations

import pytest

from app.ratelimit import FixedWindowRateLimiter, RateLimitError


def test_fixed_window_rate_limiter_blocks_after_limit() -> None:
    rl = FixedWindowRateLimiter(window_s=10, max_cost=3)
    # same window
    assert rl.consume(key="k", cost=1, now=0.0).allowed is True
    assert rl.consume(key="k", cost=1, now=1.0).allowed is True
    assert rl.consume(key="k", cost=1, now=2.0).allowed is True

    res = rl.consume(key="k", cost=1, now=3.0)
    assert res.allowed is False
    assert res.retry_after_s > 0
    assert res.remaining == 0


def test_fixed_window_rate_limiter_resets_next_window() -> None:
    rl = FixedWindowRateLimiter(window_s=10, max_cost=2)
    assert rl.consume(key="k", cost=1, now=0.0).allowed is True
    assert rl.consume(key="k", cost=1, now=1.0).allowed is True
    assert rl.consume(key="k", cost=1, now=2.0).allowed is False

    # next window
    assert rl.consume(key="k", cost=1, now=10.0).allowed is True


def test_rate_limit_error_retry_after_non_negative() -> None:
    e = RateLimitError(key="k", retry_after_s=-5, limit=1, window_s=60)
    assert e.retry_after_s == 0
