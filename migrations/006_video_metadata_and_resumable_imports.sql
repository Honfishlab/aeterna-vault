ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS width integer;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS height integer;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS duration_ms bigint;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS captured_at timestamptz;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS thumbnail_object_key text;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS multipart_upload_id text;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS uploaded_parts jsonb NOT NULL DEFAULT $$[]$$::jsonb;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS resume_offset bigint NOT NULL DEFAULT 0;
