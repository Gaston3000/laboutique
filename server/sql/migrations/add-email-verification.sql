-- Migration: Add email verification fields to users table
-- Date: 2026-03-12

-- Add email verification fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP;

-- Add index for faster lookups on verification
CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
