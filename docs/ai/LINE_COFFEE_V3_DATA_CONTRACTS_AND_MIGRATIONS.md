# LINE COFFEE V3 — Data Contracts & Migration Workflow Foundation

**Phase:** 3 (Data contracts + migration workflow foundation) · **Created:** 2026-06-29
**Authority:** This file is the **reference for data-contract conventions and the
migration workflow.** It does not introduce business rules and does not override
the master plan. For phase order read `LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md`;
for the contract registry read `src/lib/types/README.md`.

> Phase 3 is **foundation, not features.** Its job is to make the existing
> real-backend ↔ frontend integration safer, clearer, and easier to extend before
> the heavier inventory/FIFO/accounting phases. No Phase 1/2 business rule changes.

---

## 1. How types are organized (the two-layer model)

There are two intentional layers of types. Both are correct; know which you are
touching.

1. **Canonical contracts — `src/lib/types/*`.** One designed shape per launch
   entity, type-only and additive. Some are already imported by the live data
   layers (`common`, `order` unions, `admin`); most are forward-looking for
   domains that have no DB table yet. Full status table: `src/lib/types/README.md`.

2. **Data-layer read/return shapes — `src/lib/**`.** Each data module declares the
   exact shape it reads back from a specific RPC/view, plus the DB **row** types it
   maps from. **These are what the UI consumes today.** They normalize nullable DB
   columns at the boundary (`String()` / `Number()` / `?? null`).

   | Module | Live contracts it owns |
   |---|---|
   | `src/lib/checkout.ts` | `CheckoutOrderResult` (+ `isCheckoutOrderResult` guard) |
   | `src/lib/account/customer-account.ts` | `CustomerOrderSummary/Detail/Item/Event`, `CustomerNotification`, `CustomerProfile`, `CustomerAddress(Input)`, wishlist (`string[]` of slugs), `GuestLinkResult` |
   | `src/lib/admin/admin-orders.ts` | `AdminOrderSummary/Detail/Item`, `AdminOrderStatusEvent`, `AdminOrderOverview`, status/fee update results |
   | `src/lib/admin/admin-catalog.ts` | `AdminProduct(+Meta/Size/Category)`, create/update inputs |
   | `src/lib/admin/admin-purchasing.ts` | **(Phase 4)** `Supplier(+Input)`, `Purchase(Summary/Detail/Item)`, `SupplierPayment`, `InventoryLot`, `Expense(+Input)`, create/receive/payment results |
   | `src/lib/catalog/public-catalog.ts` | `PublicCatalogProduct/Category/Size/Blend` |
   | `src/lib/auth/admin.ts` | `CurrentAdmin`, `CurrentAdminResult` |

**Rule:** the UI must never read a raw untyped Supabase response when one of these
contracts exists. Today it doesn't — every consumer imports a typed shape. Keep it
that way: new reads add to the owning module's contract, they don't widen `any` in
a component.

---

## 2. Phase 3 contract audit — findings

Audited the launch-critical entities (Product, ProductVariant, Category, Customer,
CustomerAddress, CustomerWishlistItem, CustomerNotification, Order, OrderItem,
OrderStatusEvent, InventoryStock, InventoryMovement, the checkout payload/result,
and admin order summaries/details) across Supabase RPCs/views → TS types →
data-layer functions → UI consumers.

**Headline: the live data layers are already well-typed and consistent.** Each has
explicit row types and safe nullable normalization; no UI depends on an untyped
response. The issues found were drift/clarity, not safety holes:

| # | Finding | Resolution in Phase 3 |
|---|---|---|
| F1 | `CheckoutOrderResult.payment_status` was `"pending" \| "pending_review"`, but Phase 1 (Decision 12) makes `create_checkout_order` always return `"pending"`. `order-success` had a dead `=== "pending_review"` branch. | **Fixed.** Narrowed the type and runtime guard to `"pending"` and removed the dead UI branch. |
| F2 | `common.ts` `Money` was documented as integer EGP, contradicting §6.7 (2-decimal `numeric`). | **Fixed (comment only).** Corrected to the 2-decimal rule. No runtime change. |
| F3 | CLAUDE.md claimed `ORDER_STATUS_EFFECTS` is "imported by admin-orders + accounting." It is referenced **only in comments**; the enforced rule lives in the SQL RPC + `ALLOWED_ADMIN_ORDER_TRANSITIONS`. | **Documented.** The contract itself is already Phase-1-correct (deduct at delivered). No code change; clarified header + registry. |
| F4 | Three contract headers (`common`, `order`, `admin`) said "imported by nothing yet" — now false. | **Fixed (comment only).** Headers now state live-vs-dormant status and point to the registry. |
| F5 | `src/lib/mock-data/account-data.ts` (MOCK_ORDERS / MockAddress / MockNotification) had **zero imports** after the account area went real. | **Removed.** Verified 0 references (path + every export name) before deletion. |
| F6 | `supabase/config.toml` `[db.seed].sql_paths = ["./seed.sql"]` pointed at a non-existent file; the catalog seed is `./seeds/20260625_catalog_seed.sql`, so `supabase db reset` loaded an **empty catalog**. | **Fixed.** Pointed at `./seeds/*.sql` (local CLI only; no production effect, no db push). |
| F7 | No generated Supabase DB types; `createClient` has no `Database` generic. | **Documented** (§4). Not generated — needs credentials/local DB; not a launch blocker. |
| F8 | `public-catalog.ts` repeats an identical 20-column `select` list in 5 fetchers. | **Noted, not changed.** Maintainability smell only; refactor is out of Phase 3 scope (no behavior issue). |

**Known, intentionally-unreconciled divergences (documented, not changed):**

- **Pricing model literal.** Catalog data layers use `pricingModel:
  "packaged-by-weight"`; canonical `product.ts` uses `fixed`/`per_kg`/
  `custom_builder`. Different vocabularies for the same idea. The data-layer literal
  is what the live UI uses; reconcile when the catalog schema is revisited
  (Phase 4+). Changing it now would touch the public catalog with no functional gain.
- **Loose-by-design `unknown`.** `OrderItem.custom_data` / `AdminOrderItem.customData`
  are `unknown` on purpose — builder payloads (custom espresso/flavor) are not
  modeled until Phases 8–9. This is a correct deferral, not a missing contract.
- **Account RPC boundary mapping.** `customer-account.ts` maps RPC rows from
  `Record<string, unknown>` via `String()`/`Number()`. That is the safe boundary
  normalizer, not an untyped leak — the function return types are concrete.

---

## 3. Contract ↔ Phase-1/2 RPC alignment (verified)

- **Checkout.** UI sends `cash`/`instapay`/`e-wallet`; `create_checkout_order`
  (migration `20260629120000`) maps to `cash_on_delivery`/`instapay`/`wallet` and
  sets `payment_status = 'pending'` for all methods. Delivery fee is recomputed
  server-side via `resolve_delivery_fee()`. `CheckoutOrderResult` now matches this
  exactly.
- **Admin orders.** `admin-orders.ts` reads `orders` + `order_items` +
  `order_status_events` and the Phase-1 columns (`delivery_zone`, `delivery_note`,
  `delivery_fee_overridden`). `AdminOrderOverview` derives `deliveredUnpaid` from
  real `payment_status` values — the "Delivered but Unpaid" alert is real, not mock.
- **Account ownership (Phase 2).** Account RPCs resolve ownership via
  `account_customer_id()` (registered by `auth.uid()`, guest by `guest_id`). The
  data layer still passes `p_guest_id` (the RPC ignores it for authenticated
  callers) — no contract change needed, ownership behavior preserved.
- **Wishlist.** Owner-scoped (`useWishlist`); the contract is a flat `string[]` of
  product slugs. No unread/read semantics.
- **Notifications.** `CustomerNotification` has **no `read` field** — correct,
  because there is no persisted read state. The contract must not imply unread/read.

---

## 4. Supabase DB type strategy

**Current state:** no generated DB types. `src/lib/supabase/client.ts` calls
`createClient(url, key, …)` with no `Database` generic, so the SDK returns loosely
typed data and each data layer casts to its own row type. This is intentional and
safe for now (every cast is followed by explicit normalization).

**Do not block on generation.** Generating types requires either a linked project
(access token / project ref) or a running local DB — credentials that are not
configured in this environment. It is **not** a launch blocker.

**Recommended process (when ready, run by the owner):**

```bash
# Option A — from the linked remote project (needs SUPABASE_ACCESS_TOKEN + project ref)
supabase login
supabase gen types typescript --project-id <project-ref> --schema public \
  > src/lib/supabase/database.types.ts

# Option B — from a local stack (needs Docker + `supabase start`)
supabase start
supabase gen types typescript --local --schema public \
  > src/lib/supabase/database.types.ts
```

Then wire the generic without rewriting the data layers:

```ts
// src/lib/supabase/client.ts
import type { Database } from "./database.types";
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, { /* … */ });
```

Adopt incrementally: keep the hand-written row types as the public contracts; use
the generated `Database["public"]["Tables"]/["Functions"]` types to **verify** them
(e.g. `satisfies`) rather than replacing them wholesale. Regenerate after every
applied migration. Until then, `src/lib/types/*` + the data-layer row types are the
single source of truth.

---

## 5. Migration workflow

### 5.1 Naming & order

- One file per change: `supabase/migrations/<UTC-timestamp>_<snake_summary>.sql`.
- Timestamp prefix is a 14-digit `YYYYMMDDHHMMSS` (lexical = chronological order).
  Keep new files strictly after the latest existing prefix.
- Seeds live in `supabase/seeds/*.sql` and run **after** migrations on
  `supabase db reset` (see `config.toml [db.seed]`). Seeds are data, not schema.

### 5.2 The authoring rule (from the master plan §3)

Migrations are **authored by Claude, reviewed by Codex, applied by the owner.**
Codex does not author migrations. **No `supabase db push` without explicit owner
approval.** Every migration stays *authored only* until the owner applies it.

### 5.3 Per-migration header checklist (paste into every new migration)

```sql
-- Migration: <timestamp>_<summary>
-- Phase: <n> (<phase name from the master plan>)
-- Purpose: <one line — what + why>
-- Idempotency: <yes/no> — uses IF NOT EXISTS / CREATE OR REPLACE / guarded DO blocks
-- Destructive: <no | yes: what data is dropped/rewritten and why it is safe>
-- Status: AUTHORED ONLY — not applied. Apply with `supabase db push` after Codex review + owner approval.
-- Rollback / repair: <how to undo, or "forward-fix only — see notes">
-- Depends on: <prior migration(s) this assumes>
```

### 5.4 Authoring rules (binding)

1. **Small and idempotent.** Prefer `add column if not exists`, `create … if not
   exists`, `create or replace function/view`, and guarded `do $$ … $$`. No giant
   schema rewrite — additive migrations only (master plan §5 Phase 3).
2. **Never edit an already-applied migration.** Fix forward with a new migration.
   The only exception is a critical correctness bug in an unapplied file.
3. **Non-destructive by default.** Archive/neutralize instead of delete (mirror the
   existing pattern: products archive, never hard-delete; guest shells are
   neutralized, not removed). If a migration must drop/rewrite data, that is a
   **STOP condition** (master plan §9) — get explicit owner approval.
4. **Preserve return signatures.** When replacing an RPC with `create or replace`,
   keep the JSON/row shape identical unless the matching data-layer contract is
   updated in the same phase.
5. **Grants & RLS explicit.** State any new `grant`/policy; never disable RLS or use
   the service role from the client.
6. **Balance check.** Confirm `$$` open/close pairs and function-body balance before
   handing to review.

### 5.5 Migration preflight (before any migration phase — incl. future ones)

Per master plan §6.3, before authoring a migration phase:

- [ ] confirm the seed path loads (now `./seeds/*.sql`);
- [ ] `supabase db reset` runs clean locally **if a local stack is available**;
- [ ] backup / staging rule checked (staging gets a backup first; production is
      §17–18 only);
- [ ] **owner approval recorded before any `db push`.**

### 5.6 Apply / reset / backup (owner-run commands, for reference)

```bash
# Local: rebuild from scratch (runs every migration in order, then seeds)
supabase db reset

# Apply authored migrations to the linked DB (owner approval required first)
supabase db push

# Inspect what would change without applying
supabase db diff

# Staging/production: take a backup BEFORE pushing
supabase db dump --file backup_<date>.sql
```

Local `db reset` is the safe rehearsal; `db push` against a real DB is owner-gated.

---

## 6. Phase 3 boundaries (what this phase did NOT do)

- No `supabase db push`; no new SQL migration authored (the only DB-workflow change
  is the **local** `config.toml` seed path).
- No Phase 1/2 business-rule changes (delivery zones, deduction timing, payment
  defaults, customer ownership all untouched).
- No public redesign, no service-role code, no broad refactor, no Phase 4 work.
- Mock admin modules left intact; only a fully-unused mock file was removed.
