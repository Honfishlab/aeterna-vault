ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS playback_object_key text;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS thumbnail_variants jsonb NOT NULL DEFAULT $$ {} $$::jsonb;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT $$not_required$$;
-- statement-breakpoint
ALTER TABLE media_objects ADD COLUMN IF NOT EXISTS processing_error text;
-- statement-breakpoint
ALTER TABLE media_objects DROP CONSTRAINT IF EXISTS media_objects_processing_status_check;
-- statement-breakpoint
ALTER TABLE media_objects ADD CONSTRAINT media_objects_processing_status_check CHECK (processing_status IN ($$not_required$$,$$queued$$,$$processing$$,$$ready$$,$$failed$$));
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS media_processing_jobs (
  id text PRIMARY KEY,
  media_object_id text NOT NULL UNIQUE REFERENCES media_objects(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT $$queued$$ CHECK (status IN ($$queued$$,$$processing$$,$$complete$$,$$failed$$)),
  attempts integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_processing_jobs_status_idx ON media_processing_jobs(status, created_at);
