# NearStock Design System (`DESIGN.md`)

NearStock is designed for high-density, high-legibility local inventory browsing and rapid inventory management under demanding retail conditions. The visual language blends a deeply focused dark-slate aesthetic with high-visibility teal luminescence.

---

## 1. Color Palette & Tokens

NearStock features a custom high-contrast dark palette engineered for low eye-strain and fast comprehension in bright daylight or dim shop environments, with full light mode support.

### Dark Theme (Default)
| Token Name | Hex Value | Role / Usage |
|:---|:---|:---|
| `--color-bg` | `#07110f` | App canvas background (deep near-black slate green) |
| `--color-surface` | `#0c1b18` | Elevated surfaces (cards, sidebars, modal dialogs) |
| `--color-surface-hover` | `#112522` | Hover state for interactive cards and table rows |
| `--color-border` | `#173530` | Structural borders, dividers, card outlines |
| `--color-heading` | `#e0f7f3` | High-contrast headers, product names, titles |
| `--color-body` | `#b2d8d0` | Standard copy, specifications, descriptions |
| `--color-muted` | `#6b9e94` | Timestamps, secondary labels, distance units |
| `--color-teal` | `#2de2c6` | Brand accent, active states, price pins, primary buttons |
| `--color-teal-glow` | `rgba(45, 226, 198, 0.25)` | Focus ring and hover glow effects |

### Light Theme
| Token Name | Hex Value | Role / Usage |
|:---|:---|:---|
| `--color-bg` | `#f4f8f7` | Canvas background (crisp light-slate tint) |
| `--color-surface` | `#ffffff` | Clean white cards and elevated drawers |
| `--color-surface-hover` | `#e8f2ef` | Row and chip hover states |
| `--color-border` | `#d0e2dd` | Subtle structural borders |
| `--color-heading` | `#0b2420` | Ultra-dark emerald text for maximum legibility |
| `--color-body` | `#1a423b` | Body paragraph text |
| `--color-muted` | `#587e76` | Meta tags, distance units, and helper hints |
| `--color-teal` | `#0d9488` | Deepened teal (`teal-600`) for WCAG AA compliance on white |

### Semantic Status Colors
- **Success / In Stock:** `#10b981` (Emerald 500)
- **Warning / Low Stock:** `#f59e0b` (Amber 500)
- **Danger / Out of Stock / Blocked:** `#f43f5e` (Rose 500)
- **Info / Delivery:** `#0ea5e9` (Sky 500)
- **Cheapest Tag:** `#3b82f6` (Blue 500)
- **Fastest Tag:** `#8b5cf6` (Purple 500)

---

## 2. Typography

NearStock utilizes a dual-font system:

- **Headings & Body UI:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - High legibility at small sizes, clear open apertures.
  - Weights: `400` (Regular), `500` (Medium), `600` (Semi-bold), `700` (Bold), `800` (Extra-bold).
- **Technical & Numeric UI:** `JetBrains Mono`, `monospace`
  - Used for INR Currency (`₹285`), Distance (`450 m`), ETA (`4 min`), Barcodes (`8901262...`), and Order IDs (`#ORD-9821`).
  - Tabular figures prevent layout shifts when counters or prices update atomically.

---

## 3. Spacing & Grid System

Based on a strict 4px / 8px incremental scale:

| Token | Dimension | Common Use Case |
|:---|:---|:---|
| `space-1` | `4px` | Fine-grain inline gaps, tag padding |
| `space-1.5`| `6px` | Pill chip vertical padding |
| `space-2` | `8px` | Icon to label separation, small card padding |
| `space-3` | `12px` | Compact component padding, list gaps |
| `space-4` | `16px` | Standard card internal padding |
| `space-5` | `20px` | Medium card padding, section gaps |
| `space-6` | `24px` | Page title margin, modal content padding |
| `space-8` | `32px` | Hero container vertical padding |
| `space-12`| `48px` | Empty state vertical spacing |

---

## 4. Border Radii

- `rounded-sm`: `4px` (Small technical badges, barcode chips)
- `rounded-md`: `6px` (Inputs, inline edit buttons)
- `rounded-lg`: `8px` (Dropdown menus, alerts, sub-cards)
- `rounded-xl`: `12px` (Standard cards, stat widgets, shop cards)
- `rounded-2xl`: `16px` (Modals, map overlay containers, hero cards)
- `rounded-full`: `9999px` (Pill buttons, category chips, price bubbles, avatars)

---

## 5. Core Component System

### 5.1 Button (`Button.tsx`)
- **Primary:** Bright teal background with near-black text (`#07110f`), rounded-full, with luminous glow shadow `shadow-teal-glow`.
- **Secondary:** Surface background with border `#173530`, text `#e0f7f3`.
- **Outline:** Transparent background with `#2de2c6` border and text.
- **Ghost:** Transparent background with subtle hover background `#112522`.
- **Danger:** Subtle red fill (`rgba(244, 63, 94, 0.15)`) with rose border and text.
- **States:** Supports `isLoading` with smooth SVG spinner and `disabled:opacity-50`.

### 5.2 Card (`Card.tsx`)
- Deep surface container (`bg-brand-surface`) with 1px border (`border-brand-border`).
- Subtle inner shadow and backdrop blur compatibility for sticky or floating cards.

### 5.3 Chip (`Chip.tsx`)
- Rounded-full pill tags supporting `teal`, `neutral`, `muted`, `success`, `warning`, and `danger`.
- Active state transitions smoothly to solid teal or dark slate border.

### 5.4 Input (`Input.tsx`)
- Highly visible focus ring: `focus:ring-2 focus:ring-brand-teal focus:border-brand-teal`.
- Integrated icon slots (left and right), clear labels, and error message typography.

### 5.5 Modal (`Modal.tsx`)
- Accessible dialog with backdrop blur (`backdrop-blur-md`), keyboard Esc dismissal, focus trapping, and animated entrance.

### 5.6 Map & Price Bubble Pins (`MapWrapper.tsx`)
- Renders an interactive Leaflet map styled in dark mode via CSS tile inversion (`invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)`).
- Custom price bubbles render live shop pricing:
  - Standard bubble: Deep slate with teal border.
  - `.cheapest`: Luminous blue accent border and badge.
  - `.nearest`: Teal accent border with distance indicator.
  - Selection state: Smooth flyTo zoom animation with glowing ring.

---

## 6. Accessibility & Responsive Breakpoints

- **Breakpoints:**
  - `sm`: 640px (Mobile portrait to landscape)
  - `md`: 768px (Tablet - converts mobile bottom tab navigation to top header pill tabs)
  - `lg`: 1024px (Desktop - splits explore screen into 50/50 interactive map and scrollable results column)
  - `xl`: 1280px (Wide monitor layout container limit)
- **Contrast Ratios:** All text combinations exceed WCAG 2.1 AA requirements (minimum 4.5:1 for body copy, 3:1 for large headers).
- **Navigation:** Mobile users receive an app-like bottom navigation bar for single-thumb navigation across Explore, Orders, Inventory, and Moderation portals.

