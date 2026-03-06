CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  short_description TEXT,
  long_description TEXT,
  price_ars NUMERIC(12, 2) NOT NULL CHECK (price_ars >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  categories TEXT[] NOT NULL DEFAULT '{}',
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  profile_title TEXT,
  phone TEXT,
  avatar_url TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  password_hash TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  wix_order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  contact_email TEXT,
  customer_note TEXT,
  purchase_extra_data TEXT,
  order_items_count INTEGER,
  shipping_zone TEXT,
  shipping_method TEXT,
  delivery_time TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_company TEXT,
  shipping_country TEXT,
  shipping_state TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  billing_name TEXT,
  billing_phone TEXT,
  billing_company TEXT,
  billing_country TEXT,
  billing_state TEXT,
  billing_city TEXT,
  billing_address TEXT,
  billing_postal_code TEXT,
  payment_status TEXT,
  payment_method TEXT,
  fulfillment_status TEXT,
  tracking_number TEXT,
  fulfillment_service TEXT,
  shipping_label TEXT,
  currency TEXT,
  net_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (net_amount_ars >= 0),
  payment_card_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (payment_card_amount_ars >= 0),
  shipping_cost_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost_ars >= 0),
  tax_total_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_total_ars >= 0),
  discount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_ars >= 0),
  promo_code TEXT,
  total_ars NUMERIC(12, 2) NOT NULL CHECK (total_ars >= 0),
  status TEXT NOT NULL CHECK (status IN ('nuevo', 'pago', 'preparado', 'enviado', 'entregado', 'cancelado')),
  source TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  variant_id INTEGER,
  brand TEXT,
  product_name TEXT NOT NULL,
  wix_variant TEXT,
  wix_sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  refunded_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refunded_quantity >= 0),
  unit_price_ars NUMERIC(12, 2) NOT NULL CHECK (unit_price_ars >= 0),
  item_weight NUMERIC(12, 3),
  custom_text TEXT,
  deposit_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount_ars >= 0),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE SEQUENCE IF NOT EXISTS order_invoice_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS order_invoices (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  member_status TEXT,
  last_activity TEXT,
  last_activity_at TIMESTAMP,
  primary_address TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  session_id TEXT,
  path TEXT,
  full_url TEXT,
  referrer TEXT,
  referrer_host TEXT,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  term TEXT,
  content TEXT,
  device_type TEXT,
  browser_name TEXT,
  os_name TEXT,
  user_agent TEXT,
  language TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  timezone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  presentation TEXT,
  sku TEXT UNIQUE,
  price_delta_ars NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rules (
  id SERIAL PRIMARY KEY,
  zone TEXT NOT NULL UNIQUE,
  base_cost_ars NUMERIC(12, 2) NOT NULL CHECK (base_cost_ars >= 0),
  free_shipping_from_ars NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (free_shipping_from_ars >= 0),
  eta_min_days INTEGER NOT NULL DEFAULT 1 CHECK (eta_min_days > 0),
  eta_max_days INTEGER NOT NULL DEFAULT 3 CHECK (eta_max_days >= eta_min_days),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed', 'volume', 'combo', 'two_for_one')),
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  min_qty INTEGER,
  min_subtotal_ars NUMERIC(12, 2),
  product_id INTEGER REFERENCES products(id),
  target_product_id INTEGER REFERENCES products(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('error', 'improvement', 'product_request')),
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'medium', 'low')),
  category TEXT CHECK (category IN ('tecnico', 'visual', 'contenido', 'productos', 'rendimiento', 'otros')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'testing', 'done')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  requester_name TEXT,
  requester_email TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closed_at TIMESTAMP,
  duplicate_of_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id INTEGER,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('admin', 'client')),
  author_name TEXT,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  previous_value JSONB,
  next_value JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_user ON tickets(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_web_analytics_occurred_at ON web_analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_analytics_event_type ON web_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_web_analytics_session_id ON web_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_web_analytics_visitor_id ON web_analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order_id ON order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_invoice_number ON order_invoices(invoice_number);

UPDATE tickets
SET public_id = id::text
WHERE public_id IS DISTINCT FROM id::text;

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wix_order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_extra_data TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items_count INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_company TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_country TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_postal_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_service TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS net_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_card_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_total_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS wix_variant TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS wix_sku TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS refunded_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_weight NUMERIC(12, 3);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS custom_text TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deposit_amount_ars NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_status TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_activity TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS previous_value JSONB;
ALTER TABLE ticket_history ADD COLUMN IF NOT EXISTS next_value JSONB;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT con.conname
    FROM pg_constraint con
    INNER JOIN pg_class rel ON rel.oid = con.conrelid
    INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'c'
      AND rel.relname = 'tickets'
      AND nsp.nspname = 'public'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS %I', constraint_row.conname);
  END LOOP;
END $$;

UPDATE orders SET status = 'pago' WHERE status = 'confirmado';
UPDATE orders SET status = 'preparado' WHERE status = 'preparando';

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('nuevo', 'pago', 'preparado', 'enviado', 'entregado', 'cancelado'));

ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('not_started', 'in_progress', 'testing', 'done'));

UPDATE products
SET brand = CASE
  WHEN name ILIKE '%Lavandina%' THEN 'Boutique Clean'
  WHEN name ILIKE '%Detergente%' THEN 'Fresh Home'
  ELSE 'Aromas Plus'
END
WHERE brand IS NULL;

INSERT INTO customers (name, email, phone)
SELECT 'Juan Pérez', 'juan.perez@example.com', '11-5555-0101'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'juan.perez@example.com');

INSERT INTO customers (name, email, phone)
SELECT 'María Gómez', 'maria.gomez@example.com', '11-5555-0202'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'maria.gomez@example.com');

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

INSERT INTO users (name, email, role, password_hash, address)
VALUES
  ('Administrador', 'admin@laboutique.com', 'admin', '$2b$10$BCXzmmNfiKNCuHsB608RK.XMZVFjzcluwVgnB/9f3OSFqZMIuXIG2', 'Murillo 1121')
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  address = EXCLUDED.address;

UPDATE orders o
SET customer_id = c.id,
    shipping_zone = COALESCE(o.shipping_zone, CASE WHEN o.customer_address ILIKE '%CABA%' THEN 'caba' ELSE 'gba' END),
    shipping_cost_ars = COALESCE(o.shipping_cost_ars, 0),
    discount_ars = COALESCE(o.discount_ars, 0)
FROM customers c
WHERE c.name = o.customer_name
  AND o.customer_id IS NULL;

UPDATE order_items oi
SET brand = p.brand
FROM products p
WHERE oi.product_id = p.id
  AND oi.brand IS NULL;

INSERT INTO product_variants (product_id, name, presentation, sku, price_delta_ars, stock)
SELECT p.id, 'Botella 1L', '1L', 'LAVA-1L', 0, 40
FROM products p
WHERE p.name = 'Lavandina 1L'
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE sku = 'LAVA-1L');

INSERT INTO product_variants (product_id, name, presentation, sku, price_delta_ars, stock)
SELECT p.id, 'Botella 2L', '2L', 'LAVA-2L', 1800, 20
FROM products p
WHERE p.name = 'Lavandina 1L'
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE sku = 'LAVA-2L');

INSERT INTO shipping_rules (zone, base_cost_ars, free_shipping_from_ars, eta_min_days, eta_max_days)
VALUES
  ('caba', 2500, 35000, 1, 2),
  ('gba', 3900, 45000, 1, 3),
  ('retiro_local', 0, 0, 1, 1)
ON CONFLICT (zone) DO UPDATE
SET
  base_cost_ars = EXCLUDED.base_cost_ars,
  free_shipping_from_ars = EXCLUDED.free_shipping_from_ars,
  eta_min_days = EXCLUDED.eta_min_days,
  eta_max_days = EXCLUDED.eta_max_days,
  is_active = TRUE;

DELETE FROM shipping_rules
WHERE zone = 'interior';

INSERT INTO promotions (code, name, type, value, min_qty, min_subtotal_ars, product_id, active)
SELECT '2X1LAVA', '2x1 Lavandina', 'two_for_one', 0, 2, NULL, p.id, TRUE
FROM products p
WHERE p.name = 'Lavandina 1L'
  AND NOT EXISTS (SELECT 1 FROM promotions WHERE code = '2X1LAVA');

INSERT INTO promotions (code, name, type, value, min_qty, min_subtotal_ars, active)
VALUES ('LIMPIEZA10', '10% en compras grandes', 'percent', 10, NULL, 30000, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO categories (name)
SELECT DISTINCT TRIM(category_name) AS name
FROM products p
CROSS JOIN LATERAL UNNEST(p.categories) AS category_name
WHERE TRIM(category_name) <> ''
ON CONFLICT (name) DO NOTHING;

WITH canonical AS (
  SELECT DISTINCT seeded.name
  FROM UNNEST(
    ARRAY[
      'Todos los productos',
      'Accesorios',
      'Acento',
      'Aerosoles',
      'Ala',
      'Ambientes',
      'Amoníaco',
      'Antihúmedas',
      'Aparato Saphirus',
      'Aprestos',
      'Ariel',
      'Aromatizadores',
      'Ayudín',
      'Baygon',
      'Baño',
      'Blem',
      'Bolsas de Resistencia',
      'Broches',
      'Buena Mandarina',
      'Buenos Días',
      'Canasta',
      'Casa y Jardín',
      'Cauchet',
      'Cepillos',
      'Ceramicol',
      'Ceras',
      'Cif',
      'Concotes',
      'Cocina',
      'Comfort',
      'Cremas',
      'Desechables y Complementos',
      'Desengrasantes',
      'Detergente',
      'Detergentes y Lavavajillas',
      'Difusor Saphirus',
      'Difusores Premium Saphirus',
      'Doncella',
      'Downy',
      'Drastik',
      'Drive',
      'Duracell',
      'Elegante',
      'Enefe',
      'Energizer',
      'Escobillones',
      'Espirales',
      'Espon',
      'Esponjas',
      'Extralimp',
      'Finish',
      'Florida',
      'Fósforos',
      'Geltek',
      'Genérico',
      'Gigante',
      'Glade',
      'Guantes',
      'Harpic',
      'Higiénico',
      'Holder Sensaciones Saphirus',
      'Home Saphirus',
      'Insecticidas',
      'Jabón',
      'Jabón de Manos',
      'Jabones para Ropa',
      'Ki-Ma',
      'La Unión',
      'Lavandina',
      'Limpia Hornos',
      'Limpia Metales',
      'Limpia Tapizados',
      'Limpia Vidrios',
      'Limpiador Cremoso',
      'Limpieza Profunda',
      'Líquidos de Piso',
      'Lysoform',
      'Magistral',
      'Make',
      'Mapa',
      'Max Aroma',
      'Media Naranja',
      'Melville',
      'Mortimer',
      'Mr Músculo',
      'Más Vendidos',
      'New Pel',
      'NH3',
      'Nitidess',
      'Ofertas & Promociones',
      'OFF!',
      'Otros',
      'Palos',
      'Pato Purific',
      'Paños',
      'Pañuelos',
      'Perdigón',
      'Pisos y Superficies',
      'Plásticos',
      'Plumeros',
      'Poett',
      'Procenex',
      'Qualibest',
      'Quitamanchas en Aerosol',
      'Quitamanchas Ropa',
      'Raid',
      'Repelente de Insectos',
      'Robin',
      'Rollos de Cocina',
      'Ropa',
      'Rugbee',
      'Salzano',
      'Saphirus',
      'SC Johnson',
      'Secador de Vidrios',
      'Secadores de Piso',
      'Seiseme',
      'Sensaciones Saphirus',
      'Sipack',
      'Skip',
      'Sopapas',
      'Suavizantes',
      'Suiza',
      'Supy',
      'Tabletas',
      'Textil Saphirus',
      'Trapos',
      'Trenet',
      'Vanish',
      'Vasitex',
      'Velas',
      'Velas Make',
      'Villa Iris',
      'Virulana',
      'Vivere',
      'Woolite',
      'Xper',
      'Zorro'
    ]::text[]
  ) AS seeded(name)
  WHERE TRIM(seeded.name) <> ''
),
canonical_keys AS (
  SELECT
    name,
    translate(lower(name), 'áéíóúüñ', 'aeiouun') AS normalized_key
  FROM canonical
),
product_categories AS (
  SELECT
    p.id,
    COALESCE(
      ARRAY(
        SELECT DISTINCT COALESCE(ck.name, category_name)
        FROM UNNEST(p.categories) AS category_name
        LEFT JOIN canonical_keys ck
          ON translate(lower(category_name), 'áéíóúüñ', 'aeiouun') = ck.normalized_key
        ORDER BY 1
      ),
      ARRAY[]::text[]
    ) AS normalized_categories
  FROM products p
),
updated_products AS (
  UPDATE products p
  SET categories = pc.normalized_categories
  FROM product_categories pc
  WHERE p.id = pc.id
  RETURNING p.id
),
deleted_noncanonical AS (
  DELETE FROM categories c
  USING canonical_keys ck
  WHERE translate(lower(c.name), 'áéíóúüñ', 'aeiouun') = ck.normalized_key
    AND c.name <> ck.name
  RETURNING c.id
)
INSERT INTO categories (name)
SELECT name
FROM canonical
ON CONFLICT (name) DO NOTHING;
