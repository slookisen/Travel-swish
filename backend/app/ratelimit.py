from __future__ import annotations

"""Simple in-process rate limiting.

This is intentionally lightweight (no Redis). It's meant to prevent the Brave demo
from accidentally burning API quota during repeated refreshes / test loops.

- fixed window limiter (counts per key in a time window)
- env-configurable for Brave usage

NOTE: This is process-local. In a multi-worker deploy you'll want shared storage.
"""

import os
import threading
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from starlette.requests import Request


class RateLimitError(RuntimeError):
    def __init__(self, *, key: str, retry_after_s: int, limit: int, window_s: int):
        super().__init__(f"rate_limited key={key} retry_after_s={retry_after_s} limit={limit} window_s={window_s}")
        self.key = key
        self.retry_after_s = int(max(0, retry_after_s))
        self.limit = int(limit)
        self.window_s = int(window_s)


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    retry_after_s: int
    remaining: int


class FixedWindowRateLimiter:
    """Fixed-window rate limiter with optional weighted costs."""

    def __init__(self, *, window_s: int, max_cost: int):
        self.window_s = max(1, int(window_s))
        self.max_cost = max(1, int(max_cost))
        self._lock = threading.Lock()
        # key -> (window_id, used_cost)
        self._buckets: dict[str, tuple[int, int]] = {}

    def consume(self, *, key: str, cost: int = 1, now: float | None = None) -> RateLimitResult:
        cost = max(1, int(cost))
        now = float(time.time() if now is None else now)

        window_id = int(now // self.window_s)
        window_end = (window_id + 1) * self.window_s
        retry_after_s = int(max(0, window_end - now))

        with self._lock:
            prev = self._buckets.get(key)
            if not prev or prev[0] != window_id:
                used = 0
            else:
                used = int(prev[1])

            if used + cost > self.max_cost:
                remaining = max(0, self.max_cost - used)
                return RateLimitResult(allowed=False, retry_after_s=retry_after_s, remaining=remaining)

            used2 = used + cost
            self._buckets[key] = (window_id, used2)
            remaining = max(0, self.max_cost - used2)
            return RateLimitResult(allowed=True, retry_after_s=0, remaining=remaining)


def _env_int(name: str, default: int) -> int:
    try:
        return int(str(os.getenv(name) or '').strip() or default)
    except Exception:
        return int(default)


def brave_rl_config() -> tuple[int, int]:
    """Return (window_s, max_calls) for Brave API calls."""

    window_s = _env_int('TS_BRAVE_RL_WINDOW_S', 60)
    max_calls = _env_int('TS_BRAVE_RL_MAX_CALLS', 25)
    return max(1, window_s), max(1, max_calls)


_BRAVE_LIMITER: FixedWindowRateLimiter | None = None
_BRAVE_CFG: tuple[int, int] | None = None


def brave_limiter() -> FixedWindowRateLimiter:
    global _BRAVE_LIMITER, _BRAVE_CFG
    cfg = brave_rl_config()
    if _BRAVE_LIMITER is None or _BRAVE_CFG != cfg:
        window_s, max_calls = cfg
        _BRAVE_LIMITER = FixedWindowRateLimiter(window_s=window_s, max_cost=max_calls)
        _BRAVE_CFG = cfg
    return _BRAVE_LIMITER


def _client_ip_from_request(request: 'Request') -> str:
    # If behind a proxy, the first X-Forwarded-For entry is the original client.
    xff = (request.headers.get('x-forwarded-for') or '').split(',')[0].strip()
    if xff:
        return xff
    try:
        if request.client and request.client.host:
            return str(request.client.host)
    except Exception:
        pass
    return 'unknown'


def brave_rate_limit_key(*, request: 'Request', user_id: str | None = None) -> str:
    """Build a per-IP or per-user key for Brave quota guarding."""

    ip = _client_ip_from_request(request)
    uid = (user_id or '').strip()
    if uid:
        return f"brave:{ip}:u={uid}"
    return f"brave:{ip}"


def brave_consume_or_raise(*, key: str, cost: int = 1, now: float | None = None) -> None:
    rl = brave_limiter()
    res = rl.consume(key=key, cost=cost, now=now)
    if not res.allowed:
        raise RateLimitError(key=key, retry_after_s=res.retry_after_s, limit=rl.max_cost, window_s=rl.window_s)
