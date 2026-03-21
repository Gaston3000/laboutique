-- Add preferred delivery zone column to users table
-- Stores {city, zone, postalCode} as JSON text so it persists across devices
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_delivery_zone TEXT;
