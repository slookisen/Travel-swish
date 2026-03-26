"""conftest.py — shared pytest fixtures for the Travel-Swish backend test suite."""
from __future__ import annotations

import os
import pytest

from app.db import init_db


@pytest.fixture(autouse=True)
def _isolated_db(tmp_path: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch) -> None:
    """Point every test at a fresh in-memory (tmp) SQLite DB and initialise schema.

    This ensures all tests that touch db_cache, brave_search, or places_recs
    get a fully-initialised DB (including the kv_cache table) without having
    to call init_db() themselves.
    """
    db_file = tmp_path / "test_travel_swish.db"
    monkeypatch.setenv("TS_DB_PATH", str(db_file))
    init_db()
