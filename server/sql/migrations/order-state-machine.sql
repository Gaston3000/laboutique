-- ============================================================
-- Migración: State machine de pedidos
-- ============================================================
-- 1. Eliminar 'confirmado' del CHECK constraint de orders.status
-- 2. Agregar columna archived_at para archivar pedidos
-- ============================================================

-- 1. Recrear constraint sin 'confirmado'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('nuevo','pago','preparado','listo_retiro','enviado','entregado','cancelado'));

-- 2. Columna para archivar (NULL = no archivado, timestamp = archivado)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL;
