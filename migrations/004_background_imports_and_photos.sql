ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS provider_payload jsonb NOT NULL DEFAULT $$ {} $$::jsonb;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS bytes_total bigint NOT NULL DEFAULT 0;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS bytes_transferred bigint NOT NULL DEFAULT 0;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS provider_picker_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_connection_id text NOT NULL REFERENCES media_provider_connections(id) ON DELETE CASCADE,
  provider_session_id text NOT NULL UNIQUE,
  picker_uri text NOT NULL,
  status text NOT NULL DEFAULT $$waiting$$ CHECK (status IN ($$waiting$$, $$ready$$, $$queued$$, $$expired$$)),
  expires_at timestamptz NOT NULL DEFAULT now() + INTERVAL $$1 hour$$,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS provider_picker_sessions_user_idx ON provider_picker_sessions(user_id, created_at DESC);
