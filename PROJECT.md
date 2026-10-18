# Hyperlocal Retail Inventory Platform — Backend Blueprint

A backend for three apps: **Customer app**, **Shopkeeper app**, **Admin panel**.
A customer searches for an item and sees every nearby shop that has it in stock, on a map, with each shop's price, distance and ETA, and can sort by nearest, fastest or cheapest.

---

## 1. Roles and What Each One Does

| Role | Main capabilities |
|---|---|
| **Customer** | Search an item, see nearby shops on a map within a chosen radius, compare prices, see nearest / fastest / cheapest, open directions, save favourite shops, (later) reserve or order |
| **Shopkeeper** | Register shop, set location and timings, add items (from the global catalog or custom), set price and stock, update stock quickly, see low-stock alerts, see sales and search demand |
| **Admin** | Approve/suspend shopkeepers, manage the global product catalog and categories, handle reports and fake listings, platform analytics |

---

## 2. Core User Flow (Customer)

1. Customer opens app, location is taken from GPS (or typed address).
2. Types "Amul butter 500g" (search with typo tolerance).
3. Backend finds the matching products, then all **open, in-stock** shops within radius (e.g. 3 km).
4. Response returns a list of shops, each with: price, stock status, distance, ETA, open/closed.
5. App shows pins on the map and a list sorted by the chosen mode (nearest / fastest / cheapest / best match).
6. Customer taps a shop and sees directions, shop phone, and the full item list.

---

## 3. High-Level Architecture

```
 ┌──────────────┐  ┌───────────────┐  ┌──────────────┐
 │ Customer App │  │ Shopkeeper App│  │ Admin Panel  │
 └──────┬───────┘  └──────┬────────┘  └──────┬───────┘
        └─────────────────┼──────────────────┘
                          ▼
                 ┌─────────────────┐
                 │   API Gateway   │  rate limit, auth (JWT), CORS
                 └────────┬────────┘
                          ▼
   ┌──────────────────────────────────────────────────┐
   │               Backend (Node.js + Express)        │
   │  Auth │ Shops │ Catalog │ Inventory │ Search     │
   │  Geo/Ranking │ Notifications │ Admin │ Analytics │
   └───┬──────────┬───────────┬────────────┬──────────┘
       │          │           │            │
       ▼          ▼           ▼            ▼
  PostgreSQL    Redis     Search engine   Message queue
  + PostGIS    (cache,    (Meilisearch /   (Kafka or
 (source of    geo cache,  Elasticsearch)   BullMQ) for
   truth)      rate limit)                  async events
                                               │
                                               ▼
                              Workers: stock alerts, search index sync,
                              analytics, push notifications

 External: Routing API (OSRM / Google Distance Matrix), Maps SDK on client,
           FCM push, S3/Cloudinary for images, SMS/OTP provider
```

**Design principle:** PostgreSQL + PostGIS is the single source of truth. Redis and the search engine are derived and can be rebuilt. Start as a **modular monolith** (one deployable, clean modules), split into services only if needed.

---

## 4. Tech Stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| API | Node.js + Express (TypeScript) | Fast to build, large ecosystem |
| DB | PostgreSQL 15+ with **PostGIS** | Real geo queries (`ST_DWithin`, KNN) |
| Cache | Redis | Hot search results, shop open/closed, rate limiting, sessions |
| Search | Meilisearch (simple) or Elasticsearch | Typo-tolerant, fast product search |
| Queue | BullMQ (start) → Kafka (scale) | Stock events, index sync, alerts |
| Auth | JWT access + refresh tokens, OTP login | Phone-number-first suits India |
| ORM | Prisma or Knex (raw SQL for geo queries) | PostGIS queries are easier in raw SQL |
| Files | S3 / Cloudinary | Product and shop images |
| Push | Firebase Cloud Messaging | Low-stock and order alerts |
| Routing | OSRM (self-host, free) or Google Distance Matrix | Real road ETA |
| Deploy | Docker + docker-compose, then cloud | Easy local setup |

---

## 5. Data Model (PostgreSQL)

Enable extensions: `CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm;`

### 5.1 Users and shops

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('customer','shopkeeper','admin')),
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE,
  password_hash TEXT,                       -- optional if OTP-only
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE shops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  description   TEXT,
  phone         TEXT,
  address       TEXT NOT NULL,
  city          TEXT,
  pincode       TEXT,
  location      GEOGRAPHY(Point, 4326) NOT NULL,   -- lng, lat
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','suspended','rejected')),
  is_open_now   BOOLEAN DEFAULT TRUE,              -- manual toggle by shopkeeper
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_radius_m  INT,
  avg_rating    NUMERIC(2,1) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shops_location ON shops USING GIST (location);
CREATE INDEX idx_shops_status   ON shops (status);

CREATE TABLE shop_hours (
  id        SERIAL PRIMARY KEY,
  shop_id   UUID REFERENCES shops(id) ON DELETE CASCADE,
  weekday   SMALLINT CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  opens_at  TIME,
  closes_at TIME,
  is_closed BOOLEAN DEFAULT FALSE
);
```

### 5.2 Catalog

```sql
CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  parent_id INT REFERENCES categories(id)
);

-- Global master catalog, maintained by admin. Many shops sell the same product.
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  brand       TEXT,
  barcode     TEXT UNIQUE,
  category_id INT REFERENCES categories(id),
  unit        TEXT,                    -- "500 g", "1 L", "pack of 6"
  image_url   TEXT,
  description TEXT,
  created_by  UUID REFERENCES users(id),
  is_verified BOOLEAN DEFAULT FALSE,   -- admin-verified catalog entry
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
```

### 5.3 Inventory (the heart of the system)

```sql
-- One row per (shop, product): that shop's price and stock.
CREATE TABLE inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id),
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mrp          NUMERIC(10,2),
  quantity     INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INT DEFAULT 5,
  is_available BOOLEAN GENERATED ALWAYS AS (quantity > 0) STORED,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (shop_id, product_id)
);
CREATE INDEX idx_inventory_product ON inventory (product_id) WHERE quantity > 0;

-- Append-only audit log of every stock change.
CREATE TABLE stock_movements (
  id          BIGSERIAL PRIMARY KEY,
  inventory_id UUID REFERENCES inventory(id),
  change_qty  INT NOT NULL,            -- +50 restock, -2 sale, -1 correction
  reason      TEXT CHECK (reason IN ('restock','sale','manual_adjust','return','order','expired')),
  actor_id    UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 5.4 Customer-side and later features

```sql
CREATE TABLE favourite_shops (
  user_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  PRIMARY KEY (user_id, shop_id)
);

CREATE TABLE search_logs (            -- demand analytics for shopkeepers
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  query       TEXT,
  product_id  UUID,
  location    GEOGRAPHY(Point, 4326),
  results_count INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: reserve / order
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id),
  shop_id     UUID REFERENCES shops(id),
  status      TEXT CHECK (status IN ('placed','accepted','ready','completed','cancelled','expired')),
  type        TEXT CHECK (type IN ('reserve_pickup','delivery')),
  total       NUMERIC(10,2),
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  quantity     INT NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL
);

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id),
  user_id     UUID REFERENCES users(id),
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id),
  type      TEXT,                      -- low_stock, shop_approved, order_update
  payload   JSONB,
  is_read   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE device_tokens (          -- for push
  user_id UUID REFERENCES users(id),
  token   TEXT PRIMARY KEY,
  platform TEXT
);
```

### 5.5 Entity relationships (summary)

```
users 1─┬─* shops ──1─* inventory *─1── products *─1── categories
        │                  │
        │                  └─* stock_movements
        ├─* favourite_shops, reviews, notifications, device_tokens
        └─* orders 1─* order_items ──> products
shops 1─* shop_hours
```

---

## 6. The Key Feature: "Where is this item near me?"

### 6.1 Step A — find product(s)
Search engine (or `pg_trgm`) turns the text query into one or more `product_id`s.

### 6.2 Step B — find nearby shops that stock it (PostGIS)

```sql
SELECT
  s.id            AS shop_id,
  s.name,
  s.phone,
  ST_Y(s.location::geometry) AS lat,
  ST_X(s.location::geometry) AS lng,
  i.price,
  i.quantity,
  ST_Distance(s.location, ST_MakePoint($lng,$lat)::geography) AS distance_m
FROM inventory i
JOIN shops s ON s.id = i.shop_id
WHERE i.product_id = $productId
  AND i.quantity > 0
  AND s.status = 'approved'
  AND s.is_open_now = TRUE
  AND ST_DWithin(s.location, ST_MakePoint($lng,$lat)::geography, $radius_m)
ORDER BY s.location <-> ST_MakePoint($lng,$lat)::geography   -- KNN, uses GiST index
LIMIT 20;
```

### 6.3 Step C — "fastest" (real ETA)
Straight-line distance is not travel time. Take only the **top 10–20 candidates** from Step B and call a routing API once with a matrix request (one origin, many destinations) to get road distance and duration. Cache the result in Redis keyed by a rounded location grid, e.g. `eta:{geohash7}:{shopId}`, with a 5–10 minute TTL, so repeated searches don't hit the API.

If the routing API fails, fall back to `distance / average_speed` and mark `eta_estimated: true`.

### 6.4 Step D — sorting modes

| Mode | Sort rule |
|---|---|
| `nearest` | `distance_m` ascending |
| `fastest` | `eta_seconds` ascending |
| `cheapest` | `price` ascending (tie-break by distance) |
| `best` (default) | weighted score below |

```
score = 0.40 * norm(price_inverse)
      + 0.35 * norm(distance_inverse)
      + 0.15 * norm(rating)
      + 0.10 * norm(stock_confidence)
```
Normalise each value to 0–1 across the result set. Tune the weights later from real usage.

**Stock confidence:** a shop that updated stock in the last few hours is more trustworthy than one that last updated three weeks ago. Reduce confidence as `updated_at` ages and show a "Last updated 2 h ago" label in the app.

### 6.5 Response shape

```json
{
  "query": "amul butter 500g",
  "product": { "id": "…", "name": "Amul Butter", "unit": "500 g" },
  "radius_m": 3000,
  "sort": "best",
  "results": [
    {
      "shop": { "id": "…", "name": "Sharma General Store", "lat": 12.97, "lng": 77.59, "phone": "…" },
      "price": 285.00,
      "mrp": 290.00,
      "in_stock": true,
      "quantity_hint": "Few left",
      "distance_m": 450,
      "eta_seconds": 240,
      "stock_updated_at": "2026-10-18T09:10:00Z",
      "tags": ["nearest", "fastest"]
    },
    { "shop": { "...": "..." }, "price": 279.00, "distance_m": 1200, "eta_seconds": 420, "tags": ["cheapest"] }
  ]
}
```
Tags (`nearest`, `fastest`, `cheapest`) are computed server-side so the app can badge them on the map and the list.

---

## 7. API Design (REST, versioned under `/api/v1`)

### Auth
| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/send-otp` | Send OTP to phone |
| POST | `/auth/verify-otp` | Verify, return access and refresh tokens |
| POST | `/auth/refresh` | New access token |
| GET | `/me` | Current user |

### Customer
| Method | Route | Purpose |
|---|---|---|
| GET | `/search?q=&lat=&lng=&radius=&sort=` | Main search (Section 6) |
| GET | `/products/:id/shops?lat=&lng=&radius=&sort=` | Shops for one product |
| GET | `/shops/nearby?lat=&lng=&radius=&category=` | Browse shops on the map |
| GET | `/shops/:id` | Shop detail |
| GET | `/shops/:id/inventory?q=&category=` | Items in one shop |
| GET | `/categories` | Category tree |
| POST/DELETE | `/favourites/:shopId` | Save or remove favourite shop |
| POST | `/reviews` | Rate a shop |
| POST | `/orders` *(phase 2)* | Reserve or order |

### Shopkeeper
| Method | Route | Purpose |
|---|---|---|
| POST | `/shops` | Register shop (goes to `pending`) |
| PATCH | `/shops/:id` | Edit shop details, location, open toggle |
| PUT | `/shops/:id/hours` | Set timings |
| GET | `/shops/:id/products?q=` | Search the global catalog to add |
| POST | `/shops/:id/inventory` | Add item with price and quantity |
| PATCH | `/shops/:id/inventory/:itemId` | Update price or quantity |
| POST | `/shops/:id/inventory/bulk` | Bulk update (CSV or JSON) |
| POST | `/shops/:id/inventory/:itemId/adjust` | `+/-` stock with reason |
| POST | `/products` | Suggest a new product (needs admin verify) |
| GET | `/shops/:id/alerts` | Low-stock list |
| GET | `/shops/:id/analytics` | Top searched items, views |
| GET | `/shops/:id/orders` *(phase 2)* | Incoming orders |

### Admin
| Method | Route | Purpose |
|---|---|---|
| GET | `/admin/shops?status=pending` | Review queue |
| PATCH | `/admin/shops/:id/status` | Approve, reject, suspend |
| GET/POST/PATCH | `/admin/products` | Manage global catalog |
| POST | `/admin/products/:id/verify` | Verify shopkeeper-suggested product |
| POST | `/admin/products/merge` | Merge duplicate products |
| CRUD | `/admin/categories` | Manage categories |
| GET | `/admin/users` | Users list, block/unblock |
| GET | `/admin/analytics` | Platform stats |

**Conventions:** pagination with `limit` and `cursor`, consistent error format `{ "error": { "code", "message" } }`, request validation with Zod, OpenAPI/Swagger docs.

---

## 8. Stock Correctness and Concurrency

- Quantity changes happen in a **single SQL statement** with a guard, never read-then-write in app code:
  ```sql
  UPDATE inventory SET quantity = quantity - $n, updated_at = now()
  WHERE id = $id AND quantity >= $n
  RETURNING quantity;
  ```
  Zero rows returned means insufficient stock.
- Every change also inserts a `stock_movements` row in the same transaction.
- For reservations (phase 2), hold stock for a limited time (e.g. 15 min) and release it with a delayed job if the order is not completed.
- Make shopkeeper update calls **idempotent** with an `Idempotency-Key` header, because mobile networks retry.

---

## 9. Caching and Performance

| What | Where | TTL / strategy |
|---|---|---|
| Search results by `(product, geohash6, radius, sort)` | Redis | 30–60 s, invalidated on stock change for that product |
| Shop open/closed state | Redis | Recomputed from `shop_hours` every minute |
| ETA by `(geohash7, shop)` | Redis | 5–10 min |
| Categories, catalog pages | Redis | 1 h |
| Rate limits | Redis | Sliding window per user and IP |

Other points:
- GiST index on `shops.location` is essential. Partial index on `inventory` where `quantity > 0`.
- Search engine is kept in sync by workers consuming inventory events (`stock.updated`, `product.created`).
- Add read replicas if search traffic outgrows the primary.

---

## 10. Async Events (queue)

| Event | Consumers |
|---|---|
| `stock.updated` | Invalidate cache, update search index, check low-stock threshold |
| `stock.low` | Push notification to shopkeeper |
| `shop.approved` / `shop.suspended` | Notify owner, update index |
| `search.performed` | Write to `search_logs`, update demand analytics |
| `order.placed` *(phase 2)* | Notify shopkeeper, reserve stock |

Optional "notify me when back in stock" feature: customers subscribe to a product plus area, and `stock.updated` triggers a push when it becomes available nearby.

---

## 11. Security and Trust

- JWT access token (15 min) and refresh token (30 days, rotated, stored hashed).
- Role-based access control middleware; a shopkeeper can only touch their own `shop_id` (check `owner_id` on every route).
- Rate limit the OTP endpoint and search.
- Validate all input; use parameterised queries only.
- Customer's exact location is used for the query and **not stored** with a user id unless needed; store a rounded grid in `search_logs`.
- Shops start `pending` and appear in search only after admin approval.
- Price sanity check: reject a price above MRP or far outside the median for that product, or flag it for admin review.
- Report button for wrong price or "item not actually available" feeds a shop trust score.

---

## 12. Suggested Folder Structure

```
retail-inventory-backend/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/            # env, db, redis, queue
│  ├─ middleware/        # auth, rbac, validate, rateLimit, error
│  ├─ modules/
│  │  ├─ auth/           # routes, controller, service, schema
│  │  ├─ users/
│  │  ├─ shops/
│  │  ├─ catalog/        # products, categories
│  │  ├─ inventory/
│  │  ├─ search/         # geo query, ranking, ETA
│  │  ├─ orders/         # phase 2
│  │  ├─ reviews/
│  │  ├─ notifications/
│  │  └─ admin/
│  ├─ workers/           # stockWorker, indexWorker, alertWorker
│  ├─ lib/               # routingClient, geo utils, logger
│  └─ types/
├─ db/
│  ├─ migrations/
│  └─ seeds/             # categories, sample products, sample shops
├─ tests/                # unit + integration
├─ docker-compose.yml    # postgres+postgis, redis, meilisearch
├─ .env.example
├─ openapi.yaml
└─ README.md
```

---

## 13. Build Phases

**Phase 1 — MVP (core value)**
1. Docker setup: Postgres + PostGIS, Redis.
2. Auth with OTP, roles, RBAC.
3. Shops: register, edit, location, hours; admin approval.
4. Catalog: categories, products, admin CRUD, seed data.
5. Inventory: add, update price and stock, stock movements log.
6. **Search**: text match + PostGIS radius + sort by nearest and cheapest.
7. Swagger docs and basic tests.

**Phase 2 — Make it good**
1. Real ETA via routing API, "fastest" sort and tags.
2. Meilisearch for typo-tolerant search.
3. Redis caching, rate limiting.
4. Low-stock alerts and push notifications.
5. Bulk CSV upload for shopkeepers, barcode lookup.
6. Reviews and ratings, favourites.

**Phase 3 — Grow**
1. Reserve and pickup orders, then delivery.
2. Shopkeeper analytics (what people search near them but they don't stock).
3. Back-in-stock subscriptions.
4. Move queue to Kafka and split services if load demands it.
5. Monitoring: logs, metrics, tracing, error alerts.

---

## 14. Edge Cases to Handle Early

- Same product entered twice by different shops, so enforce barcode uniqueness and an admin merge tool.
- Stale stock: show "last updated" and lower ranking for old data.
- Shop location wrong or on the wrong side of a river, so use road ETA, not just distance.
- Shop closes mid-day or goes on holiday: manual `is_open_now` override on top of `shop_hours`.
- No results in radius: auto-expand radius in steps (1 km, 3 km, 5 km, 10 km) and tell the user.
- Many variants (size, flavour): model as separate products grouped by `brand + name`, or add a `product_variants` table later.
- Prices differ in units (loose vs packed): store unit on the product and compare per unit when needed.
- Shopkeepers with poor internet: offline queue in the app plus idempotent update API.

---

## 15. Environment Variables (`.env.example`)

```
NODE_ENV=development
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/retail
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
MEILI_HOST=http://localhost:7700
MEILI_KEY=masterKey
ROUTING_PROVIDER=osrm            # osrm | google
OSRM_URL=http://localhost:5000
GOOGLE_MAPS_API_KEY=
OTP_PROVIDER_KEY=
FCM_SERVER_KEY=
S3_BUCKET=
```

---

## 16. First Tasks to Hand to Your Coding Assistant

1. "Create the docker-compose with PostGIS, Redis and Meilisearch."
2. "Write migrations for the schema in Section 5."
3. "Implement auth (OTP + JWT) with role middleware."
4. "Implement shop registration and admin approval."
5. "Implement inventory CRUD with the atomic stock update from Section 8."
6. "Implement `/search` using the SQL in Section 6.2 and the sort modes in 6.4."
7. "Add routing ETA with Redis caching (Section 6.3)."
