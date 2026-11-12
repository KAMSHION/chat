CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  reported_user_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  reviewer_id INTEGER,
  review_type TEXT NOT NULL CHECK (review_type IN ('manual', 'content-moderation', 'text-censor', 'uapis-profanity')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'ai_reviewed', 'reviewed')),
  reason TEXT,
  message_text TEXT NOT NULL,
  ai_result TEXT,
  decision TEXT CHECK (decision IS NULL OR decision IN ('violation', 'normal')),
  reviewed_by INTEGER,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_pending_review
ON reports (status, review_type, reviewer_id, created_at);
