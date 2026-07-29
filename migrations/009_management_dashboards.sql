CREATE TABLE IF NOT EXISTS deleted_albums (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_name text NOT NULL,
  item_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  deleted_at timestamptz NOT NULL DEFAULT NOW(),
  purge_after timestamptz NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  restored_at timestamptz,
  permanently_deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS deleted_albums_user_active_idx
  ON deleted_albums(user_id, deleted_at DESC)
  WHERE restored_at IS NULL AND permanently_deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_import_jobs_album_history_idx
  ON media_import_jobs(user_id, album_name, created_at DESC);
