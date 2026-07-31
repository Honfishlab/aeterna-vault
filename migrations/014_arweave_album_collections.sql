ALTER TABLE arweave_collection_viewers
  ADD COLUMN IF NOT EXISTS album_name text;

CREATE INDEX IF NOT EXISTS arweave_collection_viewers_album_idx
  ON arweave_collection_viewers(user_id,album_name,submitted_at DESC);
