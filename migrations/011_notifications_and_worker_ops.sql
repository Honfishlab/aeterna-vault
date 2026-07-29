CREATE TABLE IF NOT EXISTS user_notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('error','warning','success','info')),
  title text NOT NULL,
  message text NOT NULL,
  action_view text,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_notifications_inbox_idx ON user_notifications(user_id,read_at,created_at DESC);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_name text PRIMARY KEY,
  status text NOT NULL DEFAULT 'healthy',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  queue_name text NOT NULL,
  source_job_id text NOT NULL,
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(queue_name,source_job_id)
);
CREATE INDEX IF NOT EXISTS dead_letter_jobs_open_idx ON dead_letter_jobs(queue_name,created_at) WHERE resolved_at IS NULL;

ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
ALTER TABLE media_processing_jobs ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;
