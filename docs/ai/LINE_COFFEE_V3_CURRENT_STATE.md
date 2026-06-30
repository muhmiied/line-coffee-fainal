# LINE COFFEE V3 — Current State

Last updated: 2026-06-28

This file is the #1 source of truth for future AI sessions. If older planning docs, audits, prompts, or the `CLAUDE.md` change log conflict with this file, **follow this file.**

> **Major correction (2026-06-28):** This project is **no longer "mock-only."** The catalog, checkout, real order creation, admin orders, and the customer account area are now **real Supabase**. The old "mock UI buildout / no backend / Marketing is the active task" framing in previous versions of this file is obsolete and has been removed.

---

## AI Reading Order

1. `CLAUDE.md` — architecture, locked decisions, current position, rules.
2. **This file** — current REAL/MOCK/MISSING state.
3. `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` — **the official execution reference (phase order, gates, scope). This is where we are heading.**
4. `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md` — where every public text/image lives (used instead of a Media Studio).
5. `docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` — locked decisions + context/history only; **not** the phase-execution source (its phase numbering is superseded by the master plan).
6. `docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md` — deep model reference only, **never an execution plan**. Its "current reality" columns are pre-2026-06-27 and outdated.
7. Then read only the exact source/migration files the current task needs.

Do not scan the whole repository by default.

---

## Architecture In One Paragraph

The entire app runs in the browser on the Supabase **anon/publishable key** (`src/lib/supabase/client.ts`) — there is no service-role server. The trust boundary is therefore **the database**: all writes go through **SECURITY DEFINER RPCs** that validate and compute server-side (prices are re-read from the DB, never trusted from the client). Customer-area data is scoped by a device **`guest_id`** (UUID in `localStorage`, created by `getOrCreateGuestId()` in `src/lib/checkout.ts`, validated 8–64 chars `^[A-Za-z0-9_-]+$`). Admin data is gated by the `admin_users` table + `is_admin()`.

---

## REAL — Supabase-backed and working

| Area | How it's real | Key files / RPCs |
|---|---|---|
| **Catalog (public)** | Reads `public_products` / `public_categories` / `public_product_variants` views | `src/lib/catalog/public-catalog.ts` |
| **Catalog (admin CRUD)** | Create / edit / archive / restore products + categories | `src/lib/admin/admin-catalog.ts`; RPC `create_admin_product` |
| **Checkout → real order** | `create_checkout_order` RPC: creates `orders` + `order_items` (price snapshot from DB), upserts guest/registered customer, idempotent on `checkout_attempt_id` | `src/app/(public)/checkout/page.tsx`, `src/lib/checkout.ts` |
| **Inventory reservation** | `inventory_stock` (kg **per product**: `available_kg`/`reserved_kg`) + `inventory_movements` ledger | migration `20260627100000` |
| **Admin Orders** | Real list/detail + status transitions with inventory effects | `src/lib/admin/admin-orders.ts`; RPC `update_admin_order_status` |
| **Customer Account** | Orders, order detail, profile, addresses, wishlist, notifications. Ownership resolved per caller — see the Phase 2 note below | `src/lib/account/customer-account.ts` |
| **Header notifications** | Bell dropdown reads real `order_status_events` | `src/components/layout/public/PublicHeader.tsx` |
| **Auth** | Real Supabase auth; `/admin` gated via `admin_users` (role/status) | `src/lib/auth/admin.ts`, `useCurrentAdmin` |

**Inventory lifecycle (Phase 1):** reserve at checkout → keep reservation through `shipped` → **deduct at `delivered`** → release on cancel. This now matches Locked Decision 6. ⚠️ The fix lives in migration `20260629120000_phase1_delivery_deduction_payment.sql`, which is **authored but not yet applied** — until the owner runs `supabase db push`, the live DB still deducts at `shipped`. (Phase 5 re-implements deduction at lot level.)

**Customer ownership (Phase 2 — authored, not yet applied):** account data is no longer device-only. Migration `20260629130000_phase2_customer_identity_ownership.sql` adds `account_customer_id(p_guest_id)` — a unified resolver: authenticated callers resolve by `auth.uid()` (registered customer, **cross-device**); anonymous callers by validated `guest_id` (guest customer, **same-device**). Account RPCs now scope orders by `orders.customer_id` (not the raw `guest_id`), so registered customers read their own orders/profile/addresses on any device, profile/addresses finally work for registered customers, and a registered order can no longer leak to a different person using the same device as a guest. Wishlist gained an `auth_user_id` path. `link_guest_data_to_account()` (authenticated-only) promotes/merges **same-device** guest data on signup/login (orders, addresses, wishlist) — **no auto-merge by phone/email**. Until the owner applies it, the live account stays Phase-1 device-scoped (guest_id only).

---

## MOCK — UI exists, no persistence

These admin modules render from `src/lib/mock-data/admin/*` (or local component state) and **reset on refresh**:

- Admin **Dashboard** (all cards) — `dashboard-mock.ts`
- Admin **Inventory** UI — `inventory-mock.ts` (real inventory data lives in `inventory_stock`, but this screen is not wired to it yet)
- **Customers** — `customers-mock.ts`
- **Marketing** — `marketing-mock.ts` (promo codes do **not** validate at checkout)
- **Accounting** — `accounting-mock.ts` (purchases / expenses / suppliers all mock)
- **Analytics** — `analytics-mock.ts`
- **CMS** — `cms-mock.ts` (reviews approval, blog, contact inbox, legal — all mock)
- **Espresso Manager** — beans are local component state
- **Flavor Manager** — flavors/bases are local component state
- **Cart** — `localStorage` only (`line-cart-v1`), by design until checkout

---

## MISSING — no database at all yet

FIFO inventory **lots** · `order_item_components` (custom espresso breakdown) · **raw-bean** inventory (separate from finished goods) · **packaging** stock · **purchases** / purchase_items · **suppliers** / supplier_payments · **expenses** · **promo_codes** table + checkout application (`discount_total` is always 0) · **refunds/returns** records · **reviews** · **contact_messages** · **analytics** events. **Media Studio does not exist** — and per Decision 1 it never will (replaced by the Content Map).

> **Delivery zones (Phase 1 — authored, not yet applied):** zone-based delivery is now resolved **server-side** in `create_checkout_order` via `resolve_delivery_fee()` (Shorouk/Madinaty 30 · Haram/6 October/Sheikh Zayed 100 · remaining Cairo/Giza 50 · other governorates 0 + courier note), with an admin per-order override (`update_admin_order_delivery_fee`). This replaces the old hardcoded "free ≥500 EGP else 50" rule. Lives in migration `20260629120000`; the old rule remains live until the owner applies it.

---

## Custom Builders — current behavior

Both builders compute correctly and add to cart (`kind: "espresso-blend"` / `"flavor-mix"`, no slug) but are **REJECTED at checkout** — `create_checkout_order` rejects any line where `kind != "product"`. Wiring them is Phases 8 (espresso = real raw-bean manufacturing) and 9 (flavor = cost-only) in the master plan, per the locked decisions.

---

## Public Website (visually locked)

Routes exist and are styled; the homepage visual direction is **locked** — do not redesign:
`/` · `/products` · `/products/category/[slug]` · `/products/[slug]` · `/make-your-espresso` · `/make-your-flavor` · `/cart` · `/checkout` · `/order-success` · `/about` · `/blog` · `/blog/[slug]` · `/contact` · `/privacy` · `/terms` · `/shipping` · `/returns`.

Account/auth: `/auth/login` · `/auth/signup` · `/auth/forgot-password` · `/auth/reset-password` · `/account/{profile,orders,orders/[id],addresses,wishlist,notifications,settings}`.

See `LINE_COFFEE_V3_CONTENT_MAP.md` for which file holds each page's text and images.

---

## Locked Business Decisions (summary — full text in the roadmap doc)

1. **Media Studio cancelled.** Site copy/images edited in code; product images via Admin Products. Use the Content Map.
2. Regular products (Turkish/Espresso/Flavor ready) are **bought finished**, not manufactured.
3. **Make Your Espresso is the only manufacturing** — pulls raw beans by ratio.
4. **Make Your Flavor is cost-only** — no stock deduction.
5. **FIFO** costing — every purchase creates a lot; oldest consumed first.
6. Product/raw **reserved at Place Order, deducted at Delivered**.
7. **Packaging deducts immediately at Place Order.**
8. Discount reduces **Net Sales**, not COGS.
9. Promo applies to **product subtotal only** (not delivery).
10. **Zone delivery:** Shorouk/Madinaty 30 · Cairo/Giza 50 · Haram-end/October/Sheikh Zayed 100.
11. **Governorates:** customer pays the courier directly (outside Line Coffee revenue).
12. **All payments start Pending;** admin changes status manually.
13. Customer can edit an order **before shipping**; after shipping admin-only.
14. **Returns/refunds are admin-only** (full/partial, restock vs damaged).
15. **Reviews show only after admin approval.**
16. **Purchases** = anything entering stock; **Expenses** = anything that doesn't.
17. **Suppliers** support paid / partially-paid / unpaid balances.
18. `/admin` must stay protected (already real).
19. **Product images** managed from Admin Products (Supabase Storage).
20. Anything unspecified → the practical default that doesn't contradict the above.

---

## Hard Restrictions (unchanged)

- No homepage/public redesign; preserve the premium dark direction and EN/AR + RTL/LTR.
- No unrelated rewrites/refactors; keep patches minimal and scoped to the task.
- No `supabase db push`, no migrations applied, no commits/pushes **unless the task explicitly says so**.
- Every migration is **authored only** until the owner applies it.
- Identify exact files before editing; do not scan the whole repo.
- Every agent appends a `CLAUDE.md` change-log entry after making changes.

---

## Notes For Future AI Sessions

- `CLAUDE.md` now opens with a **Current Architecture + Locked Decisions + Doc Reading Order** block — read that first; the long change log below it is history.
- `README.md` is an entry point, not the detailed source of truth.
- The phased plan (what to build next, in order) lives in `LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` (canonical). **Current position: Phase 0 + Phase 1 committed. Phase 2 (customer identity / ownership / account correctness) is implemented; migration `20260629130000` (`account_customer_id` resolver, customer_id-scoped account RPCs, wishlist `auth_user_id` path, `link_guest_data_to_account`) has been applied via `db push`. A follow-up client-only bugfix made the wishlist owner-scoped (auth user vs guest), fixing a cross-account localStorage leak — no migration. **Phase 3 (data contracts + migration workflow foundation) is implemented (code + docs only — no SQL migration, no `db push`):** the checkout result contract is aligned to Phase 1 (`payment_status` always `pending`), the `Money` precision comment + canonical-contract headers were corrected, the unused mock-era `account-data.ts` was removed, the local `config.toml` seed path was fixed to `./seeds/*.sql`, and `LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md` + `src/lib/types/README.md` were added (contract registry, DB-type strategy, migration workflow + checklist). **Phase 4 next.**
