from __future__ import annotations

"""Short-lived, process-local queue for prepared recommendation sets.

Provider payloads are never written to disk. Entries use random, single-use
tokens and expire quickly so prepared results remain transient.
"""

import secrets
import threading
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class _Entry:
    signature: str
    expires_at: float
    status: str = "preparing"
    payload: dict[str, Any] | None = None
    ready: threading.Event = field(default_factory=threading.Event)


_LOCK = threading.Lock()
_ENTRIES: dict[str, _Entry] = {}
_MAX_ENTRIES = 128


def _cleanup(now: float) -> None:
    for token in [token for token, entry in _ENTRIES.items() if entry.expires_at <= now]:
        _ENTRIES.pop(token, None)
    if len(_ENTRIES) > _MAX_ENTRIES:
        oldest = sorted(_ENTRIES.items(), key=lambda pair: pair[1].expires_at)
        for token, _ in oldest[: len(_ENTRIES) - _MAX_ENTRIES]:
            _ENTRIES.pop(token, None)


def reserve(signature: str, *, ttl_s: int = 180) -> str:
    token = secrets.token_urlsafe(24)
    now = time.time()
    with _LOCK:
        _cleanup(now)
        _ENTRIES[token] = _Entry(
            signature=signature,
            expires_at=now + max(30, min(300, int(ttl_s))),
        )
    return token


def mark_ready(token: str, payload: dict[str, Any]) -> None:
    with _LOCK:
        entry = _ENTRIES.get(token)
        if not entry or entry.expires_at <= time.time():
            return
        entry.payload = dict(payload)
        entry.status = "ready"
        entry.ready.set()


def mark_failed(token: str) -> None:
    with _LOCK:
        entry = _ENTRIES.get(token)
        if not entry:
            return
        entry.status = "failed"
        entry.ready.set()


def get_status(token: str) -> str:
    with _LOCK:
        _cleanup(time.time())
        entry = _ENTRIES.get(token)
        return entry.status if entry else "expired"


def take(token: str, signature: str, *, wait_s: float = 0.0) -> tuple[str, dict[str, Any] | None]:
    with _LOCK:
        entry = _ENTRIES.get(token)
        if not entry or entry.expires_at <= time.time():
            _ENTRIES.pop(token, None)
            return "expired", None
        if not secrets.compare_digest(entry.signature, signature):
            return "mismatch", None
        ready_event = entry.ready

    if wait_s > 0 and not ready_event.is_set():
        ready_event.wait(timeout=max(0.0, min(2.0, float(wait_s))))

    with _LOCK:
        entry = _ENTRIES.get(token)
        if not entry or entry.expires_at <= time.time():
            _ENTRIES.pop(token, None)
            return "expired", None
        if not secrets.compare_digest(entry.signature, signature):
            return "mismatch", None
        if entry.status != "ready" or not entry.payload:
            return entry.status, None
        payload = dict(entry.payload)
        _ENTRIES.pop(token, None)
        return "ready", payload


def clear_for_tests() -> None:
    with _LOCK:
        _ENTRIES.clear()
