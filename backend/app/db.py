from __future__ import annotations

import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BASE_DIR / "data" / "travel_swish.db"


def db_path() -> Path:
    p = os.environ.get("TS_DB_PATH", str(DEFAULT_DB_PATH))
    return Path(p)


def connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(path))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON;")
    return con


def init_db() -> None:
    """Create tables if missing (simple v1; replace with proper migrations later)."""
    con = connect()
    try:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              created_ts INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              session_id TEXT NOT NULL,
              ts INTEGER NOT NULL,
              name TEXT NOT NULL,
              mode TEXT NOT NULL,
              destination TEXT NOT NULL,
              card_id TEXT,
              payload_json TEXT,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS prefs (
              user_id TEXT NOT NULL,
              mode TEXT NOT NULL,
              prefs_json TEXT NOT NULL,
              updated_ts INTEGER NOT NULL,
              PRIMARY KEY(user_id, mode),
              FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS cards (
              id TEXT PRIMARY KEY,
              mode TEXT NOT NULL,
              card_json TEXT NOT NULL,
              updated_ts INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS taxonomy (
              id TEXT PRIMARY KEY,
              tax_json TEXT NOT NULL,
              updated_ts INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS pois (
              id TEXT PRIMARY KEY,
              mode TEXT NOT NULL,
              destination TEXT NOT NULL,
              name TEXT NOT NULL,
              url TEXT,
              cat TEXT,
              tags_json TEXT NOT NULL,
              updated_ts INTEGER NOT NULL
            );

            -- Indexes for common query patterns
            CREATE INDEX IF NOT EXISTS idx_events_user_ts ON events(user_id, ts);
            CREATE INDEX IF NOT EXISTS idx_events_session_ts ON events(session_id, ts);
            CREATE INDEX IF NOT EXISTS idx_cards_mode_id ON cards(mode, id);
            CREATE INDEX IF NOT EXISTS idx_pois_mode_dest ON pois(mode, lower(destination));
            """
        )
        con.commit()
    finally:
        con.close()
