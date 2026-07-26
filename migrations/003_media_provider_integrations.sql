CREATE TABLE IF NOT EXISTS provider_oauth_states (
  state_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  return_to text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS provider_oauth_states_expires_at_idx ON provider_oauth_states(expires_at);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS media_provider_connections (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  account_email text,
  display_name text,
  encrypted_access_token text NOT NULL,
  encrypted_refresh_token text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT $$active$$ CHECK (status IN ($$active$$, $$expired$$, $$revoked$$)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, provider_account_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_provider_connections_user_provider_idx ON media_provider_connections(user_id, provider);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS media_import_jobs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_connection_id text NOT NULL REFERENCES media_provider_connections(id) ON DELETE CASCADE,
  provider_file_id text NOT NULL,
  provider_file_name text NOT NULL,
  status text NOT NULL DEFAULT $$queued$$ CHECK (status IN ($$queued$$, $$transferring$$, $$complete$$, $$failed$$)),
  media_object_id text REFERENCES media_objects(id) ON DELETE SET NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, provider_connection_id, provider_file_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_import_jobs_user_id_idx ON media_import_jobs(user_id);
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS source_provider text;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS source_id text;
-- statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS media_objects_user_source_idx ON media_objects(user_id, source_provider, source_id) WHERE source_provider IS NOT NULL AND source_id IS NOT NULL;
