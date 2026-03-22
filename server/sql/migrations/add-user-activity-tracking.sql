-- Add user_id to web_analytics_events to link logged-in user sessions
ALTER TABLE web_analytics_events ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Index for efficient user activity queries
CREATE INDEX IF NOT EXISTS idx_web_analytics_user_id ON web_analytics_events (user_id) WHERE user_id IS NOT NULL;
