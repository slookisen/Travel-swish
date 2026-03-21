from __future__ import annotations

"""db_cache.py — Tiny SQLite-backed cache for cost control.

We already use in-memory TTL caches in brave_search.py and web_recs.py.
This module adds an *optional* persistence layer so caches survive reloads and
reduce repeated Brave calls during demo iteration.

Design goals:
- process-safe enough for small demo loads (SQLite WAL handles concurrent reads)
- namespace separation (same key can exist in multiple caches)
- TTL-based expiry
- best-effort cleanup + max-rows cap

NOTE: This is not a replacement for Redis. For multi-instance production,
use a shared cache store.
"""

import json
import os
import time
from typing import Any, Optional, Tuple

from .db import connect


def _env_int(name: str, default: int) -> int:
    try:
        return int(str(os.environ.get(name, "")).strip() or default)
    except Exception:
        return int(default)


def cache_get(*, namespace: str, key: str, now: int | None = None) -> Optional[Tuple[Any, int]]:
    """Return (payload, expires_ts) if present and not expired."""

    namespace = (namespace or "").strip() or "default"
    key = (key or "").strip()
    if not key:
        return None

    now_i = int(time.time() if now is None else now)

    con = connect()
    try:
        row = con.execute(
            "SELECT payload_json, expires_ts FROM kv_cache WHERE namespace=? AND key=?",
            (namespace, key),
        ).fetchone()
        if not row:
            return None

        expires_ts = int(row["expires_ts"])
        if expires_ts <= now_i:
            # expire eagerly
            con.execute("DELETE FROM kv_cache WHERE namespace=? AND key=?", (namespace, key))
            con.commit()
            return None

        payload = json.loads(row["payload_json"])
        return payload, expires_ts
    finally:
        con.close()


def cache_set(
    *,
    namespace: str,
    key: str,
    payload: Any,
    ttl_s: int,
    now: int | None = None,
    max_rows: int | None = None,
) -> None:
    """Upsert cache entry."""

    namespace = (namespace or "").strip() or "default"
    key = (key or "").strip()
    if not key:
        return

    now_i = int(time.time() if now is None else now)
    ttl_s = max(1, int(ttl_s))
    expires_ts = now_i + ttl_s

    payload_json = json.dumps(payload, ensure_ascii=False)

    con = connect()
    try:
        con.execute(
            """
            INSERT INTO kv_cache(namespace, key, payload_json, expires_ts, created_ts)
            VALUES(?, ?, ?, ?, ?)
            ON CONFLICT(namespace, key) DO UPDATE SET
              payload_json=excluded.payload_json,
              expires_ts=excluded.expires_ts,
              created_ts=excluded.created_ts
            """,
            (namespace, key, payload_json, int(expires_ts), int(now_i)),
        )

        # Best-effort cleanup (cheap).
        # 1) drop expired
        con.execute("DELETE FROM kv_cache WHERE expires_ts <= ?", (int(now_i),))

        # 2) cap rows per namespace (prevent unbounded growth)
        if max_rows is None:
            max_rows = _env_int("TS_CACHE_MAX_ROWS", 2000)
        max_rows = max(50, int(max_rows))

        # If too many rows, delete oldest extras.
        row = con.execute(
            "SELECT COUNT(1) AS n FROM kv_cache WHERE namespace=?",
            (namespace,),
        ).fetchone()
        n = int(row["n"] if row else 0)
        if n > max_rows:
            extra = n - max_rows
            con.execute(
                """
                DELETE FROM kv_cache
                WHERE rowid IN (
                  SELECT rowid FROM kv_cache
                  WHERE namespace=?
                  ORDER BY created_ts ASC
                  LIMIT ?
                )
                """,
                (namespace, int(extra)),
            )

        con.commit()
    finally:
        con.close()
