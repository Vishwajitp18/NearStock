# NearStock Frontend (`frontend/`)

Hyperlocal Retail Inventory Platform web frontend built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**.

Designed for high readability in both dark and light themes, NearStock enables customers to find local items in stock in real-time, shopkeepers to manage atomic inventory counters and alerts, and admins to moderate shops and catalog deduplication.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+
- **npm** v9+
- (Optional) Running NearStock backend at `http://localhost:4000`

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Configure Environment Variables
Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|:---|:---|:---|
| `VITE_API_URL` | `/api/v1` | Base API URL (proxied to `http://localhost:4000` in dev) |
| `VITE_USE_MOCK` | `false` | When `true`, enables offline fallback mode with realistic seed data |
| `VITE_MAP_STYLE_URL` | OpenStreetMap URL | Custom tile provider URL (optional) |

### 4. Running the Development Server
```bash
npm run dev
```
The frontend is available at `http://localhost:5173`.
All requests to `/api` are automatically proxied to the backend at `http://localhost:4000` via `vite.config.ts`.

---

## 🧪 Testing & Production Build

### Run Unit Tests
Powered by Vitest and React Testing Library:
```bash
npm test
```
To run tests in interactive watch mode:
```bash
npm run test:watch
```

### Production Build
Typechecks with TypeScript (`tsc`) and bundles optimized code-split assets:
```bash
npm run build
```
Preview the built production bundle locally:
```bash
npm run preview
```

---

## 📱 Feature Overview

### 1. Customer Explore (`/`)
- **Instant Search:** Debounced 300ms autocomplete with URL synchronization (`?q=...&sort=...&radius=...`).
- **Interactive Leaflet Map:** Custom dark mode tile filter, live price bubble pins (`.cheapest`, `.nearest`, `.fastest`), flyTo smooth transitions.
- **Auto-Radius Expansion:** Smart banner prompts to expand from 2 km to 5 km or 10 km when results are sparse.
- **Product & Store Cards:** Road distance, ETA walking time, stock recency timestamps, INR pricing with savings calculations.

### 2. Shopkeeper Dashboard (`/shopkeeper/*`)
- **My Inventory (`/shopkeeper/inventory`):**
  - Instant inline stock quantity steppers with optimistic updates and error rollback.
  - Quick inline price editing with click-to-save.
  - Barcode scanner simulation (USB wedge / camera input).
  - Bulk CSV inventory import & sample template download.
  - Master "Open / Closed" toggle switch.
- **Alerts & Restock (`/shopkeeper/alerts`):** Low-stock items with one-tap `+10 Restock` atomic mutation.
- **Analytics (`/shopkeeper/analytics`):** Weekly customer view trends area chart (Recharts) and unmet local search demand leaderboard.
- **Shop Profile (`/shopkeeper/profile`):** Business address, GPS pin drag-and-drop, weekly operating hours grid.

### 3. Admin Moderation & Catalog (`/admin/*`)
- **Shop Moderation (`/admin/shops`):** Review pending registrations with map preview, approve, reject with reason, or suspend.
- **Catalog Management (`/admin/catalog`):** Verify community-submitted products and merge duplicate listings into canonical items.
- **User Security (`/admin/users`):** Search platform accounts, filter by role/status, toggle instant account block/unblock.
- **Platform Analytics (`/admin/analytics`):** Real-time KPI totals (shops, items, active users) and top searches leaderboard.

### 4. Account & Security (`/security`)
- Active sessions & device breakdown (Browser, OS, IP, Geo location).
- One-click "Log out other devices" session invalidation.
- Mobile number phone change with 6-digit OTP verification.
- Security audit timeline.

---

## 🎨 Design Tokens & UI Architecture
Detailed specifications on color palette, typography (`Inter` + `JetBrains Mono`), spacing, border radii, and components are available in [DESIGN.md](./DESIGN.md).

---

## 🔌 Switching to Mock / Offline Mode
To run completely offline without the PostgreSQL backend:
1. Open `.env`
2. Change `VITE_USE_MOCK=false` to `VITE_USE_MOCK=true`
3. Restart `npm run dev`
All search queries, shop catalogs, inventory counters, and moderation workflows will operate using seeded in-memory data.

