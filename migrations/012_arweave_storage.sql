CREATE TABLE IF NOT EXISTS arweave_storage_jobs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_object_id text REFERENCES media_objects(id) ON DELETE SET NULL,
  r2_object_key text NOT NULL,
  original_name text NOT NULL,
  original_content_type text NOT NULL,
  encrypted_size_bytes bigint NOT NULL,
  payload_sha256 text NOT NULL,
  encryption_algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  encryption_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging','queued','uploading','submitted','confirmed','failed','cancelled')),
  transaction_id text,
  reward_winston text,
  block_height bigint,
  confirmations integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS arweave_storage_jobs_queue_idx ON arweave_storage_jobs(status,next_attempt_at,created_at);
CREATE INDEX IF NOT EXISTS arweave_storage_jobs_user_idx ON arweave_storage_jobs(user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS arweave_storage_jobs_tx_idx ON arweave_storage_jobs(transaction_id) WHERE transaction_id IS NOT NULL;
