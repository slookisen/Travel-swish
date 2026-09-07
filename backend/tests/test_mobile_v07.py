from __future__ import annotations

import importlib
import json
import sqlite3
import time
from pathlib import Path

import httpx
import pytest

from app.db import connect
from app.google_places import google_places_search, resolve_destination_bounds, within_bounds
from app.main import app
from app.migrations import run_migrations
from app.places_recs import DestinationUnresolved, DestinationProviderUnavailable, rank_places_recs

BOUNDS = {"low": {"latitude": 59.8, "longitude": 10.5}, "high": {"latitude": 60.1, "longitude": 10.9}}


def test_destination_restriction_is_sent_and_coordinates_checked(monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-not-a-secret")
    calls = []
    def post(url, **kwargs):
        calls.append(kwargs)
        if kwargs["headers"]["X-Goog-FieldMask"] == "places.types,places.viewport":
            body = {"places": [{"types": ["locality", "political"], "viewport": BOUNDS}]}
        else:
            body = {"places": [{"id": "park", "displayName": {"text": "Park"}, "types": ["park"], "location": {"latitude": 59.9, "longitude": 10.7}}]}
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))
    monkeypatch.setattr(httpx, "post", post)
    bounds = resolve_destination_bounds("Oslo, Norway")
    items, _ = google_places_search("park Oslo", bounds=bounds)
    assert calls[-1]["json"]["locationRestriction"]["rectangle"] == BOUNDS
    assert calls[-1]["json"]["pageSize"] == 10
    assert within_bounds(items[0], BOUNDS)
    assert not within_bounds({"lat": 40, "lng": -74}, BOUNDS)
    assert not within_bounds({"lat": float("nan"), "lng": 10.7}, BOUNDS)
    assert not within_bounds({}, BOUNDS)


@pytest.mark.parametrize("places", [[], [{"types": ["restaurant"], "viewport": BOUNDS}],
    [{"types": ["locality"], "viewport": BOUNDS}, {"types": ["locality"], "viewport": BOUNDS}]])
def test_ambiguous_or_non_area_destination_fails_closed(monkeypatch, places):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    monkeypatch.setattr(httpx, "post", lambda url, **kw: httpx.Response(200, json={"places": places}, request=httpx.Request("POST", url)))
    assert resolve_destination_bounds("Ambiguous place") is None


def test_ranker_filters_wrong_country_and_missing_coordinates():
    items = [{"id": "good", "name": "Park", "cat": "nature", "types": ["park"], "lat": 59.9, "lng": 10.7},
             {"id": "far", "name": "Park overseas", "cat": "nature", "types": ["park"], "lat": 40, "lng": -74},
             {"id": "unknown", "name": "Unknown park", "cat": "nature", "types": ["park"]}]
    result = rank_places_recs(user_id="u", mode="experiences", destination="Oslo", prefs={"nat": .8}, max_queries=1,
                             bounds_fn=lambda *args: BOUNDS, search_fn=lambda *args, **kwargs: (items, False))
    assert [item["id"] for item in result["items"]] == ["good"]
    with pytest.raises(DestinationUnresolved):
        rank_places_recs(user_id="u", mode="experiences", destination="Unknown", prefs={}, bounds_fn=lambda *a: None)


def test_bounds_support_date_line():
    bounds = {"low": {"latitude": -20, "longitude": 178}, "high": {"latitude": -10, "longitude": -178}}
    assert within_bounds({"lat": -15, "lng": -179}, bounds)
    assert not within_bounds({"lat": -15, "lng": 0}, bounds)


def test_destination_provider_failure_is_not_invalid_user_input(monkeypatch):
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    def fail(*args, **kwargs):
        raise httpx.ReadTimeout("provider timeout")
    monkeypatch.setattr(httpx, "post", fail)
    with pytest.raises(DestinationProviderUnavailable):
        rank_places_recs(user_id="u", mode="experiences", destination="Oslo", prefs={})


@pytest.mark.anyio
async def test_destination_outage_returns_service_error(monkeypatch):
    main = importlib.import_module("app.main")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    monkeypatch.setattr(main, "api_consume_or_raise", lambda **kw: None)
    def fail(**kwargs):
        raise DestinationProviderUnavailable()
    monkeypatch.setattr(main, "rank_places_recs", fail)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/recs/personalized", json={"user_id": "u", "mode": "experiences", "destination": "Oslo", "current_prefs": {}}, headers={"Origin": "http://localhost:5173"})
        assert response.status_code == 503
        assert response.json()["detail"] == "search_provider_unavailable"


def test_migration_preserves_existing_feedback(tmp_path):
    con = sqlite3.connect(tmp_path / "legacy.db")
    con.execute("PRAGMA foreign_keys=ON")
    migration_dir = Path(__file__).resolve().parents[1] / "migrations"
    con.executescript((migration_dir / "001_initial.sql").read_text() + (migration_dir / "002_sessions_feedback.sql").read_text())
    con.execute("INSERT INTO users VALUES('u',1)")
    con.execute("INSERT INTO result_feedback VALUES('f','u',NULL,NULL,'p','Park','useful','experiences','Oslo','{}',1)")
    con.commit()
    run_migrations(con)
    assert con.execute("SELECT feedback FROM result_feedback WHERE id='f'").fetchone()[0] == "useful"
    con.execute("UPDATE result_feedback SET feedback='enjoyed' WHERE id='f'")
    con.commit()
    assert run_migrations(con) == []
    assert con.execute("PRAGMA foreign_key_check").fetchall() == []
    con.close()


@pytest.mark.anyio
async def test_atomic_search_uses_current_profile_and_stores_session(monkeypatch):
    main = importlib.import_module("app.main")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    monkeypatch.setattr(main, "api_consume_or_raise", lambda **kw: None)
    calls = []
    def rank(**kwargs):
        calls.append(kwargs)
        return {"items": [{"id": "p", "name": "Park", "cat": "nature", "source": "google_places"}], "provider": "google_places"}
    monkeypatch.setattr(main, "rank_places_recs", rank)
    body = {"user_id": "atomic-u", "session_id": "atomic-s", "mode": "experiences", "destination": "Oslo", "current_prefs": {"nat": .8}, "taste": {"context": {"party": "solo"}}, "client_version": "0.7.0"}
    headers = {"Origin": "http://localhost:5173"}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/recs/personalized", json=body, headers=headers)
        assert response.status_code == 200
        assert response.json()["next_token"] is None  # No provider swap on the next page.
        missing = await client.post("/recs/personalized", json={k: v for k, v in body.items() if k != "current_prefs"}, headers=headers)
        assert missing.status_code == 422
        invalid = await client.post("/recs/personalized", json={**body, "current_prefs": {"nat": 9}}, headers=headers)
        assert invalid.status_code == 422
    assert calls[0]["prefs"] == {"nat": .8}
    con = connect()
    try:
        assert json.loads(con.execute("SELECT prefs_json FROM prefs WHERE user_id='atomic-u'").fetchone()[0]) == {"nat": .8}
        assert con.execute("SELECT session_id FROM recommendation_runs WHERE user_id='atomic-u'").fetchone()[0] == "atomic-s"
        assert con.execute("SELECT profile_version FROM sessions WHERE id='atomic-s'").fetchone()[0] == 3
    finally:
        con.close()


@pytest.mark.anyio
async def test_feedback_exclusion_is_scoped_recent_and_reversible(monkeypatch):
    main = importlib.import_module("app.main")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    monkeypatch.setattr(main, "api_consume_or_raise", lambda **kw: None)
    calls = []
    monkeypatch.setattr(main, "rank_places_recs", lambda **kw: calls.append(kw) or {"items": [], "provider": "google_places"})
    now = int(time.time())
    con = connect()
    con.execute("INSERT INTO users VALUES('u',?)", (now,))
    rows = [("a", "old", "not_relevant", "experiences", now-90000), ("b", "now", "not_relevant", "experiences", now),
            ("c", "changed", "not_for_me", "experiences", now-1), ("d", "changed", "enjoyed", "experiences", now),
            ("e", "food", "not_for_me", "restaurants", now), ("f", "closed", "wrong_info", "experiences", now)]
    for rid, item, feedback, mode, ts in rows:
        con.execute("INSERT INTO result_feedback VALUES(?,'u',NULL,NULL,?,'Place',?,?,'Oslo','{}',?)", (rid, item, feedback, mode, ts))
    con.commit(); con.close()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/recs/personalized", json={"user_id": "u", "mode": "experiences", "destination": "Oslo", "current_prefs": {}}, headers={"Origin": "http://localhost:5173"})
        assert response.status_code == 200
    assert set(calls[0]["exclude_ids"]) == {"now", "closed"}
