# LINE COFFEE V3 — Final Decisions & Phased Roadmap

Last updated: 2026-06-28 · Status: **Decisions + context/history reference. SUPERSEDED for execution by `LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md`.**

> **⚠️ EXECUTION SUPERSESSION (2026-06-29):** This doc is **decisions / history / context only — NOT an execution plan.** `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` is canonical and **wins on any conflict** (phase numbering, execution order, gap map). The **20 locked decisions remain authoritative**; the **Was→WillBe→How gap map and the Part 3 phases are reference/context only** — do not use their phase numbers as an execution plan. Canonical numbering (master plan §5.0): packaging = Phase 6 (here: 10), customer identity = Phase 2 (here: 13), promo = Phase 7 (here: 3), order editing = Phase 10 (here: 4), espresso = Phase 8, flavor = Phase 9. The 5 "open decisions" in Part 6 are **already resolved** in the master plan — they no longer need an owner call.

This document turns the owner's *Operating Scenarios & Final Decisions Blueprint* into (1) the locked business decisions, (2) a was → will-be → how gap map, (3) a dependency-ordered phased build plan, (4) the per-phase Definition of Done + engineering rules, (5) launch scope / out-of-scope, and (6) the open decisions that still need the owner's call.

> **Supersession:** Where this document conflicts with `LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md`, **this document wins.** The blueprint remains a deep model/ownership reference, but it predates both the real backend work (2026-06-27/28) and these final decisions. Specifically, this doc overrides the blueprint on: Media Studio (cancelled), FIFO costing, Make-Your-Espresso as real raw-bean manufacturing, Make-Your-Flavor as cost-only, zone-based delivery, and deduct-at-delivered.

For the verified current REAL/MOCK/MISSING state, see `LINE_COFFEE_V3_CURRENT_STATE.md`.

---

## Part 1 — The 20 Locked Decisions

| # | Decision | Operational meaning |
|---|---|---|
| 1 | **Media Studio cancelled** | No Media Studio module is ever built. General site copy/images are edited in code; product images come from Admin Products (Supabase Storage). Editors use `LINE_COFFEE_V3_CONTENT_MAP.md` to find what to change. |
| 2 | **Ready products are bought finished** | Turkish / Espresso / Flavor *ready* products enter stock via **Purchases** as finished goods. No production order, no internal manufacturing for them. |
| 3 | **Make Your Espresso = the only manufacturing** | A custom espresso blend pulls **raw beans** from inventory by the chosen ratio. Needs raw-bean stock, `order_item_components`, reservation by bean, FIFO deduction, COGS. |
| 4 | **Make Your Flavor = cost-only** | No raw-material stock movement. Sale price + cost snapshot only (base cost + flavor cost). Profit = price − cost. |
| 5 | **FIFO costing** | Every purchase creates a **lot**. Reservation/deduction consume oldest lot first. COGS is the cost of the lots actually consumed. Applies to finished goods and raw beans. |
| 6 | **Reserve at order, deduct at delivered** | Place Order → `reserve` (available↓, reserved↑). Delivered → `deduct` (reserved↓, COGS + revenue recognized). Cancel before delivery → `release`. *(Current code deducts at shipped — corrected in Phase 1.)* |
| 7 | **Packaging deducts at Place Order** | Packaging is its own stock and is consumed immediately when the order is placed (not at delivery). Cancellation does **not** auto-return packaging. |
| 8 | **Discount reduces Net Sales, not COGS** | `Gross Sales − Discounts = Net Sales`; `Net Sales − COGS = Gross Profit`. COGS is unaffected by discounts. |
| 9 | **Promo applies to product subtotal only** | Delivery fee is never discounted. |
| 10 | **Zone-based local delivery** | Shorouk / Madinaty = **30** · Cairo / Giza = **50** · Haram-end / 6 October / Sheikh Zayed = **100**. Fee stored as a snapshot on the order; admin can override per order. |
| 11 | **Governorates = customer pays courier** | Internal `delivery_fee = 0` + a note; shipping is arranged with a courier and paid by the customer, outside Line Coffee revenue (unless an admin manually overrides per order). |
| 12 | **All payments start Pending** | Cash / InstaPay / Wallet all begin `pending`. Admin moves to paid / cancelled / refunded manually. No gateway. |
| 13 | **Customer edit before shipping** | Before the order ships the customer (or admin) can edit it → release old reservation, recompute, re-reserve, recompute totals/discount, log an event. After shipping: admin-only. |
| 14 | **Returns/refunds admin-only** | Admin decides full/partial, which items, restock vs damaged. Restock returns stock + value; damaged records a loss. |
| 15 | **Reviews approval-only** | A review is `pending` until an admin approves it; only approved reviews render publicly. |
| 16 | **Purchases vs Expenses** | Anything that **enters stock** → Purchases. Anything that **doesn't** (ads, fuel, utilities, tools, salaries) → Expenses. |
| 17 | **Suppliers support credit** | A purchase can be paid / partially paid / unpaid → supplier payable balance; payments reduce it. |
| 18 | **Admin stays protected** | `/admin` gated by `admin_users` + `is_admin()` (already real). |
| 19 | **Product images via Admin Products** | Upload to Supabase Storage from the product editor. Replaces Media Studio for product imagery. |
| 20 | **Default rule** | Anything not explicitly decided uses the practical default that does not contradict decisions 1–19. |

---

## Part 2 — Was → Will Be → How (gap map)

| Domain | Was (current) | Will be (decision) | How (mechanism) | Phase |
|---|---|---|---|---|
| Delivery fee | Free ≥500 EGP else 50 | Zone-based 30/50/100; governorate = courier | Zone selector → fee in `create_checkout_order`; default table in `site_settings`; admin override | 1 |
| Deduction timing | Deduct at `shipped` | Deduct at `delivered` | Move deduct step in `update_admin_order_status` | 1 |
| Storefront stock | Static / not gated | Real availability; can't add out-of-stock | Read `inventory_stock.available_kg`; in-stock/low/out badges; disable add@0 | 2 |
| Owner-editable config | Scattered constants | One Settings surface | `site_settings` (fees, contact, WhatsApp, announcement, free-ship threshold) + admin UI | 2 |
| Promo | `discount_total` always 0 | Product-subtotal, server-validated, per-customer limit | `promo_codes` + server validate fn + checkout field + discount snapshot | 3 |
| Order editing | None | Customer edits before shipping; admin anytime | Release→recompute→re-reserve→re-discount + event log | 4 |
| Order cancel by customer | Admin-only | Customer can cancel/request before shipping | Customer-scoped cancel RPC (release reservation) + event | 4 |
| Finished inventory admin | Mock UI | Real ops + opening stock | Wire Admin Inventory to `inventory_stock`/`inventory_movements`; opening-balance entry | 5 |
| Purchases/Suppliers/Expenses | None | Full real layer + lots | New tables; purchase → stock↑ + **lot** + payable; expenses → net profit | 6 |
| FIFO | None | Lots consumed oldest-first | `inventory_lots` + consumption logic + COGS from lots | 7 |
| Make Your Espresso | Rejected at checkout | Real manufacturing from raw beans | Raw-bean stock+lots; `order_item_components`; accept `custom_espresso`; reserve by ratio; FIFO deduct@delivered | 8 |
| Make Your Flavor | Rejected at checkout | Cost-only order line | Accept `custom_flavor`; cost snapshot from Flavor Manager; no stock movement | 9 |
| Packaging | None | Deduct @Place Order | `packaging_stock` + rules + deduction step | 10 |
| Returns/refunds | Status + `returned_quantity` only | Admin refund flow + reconciliation | `refund_records` + `return_items`; restock vs damaged; accounting + payment_status adjust | 11 |
| Accounting | Mock | Derived P&L | Derive from delivered orders, FIFO COGS, discounts, purchases, expenses, payables | 12 |
| Customer identity | Device `guest_id` only | Registered = cross-device history | Link guest orders/wishlist to `auth_user_id` on login; merge guest→customer | 13 |
| Reviews / Contact | Mock CMS | Real, approval-gated | `reviews` + `contact_messages`; wire Contact form; admin approval; render approved | 14 |
| Dashboard / Analytics | Mock | Real KPIs + light events | Dashboard reads real; visit/product-view events | 15 |
| Product images | Disabled in editor | Storage upload | Supabase Storage in Admin Products | 16 |
| Customers admin | Mock | Real + segments | Connect Admin Customers to `customers` + computed segments | 17 |
| Media Studio | Doesn't exist | **Cancelled** | Content Map doc + Admin Products images | — |

---

## Part 3 — The Phased Roadmap (18 phases)

Built on the REAL foundation that already exists (catalog, checkout, orders, account, kg-per-product reservation, auth). Each phase = authored migrations + scoped UI wiring, validated, **applied by the owner** (no auto `db push`). See Part 4 for the Definition of Done that applies to **every** phase.

### Group A — Checkout & order correctness

**Phase 0 — Documentation & decisions lock** ✅ *(done 2026-06-28)*
Docs rewritten, roadmap + content map created, blueprint reconciled, CLAUDE.md + memory updated.

**Phase 1 — Checkout & order rule corrections**
Zone delivery (Shorouk/Madinaty 30 · Cairo/Giza 50 · Haram-end/October/Sheikh Zayed 100 · governorate = courier, `delivery_fee = 0` + note); zone selector at checkout; fee computed inside `create_checkout_order`; default fee table in `site_settings`; admin per-order override. Move deduction **shipped → delivered** in `update_admin_order_status` (reserve@order, release@cancel unchanged).
*Touches:* `create_checkout_order`, `update_admin_order_status`, checkout page, admin order detail.
*NOT here:* packaging (Phase 10). Finished-goods reservation only — Phase 1 must not present checkout as packaging-complete.

**Phase 2 — Owner Settings + storefront stock truth**
`site_settings`-backed admin Settings surface the owner can edit without code: delivery zone fees, free-ship threshold (if any), contact info (WhatsApp/phone/email), announcement-bar messages, social links. Storefront shows **real availability** from `inventory_stock.available_kg`: in-stock / low / out badges; **add-to-cart disabled at 0** (closes Scenario 2 customer-facing). Checkout re-checks availability server-side (already atomic).
*Touches:* `site_settings`, header/footer/contact (read settings), product card + detail, products page.

**Phase 3 — Promo codes (real)**
`promo_codes` table + **server-side** validate function (expiry, total usage limit, **per-customer/guest limit**, min subtotal) + checkout field. Discount on **product subtotal only**; delivery never discounted; discount snapshot on order. Marketing admin promo CRUD becomes real.

**Phase 4 — Order editing & cancellation** *(closes Decision 13 / Scenarios 13–14)*
Customer (before shipping) and admin (anytime) can edit an order: change quantities/items/address → **release old reservation → recompute subtotal/discount/delivery → re-reserve (atomic, stock-checked) → log an `order_status_events` edit row**. Customer-initiated **cancel/request before shipping** (release reservation). Admin order drawer gains real line-item editing.
*Touches:* new `edit_customer_order` / `cancel_customer_order` RPCs (guest_id-scoped), `update_admin_order_*`, account order detail, admin order drawer.

### Group B — Inventory, costing, accounting backbone

**Phase 5 — Admin Inventory (real) + Opening Stock**
Wire the Admin Inventory UI to real `inventory_stock` + `inventory_movements`. Real low-stock alerts and manual adjustments (write `adjustment` movements). **Opening-stock entry** so the owner can load real starting quantities (replacing the 100kg placeholder seeded by `initialize_product_inventory`). No new costing yet.

**Phase 6 — Purchases + Suppliers + Expenses + Inventory Lots foundation**
New tables: `suppliers`, `purchases`, `purchase_items`, `supplier_payments`, `expenses`, **`inventory_lots`**. A **purchase creates an inventory lot from the start** (qty + unit cost + supplier + date), increases finished-goods/raw/packaging stock, and creates a supplier payable (paid/partial/unpaid). Expenses reduce net profit (no stock movement). Admin Accounting Purchases/Suppliers/Expenses tabs become real. *This phase only establishes lots; consumption is Phase 7.*

**Phase 7 — FIFO reservation / deduction / COGS consumption**
Lot-consumption logic: reservation and deduction consume **oldest lot first**; COGS = cost of lots actually consumed. Applies to finished goods and (Phase 8) raw beans. Kept separate from Phase 6 so lot creation vs consumption stay unambiguous and non-duplicated.

### Group C — Custom builders

**Phase 8 — Make Your Espresso (real manufacturing)**
Raw-bean inventory + lots; `order_item_components` (per-bean breakdown); accept `custom_espresso` at checkout; reserve each bean by ratio; deduct via FIFO **at delivered**; COGS from bean lots. Espresso Manager admin → real beans, and the **public builder reads the same bean source** (single source of truth).

**Phase 9 — Make Your Flavor (cost-only)**
Accept `custom_flavor` at checkout; compute sale price + **cost snapshot** (base cost + flavor cost) from Flavor Manager config; **no stock movement**; profit recorded. Flavor Manager admin → real config, shared with the public builder.

**Phase 10 — Packaging inventory**
`packaging_stock` + packaging rules (define the exact size→bag mapping — see Open Decisions); **deduct at Place Order**; low-stock alerts; packaging buyable via Purchases (Phase 6). **This is where checkout becomes packaging-complete.**

### Group D — Money, content, identity

**Phase 11 — Returns / Refunds (admin-only)**
`refund_records` + `return_items`; full/partial; restock (→ stock + value back, FIFO-aware) vs damaged (→ loss); **payment_status + accounting reconciliation**; customer notification. (`order_items.returned_quantity` already exists.)

**Phase 12 — Accounting derivation (real P&L)**
Derive revenue (delivered orders), COGS (consumed lots), discounts, purchases, expenses, supplier payables → Gross/Net profit. Admin Accounting + Dashboard read real figures. No hand-kept numbers.

**Phase 13 — Customer identity & auth linking** *(closes the cross-device gap)*
On login/signup, link this device's `guest_id` orders + wishlist + addresses to the registered `customers.auth_user_id`; registered customers see history across devices; merge guest → customer cleanly (no data loss, no cross-customer leakage). Account read RPCs gain an auth-based path alongside guest_id.

**Phase 14 — Reviews + Contact + CMS**
`reviews` (approval-only) + `contact_messages`; wire the Contact form to persist; admin approval flow real; approved reviews render in testimonials/product pages.

### Group E — Insight, media, launch

**Phase 15 — Dashboard + Analytics (real)**
Admin Dashboard reads real KPIs (today's orders, pending payments, low stock, best sellers). Lightweight visit / product-view event capture for Analytics (basic, not the full mock module — see Out of Scope).

**Phase 16 — Product images (Admin Products + Storage)**
Enable Supabase Storage upload in the product editor (currently disabled). Replaces Media Studio for product imagery (Decision 19). Includes basic image optimization + alt text.

**Phase 17 — Customers admin (real) + segments**
Connect Admin Customers to the real `customers` table; computed segments (VIP/repeat/new/inactive/at-risk/wholesale) + real order history.

**Phase 18 — Launch hardening**
Admin RLS/roles review; security pass (ownership, RPC input validation, no service-role in client); SEO metadata + per-product dynamic OG; performance (image sizing, LCP) + accessibility (drawer focus traps); **Supabase backup / PITR enabled**; production env vars; **all migrations applied in order**; end-to-end smoke tests (checkout → admin status → account → refund); deploy (Vercel + Supabase) + post-deploy smoke test.

---

## Part 4 — Definition of Done + engineering rules (every phase)

**Definition of Done (per phase):**
1. Migration(s) **authored only** (idempotent: `if exists` / `create or replace` / `on conflict`); owner applies with `supabase db push`.
2. `npx tsc --noEmit` = 0 · `npm run lint` = 0 · `npm run build` ✓.
3. Manual smoke test of **that phase's exact flow** documented in the change-log entry.
4. A `CLAUDE.md` change-log entry appended (date, what, which files, why).
5. No unrelated refactor; patch scoped to the phase.

**Engineering rules (non-negotiable, every phase):**
- Browser uses the **anon key only**; every write goes through a **SECURITY DEFINER RPC** that re-validates and **recomputes authoritative numbers server-side** (never trust client prices/quantities).
- Customer data is **`guest_id`-scoped** (and, from Phase 13, optionally `auth_user_id`-scoped); ownership is verified **inside the DB**, not just the UI.
- **One source of truth per domain** — no module reads a second copy (e.g. builder beans = Espresso Manager beans).
- Inventory mutations are **atomic guarded updates** (oversell impossible); every mutation writes an `inventory_movements` (or lot) ledger row.
- Snapshots are frozen on the order (price, name, address, cost) so history stays correct when catalog/costs change later.
- Preserve EN/AR + RTL/LTR and the locked premium visual direction; no homepage redesign.

---

## Part 5 — Launch scope & out of scope

**In scope (the 18 phases) = a fully operable business:** real catalog, stock, checkout, orders, FIFO costing, both builders, packaging, returns, purchases/suppliers/expenses, real P&L, reviews/contact, customer accounts (incl. cross-device), product images, dashboard, and a hardened deploy.

**Out of scope at launch (conscious choices — confirm in Part 6):**
- **Payment gateway** — all payments manual (Decision 12).
- **Automated email/SMS** — communication is on-site status + **manual WhatsApp** (admin clicks `wa.me`). Optional future: WhatsApp Cloud API automation.
- **Rich analytics** — launch analytics is basic (visits/views/best sellers), not the full mock (funnels/acquisition/geography).
- **Deep multi-staff RBAC** — single owner + simple admin roles (Decision 18).
- **Tax/VAT module, double-entry ledger, depreciation** — practical P&L only.
- **Abandoned-cart recovery, audit log, loyalty/points** — post-launch nice-to-haves.

---

## Part 6 — Open decisions (RESOLVED in the Master Execution Plan)

> **Status (2026-06-29):** These are **no longer open** — all five are resolved in `LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` (cross-device history = build it / Phase 2; communication = manual WhatsApp; opening stock = opening lots in Phase 4; packaging mapping = locked rule in Phase 6; customer cancellation = self-cancel while `pending`, request-then-admin-approve while `preparing` / Phase 10). The list below is kept for **context only**.

1. **Cross-device registered history (Phase 13):** build guest→account linking now, or stay guest/device-only for launch? *(Recommend: build it — it's what "real customer account" means.)*
2. **Communication (launch):** keep **manual WhatsApp** + on-site status (no automation) for launch? *(Recommend: yes for launch; WhatsApp API later.)*
3. **Opening stock (Phase 5):** how does the owner load starting quantities — bulk opening-balance tool, or via first Purchases? *(Recommend: a simple opening-balance entry in Inventory.)*
4. **Packaging rules (Phase 10):** exact size→bag mapping — is 1kg = 1×1kg bag, or 4×250g bags? And 500g = 1×500g or 2×250g? Need the real packing rule.
5. **Customer cancellation (Phase 4):** can the customer self-cancel before shipping, or only *request* cancel (admin confirms)? *(Recommend: self-cancel while `pending`, request-only once `preparing`.)*

---

## Dependency Notes
- **6 → 7** (lots before FIFO) **→ 8** (raw-bean manufacturing needs FIFO).
- **6, 7, 11 → 12** (real accounting needs purchases, FIFO COGS, and returns).
- **2** (storefront stock) builds on the existing `inventory_stock`; **5** makes it owner-manageable.
- **10** (packaging) is independent of FIFO but its restock buys come from **6**.
- **13** (identity) can run after the order flow is stable; everything customer-facing benefits from it.

## Position
**Phase 0 docs being finalized (this patch).** Next: **Phase 1** (delivery zones + deduct-at-delivered + payment defaults). **Execution numbering is now governed by `LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` §5.0** (packaging = Phase 6, not 10). The 5 open decisions in Part 6 are resolved in the master plan.
