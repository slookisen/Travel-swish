-- Recommendation lifecycle: sessions, result exposure, and explicit feedback.

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  last_ts INTEGER NOT NULL,
  mode TEXT NOT NULL,
  destination TEXT NOT NULL,
  context_json TEXT NOT NULL,
  profile_version INTEGER NOT NULL,
  client_version TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  mode TEXT NOT NULL,
  destination TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_version TEXT NOT NULL,
  request_json TEXT NOT NULL,
  result_ids_json TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS result_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  run_id TEXT,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK(feedback IN ('useful', 'not_relevant', 'visited', 'wrong_info')),
  mode TEXT NOT NULL,
  destination TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  ts INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  FOREIGN KEY(run_id) REFERENCES recommendation_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last ON sessions(user_id, last_ts DESC);
CREATE INDEX IF NOT EXISTS idx_runs_user_created ON recommendation_runs(user_id, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_runs_session_created ON recommendation_runs(session_id, created_ts DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_ts ON result_feedback(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_item_value ON result_feedback(item_id, feedback);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_run_item_user ON result_feedback(run_id, item_id, user_id);
