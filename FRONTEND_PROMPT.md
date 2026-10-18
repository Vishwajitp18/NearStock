# Frontend Build Prompt — NearStock (Hyperlocal Retail Inventory)

Copy everything below the line into your AI coding tool (Claude Code, Cursor, Lovable, v0, etc.).
Rename "NearStock" to your own brand.

---

## PROMPT

You are a senior frontend engineer and product designer. Build a production-quality, responsive web frontend called **NearStock** for a hyperlocal retail inventory platform. It talks to an existing REST backend (Node.js + Express + PostgreSQL/PostGIS) under `/api/v1`.

A customer searches for an item and sees every nearby shop that has it in stock, on a map and in a list, with price, distance and travel time, and can sort by nearest, fastest or cheapest. Shopkeepers manage their items, prices and stock. Admins manage shopkeepers and the global product catalog.

### 1. Tech stack

- React 18 + Vite + TypeScript
- Tailwind CSS (design tokens as CSS variables so dark and light themes both work)
- React Router v6, TanStack Query for server state, Zustand for small UI state (theme, location, auth)
- React Hook Form + Zod for forms and validation
- Map: MapLibre GL (or Leaflet + OpenStreetMap tiles) so no paid key is needed; keep the map behind a small wrapper component so Google Maps can replace it later
- Icons: lucide-react
- Axios with an interceptor for JWT access token and refresh-token rotation
- Toasts: sonner. Charts: recharts
- Fonts: Inter for UI, JetBrains Mono for small uppercase taglines and labels

### 2. Visual design (match this style closely)

A dark, modern "product intelligence" dashboard look:

- **Background:** near-black deep green (about `#07110f`) with a very subtle square grid pattern and a soft teal radial glow near the top.
- **Surfaces:** cards in slightly lighter dark green (about `#0c1b18`), 1px border in muted teal-gray (about `#173530`), rounded-2xl or rounded-3xl, soft shadow, generous padding.
- **Accent:** bright teal/mint (about `#2de2c6`) for primary buttons, active nav pill, focus rings, key numbers and highlights. Button text on teal is dark.
- **Text:** off-white headings (`#e8f5f1`), muted gray-green body (`#8fa8a1`).
- **Shapes:** pill-shaped chips, nav tabs and buttons; icon buttons in rounded squares with a thin border.
- **Typography:** large bold hero headline (40–56 px, tight tracking), muted subtitle, small uppercase monospace taglines.
- **Motion:** 150–200 ms transitions, hover lift on cards, skeleton loaders (never blank screens), smooth map fly-to when a result is selected. Respect `prefers-reduced-motion`.
- Provide a **light theme** too, toggled from a sun/moon icon button in the header. Store the choice and default to the system setting.
- Fully responsive: desktop (sidebar plus content), tablet, and mobile (bottom tab bar, filters in a slide-up sheet, map and list toggle).

### 3. Global layout

**Header (sticky):**
- Left: logo mark in a rounded square plus brand name ("Near**Stock**" with the second part in teal) and a small monospace tagline "LOCAL INVENTORY INTELLIGENCE".
- Center: pill nav tabs, shown per role (active tab has a teal-tinted pill):
  - Customer: **Explore**, **Favourites**, **Orders** (later)
  - Shopkeeper: **My Inventory**, **Alerts**, **Analytics**, **Shop Profile**
  - Admin: **Shops**, **Catalog**, **Users**, **Analytics**
  - All roles: **Security & Sessions**, **API Docs** (links to Swagger)
- Right: theme toggle, a primary teal action button (Customer: "Use my location"; Shopkeeper: "Add Item"; Admin: "Add Product"), user chip with name and role badge, logout icon button.

### 4. Pages and features

#### 4.1 Auth
- Phone number then OTP screen (6 boxes, auto-advance, paste support, resend timer).
- Role is returned by the backend; redirect to the matching home.
- Shopkeeper sign-up includes shop name, address and a map pin picker; show a "Pending admin approval" state after registering.

#### 4.2 Customer — Explore (home)
**Hero card** (like the reference design):
- Small pill badge: "Live stock from shops near you".
- Headline: "Find it nearby, before you leave home." Subtitle one muted line.
- Big pill search bar with a sparkle icon, clear (×) button and an **Ask** button. Placeholder: `Amul butter 500g near me`.
- "Try:" row of suggestion chips (for example "Paracetamol 500mg", "Basmati rice 5kg", "Phone charger type-C", "Notebook A4"). Clicking a chip fills and runs the search.
- Location control: shows the detected area name and a radius selector (1, 3, 5, 10 km). If GPS is denied, show an address search box instead.

**Stat cards row (4 cards, same style as reference):**
- Shops near you (count)
- Open now (count)
- Lowest price found (₹, appears after a search)
- Nearest shop (distance and walking or driving time)

**Results area (two columns on desktop):**
- Left: **Filters & Sorting** card with "Reset all":
  - Sort segmented control: **Best match**, **Nearest**, **Fastest**, **Cheapest**
  - Radius slider, Open now toggle, In stock only (default on), Delivery available toggle, Min rating, Price range
  - Category chips
- Right top: "Shops with this item (N found)", grid/list view toggle, and a **Map / List** toggle.
- **Split view:** map on one side, scrollable result cards on the other. Hover or select a card highlights its pin and the reverse. Pins show the price as a label bubble (for example `₹285`); the cheapest pin is teal-filled, the nearest has a ring.
- **Result card:** shop name, open/closed badge, rating, price (large) with MRP struck through and savings, stock hint ("Few left" if low), distance, ETA, "Updated 2 h ago" label, and tags **Nearest**, **Fastest**, **Cheapest** as colored chips. Actions: **Directions** (opens map app), **Call**, **View shop**, favourite heart.
- Empty state: "No shop within 3 km" with a button "Expand to 5 km" (auto-expand suggestion).
- Loading state: skeleton cards and a map shimmer. Error state: friendly retry card.

**Shop detail page:** header with photo, hours table with today highlighted, address, mini map, searchable list of items with price and stock, reviews list.

#### 4.3 Shopkeeper — My Inventory
- Stat cards: Total items, Low stock, Out of stock, Inventory value (₹).
- Table (desktop) / cards (mobile) with: image, product name and unit, price, MRP, quantity, status chip (In stock, Low, Out), last updated.
- **Inline editing:** click price or quantity to edit in place; quick `+` and `−` stock stepper buttons; optimistic updates with rollback on error.
- Search, category filter, low-stock filter, bulk select with bulk actions (set out of stock, change price by %).
- **Add Item drawer:** search the global catalog with typo tolerance, pick a product, enter price, MRP, quantity, low-stock threshold. If not found, "Suggest new product" form (name, brand, unit, barcode, image upload) which goes to admin for verification.
- **Barcode scan** button (camera, using a library such as `@zxing/browser`) to find a product fast.
- **Bulk upload:** CSV upload with a preview table, row-level validation errors, and a downloadable template.
- Shop open/closed master toggle in the header area, plus opening hours editor.
- **Alerts page:** low-stock list with a "Restock" quick action.
- **Analytics page:** top searched items near your shop, items people searched for but you do not stock, views over time (recharts).

#### 4.4 Admin
- **Shops:** tabs Pending, Approved, Suspended. Review drawer with details, map pin, owner info, and Approve / Reject (with reason) / Suspend actions.
- **Catalog:** table of products with verify, edit, merge-duplicates flow, category manager (tree), and "suggested by shopkeepers" queue.
- **Users:** search, block/unblock.
- **Analytics:** platform totals, new shops over time, searches per day, no-result searches.

#### 4.5 Security & Sessions (all roles)
List active sessions and devices with a "Log out other devices" action, change phone number, and recent login activity.

### 5. API contract the frontend must use

Base URL from `VITE_API_URL`. All responses are JSON; errors look like `{ "error": { "code", "message" } }`.

```
POST /auth/send-otp            POST /auth/verify-otp         POST /auth/refresh      GET /me
GET  /search?q&lat&lng&radius&sort       (sort = best|nearest|fastest|cheapest)
GET  /products/:id/shops?lat&lng&radius&sort
GET  /shops/nearby?lat&lng&radius&category
GET  /shops/:id                GET /shops/:id/inventory?q&category
GET  /categories
POST|DELETE /favourites/:shopId          POST /reviews
POST /shops                    PATCH /shops/:id              PUT /shops/:id/hours
GET  /shops/:id/products?q     POST /shops/:id/inventory     PATCH /shops/:id/inventory/:itemId
POST /shops/:id/inventory/bulk POST /shops/:id/inventory/:itemId/adjust
GET  /shops/:id/alerts         GET /shops/:id/analytics
GET  /admin/shops?status       PATCH /admin/shops/:id/status
GET|POST|PATCH /admin/products POST /admin/products/:id/verify   POST /admin/products/merge
CRUD /admin/categories         GET /admin/users              GET /admin/analytics
```

Search result item shape:
```json
{
  "shop": { "id": "", "name": "", "lat": 0, "lng": 0, "phone": "" },
  "price": 285.0, "mrp": 290.0, "in_stock": true, "quantity_hint": "Few left",
  "distance_m": 450, "eta_seconds": 240, "eta_estimated": false,
  "stock_updated_at": "ISO date", "tags": ["nearest", "fastest"]
}
```
Build a typed API client and TypeScript types from these shapes. Until the backend is ready, include a **mock mode** (`VITE_USE_MOCK=true`) using MSW with realistic seeded data (6 shops around a sample location, 20 products) so every screen works offline.

### 6. Behavior details

- Get location with the browser Geolocation API; remember the last location; allow manual address entry; never block the UI while waiting.
- Debounce search by 300 ms; cancel stale requests; keep previous results visible while refetching.
- Keep search state (`q`, sort, radius) in the URL query string so results are shareable and the back button works.
- Format money in INR with `Intl.NumberFormat('en-IN')`, distance as "450 m" or "1.2 km", ETA as "4 min".
- Show a clear "estimated" hint when `eta_estimated` is true.
- Access token in memory, refresh token handled by the interceptor; on refresh failure, redirect to login with a toast.
- Route guards by role; show a 403 page for wrong role and a 404 page.
- Support English with an i18n setup (react-i18next) ready for Marathi and Hindi strings; keep all text in translation files.
- PWA basics: manifest, installable, offline fallback page (shopkeepers often have weak internet); queue stock updates offline and sync when back online.

### 7. Quality requirements

- Accessibility: semantic HTML, keyboard navigable, visible focus rings, ARIA labels on icon buttons, color contrast at least WCAG AA, map has a list alternative.
- Performance: route-level code splitting, lazy-load the map, image lazy loading, Lighthouse performance above 90 on mobile.
- Testing: Vitest and React Testing Library for key components (search bar, result card, inline stock editor), Playwright smoke test for the search flow.
- Linting: ESLint, Prettier, strict TypeScript, no `any`.

### 8. Suggested folder structure

```
src/
  app/            routes, providers, layouts
  components/     ui (Button, Card, Chip, Input, Drawer, Skeleton...), map, shop, inventory
  features/       auth, search, shops, inventory, admin, analytics, sessions
  lib/            apiClient, queryClient, format, geo, i18n
  mocks/          msw handlers and seed data
  store/          theme, location, auth
  styles/         tokens.css, globals.css
  types/
```

### 9. Deliverables

1. Complete working project with `README.md` (setup, env vars, scripts, how to switch mock mode off).
2. `.env.example` with `VITE_API_URL`, `VITE_USE_MOCK`, `VITE_MAP_STYLE_URL`.
3. All pages above, wired to the API contract and fully usable in mock mode.
4. A short `DESIGN.md` listing color tokens, spacing, radii and components.

Build in this order and confirm each step runs before moving on: (1) project setup, design tokens, layout and header; (2) auth; (3) Customer Explore with search, filters and map in mock mode; (4) Shopkeeper inventory; (5) Admin; (6) Security and Sessions; (7) polish, accessibility and tests.
