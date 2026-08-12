ALTER TABLE arweave_storage_jobs
  ADD COLUMN IF NOT EXISTS album_name text;

UPDATE arweave_storage_jobs AS archive
SET album_name = COALESCE(
  (SELECT media.album_name FROM media_objects AS media WHERE media.id = archive.media_object_id),
  (
    SELECT job.album_name
    FROM media_import_jobs AS job
    WHERE job.media_object_id = archive.media_object_id
      AND job.album_name IS NOT NULL
    ORDER BY job.created_at DESC
    LIMIT 1
  )
)
WHERE archive.album_name IS NULL
  AND archive.media_object_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arweave_storage_jobs_user_album_idx
  ON arweave_storage_jobs(user_id, album_name, created_at DESC);
