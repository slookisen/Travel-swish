from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from .migrations import run_migrations

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BASE_DIR / "data" / "travel_swish.db"


def db_path() -> Path:
    p = os.environ.get("TS_DB_PATH", str(DEFAULT_DB_PATH))
    return Path(p)


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path), timeout=5.0)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    con.execute("PRAGMA busy_timeout = 5000;")
    con.execute("PRAGMA journal_mode = WAL;")
    con.execute("PRAGMA synchronous = NORMAL;")
    return con


def init_db() -> None:
    """Apply durable, numbered schema migrations and optimize query metadata."""
    con = connect()
    try:
        run_migrations(con)
        con.execute("PRAGMA optimize;")
        con.commit()
    finally:
        con.close()
