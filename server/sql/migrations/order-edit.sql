-- Migración: soporte para edición de pedidos
-- Agrega columna surcharge_ars (cargo adicional) a la tabla orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS surcharge_ars NUMERIC(12,2) NOT NULL DEFAULT 0;
