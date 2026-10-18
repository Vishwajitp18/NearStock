-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Try enabling postgis if available
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension not available directly; enabling compatibility functions for point and geography';
  END;
END $$;

-- PostGIS Compatibility layer ONLY if PostGIS extension is not installed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geography') THEN
      CREATE DOMAIN geography AS point;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geometry') THEN
      CREATE DOMAIN geometry AS point;
    END IF;

    EXECUTE $func$
      CREATE OR REPLACE FUNCTION ST_MakePoint(lng double precision, lat double precision)
      RETURNS point AS $f$
        SELECT point(lng, lat);
      $f$ LANGUAGE SQL IMMUTABLE;

      CREATE OR REPLACE FUNCTION ST_SetSRID(pt point, srid integer)
      RETURNS point AS $f$
        SELECT pt;
      $f$ LANGUAGE SQL IMMUTABLE;

      CREATE OR REPLACE FUNCTION ST_X(pt point)
      RETURNS double precision AS $f$
        SELECT pt[0];
      $f$ LANGUAGE SQL IMMUTABLE;

      CREATE OR REPLACE FUNCTION ST_Y(pt point)
      RETURNS double precision AS $f$
        SELECT pt[1];
      $f$ LANGUAGE SQL IMMUTABLE;

      CREATE OR REPLACE FUNCTION ST_Distance(p1 point, p2 point)
      RETURNS double precision AS $f$
        SELECT 6371000.0 * 2.0 * asin(sqrt(
          power(sin(radians(p2[1] - p1[1]) / 2.0), 2) +
          cos(radians(p1[1])) * cos(radians(p2[1])) *
          power(sin(radians(p2[0] - p1[0]) / 2.0), 2)
        ));
      $f$ LANGUAGE SQL IMMUTABLE;

      CREATE OR REPLACE FUNCTION ST_DWithin(p1 point, p2 point, radius_m double precision)
      RETURNS boolean AS $f$
        SELECT ST_Distance(p1, p2) <= radius_m;
      $f$ LANGUAGE SQL IMMUTABLE;
    $func$;
  END IF;
END $$;

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('customer','shopkeeper','admin')),
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Shops table
CREATE TABLE IF NOT EXISTS shops (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  description        TEXT,
  phone              TEXT,
  address            TEXT NOT NULL,
  city               TEXT,
  pincode            TEXT,
  location           GEOGRAPHY(Point, 4326) NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','suspended','rejected')),
  is_open_now        BOOLEAN DEFAULT TRUE,
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_radius_m  INT,
  avg_rating         NUMERIC(2,1) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shops_location ON shops USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_shops_status   ON shops (status);
CREATE INDEX IF NOT EXISTS idx_shops_owner    ON shops (owner_id);

-- 3. Shop hours table
CREATE TABLE IF NOT EXISTS shop_hours (
  id        SERIAL PRIMARY KEY,
  shop_id   UUID REFERENCES shops(id) ON DELETE CASCADE,
  weekday   SMALLINT CHECK (weekday BETWEEN 0 AND 6),
  opens_at  TIME,
  closes_at TIME,
  is_closed BOOLEAN DEFAULT FALSE,
  UNIQUE(shop_id, weekday)
);

-- 4. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  parent_id INT REFERENCES categories(id) ON DELETE SET NULL
);

-- 5. Products table (Master catalog)
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  brand       TEXT,
  barcode     TEXT UNIQUE,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  unit        TEXT,
  image_url   TEXT,
  description TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING GIN (brand gin_trgm_ops);

-- 6. Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp                 NUMERIC(10,2),
  quantity            INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INT DEFAULT 5,
  is_available        BOOLEAN GENERATED ALWAYS AS (quantity > 0) STORED,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (shop_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory (product_id) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory (shop_id);

-- 7. Stock movements log
CREATE TABLE IF NOT EXISTS stock_movements (
  id           BIGSERIAL PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  change_qty   INT NOT NULL,
  reason       TEXT CHECK (reason IN ('restock','sale','manual_adjust','return','order','expired')),
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON stock_movements (inventory_id);

-- 8. Favourite shops
CREATE TABLE IF NOT EXISTS favourite_shops (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, shop_id)
);

-- 9. Search logs
CREATE TABLE IF NOT EXISTS search_logs (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  query         TEXT,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  location      GEOGRAPHY(Point, 4326),
  results_count INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 10. Orders
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  status      TEXT CHECK (status IN ('placed','accepted','ready','completed','cancelled','expired')),
  type        TEXT CHECK (type IN ('reserve_pickup','delivery')),
  total       NUMERIC(10,2),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 11. Order items
CREATE TABLE IF NOT EXISTS order_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity   INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- 12. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID REFERENCES shops(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT,
  payload    JSONB,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Device tokens
CREATE TABLE IF NOT EXISTS device_tokens (
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  token    TEXT PRIMARY KEY,
  platform TEXT
);

-- 15. OTPs for authentication
CREATE TABLE IF NOT EXISTS otps (
  phone      TEXT PRIMARY KEY,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Idempotency keys
CREATE TABLE IF NOT EXISTS idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,
  response_code   INT NOT NULL,
  response_body   JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
