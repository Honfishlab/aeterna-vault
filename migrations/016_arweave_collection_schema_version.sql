ALTER TABLE arweave_collection_viewers
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
