CREATE TABLE IF NOT EXISTS media_objects (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  status text NOT NULL DEFAULT $$pending$$ CHECK (status IN ($$pending$$, $$ready$$, $$failed$$)),
  etag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_objects_user_id_idx ON media_objects(user_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_objects_status_idx ON media_objects(status);
