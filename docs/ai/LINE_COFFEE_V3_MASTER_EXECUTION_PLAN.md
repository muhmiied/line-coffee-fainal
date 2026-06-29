# LINE COFFEE V3 — MASTER EXECUTION PLAN

**Status:** ✅ **CANONICAL — the single official execution reference.**
**Created:** 2026-06-29 · **Owner-approved merge of:** Claude roadmap + Codex planning review + z.ai business review + owner decisions.

> **Authority of this document**
> - This file is the **only** source used to decide *what phase comes next and what it contains.*
> - It **supersedes the phase numbering** in every other doc. Where any other doc's phase order/number conflicts with this file, **this file wins.**
> - `LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` remains the **decisions + context/history** reference, but is **no longer the phase-execution source**.
> - `LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md` and `LINE_COFFEE_V3_SYSTEM_AUDIT.md` are **deep references only — never an execution plan.**
> - For verified live state read `LINE_COFFEE_V3_CURRENT_STATE.md`. For where public copy/images live read `LINE_COFFEE_V3_CONTENT_MAP.md`.

---

## 0. Purpose

This document is the single execution plan for Line Coffee V3 after merging:

- Claude documentation roadmap.
- Codex code-aware planning review.
- z.ai business-logic review.
- Owner decisions.

The project is **not mock-only anymore**. It is currently a **Hybrid system**:

- Some domains are real Supabase.
- Some admin modules are still mock UI.
- Some launch-critical domains are still missing.

The goal is to turn Line Coffee V3 into a real operating ecommerce system: customer actions, admin actions, inventory, accounting, and customer account all flow through one safe source of truth.

---

## 1. Non-negotiable project rules

### 1.1 Hard business decisions (locked — change only by explicit owner instruction)

1. **Media Studio is cancelled.** No Media Studio module. General public copy/images stay code-managed via the Content Map. Product images are managed from Admin Products + Supabase Storage later.
2. **Public website visuals are locked.** No redesign, no hero/layout/art-direction changes unless explicitly requested.
3. **Finished products are bought finished.** Turkish, Espresso ready blends, Easy Coffee, Flavor Coffee ready products, Coffee Mix, Cappuccino, Hot Chocolate are finished goods.
4. **Make Your Espresso is the only manufacturing / custom stock flow.** It consumes raw coffee beans by ratio.
5. **Make Your Flavor is cost-only at launch.** It does not consume stock. It stores sale-price snapshot and cost snapshot only. Accepted business risk for launch.
6. **FIFO costing.** Every purchase creates lots. Reservation/deduction consumes oldest lots first. COGS comes from actual consumed lots.
7. **Reserve at Place Order. Deduct at Delivered.** Place Order reserves product/raw stock. Delivered deducts and recognizes revenue/COGS. Cancel releases reservations.
8. **Packaging deducts at Place Order.** Packaging is consumed immediately when the order is placed. Cancel does not auto-return packaging.
9. **Discount reduces Net Sales, not COGS.**
10. **Promo applies to product subtotal only.** Delivery is never discounted.
11. **Delivery zones:**
    - Shorouk / Madinaty = 30 EGP.
    - Cairo / Giza = 50 EGP.
    - Haram-end / 6 October / Sheikh Zayed = 100 EGP.
    - Governorates: `delivery_fee = 0`. The customer pays the courier directly; the delivery fee is outside Line Coffee revenue unless an admin manually overrides it per order.
12. **All payments start Pending.** Cash / InstaPay / Wallet all begin pending. Admin manually changes payment status.
13. **Order edit before shipping.** Customer can edit before shipped. After shipped, admin-only. After delivered, use returns/refunds.
14. **Returns / refunds admin-only.**
15. **Reviews approval-only.**
16. **Purchases vs Expenses:** Purchases = anything entering stock. Expenses = anything not entering stock.
17. **Suppliers support paid / partial / unpaid balances.**
18. **/admin must stay protected.**
19. **Product images via Admin Products + Supabase Storage.**
20. **Anything unspecified uses a practical default that does not contradict these decisions.**

---

## 2. Tool ownership

### Claude Code owns
- Cross-domain architecture.
- Supabase schema and migrations.
- RLS policies and SECURITY DEFINER RPCs.
- Transactional order/stock/payment logic.
- Checkout engine.
- FIFO / reservation / COGS.
- Complex admin/customer UI wiring after backend exists.
- Documentation updates and change-log entries.

### Codex owns
- Read-only reviews.
- Small scoped patches.
- Tests and verification.
- Type/domain contract files.
- Migration review and SQL sanity checks.
- Lint/type/build fixes.
- Small UI bindings where schema/RPC already exists.
- Final reports before commit.

### z.ai role
z.ai is a **business-logic reviewer only**. It must **not** be treated as a source of truth for code state. Useful z.ai checks: packaging rules, flavor cost-only risk, espresso lot-level reservation, order-edit edge cases, refund/restock accounting, delivered-but-unpaid alerts, saved addresses in checkout, analytics event definitions.

---

## 3. Collaboration rules

1. One agent works on a phase at a time.
2. Do not let Claude and Codex edit the same files simultaneously.
3. Every phase starts by reading (in this order):
   - `CLAUDE.md`
   - `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`
   - `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` (this file)
   - `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md`
   - `docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` (decisions/context only)
   - relevant source/migration files only
4. No whole-repo refactor.
5. No public redesign.
6. No Supabase `db push` unless the owner explicitly approves.
7. Migrations are **authored first by Claude, reviewed by Codex, then applied by the owner.** Codex does not author migrations.
8. Every implementation phase needs:
   - exact files list before editing,
   - small scoped patch,
   - `npx tsc --noEmit`,
   - `npm run lint`,
   - `npm run build` where feasible,
   - targeted manual smoke test,
   - DB/RPC tests where a migration exists,
   - `git status --short`,
   - CLAUDE.md change-log entry **and** a `CURRENT_STATE.md` real/mock/missing refresh.
9. Commit only after the owner approves the phase result.
10. Any incomplete module must be honest: hidden, disabled, or clearly marked sample/mock.

---

## 4. Phase gate format

Each phase must report:

```text
Phase:
Goal:
Owner:
Reviewer:
Files touched:
Migrations:
DB push needed:
Validation:
Manual tests:
Risks:
Next phase readiness:
```

---

## 5. Final phase roadmap

### 5.0 Canonical phase numbering (authoritative — overrides every other doc)

| # | Phase |
|---|---|
| **0** | Source-of-truth closure and coordination lock |
| **1** | Delivery zones + deduction timing + payment defaults |
| **2** | Customer identity / ownership / account correctness |
| **3** | Data contracts + migration workflow foundation |
| **4** | Purchases / suppliers / expenses / inventory lots foundation |
| **5** | FIFO reservations / deductions / COGS / real inventory engine |
| **6** | Packaging inventory and deduction rules |
| **7** | Promo codes + server-side pricing |
| **8** | Make Your Espresso (real manufacturing) |
| **9** | Make Your Flavor (cost-only) |
| **10** | Advanced order lifecycle / payment events / order editing |
| **11** | Returns / refunds |
| **12** | Product images + real Admin Customers |
| **13** | Reviews / contact / CMS cleanup |
| **14** | Accounting / dashboard / analytics |
| **15** | Remove or hide launch-scope mocks |
| **16** | Quality / security / SEO / accessibility / performance |
| **17** | Staging UAT |
| **18** | Production launch |

> Any older numbering (e.g. "packaging = Phase 10", "identity = Phase 13", "promo = Phase 3", "espresso = Phase 6") belongs to a superseded scheme. Use **only** the table above.

---

### Phase 0 — Source-of-truth closure and coordination lock
**Goal:** make docs and agent instructions consistent before implementation.
**Owner:** Claude · **Reviewer:** Codex (read-only) · **Migration:** No · **DB push:** No

**Scope**
- Commit the current Phase 0 documentation after review.
- Ensure these files are aligned: `CLAUDE.md`, `CURRENT_STATE.md`, this master plan, `CONTENT_MAP.md`, `FINAL_DECISIONS_AND_ROADMAP.md`, `OPERATING_MODEL_BLUEPRINT.md`.
- Update stale high-level docs if they still say: mock-only, no backend, Media Studio future, Marketing is the active module, old shipped-deduction logic.
- Fold in z.ai clarifications if not already covered (espresso lot-level reservation, flavor cost-only risk, packaging mapping rule, same-device guest linking only, pricing snapshots, delivered-but-unpaid alert, refund/restock COGS basis, governorates delivery note, saved addresses in checkout, WhatsApp/contact to `site_settings`, analytics event list).

**Gate**
- `git status --short` shows only docs/memory/protocol files. No `src/`. No `supabase/`. No migrations.
- Codex verdict: Approve or Approve-with-minor-docs-patch.
- Commit Phase 0 docs.

### Phase 1 — Delivery zones + deduction timing + payment defaults
**Goal:** fix the most dangerous existing mismatches in the current real checkout/orders.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** likely Yes · **DB push:** owner approval required

**Scope**
1. Replace current delivery logic: remove "free over 500 / flat 50" as source of truth; add zone-based local delivery (see §6.5 for the resolution algorithm); governorates → `delivery_fee = 0` + courier note (outside Line Coffee revenue unless an admin overrides); fee computed **server-side in `create_checkout_order`** (never trusted from UI); save delivery-fee snapshot + delivery note on the order.
2. Admin delivery override: admin can override delivery fee per order; the override is logged as an event/audit/order note.
3. Inventory timing: move deduction from `shipped` → `delivered`; `shipped` keeps reservation only; cancel before delivered releases reservation.
4. Payment: Cash/InstaPay/Wallet all start `pending`; Delivered does **not** auto-mark paid; add a visible "Delivered but Unpaid" concept for later dashboard/admin alert.

**Not in scope:** packaging, FIFO lots, order editing, promo, builders, accounting.
**Re-touch note:** the deduction change here lands on the current simple kg model; Phase 5 re-implements it at lot level. Keep Phase 1's deduction change **minimal** (move the trigger point only) — do not over-engineer internals that Phase 5 will rewrite. Phase 1 may keep the existing checkout address form as-is; registered saved/default-address selection is **Phase 2** (see §6.11).

**Gate**
- Standard product checkout creates an order with the correct zone fee.
- Governorate order has no internal delivery revenue + has the courier note.
- `shipped` does not deduct stock; `delivered` deducts reserved stock; cancel releases reservation.
- Payment starts pending for all methods.
- Type/lint/build pass; migration reviewed before db push.
- **Regression tests for `create_checkout_order` start here (see §6.4).**

### Phase 2 — Customer identity, ownership, and account correctness
**Goal:** fix customer ownership before building more operational logic on top.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** likely Yes · **DB push:** owner approval required

**Scope**
1. Unified customer resolver: registered customer by `auth.uid()`; guest customer by `guest_id`; **never trust email/phone for ownership.**
2. Fix account RPCs: profile, addresses, orders, order detail, wishlist, notifications. **Phase 2 owns registered-customer address ownership and checkout saved/default-address resolution** — registered customers can select a saved/default address in checkout after Phase 2; guests keep using the checkout form (see §6.11).
3. Registered account on a new device sees account-owned data, not just old localStorage `guest_id`.
4. Guest flow: guest sees same-device orders by `guest_id`.
5. Guest→registered linking: same-device guest data can link after signup/login; **no automatic merge by phone/email**; move/link orders, addresses, wishlist safely.
6. RLS/security tests: one customer cannot read another customer's order/address.

> **Implementation note (verified):** customer **authentication** is already real Supabase Auth (`src/lib/hooks/useAuth.ts`), but account **data** is still `guest_id`-scoped (`src/lib/account/customer-account.ts`). So this phase must **stamp/link `auth_user_id` at order creation** and add an auth-based read path alongside `guest_id`, then safely migrate same-device guest data on login/signup.

**Gate**
- Guest checkout order visible on same device.
- Registered customer logs in on another device and sees linked account data.
- No broad customer lookup by phone/email.
- RLS/RPC tests pass; type/lint/build pass.

### Phase 3 — Data contracts and migration workflow foundation
**Goal:** stabilize domain shapes and the DB workflow before adding lots/FIFO.
**Owner:** Codex (types/review) + Claude (migration workflow) · **Reviewer:** the other agent · **Migration:** maybe small config/seed fixes (authored by Claude) · **DB push:** No production push

**Scope**
1. Define/finalize contracts for: products, variants, categories, customers, addresses, orders, order items, finished goods, raw beans, packaging, inventory lots, reservations, payments, returns, promo, accounting snapshots. Prefer generating types from the schema (single source of truth) over hand-authoring in parallel.
2. Fix migration workflow: local reset works; seed path correct; staging workflow documented; backup procedure documented.
3. Principle: every future phase uses small idempotent migrations; no giant schema rewrite.

**Gate**
- Type contracts exist or are documented.
- `supabase db reset` works locally if touched.
- No launch-module behavior changes; type/lint/build pass.

### Phase 4 — Purchases, suppliers, expenses, and inventory lots foundation
**Goal:** create real inputs for stock and cost.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope** — add real tables: `inventory_items`, `inventory_lots`, `suppliers`, `purchases`, `purchase_items`, `supplier_payments`, `expenses`.
**Rules:** every purchase creates an inventory lot from the start; purchase increases stock; purchase creates a supplier payable if unpaid/partial; supplier payment reduces payable; expense never changes stock; **convert current opening stock into opening lots**; keep the current order engine stable until the FIFO phase.
**Admin UI:** Purchases page / accounting sub-tabs become real for add purchase, add supplier, pay supplier, add expense. Do not overbuild accounting reports here.

**Gate**
- Finished-product purchase → lot + stock↑ + movement + supplier balance.
- Raw-bean purchase → raw-bean lot. Packaging purchase → packaging lot.
- Partial supplier payment leaves correct balance.
- Expense appears in expenses and does not affect stock.
- Type/lint/build pass; DB migration reviewed.

### Phase 5 — FIFO reservations, deductions, COGS, and real inventory engine
**Goal:** replace simple kg stock logic with lot-level operational truth.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope**
1. Lot-level reservation: Place Order reserves from oldest available lots; reservation stores exact lot allocations; Delivered deducts the same reserved allocations; Cancel releases the same allocations.
2. COGS calculated from consumed lot costs; store COGS snapshot per order item / consumption rows.
3. Admin Inventory reads from the final lot/movement model; manual adjustments; low-stock alerts; **no temporary wiring to the obsolete model** if it causes rework.
4. Concurrency: no overselling under simultaneous checkout; atomic RPC/transaction.

**Gate**
- Two lots with different costs consumed FIFO; partial stock across lots works.
- Simultaneous orders cannot oversell; cancel restores availability.
- Delivered records accurate COGS; admin inventory reflects real lots/movements.
- Type/lint/build pass; DB/RPC tests pass.

### Phase 6 — Packaging inventory and deduction rules
**Goal:** implement packaging as real operational stock.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Locked packaging rule**
- 250g = 1 × 250g bag.
- 500g = 1 × 500g bag if available; fallback = 2 × 250g.
- 1kg = 1 × 1kg bag if available; fallback = 2 × 500g; final fallback = 4 × 250g.
- Priority: exact matching bag first, then the lowest number of smaller bags.

**Scope:** packaging catalog/stock/lots; `order_packaging_lines`; packaging deduction at Place Order; cancellation does not auto-return packaging; admin manual packaging adjustment; packaging shortage does **not** block the order (raises an admin alert/shortage flag); **packaging consumption records cost basis from packaging lots (FIFO) for later accounting**; packaging purchases come from Phase 4.

**Gate**
- Each order weight creates correct packaging lines per the locked rule.
- Packaging deducted at Place Order, not Delivered; cancel does not auto-return.
- Admin can manually adjust packaging; no product checkout is blocked only due to packaging shortage.
- Type/lint/build pass.

### Phase 7 — Promo codes and final server-side pricing engine
**Goal:** make discounts real and safe.
**Owner:** Claude (DB/RPC) + Codex (tests/UI review) · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope:** `promo_codes`, `promo_redemptions`; server-side validation (active/inactive, expiry, usage limit, per-customer limit if implemented, min product subtotal, fixed/percentage); applies to **product subtotal only**; never discounts delivery; never changes COGS; stores promo snapshot on the order; checkout field appears only when validation exists; Marketing Promo Codes admin becomes real. Marketing Offers may stay hidden/deferred until rules are fully defined. Announcement Bar may remain code-managed unless separately moved to `site_settings`.

**Gate**
- Invalid/expired code rejected server-side; min subtotal + usage limit enforced.
- Product subtotal only; delivery unaffected; promo snapshot + redemption created idempotently.
- Type/lint/build pass.

### Phase 8 — Make Your Espresso real manufacturing
**Goal:** accept custom espresso checkout with raw-bean FIFO inventory.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope:** move beans/config to DB; Espresso Manager becomes real; the public builder reads the same source; cart stores structured blend config; checkout accepts custom espresso item; server validates (ratios total 100%, beans exist + active, price recalculated server-side, required grams per bean from weight); `order_item_components` stores bean_id, ratio, required_qty, reserved_lot_allocations, cost basis; Place Order reserves raw-bean lots; Delivered deducts same reserved lots; COGS from raw-bean lots.

**Gate**
- 250g blend with multiple beans reserves exact grams; multi-lot bean allocation works.
- Delivered consumes the same lots; customer/admin/account show blend config; accounting sees correct COGS.
- Type/lint/build pass.

### Phase 9 — Make Your Flavor cost-only
**Goal:** accept flavor builder checkout without stock movement.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope:** move bases/flavors/cost settings to DB; Flavor Manager becomes real; the public builder reads the same source; checkout accepts custom flavor item; server validates (base active, flavor active, weight valid, price recalculated server-side); stores sale-price snapshot, base cost/kg snapshot, flavor cost/kg snapshot, total cost snapshot, selected config; **no inventory movement**; no base-inventory blocker at launch; document the accepted risk.

**Gate**
- Custom flavor order succeeds; cost/profit calculated; no stock movement created.
- Admin/account/order detail show config; type/lint/build pass.

### Phase 10 — Advanced order lifecycle, payment events, and order editing
**Goal:** make order management operationally safe after inventory/promo/builders exist.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope**
1. Order edit before shipped (atomic): release old reservations → recalculate items → revalidate stock → reapply promo → recalculate delivery → reserve new stock; packaging deducts only the increase (no auto-return on decrease); log an event.
2. Customer cancellation: `pending` → customer can cancel directly; `preparing` → customer requests, admin approves; `shipped`/`delivered` → no customer cancel.
3. Payment events logged: pending / paid / cancelled / refunded / partially_refunded / needs_follow_up; Delivered does not auto-set paid.
4. Notifications: order status events; payment events where relevant; customer account notifications.

**Gate**
- Edit never leaves a stock/total/promo mismatch; payment timeline exists.
- Delivered-but-unpaid visible in admin; customer cannot edit after shipped.
- Type/lint/build pass.

### Phase 11 — Returns and refunds
**Goal:** complete post-delivery operations.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope:** `refund_records`, `return_items`; full/partial refund; per item: restock sellable vs damaged/no-restock; sellable return restores stock at original COGS basis or linked return lot; damaged → no stock return, loss/adjustment recorded; refund updates payment status + accounting + timeline + notification; prevent double refund; returned quantity cannot exceed sold quantity.

**Gate**
- Partial + full refund work; damaged item creates loss/no stock; sellable item restores inventory correctly.
- Accounting updated; type/lint/build pass.

### Phase 12 — Admin Products images and Admin Customers real
**Goal:** finish operational admin surfaces that depend on real data.
**Owner:** Claude (storage/RLS) + Codex (UI binding/review) · **Reviewer:** Codex · **Migration:** Yes (storage policies if needed) · **DB push:** owner approval required

**Scope**
1. Product images: Supabase Storage bucket; image/gallery upload from Admin Products; MIME/size validation; alt text; safe replacement/delete; public catalog reads uploaded images.
2. Admin Customers: reads real customers; real order history; real addresses; computed segments (VIP, repeat, new, inactive, at-risk, wholesale-potential if manually tagged later); no mock customers in visible launch admin.

**Gate**
- Admin uploads a product image, public product updates; invalid file rejected.
- Customer list matches real orders/customers; no mock customer numbers visible.
- Type/lint/build pass.

### Phase 13 — Reviews, contact, and CMS cleanup
**Goal:** make customer-facing content flows honest and real.
**Owner:** Claude · **Reviewer:** Codex · **Migration:** Yes · **DB push:** owner approval required

**Scope:** `reviews`, `contact_messages`; review starts pending; admin approve/reject; approved reviews render publicly; contact form writes a real message; admin contact inbox real; WhatsApp click/source tracking optional; CMS shows only real supported areas; hide/remove fake Blog/Legal editors if they are code-managed; update the Content Map whenever something moves static → dynamic.

**Gate**
- Contact-form message appears in admin; pending review does not show publicly; approved review shows publicly.
- No fake CMS publish/save buttons; type/lint/build pass.

### Phase 14 — Accounting, dashboard, and analytics
**Goal:** make owner reporting real.
**Owner:** Claude (derivation logic) + Codex (tests/reports review) · **Reviewer:** Codex · **Migration:** Yes (analytics events if not already) · **DB push:** owner approval required

**Accounting:** calculate from real sources — Gross Sales, Discounts, Net Sales, FIFO COGS, Packaging cost, Gross Profit, Expenses, Net Profit, Inventory value, Supplier payables, Refund adjustments, Cash collected (separate from revenue recognized). Revenue recognized at Delivered; cash/payment tracked separately; pending payment does not block revenue recognition but appears as receivable/follow-up; delivered-but-unpaid alert visible.
**Dashboard:** today orders, pending orders, delivered-but-unpaid, low stock, best sellers, sales/revenue, pending payments, recent messages/reviews.
**Analytics:** anonymous `session_id`, `page_view`, `product_view`, `add_to_cart`, `begin_checkout`, `order_created`, UTM/source, contact/WhatsApp click.

**Gate**
- Accounting report matches a manual sample; COGS matches lot consumption.
- Dashboard no longer uses mock figures; analytics records events; type/lint/build pass.

### Phase 15 — Remove or hide all launch-scope mocks
**Goal:** no visible fake operational data at launch.
**Owner:** Codex (search/review) + Claude (patches) · **Reviewer:** the other agent · **Migration:** No (unless discovered issue) · **DB push:** No

**Scope:** search for visible imports from `src/lib/mock-data/admin/*`; remove/hide/label incomplete modules; hide modules not ready for launch; delete dead mock files only after zero-import verification; large admin pages split only if needed for maintainability (not a redesign); every visible route is either real or an honest empty state.

**Gate**
- No mock sales/customers/inventory/accounting numbers visible; no fake save/publish buttons.
- Launch-visible sidebar only contains real or honest modules; type/lint/build pass.

### Phase 16 — Quality, security, SEO, accessibility, performance
**Goal:** production hardening.
**Owner:** Codex (tests/lint/security review) + Claude (fixes) · **Reviewer:** both · **Migration:** maybe · **DB push:** owner approval if needed

**Tests:** unit (delivery fee, pricing, promo validation, packaging rules, FIFO allocation, returns/refunds); DB/RLS (customer ownership, admin protection, storage policies); concurrency (simultaneous checkout, reservation race); Playwright E2E (guest standard order, registered order, admin status flow, cancel, return, espresso builder, flavor builder, promo, purchase/FIFO/accounting).
**Security:** no service role in client; RLS review; RPC ownership checks; input validation; safe errors; rate-limit sensitive actions where practical.
**SEO:** metadata, sitemap, robots, product structured data, canonical/hreflang if feasible, OG images.
**A11y/performance:** focus traps for drawers/modals; keyboard nav; image optimization; LCP review; mobile/RTL check.

**Gate**
- Lint/tsc/test suite/production build green; no Critical/High security findings; no public visual redesign.

### Phase 17 — Staging UAT
**Goal:** validate real business flows before production.
**Owner:** Owner + Claude · **Reviewer:** Codex · **Migration:** apply to staging only · **DB push:** staging owner-approved

**Scope:** staging DB backup first; apply migrations in order; seed realistic data; test scenarios (guest order, registered order, same-device guest linking, ready product order, espresso order, flavor order, promo, order edit, cancel, return/refund, purchase finished/raw/packaging, FIFO COGS, supplier partial payment, expense, accounting report, product image upload, contact/review, dashboard, analytics); Vercel preview env; rollback plan.

**Gate**
- All P0/P1 scenarios signed off; no critical defects; owner confirms business numbers make sense.

### Phase 18 — Production launch
**Goal:** launch safely.
**Owner:** Owner + Claude · **Reviewer:** Codex · **Migration:** Yes (production) · **DB push:** owner explicitly approves

**Scope:** final backup; freeze changes; apply migrations in order; deploy Vercel; connect domain; configure env vars; smoke test (checkout, admin order, account order, status update, payment status, inventory, accounting); first-week monitoring (orders, stock, COGS, payments, supplier balances, logs, customer messages).

**Gate**
- Real order processed end-to-end; admin can operate; customer can track; numbers reconcile; rollback/runbook updated.

---

## 6. Execution clarifications (locked details, deferrals, preflight, testing)

These resolve the open points from the plan review. They are binding alongside §1.1.

### 6.1 Owner Settings UI — **deferred**
- A full owner-editable Settings UI is **deferred** (not a launch blocker).
- Phase 1 may add **config/settings foundation only** where needed for delivery rules (e.g. a `site_settings`-backed default zone-fee table read server-side).
- A full editable Settings UI for contact, WhatsApp, announcements, social links, and delivery fees can come **later, after core operations stabilize.**

### 6.2 Storefront stock badges / disable Add-to-Cart at 0 — **deferred to stable inventory**
- **Server-side stock validation is required early** (it already exists: checkout is atomic and rejects overselling). This is the safety gate against overselling and must remain.
- Public **stock badges** (in-stock / low / out) and **disabling Add-to-Cart at 0** should **wait until the final inventory/FIFO source is stable — ideally Phase 5.**
- Before that point, server-side validation at checkout is the protection; the storefront does not need fake stock indicators.

### 6.3 Phase 1 (and every migration phase) preflight
Before any phase that includes a migration — **including Phase 1** — perform:
- migration workflow preflight,
- seed path check,
- local reset if applicable,
- backup / staging rule check,
- **owner approval before any `db push`.**

### 6.4 Testing is per-phase — **not deferred to Phase 16**
- Tests are **not** deferred to Phase 16. Every phase must include its own relevant validation/tests.
- `create_checkout_order` and the order-lifecycle RPCs are the central hotspot (edited across Phases 1, 5, 7, 8, 9, 10). **Regression tests for these RPCs start in Phase 1** and grow with each phase that touches them.

### 6.5 Delivery zone resolution
**The more specific zone always wins over the general governorate.** Resolve the fee **server-side** in this exact order (first match wins):

1. **Shorouk / Madinaty → 30 EGP.**
2. **Haram-end / 6 October / Sheikh Zayed → 100 EGP.** *(checked before the general Cairo/Giza rule, because these areas sit inside Cairo/Giza governorates — so the specific zone must match first.)*
3. **Remaining Cairo / Giza → 50 EGP.**
4. **All other governorates → `delivery_fee = 0`** + courier note ("the customer pays the courier directly; the delivery fee is outside Line Coffee revenue unless an admin manually overrides it per order").

- **`Haram-end` is a manual/admin-selectable area** (not auto-derived from governorate alone).
- The checkout address must capture enough granularity (area/district, not just governorate) for zone resolution; the zone-fee mapping lives server-side and is never trusted from the UI.

### 6.6 Inventory transition integrity
- The transition from the current `inventory_stock` (kg per product) to `inventory_lots` (Phase 4 → 5) **must prevent double counting** — opening stock becomes opening lots; the simple model is not summed on top of lots.

### 6.7 Units / precision
- **Coffee stock internally in kg with at least 3 decimal places** (`0.001 kg = 1 gram`).
- **Espresso components stored/calculated in grams**, rounded to the nearest whole gram unless an exact decimal is required for lot allocation.
- **Money stored as EGP numeric with 2 decimal places.** Order totals, discounts, delivery fees, COGS, refunds, expenses, and supplier payments all use EGP with 2 decimals.
- The UI may display whole EGP where appropriate, but **DB snapshots remain 2 decimals.** All money is frozen as a snapshot on the order.

### 6.8 Packaging specifics
- Packaging shortage **does not block** the order; it **creates an admin alert / shortage flag.**
- Packaging cost basis **must be recorded from packaging lots** for later accounting (Phase 14 "Packaging cost").

### 6.9 Returns / refunds specifics
- A returned **sellable** item restores stock at the **original COGS basis or a linked return lot.**
- A **damaged** return creates a **loss / no stock return.**

### 6.10 Order edit window
- Admin edits **after shipped** are **admin-only and only before delivered.**
- **After delivered**, use returns/refunds (not order editing).

### 6.11 Customer identity + saved addresses (Phase 2)
- Registered account must **stamp/link `auth_user_id`** and **migrate same-device guest data safely** on signup/login (orders, addresses, wishlist). No automatic merge by phone/email.
- **Saved Addresses in Checkout is owned by Phase 2.** Phase 2 owns registered-customer address ownership and checkout saved/default-address resolution: registered customers can select a saved/default address in checkout after Phase 2; guests continue using the checkout form.
- **Phase 1 may still use the existing checkout form** while delivery rules are corrected; saved/default-address selection arrives in Phase 2.

---

## 7. Immediate next action

Do **not** start Phase 1 until Phase 0 is committed and Codex has reviewed the final docs.

Recommended next sequence:
1. Claude finishes any small docs clarifications. *(This patch.)*
2. Codex performs a read-only review of the Phase 0 docs.
3. Owner approves the commit.
4. Commit Phase 0 docs.
5. Start Phase 1 with Claude.
6. Codex reviews Phase 1 before any DB push.

---

## 8. Commit policy

Each phase gets its own commit after validation. Suggested style:

```text
docs: lock v3 execution roadmap
feat: correct order delivery and stock lifecycle
feat: add customer ownership resolver
feat: stabilize data contracts and migration workflow
feat: add purchases suppliers expenses and inventory lots
feat: implement fifo reservations and cogs
feat: add packaging inventory rules
feat: add server-side promo validation
feat: support custom espresso checkout
feat: support custom flavor checkout
feat: add order edits and payment events
feat: add returns and refunds
feat: add product storage and real customers admin
feat: add reviews and contact messages
feat: derive accounting dashboard analytics
chore: remove launch-scope mocks
chore: harden launch quality security seo
```

---

## 9. Absolute stop conditions

Stop and ask the owner if any of these happen:
- A migration needs to delete or rewrite existing production-like data.
- A phase requires changing public website visuals.
- A tool needs secrets / service-role keys.
- A `db push` is needed.
- RLS behavior is unclear.
- Customer ownership cannot be proven.
- Checkout totals differ between client and server.
- Stock can go negative unexpectedly.
- An implementation would make a fake UI look real.
- Claude and Codex would touch the same files simultaneously.

---

## 10. Final priority summary

The correct next technical order:
1. Lock docs/protocol.
2. Fix existing checkout/order mismatches.
3. Fix customer identity/ownership.
4. Stabilize contracts/migration workflow.
5. Add purchases/lots.
6. Add FIFO.
7. Add packaging.
8. Add promo.
9. Add builders.
10. Add advanced order/payment/returns.
11. Complete admin/customer/content/accounting/analytics.
12. Remove mocks.
13. Harden.
14. Stage.
15. Launch.

**Guardrails:**
- Do **not** build dashboard/accounting/analytics before FIFO/purchases/returns exist, or reports will be fake again.
- Do **not** wire Admin Inventory temporarily to an obsolete model if it will be replaced by lots/FIFO immediately after.
- Do **not** expose promo UI before server-side validation exists.
- Do **not** build Media Studio.
