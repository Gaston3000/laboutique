-- Migration: Add order notification system
-- Adds new order statuses, notifications table, and email log

-- 1. Extend order status options to include 'confirmado' and 'listo_retiro'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('nuevo', 'pago', 'confirmado', 'preparado', 'listo_retiro', 'enviado', 'entregado', 'cancelado'));

-- 2. Create admin notifications table
CREATE TABLE IF NOT EXISTS order_notifications (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_notifications_unread
  ON order_notifications (is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_order_notifications_order
  ON order_notifications (order_id);

-- 3. Create email log table (prevent duplicates)
CREATE TABLE IF NOT EXISTS order_email_log (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_email_log_unique
  ON order_email_log (order_id, email_type);
