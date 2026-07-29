ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'starter';
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_bytes bigint NOT NULL DEFAULT 5368709120;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS account_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_tokens_lookup_idx ON account_tokens(token_hash, purpose, expires_at);

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key_hash text NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT NOW(),
  attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY(key_hash, action)
);

CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events(created_at DESC);
