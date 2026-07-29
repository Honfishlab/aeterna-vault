ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS purge_after timestamptz;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS preferred_poster_second numeric;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS playback_variants jsonb NOT NULL DEFAULT $$ {} $$::jsonb;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS technical_metadata jsonb NOT NULL DEFAULT $$ {} $$::jsonb;
-- statement-breakpoint
ALTER TABLE provider_picker_sessions ADD COLUMN IF NOT EXISTS album_name text;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS album_name text;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
-- statement-breakpoint
ALTER TABLE media_processing_jobs ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_objects_purge_idx ON media_objects(purge_after) WHERE deleted_at IS NOT NULL;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_processing_retry_idx ON media_processing_jobs(status,next_attempt_at,created_at);
