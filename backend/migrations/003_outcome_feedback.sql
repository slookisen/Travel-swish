-- Preserve every existing feedback row while expanding the CHECK constraint.
-- The migration runner executes this entire migration in one transaction.
CREATE TABLE result_feedback_v3 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  run_id TEXT,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  feedback TEXT NOT NULL CHECK(feedback IN ('useful', 'not_relevant', 'visited', 'wrong_info', 'enjoyed', 'not_for_me')),
  mode TEXT NOT NULL,
  destination TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  ts INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(session_id) REFERENCES sessions(id),
  FOREIGN KEY(run_id) REFERENCES recommendation_runs(id)
);
INSERT INTO result_feedback_v3 SELECT * FROM result_feedback;
DROP TABLE result_feedback;
ALTER TABLE result_feedback_v3 RENAME TO result_feedback;
CREATE INDEX idx_feedback_user_ts ON result_feedback(user_id, ts DESC);
CREATE INDEX idx_feedback_item_value ON result_feedback(item_id, feedback);
CREATE UNIQUE INDEX idx_feedback_run_item_user ON result_feedback(run_id, item_id, user_id);
