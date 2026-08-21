from __future__ import annotations

import time

import httpx
import pytest

from app.db import connect, init_db
from app.main import app

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
