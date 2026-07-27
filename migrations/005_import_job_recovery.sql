ALTER TABLE media_import_jobs DROP CONSTRAINT IF EXISTS media_import_jobs_status_check;
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD CONSTRAINT media_import_jobs_status_check CHECK (status IN ($$queued$$, $$transferring$$, $$cancel_requested$$, $$cancelled$$, $$complete$$, $$failed$$));
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS media_import_jobs_recovery_idx ON media_import_jobs(status, updated_at);
-- statement-breakpoint
ALTER TABLE media_import_jobs ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
