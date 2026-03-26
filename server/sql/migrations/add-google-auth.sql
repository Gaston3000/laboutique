-- Add Google OAuth support columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';

-- Allow password_hash to be NULL for Google-only users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for fast Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
