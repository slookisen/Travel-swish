-- 001_initial.sql
-- Baseline migration for Travel-Swish v2 backend.
-- This mirrors init_db() in backend/app/db.py.
-- Not executed by a migration runner — init_db() handles creation at startup.
-- Kept here for documentation and change tracking.

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

CREATE TABLE IF NOT EXISTS pref_stats (
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  facet TEXT NOT NULL,
  num REAL NOT NULL DEFAULT 0,
  den REAL NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, mode, facet),
  FOREIGN KEY(user_id) REFERENCES users(id)
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
