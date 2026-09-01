from __future__ import annotations

import time
import importlib

import httpx
import pytest

from app.db import connect, init_db
from app.main import app
from app.prefetch import clear_for_tests as clear_prefetch_for_tests

pytestmark = pytest.mark.anyio


def _transport() -> httpx.ASGITransport:
    return httpx.ASGITransport(app=app)


def test_numbered_migrations_are_idempotent() -> None:
    init_db()
    init_db()
    con = connect()
    try:
        versions = [row[0] for row in con.execute("SELECT version FROM schema_migrations ORDER BY version")]
        assert versions == [1, 2]
        tables = {row[0] for row in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"sessions", "recommendation_runs", "result_feedback", "kv_cache"} <= tables
        assert con.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        assert con.execute("PRAGMA journal_mode").fetchone()[0].lower() == "wal"
        plan = con.execute(
            "EXPLAIN QUERY PLAN SELECT * FROM result_feedback WHERE user_id=? ORDER BY ts DESC LIMIT 20",
            ("query-plan-user",),
        ).fetchall()
        assert "idx_feedback_user_ts" in " ".join(str(cell) for row in plan for cell in row)
    finally:
        con.close()


async def test_session_and_feedback_lifecycle() -> None:
    now = int(time.time())
    headers = {"Origin": "http://localhost:5173", "X-Forwarded-For": "7.7.7.7"}
    session = {
        "user_id": "user-lifecycle",
        "session_id": "session-lifecycle",
        "mode": "experiences",
        "destination": "Oslo",
        "context": {"pace": "balanced"},
        "profile_version": 2,
        "client_version": "0.2.0",
        "ts": now,
    }
    feedback = {
        "user_id": "user-lifecycle",
        "session_id": "session-lifecycle",
        "run_id": "offline-run",
        "item_id": "oslo-vigeland",
        "item_name": "Vigelandsparken i eget tempo",
        "feedback": "useful",
        "mode": "experiences",
        "destination": "Oslo",
        "payload": {"source": "starter"},
        "ts": now,
    }

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as client:
        session_response = await client.post("/sessions", json=session, headers=headers)
        feedback_response = await client.post("/feedback", json=feedback, headers=headers)

    assert session_response.status_code == 200
    assert feedback_response.status_code == 200
    con = connect()
    try:
        stored_session = con.execute("SELECT destination FROM sessions WHERE id=?", (session["session_id"],)).fetchone()
        stored_feedback = con.execute("SELECT feedback FROM result_feedback WHERE item_id=?", (feedback["item_id"],)).fetchone()
        assert stored_session[0] == "Oslo"
        assert stored_feedback[0] == "useful"
    finally:
        con.close()


async def test_user_can_delete_pseudonymous_service_data() -> None:
    now = int(time.time())
    headers = {"Origin": "http://localhost:5173", "X-Forwarded-For": "7.7.7.8"}
    user_id = "user-delete-me"
    session = {
        "user_id": user_id,
        "session_id": "session-delete-me",
        "mode": "experiences",
        "destination": "Lisbon",
        "context": {"pace": "balanced"},
        "profile_version": 2,
        "client_version": "0.6.0",
        "ts": now,
    }
    prefs = {
        "user_id": user_id,
        "mode": "experiences",
        "prefs": {"nature": 0.8},
        "updated_ts": now,
    }

    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as client:
        assert (await client.post("/sessions", json=session, headers=headers)).status_code == 200
        assert (await client.post("/prefs", json=prefs, headers=headers)).status_code == 200
        response = await client.delete(f"/users/{user_id}", headers=headers)

    assert response.status_code == 200
    assert response.json()["ok"] is True
    con = connect()
    try:
        for table in ("users", "sessions", "prefs", "events", "pref_stats", "recommendation_runs", "result_feedback"):
            assert con.execute(f"SELECT COUNT(*) FROM {table} WHERE {'id' if table == 'users' else 'user_id'}=?", (user_id,)).fetchone()[0] == 0
    finally:
        con.close()


async def test_recommendation_endpoint_serves_prepared_next_selection(monkeypatch: pytest.MonkeyPatch) -> None:
    main_module = importlib.import_module("app.main")
    clear_prefetch_for_tests()
    monkeypatch.setenv("TS_BRAVE_API_KEY", "test-key")
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    monkeypatch.setattr(main_module, "api_consume_or_raise", lambda **_kwargs: None)

    calls: list[int] = []

    def stub_rank_web_recs(**kwargs):
        seed = int(kwargs["seed"])
        calls.append(seed)
        return {
            "ok": True,
            "cached": False,
            "model_version": "test-prefetch",
            "provider": "brave",
            "queries": [],
            "items": [{
                "id": f"brave:{seed}",
                "name": f"Prepared result {seed}",
                "match": 82,
                "why": "Profile match",
                "url": "https://example.test/result",
                "cat": "culture",
                "source": "brave",
            }],
        }

    monkeypatch.setattr(main_module, "rank_web_recs", stub_rank_web_recs)
    base_request = {
        "user_id": "prefetch-user",
        "mode": "experiences",
        "destination": "Oslo",
        "language": "en",
        "limit": 4,
        "max_queries": 2,
        "per_query": 2,
        "seed": 17,
        "search_kind": "custom",
        "query_text": "ceramics workshops",
        "taste": {"version": 2, "context": {"party": "solo"}},
        "trip_context": {"party": "solo"},
    }

    headers = {"Origin": "http://localhost:5173", "X-Forwarded-For": "8.8.8.8"}
    async with httpx.AsyncClient(transport=_transport(), base_url="http://test") as client:
        first = await client.post("/recs/web", json=base_request, headers=headers)
        assert first.status_code == 200, first.text
        first_body = first.json()
        assert first_body["served_from_prefetch"] is False
        assert first_body["next_token"]
        assert first_body["next_status"] == "preparing"

        status = await client.get(f"/recs/prefetch/{first_body['next_token']}", headers=headers)
        assert status.json()["status"] == "ready"

        second_request = {
            **base_request,
            "seed": first_body["next_seed"],
            "prefetch_token": first_body["next_token"],
            "exclude_ids": [first_body["items"][0]["id"]],
        }
        second = await client.post("/recs/web", json=second_request, headers=headers)

    assert second.status_code == 200, second.text
    second_body = second.json()
    assert second_body["served_from_prefetch"] is True
    assert second_body["items"][0]["id"] != first_body["items"][0]["id"]
    assert len(calls) == 3  # current selection, prepared selection, then the next preparation
