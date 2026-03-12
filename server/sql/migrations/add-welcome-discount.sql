-- Migration: Add welcome discount tracking to users table
-- Date: 2026-03-12

-- Add welcome discount fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS welcome_discount_active BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS welcome_discount_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS welcome_discount_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_welcome_discount ON users(welcome_discount_active, welcome_discount_expires_at);
