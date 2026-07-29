CREATE TABLE IF NOT EXISTS arweave_collection_viewers (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  transaction_id text NOT NULL UNIQUE,
  manifest_sha256 text NOT NULL,
  item_count integer NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','confirmed','failed')),
  block_height bigint,
  confirmations integer NOT NULL DEFAULT 0,
  error_message text,
  submitted_at timestamptz NOT NULL DEFAULT NOW(),
  confirmed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arweave_collection_viewers_user_idx
  ON arweave_collection_viewers(user_id,submitted_at DESC);
