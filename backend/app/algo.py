from __future__ import annotations

"""Pure helpers for the Travel-Swish preference algorithm.

Kept separate from FastAPI + DB code so it can be imported in tests without
starting the app or touching SQLite.

Algorithm spec: ../../ALGORITHM_SPEC_V1.md
"""

import re
from collections import OrderedDict

LIKE_WEIGHT = 1.0
DISLIKE_WEIGHT = -0.3

_LIKE_RE = re.compile(r"(like|right|swipe_right)", re.IGNORECASE)
_NOPE_RE = re.compile(r"(nope|dislike|left|swipe_left)", re.IGNORECASE)


def detect_direction(payload: dict | None, name: str = "") -> float | None:
    """Return +1 (like) / -1 (dislike) or None if event is not a swipe.

    Direction detection priority:
      1) payload.dir (>=0 => like, <0 => dislike)
      2) payload.liked (bool)
      3) event name regex
    """
    payload = payload or {}

    # 1) explicit dir field
    d = payload.get("dir")
    if d is not None:
        try:
            return 1.0 if float(d) >= 0 else -1.0
        except (ValueError, TypeError):
            pass

    # 2) liked boolean
    liked = payload.get("liked")
    if liked is not None:
        return 1.0 if bool(liked) else -1.0

    # 3) event name heuristic
    name = name or ""
    if _LIKE_RE.search(name):
        return 1.0
    if _NOPE_RE.search(name):
        return -1.0

    return None


def diversify(items: list[dict], limit: int) -> list[dict]:
    """Round-robin pick across categories so no single cat dominates.

    Items must already be sorted by score (descending) on input.
    Within each category the original score order is preserved.
    """
    buckets: OrderedDict[str, list[dict]] = OrderedDict()
    for it in items:
        cat = it.get("cat") or "_uncategorized"
        buckets.setdefault(cat, []).append(it)

    result: list[dict] = []
    while len(result) < limit:
        added = False
        for cat in list(buckets):
            if len(result) >= limit:
                break
            if buckets[cat]:
                result.append(buckets[cat].pop(0))
                added = True
            if not buckets[cat]:
                del buckets[cat]
        if not added:
            break

    return result
