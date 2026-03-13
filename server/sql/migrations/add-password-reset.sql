-- Migration: add password reset columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_password_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS reset_password_code_expires_at TIMESTAMPTZ;
