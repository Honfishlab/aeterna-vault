CREATE TABLE IF NOT EXISTS archival_passphrase_recovery (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  ciphertext text NOT NULL,
  salt text NOT NULL,
  iv text NOT NULL,
  iterations integer NOT NULL DEFAULT 310000,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  last_retrieved_at timestamptz
);

-- statement-breakpoint
CREATE INDEX IF NOT EXISTS archival_passphrase_recovery_user_idx
  ON archival_passphrase_recovery(user_id, updated_at DESC);
