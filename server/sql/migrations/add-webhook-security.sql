-- Webhook logs: auditoría completa de cada webhook recibido
CREATE TABLE IF NOT EXISTS webhook_logs (
  id            SERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL,                -- 'payment', 'merchant_order', etc.
  event_action  TEXT,                         -- 'payment.created', 'payment.updated'
  data_id       BIGINT NOT NULL,              -- MP payment id
  order_id      INTEGER REFERENCES orders(id),
  mp_status     TEXT,                         -- 'approved', 'rejected', etc.
  signature_ok  BOOLEAN NOT NULL DEFAULT FALSE,
  processed     BOOLEAN NOT NULL DEFAULT FALSE,
  skipped       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  raw_body      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_data_id ON webhook_logs (data_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id ON webhook_logs (order_id);

-- Idempotencia: evita procesar el mismo payment+status dos veces
CREATE TABLE IF NOT EXISTS webhook_processed (
  id            SERIAL PRIMARY KEY,
  payment_id    BIGINT NOT NULL,
  mp_status     TEXT NOT NULL,
  order_id      INTEGER REFERENCES orders(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_id, mp_status)
);
