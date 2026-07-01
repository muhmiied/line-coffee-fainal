# Line Coffee — Project Record

## Current Source Of Truth

- Live state: `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`. **Execution reference (what to build next, in order): `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md`.** Where to edit site copy/images: `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md`.
- `docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` keeps the locked decisions + context/history but is **no longer the phase-execution source** (its phase numbering is superseded by the master plan).
- The Change Log below is **history**; it does not override the docs above or the block below.

## Doc Reading Order (read before any task)

1. `CLAUDE.md` (this file) — architecture, locked decisions, current position, rules.
2. `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` — what's real vs mock vs missing.
3. `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — **the official execution reference: phase order, gates, per-phase scope.** Use this for what to build next.
4. `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md` — file location of every public text/image.
5. `docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` — decisions/history reference only; **not** the phase-execution source (numbering superseded by the master plan).
6. `docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md` — deep model reference only; **never an execution plan**; its "current reality" columns are outdated.

> **Canonical rule:** the **MASTER_EXECUTION_PLAN** is the official execution reference. If any older roadmap inside `docs/` conflicts with it (especially phase numbers), the master plan wins and the older doc is **not** used for execution.

## Current Architecture (Verified 2026-06-28)

The app runs browser-only on the Supabase **anon key**; all writes go through **SECURITY DEFINER RPCs** that validate + recompute server-side. Customer data is scoped by device **`guest_id`**; admin by `admin_users` + `is_admin()`.

- **REAL (Supabase):** public catalog; admin product/category CRUD; **checkout → real orders** (`create_checkout_order`); inventory **reservation in kg per product** (`inventory_stock` + `inventory_movements`); **Admin Orders** (`update_admin_order_status`); **Customer Account** (orders, profile, addresses, wishlist, notifications); real auth.
- **MOCK (UI only, resets on refresh):** Admin Dashboard, Inventory UI, Customers, Marketing (promo codes don't validate), Accounting, Analytics, CMS, Espresso Manager, Flavor Manager.
- **LOCAL:** Cart persists per explicit owner in localStorage (`guest:<guestId>` / `auth:<userId>`); the legacy global `line-cart-v1` key is purged and never read.
- **PHASE 4 FOUNDATION (authored, NOT applied):** migration `20260630120000` adds admin-only `suppliers` / `purchases` / `purchase_items` / `inventory_lots` / `supplier_payments` / `expenses` + RPCs `create_purchase` / `receive_purchase` / `record_purchase_payment`, and widens `inventory_movements.movement_type` with `purchase_receive`. Receiving a purchase creates finished-product **lots** + raises `inventory_stock.available_kg` + writes a `purchase_receive` movement. **No FIFO consumption yet** (Phase 5). Data layer: `src/lib/admin/admin-purchasing.ts`; admin UI wiring deferred. Live only after `db push`.
- **PHASE 5 FIFO ENGINE (authored, NOT applied):** migration `20260630130000` makes finished-product lots operational: adds `inventory_lots.reserved_qty_kg`/`source`, `inventory_movements.lot_id`, `orders.cogs_total`, the admin-only `order_lot_allocations` order↔lot ledger, and the `_allocate_lots_fifo` helper. A one-time reconciliation converts existing `inventory_stock` on-hand into **opening lots** + back-fills open-order allocations + **asserts** lots ≡ `inventory_stock` (rolls back on mismatch — no double counting, master §6.6). `create_checkout_order` reserves FIFO lots at Place Order (allocations + per-lot movements) behind the same atomic oversell guard; `update_admin_order_status` deducts the same lots at **delivered** (+ COGS snapshot to `order_items.line_cogs`/`orders.cogs_total`) and releases them on **cancel**; `shipped` still no-ops. `inventory_stock` stays the kg-per-product aggregate. Costs/allocations/COGS are admin-only; the public checkout result stays cost-free. Data layer: `admin-purchasing.ts` (`InventoryLot` gains reserved/available/source; new `OrderLotAllocation` + `listOrderLotAllocations`). Live only after `db push`.
- **MISSING (no DB):** order_item_components · raw-bean inventory · packaging · promo_codes · refunds/returns · reviews · contact_messages · analytics. FIFO lot **consumption**/COGS is **authored** (Phase 5 migration `20260630130000`) but **not applied** — until `db push`, lots are still created-not-drawn-down (Phase-4 behaviour) and stock stays the Phase-1 kg model. **Media Studio does not exist and is cancelled (Decision 1).**
- **Builders:** compute + add to cart but are **rejected at checkout** today (wired in Phases 8–9 — espresso = 8, flavor = 9; master plan numbering).
- **Applied lifecycle:** checkout reserves inventory, `shipped` keeps it reserved, `delivered` deducts it, and `cancelled` releases it.

## Locked Business Decisions (1-line each — full text in the roadmap doc)

1 Media Studio cancelled (edit copy in code; product images via Admin Products) · 2 ready products bought finished · 3 Make-Your-Espresso = only manufacturing (raw beans by ratio) · 4 Make-Your-Flavor = cost-only · 5 FIFO lots · 6 reserve@order, deduct@delivered · 7 packaging deducts@order · 8 discount reduces Net Sales not COGS · 9 promo on product subtotal only · 10 zone delivery 30/50/100 · 11 governorate = customer pays courier · 12 all payments start Pending (manual) · 13 customer edits before shipping, then admin-only · 14 returns/refunds admin-only · 15 reviews approval-only · 16 Purchases=goods / Expenses=non-goods · 17 suppliers paid/partial/unpaid · 18 /admin protected · 19 product images via Admin Products+Storage · 20 unspecified → practical default.

**Position:** Phases 0–3 are complete. **Phase 1** migration `20260629120000` is applied (delivery zones + deduct-at-delivered + all-payments-pending). **Phase 2** migration `20260629130000` is applied: `account_customer_id` scopes registered customers by `auth.uid()` and guests by `guest_id`; account RPCs scope orders by `customer_id`; profile/addresses work cross-device for registered customers; wishlist uses an `auth_user_id` path; and `link_guest_data_to_account` promotes/merges same-device guest data without phone/email ownership. **Phase 3** aligned the checkout/payment contracts, removed unused account mocks, fixed the local seed path, and documented contract/migration conventions. **Phase 4** (purchases / suppliers / expenses / inventory-lots foundation) is implemented as **code + an authored migration `20260630120000` — NOT applied (no `db push`)**: six admin-only tables (`suppliers`, `purchases`, `purchase_items`, `inventory_lots`, `supplier_payments`, `expenses`), 3 RPCs (`create_purchase`, `receive_purchase`, `record_purchase_payment`), an additive `purchase_receive` movement kind, the `admin-purchasing.ts` data layer, and `InventoryLot`/`PurchaseItem` contracts. Receiving a purchase creates finished-product lots + raises `inventory_stock.available_kg` + writes a movement; **no FIFO consumption** (Phase 5). Admin UI wiring deferred. **Phase 5** (FIFO reservations / deductions / COGS / real inventory engine) is implemented as **code + an authored migration `20260630130000` — NOT applied (no `db push`)**: `inventory_lots` gains `reserved_qty_kg` + `source`, `inventory_movements` gains `lot_id`, `orders` gains `cogs_total`, a new admin-only `order_lot_allocations` order↔lot ledger, the internal `_allocate_lots_fifo` helper, a one-time opening-stock→lots reconciliation + open-order back-fill + a per-product consistency ASSERT (rolls back on mismatch), and lot-level `create_checkout_order` (FIFO reserve) + `update_admin_order_status` (delivered deducts the same lots + snapshots COGS into `order_items.line_cogs`/`orders.cogs_total`, cancel releases). `inventory_stock` stays the denormalised aggregate + oversell guard. Data layer: `admin-purchasing.ts` (+`OrderLotAllocation` + `listOrderLotAllocations`). **Phase 6 (packaging inventory) is next.** Canonical numbering lives in the master plan §5.0: packaging = Phase 6, customer identity = Phase 2, promo = Phase 7, order editing = Phase 10, espresso = 8, flavor = 9.

---

> **AGENT RULE:** Any agent that makes a change in this project **must append an entry** to the [Change Log](#change-log) section below before finishing. Include: date, what changed, which files, why. Future agents depend on this record.

---

## Project Overview

**Line Coffee** is a premium Egyptian specialty-coffee brand website. Visual-first, bilingual (EN/AR), dark cinematic aesthetic. **Architecture note (updated 2026-06-29):** this is **no longer mock-only** — catalog, checkout→orders, admin orders, inventory reservation, and the customer account are **real Supabase** (browser anon key + SECURITY DEFINER RPCs). Remaining admin modules are still mock UI; some launch domains are missing — see `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` for the verified map. *(The 2026-06-16 sections below describe the homepage build and remain accurate for the public visuals.)*

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19.2.4 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 — CSS-first config via `@theme inline` in `globals.css` |
| Fonts | Playfair Display (local TTF), Cairo (Google), Tajawal (Google) |
| Linter | ESLint with `@typescript-eslint` + custom rules |
| Backend | Supabase (Postgres) — browser anon key + SECURITY DEFINER RPCs; no service-role server. Some admin modules still mock — see `CURRENT_STATE.md`. |

---

## Design System

### Color Tokens (`globals.css` → `:root`)
```
--coffee-black:   #0b0806   (page background)
--coffee-deep:    #120d09
--coffee-dark:    #15100b
--coffee-surface: #1b140f
--gold:           #b6885e
--gold-light:     #d6a373
--cream:          #f5e6d8
--cream-muted:    #d6b79a
--cream-dim:      #b79b85
--ease-luxury:    cubic-bezier(0.22, 1, 0.36, 1)
```

### Fonts
- **Playfair Display** — English headings (`font-serif` / `font-sans` in Tailwind theme)
- **Cairo** — Arabic body, buttons, inputs, nav
- **Tajawal** — Arabic display headings (h1–h6)

Font variables: `--font-playfair`, `--font-cairo`, `--font-tajawal`
All three loaded in `src/app/layout.tsx` and added to `<html>` className.

### Key CSS Classes
- `.cinematic-section` — base for all homepage sections. Has: dark radial bg, `border-radius: 22px/32px 22px/32px 0 0`, `margin-top: -22px/-32px`, gold rim `box-shadow`, and `::before` gold line divider.
- `.premium-button` — gold CTA button with shimmer
- `.premium-button-outline` — outlined ghost button
- `.hero-copy-animate` — staggered layer-in animation for hero content on mount
- `.reveal-on-scroll` / `[data-reveal]` — IntersectionObserver scroll reveal

### Bilingual System
```ts
type LocalizedValue = { en: string; ar: string }
// Hook: useLanguage() returns { dir, t, lang }
// t(LocalizedValue) returns the correct string based on current language
// dir: "ltr" | "rtl"
```

---

## File Structure (Key Files)

```
src/
├── app/
│   ├── layout.tsx              ← Root layout: fonts, header, footer, lang provider
│   └── globals.css             ← ALL design tokens + component CSS (Tailwind v4 style)
├── components/
│   └── layout/public/
│       ├── PublicHeader.tsx    ← Fixed nav: announcement bar, lang toggle, cart
│       └── PublicFooter.tsx
├── features/website/home/
│   └── sections/
│       ├── HeroSection.tsx       ← Hero slideshow + stats + CTAs
│       ├── CategoriesSection.tsx ← Marquee scroll of category cards
│       ├── BestSellersSection.tsx
│       ├── FeaturesSection.tsx
│       ├── StorySection.tsx
│       ├── JournalSection.tsx
│       ├── TestimonialsSection.tsx
│       ├── SocialGallerySection.tsx
│       └── ContactSection.tsx
└── lib/
    ├── context/language.tsx    ← Language context provider
    ├── mock-data/
    │   └── visual-content.ts   ← All static homepage data (slides, categories, stats…)
    └── utils/cn.ts
```

---

## Critical Rules (Do NOT violate)

1. **No redesign** — keep the existing visual direction
2. **Data layer = Supabase via SECURITY DEFINER RPCs on the anon key** — do NOT add Next.js API routes for data, a service-role server, or a second data source; all writes go through validated RPCs. *(Updated: the project now has a real Supabase backend; the original "no backend" rule is obsolete.)*
3. **No new sections** — don't add sections not already in the homepage
4. **No `aria-hidden={expression}`** — linter requires string literal `"true"`, never boolean
5. **All sections use `"use client"`** — they all use hooks
6. **`cinematic-section` must keep stacked-card CSS** — border-radius + negative margin-top + box-shadow
7. **Announcement bar** — fades between 3 messages every 3.8s (not a marquee)
8. **Header** — transparent on hero, glass only after 20px scroll

---

## Homepage Architecture

The homepage (`src/app/page.tsx`) renders sections in order:

```
HeroSection          ← full-screen, -mt to go under fixed header
CategoriesSection    ← cinematic-section, marquee of category cards
BestSellersSection   ← cinematic-section, horizontal scroll marquee
FeaturesSection      ← cinematic-section, 4-feature grid
StorySection         ← cinematic-section, brand story + image
JournalSection       ← cinematic-section, blog cards
TestimonialsSection  ← cinematic-section, review cards
SocialGallerySection ← cinematic-section, Instagram-style grid
ContactSection       ← cinematic-section, contact form + info
```

---

## What NOT to Do (Lessons Learned)

- **Don't add gradient "bridge" divs** between sections — `.cinematic-section::before` already handles the divider line
- **Don't add `section-blend` class** — it suppresses the gold line
- **Don't use `position: sticky` with scroll-driven JS opacity** — causes Playwright/Chromium compositor layer issues and background jitter
- **Don't use `transform: translateY()` updated via JS scroll handler on hero section** — causes visual jitter during scroll
- **Don't use `aria-hidden={boolean expression}`** — ESLint rule requires `aria-hidden="true"` (string) or omit
- **Don't put `take-screenshot.js` or test scripts in project root** — ESLint flags `require()` imports as errors
- **Tajawal** doesn't support weight `"600"` — only: 200, 300, 400, 500, 700, 800

---

## Change Log

> Every agent must add an entry here in format: `## [Date] — [Summary]`

---

### [2026-06-30] — Phase 5: FIFO reservations / deductions / COGS / real inventory engine (code + migration authored, NOT applied)

**Goal:** Implement **Phase 5** of `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — make finished-product **inventory lots operational**: FIFO reservation at Place Order, deduction at Delivered, release at Cancel, per-line + per-order **COGS snapshots** from consumed lot costs, and full lot/COGS **movement traceability** — while keeping every Phase-1/2 business rule (reserve@order · deduct@delivered · shipped-no-deduct · cancel-releases · all-payments-pending · delivered-never-auto-paid · discount-never-touches-COGS · zone delivery · customer ownership). **No `db push`, no commit, no push. No packaging (Phase 6), espresso (8), flavor (9), returns engine (11), promo (7), or accounting dashboards (14). No public redesign, no service-role code, no broad UI refactor.**

**`supabase/migrations/20260630130000_phase5_fifo_reservations_cogs.sql`** (new — authored only; the placeholder file created at session start, now populated):
- **§1 `inventory_lots` += `reserved_qty_kg numeric(12,3)` (default 0) + `source text` (default 'purchase')** with guarded CHECKs (`reserved ≥ 0`, `reserved ≤ remaining`, `source ∈ purchase|opening|adjustment`). Lot model: `available-in-lot = remaining_qty_kg − reserved_qty_kg`; reserve bumps `reserved`, deduct lowers `remaining`+`reserved` (closes at 0), release lowers `reserved`.
- **§2 `inventory_movements` += `lot_id uuid` (FK, ON DELETE SET NULL)** + partial index — per-lot traceability. Old movements keep `lot_id` null (compatible).
- **§3 `orders` += `cogs_total numeric(12,2)`** (private order COGS snapshot, set at delivered).
- **§4 `order_lot_allocations`** (new admin-only table) — the order↔lot ledger: `order_id`, `order_item_id`, `product_id`, `lot_id`, `reserved_qty_kg`, `deducted_qty_kg`, `unit_cost` (cost snapshot), `status` (reserved/deducted/released). RLS admin-**read** only; writes via DEFINER RPCs. `order_items.line_cogs` (existing) holds per-line COGS.
- **§5 `_allocate_lots_fifo(...)`** (internal DEFINER helper, revoked from anon/authenticated) — reserves a qty across a product's OPEN lots oldest-first (`received_date, created_at, id`), `FOR UPDATE`, creating allocations + bumping `lot.reserved_qty_kg` + (optionally) a per-lot `reserve` movement. Raises if lots can't cover (caller rolls back).
- **§6 ONE-TIME RECONCILIATION `DO` block (opening-stock transition, master §6.6)** — per product: (a) **opening lot** for on-hand (`available+reserved`) not yet in a lot (`source='opening'`, cost = `products.purchase_cost_per_kg` or 0, sentinel `received_date '2020-01-01'` so opening stock is consumed FIRST by FIFO); if existing lots over-claim on-hand (pre-Phase-5 delivered deducted stock but not lots) it **draws the excess down** FIFO; **changes NO `inventory_stock` value and writes NO stock movement** (no double counting). (b) **back-fill** every OPEN order's (pending/preparing/shipped) reserved kg into FIFO lot allocations (no new reserve movement — the original Phase-1 reserve stands), so after the migration **every** open order drains through the lot path. (c) **ASSERT** — for every product `Σ lot.reserved == inventory_stock.reserved_kg` AND `Σ(remaining−reserved) == available_kg`; any mismatch **RAISES and rolls back the whole migration** (safe-or-stop).
- **§7 `create_checkout_order`** replaced (CREATE OR REPLACE, identical cost-free return). All Phase-1 behaviour verbatim (validation, DB-authoritative pricing, all-methods-pending, zone fee + snapshot, idempotent replay, snapshots, the atomic per-product `inventory_stock` oversell guard). Only the reservation changed: the oversell guard still runs, then each **order line** FIFO-allocates via `_allocate_lots_fifo` (allocations + `lot.reserved` + one `reserve` movement per lot). `inventory_stock` stays the aggregate in lockstep with lots.
- **§8 `update_admin_order_status`** replaced (CREATE OR REPLACE, identical signature). Authorization / transition map / event / order update unchanged. Inventory effect rebuilt at lot level: **delivered** deducts the order's `reserved` allocations from their lots (remaining−, reserved−, close at 0), marks them `deducted`, lowers `inventory_stock.reserved_kg`, and snapshots COGS into `order_items.line_cogs` (per line) + `orders.cogs_total`; **cancelled** releases the same allocations (lot reserved−, `inventory_stock` available+/reserved−); **shipped** no stock effect; **returned** unchanged (Phase-11). A **legacy fallback** (no allocations) drains via the exact Phase-1 `inventory_stock` ledger path (defensive only — the reconciliation back-fills all open orders, so it should never trigger). Idempotent (transition map blocks re-entry; only `reserved` allocations processed).

**Key Phase-5 decisions (rationale in the migration header):**
- **Opening-stock transition = create opening lots + back-fill open orders + assert.** Chosen over "block until lots exist" or a divergent parallel ledger because it is the ONLY approach that keeps `inventory_stock` and lots perfectly consistent (asserted) and routes every order — old and new — through one clean lot path. No double counting: opening lots re-express existing on-hand; `inventory_stock` is untouched by the reconciliation.
- **`inventory_stock` kept as the denormalised aggregate + the atomic oversell guard**, not replaced. `available_kg = Σ(lot.remaining − lot.reserved)`, `reserved_kg = Σ lot.reserved`, maintained in the same transaction as lot writes; concurrent checkouts serialise on the `inventory_stock` row lock (no oversell), then FIFO-allocate lots under `FOR UPDATE`.
- **COGS from consumed lot `unit_cost` only; discounts never reduce it.** Opening-stock cost basis = `purchase_cost_per_kg` (or 0 when unknown) — real COGS starts once priced purchase lots are consumed.
- **Security:** `order_lot_allocations` + lot costs + `orders.cogs_total` are admin-read-only; the public checkout result stays cost-free; no service-role code.

**Data layer / contracts:**
- **`src/lib/types/inventory.ts`** — `InventoryLot` += `reservedQtyKg?`/`availableQtyKg?`/`source?` + `InventoryLotSource`; new `OrderLotAllocation` + `OrderLotAllocationStatus`.
- **`src/lib/admin/admin-purchasing.ts`** (no live UI caller) — `InventoryLot` shape + row + `INVENTORY_LOT_COLUMNS` + mapper gain `reservedQtyKg`/`availableQtyKg`/`source`; new `OrderLotAllocation` type + row + `listOrderLotAllocations(orderId)` read.
- **`src/lib/admin/admin-orders.ts`** (LIVE) — added only an **optional forward** `cogsTotal?` to `AdminOrderDetail`; **NOT** added to the live `ORDER_COLUMNS` select (the column doesn't exist until the migration is applied, so `/admin/orders` stays valid pre-apply).
- **`src/lib/types/order.ts`** — `Order` += optional `cogsTotal?`; `ORDER_STATUS_EFFECTS` comment notes the Phase-5 lot-level implementation.
- **`src/lib/types/README.md`** + **`docs/ai/LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md`** — registry rows updated (inventory lots operational + allocations).

**Validation:** `npx tsc --noEmit` → 0 errors · ESLint on the 4 changed TS files → 0 errors/0 warnings · `git diff --check` → clean (only pre-existing CRLF notices) · migration `$$` balance verified (3 functions + 1 DO block = 8) · route smoke on the live dev server (`/`, `/products`, `/checkout`, `/cart`, `/order-success`, `/admin/orders`, `/admin/dashboard`) → all HTTP 200. `npm run build` intentionally skipped (live `next dev` on :3000 shares `.next`). **Migration authored only — apply with `supabase db push` after Codex review + owner approval.** No `db push`, no commit, no push, no Phase 6/8/9/11/14 work, no payment/ownership rule change, no public redesign, no service-role code.

---

### [2026-06-30] — Phase 4: Purchases / Suppliers / Expenses / Inventory-Lots foundation (code + migration authored, NOT applied)

**Goal:** Implement **Phase 4** of `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — create the real backend **foundation** for stock inputs and cost (suppliers, purchase receipts, supplier payment state, finished-product inventory lots, operating expenses), preparing for FIFO/COGS in Phase 5 **without** implementing FIFO consumption. **No `db push`, no commit, no push. Phase 1 order/stock lifecycle untouched. Phase 2 ownership untouched. No Phase 5 FIFO. No packaging (Phase 6), espresso (Phase 8), flavor (Phase 9), or accounting reports (Phase 14). No public redesign, no service-role code, no broad mock cleanup.**

**`supabase/migrations/20260630120000_phase4_purchasing_suppliers_expenses_lots.sql`** (new — authored only):
- **§1 `suppliers`** — name (required), contact_name, phone, email, address, notes, status (`active`/`inactive`), timestamps. Balances are derived (not stored) to avoid drift.
- **§2 `purchases`** (header) — supplier_id (FK, NOT NULL, on delete restrict), reference, notes, status (`draft`/`received`/`cancelled`), purchase_date, **server-computed** total_amount, paid_amount, payment_status (`unpaid`/`partial`/`paid`), received_at, timestamps.
- **§3 `purchase_items`** (lines) — purchase_id (cascade), product_id (finished products, on delete restrict), product_name snapshot, quantity_kg `numeric(12,3)`, unit_cost (per kg), line_cost (= round(qty×cost,2), server-computed).
- **§4 `inventory_lots`** (FIFO foundation, **keyed by product_id** to match `inventory_stock`) — purchase_id / purchase_item_id / supplier_id refs, received_qty_kg, remaining_qty_kg (created = received, **never decremented in Phase 4**), unit_cost (per-kg cost basis), received_date, status (`open`/`closed`), `remaining ≤ received` CHECK, FIFO read index. Did **not** create a generic `inventory_items` abstraction (stays within finished-product scope; raw-bean/packaging lots are Phases 6/8).
- **§5 `supplier_payments`** — supplier_id / purchase_id refs, amount (>0), method, notes, paid_at.
- **§6 `expenses`** — expense_date, category (required), amount, payment_method, notes, attachment_url placeholder. **No product link, no stock movement, no lot** — the line that keeps purchases (stock) and expenses (no stock) separate.
- **§7 movement enum widening** — `inventory_movements.movement_type` CHECK widened **additively** to add `'purchase_receive'` (all 5 existing kinds preserved). Same proven `drop constraint if exists` + add pattern used by `20260627100000` for the orders payment CHECKs — a safe, additive text-CHECK widening, **not** a risky enum change, and required for the documented receive flow.
- **§8 updated_at triggers** on suppliers / purchases / inventory_lots / expenses (reuse `set_updated_at()`).
- **§9 RLS + grants (ADMIN-ONLY)** — every table `is_admin()`-gated. suppliers + expenses: full admin CRUD via RLS. purchases / purchase_items / inventory_lots / supplier_payments: **SELECT-only** grant (admin reads); all writes go through the DEFINER RPCs (server-computed integrity). No anon/customer access to any cost/supplier/expense/lot data. (config.toml auto-expose is OFF, so explicit grants are required.)
- **§10 `create_purchase(jsonb)`** (DEFINER, `is_admin()` guard) — inserts a **draft** purchase + line items in one txn, computes line_cost + total_amount server-side, validates supplier exists and each product is a finished product (`kind='standard'`). **No stock effect** (a draft is not received).
- **§11 `receive_purchase(uuid)`** (DEFINER, `is_admin()` guard, `FOR UPDATE`) — only a **draft** can be received (guarded against double-receive). Per line: creates one `inventory_lot` (received = remaining), **increases `inventory_stock.available_kg`** (upsert; reserved_kg + Phase-1 reserve/deduct logic untouched), writes a `purchase_receive` movement; flips purchase → `received`. **Does NOT consume any lot.** Payment state is independent (a received purchase can still be unpaid).
- **§12 `record_purchase_payment(jsonb)`** (DEFINER, `is_admin()` guard, `FOR UPDATE`) — inserts a `supplier_payments` row, bumps purchase paid_amount, recomputes payment_status (overpay allowed = supplier credit, still reads `paid`).

**`src/lib/admin/admin-purchasing.ts`** (new) — `"use client"` admin data layer mirroring `admin-orders.ts` style: typed read/return shapes + DB row types + boundary normalizers + `AdminPurchasingError`. Functions: `listSuppliers` / `createSupplier` / `updateSupplier` (direct RLS CRUD), `listPurchases` / `getPurchaseDetail` (reads with embedded supplier + items + payments), `createPurchase` / `receivePurchase` / `recordPurchasePayment` (RPCs), `listExpenses` / `createExpense` (direct RLS), `listInventoryLots` (read-only foundation).

**`src/lib/types/inventory.ts`** — added canonical `InventoryLot` + `InventoryLotStatus` (Phase 4 FIFO foundation, keyed by productId); added `ISODate` to the import.
**`src/lib/types/accounting.ts`** — added canonical `PurchaseItem` (the header-only `Purchase` now has matching line items).
**`src/lib/types/README.md`** — `inventory.ts` and `accounting.ts` registry rows moved FORWARD → LIVE (partial); added the `admin-purchasing.ts` live-contract pointer.
**`docs/ai/LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md`** — added `admin-purchasing.ts` to the live data-layer module table.
**`docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`** — moved purchases/suppliers/expenses/lots out of MISSING into a Phase-4-foundation note; refreshed the bottom position line (Phase 4 done, Phase 5 next); bumped the date.

**Key Phase-4 decisions (full rationale in the migration header + the final report):**
- **Receiving increases `inventory_stock.available_kg` now** (business rule 2 "purchases increase stock") — additive only; reserved_kg and the Phase-1 reserve/deduct lifecycle are untouched, so no conflict with checkout.
- **Lots are created from received purchases only — NOT seeded from the existing opening 100kg.** Seeding opening lots now would immediately diverge from the live `available_kg` (Phase 1 deducts stock; Phase 4 does not consume lots), creating a double-count window. The opening-stock → opening-lots conversion + making lots authoritative is Phase 5's atomic job (master §6.6).
- **No FIFO consumption** anywhere; `remaining_qty_kg` is never decremented in this phase.
- **Admin UI wiring deferred** — the existing Accounting/Inventory admin pages are large mock UIs; wiring them fully would be broad (a Phase-4 stop condition). Backend + data-layer foundation only.

**Validation:** `npx tsc --noEmit` → 0 errors · ESLint on changed TS files → 0 errors/0 warnings · migration `$$` balance verified (3 functions, 6 delimiters) · `git diff --check` clean. **Migration authored only — apply with `supabase db push` after Codex review + owner approval.** No `db push`, no commit, no push, no Phase 5, no public redesign, no service-role code, no Phase 1/2 business-rule change.

---

### [2026-06-30] — P0 cart ownership leak fix (client-only)

**Bug:** the entire site shared one `line-cart-v1` localStorage cart. Account A items survived logout and appeared for the guest and Account B on the same device.

**Fix:** rewrote `src/lib/context/cart.tsx` as one owner-aware external store shared by the header count/drawer, `/cart`, and `/checkout`. Guest carts persist under `line-cart-v1:guest:<guestId>`; authenticated carts persist locally under `line-cart-v1:auth:<userId>`. Auth changes atomically replace the visible cart and close the drawer before React renders the new owner. The ambiguous legacy global key is deleted and never migrated. Guest and account carts remain separate (no implicit merge, phone, or email ownership). `useAuth` emits a local owner-change signal for immediate sign-in/sign-up/sign-out switching while the cart also listens to Supabase auth and cross-tab storage events.

**Validation:** `npx tsc --noEmit` and targeted ESLint pass; Playwright verified legacy-key purge, guest → A → logout/guest → B → A isolation, A cart restoration, unchanged wishlist storage, drawer/header count updates, and matching `/cart` + `/checkout` state. No migration, DB push, commit/push, Phase 4, service-role code, public redesign, or Phase 1/2 backend-rule change.

---

### [2026-06-30] — Phases 1–3 integration sanity and ownership cleanup

Reviewed the closed Phase 1–3 surfaces before Phase 4. Fixed a client-side privacy regression where checkout saved-address results and account-page React state could survive a direct Account A → Account B session switch: `/account/*` and `/checkout` now remount their local state by authenticated owner id, checkout renders saved addresses only for their matching owner, and the public-header notification dropdown remounts per owner. RPC ownership remains unchanged (`auth.uid()` for registered customers, `guest_id` for guests); no phone/email ownership was introduced.

Removed the remaining live `pending_review` payment branch from the canonical order contract, admin payment label, and delivered-unpaid counter query; made the checkout-result runtime guard require Phase 1's authoritative `pending`; removed the cancelled Media Studio from the admin switcher and corrected the CMS label; repaired mojibake in public product/wishlist UI; and refreshed stale Phase 1/2 applied-state and contract comments/docs.

**Validation:** `npx tsc --noEmit` → 0 errors · ESLint on every changed TS/TSX file → 0 errors/0 warnings · delivery-zone logic → 30/100/50/0 with courier note as locked · Playwright Chromium smoke (`/`, `/products`, `/checkout`, `/order-success`, `/account/orders`, `/account/wishlist`, `/account/notifications`, `/admin/orders`, `/admin/dashboard`) → all HTTP 200, protected routes redirect safely to sign-in when signed out, 0 console errors · seed path resolves to the existing catalog seed · `git diff --check` clean. No migration, `db push`, commit, push, Phase 4 work, service-role code, public redesign, or Phase 1/2 business-rule change.

---

### [2026-06-30] — Phase 3: Data contracts + migration workflow foundation (code + docs, NO migration)

**Goal:** Implement **Phase 3** of `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — make the existing real-backend ↔ frontend integration safer, clearer, and easier to extend before the heavier inventory/FIFO/accounting phases. Foundation, **not** features. **No SQL migration authored, no `db push`, no commit/push, no Phase 1/2 business-rule change, no public redesign, no service-role code.**

**Audit (read-only):** mapped the launch-critical entities across Supabase RPCs/views → `src/lib/types/*` → data-layer modules → UI consumers. Conclusion: the **live data layers are already well-typed and consistent** — each (`checkout.ts`, `account/customer-account.ts`, `admin/admin-orders.ts`, `admin/admin-catalog.ts`, `catalog/public-catalog.ts`, `auth/admin.ts`) has explicit DB row types + safe nullable normalization, and no UI reads an untyped response. Found two parallel type layers: the **canonical contracts** in `src/lib/types/*` (some now LIVE — `common`/`order` unions/`admin`; many still forward for MISSING domains) and the **data-layer read/return shapes** (what the UI actually consumes). Full audit + registry in the new docs below.

**`src/lib/checkout.ts`** — F1: narrowed `CheckoutOrderResult.payment_status` from `"pending" | "pending_review"` to **`"pending"`** to match Phase 1 (Decision 12 — all methods start pending; `create_checkout_order` in `20260629120000` never returns `pending_review`). The `isCheckoutOrderResult` guard now checks `payment_status` is a **string** (presence/type) rather than an enum match, so a successfully-placed order can never be rejected over this display-only field. `payment_method` union unchanged (matches the RPC's mapped `cash_on_delivery|instapay|wallet`).

**`src/app/(public)/order-success/page.tsx`** — F1: removed the now-dead `payment_status === "pending_review"` branch (always "Pending" post-Phase 1).

**`src/lib/types/common.ts`** — F2: corrected the `Money` doc comment from "integer EGP" to the locked 2-decimal `numeric(_,2)` rule (master plan §6.7). Comment-only, no behavior. Header refreshed to note `LocalizedValue`/`PackageSize` are now LIVE.

**`src/lib/types/order.ts` + `admin.ts`** — F4: refreshed the stale "imported by nothing yet" headers to state live-vs-dormant status (order unions → `admin-orders.ts`; admin role/status/permission → `auth/admin.ts`; `ORDER_STATUS_EFFECTS` is a documented rule source — the enforced rule lives in the SQL RPC + `ALLOWED_ADMIN_ORDER_TRANSITIONS`).

**`src/lib/mock-data/account-data.ts`** — F5: **deleted** (`git rm`). Verified zero references (import path + every export name: `MOCK_ORDERS`, `MockOrder`, `MockAddress`, `MOCK_ADDRESSES`, `MockNotification`, `MOCK_NOTIFICATIONS`) before removal. The account area is fully real now; this mock file was orphaned. Deferred mock admin modules (`mock-data/admin/*`) were left untouched.

**`supabase/config.toml`** — F6: fixed `[db.seed].sql_paths` from `["./seed.sql"]` (a file that does not exist) to **`["./seeds/*.sql"]`** so a local `supabase db reset` actually loads `seeds/20260625_catalog_seed.sql` instead of an empty catalog. **Local CLI only** — no production effect, no `db push`.

**`docs/ai/LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md`** (new) — the two-layer type model, the Phase 3 contract audit (F1–F8 + intentional divergences), contract↔Phase-1/2 RPC alignment, the **Supabase DB type strategy** (no generated types today; documented the `supabase gen types` process + how to wire the `Database` generic incrementally — not generated, needs credentials/local DB), and the **migration workflow** (naming/order, authoring rule, a paste-in per-migration header checklist, authoring rules, preflight, apply/reset/backup commands).

**`src/lib/types/README.md`** (new) — contract registry (LIVE / DORMANT / FORWARD per file), the "data-layer shapes are the live contracts" rule, the Money precision note, and the DB-type pointer.

**Intentional non-changes (documented):** the catalog `pricingModel: "packaged-by-weight"` literal vs canonical `ProductPricingModel` divergence (reconcile in Phase 4+), `OrderItem.custom_data: unknown` (builder payloads, Phases 8–9), and the 5× duplicated `select` column list in `public-catalog.ts` (maintainability smell, no behavior issue) — left as-is to avoid risk/scope creep.

**Validation:** `npx tsc --noEmit` → 0 errors · `npx eslint` (changed files) → 0 errors/0 warnings · `git diff --check` → clean (only pre-existing CRLF notices) · route compile smoke on the live dev server (`/`, `/products`, `/checkout`, `/order-success`, `/account/orders`, `/account/wishlist`, `/account/notifications`, `/admin/orders`, `/admin/dashboard`) → all HTTP 200. `npm run build` skipped (live `next dev` on :3000 shares `.next` — ChunkLoadError risk per the 2026-06-26 entry). **No migration, no `db push`, no commit, no push.**

---

### [2026-06-29] — Real admin counters and operational notifications

Replaced the defensive placeholder state with real admin-protected Supabase counters. `getAdminOrderOverview()` performs exact count-only queries for total orders, pending orders, shipped orders, and delivered orders with an outstanding payment status. `AdminShell` owns one shared overview snapshot, refreshes it on mount, focus/visibility, every 30 seconds, and immediately after an in-app order status update. The Admin Sidebar shows the real total when greater than zero. The Admin TopBar bell is clickable; its badge is the number of active order instances and its dropdown aggregates real pending, shipped, and delivered-unpaid alerts, with an honest empty/error state and no mock/unread data. Customer notifications remain owner-scoped through `get_customer_notifications`; wishlist remains owner-scoped through `useWishlist`; cart count remains quantity-derived. Files: `src/lib/admin/admin-orders.ts`, `src/components/admin/layout/AdminShell.tsx`, `src/components/admin/layout/AdminSidebar.tsx`, `src/components/admin/layout/AdminTopBar.tsx`. No migration, DB push, Phase 3, service-role code, commit, or push.

---

### [2026-06-29] — Counter sanity micro-fix after Phase 2

Removed dishonest UI counters without adding backend scope: the Admin Orders sidebar badge (`4`) and mock inventory alert dot were removed; the admin topbar mock notification badge/dropdown data was removed; and the customer notifications page no longer labels every owner-scoped order event unread on each mount or offers non-persistent mark-read actions. The admin bell remains as a badge-free inactive placeholder until a real notification source exists. Public notifications remain an owner-scoped event list from `get_customer_notifications`; its unread badge is intentionally absent until persisted read state exists. Wishlist continues to use the Phase 2 owner-scoped `useWishlist` store, and cart count continues to derive from live cart quantities. Files: `src/components/admin/layout/AdminSidebar.tsx`, `src/components/admin/layout/AdminTopBar.tsx`, `src/app/(public)/account/notifications/page.tsx`. No migration, DB push, Phase 3, service-role code, public redesign, commit, or push.

---

### [2026-06-29] — Restore safe Admin TopBar notification action

Corrected the counter micro-fix overreach by restoring the Admin TopBar bell as an accessible disabled placeholder with no badge, count, dropdown, or mock notification data. Admin Orders and inventory sidebar indicators remain hidden because no reliable shared source is available in the shell. Files: `src/components/admin/layout/AdminTopBar.tsx`. No migration, DB push, Phase 3, service-role code, commit, or push.

---

### [2026-06-29] — Phase 2 bugfix: Wishlist ownership leak (client-only, no migration)

**Bug:** after the Phase 2 migration was `db push`ed, the wishlist leaked across accounts on one device: Account A adds an item → logs out → item stays visible → Account B logs in → still sees A's item. **No `db push`, no commit, no Phase 3, no admin/delivery/payment/inventory changes.**

**Root cause (purely client-side — the DB RPCs were already correctly owner-scoped):** the wishlist used a **single global** localStorage key `line-wishlist-v1`, shared by guest + every account on the device. `useWishlist` hydrated from it with a once-per-load `_synced` guard and **never cleared or re-fetched on auth change**, so A's items survived logout (still in the global key) and were read by B. **`src/app/(public)/account/wishlist/page.tsx` made it worse** — it read the same global key **directly** via `useLocalStorage`, bypassing the hook. The Phase 2 wishlist RPCs (`get/add/remove_customer_wishlist_item`, auth_user_id vs guest_id) were correct, so **no migration was needed**.

**`src/lib/hooks/useWishlist.ts`** (rewritten as an owner-scoped module store):
- One module-level store + `useSyncExternalStore`, so the header count, header drawer, and `/account/wishlist` share **one** in-memory list and always agree.
- A **single** module-level `supabase.auth` watcher (not one `useAuth` per ProductCard) resolves the owner: `auth:<userId>` when signed in, else `guest:<guestId>`.
- On every auth change `setOwner()` runs: **immediately clears** the previous owner's list (guests reseed from their own scoped cache, auth owners start empty), then **re-fetches** the new owner's list from the server (`getCustomerWishlist()` self-scopes by auth.uid()/guest_id — the source of truth).
- **Authenticated wishlists are never written to localStorage** — memory + server only, so no account-owned item can leak through localStorage. Guests use a per-device key `line-wishlist-v1:guest:<guestId>` for instant paint.
- The legacy global key `line-wishlist-v1` is **purged once** on init and never read again, killing any pre-fix leaked data.
- Ownership comes only from auth.uid() (server) or the device guest_id — **never phone/email**. Hook API unchanged (`{ ids, count, toggle, isWishlisted, remove }`).

**`src/app/(public)/account/wishlist/page.tsx`** — replaced the direct `useLocalStorage("line-wishlist-v1")` read with `useWishlist()` (owner-scoped); removed the local `remove` in favour of the hook's.

**Ownership before→after:** one global localStorage list shared across guest/A/B, never cleared on auth change ⇒ **per-owner state**: auth = server-truth (no localStorage), guest = `guest:<guestId>` cache + server; cleared + refetched on every sign-in/out.
**localStorage scoping:** global `line-wishlist-v1` (purged) ⇒ guest-only `line-wishlist-v1:guest:<guestId>`; authenticated wishlists never persisted to localStorage.
**Auth-change behaviour:** none ⇒ immediate in-memory clear + server refetch for the new owner; A's items can no longer survive a logout or appear for B.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` (2 changed files) → 0 errors/0 warnings · changed routes compile on the live dev server (`/`, `/products`, `/products/turkish-silk`, `/account/wishlist` → HTTP 200). `npm run build` skipped (live `next dev` on :3000 shares `.next`). **No new migration. No `db push`, no commit, no push.**
**Manual smoke (logical):** guest add → visible as guest; guest→login A migrates same-device guest items (Phase 2 link RPC) + A shows them; A adds → A only; A logout → guest UI shows only guest-owned items (A's gone); B login → no A items; A re-login → A items return; header count == `/account/wishlist`; no phone/email ownership; Phase 1 checkout/order/payment/inventory untouched.

---

### [2026-06-29] — Phase 2: Customer Identity, Ownership & Account Correctness (code + migration authored, NOT applied)

**Goal:** Implement **Phase 2** of `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md`. Fix customer ownership before more operational logic is built on top: registered customers must read account-owned data by `auth.uid()` (cross-device); guests by `guest_id` (same-device); never trust email/phone for ownership; safely link same-device guest data on signup/login. **No `db push`, no commit, no push. Phase 1 logic untouched. Phase 3 not started.**

**Root problem (verified):** the whole customer account was device-scoped — every account RPC took `p_guest_id` and read `orders.guest_id`. Defects: (A) a registered customer on a new device saw nothing; (B) profile/address RPCs only matched `type='guest'`, so registered customers couldn't read/update profile or addresses at all; (C) reading orders by `orders.guest_id` could leak a registered order to a different person using the same device as a guest (same localStorage token). Auth itself was already real Supabase Auth (`useAuth.ts`).

**`supabase/migrations/20260629130000_phase2_customer_identity_ownership.sql`** (new — authored only):
- **§1 wishlist schema:** `customer_wishlist` += `auth_user_id uuid` (FK `auth.users`), `guest_id` relaxed to nullable, `customer_wishlist_owner_chk` (guest_id OR auth_user_id required), partial unique `(auth_user_id, product_slug)`. Gives registered wishlist a cross-device key without needing a `customers` row.
- **§2 `account_customer_id(p_guest_id)`** (new, internal, SECURITY DEFINER, revoked from anon/authenticated): the unified ownership resolver. Authenticated → `customers WHERE auth_user_id = auth.uid()` (may be null); anon → `customers WHERE guest_id = p_guest_id AND type='guest'` (validated 8–64 chars). The auth path **ignores** the passed guest_id for ownership, so a signed-in user cannot read another device's guest data by passing its token. **No email/phone ownership.**
- **§3 order reads** (`get_customer_orders`, `get_customer_order_detail`, `get_customer_notifications`) — replaced (CREATE OR REPLACE, identical return signatures). Now scope by `orders.customer_id = account_customer_id(...)`: registered = cross-device (auth.uid()), guest = same-device (guest_id→guest customer), and a registered order's `customer_id` is the registered customer so a same-device guest (different customer) can no longer read it (fixes leak C). Order detail still requires code + ownership (no enumeration).
- **§4 profile** (`get_customer_profile`, `update_customer_profile`) — resolve via `account_customer_id`. `update_customer_profile` keeps the name/phone/whatsapp whitelist and **upserts a registered customer row** when an authenticated caller has none yet (whatsapp supplied → satisfies NOT NULL).
- **§5 addresses** (`get/add/update/delete/set_default_customer_address`) — all switched from the `type='guest'` lookup to `account_customer_id`, so registered customers can finally manage their address book; ownership re-verified against the resolved `customer_id` on every write.
- **§6 wishlist RPCs** (`get/add/remove_customer_wishlist_item`) — authenticated path keys by `auth_user_id` (ON CONFLICT on the partial index); guest path unchanged (`guest_id`).
- **§7 `link_guest_data_to_account(p_guest_id)`** (new, authenticated-only): **PROMOTE** the same-device guest customer in place when the account has no `customers` row (type→registered, `auth_user_id` set, `guest_id` cleared — orders/addresses follow automatically); **MERGE** into the existing registered customer otherwise (reassign orders + addresses, handle the one-default-address index, then neutralize the empty guest shell with `guest_id=null, status='inactive'` — **non-destructive, no delete**); device wishlist rows migrate to `auth_user_id` (deduped). Matches **only** by same-device `guest_id`; **no auto-merge by phone/email**. Idempotent — safe to call every login.
- **§8 grants:** account RPCs keep `anon, authenticated`; `link_guest_data_to_account` is `authenticated` only; `account_customer_id` stays internal.

**`src/lib/account/customer-account.ts`** — added `linkGuestDataToAccount()` + `GuestLinkResult` type (calls the new RPC, best-effort). All existing data-layer functions are **unchanged** (they still pass `guest_id`; the RPCs ignore it when authenticated), so the account read pages need no edits to gain the registered cross-device path.

**`src/lib/hooks/useAuth.ts`** — after a successful `signIn` (and `signUp` when a session exists) it `await`s a best-effort `linkGuestDataToAccount()` before the caller routes on; a persisted session triggers one link attempt per page load (module-level `_guestLinkAttempted` guard). Dynamic-imported so `useAuth` stays light; all failures swallowed (migration may be unapplied).

**`src/app/(public)/checkout/page.tsx`** — Phase 2 §6.11 saved/default-address resolution: registered customers now see a **"Saved Addresses"** picker (loaded via `getCustomerAddresses`, gated on `isLoggedIn && length>0`); clicking one fills the existing form (governorate/area matched against the known options so the zone preview still resolves; identity fields fill-only-when-empty). Guests are unchanged — no fetch, no panel. No redesign, no change to the submit/order logic.

**Ownership before→after:** account data device-scoped by `guest_id` only ⇒ **resolved per caller**: registered by `auth.uid()` (cross-device), guest by `guest_id` (same-device); registered orders no longer leak to same-device guests.
**Guest before→after:** same-device orders/profile/addresses/wishlist by `guest_id` — **unchanged behaviour** (now expressed via `customer_id` resolved from `guest_id`).
**Registered before→after:** could not read profile/addresses and saw no orders on a new device ⇒ **full account access by `auth.uid()`**, cross-device, plus checkout saved-address selection.
**Guest→registered linking:** none ⇒ **same-device promote/merge on signup/login** (orders, addresses, wishlist), no phone/email auto-merge.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` (3 changed files) → 0 errors/0 warnings · changed routes compile on the live dev server (`/`, `/checkout`, `/auth/login`, `/auth/signup`, `/account/profile`, `/account/orders`, `/account/addresses` → HTTP 200) · migration function bodies balanced (15 funcs, 15 `$$` open/close). `npm run build` intentionally skipped — a `next dev` server is live on :3000 sharing `.next` (ChunkLoadError risk, per the 2026-06-26 entry). **Migration is authored only** — apply with `supabase db push` after Codex review + owner approval; until then the live account stays Phase-1 device-scoped.
**Deferred (documented):** a registered user who never checked out has no `customers` row, so the address book is empty until they save a profile (creates the row) or place an order; wishlist items added locally while logged-out only migrate the rows already persisted server-side (by `guest_id`). FIFO/packaging/promo/builders/accounting untouched.

---

### [2026-06-29] — Phase 1: Delivery Zones + Deduction Timing + Payment Defaults (code + migration authored, NOT applied)

**Goal:** Implement **Phase 1** of `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — fix the most dangerous mismatches in the live checkout/order flow: delivery fee, stock deduction timing, and payment defaults. **No `db push`, no commit, no push.** Phases 2+ untouched; builders/promo/FIFO/packaging untouched; no public redesign.

**`supabase/migrations/20260629120000_phase1_delivery_deduction_payment.sql`** (new — authored only):
- **§1** `orders` += `delivery_zone text`, `delivery_note text`, `delivery_fee_overridden boolean default false` (all `add column if not exists`; `delivery_fee`/`total` already existed).
- **§2** `resolve_delivery_fee(governorate, area) returns jsonb` (immutable, internal — revoked from anon/authenticated). First-match zone resolution (Decisions 10+11, master §6.5): **1** Shorouk/Madinaty→30 · **2** Haram / 6 October / Sheikh Zayed→100 *(checked before #3 since they sit inside Cairo/Giza)* · **3** remaining Cairo/Giza→50 · **4** all other governorates→0 + courier note. EN + AR area tokens matched.
- **§3** `create_checkout_order` replaced (CREATE OR REPLACE). Only two behavioural changes vs `20260627100000`: (a) **all** payment methods now map to `payment_status = 'pending'` (was cash→pending, instapay/wallet→pending_review) per Decision 12; (b) delivery fee comes from `resolve_delivery_fee()` (was `subtotal >= 500 ? 0 : 50`), and `delivery_zone`/`delivery_note` are frozen on the order. Validation / DB-authoritative pricing / atomic reservation / idempotent replay / snapshots all preserved otherwise. Fee is **server-computed**; the UI value is never trusted.
- **§4** `update_admin_order_status` replaced (CREATE OR REPLACE). Only change: the inventory effect fires on **`delivered`** (deduct) instead of `shipped`; `cancelled` still releases; `shipped` now leaves the reservation untouched (parcel out for delivery). Transition map unchanged. Movement reason text updated to "Order delivered; reservation deducted". Minimal kg-model trigger-point move (Phase 5 rewrites at lot level).
- **§5** `update_admin_order_delivery_fee(order_id, fee, note)` (new, admin-gated SECURITY DEFINER). Recomputes `total = subtotal − discount_total + fee`, sets `delivery_fee_overridden = true`, stores `delivery_note`, and appends an audit line to `admin_note` (the `order_status_events.status` CHECK only allows the 6 lifecycle statuses, so it can't hold a non-status audit row — `admin_note` is the safe trail). Allowed only before delivery (`pending`/`preparing`/`shipped`); fee clamped 0–100000.

**`src/lib/types/order.ts`** — `ORDER_STATUS_EFFECTS` corrected to match Decision 6: `shipped` now `reservesStock:true, deductsStock:false` (was deduct); `delivered` now `deductsStock:true` (+ existing revenue/COGS/LTV). Comment block updated. (Rule-source contract; imported by `admin-orders.ts` + `accounting.ts` as types only.)

**`src/lib/delivery.ts`** (new) — `resolveDeliveryFee(governorate, area)` TS **display mirror** of the SQL function (same order, same EN/AR tokens). Documented that the server always recomputes; this is preview-only.

**`src/app/(public)/checkout/page.tsx`** — replaced `total >= 500 ? 0 : 50` with zone-based preview via `resolveDeliveryFee(form.governorate, form.area)` (resolvable once both are chosen). Order-summary Delivery row now shows the zone fee, or "Select address" before address, or "Paid to courier" + a small courier note for out-of-Cairo/Giza. Same layout — no redesign.

**`src/lib/admin/admin-orders.ts`** — `AdminOrderDetail` += `deliveryZone`/`deliveryNote`/`deliveryFeeOverridden`; `OrderRow` + `ORDER_COLUMNS` + `mapDetail` updated; new `updateAdminOrderDeliveryFee(orderId, fee, note?)` calling the RPC (+ result type + error mapping).

**`src/components/admin/orders/OrderDetails.tsx`** — Totals "Delivery" line now shows zone label + "(overridden)" flag + courier note; new **"Delivered but Unpaid"** amber badge in the Payment card (`status === 'delivered' && paymentStatus !== 'paid'`).

**`src/app/admin/orders/[id]/page.tsx`** — added an admin **delivery-fee override** control (fee input + optional reason + Save) shown only for `pending`/`preparing`/`shipped`; calls `updateAdminOrderDeliveryFee` then refreshes.

**Delivery before→after:** client-only `free ≥500 EGP else 50` (also the server's rule) → **server-side zone resolution** (30/100/50/0+courier) frozen on the order; admin per-order override.
**Stock lifecycle before→after:** reserve@checkout → deduct@**shipped** → release@cancel  ⇒  reserve@checkout → hold@shipped → deduct@**delivered** → release@cancel.
**Payment before→after:** cash=pending, instapay/wallet=**pending_review** ⇒ **all methods = pending**; `delivered` never auto-marks paid (unchanged — it never touched payment_status).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` (changed files) → 0 errors/warnings · zone resolver parity test → 13/13 (incl. the 4 required zones + AR governorate forms) · changed routes compile on dev server (`/checkout`, `/admin/orders`, `/` → HTTP 200). `npm run build` intentionally skipped — a `next dev` server is live on :3000 sharing `.next` (ChunkLoadError risk per the 2026-06-26 entry).
**Migration is authored only.** Apply with `supabase db push` after Codex review + owner approval; until then the live checkout keeps flat-50 + shipped-deduction. No `db push`, no commit, no push.
**Deferred (documented):** saved/default address selection in checkout (Phase 2); lot-level deduction/COGS (Phase 5); a `site_settings`-editable zone-fee table (Owner Settings UI deferred, master §6.1 — fee mapping lives in `resolve_delivery_fee()` for now).

---

### [2026-06-29] — Phase 0 Final Docs Consistency Patch (Codex "Approve with fixes" — docs only)

Applied Codex's final read-only verification fixes. **No `src/`, no `supabase/`, no migrations, no `db push`, no commit.**

- **Governorates fee unified to `delivery_fee = 0`** (was "0/null") across the Master Plan (Decision 11, Phase 1 scope, §6.5) and `FINAL_DECISIONS_AND_ROADMAP.md` (Decision 11); added the note "customer pays courier directly; outside Line Coffee revenue unless an admin manually overrides per order."
- **Delivery zone resolution algorithm written explicitly** in Master Plan §6.5 (first-match order: 1 Shorouk/Madinaty 30 → 2 Haram-end/6 October/Sheikh Zayed 100 *(checked before the general Cairo/Giza rule)* → 3 remaining Cairo/Giza 50 → 4 all other governorates 0 + courier note); more-specific zone wins; `Haram-end` is admin-selectable.
- **Blueprint supersession wording fixed** — now states the **MASTER_EXECUTION_PLAN wins for execution & phase order**, FINAL_DECISIONS is decisions/history reference only, and the blueprint is deep historical/reference only (never an execution plan). Removed the stale "follow the decisions doc on conflict" line.
- **FINAL_DECISIONS banner cleaned** — gap map + Part 3 marked reference/context only (not an execution plan); Part 6 retitled "RESOLVED in the Master Execution Plan" with a status note (open decisions no longer need an owner call).
- **Numeric precision added** (Master Plan §6.7): coffee stock kg ≥3 decimals (0.001 kg = 1 g); espresso components in grams rounded to nearest whole gram unless exact decimal needed for allocation; money EGP 2 decimals (totals/discounts/delivery/COGS/refunds/expenses/supplier payments); UI may show whole EGP but DB snapshots stay 2 decimals.
- **Content Map**: Reviews/Testimonials future phase corrected Phase 11 → **Phase 13**.
- **Saved Addresses in Checkout assigned to Phase 2** (Master Plan Phase 2 scope + §6.11): Phase 2 owns registered address ownership + checkout saved/default-address resolution; guests keep the form; Phase 1 may keep the existing checkout form while delivery rules are corrected.
- **Validation:** `git status --short` shows only docs files. No source/DB changes.

---

### [2026-06-29] — Phase 0 Closure: Canonical Master Execution Plan + Doc Reconciliation (docs only)

**Goal:** Close Phase 0 before commit by making the merged Master Execution Plan the single official execution reference inside the repo, and reconciling stale roadmaps / conflicting phase numbering. **No `src/`, no `supabase/`, no migrations, no `db push`, no commit** — docs only.

**`docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md`** (new — **canonical execution reference**) — purpose; the 20 locked business decisions; tool ownership (Claude / Codex / z.ai); collaboration rules; phase-gate format; the full **Phase 0–18 roadmap with a canonical numbering table (§5.0)**; an **Execution Clarifications (§6)** section; immediate next action; commit policy; absolute stop conditions; final priority summary. §6 resolves the open points: **Owner Settings UI deferred**; **storefront stock badges / disable-add-at-0 deferred to stable inventory (≈Phase 5)** while server-side validation stays the early safety gate; **per-phase testing (NOT deferred to Phase 16)** with `create_checkout_order` regression tests starting Phase 1; **migration preflight** before any migration phase incl. Phase 1; and locked details (delivery overlap priority + `Haram-end` admin-selectable + governorate fee 0; `inventory_stock`→`inventory_lots` with no double counting; units/precision kg/grams/EGP; packaging shortage = alert not block + packaging cost basis from lots; returns sellable-at-COGS vs damaged-loss; admin edits only after-shipped-before-delivered; Phase 2 `auth_user_id` stamping + same-device guest migration).

**`CLAUDE.md`** — new **Doc Reading Order** (1 CLAUDE.md → 2 CURRENT_STATE → 3 MASTER_EXECUTION_PLAN → 4 CONTENT_MAP → 5 FINAL_DECISIONS *(decisions/history only)* → 6 BLUEPRINT *(deep ref only)*) + canonical rule that the master plan wins on phase numbering; Current-Source-of-Truth block repointed to the master plan; **Position** line updated (Phase 0 finalizing, Phase 1 next, canonical numbering packaging=6 / identity=2 / promo=7 / editing=10 / espresso=8 / flavor=9); corrected stale "No backend / no Supabase / static mock data" in Project Overview, the Tech-Stack row, and Critical-Rule #2; builders wiring corrected to Phases 8–9.

**`docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`** — AI Reading Order now includes the master plan as the execution reference; builders wiring corrected to Phases 8 & 9; current-position line repointed to the master plan + "Phase 0 being finalized, commit pending".

**`docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md`** — added an **EXECUTION SUPERSESSION banner** (phase numbering superseded by the master plan; decisions + gap map + context stay valid; the 5 prior open decisions now resolved) + fixed the bottom Position line. Part 3 not rewritten (history preserved).

**`docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md`** — corrected inline phase numbers (product images → Phase 12; espresso → Phase 8; flavor → Phase 9).

**`docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md`** — banner strengthened to "deep reference only — never an execution plan; execution governed solely by the master plan".

**`docs/ai/LINE_COFFEE_V3_SYSTEM_AUDIT.md`** — added a historical-audit supersession banner (predates the real backend; "Media Studio Foundation" obsolete per Decision 1).

**Reconciled phase numbering** (old → canonical): packaging 10→6, customer identity 13→2, promo 3→7, order editing 4→10, espresso →8, flavor →9. Older roadmaps marked **non-execution references**. Added **Phase 1 preflight** + **per-phase testing** rule.

**Validation:** docs render as Markdown; `git status --short` shows only docs files. **No `src/`, no `supabase/`, no migrations, no `db push`, no commit/push.**

---

### [2026-06-28] — Documentation Realignment + Phased Roadmap (Phase 0, docs only)

**Goal:** Reconcile the planning docs with verified reality + the owner's locked decisions, and produce a dependency-ordered phased roadmap. **No `src/`, no `supabase/`, no migrations, no commits** — documentation + memory only.

**Verified current state** via full codebase exploration (3 areas): catalog, checkout→orders, admin orders, inventory kg-reservation, and the whole customer account are now **real Supabase**; admin Dashboard/Inventory-UI/Customers/Marketing/Accounting/Analytics/CMS/Espresso-Manager/Flavor-Manager are **mock**; FIFO lots, raw-bean inventory, packaging, purchases/suppliers/expenses, promo table, delivery zones, refunds, reviews, contact, analytics **don't exist**; Media Studio doesn't exist (and is cancelled). Builders are rejected at checkout today.

**`docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`** (full rewrite) — replaced the obsolete "mock-only / Marketing active task" framing with the verified REAL/MOCK/MISSING map, the architecture paragraph (anon key + SECURITY DEFINER RPCs + guest_id scoping), the corrected reading order, and the 20-decision summary.

**`docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md`** (new, then enriched) — the authoritative forward plan: 20 locked decisions, Was→WillBe→How gap map, and an **18-phase** roadmap, plus a per-phase Definition of Done + engineering rules, launch scope/out-of-scope, and 5 open owner decisions. Structural keys: **Purchases + Suppliers + Expenses create inventory lots from the start** in one phase, **FIFO consumption/COGS in a separate phase** (no duplication); **packaging deferred to its own later phase** (Phase 1 is not packaging-complete). Added phases beyond the owner's base list (from engineering review): Owner Settings + storefront stock truth, order editing/cancellation (Decision 13), opening-stock entry, customer identity/auth-linking for cross-device history. Marked as superseding the blueprint where they conflict.

**`docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md`** (new) — replaces Media Studio's purpose: a table mapping every public route's text + images to its source file and static/dynamic origin (announcement bar, footer, all homepage sections, products, builders, checkout, about/contact/blog/legal, account).

**`docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md`** (header only) — added a "DEEP REFERENCE — PARTIALLY SUPERSEDED" banner (Media Studio cancelled, FIFO, espresso raw-bean mfg, flavor cost-only, zone delivery, deduct-at-delivered; current-reality columns outdated). No other lines touched.

**`CLAUDE.md`** (strengthened) — new top block: Doc Reading Order + **Current Architecture (Verified 2026-06-28)** + **Locked Business Decisions** (20, one line each) + current position. A cold session is now oriented in one read without parsing the change log.

**Memory** — added `project_current_architecture.md`, `project_locked_decisions.md`, `project_roadmap_phases.md`; refreshed `v3_plan_reference.md` + `feedback_accounting_stock.md`; updated `MEMORY.md` index.

**Validation:** docs render as Markdown; no file under `src/` or `supabase/` modified.

---

### [2026-06-28] — Customer Account Persistence: Profile / Addresses / Wishlist

**Goal:** Wire the customer account area to real Supabase storage so data survives browser refresh. Three surfaces updated: profile save, address CRUD, wishlist sync.

**`supabase/migrations/20260628110000_customer_account_persistence.sql`** (new — authored, NOT applied)
- `ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS location_url text null` — optional Google Maps pin URL.
- `customer_wishlist` table: `(id, guest_id text, product_slug text, created_at)` with `UNIQUE(guest_id, product_slug)`. RLS disabled — all access through SECURITY DEFINER RPCs.
- **`update_customer_profile(p_guest_id, p_name, p_phone, p_whatsapp)`** — finds customer via `customers WHERE guest_id = p_guest_id AND type='guest'`. Writes ONLY `name/phone/whatsapp` (whitelist per Migration 1 Finding 1). Returns bool.
- **`get_customer_addresses`**, **`add_customer_address`**, **`update_customer_address`**, **`delete_customer_address`**, **`set_default_customer_address`** — full address CRUD; all ownership-verified via guest_id→customer lookup; required fields validated inside DB.
- **`get_customer_wishlist`**, **`add_customer_wishlist_item`** (idempotent ON CONFLICT DO NOTHING), **`remove_customer_wishlist_item`** — guest_id-scoped wishlist sync.
- All RPCs: `GRANT EXECUTE TO anon, authenticated`.

**`src/lib/account/customer-account.ts`** (extended)
- `updateCustomerProfile(name, phone, whatsapp)` — calls `update_customer_profile` RPC.
- `CustomerAddress` + `CustomerAddressInput` types + `mapAddressRow()` helper.
- `getCustomerAddresses()`, `addCustomerAddress(input)`, `updateCustomerAddress(id, input)`, `deleteCustomerAddress(id)`, `setDefaultCustomerAddress(id)`.
- `getCustomerWishlist()`, `addCustomerWishlistItem(slug)`, `removeCustomerWishlistItem(slug)`.

**`src/app/(public)/account/profile/page.tsx`** (updated)
- Added `whatsapp` field to `ProfileForm`; `getInitialProfileForm()` now accepts full profile object and prefers Supabase name over auth metadata.
- `handleSubmit` calls `updateCustomerProfile()` — shows Saving…/error states. Email field is now read-only (managed by Auth only).

**`src/app/(public)/account/addresses/page.tsx`** (full rewrite)
- Replaced 100% mock implementation with Supabase-backed CRUD.
- `AddressCard` sub-component: all fields including `locationUrl` (external link), landmark, recipientName; Edit/Delete/Set Default buttons with `busyId` loading guard.
- `AddressFormPanel` sub-component: full field set (label, recipient, phone, governorate, city, area, street, building, floor, apartment, landmark, location URL, default checkbox).
- `FormMode` discriminated union: `"hidden" | "add" | { kind:"edit"; address }`. Removed `MockAddress` import entirely.

**`src/lib/hooks/useWishlist.ts`** (updated)
- Module-level `_synced` flag ensures Supabase load fires once per session regardless of how many components mount the hook.
- On first mount: dynamic-imports `getCustomerWishlist()`, merges Supabase slugs into localStorage (union, not replace).
- `toggle` + `remove`: update localStorage immediately, async fire-and-forget Supabase RPC via dynamic import.

**Security:** all RPCs are guest_id-scoped, guest_id validated (8-64 chars, alphanumeric+dash), profile update limited to whitelist, address ownership verified in DB.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings. Migration authored only — apply with `supabase db push` before testing.

---

### [2026-06-28] — Header Notifications Bell: Dropdown Preview

**Goal:** Convert the public header bell icon from a direct `<Link>` to a dropdown popover that shows the latest 5 real order-status notifications inline, with a "View all notifications" footer link.

**`src/components/layout/public/PublicHeader.tsx`** (edited)
- Added `formatDate` import from `@/lib/utils/formatDate`.
- Added `NotificationsDropdown` module-level component (same positioning pattern as `UserMenu`):
  - On mount: dynamically imports `getCustomerNotifications` from `@/lib/account/customer-account` and calls it; shows 2 animated pulse skeletons while loading.
  - **Content**: renders up to 5 notifications; each is a `<Link href="/account/orders/${orderCode}">` that closes the dropdown on click. Shows status title + body (from inline `STATUS_NOTIFICATION` map for all 6 real statuses) + order code + formatted date.
  - **Empty state**: Bell icon + "No notifications yet." + "Order updates will appear here."
  - **Footer**: full-width "View all notifications" link → `/account/notifications`; closes dropdown on click.
  - Styling: `w-80 rounded-2xl border border-[#D6A373]/22 bg-[#100B08]/90 shadow-[...] backdrop-blur-2xl` — matches `UserMenu` exactly. Gold top-line shimmer.
  - `Date.now()` avoided (linter rule `react-hooks/purity`); relative time replaced with `formatDate()`.
- Added `isNotifOpen: boolean` state alongside `isUserMenuOpen`.
- Updated `closeAll()` to also `setIsNotifOpen(false)`.
- Added `handleNotifToggle()`: closes commerce panels, user menu, cart, then toggles `isNotifOpen`.
- Updated `handleCartToggle()` and `handleWishlistToggle()` to call `setIsNotifOpen(false)`.
- Updated `handleUserToggle()` to call `setIsNotifOpen(false)`.
- Replaced the plain `<Link href="/account/notifications">` bell with a wired `<div className="relative hidden md:block">` wrapping a `<button>` (active-bg style + `aria-expanded`) + `{isNotifOpen && <NotificationsDropdown onClose={...} />}`.
- Escape key already wired to `closeAll()` — closes the dropdown with no extra work.
- Mobile: bell remains desktop-only (`hidden md:block`); mobile users reach notifications through the mobile menu account links (unchanged).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 43 routes. No db push, no commit, no push.

---

### [2026-06-28] — Customer Account Real + Header Notification Icon

**Goal:** Replace mock runtime data in the customer account area with real Supabase-backed data scoped to the device's `guest_id`; fix the profile firstName-equals-email bug; add a notification bell icon to the public header.

**`supabase/migrations/20260628100000_customer_account_rpcs.sql`** (new — authored, NOT applied)
- Four SECURITY DEFINER RPCs callable by `anon, authenticated`, each validates `p_guest_id` (8-64 chars, `^[A-Za-z0-9_-]+$`) before any DB access:
- `get_customer_orders(p_guest_id)` — lists up to 50 orders WHERE `orders.guest_id = p_guest_id`, DESC by `placed_at`; returns `id, code, status, type, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, item_count, placed_at`.
- `get_customer_order_detail(p_order_code, p_guest_id)` — requires BOTH code AND guest_id (prevents order-code enumeration); returns full order row + `items` as JSONB aggregate (name_en/ar, detail_en/ar, quantity, unit_price, line_total) + `timeline` as JSONB aggregate from `order_status_events`.
- `get_customer_notifications(p_guest_id)` — returns `order_status_events` joined with `orders WHERE guest_id = p_guest_id`, limit 100, DESC by `changed_at`.
- `get_customer_profile(p_guest_id)` — returns `customers` row via JOIN on most-recent order on this device.
- GRANTs to `anon, authenticated`. No INSERT/DELETE grants, no RLS changes.

**`src/lib/account/customer-account.ts`** (new)
- `"use client"` module with four async functions calling the RPCs via the shared Supabase browser client.
- Each reads `getOrCreateGuestId()` (from `src/lib/checkout.ts`) inside the async call — safe inside `useEffect`.
- Returns empty arrays / null on error → graceful degradation if migration not yet applied.
- Types: `CustomerOrderStatus`, `CustomerOrderSummary`, `CustomerOrderItem`, `CustomerOrderEvent`, `CustomerOrderDetail`, `CustomerNotification`, `CustomerProfile`.

**`src/app/(public)/account/orders/page.tsx`** (rewritten)
- Removed `MOCK_ORDERS` and `MockNotification` imports from `account-data.ts`.
- `useEffect` calls `getCustomerOrders()` on mount; loading skeleton while fetching.
- Real statuses: `pending | preparing | shipped | delivered | cancelled | returned`.
- Links to `/account/orders/${order.code}` (real order code, not UUID).

**`src/app/(public)/account/orders/[id]/page.tsx`** (rewritten)
- Removed `MOCK_ORDERS.find()` dependency entirely.
- `useEffect` calls `getCustomerOrderDetail(id)` where `id` = order code from URL params.
- Tracking stepper: updated from mock `processing|roasting` to real `pending|preparing|shipped|delivered`; not shown for `cancelled|returned` (terminal statuses).
- Sections: header card (code + status badge + date) → tracking stepper → items list (frozen snapshot names/sizes/qty/prices) → financial summary (subtotal/discount/delivery/total + payment method) → delivery address (`address_snapshot` JSONB formatted) → order timeline from `order_status_events`.
- `formatAddress()` helper formats `address_snapshot` object to readable string.

**`src/app/(public)/account/profile/page.tsx`** (fixed + enhanced)
- Bug fix: `getInitialProfileForm` now checks `user?.name !== user?.email` before treating name as real — prevents `firstName = "midoseka8@gmail.com"` when `useAuth` defaults `user.name` to email.
- Added `useEffect` that calls `getCustomerProfile()` to pre-fill phone from the customer record linked to checkout orders on this device.
- Loading skeleton shown while profile fetch is in flight; form remounts (`key`) when phone resolves.

**`src/app/(public)/account/notifications/page.tsx`** (rewritten)
- Removed `MockNotification` import from `account-data.ts`.
- `useEffect` calls `getCustomerNotifications()` on mount; loading skeleton while fetching.
- Each `order_status_events` row mapped to bilingual notification title + body via `STATUS_NOTIFICATION` map (pending/preparing/shipped/delivered/cancelled/returned).
- Items render as `<Link href="/account/orders/${orderCode}">` — clicking marks as read (local session state) and navigates to order detail.
- Empty state unchanged (Bell icon + bilingual message).

**`src/components/layout/public/PublicHeader.tsx`** (edited)
- Added Bell icon `<Link href="/account/notifications">` between the cart button and the user menu button.
- Only rendered when `isLoggedIn === true`; `hidden md:inline-flex` (desktop only, matches wishlist button pattern).
- No unread badge (notifications load async; badge can be added once a real-time subscription is set up).

**Security model:** All four RPCs are scoped strictly to the device's `guest_id`. No email/phone search. No broad query. `get_customer_order_detail` requires BOTH code AND guest_id (prevents enumeration). Input validated before any query runs (empty string / SQL injection rejected at the plpgsql level). SECURITY DEFINER bypasses admin-only RLS on `orders` and `order_items` but functions are self-scoping.

**Limitations (acceptable for launch):** clearing `localStorage` loses order access on that device. Cross-device history requires a full Supabase customer auth implementation. Notification `read` state is session-only (no DB persistence).

**Out of scope (unchanged):** account addresses, wishlist, settings pages, admin area, public catalog, checkout flow. `account-data.ts` mock file left in place (still imported by `/account/wishlist` and others).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 43 routes. Migration authored only — run `supabase db push` before testing live order data (pages show empty state gracefully until applied).

---

### [2026-06-27] — Admin Product Archive / Restore Flow

**Goal:** Let admins archive products safely (no hard delete) so they vanish from the public site but stay in admin for a future restore. Mirrors the existing category archive/restore.

**`src/lib/admin/admin-catalog.ts`**
- `AdminProductUpdateInput` — added `catalogStatus?: AdminProductLifecycleStatus` ('active'|'draft'|'archived'). `updateAdminProduct` now writes `patch.status` when provided. This was the missing piece: the write layer previously never touched `products.status`, so draft/restored products had no path to 'active'.
- `archiveAdminProduct(productId)` — one UPDATE: `status='archived'` + `visibility='hidden'` + `show_on_website=false`. Never deletes; variants + order history untouched. Idempotent.
- `restoreAdminProduct(productId)` — one UPDATE: `status='draft'` + `visibility='hidden'` + `show_on_website=false`. Returns to a SAFE review state — deliberately 'draft' (not 'active') so restore never auto-publishes.

**`src/components/admin/products/ProductDrawer.tsx`**
- Added Archive/Restore zone at the bottom of the **Visibility** tab (separate one-shot write, not part of the form Save/dirty flow). Own state: `lifecycleBusy` / `lifecycleError` / `confirmArchive` (reset on drawer open). Archive is two-click (Archive product → Confirm archive + Cancel); shows Archiving…/Restoring… spinners and a red error banner; only calls `onSaved()` (catalog reload) on success — never fakes success. Archived products show a "Restore as draft" button instead.
- **Publish path wired:** Save now sets `catalogStatus = form.hidden ? product.catalogStatus : "active"`. Showing (Active toggle) publishes → status='active'; hiding preserves the current lifecycle status (draft stays draft, active stays active-but-off-site, archived stays archived — un-archiving is done via Restore). This makes both restored products and freshly-created drafts actually publishable.

**`src/app/admin/products/page.tsx`**
- Added a lifecycle **status filter** (All / Active / Draft / Archived, with live counts) on the Products tab next to the search — this is how admin reaches archived products. `filtered` now also matches `catalogStatus`.
- `AdminProductCard` badge is status-aware: ARCHIVED (red) / DRAFT (amber) / HIDDEN (gray) instead of only HIDDEN.

**Supabase / RLS — NO migration needed.** Archive/restore are plain column UPDATEs on `public.products`. The UPDATE grant to `authenticated` already exists (`20260626090000_admin_catalog_write_grants.sql`, table-wide so it covers `status`), and RLS `products_admin_all` (`for all using is_admin()`) already gates the row. No hard delete, no service-role code.

**Public behavior (already correct, verified):** `public_products` view filters `status='active' AND visibility='public' AND show_on_website=true` (preserved through the `new_until` view recreate). All public reads (`/products`, `/products/[slug]`, Best Sellers, `/products/category/[slug]`) go only through the `public_*` views, so an archived product disappears everywhere and its direct slug returns null → not-found. No public-side code changed.

**Limitations:** an admin can still publish an archived product directly by toggling Active + Save (explicit bypass of restore→draft); product is visually marked ARCHIVED and Restore is the offered safe path. Hard delete remains out of scope (archive instead). No bulk archive.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/0 warnings · concurrent `npm run build` intentionally skipped (live `next dev` on :3000 shares `.next` — ChunkLoadError risk per the 2026-06-26 entry); validated instead by dev route compilation: `/admin/products`, `/products`, `/products?category=…` all HTTP 200. No Supabase/DB commands run, no commit. **Manual admin test needs the owner's authenticated admin session; no migration to apply first.**

---

### [2026-06-27] — Admin Product Create + Admin Category Create

**Goal:** Wire the previously-disabled "+ Add Product" / "+ Add Category" buttons to real Supabase create flows.

**`src/lib/admin/admin-catalog.ts`** — added the create layer: `generateVariantSku(slug, size)` (`{slug}-{size}`), `checkAdminProductSlugAvailable`, `checkAdminCategorySlugAvailable`, `getNextCategorySortOrder`, `createAdminProduct(input)` (validates, pre-checks slug, computes `new_until = now+40d` when New, calls the `create_admin_product` RPC, returns `{id, slug}`), `createAdminCategory(input)` (validates, pre-checks slug, defaults sort_order to end, client-side insert with `source='admin'`). Plus `AdminProductCreateInput` / `AdminCategoryCreateInput` types.

**`src/components/admin/products/ProductCreateDrawer.tsx`** (new) — create drawer: category select, EN/AR name, auto+editable slug, EN/AR description, 250g/500g/1kg prices (required), purchase cost/kg (optional), New (default on)/Featured/Best Seller/Show-on-website (default off) toggles. Single state object (one setState in the open-reset effect, matching ProductDrawer / the set-state-in-effect rule). Validation, Creating…/✓ Created/error states. On success the page refreshes the grid and opens the new product in the existing ProductDrawer.

**`src/app/admin/products/page.tsx`** — both header buttons now active: Add Product opens ProductCreateDrawer; Add Category opens the shared CategoryDrawer in `add` mode. CategoryDrawer extended to handle create+edit via a discriminated `onSubmit` ({mode:"create",input} | {mode:"edit",id,payload}); create mode enables Save when valid (no dirty requirement) and shows Create category / Creating… / ✓ Created. Added `handleCreateProduct` + `handleCategorySubmit`; removed the dead mock `AddProductDrawer` + its unused constants.

**`supabase/migrations/20260627090000_admin_catalog_create.sql`** (new — authored, NOT applied):
- `grant insert on public.categories to authenticated` — category create is a single insert gated by the existing `categories_admin_all` RLS; only the table privilege was missing.
- **`create_admin_product(...)` RPC** (SECURITY DEFINER, guarded by `if not public.is_admin() then raise`) — inserts the product + its 3 variants in ONE transaction (atomic: a product can never exist without variants). Forces public-safe defaults (`status='draft'`, `visibility='hidden'`, `show_on_website=false`) regardless of input, sets `category_slug` from the parent category, stores deterministic SKUs literally, and writes the create-form description into `notes_en/notes_ar` (the columns ProductDrawer reads). Because it's DEFINER, **no INSERT grant on products/product_variants** is given to authenticated — base-table inserts stay locked to the guarded function. `grant execute … to authenticated`, revoked from anon/public.

**Defaults for new rows:** product → draft / hidden / off-website, New on (new_until now+40d), featured/bestSeller off, pricing_model 'fixed', sale_price_per_kg = 1kg price; category → status 'draft', show_on_website false, sort_order = last+10, source 'admin'. Nothing is public until an admin reviews and publishes.

**SKU / variants:** `create_admin_product` always creates exactly 250g/500g/1kg with SKUs `{slug}-250g/-500g/-1kg`, stored literally so a later slug rename does not change them. Slug uniqueness is pre-checked in the data layer (clear error) and enforced by the DB unique constraint.

**Out of scope (unchanged):** no image/gallery upload, no inventory/stock creation, no product/category delete.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 39 routes. Migration authored only — run `supabase db push` before testing (creates fail with permission-denied until the categories INSERT grant + the RPC are applied).

---

### [2026-06-26] — Admin Categories Write Layer (edit / visibility / reorder / archive-restore)

**Goal:** Make the Admin Products → Categories tab actually persist to Supabase. Previously the whole tab was wired to a "Read-only until the admin catalog write layer is implemented" notice — edit, archive/restore, move up/down, and show/hide all did nothing.

**`src/lib/admin/admin-catalog.ts`** — added the category write layer alongside the existing product writes:
- `AdminCategoryUpdateInput` + `updateAdminCategory(categoryId, payload)` — patches only provided columns: `name_en/name_ar`, `slug` (validated lowercase/hyphen), `description_en/ar` (trim→null when empty), `status`, `show_on_website`, `sort_order` (≥0). Empty patch is a no-op. `updated_at` left to `trg_categories_updated_at`.
- `archiveAdminCategory(id)` — `status='archived'` + `show_on_website=false` (never hard delete).
- `restoreAdminCategory(id)` — `status='visible'`; intentionally does NOT auto-republish (show_on_website stays false until admin presses Show).
- `reorderAdminCategories(orderedIds)` — writes sequential `sort_order` (10,20,30…) for the full ordered list so order is unambiguous and survives refresh.

**`src/app/admin/products/page.tsx`** — replaced all category stub handlers with real async Supabase calls + `reloadCatalog()`; added `categoryError` + `categoryBusyId` state. CategoryDrawer rebuilt into a real editor: added Description EN/AR fields, dirty tracking (Save enables only on change), Save/Saving…/✓ Saved/error states, and it sends only changed fields (so the slug-sync trigger only fires when the slug actually changes). Per-card action buttons disable while that card's write is in flight; green success + red error banners. "Add Category" is now an honest disabled "coming soon" (create is out of scope, matching Add Product).

**`supabase/migrations/20260626160000_admin_categories_write.sql`** (new — authored, NOT applied) — (1) `grant update on public.categories to authenticated` (the read-grants migration only granted SELECT; the product write-grants migration deliberately skipped categories). RLS `categories_admin_all` (`for all … is_admin()`) already covers the row policy, so no new policy. (2) **`trg_categories_sync_slug`** trigger + `sync_products_category_slug()` (SECURITY INVOKER): when a category's slug changes it rewrites every child `products.category_slug` in the SAME transaction — `products.category_slug` is denormalized and feeds `public_products` / `/products/category/[slug]`, so without this a rename would break the public category page. Fires only on slug change. Idempotent.

**Public impact:** hiding/archiving a category drops it from `public_categories` → gone from `/products` nav and `validCategories`; its products do NOT break (still individually reachable via `/products/[slug]`). Category name/order/visibility on the public site follow the stored Supabase values.

**Limitations (documented):** category create/delete still out of scope (archive instead of delete). Toggling "Show" on a `hidden`-status category won't surface it publicly until status is `visible` (public_categories requires both). A hidden category's direct `/products/category/[slug]` URL still lists its published products (hiding a category ≠ unpublishing products).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 39 routes. Migration authored only — run `supabase db push` before testing admin category writes (writes will fail with permission-denied until the UPDATE grant is applied).

---

### [2026-06-26] — Berry Cleanup Follow-up: Hard-Delete Hot Chocolate + Remove Builder "Berries"

**Owner decision (follow-up to the entry below):** the plain berry Hot Chocolate must be gone from the admin dashboard too (not just archived), and the Make Your Flavor builder should keep "Blueberry / توت أزرق" only.

**`supabase/migrations/20260626150000_delete_raspberry_hot_chocolate.sql`** (new — authored) — `DELETE FROM public.products WHERE slug = 'raspberry-hot-chocolate'`. Follows the archive migration (`20260626140000`, already applied by owner). Variants removed via `ON DELETE CASCADE`; `order_items` preserved via `ON DELETE SET NULL` + slug snapshot. Deterministic (exact slug), idempotent. After applying, the product disappears from the admin Products list as well as the public site.

**`src/features/website/make-your-flavor/data/flavorData.ts`** — removed the `id: "berries"` flavor (Berries / توت). The `blueberry` flavor (توت أزرق) is kept. Verified no preset (`flavorIds`) or other code referenced the `"berries"` id — grep for `berries`/`Berries` across `src` is now clean.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings. New delete migration is authored — owner to run `supabase db push` to apply it to the live DB.

---

### [2026-06-26] — Berry → Blueberry Catalog Cleanup (Hot Chocolate + Flavor Coffee)

**Business decision (owner):** No more plain berry/raspberry products. Hot Chocolate keeps Blueberry only; Flavor Coffee's plain berry becomes Blueberry / توت أزرق.

**Affected products (exactly 2, deterministic by slug):**
- `raspberry-hot-chocolate` (Raspberry Hot Chocolate / هوت شوكليت توت) — **archived** (DB) + **removed** from seed/source. `blueberry-hot-chocolate` already exists and is kept.
- `raspberry-coffee` (Raspberry Coffee / قهوة توت) — **renamed** → slug `blueberry-coffee`, "Blueberry Coffee" / "قهوة توت أزرق".

**`src/lib/mock-data/product-catalog.ts`** — removed the `raspberry-hot-chocolate` `packed(...)` line; renamed the `raspberry-coffee` line to `blueberry-coffee` / Blueberry Coffee / قهوة توت أزرق.

**`supabase/seeds/20260625_catalog_seed.sql`** — removed the `raspberry-hot-chocolate` product row + its 3 variant rows (250g/500g/1kg); renamed the `raspberry-coffee` product row and its 3 variant rows to `blueberry-coffee`. (Variant inserts join `products.slug = seed_variants.product_slug`, so the renamed rows resolve correctly.)

**`supabase/migrations/20260626140000_cleanup_berry_blueberry.sql`** (new — authored, NOT applied) — two exact-slug `UPDATE`s: (1) archive `raspberry-hot-chocolate` (`status='archived'`, `visibility='hidden'`, `show_on_website=false`); (2) rename `raspberry-coffee` → `blueberry-coffee` with name_en/name_ar, guarded by `NOT EXISTS (blueberry-coffee)` for idempotency/no slug collision. No `updated_at` set (trigger handles it). No text-pattern/bulk replacements.

**Safety:** `product_variants.product_id` is a UUID FK (`on delete cascade`) — slug rename does not detach variants. `order_items` soft-reference products (slug snapshot + `on delete set null`) — archive/rename leaves history intact. `public_products`/`public_product_variants` views filter on active+public+show_on_website, so the archived product drops from `/products` and the Hot Chocolate category. Grep confirmed the two slugs were referenced only in the seed + source (no routes, no best-seller migration). Best Sellers/Featured/New logic untouched.

**Out of scope (flagged, not changed):** Make Your Flavor builder (`src/features/website/make-your-flavor/data/flavorData.ts`) still has a separate "Berries / توت" add-on flavor alongside "Blueberry / توت أزرق" — static builder config, not a Supabase catalog product. Owner decision needed if the builder should also drop plain berry.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 39 routes. Migration authored only — apply with `supabase db push` before manual testing.

---

### [2026-06-26] — Multi-Badge ProductCard + Best Sellers Supabase Source + Adaptive Marquee

**`src/lib/catalog/public-catalog.ts`** — added `fetchProductRowsBestSellers()` (private, `.eq("best_seller", true)`) and `getPublicBestSellers()` (public export using the new fetch function).

**`src/components/product/ProductCard.tsx`** — replaced single `badge` prop with `badgeStack: BadgeEntry[]`. For `CatalogProduct`: stacks New (cream `#FFDCC2`), Best Seller (gold `#D6A373`), Featured (amber `#C9956A`) independently — all three show simultaneously when all flags are true. For `VisualProduct`: visual badge unchanged.

**`src/features/website/home/sections/BestSellersSection.tsx`** — removed `BEST_SELLER_SLUGS` hardcoded array and `getPublicProductsBySlugs` import; now calls `getPublicBestSellers()`. Adaptive layout driven by `MARQUEE_THRESHOLD = 4`: ≤4 products renders a centered `flex-wrap` row (no marquee, no gap); 5+ products renders the scrolling marquee with 2 repetitions per half-loop (down from 4). Both layouts share the same `containerRef` + self-managed `IntersectionObserver` for reliable reveal after async load.

**`supabase/migrations/20260626130000_seed_best_sellers_featured.sql`** (authored, NOT applied) — marks `turkish-silk`, `high-mood`, `heavy-crema`, `black-label`, `classic-line`, `original-cappuccino` as `best_seller = true`; marks `high-mood` and `heavy-crema` as `featured = true`.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ all routes. No Supabase/DB commands run.

---

### [2026-06-26] — New Badge: `new_until` Date-Based Model

**Goal:** Implement the product "New" badge using a `new_until timestamptz` column rather than a plain boolean, so the badge expires automatically after 40 days without any cron job.

**`supabase/migrations/20260626120000_add_new_until_to_products.sql`** (new — authored, NOT applied)
- `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS new_until timestamptz null` — no default, so all existing rows stay null (not New).
- `CREATE OR REPLACE VIEW public.public_products` — adds `is_new` computed column: `(p.new_until is not null and p.new_until > now())`. All existing columns preserved. Existing `SELECT` grants to anon/authenticated are preserved by `CREATE OR REPLACE`. No new GRANT needed.
- **Column comment:** documents that Product Create (not yet implemented) should set `new_until = now() + interval '40 days'` at insert time.

**`src/lib/catalog/public-catalog.ts`**
- `PublicCatalogProduct`: added `isNew: boolean` field.
- `PublicProductRow`: added `is_new: boolean | null` DB row type.
- All four `fetchProductRows*` functions: added `"is_new"` to select lists.
- `mapProductRows`: maps `row.is_new` → `isNew: Boolean(row.is_new)`.

**`src/lib/admin/admin-catalog.ts`**
- `AdminProductMeta`: added `newUntil: string | null` (raw DB timestamp) and `isNew: boolean` (computed).
- `AdminProductRow`: added `new_until: string | null` DB row type.
- All three admin fetch functions (`fetchProductRows`, `fetchProductRowById`, `fetchProductRowBySlug`): added `"new_until"` to select lists.
- `mapProductRows`: maps `row.new_until` → `newUntil` and computes `isNew: row.new_until != null && new Date(row.new_until) > new Date()`.
- `AdminProductUpdateInput`: added `newUntil?: string | null` with JSDoc (`undefined` = don't touch, `null` = clear, ISO string = set).
- `updateAdminProduct`: added `if (input.newUntil !== undefined) patch.new_until = input.newUntil`.

**`src/components/admin/products/ProductDrawer.tsx`**
- `DrawerForm`: added `isNew: boolean`.
- `EMPTY_FORM` / `initForm`: initialized from `product.isNew`.
- Visibility tab: added **New** toggle row (same style as Featured/Best Seller). Footer helper text: "New badge expires automatically after 40 days." with conditional expiry date (shows current expiry when already active) or "Will be active for 40 days after saving" (when just turned on).
- `handleSave`: computes `newUntil = isNew ? now + 40 days : null` and passes it to `updateAdminProduct`. The timer refreshes on every save while the toggle is on.

**`src/components/product/ProductCard.tsx`**
- Badge logic updated: for `PublicCatalogProduct` with `isNew === true`, synthesizes `{ en: "New", ar: "جديد" }` badge. `VisualProduct.badge` still takes precedence. No card redesign.

**Future Product Create note:** When Product Create Flow is implemented, new products should set `new_until = now() + interval '40 days'` at insert time (default or explicit in the INSERT). See the migration comment for the rationale (no DB DEFAULT to avoid accidental silent marking of future rows).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ all routes. Migration authored only — apply with `supabase db push` before manual testing.

---

### [2026-06-26] — Phase A Image-Warning Cleanup + Phase B Admin Product Basic Write Layer

**Goal:** Two-phase, scoped pass. Phase A: clear visible Next.js image performance warnings without any visual change. Phase B: enable real Supabase saving of basic product fields from the Admin Product drawer/detail. No public/admin redesign, no broad refactor, no DB commands.

**Phase A — image warnings (no visual/layout/crop change):**
- `src/app/(public)/products/page.tsx` — added `sizes="100vw"` to the full-bleed `/products` hero (had `priority`, was missing `sizes`).
- `src/components/admin/dashboard/WelcomeHero.tsx` — added `priority` to the admin dashboard hero background (the above-the-fold LCP image on `/admin/dashboard`).
- `src/app/admin/products/[slug]/page.tsx` — added `sizes="(max-width: 640px) 100vw, 128px"` to the product detail thumbnail.
- `src/components/admin/products/ProductDrawer.tsx` — added `sizes="44px"` (header thumb) and `sizes="200px"` (main image) to the two `fill` images.
- Audited all 61 `<Image>` usages; these 4 were the only `fill`-without-`sizes` cases. All public route heroes already had `priority`.

**Phase B — admin product basic write layer:**
- `src/lib/admin/admin-catalog.ts` — added `AdminCatalogWriteError`, `updateAdminProduct(productId, input)` and `updateAdminProductVariantPrices(productId, prices)` using the shared Supabase browser client (no new client). `updated_at` is left to the DB `before update` triggers (never set in app). Writes are partial/guarded; per-kg and variant prices validated `>= 0`.
- `src/components/admin/products/ProductDrawer.tsx` — removed the read-only gate; `onSave` → `onSaved(newSlug?)`. Save now writes to Supabase: General (name → `name_*`, description → `notes_*`), Pricing (250g/500g/1kg → existing variant `price`, 1kg also syncs `sale_price_per_kg`), Visibility (`hidden` → `show_on_website` + `visibility`; `featured`; `best_seller`), SEO (`slug`, `seo_title_*`, `seo_description_*`). Added `dirty`/`saving`/`errorMsg` state: Save enables only after an edit, shows Saving…/✓ Saved/exact error. **Media tab disabled** with "Media upload will be implemented in the Media/Storage layer." **Inventory tab disabled** with "Inventory will be handled by the inventory movement layer." (no fake media/stock writes).
- `src/app/admin/products/page.tsx` — refactored catalog load into a reusable `reloadCatalog()`; `handleProductSaved(newSlug?)` refreshes from Supabase after save and re-targets the drawer when the slug changed. Removed the no-op read-only `handleSave`. Categories tab + Add Product stay read-only (out of scope).
- `src/app/admin/products/[slug]/page.tsx` — "Edit Prices" now really edits; Save writes variant prices + `sale_price_per_kg`, refetches, with saving/error states. Cancel reverts unsaved prices.

**Migration created (authored only, NOT applied):** `supabase/migrations/20260626090000_admin_catalog_write_grants.sql` — `GRANT UPDATE ON public.products, public.product_variants TO authenticated`. RLS already covers admin UPDATE (Migration 1 `products_admin_all` / `product_variants_admin_all` are `for all ... is_admin()`), so **no new RLS policy is needed** — only the missing UPDATE privilege layer. No categories grant (categories not written), no INSERT/DELETE, anon never granted, RLS not disabled/bypassed.

**Out of scope / intentionally still disabled:** product/category create & delete, category edits, media/gallery/Storage, inventory/stock writes, SKU generation, packaging, orders/accounting. `purchase_cost_per_kg` left display-only (not editable in the UI).

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/0 warnings · concurrent `npm run build` intentionally skipped (live `next dev` on :3000 shares `.next`; a concurrent prod build risks ChunkLoadError) — validated instead by per-route dev compilation: `/`, `/products`, `/products/heavy-crema`, `/admin/dashboard`, `/admin/products`, `/admin/products/heavy-crema` all HTTP 200, no Build/Chunk/runtime errors. No Supabase/DB commands run, no seed changes, no commit. **Manual admin write test is pending: the migration must be applied first, and it needs the owner's authenticated admin session.**

---

### [2026-06-25] — Fix Supabase Admin Auth/Guard Infinite Loading + Public Header Admin Awareness

**Goal:** The real Supabase admin login worked, but `/admin/dashboard` hung forever on "Loading admin workspace… / Verifying your Supabase session.", the public account dropdown ignored admin identity, and login didn't reliably route admins to the dashboard. Targeted auth/guard stability fix — no DB/migration/seed/catalog/visual changes.

**Root cause:** The admin resolver had no guaranteed terminal state. `useCurrentAdmin` called `getCurrentAdmin()` (which called `supabase.auth.getUser()`) **inside its `onAuthStateChange` callback** via `void refresh()`, and `refresh()` reset status to `"loading"` on every auth event. `getCurrentAdmin()` could also reject without a `.catch()` (no try/catch; mount path used `.then()` only). Any stall/rejection/re-entry pinned the hook at `"loading"` → `AdminShell` spun forever. `useAuth` was unaffected because it derives its user from the callback's `session` (never re-calling an auth method), which is why the public header still saw the email. **Not an RLS problem** — `admin_users_self_read (using auth_user_id = auth.uid())` already lets an authenticated browser read its own row.

**`src/lib/auth/admin.ts`** — `getCurrentAdmin()` now reads `getSession()` (local, no `/auth/v1/user` network stall) and is fully wrapped so it never throws. New `getAdminForUser(user)` does the RLS-protected `admin_users` read (by `auth_user_id`, `.maybeSingle()`) and maps every outcome to `signed_out | forbidden | authorized | error`. Dev-only `console.warn` explains non-authorization without leaking secrets.

**`src/lib/hooks/useCurrentAdmin.ts`** — Rewritten as an always-settling state machine: initial `getCurrentAdmin()` + a 10s watchdog that flips a hung load to `error`; the `onAuthStateChange` callback resolves from the `session` arg via `getAdminForUser` (PostgREST read only — **never** `supabase.auth.*` inside the callback). Exposes `refresh()` for retry.

**`src/components/admin/layout/AdminShell.tsx`** — Each status renders a concrete screen (loading / redirecting / error card with "Try again" + Back to site + Sign out / access-denied card / authorized shell). No more infinite spinner; `error` is shown, not silently redirected.

**`src/lib/hooks/useAuth.ts`** — `signOut()` is best-effort (clears legacy `line-user-v1`, ignores Supabase signOut network errors, always nulls local user) so a failed network call can't strand a stale identity or block redirect.

**`src/components/layout/public/PublicHeader.tsx`** — `UserMenu` + `MobileMenu` now use `useCurrentAdmin`: for an active admin they show real `admin_users` identity (display name, email, role badge, initials) and an "Admin Dashboard" link; non-admins keep normal customer behavior. The admin read only runs when the menu opens.

**RLS:** No migration created/needed — the self-read policy already permits the browser SELECT. Login redirect (`resolvePostLoginDestination`) now works because the resolver settles.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ all routes. No Supabase/DB commands run, no migration applied, no seed/catalog/visual changes, no commit.

---

### [2026-06-22] - Documentation Source-of-Truth Cleanup

**Goal:** Make `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` the current source of truth and prevent older planning/changelog entries from overriding current decisions.

**Files changed:** `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`, `AGENT_WORK_PROTOCOL.md`, `README.md`, `CLAUDE.md`, `LINE_COFFEE_V3_PUBLIC_WEBSITE_MASTER_VISUAL_PLAN.md`, `LINE_COFFEE_V3_CUSTOM_BUILDERS_REVIEW_AND_ENHANCEMENTS.md`, `LINE_COFFEE_V3_PROJECT_LOG.md`, `docs/archive/LINE_COFFEE_V3_PRODUCTS_PHASE_READINESS_AUDIT.md`

**What changed:** Added current source-of-truth notice, documented the active Marketing restructure as 4 tabs only, tightened agent reading/work rules, refreshed README from foundation-only to active mock UI phase, archived the outdated Products readiness audit, and marked older planning docs as historical.

**Validation:** Documentation-only update. No source code or `src/` files touched.

### [2026-06-22] — Marketing & Promotions: Full Module Rebuild (5 Tabs)

**Goal:** Complete ground-up rebuild of the Marketing admin module. Previous version had only a promo codes table and announcement bar toggles. This version adds Offers management, Customer Targeting, Website Banners, and Performance analytics.

**`src/lib/mock-data/admin/marketing-mock.ts`** (full rewrite)
- New types: `OfferType`, `OfferStatus`, `TargetSegment`, `BannerPosition`, `Offer`, `WebsiteBanner`
- `PromoCode` expanded: added `id`, `maxDiscount`, `perCustomerLimit`, `targetSegments`, `linkedOfferId`, `ordersGenerated`, `revenueGenerated`, `discountGiven`
- `OFFERS`: 6 offers — "10% Off Espresso" (Active, VIP+Repeat), "Free Shipping 1000+ EGP" (Active, all), "Welcome Gift 50 EGP" (Active, new), "Ramadan 25%" (Expired, all), "Win-Back 20%" (Scheduled, inactive+at-risk), "VIP Loyalty 100 EGP" (Paused, vip)
- `PROMO_CODES`: 8 codes — existing 6 expanded + 2 new (WINBACK20 targeting inactive/at-risk, VIP2026 targeting vip)
- `WEBSITE_BANNERS`: 3 banners (hero active, announcement active, section expired)
- `ANNOUNCEMENT_MESSAGES`: preserved from previous version
- `MARKETING_SUMMARY`: activeOffers, scheduledOffers, activeCodes, totalUsage, totalDiscountGiven, totalCampaignRevenue, expiringSoon (within 14 days)

**`src/app/admin/marketing/page.tsx`** (full rewrite)
- 6 KPI cards: Active Offers | Active Codes | Total Usage | Discount Given | Campaign Revenue | Expiring Soon
- 5 tabs: Offers | Promo Codes | Customer Targeting | Website Banners | Performance
- **Offers tab**: filter pills (All/Active/Scheduled/Paused/Expired), table with offer type badge, segment chips, usage, orders, revenue, status, Pause/Activate toggle actions; "New Offer" form (title EN/AR, type, value, minOrder, maxDiscount, segments, date range)
- **Promo Codes tab**: expanded table adds Min Order, Per-Customer Limit, linked offer indicator, segment chips; "New Code" form with all fields; usage progress bar per code
- **Customer Targeting tab**: 6 segment cards (VIP/Repeat/New/Inactive/At-Risk/Wholesale) each showing customer count, desc, active offers assigned, active codes assigned, and a quick-assign code dropdown
- **Website Banners tab**: banner list with position badge (Hero/Announcement/Section), active toggle, date range, linked offer; Announcement Bar sub-section with the 3 rotating messages; "Add Banner" form
- **Performance tab**: "By Offer" / "By Promo Code" subtabs; each with 3 summary KPI cards + full performance table (revenue, discount given, conversion rate, ROI); sorted by revenue descending
- All sub-components at module level: `StatusBadge`, `SegmentChips`, `SectionHeader`, `InputField`, `SelectField`, `FormFooter`, `OffersTab`, `PromoCodesTab`, `CustomerTargetingTab`, `WebsiteBannersTab`, `PerformanceTab`
- All ARIA: `aria-pressed` as string literal ternaries

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 43 routes

---

### [2026-06-21] — Customers Module: Full Ground-Up Rebuild — Customer Intelligence + Drawer + Add Customer

**Goal:** Complete replacement of the basic customers table with a full Customer Intelligence module. The old module had 18 all-registered customers, a 6-column table, no drawer, no guests, no segments, no addresses, no timeline, no tags.

**`src/lib/mock-data/admin/customers-mock.ts`** (full rewrite)
- New type system: `CustomerType`, `ActivityType`, `CustomerSegment`, `CustomerStatus`, `CustomerAddress`, `CustomerOrderSummary`, `CustomerActivity`, `AdminCustomer`
- `AdminCustomer`: 25 fields including `email?` (optional for guests), `phone`, `whatsapp`, `type`, `addresses[]`, `recentOrders[]`, `activity[]`, `tags`, `marketingOptIn`, `promoUsageCount`, `lastPromoUsed`, `possibleDuplicateOf?`
- 20 mock customers: 11 registered + 9 guest; VIP (4), Repeat (7), New (4), Inactive (3), At Risk (2), Wholesale Potential (1)
- Egyptian names, phones (+20 1xx), Cairo/Giza/Alexandria/Sharqia/Mansoura addresses
- C-011 and C-019 share the same phone → `possibleDuplicateOf` set on both (duplicate warning pair)
- C-009 (Youssef Tamer): VIP guest customer — proves guests can be high-value
- C-010 (Karim Adel): VIP + Wholesale Potential tag
- C-020 (Basma Wael): registered, 0 orders — tests "no orders yet" display
- Anchor date `"2026-06-21"` for all relative-date and segment computations
- Computed functions exported: `getSegments(c)`, `getSegmentReason(seg, c)`, `getSuggestedPromotion(c)`, `getStatus(c)`
- Segment rules: VIP (spend≥5000 OR orders≥8), Repeat (orders≥2, non-VIP), New (orders≤1, joined≤30d), Inactive (last order>90d), At Risk (orders≥2 AND last order 60-90d), Wholesale Potential (tag-driven)
- `CUSTOMER_SUMMARY` export: total, registered, guest, repeat (non-VIP), vip, inactive, totalRevenue
- 3–6 activity entries and 1–5 recentOrders per customer

**`src/app/admin/customers/page.tsx`** (full rewrite)
- `"use client"`, all sub-components at module level (ESLint static-components compliance)
- 6 KPI cards (Total, Registered, Guest, Repeat, VIP, Inactive) — clicking activates filter tab
- Search: name, phone, whatsapp, email, customer ID, order ID inside recentOrders
- 9 filter tabs: All, Registered, Guest, VIP, Repeat, New, Inactive, At Risk, Wholesale — live counts
- Sort dropdown: Most Spent (default), Most Orders, Recently Active, Oldest Inactive
- 10-column desktop table; mobile card fallback
- `TableHeader` + `TableRow` defined at module level; `TableRow` receives `onOpen` callback
- Duplicate warning: `AlertTriangle` icon on affected rows; `duplicateIds` Set built from `possibleDuplicateOf` references
- Row/button click → `openDrawer(id, tab)` — tab can be "overview" or "orders"
- Page-level override maps: `tagOverrides`, `noteOverrides`, `activityOverrides`, `addedCustomers`
- `addedCustomers` merges into display list; `nextCustomerId()` auto-increments past C-020
- Export button: mock-only — shows "Export ready" feedback for 2s
- Duplicate note banner at page bottom when duplicate pairs detected
- Sort dropdown with click-outside overlay to close

**`src/components/admin/customers/CustomerDrawer.tsx`** (new file)
- Width: `clamp(360px, 48vw, 680px)`, `z-[102]`, slide from right 280ms ease-luxury
- `initialTab` prop — starter tab passed from page (supports direct "View Orders" open)
- `key={${id}-${tab}}` pattern on page — remounts drawer when customer or initial tab changes
- Sticky header: 48px avatar (color by type/segment), name, type badge, segment badges, status badge, LTV + orders stats, WA button, close button
- Duplicate warning banner in header when `possibleDuplicateOf` matches a customer
- 7 tabs: Overview | Addresses | Orders | Insights | Tags | Notes | Activity
- **Overview**: phone (tel:), WhatsApp (wa.me), email (mailto: or "Not provided"), account info, promo history, suggested promotion callout
- **Addresses**: address cards with default badge, gold left accent, copy-to-clipboard action; empty state with guest note
- **Orders**: sorted newest first; each row has order ID, type badge, status badge, total, items count, WA-per-order link (Arabic message); empty state
- **Insights**: LTV summary chips, per-segment cards with reason text, favorites, purchase patterns, marketing readiness section, "Marketing module later" note
- **Tags**: active tag chips with remove (×), predefined inactive tags as add-buttons, custom tag input (Enter to add); note that tags ≠ segments (except Wholesale Potential)
- **Notes**: textarea + char counter (500) + Save Note; on save → updates `noteOverrides` + prepends `customer-note` activity entry; "✓ Saved" flash
- **Activity**: combined `activityExtra + customer.activity`, newest first; color-coded dots per type; relative dates; reference chips
- Props: `customer`, `isOpen`, `onClose`, `allCustomers`, `tags`, `note`, `activityExtra`, `onTagsChange`, `onNoteSave`, `initialTab?`

**`src/components/admin/customers/AddCustomerModal.tsx`** (new file)
- Centered overlay modal, `clamp(340px,92vw,580px)`, `z-[201]`
- Guest/Registered toggle (type) — email required only for registered
- Fields: Name*, Phone*, WhatsApp (defaults to phone if empty), Email, marketing opt-in checkbox, notes, collapsible address section
- Address section: governorate select (27 Egyptian governorates), city, area, street, building/floor/apt/landmark
- Validation: name + phone required; email required for registered
- On save: builds `AdminCustomer` with today's date, 0 orders/spend, `customer-created` activity entry; calls `onSave` → merges into `addedCustomers`; shows "✓ Customer Added" for 0.9s then closes
- Mock only — lost on refresh

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ 43 routes

### [2026-06-21] — Returns Workflow Patch (Inventory + Orders)

**Scope:** Focused patch only. No rebuild. No other modules touched.

**`src/lib/mock-data/admin/inventory-mock.ts`**
- `MovementType` updated: removed `"returned"` (ambiguous), added `"customer-return"` and `"supplier-return"`
- `mv-011` and `mv-018`: `type: "returned"` → `type: "customer-return"`, notes updated to reflect sealed/approved context

**`src/app/admin/inventory/page.tsx`**
- `ADJUST_REASONS` expanded: added `"Customer Return"` and `"Supplier Return"` entries; added `AdjustReason` type alias
- `MOV_CFG`: replaced `"returned"` (purple) entry with `"customer-return"` (teal #2dd4bf, RotateCcw icon) and `"supplier-return"` (orange #f97316, MinusCircle icon)
- `AdjustModal`: added `suppliers: Supplier[]` prop; added `orderRef` and `adjSupId` state fields; `handleReasonChange()` auto-sets direction (Customer Return → increase, Supplier Return → decrease); conditional fields: order ref input for Customer Return, `SupplierCombobox` for Supplier Return; `colorScheme: "dark"` + styled `<option>` tags on reason `<select>`; notes field shows advisory text for return reasons
- `handleAdjust`: resolves `movType` for all 6 reasons (`customer-return`, `supplier-return`, `damaged`, `lost`, `manual-adjust`); passes `orderRef` and `adjSupId` (as `supplierId`) into the movement record
- `AdjustModal` call site: now passes `suppliers={displaySuppliers}`
- `MOV_FILTER_OPTIONS`: replaced single `"Returned"` entry with `"Cust. Return"` (`customer-return`) and `"Sup. Return"` (`supplier-return`)

**`src/components/admin/orders/OrderDrawer.tsx`**
- `ReturnItem` type added: `{ returnedQty, returnToStock, condition: "sealed" | "opened" | "damaged" | "not-received" }`
- New state: `returnPanelOpen`, `returnItems: ReturnItem[]`, `returnSummary: { restoredCount, notRestoredCount } | null`
- `openReturnPanel()`: initializes one `ReturnItem` per order item (qty=1, returnToStock=true, condition="sealed"), sets `returnPanelOpen=true`
- `confirmReturn()`: computes restock vs. no-restock counts, calls `onStatusChange("Returned")`, updates `editableMsg` via `generateWhatsAppMessage(order, "Returned")`, sets `returnSummary`, clears panel
- "Mark Returned" button: now calls `openReturnPanel()` (label changed to "Mark Returned…"); no longer directly changes status
- Return panel JSX (inside Manage tab, when `returnPanelOpen=true`): per-item form (ordered qty display, returned qty input, condition `<select>` with `colorScheme: "dark"`, return-to-stock checkbox — disabled unless condition is "sealed"); inventory movement preview (lists which items will be restocked vs. not, with mock note about future backend integration); Confirm Return + Cancel buttons
- Condition logic: only `"sealed"` auto-sets `returnToStock=true`; changing to any other condition forces `returnToStock=false` and disables the checkbox
- Notification feedback: when `notifFeed === "Returned"` and `returnSummary` is set, shows restock count (green) + no-restock count (red) instead of generic lines
- `useEffect` for `isOpen`: now also resets `returnPanelOpen=false` on drawer close

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors · `npm run build` → ✓ 43 routes

---

### [2026-06-21] — Inventory Module: Third Rebuild — Correct Business Model (Per-Size Units + Table)

**Goal:** Complete ground-up rebuild correcting the data model and UI for the final time. Previous versions were wrong in two ways: (1) finished products were tracked in KG instead of per-size units; (2) UI used a card gallery instead of an operational table. This version is the correct model aligned with Line Coffee's real business workflow.

**Core corrections applied:**
- **Per-size stock**: `stock250g / stock500g / stock1kg` as separate unit counts (not KG, not shared)
- **Per-size thresholds**: `threshold250g / threshold500g / threshold1kg` (not one shared value)
- **Per-size low stock alerts**: LowStockPanel shows e.g. "Turkish Silk — 250g Low Stock" and "Turkish Silk — 1kg Out of Stock" as separate entries
- **Table-first UI**: Not a card gallery — operational table with 10 columns
- **121 products**: Generated from `catalogProducts.map()` via category config defaults + stock spot overrides
- **RestockDrawer for finished**: Multi-size form (250g/500g/1kg qty + per-size cost) with auto-computed total cost
- **AdjustModal**: Size selector (250g/500g/1kg) for finished products, KG for beans, units for packaging
- **Suppliers**: Full SupplierDrawer (not just WhatsApp link) — 4 sections with edit support
- **Packaging**: Full CRUD — Restock, Adjust, Edit (PackagingFormModal), Archive, Add New; `addedPackaging` array for new records
- **Add Supplier**: `addedSuppliers` array so new suppliers appear immediately in the list
- **Movement item filter**: `movItemFilter: { itemType, itemSlug, itemName } | null` state; "View Movements" from product row → switches to Movements tab filtered to that product
- **Stock Movements**: Activity log style (not dry ERP table) — icon, color-coded type, change text, before/after, supplier name, ref, notes, adminName
- **SupplierCombobox**: Premium searchable dropdown with preferred badge + phone + "Add new supplier" action
- **Order integration**: Informational note only — Delivered = deduction, others = no deduction
- **5 KPI cards**: Total Inventory Value | Finished Units | Espresso Beans KG | Low Stock | Out of Stock

**`src/lib/mock-data/admin/inventory-mock.ts`** (full rewrite)
- `FinishedProduct` type with per-size stock and per-size threshold fields
- `FINISHED_PRODUCTS` generated from `catalogProducts.map()` (all 121 products dynamically)
- `ESPRESSO_BEANS`: 14 beans (10 arabica + 4 robusta)
- `PACKAGING_ITEMS`, `SUPPLIERS`, `STOCK_MOVEMENTS` updated (archived, email?, human-readable change/before/after strings)
- `INVENTORY_SUMMARY` fields preserved for InventoryCard dashboard widget compatibility

**`src/app/admin/inventory/page.tsx`** (full rewrite)
- All sub-components defined at module level (ESLint static-components compliance)
- `addedPackaging: PackagingItem[]` and `addedSuppliers: Supplier[]` for new records
- `movementItemFilter` state for per-item movement filtering
- `// eslint-disable-next-line react-hooks/set-state-in-effect` pattern (single eslint-disable per effect) following ProductDrawer pattern

**`src/components/admin/dashboard/InventoryCard.tsx`** — No changes needed (INVENTORY_SUMMARY fields preserved)

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors/warnings · `npm run build` → ✓ all routes

---

### [2026-06-21] — Inventory Module: Second Rebuild — KG-Based Stock + Card UI

**Goal:** Completely rethink the inventory model after user clarification. The previous version tracked variants (250g/500g/1kg) as separate rows and used a table view — both wrong. Correct model: every product is ONE item, stock tracked in KG, card grid UI like the Products admin page.

**Core concept change:**
- **Finished Products** = ALL catalog products EXCEPT espresso builder beans and flavor builder ingredients. Covers: Turkish Blends, Espresso Blends, Easy Coffee, Coffee Mix, Cappuccino, Hot Chocolate, Flavor Coffee.
- **Stock in KG** — when a customer buys 500g, 0.5 KG is deducted. No variant columns.
- **Card grid** (not table) — same visual language as Products admin module.
- **Click card → PurchaseDrawer** — specify how many KG purchased, from which supplier, at what cost. Saves to stock + appends a movement.
- **Manual adjust** — small hover button on each card opens ManualAdjustModal (increase/decrease KG, reason, notes).

**`src/lib/mock-data/admin/inventory-mock.ts`** (full rewrite)
- `InventoryProduct` type: slug, nameEn, nameAr, image, category, `stockKg` (not variant units), lowStockKg, costPerKg, supplierId, lastRestocked
- 26 products across 7 categories (4 Turkish, 4 Espresso, 2 Easy Coffee, 5 Coffee Mix, 5 Cappuccino, 3 Hot Chocolate, 3 Flavor Coffee) — each is ONE item with one KG stock value
- `PackagingItem` type unchanged (bags, stickers, valves)
- `Supplier` type unchanged (3 suppliers: بن الأمداء للتجارة preferred for blends, المصري للجملة for ready products, الراشدي للتغليف for packaging)
- `StockMovement` type: KG-based deltaKg, beforeKg, afterKg, supplierId, reference, notes — no variant unit columns
- 15 stock movements covering: purchase, order-deducted, manual-adjustment, damaged, returned
- `getStatus(stockKg, lowStockKg)` helper
- `INVENTORY_SUMMARY` updated to use `stockKg` fields, no variant sums

**`src/app/admin/inventory/page.tsx`** (full rewrite)
- **Card grid** (grid-cols-2 sm:3 md:4 xl:5) — `ProductCard` sub-component: product image with hover-zoom, status badge top-left, EN name (Playfair), AR name (Cairo), stock KG + animated bar, threshold label, "Add Stock" overlay on hover
- **Category filter pills** (All + 7 categories) within the Finished Products tab
- **PurchaseDrawer** (right-side, `clamp(300px,38vw,500px)`): pre-fills product name, current stock, costPerKg, supplierId from product data; user enters KG qty; total cost auto-computed; supplier select; notes textarea; Save → updates stockOverrides + appends movement
- **ManualAdjustModal** (centered overlay): increase/decrease toggle, KG qty, new stock preview, reason select, notes; triggered by small hover button (RefreshCw icon) on each card
- **LowStockPanel** (right-side): triggered by header "Low Stock (N)" button; lists all below-threshold items with quick "Buy" shortcut per item
- 4 KPI cards: Total Products | Total Stock KG | Low Stock count | Out of Stock count
- Tabs: Finished Products | Packaging | Suppliers | Stock Movements
- `stockOverrides: Record<string, number>` pattern — local KG overrides merged at display time, no persistence (mock only)
- Live KPIs recomputed from merged displayProducts via useMemo
- MovementsTab: type filter (All/Purchases/Orders/Adjustments/Damaged/Returns), columns: Date | Product | Type | Before | Change | After | Supplier/Ref | Notes
- Informational note in PurchaseDrawer: "In future, stock auto-updates from Accounting purchase orders"

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-21] — Inventory Module: Full Ground-Up Rebuild + Flavor/Espresso Manager Cleanup

**Goal:** Rebuild the Inventory module to match Line Coffee's actual business logic (3 stock types, 5 tabs, module boundary rules). Simultaneously finish pending Flavor Manager cleanup and fix stale InventoryCard dashboard component.

**`src/lib/mock-data/admin/inventory-mock.ts`** (full rewrite)
- Complete type system redesign: `FinishedProduct`, `EspressoBeanStock`, `PackagingItem`, `Supplier`, `StockMovement`, `MovementType`, `StockStatus`
- **Key structural change**: each `FinishedProduct` is ONE row with `stock250g`, `stock500g`, `stock1kg` as separate fields (not separate rows per variant — matches actual business model)
- 14 finished products covering all categories (Turkish Blends, Espresso Blends, Easy Coffee, Coffee Mix, Cappuccino, Hot Chocolate, Flavor Coffee)
- 27 espresso bean stocks (17 arabica + 10 robusta) — mirrors Espresso Manager data exactly
- 5 packaging items (Bag 250g/500g/1kg, Sticker Roll, Valve Bag)
- 3 suppliers — بن الأمداء للتجارة (preferred, beans), الراشدي للتغليف (packaging), المصري للجملة (ready products)
- 20 stock movements across all 6 movement types (purchase, order-delivered, manual-adjustment, damaged, lost, returned-stock) — each with `beforeQty`/`afterQty`
- Exports: `getStatus()`, `productStatus()`, `productValue()`, `INVENTORY_SUMMARY` (totalValue, finishedProducts, finishedUnits, beanKg, lowStockCount, outOfStockCount)

**`src/app/admin/inventory/page.tsx`** (full rewrite, `"use client"`)
- 5 tabs: Finished Products | Espresso Beans | Packaging | Suppliers | Stock Movements
- 5 KPI cards: Total Value / Finished Products / Espresso Beans KG / Low Stock / Out of Stock — all computed live from merged state
- **Finished Products tab**: horizontal-scroll table with 8 columns — Image | Product | 250g | 500g | 1kg | Threshold | Value | Status | Actions. Each product is ONE ROW showing all 3 variant stocks.
- **Espresso Beans tab**: Arabica/Robusta filter tabs, 10-column table with Builder Eye icon (read-only), Adjust + Restock actions per row
- **Packaging tab**: simple 7-column table
- **Suppliers tab**: card grid (responsive 1–3 col), preferred badge (Star) for بن الأمداء, WhatsApp + Phone links
- **Stock Movements tab**: type filter (All/Purchases/Orders/Adjustments/Damage-Lost/Returns), 8-column table with Before/After quantities, color-coded movement type pills
- **RestockDrawer** (right-side, 300–500px): supplier selector, qty, unit cost, total cost auto-computed, order integration rules info box. On save: updates stock override + appends movement entry
- **AdjustStockModal** (centered): Increase/Decrease toggle, qty, new-stock preview, reason selector (4 options), notes. On save: updates stock + appends movement
- **LowStockPanel** (right-side): lists all below-threshold items (finished/beans/packaging) with per-item Restock shortcut
- `metaOverrides` pattern: `finishedOverrides`, `beanOverrides`, `packagingOverrides` — local state merged at display time, no persistence (mock only)
- Live KPIs recomputed from merged data via useMemo
- "Low Stock Alerts" header button: amber badge shows live count, opens panel
- All sub-components defined at module level (ESLint static-components rule)
- All ARIA: string ternaries for `aria-pressed`, `type="button"` on all buttons

**`src/components/admin/dashboard/InventoryCard.tsx`** (updated)
- Updated to use new exports: `INVENTORY_SUMMARY.finishedUnits` (total physical packages), `beanKg`, `lowStockCount`, `totalValue`
- Removed stale references to deleted `INVENTORY_ITEMS` and `RESTOCK_LOG` exports

**`src/app/admin/flavor-manager/page.tsx`** (minor fix)
- Removed unused `Coffee` import from lucide-react (was causing lint warning)

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-20] — Espresso Manager: Full Bean Catalog Sync + Card Visual Redesign

**`src/app/admin/espresso-manager/page.tsx`** (updated)
- Bean catalog expanded from 15 → 27 beans (17 arabica + 10 robusta) to match the website's `espressoBeans.ts` exactly
- All slugs, names (EN/AR), prices, and metric values now mirror the live website data
- Fixed bean type errors: Uganda 18 and Indonesia XL corrected to **robusta** (were incorrectly arabica)
- `CharKey` updated from 5 metrics (body/acidity/sweetness/crema/strength) → 6 metrics matching website: `body | crema | acidity | chocolate | sweetness | strength`
- Metric scale changed from 1–10 to 0–5 (step 0.1), matching the website's data format
- Bean card design completely replaced: now uses website-style dark gradient cards (`from-[#1B140F] via-[#120D09] to-[#0B0806]`), serif name, taste hint paragraph, metric bars, chevron circle — same visual language as the Make Your Espresso builder
- Grid changed to `minmax(220px, 1fr)` to accommodate taller cards with metric bars
- Blend Simulator result bars and slider display updated to /5 scale

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors

---

### [2026-06-20] — Espresso Manager + Flavor Manager: Ground-Up Rebuild as Builder-Management Systems

**Goal:** Completely replace both admin modules. They are NOT product/inventory screens — they are builder-management systems for the Make Your Espresso and Make Your Flavor experiences.

**`src/app/admin/espresso-manager/page.tsx`** (full rewrite)
- Concept changed: manages BEANS in the builder, NOT product blends
- `Bean` type: slug, nameEn, nameAr, origin, beanType (arabica/robusta), costPerKg, stock, lowStockAlert, visible, archived, descEn, descAr, characteristics (body/acidity/sweetness/crema/strength 1–10)
- 15 mock beans: Brazil Arabica, Santos Fine Cup, Ethiopia Lekempti, Ethiopia Natural, Colombia Supremo, Colombia 18, Yemen, Guatemala, Costa Rica, India Washed, Nicaragua, Uganda 18, Indonesia XL, India Robusta AA, Vietnam Robusta
- KPI cards: Total Beans / Arabica Beans / Robusta Beans / Low Stock
- Filter tabs: All / Arabica / Robusta / Hidden + search
- Bean card grid: color-coded by beanType (gold=arabica, green=robusta), LOW/HIDDEN badges, stock, cost/kg
- `BeanDrawer` (7 tabs: General, Description, Characteristics, Pricing, Stock, Visibility, Media)
  - Characteristics tab: range sliders 1–10 for body/acidity/sweetness/crema/strength
  - Visibility tab: Show/Hide toggle + Archive section
  - metaOverrides pattern for live state updates
- `BlendSimulator`: select up to 4 beans + manual percentages, shows weighted characteristic bar chart when total = 100%
- `metaOverrides: Record<string, Partial<Bean>>` — local state override merging

**`src/app/admin/flavor-manager/page.tsx`** (full rewrite)
- Concept changed: manages FLAVORS in the Make Your Flavor builder
- `Base` type: slug, nameEn, nameAr, descEn, descAr, visible (4 bases: Turkish, Coffee Mix, Cappuccino, Hot Chocolate)
- `Flavor` type: slug, nameEn, nameAr, category, addOnPriceKg, visible, descEn, descAr
- 30 flavors across 5 categories: Chocolate (5), Nuts (4), Fruits (8), Desserts (7), Coffee & Special (6)
- KPI cards: Total Flavors / Total Categories / Active Bases / Hidden Flavors
- Bases section: 4 cards with Show/Hide toggle — baseOverrides for local state
- Flavor grid: category color-coded bands, hidden indicator, addOnPrice, filter by category + search
- `FlavorDrawer` (6 tabs: General, Category, Description, Pricing, Visibility, Media)
- Builder Rules section: Max Flavors stepper (1–10), Show Recommended toggle, Require Base toggle
- `flavorOverrides: Record<string, Partial<Flavor>>` — live state override merging

**Also in this session:**
- `src/app/(public)/checkout/page.tsx`: Removed Delivery Method section entirely; removed `delivery` from FormData type; updated deliveryFee calculation to `total >= 500 ? 0 : 50`
- `src/app/admin/orders/page.tsx`: Payment column now shows method name (Cash/InstaPay/E-Wallet) as primary badge (colored by paymentStatus), status text as secondary

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors

---

### [2026-06-20] — Orders Module Cleanup + Checkout Redesign

**Goal:** Polish the admin orders table and drawer, and rebuild the checkout page with premium dropdowns, all Egyptian governorates, and payment method selection.

**`src/lib/mock-data/admin/orders-mock.ts`**
- `PaymentMethod` type changed from `"cash-on-delivery" | "credit-card" | "instapay" | "vodafone-cash"` → `"cash" | "instapay" | "e-wallet"`
- All 17 orders updated: `cash-on-delivery` → `cash`, `credit-card` → `instapay`, `vodafone-cash` → `e-wallet`

**`src/app/admin/orders/page.tsx`** (full rewrite)
- Removed "Type" column from table (9-col grid, was 10)
- Removed `generateWhatsAppMessage`, `MessageCircle` imports — no longer used
- Removed `ORDER_TYPE_LABEL/COLOR/BG` constants
- Actions column: WhatsApp anchor removed — only "Manage →" button remains
- Mobile card: type badge removed from header row
- `TableHeader` and `TableRow` defined as module-level components (ESLint static-components rule)

**`src/components/admin/orders/OrderDrawer.tsx`** (full rewrite)
- `PAYMENT_LABEL` map for the 3 new payment types
- Smart status flow: `FLOW = ["New","Preparing","Shipped","Delivered"]`; `nextStatus` drives single primary action button; `canCancel`/`canReturn`/`isTerminal` flags control destructive actions
- Flow bar: 4 steps with connecting lines (position:absolute half-width connectors), colored dots (green=past, gold=current, dim=future)
- Info tab delivery: compact 3-line render (addrLine, cityLine, deliveryLine) instead of 8 rows
- Manage tab: flow bar + primary "Move to: X →" button + destructive Cancel/Return buttons only when applicable
- WhatsApp tab: editable `<textarea>` (dir=rtl) initialized from `generateWhatsAppMessage()`; `waUrl` uses `encodeURIComponent(editableMsg)`; "Copy Message" button removed; only "Send WhatsApp" anchor
- Removed: Inventory Impact section, Coming Soon section
- `editableMsg` state resets on both `order?.id` and `order?.status` changes

**`src/app/(public)/checkout/page.tsx`** (full rewrite)
- `FormData` type: added `whatsapp`, `paymentMethod: "cash" | "instapay" | "e-wallet"`; renamed `city` → `area`
- `GOVS` array: all 27 Egyptian governorates, each with detailed areas list (Cairo 18 areas, Giza 10, Alexandria 13, others 3–5)
- `CustomSelect` component: dark premium dropdown with click-outside close (`useRef + useEffect + mousedown listener`), scrollable list (max-height 240px), gold accent on selected item, animated chevron, disabled state for area when no governorate selected
- Customer section: Name / Phone + WhatsApp (grid 2-col) / Email (optional)
- Address section: Governorate dropdown → Area dropdown (resets on governorate change) → Street → Building + Floor/Apt
- Delivery section: unchanged (Standard / Express)
- Payment section: 3 option cards (Cash / InstaPay / E-Wallet) with icon + label + description + radio indicator
- Summary sidebar: payment-method-aware footer note (no hardcoded "cash on delivery" text)
- Validation: name, phone, whatsapp, governorate, area, street all required; email optional

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors

---

### [2026-06-20] — Products Module: Card-First Redesign + Right-Side Drawer

**Goal:** Replace the table-first Products admin page with a visual card grid and a right-side product drawer (no more navigating to `/admin/products/[slug]`).

**`src/lib/mock-data/admin/products-admin-mock.ts`** (new)
- `ProductStatus` type + `AdminProductMeta` interface (status, hidden, featured, bestSeller, stockQty, lowStockThreshold, sku, metaTitle, metaDescription, gallery)
- `SKU_PREFIX` map per category for auto-SKU generation
- `OVERRIDES` record — named overrides for 12 specific products (best sellers, low stock, out of stock, featured)
- `getAdminMeta(slug, category)` — merges DEFAULT with OVERRIDES, auto-generates SKU if not overridden
- `AdminProduct` type = `(typeof catalogProducts)[number] & AdminProductMeta`
- `adminProducts` array — all 130+ catalog products merged with admin meta
- `PRODUCT_ADMIN_SUMMARY` — total/active/outOfStock/bestSellers counts

**`src/components/admin/products/ProductDrawer.tsx`** (new) — `"use client"`, right-side panel, 6 tabs
- Single `DrawerForm` state object (all tab fields in one) + `initForm(product)` factory — avoids multiple `setState` calls in effect (lint rule compliance)
- `useEffect` with single `setForm(initForm(product))` call (+ eslint-disable comment) on `product?.slug` dep
- Tabs: General (EN/AR name + description) | Media (main image + gallery placeholder) | Pricing (250g/500g/1kg + cost/margin summary) | Inventory (stock + threshold + live status indicator) | Visibility (4 toggles: Active/Hidden/Featured/Best Seller, each `aria-pressed` string ternary) | SEO (slug, meta title EN/AR, meta desc EN/AR)
- Drawer slides from right: `transform: translateX(0/100%)`, 320ms ease-luxury transition
- Overlay: `opacity` fade with backdrop-filter blur
- Footer: Cancel + Save Changes; "✓ Saved" flash 2.2s after save
- `onSave(slug, Partial<AdminProductMeta>)` callback — page merges override into its state map

**`src/app/admin/products/page.tsx`** (full rewrite)
- `"use client"` — 5 states: view (cards/table), search, category, drawerSlug, metaOverrides
- `metaOverrides: Record<string, Partial<AdminProductMeta>>` — holds drawer saves; merged into display list via `useMemo`
- KPI row: Total Products / Active / Out of Stock / Best Sellers (colored icon chips)
- Toolbar: search input + Cards|Table view switcher (LayoutGrid / List icons)
- Category filter tabs with per-category counts (All + 7 categories)
- **Cards view** (default): `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5`; `AdminProductCard` sub-component shows image (hover zoom), status badge (top-left), BEST/FEAT/HIDDEN badges (top-right), EN name, AR name, price chips (250g/500g/1kg), stock+SKU footer
- **Table view**: 10-column grid — Product (image+name) / Category / 250g / 500g / 1kg / Cost / Margin% / Stock / Status / arrow; row click opens drawer; mobile collapses to simple row
- Clicking any card or table row sets `drawerSlug` → opens `ProductDrawer`
- `handleSave` merges returned meta into `metaOverrides` → cards/table reflect updated badges live
- Removed all `Link href="/admin/products/[slug]"` — drawer replaces the detail page flow

**Untouched:** All other admin modules, all public routes, dashboard, orders, inventory, marketing, analytics, CMS, espresso/flavor manager, sidebar, topbar, auth shell, public website.

**Validation:** `npx tsc --noEmit` → 0 errors · `npm run lint` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-20] — Orders Module: Full Rebuild — Command Center + 3-Tab Drawer

**Goal:** Complete ground-up rebuild. Replace table-only list with a 10-column operational table + 6 KPI cards + a 3-tab right-side `OrderDrawer`. Admin can manage status, view full order detail, send WhatsApp, and leave notes without leaving the page.

**`src/lib/mock-data/admin/orders-mock.ts`** (full rewrite)
- Added `PaymentMethod`, `PaymentStatus`, `CustomerType` types
- `AdminOrder` extended: `paymentMethod`, `paymentStatus`, `customer.type`, `customer.since`, `address.landmark`, `EspressoOrderData.totalWeight`, `FlavorOrderData.totalWeight`
- 17 mock orders across all 7 statuses — includes 1 espresso custom (LC-1089) and 1 flavor custom (LC-1090)
- Realistic payment assignments: COD→Pending for undelivered, Paid for card/delivered, Refunded for returns
- `buildTimeline(order, status)` returns typed `TimelineStep[]` with done/current/terminal flags
- `generateWhatsAppMessage(order, status)` returns Arabic message per status
- `ORDER_SUMMARY` export for KPI baseline

**`src/components/admin/orders/OrderDrawer.tsx`** (full rewrite, `"use client"`)
- 3-tab design: **Info** | **Manage** | **WhatsApp**
- Sticky header: order # + `OrderStatusBadge` + type badge + date/delivery + close button
- Tab: Info — Customer (name/email/phone/type/previous orders/since) → Delivery (method/full address/fee) → Order Items (avatar + name + detail + qty × price = line total) → Custom Espresso (blend name/weight/arabica-robusta split/per-bean ratio bars) or Custom Flavor (base/weight/flavor chips) → Financial (subtotal/discount/delivery/total + payment method + status badge) → Notes (customer read-only + admin textarea + Save)
- Tab: Manage — 3×2 status action grid (aria-pressed, color-coded, current highlighted) → Notification feedback panel (3s after status change: "Customer notification created", "Customer order page updated", "WhatsApp message generated") → Status Timeline (connected dot list with done/current/terminal states) → Inventory Impact info table (6 rows, current row highlighted)
- Tab: WhatsApp — Arabic message preview (rtl, direction: rtl) → Send WhatsApp (`wa.me` link, works) → Copy Message → Coming Soon box (Tracking Page / Copy Tracking Link / Print Invoice — disabled, not built yet)
- Props: `{ order, isOpen, onClose, onStatusChange }`

**`src/app/admin/orders/page.tsx`** (full rewrite, `"use client"`)
- `TableHeader` and `TableRow` defined at module level (ESLint `react-hooks/static-components` compliance)
- `TableRow` receives `onOpen` prop instead of closing over `setOpenOrderId`
- State: `activeStatus`, `search`, `openOrderId`, `statusOverrides: Record<string, OrderStatus>`
- `allOrders` = ADMIN_ORDERS with overrides merged
- `searchFiltered` = search-only filter (used for KPI counts + tab counts)
- `filtered` = searchFiltered + status tab (used for table)
- **6 KPI cards** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`): Total / New / Preparing / Shipped / Delivered / Issues; click-to-filter; reflect search but not status tab
- Table: 10 columns — Order # | Customer | Phone | Type | Items | Total | Payment | Status | Date | Actions
- Actions column: "Manage →" button (opens drawer) + green WhatsApp icon anchor (`wa.me` link, no drawer needed)
- Type column: "Standard" (muted) / "Espresso" (blue badge) / "Flavor Mix" (purple badge)
- Payment column: Paid (green) / Pending (amber) / Refunded (grey) — color-coded pill
- No `Link href="/admin/orders/[id]"` anywhere

**Removed:** Previous orders/[id] navigation from list, Copy Tracking Link button, Open Tracking Page button, Print Invoice button (all disabled/deferred)

**Not touched:** Dashboard, Products, Inventory, Customers, Marketing, Accounting, Analytics, CMS, Espresso Manager, Flavor Manager, Sidebar, Topbar, any public website files, `/admin/orders/[id]` route file (still exists for dashboard LatestOrders deep links).

**Validation:** `tsc --noEmit` → 0 errors · `npm run lint` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-20] — Orders Module: Drawer + 5 KPI Cards + Custom Order Support

**Goal:** Remove `/admin/orders/[id]` navigation from the orders list. Replace "View" link with a right-side OrderDrawer. Add 5 summary KPI cards. Support custom espresso/flavor order display. All mock-only — no Supabase, no APIs.

**`src/lib/mock-data/admin/orders-mock.ts`** (full rewrite)
- Added `OrderType = "standard" | "make-your-espresso" | "make-your-flavor"`
- Added `EspressoOrderData` type: blendName, arabicaPct, robustaPct, beans array (origin, pct, beanType)
- Added `FlavorOrderData` type: base, baseName, flavors array, weight
- Extended `AdminOrder`: `orderType`, `espressoData?`, `flavorData?`, `adminNotes?`, `customer.since?`, `customer.previousOrders?`, `address.landmark?`
- Expanded to 17 orders (added LC-1089 espresso custom order, LC-1090 flavor custom order)
- Added `buildTimeline(order, status)` — computes timeline steps with fake relative timestamps based on current status
- Added `generateWhatsAppMessage(order, status)` — bilingual Arabic WhatsApp message per status

**`src/components/admin/orders/OrderDrawer.tsx`** (new, `"use client"`)
- Right-side drawer: `clamp(340px, 52vw, 640px)`, `z-[101]`, transform-based open/close animation
- Sticky header: order # (gold mono) + `OrderStatusBadge` + type badge + date + close button
- Sticky action bar: 6 status buttons (Confirm / Preparing / Shipped / Delivered / Cancel / Return) with `aria-pressed` string ternaries; active button styled with matching color
- Scrollable body sections (9 sections):
  1. Order Items — item name, detail, qty × price = line total
  2. Financial Summary — subtotal, delivery, discount (with promo code), bold total
  3. Customer — name, email, phone, since, previous orders
  4. Delivery — method, full address breakdown
  5. Custom Espresso (conditional) — blend name, arabica/robusta split, per-bean origin with ratio bar + type badge
  6. Custom Flavor (conditional) — base, weight, flavor chips
  7. Notes — customer note (read-only amber card), admin internal notes (editable textarea + Save)
  8. Order Timeline — `buildTimeline()` rendered as connected dot list with times
  9. Inventory Impact — info table per status, current status highlighted with chevron
- WhatsApp section: message preview, Send WhatsApp (anchor), Copy Message, Copy Tracking Link, Open Tracking Page, Print Invoice buttons
- Website Notifications future note panel
- Props: `{ order, isOpen, onClose, onStatusChange }`

**`src/app/admin/orders/page.tsx`** (full rewrite, `"use client"`)
- State: `activeStatus`, `search`, `openOrderId`, `statusOverrides: Record<string, OrderStatus>`
- `allOrders` = ADMIN_ORDERS with statusOverrides merged (allows status changes from drawer to reflect in table)
- `searchFiltered` = allOrders filtered by search only (used for KPI counts + tab counts)
- `filtered` = searchFiltered + status tab filter (used for table)
- **5 KPI summary cards** (grid-cols-2 sm:grid-cols-3 lg:grid-cols-5):
  - Total Orders (gold, Package icon), New (amber, Bell), Preparing (blue, Clock), Delivered (green, CheckCircle2), Issues/Cancelled+Returned (red, AlertTriangle)
  - KPI counts update with search filter but not status tab — shows global breakdown for current search
  - Clicking a KPI card sets the status tab filter
  - Active card highlighted with colored border + scale(1.01)
- Table: replaced `Link href="/admin/orders/[id]"` with `onClick={() => setOpenOrderId(order.id)}` (both desktop row + mobile card)
- Custom orders: `Sparkles` icon next to order # in table; items column shows "Custom Espresso" / "Custom Flavor" in matching color
- `OrderDrawer` rendered outside main div (sibling), receives `openOrder` from merged allOrders
- All ARIA: `aria-pressed` as string ternary, `type="button"` on all buttons

**Validation:** `tsc --noEmit` → 0 errors · `npm run lint` → 0 warnings · `npm run build` → ✓ 42 routes

**Not touched:** Dashboard, Products, Inventory, Customers, Marketing, Accounting, Analytics, CMS, Espresso Manager, Flavor Manager, Sidebar, Topbar, any public website files.

---

### [2026-06-20] — Dashboard V2: Interactive KPIs, Best Sellers, Visual Refresh

**Dashboard improvements:**

**`src/lib/mock-data/admin/dashboard-mock.ts`** (extended)
- Added `KPIPeriod`, `KPIPeriodValue`, `KPIToggleStat` types + `KPI_TOGGLE_STATS` array (4 cards: Sales / Orders / Customers / Net Profit, each with today/week/month/all values + trends)
- Added `VISITORS_DATA` (total / guests / registered split)
- Added `LowStockItem` type + `LOW_STOCK_ITEMS` array (3 real item names + remaining qty)
- Added `BestSellerProduct` type + `BEST_SELLERS_MONTH` array (5 products with images + units sold + revenue)

**`src/components/admin/dashboard/KPICard.tsx`** (full rewrite → `"use client"`)
- Removed `icon: LucideIcon` prop (no longer needed)
- Now takes `stat: KPIToggleStat`; local `useState<KPIPeriod>("today")` drives the display
- Period toggle: 4 compact pill buttons `1D | 1W | 1M | ∞` in the card header
- Value + trend text update instantly on period change

**New: `src/components/admin/dashboard/InventoryCard.tsx`** — Server Component. Static card: current inventory value (67,200 EGP) with Boxes icon.

**New: `src/components/admin/dashboard/LowStockCard.tsx`** — Server Component. Shows 3 actual low-stock items (name + remaining qty as red badge). "Manage →" link to `/admin/inventory`.

**New: `src/components/admin/dashboard/VisitorsCard.tsx`** — Server Component. Shows total visitors today (142) + split bar: guests (gold) vs registered members (blue) with counts.

**New: `src/components/admin/dashboard/BestSellersMonth.tsx`** — Server Component. Full-width table: rank (gold/silver/bronze), 40×40 product thumbnail, name, category, units sold badge, revenue. Links to `/admin/products`.

**`src/app/admin/dashboard/page.tsx`** (updated layout)
- Replaced `DASHBOARD_KPIS` + icon array with `KPI_TOGGLE_STATS` → `KPICard` (no icon props)
- Row 2: 4-col grid — `[InventoryCard] [LowStockCard × 2] [VisitorsCard]`
- Removed `ActivityFeed` entirely
- Added `BestSellersMonth` as last full-width row

**`src/components/admin/layout/AdminSidebar.tsx`** (logo refresh)
- Logo area height: 60px → 72px (expanded) / 60px (collapsed)
- Logo image: 28px → 42px (expanded) / 32px (collapsed), transitions smoothly
- "Line Coffee" text: 13px → 15px Playfair
- Subtitle changed from "Admin Dashboard" (muted) → "ADMIN" (gold, uppercase, tracking-widest)

**`src/components/admin/layout/AdminTopBar.tsx`** (visual refresh)
- Removed `borderBottom` — topbar now merges with content area (no hard line)
- Background: `#100e0b` → `var(--coffee-black)` — matches page bg exactly
- Page title: `text-sm` → `text-base`
- Fixed `aria-expanded={boolean}` → `aria-expanded={profileOpen ? "true" : "false"}` (ESLint string-literal rule)

**Bug fixes:**
- `src/components/admin/dashboard/QuickActions.tsx` — added `"use client"` (had `onMouseEnter`/`onMouseLeave` event handlers without it)
- `src/components/admin/layout/AdminShell.tsx` — auth guard now auto-seeds mock user if none exists (no longer redirects to login on direct URL access); removed unused `useRouter` import
- `src/app/admin/page.tsx` — new file: redirects `/admin` → `/admin/dashboard`

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings

---

### [2026-06-20] — Main Dashboard: Information Priority Cleanup

**Goal:** Keep all existing components, fix readability and information usefulness — no new sections, no layout changes, no backend.

**`src/lib/mock-data/admin/dashboard-mock.ts`**
- Added `PREPARING_ORDERS_DATA` constant: `{ total: 12, overdue: 3, overdueIds: ["LC-1082", "LC-1080", "LC-1078"] }`

**`src/components/admin/dashboard/InventoryCard.tsx`** (rewritten)
- Now imports real data from `inventory-mock.ts` instead of showing hardcoded 67,200
- `totalValue` computed from `INVENTORY_SUMMARY.totalValue`
- Shows breakdown line: `X finished units · Y kg beans · Z low stock`
- `finishedUnits` = sum of `unit === "units"` stock; `beanKg` = sum of `unit === "kg"` stock
- Added "Manage →" link to `/admin/inventory`

**`src/components/admin/dashboard/PreparingOrdersCard.tsx`** (new)
- Replaces `VisitorsCard` in the 4-col secondary row
- Shows: total preparing orders (12) + overdue count (3) with amber AlertTriangle
- Overdue order IDs shown in monospace gold: `LC-1082 · LC-1080 · LC-1078`
- "View orders →" link to `/admin/orders`

**`src/components/admin/dashboard/KPICard.tsx`** (Orders enrichment replaced)
- Removed `OrdersDonut` (conic-gradient ring — too small to read)
- Removed `buildDonutStops()` helper (no longer needed)
- Added `OrdersStatusList` — 2×2 grid: colored dot + bold count + label for each status
- Each status entry readable at glance: "2 New · 1 Preparing · 1 Shipped · 2 Delivered"

**`src/components/admin/dashboard/LatestOrders.tsx`** (View column added)
- Added 6th column (empty header) with a `ChevronRight` link per row → `/admin/orders/[id]`
- Link is `opacity-0 group-hover:opacity-100` — appears on hover, doesn't add visual clutter when idle
- Footer hint text: "hover a row to view details"
- Changed `px-5` → `px-4` on cells to accommodate the extra column

**`src/app/admin/dashboard/page.tsx`**
- Swapped `VisitorsCard` import/usage → `PreparingOrdersCard`

**Untouched:** WelcomeHero, SalesChart, AlertsCenter, QuickActions, BestSellersMonth, LatestReviewCard, LowStockCard, all other admin modules, sidebar, topbar, public website.

**Validation:** `npm run lint` → 0 errors · `npx tsc --noEmit` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-20] — Admin Dashboard: All 10 Module Pages Built

**All admin module pages replaced from `AdminPlaceholder` to fully functional UIs.**

**Phase 3 — Inventory**

**`src/lib/mock-data/admin/inventory-mock.ts`** (already existed)
**`src/app/admin/inventory/page.tsx`** (replaced placeholder)
- 4 summary pills (Total SKUs, Stock Value, Low Stock, Out of Stock)
- Status filter tabs (All / In Stock / Low Stock / Out of Stock)
- Stock table: image + name + category + qty with ±1 Adjust stepper (inline, useState) + status badge + threshold + cost
- Restock Log: 5 recent entries at bottom

**Phase 4 — Customers**

**`src/lib/mock-data/admin/customers-mock.ts`** (new)
- `AdminCustomer` interface, `CustomerTier` type, 18 Egyptian customers with tier / totalOrders / totalSpent
- `CUSTOMER_SUMMARY` stats + `getTier()` helper

**`src/app/admin/customers\page.tsx`** (replaced placeholder)
- Summary pills (Total / VIP / Regular / New + lifetime value)
- Search + tier filter
- Table sorted by spend: tier-colored avatar initials + name/email + location + tier badge + orders + spent + last order
- Click row → expands inline contact row (email link + phone link + join date)

**Phase 5 — Marketing**

**`src/lib/mock-data/admin/marketing-mock.ts`** (new)
- `PromoCode`, `PromoStatus`, `PromoType` types; 6 promo codes (Active/Expired/Scheduled)
- `PROMO_SUMMARY` + `ANNOUNCEMENT_MESSAGES` (3 bilingual bar messages)

**`src/app/admin/marketing/page.tsx`** (replaced placeholder)
- Promo codes table: code + discount + min order + usage bar + expiry + status badge + Copy button
- "New Code" create form (mock, no backend)
- Announcement Bar section: toggle switch per message with EN + AR preview

**Phase 6 — Accounting**

**`src/lib/mock-data/admin/accounting-mock.ts`** (new)
- `Transaction` interface + `TRANSACTIONS` array (15 entries: Sales, Expenses, Purchases, Refunds)
- `ACCOUNTING_SUMMARY` (revenue / expenses / netProfit / refunds)
- `MONTHLY_CHART` (6-month data for bar chart)

**`src/app/admin/accounting/page.tsx`** (replaced placeholder)
- Summary pills: Revenue / Expenses / Net Profit / Margin %
- 6-month revenue vs expenses bar chart (CSS-only, no Recharts)
- Quick "Add Expense" form (mock)
- Transaction log with type filter + type-colored badge

**Phase 7 — Analytics**

**`src/lib/mock-data/admin/analytics-mock.ts`** (new)
- `TRAFFIC_DATA` (4 KPIs with trends), `TOP_PAGES`, `ACQUISITION_DATA`, `DEVICE_SPLIT`, `WEEKLY_SESSIONS`, `TOP_PRODUCTS_TRAFFIC`

**`src/app/admin/analytics/page.tsx`** (replaced placeholder)
- 4 KPI pills with TrendingUp/Down indicators
- Weekly sessions bar chart + Acquisition channels bar chart + Device split — all CSS-only
- Top Pages table + Top Products by Traffic table

**Phase 8 — CMS**

**`src/lib/mock-data/admin/cms-mock.ts`** (new)
- `AdminReview` type + 7 reviews with status; `BlogAdminEntry` type + 6 existing blog posts; `CMS_SUMMARY`

**`src/app/admin/cms/page.tsx`** (replaced placeholder)
- Summary pills (Total Reviews / Pending / Avg Rating / Blog Posts)
- Reviews section: status filter + approve/reject buttons on Pending reviews (useState)
- Blog Posts list: EN + AR title + category + date + status badge

**Phase 9 — Espresso Manager**

**`src/app/admin/espresso-manager/page.tsx`** (replaced placeholder)
- Reads from `catalogProducts` — 4 espresso blends (Heavy Crema, Aroma Body, Headshot, Black Label)
- Left panel: blend selector with profile badge (Balanced / Intense / Smooth / Bright)
- Right panel: range slider per bean origin — total must equal 100% to enable Save; Reset clears edits
- Fixed: `bean.ratio` → `bean.pct` (correct `BlendComponent` field name)

**Phase 10 — Flavor Manager**

**`src/app/admin/flavor-manager/page.tsx`** (replaced placeholder)
- Reads from `flavorItems` and `flavorBases` in the Make Your Flavor feature data
- Summary pills (Total Flavors / Categories / Bases / Avg Add-On)
- Bases display grid (4 cards)
- Category filter tabs + flavor table: name (EN+AR) + category + hint + editable add-on price per kg + Save button

**Validation:** `npm run lint` → 0 errors · `npx tsc --noEmit` → 0 errors · `npm run build` → ✓ 42 routes

---

### [2026-06-20] — Dashboard V3: Sidebar + Topbar + KPI Enrichments + Review Card

**`src/lib/mock-data/admin/dashboard-mock.ts`**
- `KPIToggleStat` interface: added optional `sparkline`, `breakdown`, `customerSplit` fields
- Sales: `sparkline` 7-day array; Orders: `breakdown` donut data; Customers: `customerSplit` new/returning split
- Added `TOP_REVIEW` constant for LatestReviewCard

**`src/components/admin/dashboard/KPICard.tsx`** — Sales sparkline (SVG polyline), Orders donut ring (conic-gradient), Customers split bar; enrichments rendered at card bottom

**`src/components/admin/dashboard/LatestReviewCard.tsx`** (new) — Latest 5-star review: stars, italic quote, gold avatar, author/product/time, avg rating summary

**`src/components/admin/layout/AdminSidebar.tsx`** — Logo 50px bold, "Admin Panel" subtitle; bottom promotional card with roastery.png + "Your Daily Ritual" + "View Store →"

**`src/components/admin/layout/AdminTopBar.tsx`** — Notification bell dropdown: 5 notifications with type-colored icons, unread badge, "Mark all as read"; `type="button"` added to all buttons

**`src/app/admin/dashboard/page.tsx`** — Last row: BestSellers (2/3) + LatestReviewCard (1/3) grid

**Validation:** `npm run lint` → 0 errors, `npx tsc --noEmit` → 0 errors, `npm run build` → ✓ 40 routes

---

### [2026-06-20] — Phase 2: Admin Dashboard Full UI

**New files:**
- `src/components/admin/dashboard/WelcomeHero.tsx` — `"use client"`. Greeting hero: time-aware greeting (morning/afternoon/evening), user first name from `useAuth()`, 3 inline stat pills (new orders, low stock, pending reviews from mock data), today's date on the right (desktop only). Dark gradient card, gold left accent.
- `src/components/admin/dashboard/KPICard.tsx` — Server Component. Props: `stat: KPIStat`, `icon: LucideIcon`. Shows icon circle + label + large formatted value + unit + trend with TrendingUp/TrendingDown icons + trend label. `alert: true` renders value and icon in red instead of gold.
- `src/components/admin/dashboard/SalesChart.tsx` — `"use client"`. Recharts `AreaChart` with gold gradient fill. Week/Month/Year period toggle (3 buttons). Custom dark tooltip. Subtle grid, hidden Y-axis, X-axis with period labels. `ResponsiveContainer` fills available height.
- `src/components/admin/dashboard/LatestOrders.tsx` — Server Component. Table: Order # (gold mono) | Customer | Total | Status badge | Time. 6 mock orders from `LATEST_ORDERS`. Status badge colors: New=amber, Preparing=blue, Shipped=purple, Delivered=green, Cancelled=red, Returned=gray. "View all →" links to `/admin/orders`.
- `src/components/admin/dashboard/AlertsCenter.tsx` — Server Component. 4 alert rows: colored left bar + label + count badge + detail text. Total count badge in header. Each row links to relevant module. Hover reveals chevron arrow.
- `src/components/admin/dashboard/QuickActions.tsx` — Server Component. 2×2 grid of action cards: Add Product / Add Expense / Buy Inventory / Create Promo Code. Icon resolved from `ICON_MAP` via `iconName: string` (avoids server→client prop crossing). Hover lift + border intensify effect.
- `src/components/admin/dashboard/ActivityFeed.tsx` — Server Component. Timeline of 7 entries with color-coded dots (order=gold, inventory=blue, marketing=green, customer=cream, alert=red) and connecting vertical lines.

**`src/app/admin/dashboard/page.tsx`** (full rewrite)
- Replaced Phase 1 skeleton placeholder with real layout composing all 7 components
- Layout: WelcomeHero → 2×4 KPI grid → SalesChart (2/3) + QuickActions (1/3) → LatestOrders (1/2) + AlertsCenter (1/2) → ActivityFeed full-width
- KPI icons array aligned to DASHBOARD_KPIS order: TrendingUp, ShoppingBag, Users, Wallet, Boxes, AlertTriangle, Eye, BarChart2

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ 40 routes

---

### [2026-06-20] — Phase 1: Admin Dashboard Shell + Navigation

**New files:**
- `src/components/admin/layout/AdminShell.tsx` — Fixed overlay (`position: fixed; inset: 0; z-[9999]`) that sits on top of the public layout without touching any existing routes. Manages `sidebarCollapsed` / `mobileSidebarOpen` state. Contains a mock auth guard (`useEffect` checks `line-user-v1` localStorage; redirects to `/auth/login` if missing). Renders AdminSidebar + AdminTopBar + scrollable main content.
- `src/components/admin/layout/AdminSidebar.tsx` — Desktop collapsible sidebar (240px expanded → 64px icon-only, CSS transition). Mobile slide-in overlay (translateX, z-20, 240px). All 11 module nav items with Lucide icons. Active detection via `usePathname`. Badge on Orders (mock 4), alert dot on Inventory. Logo + "Line Coffee / Admin Dashboard" header. Footer version tag.
- `src/components/admin/layout/AdminTopBar.tsx` — 60px topbar. Hamburger toggles desktop collapse or mobile overlay. Page title derived from pathname map. Bell with red dot badge. Profile avatar dropdown: user info, Administrator badge, Workspace Switcher (Admin Dashboard active ✓ / Media Studio SOON / Website Preview ↗), My Account, Sign Out. Click-outside closes dropdown.
- `src/components/admin/shared/AdminPlaceholder.tsx` — Shared placeholder component used by 10 module pages. Shows icon circle, phase badge, title, description, and feature preview list.
- `src/app/admin/layout.tsx` — Server component. Exports metadata. Renders `<AdminShell>`.
- `src/app/admin/dashboard/page.tsx` — Rich placeholder: greeting hero, 8 KPI skeleton cards, sales chart placeholder with Week/Month/Year tabs, quick actions grid, latest orders skeleton, alerts center, activity feed skeleton.
- `src/app/admin/orders/page.tsx` through `src/app/admin/cms/page.tsx` — 10 placeholder pages using AdminPlaceholder, each showing the module's planned features.

**`src/app/globals.css`**
- Added admin CSS section after `@media (prefers-reduced-motion)` block: `.admin-nav-item`, `.admin-nav-item:hover`, `.admin-nav-item.admin-nav-active`, `.admin-kpi-card`, `.admin-kpi-card::before`, `.admin-surface`, `.admin-topbar-divider`, `.admin-scrollbar` (webkit scrollbar styling).

**Architecture note:** Admin shell uses `fixed inset-0 z-[9999]` — covers the public PublicHeader/PublicFooter visually without modifying root layout or moving any existing files. No route conflicts because admin routes live under `/admin/*`.

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ 37 routes (11 new admin routes confirmed)

---

### [2026-06-19] — Final Website Closure: Signup Auto-Login, Profile Real User, Account Route Guard

**`src/app/(public)/auth/signup/page.tsx`**
- Imported `useAuth`, called `signIn(name, email)` inside the `setTimeout` success handler — user is now immediately authenticated after signup, same as login.
- Success screen CTA changed from "Sign in → /auth/login" to "Go to Home → /" since user is already logged in.

**`src/app/(public)/account/profile/page.tsx`**
- Imported `useAuth`. Replaced hardcoded `INITIAL` constant with inline initial state derived from `useAuth().user`: `firstName`/`lastName` split from `user.name`, `email` from `user.email`. Falls back to "Mohamed"/"Sayed"/"info@linecoffee.com" if no user (shouldn't happen post-guard).
- Added `parseNameParts(fullName)` helper to split full name into first/last.

**`src/components/layout/account/AccountShell.tsx`**
- Added `useEffect` auth guard: if `isLoggedIn` is false, calls `router.replace("/auth/login")`. Runs client-side only (after hydration), where localStorage is readable. Protects all 6 account routes (`/account/profile`, `/account/orders`, `/account/orders/[id]`, `/account/addresses`, `/account/wishlist`, `/account/notifications`, `/account/settings`) through the shared shell — single change, all routes covered.
- Uses `router.replace` (not `push`) so the login page replaces the account route in history — back button doesn't return to a locked page.

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ 29 routes

---

### [2026-06-19] — Fix Groups A–H: Auth, Wishlist, Mobile Nav, Date Formatting, Visual Polish

**New files:**
- `src/lib/hooks/useWishlist.ts` — `toggle(slug)`, `isWishlisted(slug)`, `count`, `remove(slug)` wrapping `useLocalStorage("line-wishlist-v1", [])`. No provider needed.
- `src/lib/hooks/useAuth.ts` — `signIn(name, email)`, `signOut()`, `user`, `isLoggedIn` wrapping `useLocalStorage("line-user-v1", null)`.
- `src/lib/utils/formatDate.ts` — `formatDate(dateStr, lang)` using `Intl.DateTimeFormat`. `ar-EG` for Arabic, `en-US` for English.

**`src/components/layout/public/PublicHeader.tsx`** (full rewrite)
- Fix A: User button opens `UserMenu` dropdown (guest: Sign In + Create Account; logged-in: name/email + account links + sign out).
- Fix B: Hamburger button added (mobile only). Opens `MobileMenu` full-screen panel with nav + auth sections.
- Fix E: Wishlist popover reads `useWishlist()`, shows real products with image + price + remove. Empty state included.
- Wishlist badge reads `useWishlist().count` (was hardcoded 0).

**`src/components/product/ProductCard.tsx`** (Fix C) — wishlist now persisted via `useWishlist().toggle()`.

**`src/app/(public)/products/[slug]/page.tsx`** (Fix D) — Save for Later wired to `useWishlist().toggle()`, active visual state.

**`src/app/(public)/auth/login/page.tsx`** (Fix A) — on submit calls `signIn()` → sets `line-user-v1` → header reflects logged-in state.

**`src/components/layout/account/AccountShell.tsx`** (Fix F + H) — sign out calls `signOut()` + clears localStorage + redirect; ambient bg image; user data from `useAuth()`.

**`src/components/layout/auth/AuthCard.tsx`** (Fix H) — richer background, warmer card, gold inset line, larger logo, back-link.

**Fix G (date formatting):** `src/app/(public)/blog/page.tsx`, `blog/[slug]/page.tsx`, `account/orders/page.tsx`, `account/orders/[id]/page.tsx`, `account/notifications/page.tsx` — all raw date strings replaced with `formatDate(date, language)`.

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ 29 routes

---

### [2026-06-16] — Session 1: Major Art Direction Pass + UX Fixes

**What changed:**

**`src/app/layout.tsx`**
- Added Tajawal font (Google Fonts, weights 300/400/500/700/800)
- Added `${tajawal.variable}` to `<html>` className

**`src/app/globals.css`**
- Added `--font-arabic-display: var(--font-tajawal)` to `@theme inline`
- Split Arabic typography: Cairo → body/UI, Tajawal → h1–h6 (display)
- h1/h2: Tajawal weight 800, line-height 1.26; h3: weight 700; h4–h6: weight 600
- Removed all `.trust-strip` and `.trust-strip-item` CSS
- Added `.hero-stats-layer` animation (300ms delay)
- Added `.cinematic-section` stacked-card effect:
  - `border-radius: 22px 22px 0 0` (mobile) / `32px 32px 0 0` (desktop)
  - `margin-top: -22px` / `-32px`
  - `box-shadow: 0 -1px 0 rgba(214,163,115,0.22), 0 -16px 48px rgba(0,0,0,0.60)`
- `cinematic-section::before` gold line: `top: 22px/32px`, opacity bumped to 0.38
- Added `will-change`, `backface-visibility: hidden`, `translateZ(0)` to `.hero-slide-frame` and `.hero-slide-image` to prevent scroll jitter

**`src/components/layout/public/PublicHeader.tsx`**
- Announcement bar: replaced marquee with fade-cycle (3 messages, 3.8s interval)
- Header glass: transparent on hero (`!isScrolled` → no class), glass after 20px scroll

**`src/features/website/home/sections/HeroSection.tsx`**
- Removed trust strip (was between hero and categories, created hard visual break)
- Removed editorial gold rule above h1
- Added heroStats counting animation (`useCountUp` hook, 36-frame ease-out quad)
- Stats: 15+ Origins Curated / 72h Fresh Roast Window / 100% Arabica Focus
- Dot indicators: restored to `bottom-6 sm:bottom-8`
- Stats layout: moved to full-width bottom bar (Recueil-style), large number + label + description

**All homepage sections** (`CategoriesSection`, `BestSellersSection`, `FeaturesSection`, `StorySection`, `JournalSection`, `TestimonialsSection`, `SocialGallerySection`, `ContactSection`):
- Removed `section-blend` class
- Removed all artificial smoke/gradient bridge `<div>` elements
- Fixed `aria-hidden` to use string literal `"true"` (was boolean expression → ESLint error)

**`CategoriesSection.tsx`**
- `SectionHeading` changed to `align="flush"` wrapped in `<div className="mb-8 md:mb-10">` to fix dead space
- Removed unused `index` prop from CategoryCard

**`BestSellersSection.tsx`**
- Fixed marquee `aria-hidden` by splitting into two separate `.map()` calls (live + duplicate)
- Changed `mb-12` → `mb-6` on header container to fix dead space

---

### [2026-06-16] — Scroll Reveal Experiment (Reverted)

Attempted a Recueil-style sticky scroll-reveal text effect on the hero:
- Wrapped hero in 380vh outer div, made section `position: absolute` + `transform: translateY()` via JS scroll handler
- Text "Slow roast. One origin. Every cup — a ritual." revealed word-by-word as you scroll
- **Reverted** — user feedback: too complex, not what was wanted; also caused background jitter from JS-driven transforms

---

### [2026-06-16] — Session 2: V3 Master Visual Plan Created

**What changed:**

**`LINE_COFFEE_V3_PUBLIC_WEBSITE_MASTER_VISUAL_PLAN.md`** (new file, project root)
- Created 14-section master planning document for all remaining public website pages after the homepage
- Synthesizes V2 specs, old UI Arabic description, content blueprints, and V3 visual direction into one planning source
- Sections: executive summary, source files reviewed, locked decisions, full sitemap (25 routes), page-by-page blueprints for all pages, Products Experience deep detail, Custom Builders deep detail, component inventory (34 components), visual rules system, content/media requirements, data model awareness (mock only), 9-phase build execution plan, 7 Codex-ready agent prompts, next recommended step
- No code written, no Supabase binding, no Dashboard work — pure planning document

**Memory files** (persistent agent memory)
- `memory/v3_plan_reference.md` — pointer to master plan, current phase gate status
- `memory/MEMORY.md` — updated index

---

### [2026-06-16] — Session 2 Patch: Master Plan v1.1 Corrections

**What changed:**

**`LINE_COFFEE_V3_PUBLIC_WEBSITE_MASTER_VISUAL_PLAN.md`** (patched, no full rewrite)
- §3.2 Typography: ArabicTestAligarh confirmed for display AND body. ArabicTestTinta marked rejected. Typography gate removed.
- §3.5 / §7.2 Flavor catalog: Updated to final 30-flavor grouping (Sweets 7, Nuts 4, Fruits 8, Special 6). Previous placeholder lists removed.
- §4 Sitemap: Product routes corrected (`/products/category/[slug]`, `/products/[slug]`). Legal routes flattened (`/privacy`, `/terms`, `/shipping`, `/returns`). Auth routes corrected (`/auth/signup` not `/auth/register`; added `/auth/reset-password`). Account routes corrected (added `/account/addresses`, `/account/settings`; removed non-existent overview page).
- §5.2–5.3 Blueprint headings: Updated to match corrected routes.
- §5.13 Legal blueprint: Updated to 4 flat routes.
- §5.14–5.15 Account/auth blueprints: Updated to correct route lists.
- §6.1 Build order: Route references corrected.
- §8 Component inventory: Route references corrected.
- §12 Phase 0: Marked complete (no blocker). Phase 1 + Phase 5 task lists updated with correct routes.
- §13 Prompt 4 + Prompt 6: Routes and flavor list corrected.
- §14 Next step: Removed typography approval language; now points directly to Phase 1 first task.

---

### [2026-06-16] — Session 3: Homepage Final Polish (Tasks A–D)

**What changed:**

**`src/app/globals.css`**
- `.reveal-on-scroll`: `translateY(30px)` → `translateY(14px)`, `scale(0.988)` → `scale(0.992)`, transition `780ms` → `660ms`
- `.reveal-from-right`: `translateX(42px) translateY(18px) scale(0.985)` → `translateX(22px) translateY(10px) scale(0.99)`
- `html[dir="rtl"] .reveal-from-right`: matching reduction to `translateX(-22px)`

**`src/features/website/home/hooks/useLuxuryScrollReveal.ts`**
- IntersectionObserver `rootMargin` changed from `-12%` to `-4%`
- `threshold` changed from `0.12` to `0.06`
- `alreadyVisible` check uses `window.innerHeight` (was `window.innerHeight * 0.94`)

**`src/lib/context/language.tsx`**
- Added `useLayoutEffect` import; removed `useRef` import
- Replaced first `useEffect + setTimeout(0)` with `useLayoutEffect` that sets `html.dir/lang/dataset` synchronously before paint, then defers `setLanguageState` via `setTimeout(0)` (lint-safe pattern)
- Removed `canPersistLanguageRef` entirely
- Second `useEffect` (DOM sync + persist) simplified — always persists, no ref guard

**`src/app/layout.tsx`**
- Added `suppressHydrationWarning` to `<html>` element
- Added inline `<script>` in `<head>` that reads `localStorage` and sets `html.dir/lang/dataset.language` before React loads (belt-and-suspenders against dir/lang flash)

**`src/features/website/home/sections/HeroSection.tsx`**
- Added `dir="ltr"` to arrow button container `<div>` — prevents RTL flex reversal from physically swapping left/right button positions
- Fixed both arrow `aria-label` values to be direction-aware: in RTL the left button is "Next", right button is "Previous"

---

### [2026-06-16] — Session 3 Follow-up: RTL Marquee + Language Flicker Final Fix

**What changed:**

**`src/app/globals.css`**
- Added `direction: ltr` to `.category-marquee-track, .social-marquee-track, .best-sellers-marquee-track` — prevents RTL flexbox from physically reversing the DOM order of items, which broke the seamless infinite-loop `translateX(-50%)` animation (duplicates landed on wrong side of track in RTL, causing items to collide in the center)
- Removed all three `html[dir="rtl"]` animation-name overrides (`social-drift`/`category-drift` swaps) — they were the root cause of RTL marquee collision and disappearing
- Added `html[dir="rtl"] .category-marquee-track > *, html[dir="rtl"] .best-sellers-marquee-track > *` rule restoring `direction: rtl` on individual cards so Arabic text in ProductCard and CategoryCard still right-aligns correctly

**`src/lib/context/language.tsx`**
- Replaced `setTimeout(() => setLanguageState(stored), 0)` (deferred, caused one-frame EN flash) with synchronous `setLanguageState(stored)` directly inside `useLayoutEffect` + `// eslint-disable-next-line react-hooks/set-state-in-effect` comment — React re-renders synchronously before the browser's first paint, eliminating the visible English text flash entirely

---

### [2026-06-16] — Session 4: Products Page — Reverted Codex, Restored Old Design

**What changed:**

**`src/app/(public)/products/page.tsx`** (full rewrite)
- Removed PageHero component, FilterSortBar, CategoryPill, category intro panel, sort functionality
- Restored old-style layout: cinematic inline hero (`-mt-20 pt-20` under fixed header) + sidebar with plain category nav buttons + inline search above grid
- Sidebar uses `.products-cat-active` CSS class (gradient gold) for active state — no inline styles
- Grid: `grid-cols-2 lg:grid-cols-3`, no sort, simple count display
- Zero backend connections — all data from `catalogProducts` / `catalogCategories` static mock

**`src/components/product/ProductCard.tsx`** (rewrite)
- Removed `categoryLabel`, `variant`, `catalogNotes`, `catalogBadges`, `SplitNumericText`, `formatPrice`
- Keeps union type `VisualProduct | CatalogProduct` (needed for homepage BestSellersSection)
- Price grid: `grid-cols-1/2/3` auto-sized by chip count — 2 cols for packaged products, 1 col for per-kg origins
- `note` only shown for VisualProduct (homepage cards) — catalog cards show no description (none in static data)
- Wishlist: local `useState` only, no store / no toast
- Quick Add: no-op click handler, purely visual (no cart)

**`src/app/globals.css`**
- Added `.products-cat-active` class: gold gradient background, dark text, gold box-shadow

**Deleted (no longer imported anywhere):**
- `src/components/product/FilterSortBar.tsx`
- `src/components/ui/CategoryPill.tsx`
- `src/components/ui/PageHero.tsx`
- `src/components/ui/EmptyState.tsx`

**Also removed:** accidentally cloned `line-coffee-old/` folder from inside the project directory (was cloned in previous command, not needed)

---

### [2026-06-17] — Blend Origins: Arabic Names + Bean Type Display

**`src/lib/mock-data/product-catalog.ts`**
- `BlendComponent` type updated: added `beanType: "arabica" | "robusta"` field
- All 8 Turkish/Espresso blend arrays fully rewritten with correct Arabic names from user-provided tables:
  - Turkish Silk: برازيلي 17-18, سانتوس فاين كاب, حبشي لقمتي, هندي مغسول, روبوستا هندي AA
  - Strike Coffee: برازيلي عادي, حبشي لقمتي, كولومبي عادي, يمني, إندونيسي كبير
  - Cairo Nights: برازيلي 17-18, هندي, جواتيمالا, كولومبي عادي, أوغندي 18
  - High Mood: يمني, كولومبي 18, سانتوس فاين كاب, كوستاريكا, حبشي عادي, روبوستا AA
  - Heavy Crema: برازيلي 17-18, هندي, روبوستا هندي AA, إندونيسي XL, كولومبي عادي
  - Aroma Body: كولومبي عادي, برازيلي عادي, حبشي عادي, نيكاراجوا, روبوستا AA
  - Headshot: هندي, برازيلي عادي, جواتيمالا, أوغندي 18, كولومبي عادي
  - Black Label: كولومبي 18, جواتيمالا, كوستاريكا, نيكاراجوا, حبشي عادي, بيرو, روبوستا هندي AA

**`src/components/product/ProductCard.tsx`**
- Blend rows now show a tiny type badge before each origin: gold "أ"/"A" for Arabica, cream "ر"/"R" for Robusta
- Updated to show full word "أرابيكا" / "روبوستا" inline (not a badge) next to each origin name

---

### [2026-06-17] — Custom Builders Visual Blueprint Created

**`LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md`** (new file, project root)
- Full planning document for `/make-your-espresso` and `/make-your-flavor`
- 12-section document covering: executive summary, old project reference audit, step-by-step UX flows for both builders, visual layout blueprints, 17-component list with specs, data model shapes, visual rules, bilingual copy table, 5-phase build plan, 3 Codex-ready prompts, recommendation + top 5 risks
- Old project inspected: `d:/website/line-coffee-old-reference/components/products/premium-configurator.tsx` + `lib/config/espresso-intelligence.ts` + `lib/config/customization.ts`
- Recommendation: Build Make Your Flavor first (Phase B), then Make Your Espresso (Phase C)
- No code written, no Supabase, no dashboard, no cart backend

---

### [2026-06-17] — Custom Builders Deep UX Review & Enhancements

**`LINE_COFFEE_V3_CUSTOM_BUILDERS_REVIEW_AND_ENHANCEMENTS.md`** (new file, project root)
- 12-section deep review from the perspective of Senior UX Designer / E-commerce Product Designer / Coffee Experience Designer
- Identified 3 critical problems in the blueprint: (1) 6-step Make Your Flavor flow is too long → reduced to 4 steps; (2) Steps 3+4 in Make Your Espresso are both read-only → merged into one screen; (3) No price signal until the final step → anchored on Step 1
- Make Your Flavor revisions: kill the gated hero step, combine Group + Flavor into one screen, move Weight before Sweetness, add persistent mini-summary, transform review into a virtual product card, add Special Order flavor descriptions
- Make Your Espresso revisions: introduce Beginner/Advanced mode split, merge Blend+Analysis into one screen, add "Inspired By" preset shortcuts on profile cards, rename "مرارة" to "العمق", add live blend preview on profile selection, add grind pre-selection logic
- Mobile-first: BuilderNavBar safe area padding, stepper compression to progress bar, touch target verification at 44px minimum
- RTL: progress bar fill direction, BuilderNavBar physical swap, blend bar fill origin, chip grid direction, Arabic separator character fix
- Premium luxury: gold-sweep shimmer on selection, staggered blend bar animation, staggered bean reveal animation, virtual product card at review
- Conversion: WhatsApp escape hatch on every step, price anchor on Step 1, social proof labels, "Skip to products" banner for mis-navigated users, revised CTA microcopy
- Deferred to Phase 3+: flavor wheel, flavor map, multi-select flavors, save/resume, real-time pricing, custom ratios, sound design
- Final flows: Make Your Flavor 4 steps, Make Your Espresso Beginner 3 steps + review / Advanced 5 steps + review
- Final recommendation: Build Make Your Flavor first for proven conversion, then Make Your Espresso
- No code written, no Supabase, no source file edits

---

### [2026-06-17] — Make Your Espresso: Inline Products Integration + Header Fix

**What changed:**

**`src/features/website/make-your-espresso/EspressoBlendStudio.tsx`**
- Added `embedded?: boolean` prop (default `false`)
- In embedded mode: no `min-h-screen`/`overflow-x-hidden`/background wrapper; hero section replaced with compact studio banner (icon + label + h2)
- In standalone mode: unchanged full-screen hero with negative margin
- Fixed bare `aria-hidden` attribute → `aria-hidden="true"` on hero image wrapper (linter rule)
- Studio grid section: `className` is now conditional — `max-w-7xl px-4 py-6` in standalone, `py-2` with `18rem` right column in embedded

**`src/app/(public)/products/page.tsx`**
- Added `ActiveCategory = CatalogCategorySlug | "make-your-espresso" | "make-your-flavor"` type
- Removed the separate `<Link href="/make-your-espresso">` at the bottom of the sidebar
- Built `sidebarItems` array that interleaves special studio entries: "Make Your Espresso" after Espresso Blends, "Make Your Flavor" (disabled) after Flavor Coffee
- Sidebar order: Turkish Blends → Espresso Blends → Make Your Espresso (Studio) → Easy Coffee → Coffee Mix → Cappuccino → Hot Chocolate → Flavor Coffee → Make Your Flavor (Soon)
- "Make Your Espresso" sidebar button: gold accent with `<Sparkles />` icon, sets `activeCategory` instead of navigating away
- "Make Your Flavor" sidebar button: disabled, "Soon" label
- `filtered` useMemo: early-returns `[]` when `activeCategory` is a studio value
- Main content area: when `activeCategory === "make-your-espresso"`, renders `<EspressoBlendStudio embedded />` inline with sidebar still visible

**`src/components/layout/public/PublicHeader.tsx`**
- Removed `isMakeYourEspressoPage ? "nav-glass-hero" : ""` branch from outer header className — now `isScrolled ? "nav-glass" : ""` for all pages, matching home transparent behavior on `/make-your-espresso`
- Kept `isMakeYourEspressoPage` for announcement bar transparency (already correct)

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (4 routes)

---

### [2026-06-17] — Make Your Flavor: Full FlavorMixStudio Build + Emoji Removal

**What changed:**

**`src/features/website/make-your-flavor/data/flavorData.ts`**
- `FlavorItem` type: removed `emoji: string`, added `hint: { en: string; ar: string }`
- All 30 flavors rewritten with `hint` taste descriptions in EN + AR; `emoji` field fully removed
- 4 bases have `hint` bilingual descriptions, `beanType` field unchanged

**`src/features/website/make-your-flavor/lib/flavorEngine.ts`** (new file)
- `computePricePerKg` — base price + per-flavor add-on, rounded
- `computeMixMetrics` — averaged FlavorMetrics across selected flavors
- `computeBalance` — dimension dominance ratio (0–5), inverse of variance across metric peaks
- `computeMixScore` — 0–100 score with base bonus, diversity bonus, overfill penalty
- `getMixHealth` — "Excellent" ≥85 / "Balanced" ≥65 / "Needs Balance" below, with bilingual label + detail + tone
- `analyzeFlavorMix` — bilingual smart comment: dominant flavor + mood + guidance, tone-aware

**`src/features/website/make-your-flavor/FlavorMixStudio.tsx`** (new file)
- `embedded?: boolean` prop — compact banner in embedded mode, full hero in standalone
- Left column (top to bottom): `BaseSelector` → `GuidePanel` (presets) → `FlavorLibrary`
- Right column: `LiveFlavorCart` sticky panel
- `BaseSelector`: 4 buttons grid (2-col mobile, 4-col desktop), active gold state, price + hint visible
- `GuidePanel`: 8 preset buttons (2×4 grid), apply sets base + flavor IDs
- `FlavorLibrary`: category tab bar + card grid (`sm:grid-cols-2 xl:grid-cols-3`); cards follow bean-card philosophy — `article role="button"`, dark gradient bg, serif flavor name, taste hint subtitle, add-on price footer, Check/ChevronRight badge; NO emojis anywhere
- `LiveFlavorCart`: price total → weight picker → quantity stepper → CTA → divider → base summary → flavor list rows (name + add-on, no emoji) → mix quality score card → 6 metric bars + balance bar → smart comment
- ARIA fixes: `role="button"` (not conditional), `aria-disabled={disabled ? "true" : undefined}`, `aria-pressed={selected ? "true" : "false"}` (string literals, not booleans)

**`src/app/(public)/make-your-flavor/page.tsx`** (new file)
- Standalone route: renders `<FlavorMixStudio />` with full hero

**`src/app/(public)/products/page.tsx`**
- `ActiveCategory` type already included `"make-your-flavor"`
- "Make Your Flavor" sidebar entry: `disabled` flag removed, now live with gold `<Sparkles />` button
- Main content: `activeCategory === "make-your-flavor"` renders `<FlavorMixStudio embedded />`

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings

---

### [2026-06-17] — Full Cart System + Studio Two-Panel Restructure

**What changed:**

**`src/lib/hooks/useLocalStorage.ts`** (new file)
- `useSyncExternalStore`-based hook — SSR-safe, no hydration mismatch
- Module-level `_cache` (Map keyed by raw JSON string) for reference stability so array/object values don't trigger infinite re-renders
- `getServerSnapshot` always returns `initial` (SSR path), `getSnapshot` reads from localStorage (client path)
- Functional updater `setValue((prev) => ...)` supported via `_getStable` read

**`src/lib/context/cart.tsx`** (new file)
- `CartItem`: `{ id, kind: "product"|"espresso-blend"|"flavor-mix", name: {en,ar}, detail: {en,ar}, pricePerUnit, qty, slug? }`
- Persistent via `useLocalStorage<CartItem[]>("line-cart-v1", [])`
- Product dedup: deterministic ID `product-${slug}-${detail.en}` — re-adding same size increments qty
- Studio items: sequential ID `studio-${kind}-${++seq}` — each Add creates a new entry
- Exposes: `items, count, total, isOpen, addItem, removeItem, updateQty, clearCart, openCart, closeCart`

**`src/app/layout.tsx`**
- Replaced `<head><script dangerouslySetInnerHTML>` (React 19 error) with `<Script id="lang-init" strategy="beforeInteractive">` from `next/script`
- Wrapped layout with `<CartProvider>` inside `<LanguageProvider>`

**`src/app/(public)/products/page.tsx`**
- URL persistence: `useSearchParams` reads `?cat=` on mount; `selectCategory()` calls `router.replace` with new param
- Category no longer resets to Turkish Blends on page refresh

**`src/components/layout/public/PublicHeader.tsx`**
- `useCart` — live `count` badge on cart icon, `isOpen` syncs to `openCommercePanel` via `setTimeout` (lint-safe)
- `CommercePopover` cart state: real items list with qty +/−, Trash2 remove per item, total, "Clear cart", checkout CTA
- `handleCartToggle` syncs both `openCommercePanel` state and cart context open state

**`src/components/product/ProductCard.tsx`**
- `handleQuickAdd`: adds to cart via `addItem`, shows 1.4s "Added!" green state, then reverts
- `justAdded` useState — resets after 1400ms via setTimeout

**`src/features/website/make-your-espresso/EspressoBlendStudio.tsx`**
- All studio state migrated from `useState` → `useLocalStorage` (persists across refresh)
- `handleAddToCart`: adds espresso blend to cart with bilingual name + detail string (size · profile · beans)
- `resetStudio()`: clears all localStorage keys back to initial values
- **LiveBlendCart restructured** to two-panel layout (matching FlavorMixStudio):
  - Top: Price + Per-kg/Unit chips + Weight + Qty + CTA + Reset
  - Divider
  - Bottom: Blend mode badge + Edit Ratios + Beans list (ratio bar + rows) + Manual total warning + Blend Quality + Metric bars + Smart comment
- Removed duplicate Pencil buttons per bean row — single "Edit Ratios" link in bottom panel header

**`src/features/website/make-your-flavor/FlavorMixStudio.tsx`**
- All studio state migrated from `useState` → `useLocalStorage` (persists across refresh)
- `handleAddToCart`: adds flavor mix to cart with bilingual name + detail string (weight · base · flavors)
- `resetStudio()`: clears all localStorage keys back to initial values
- LiveFlavorCart already had two-panel layout (no structural change needed)

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings

---

### [2026-06-17] — Product Experience Cleanup Pass

**`src/app/(public)/products/page.tsx`**
- Added `VALID_CATEGORIES` Set for param validation (all catalog slugs + studio IDs)
- Category param resolution now reads `?category=` (primary) then `?cat=` (backward-compatible fallback); invalid values fall back to `"turkish-blends"`
- `selectCategory()` now writes `?category=` (canonical param)
- Removed `href={null}` from ProductCard in grid — cards now link to `/products/[slug]` by default

**`src/app/(public)/products/[slug]/page.tsx`**
- Removed: Product Story section, Related Products section, Reviews section, FAQ section
- Removed: `categoryStory`, `reviewPlaceholder`, `faqItems` constants, `getRelatedProducts` function
- Removed: `CatalogProductCard` import, `Star` import, `CatalogCategorySlug` import (became unused), `dir` destructure (only used in removed FAQ)
- Added: `useCart` import + `addItem`/`openCart` call
- Replaced mock CTA (`handleMockCta`/`mockSaved`) with real cart action (`handleAddToCart`/`justAdded`): adds selected weight + quantity to cart, opens cart drawer, shows 1.4s "Added to Cart" confirmation
- Fixed breadcrumb category link: `/products/category/${slug}` → `/products?category=${slug}`
- Increased `<main>` bottom padding for visual breathing room after section removal

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (6 routes)

---

### [2026-06-17] — Best Sellers Audit + Sidebar Studio Accent Colors

**`src/features/website/home/sections/BestSellersSection.tsx`**
- Replaced `visualProducts` (4 fake slugs with no catalog entries) with 6 real `catalogProducts`: `turkish-silk`, `high-mood`, `heavy-crema`, `black-label`, `classic-line`, `original-cappuccino` — spanning 4 categories and 4 distinct images
- Prop type changed from `VisualProduct[]` to `CatalogProduct[]`; removed `visualProducts` and `VisualProduct` imports; added `catalogProducts`/`CatalogProduct` imports
- All best seller cards now navigate to `/products/[slug]` (valid catalog routes)
- Added `showBlend={false}` to `ProductCard` in the marquee to suppress blend rows (crowded at small card size)

**`src/components/product/ProductCard.tsx`**
- Added `showBlend?: boolean` prop (default `true`)
- Blend composition section now only renders when `showBlend && blend && blend.length > 0`

**`src/app/globals.css`**
- Added `.studio-espresso-btn` — deep copper/dark red gradient for "Make Your Espresso" sidebar entry
- Added `.studio-flavor-btn` — same copper family, slightly darker tone for "Make Your Flavor" sidebar entry (same visual language, hair darker to distinguish)
- Both share identical layout properties (padding, radius, font-size) with `premium-button`; only gradient and shadow differ

**`src/app/(public)/products/page.tsx`**
- Studio sidebar buttons now use `studio-espresso-btn` / `studio-flavor-btn` CSS classes instead of `premium-button` (gold) — immediately recognizable as special experiences while keeping identical dimensions and layout

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (6 routes)

---

### [2026-06-17] — Critical Localization Fix: Eliminate Bilingual Content Mixing

**Root cause:** Two components computed a `secondaryName` / `secondaryDescription` as the opposite-locale string and rendered it alongside the primary-locale content, violating the rule that only one language must be shown at a time.

**`src/app/(public)/products/[slug]/page.tsx`**
- Removed `secondaryName` (`language === "ar" ? product.name.en : product.name.ar`)
- Removed `secondaryDescription` (`language === "ar" ? product.note.en : product.note.ar`)
- Removed 3 render sites: hero subtitle, info-panel name subtitle, info-panel secondary description paragraph
- Hero: h1 name only (no opposite-language sub-label)
- Info panel: primary name h2 + single `primaryDescription` paragraph (no secondary)

**`src/components/product/CatalogProductCard.tsx`** (used by `/products/category/[slug]`)
- Same fix: removed `secondaryName` + `secondaryDescription` variable declarations and both render sites
- Card now shows: primary-locale name → primary-locale description → prices

**Confirmed clean (no fix needed):**
- `ProductCard.tsx` — already uses only `t()` for all display text
- `products/page.tsx` — search filter uses `.name.en/.ar` for query matching (not display); all labels use `t()`
- Builders — bilingual strings built as `{ en: ..., ar: ... }` objects for cart `detail` field, never rendered raw
- Testimonials — `.name.en` used as React key only, not display

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (6 routes)

---

### [2026-06-17] — /about Page Build

**`src/app/(public)/about/page.tsx`** (new file)
- `"use client"` page with 5 inline mock content constants: `INTRO`, `PHILOSOPHY`, `JOURNEY`, `QUOTE`, `CTA_SECTION`
- Section 1: `.products-hero` cinematic hero with roastery background image, badge + h1 + sub-paragraph
- Section 2: `.cinematic-section.section-bg-warm` editorial split — explicit `lg:order-1`/`lg:order-2` on both columns (direction-sensitive, works correctly in both LTR/RTL without conditional logic)
- Section 3: `.cinematic-section.section-bg-black` centered timeline (3 entries: 2015, 2018, Today); `JOURNEY[2].year` typed as `{ en: string; ar: string }` for bilingual "Today"/"اليوم"
- Section 4 (merged Quote + CTA): `.cinematic-section` with roastery.png at 38% brightness; quote text → thin gold divider → CTA heading → 3 buttons
- No `globals.css` changes; uses existing button classes only
- Arabic name corrected: "لاين كوفي" throughout (fixed "لايين كوفي" across entire project in 3 files)

**`src/app/(public)/products/category/[slug]/page.tsx`**
- Single cleanup: `const locale = language === "ar" ? "ar" : "en"` → `const locale = language`
- Fixed two Arabic copy strings: "لايين" → "لاين"

**`src/app/(public)/products/[slug]/page.tsx`**
- Fixed: `ar: "لايين كوفي"` → `ar: "لاين كوفي"` (fallback category label + badge copy)

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (8 routes)

---

### [2026-06-17] — /contact Page Build (Phase A)

**`src/app/(public)/contact/page.tsx`** (new file)
- `SITE_CONTACT` local constant: real WhatsApp `+20 100 476 1171` / `https://wa.me/201004761171`, phone `tel:+201004761171`, email `hello@linecoffee.eg`, bilingual location — marked for future Dashboard/Site Settings migration
- `FAQ_ITEMS` — 6 bilingual Q&A: delivery, freshness, custom blend, wholesale, returns, roastery visit
- `ContactCard` sub-component: icon + bilingual label + value (string or `{en,ar}`) + optional `href`
- `FormFields` type + `EMPTY_FORM` constant; `submitted: boolean` state; mock submit (no backend)
- Section 1: `.products-hero` hero with roastery.png at 32% brightness
- Section 2: `.cinematic-section.section-bg-warm` 2-col layout; Form `lg:order-1`, Info `lg:order-2` (explicit direction-aware ordering)
  - Form: name + phone grid, email, subject `<select>` with `<ChevronDown>` icon (RTL `left-3` / LTR `right-3`), textarea, submit button; `dir="ltr"` on phone/email inputs
  - Info: 4 `ContactCard` entries + response-time panel
  - Success state: icon + heading + sub-paragraph + "Send another message" reset button
- Section 3: `.cinematic-section` WhatsApp feature strip with `.studio-espresso-btn` CTA
- Section 4: `.cinematic-section.section-bg-black` FAQ accordion (single-open, `aria-expanded` string literal) + "Explore Products" CTA
- No `globals.css` changes; all ARIA attrs are string literals

**Validation:** `tsc --noEmit` → 0 errors, `npm run lint` → 0 warnings, `npm run build` → ✓ (9 routes)

---

### [2026-06-18] — Header Transparency Fix: /about and /contact Hero Sections

**Problem:** Header appeared glass/dark on `/about` and `/contact` even before scrolling, unlike `/products` where the hero image shows through the transparent header.

**Root cause:**
- `/about` hero section had no full-bleed background image — just dark `#0B0806` page background behind the transparent header
- `/contact` hero section had `brightness-[0.32]` + `bg-[#0B0806]/65` overlay — too dark to show any image through the header

**`src/app/(public)/about/page.tsx`**
- Added `dark-roast.png` as `fill` background to section 1 hero at `brightness-[0.50]`
- Added `bg-[#0B0806]/50` flat overlay + `linear-gradient` fade (22% → 78% → 100% dark top to bottom)
- Hero now shows cinematic textured background through transparent header

**`src/app/(public)/contact/page.tsx`**
- `brightness-[0.32]` → `brightness-[0.52]` on hero background image
- `bg-[#0B0806]/65` → `bg-[#0B0806]/48` overlay — reduces darkness so image shows through header

---

### [2026-06-18] — Ambient Background Images on Homepage Sections + Footer

**What changed:** Added subtle ambient background images (very low opacity, heavy dark overlay on top) to sections that previously had flat solid colors.

**`src/features/website/home/sections/CategoriesSection.tsx`**
- Added `assets` to import from `visual-content`
- Added `dark-roast.png` fill image at `opacity-[0.08]` + `bg-[#0F0A07]/68` overlay

**`src/features/website/home/sections/FeaturesSection.tsx`**
- Added `Image` import + `assets` to visual-content import
- Added `roastery.png` fill image at `opacity-[0.07]` + `bg-[#0B0806]/70` overlay

**`src/features/website/home/sections/TestimonialsSection.tsx`**
- Added `Image` import + `assets` to visual-content import
- Added `dark-roast.png` fill image at `opacity-[0.08]` + `bg-[#0B0806]/72` overlay

**`src/features/website/home/sections/ContactSection.tsx`**
- Image already existed; boosted from `opacity-[0.14]` → `opacity-[0.20]`
- Overlay lightened from `bg-[#0B0806]/86` → `bg-[#0B0806]/76`

**`src/components/layout/public/PublicFooter.tsx`**
- Added `dark-roast.png` fill image at `opacity-[0.06]` + `bg-[#070504]/72` overlay (appears on all pages)

---

### [2026-06-18] — Phase B + C + D: Blog, Legal, Shopping Flow

**Phase B — Blog**

**`src/lib/mock-data/blog-data.ts`** (new)
- `BlogPost` type: `slug`, `title`, `excerpt`, `image`, `category`, `date`, `readTime`, `featured?`, `tags?`, `body: BodyBlock[]`
- `BodyBlock`: `{ type: "heading" | "paragraph"; text: LocalizedValue }` — safe structured blocks, no `dangerouslySetInnerHTML`
- 6 bilingual posts: `origins-of-arabic-coffee` (featured), `roast-notes`, `blend-guide`, `freshness`, `turkish-ritual`, `espresso-craft`

**`src/app/(public)/blog/page.tsx`** (new)
- Hero with `.products-hero` + roastery image
- Featured article: full-width two-column card
- Client-side search input (filters by title/excerpt in current locale)
- Category pill filter (computed from all posts, deduped)
- Remaining posts grid: 3-col lg / 2-col sm; empty state with "Clear filters" fallback

**`src/app/(public)/blog/[slug]/page.tsx`** (new)
- Cover hero image extending under fixed nav
- Breadcrumb → Blog → title
- Meta row: category tag + date + read time
- Body blocks rendered via `.map()` — `h2` for headings, `p` for paragraphs
- "Back to Blog" back-aware arrow
- Related articles (2 non-current posts)
- Products CTA strip

**Phase C — Legal**

**`src/components/ui/LegalPageLayout.tsx`** (new)
- Shared layout component: `heroTitle`, `heroSubtitle`, `lastUpdated`, `sections: LegalSection[]`
- `.products-hero` hero + cinematic-section content column (max-w-3xl)
- Each section: serif h2, gold rule, paragraph blocks, footer "Contact us" CTA

**`src/app/(public)/privacy/page.tsx`** (new) — 7 sections of realistic Egyptian e-commerce privacy content (EN+AR)
**`src/app/(public)/terms/page.tsx`** (new) — 7 sections: acceptance, products, orders, delivery, IP, liability, governing law
**`src/app/(public)/shipping/page.tsx`** (new) — 6 sections: delivery areas, times, fees, tracking, failed attempts, freshness guarantee
**`src/app/(public)/returns/page.tsx`** (new) — 7 sections: policy overview, eligible/non-eligible, how to initiate, refunds, damaged items, contact

**`src/components/layout/public/PublicFooter.tsx`** (modified)
- Removed `/reviews` from `company` links (dead link, not in scope)
- Fixed `/privacy-policy` → `/privacy`; `/terms-of-use` → `/terms`
- Added `/shipping` and `/returns` to `support` column

**Phase D — Shopping Flow**

**`src/app/(public)/cart/page.tsx`** (new)
- Reads `useCart()` context (items, total, removeItem, updateQty, clearCart)
- Two-column desktop: items list (lg:col-span-2) + sticky summary card (lg:col-span-1)
- Delivery fee: free ≥500 EGP, else 50 EGP
- "Proceed to Checkout" → `/checkout`; empty state → `/products`

**`src/app/(public)/checkout/page.tsx`** (new)
- Customer info (name, phone, email) + address (governorate select, city, street, building, floor/apt) + delivery method (standard free / express 80 EGP) + order summary sidebar
- Required-field validation; `aria-pressed` string literals on delivery buttons
- On submit: generates `LC-XXXXXX` mock order number, saves `line-order-snapshot` to `sessionStorage`, calls `clearCart()`, navigates to `/order-success?order=LC-XXXXXX`
- Empty cart guard: redirects to "Your cart is empty" state

**`src/app/(public)/order-success/page.tsx`** (new)
- `useSearchParams` wrapped in `<Suspense>` (Next.js 15 requirement)
- On mount: reads `line-order-snapshot` from `sessionStorage`, removes it, calls `clearCart()`
- Shows order number, snapshot items with per-line totals, or generic fallback if no snapshot
- Two CTAs: "Continue Shopping" → `/products`, "Back to Home" → `/`
- Line Coffee Promise strip at bottom

**`src/components/layout/public/PublicHeader.tsx`** (modified)
- "Proceed to checkout" button in `CommercePopover` → `<Link href="/checkout" onClick={onClose}>`
- Added "View full cart" `<Link href="/cart">` text link between checkout CTA and "Clear cart"

**Validation:** `npm run lint` → 0 errors 0 warnings; `npx tsc --noEmit` → 0 errors; `npm run build` → ✓ 18 routes
