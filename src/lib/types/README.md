# `src/lib/types` — Launch-Core Data Contracts

This folder holds the **canonical, hand-authored TypeScript contracts** for Line
Coffee's launch domains. They are **type-only and additive** — importing one never
changes runtime behavior.

> **Read this before adding a "new" type for an existing entity.** Most launch
> entities already have a contract here _and_ a live data-layer shape (below).
> Add to the existing contract; don't fork a third shape.

---

## Two layers of types (this is the important part)

1. **Canonical contracts (this folder).** The intended single shape per entity,
   designed to map cleanly onto the Supabase schema. Some are already imported by
   the live data layers; many are still forward-looking (the domain has no DB
   table yet — see the master plan roadmap).

2. **Data-layer read/return shapes (`src/lib/*`).** Each data-layer module also
   declares the exact shape it reads back from a specific RPC/view plus its DB
   **row** types (e.g. `OrderRow`, `PublicProductRow`). **These are the contracts
   the UI actually consumes today.** They are deliberately scoped to one
   read/RPC and normalize nullable DB columns at the boundary (`String()` /
   `Number()` / `?? null`). They are not duplicates to "clean up" — they are the
   live boundary mappers.

When a canonical contract and a data-layer shape describe the same entity, the
**data-layer shape is the source of truth for current behavior**; the canonical
contract is the target the schema/RPCs converge toward as missing domains land.

---

## Contract registry (status after Phase 3 cleanup, 2026-06-30)

| File | Domain | Status | Live consumers / notes |
|---|---|---|---|
| `common.ts` | Primitives (`LocalizedValue`, `ID`, `Money`, `PackageSize`, …) | **LIVE (partial)** | `PackageSize` → public/admin catalog; `LocalizedValue` re-export used widely |
| `order.ts` | Order / OrderItem / lifecycle | **LIVE (partial)** | Union types (`OrderStatus`, `OrderType`, `OrderChannel`, `PaymentMethod`, `PaymentStatus`) → `admin-orders.ts`. `Order`/`OrderItem` interfaces + `ORDER_STATUS_EFFECTS` are a **documented rule source** — the enforced rules currently live in SQL (`update_admin_order_status`) + `ALLOWED_ADMIN_ORDER_TRANSITIONS` |
| `admin.ts` | Admin users / roles / permissions | **LIVE (partial)** | `AdminRole`, `AdminUserStatus`, `AdminPermission` → `src/lib/auth/admin.ts` |
| `product.ts` | Product / ProductVariant | **DORMANT** | Live shape: `public-catalog.ts` `PublicCatalogProduct`, `admin-catalog.ts` `AdminProduct`. Note: those use `pricingModel: "packaged-by-weight"`; the canonical `ProductPricingModel` is `fixed`/`per_kg`/`custom_builder` — reconcile when the catalog schema is revisited (Phase 4+) |
| `category.ts` | Category | **DORMANT** | Live shape: catalog `PublicCatalogCategory` / `AdminProductCategory` |
| `customer.ts` | Customer / Address / Snapshots | **DORMANT** | Live shape: `customer-account.ts` (`CustomerProfile`, `CustomerAddress`, …) + `admin-orders.ts` snapshots |
| `inventory.ts` | Inventory items / movements / suppliers / **lots** / **lot allocations** / beans | **LIVE (partial)** | `InventoryLot` (Phase 4 + Phase 5 `reservedQtyKg`/`source`) + `OrderLotAllocation` (Phase 5) → live shapes in `admin-purchasing.ts` (`inventory_lots` / `order_lot_allocations`). `Supplier` → live shape `admin-purchasing.ts` (`suppliers`). Generic `InventoryItem`, raw-bean/packaging lots still **FORWARD** (Phases 6, 8). Phase 5 (migration 20260630130000) makes finished-product lots the FIFO source of truth: checkout reserves lots, delivered deducts + snapshots COGS, cancel releases; `inventory_stock` stays the kg-per-product aggregate + oversell guard |
| `accounting.ts` | Purchases / **purchase items** / expenses / supplier payments / derived P&L | **LIVE (partial)** | `Purchase` header / `PurchaseItem` (Phase 4) / `SupplierPayment` / `OperatingExpense` → live shapes in `admin-purchasing.ts` (`purchases` / `purchase_items` / `supplier_payments` / `expenses`). Derived P&L rollups (`AccountingRollup`, `SupplierPayable`, revenue/COGS lines) still **FORWARD** (Phase 14). Deliberately no `AccountingOrder` |
| `marketing.ts` | Promo / offers / banners | **FORWARD** | No DB tables yet (Phase 7). Marketing admin is mock |
| `cms.ts` | Reviews / blog / contact | **FORWARD** | No DB tables yet (Phase 13). CMS admin is mock |
| `settings.ts` | Site settings | **FORWARD** | Owner Settings UI deferred (master plan §6.1) |
| `flavor.ts` | Make-Your-Flavor config | **FORWARD** | Builder config in code; DB in Phase 9 |

`index.ts` re-exports every file as `export type *` for a single import surface.

---

## Money & precision (master plan §6.7)

`Money` is a JS `number` at the app boundary. The DB stores money as
`numeric(_, 2)` — **2 decimal places** for every amount (totals, discounts,
delivery fees, COGS, refunds, expenses, supplier payments), frozen as a snapshot
on the order. Coffee stock is kg with ≥3 decimals; espresso components are grams.
The UI may render whole EGP, but stored values keep their decimals.

---

## Supabase generated DB types — not present yet

The browser client (`src/lib/supabase/client.ts`) calls `createClient` **without**
a `Database` generic, so RPC/table responses are untyped at the SDK layer and the
data layers cast rows to their own hand-written row types. This is safe today
(every cast is followed by explicit field normalization), but generating DB types
later is recommended so the row types become checked against the real schema.

See `docs/ai/LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md` →
"Supabase DB type strategy" for the exact `supabase gen types` command and how to
wire the generic in without rewriting the data layers.
