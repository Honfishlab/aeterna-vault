CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK (role IN ($$Vault Owner$$, $$Trustee$$, $$Heir / Beneficiary$$)), status text NOT NULL DEFAULT $$active$$ CHECK (status IN ($$active$$, $$disabled$$)), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(), user_agent text, ip_address text, created_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS vault_snapshots (user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data jsonb NOT NULL DEFAULT $$ {} $$::jsonb, revision bigint NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS albums (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT $$$$, cover_memory_id text, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS memories (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, album_id text REFERENCES albums(id) ON DELETE SET NULL, title text NOT NULL, media_type text NOT NULL, storage_url text, metadata jsonb NOT NULL DEFAULT $$ {} $$::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS heirs (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, email text NOT NULL, relationship text NOT NULL DEFAULT $$$$, access_role text NOT NULL DEFAULT $$Heir / Beneficiary$$, status text NOT NULL DEFAULT $$pending$$, metadata jsonb NOT NULL DEFAULT $$ {} $$::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS heirs_user_id_idx ON heirs(user_id);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id text REFERENCES users(id) ON DELETE SET NULL, event_type text NOT NULL, entity_type text, entity_id text, metadata jsonb NOT NULL DEFAULT $$ {} $$::jsonb, created_at timestamptz NOT NULL DEFAULT now());
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_events_user_id_idx ON audit_events(user_id);