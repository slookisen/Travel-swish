from __future__ import annotations

import time

import httpx
import pytest

from app.db import init_db
from app.main import app

pytestmark = pytest.mark.anyio


def _transport() -> httpx.ASGITransport:
    return httpx.ASGITransport(app=app)


def _event_payload() -> dict:
    return {
        "user_id": "u1",
        "session_id": "s1",
        "ts": int(time.time()),
        "name": "swipe",
        "mode": "solo",
        "destination": "oslo",
        "card_id": None,
        "payload": {},
    }


async def test_origin_allowed_allows_post(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TS_API_KEY", raising=False)
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "db.sqlite"))
    init_db()

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as c:
        r = await c.post(
            "/events",
            json=_event_payload(),
            headers={
                "Origin": "http://localhost:5173",
                "X-Forwarded-For": "1.2.3.4",
            },
        )
    assert r.status_code == 200
    assert r.json().get("ok") is True


async def test_missing_origin_requires_api_key_when_set(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TS_API_KEY", "secret")
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "db.sqlite"))
    init_db()

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as c:
        r = await c.post(
            "/events",
            json=_event_payload(),
            headers={
                "X-Forwarded-For": "1.2.3.4",
            },
        )
    assert r.status_code in (401, 403)


async def test_api_key_allows_post_without_origin(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TS_API_KEY", "secret")
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "db.sqlite"))
    init_db()

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as c:
        r = await c.post(
            "/events",
            json=_event_payload(),
            headers={
                "X-TS-API-Key": "secret",
                "X-Forwarded-For": "1.2.3.4",
            },
        )
    assert r.status_code == 200
    assert r.json().get("ok") is True


async def test_post_rate_limit_429(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    # Large window to avoid boundary flakiness.
    monkeypatch.setenv("TS_API_RL_WINDOW_S", "3600")
    monkeypatch.setenv("TS_API_RL_MAX_COST", "2")
    monkeypatch.setenv("TS_DB_PATH", str(tmp_path / "db.sqlite"))
    init_db()

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as c:
        h = {
            "Origin": "http://localhost:5173",
            "X-Forwarded-For": "9.9.9.9",
        }
        r1 = await c.post("/events", json=_event_payload(), headers=h)
        r2 = await c.post("/events", json=_event_payload(), headers=h)
        r3 = await c.post("/events", json=_event_payload(), headers=h)

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 429
    assert "Retry-After" in r3.headers
