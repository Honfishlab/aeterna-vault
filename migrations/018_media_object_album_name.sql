ALTER TABLE media_objects
  ADD COLUMN IF NOT EXISTS album_name text;

UPDATE media_objects AS media
SET album_name = (
  SELECT job.album_name
  FROM media_import_jobs AS job
  WHERE job.media_object_id = media.id
    AND job.album_name IS NOT NULL
  ORDER BY job.created_at DESC
  LIMIT 1
)
WHERE media.album_name IS NULL
  AND EXISTS (
    SELECT 1
    FROM media_import_jobs AS job
    WHERE job.media_object_id = media.id
      AND job.album_name IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS media_objects_user_album_idx
  ON media_objects(user_id, album_name)
  WHERE deleted_at IS NULL;
