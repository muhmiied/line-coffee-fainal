# LINE COFFEE V3 — Current State

Last updated: 2026-07-16

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

## Final launch-closure snapshot (2026-07-16)

The canonical production-closure report is `docs/ai/LINE_COFFEE_V3_FINAL_LAUNCH_AUDIT.md`. Its evidence-based verdict is **Not launch-ready** pending: robust anonymous-checkout abuse protection; credentialed customer/admin acceptance; review of one live pending order with a packaging-shortage marker; and owner confirmation of production domain/Auth/SMTP/environment/backups/monitoring/launch-data/rollback controls.

Code-level closure fixes are complete and verified: builders now fail closed when their live catalogs fail; public add-to-cart honors database-derived availability; Admin Products stock badges use real `inventory_stock`; checkout/auth/search/landmark/mobile-menu accessibility gaps were fixed; the historical catalog seed tool's count assertions now match 124 products/372 variants; public providers, public business JSON-LD, and public settings reads are isolated from admin routes; and the deprecated Next middleware convention was migrated to `src/proxy.ts`.

TypeScript, ESLint, two warning-free production builds, the production dependency audit, the earlier broad 177-URL smoke, and a repeatable final 155-route production smoke pass. The repeatable browser runner verifies English desktop, Arabic mobile RTL, language switching, mobile focus containment/return, scoped guest cart, populated checkout without submission, signed-out admin redirect, public/admin JSON-LD separation, landmarks, labels, duplicate IDs, mojibake, console/page errors, and horizontal overflow.

No migration was created or applied in this audit. Local and remote histories match through `20260715120000`.

---

## Architecture In One Paragraph

The root Next.js layout owns only document metadata/fonts and initial language/dir attributes. The `(public)` layout owns the public language/cart providers, header/footer/main landmark, and Organization/WebSite/Store JSON-LD; admin routes therefore do not load public cart/settings/structured-data work. Public settings reads live in `src/lib/settings/public-site-settings.ts`, shared safe parsing/normalization lives in `site-settings-shared.ts`, and admin writes remain in `src/lib/admin/admin-settings.ts`. `src/proxy.ts` provides a signed-out admin UX redirect only; Supabase RLS and the admin resolver remain authoritative.

Supabase data access runs in the browser on the **anon/publishable key** (`src/lib/supabase/client.ts`) — there is no service-role server. The trust boundary is therefore **the database**: all data writes go through **SECURITY DEFINER RPCs** that validate and compute server-side (prices are re-read from the DB, never trusted from the client). Customer-area data is scoped by a device **`guest_id`** (UUID in `localStorage`, created by `getOrCreateGuestId()` in `src/lib/checkout.ts`, validated 8–64 chars `^[A-Za-z0-9_-]+$`). Admin data is gated by the `admin_users` table + `is_admin()`. One narrow Next.js server route handles Telegram delivery; it keeps the bot token server-only and uses validated SECURITY DEFINER RPCs with the public anon key for saved-order proof and sequential notification dedup — no service role. The final audit found a concurrent cold-instance double-send race because check/send/log is not an atomic claim.

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
| **Admin CMS** | Real blog posts, review moderation, contact inbox, and legal-page drafts/publishing. Public homepage reads approved reviews only; both contact forms persist through a validated RPC | migration `20260703140000`; `src/lib/admin/admin-cms.ts`; `src/lib/cms/public-cms.ts` |
| **Admin Customers** (Phase 12A) | Real customer list/detail from `customers` + `customer_addresses` + `orders`; computed segments; real Tags read/write | grants migration `20260703130000`; `src/lib/admin/admin-customers.ts` |
| **Admin Dashboard** (Phase 14A) | Real KPIs (Sales / Orders / Customers / Net Collected), sales trend, best sellers (from `order_items`), latest orders, alerts, inventory/low-stock, preparing+fulfillment, latest approved review — all from real tables; honest empty states, no mock. No new migration (all sources already admin-readable) | `src/lib/admin/admin-dashboard.ts`; `src/components/admin/dashboard/*` |
| **Admin Accounting** (Phase 15 / 15B–15D) | Real Sales/Net-Sales/Discounts/Delivery, delivered-basis Gross Profit + Margin (COGS from stored `orders.cogs_total` only), Net Collected + Receivable + payment-method breakdown (`order_payments`/`order_refunds`), real Operating Expenses + Net Profit, purchases + supplier payables, returns, monthly trends, and a unified transactions timeline — all real; honest empty states, no mock. **Phase 15B** adds real Add Expense; **15C** adds Pay Supplier; **15D** adds real draft purchase creation from active suppliers + finished products and draft-only receiving through the existing Phase-4 RPCs. The Add Purchase drawer can quick-create a real active supplier through the existing `createSupplier()` data layer, then selects it and refreshes Accounting/purchasing data. Creation raises supplier payable without changing stock/P&L; receiving atomically creates inventory lots/movements and updates stock. No new migration. | `src/lib/admin/admin-accounting.ts`; `src/app/admin/accounting/page.tsx`; Phase-4 functions in `src/lib/admin/admin-purchasing.ts` |
| **Supplier/purchase flow polish** (Phase 19D) | The existing real Accounting flow now validates optional supplier phone/email values, searches active suppliers by name/contact details, auto-selects quick-created suppliers without a second failing refresh, shows per-line and payable-impact purchase totals, and mirrors the existing RPC quantity/cost limits. Purchase rows make Draft/Received/Cancelled and payment states explicit; draft-only receiving keeps its confirmation and reports created FIFO lots plus stock added. Supplier payment supports partial/full amounts, date/method/reference/note, projected remaining balance, supplier/purchase consistency checks, and client-side overpayment blocking with clearer post-payment payable feedback. Money display retains cents where present. No migration or accounting/FIFO/COGS formula change. | `src/app/admin/accounting/page.tsx`; `src/lib/admin/admin-purchasing.ts` |
| **Admin Analytics** (Phase 16A) | Real sales (orders count, sales excl. cancelled, net collected, refunds, AOV, delivered/cancelled/returned rates, real revenue+order trend, payment-status split), customers (total, registered vs guest, repeat, new-by-period, top by spend, order frequency), products (top by units/revenue + category performance from `order_items`, cancelled excluded), marketing (promo usage/discount/attributed revenue from `promo_redemptions`, review moderation + contact-inbox counts), and geography (orders/revenue/AOV/customers/repeat per `orders.governorate`) — all real; honest empty states. Web-traffic/session/view/conversion/device/channel/top-page metrics are **not faked** (no tracking source) and are shown as "not connected yet". No new migration. | `src/lib/admin/admin-analytics.ts`; `src/app/admin/analytics/page.tsx` |
| **Admin + public settings** (Phases 17A–17B) | `site_settings` stores real public brand/contact/social/storefront values. Admin can edit the four public keys; a dedicated public reader fetches only public-scoped/visible rows, while shared defensive mapping/normalization contains no data client. Missing/invalid contact and social values are hidden or replaced by an honest unavailable state. Delivery pricing remains owned by `resolve_delivery_fee()`. | `src/lib/settings/public-site-settings.ts`; `src/lib/settings/site-settings-shared.ts`; `src/lib/admin/admin-settings.ts`; `/admin/settings`; `PublicHeader`; `PublicFooter`; `/contact`; `/checkout` |
| **Order notification + handoff** (Phase 18A) | After `create_checkout_order` succeeds, checkout calls a server-only Telegram route with the saved order summary. Telegram failure never rolls back/corrupts the order. `/order-success` auto-opens a prefilled WhatsApp message once per browser session and keeps a manual send button. Public phone display on `/contact`, the homepage contact section, and the footer rejects the former placeholder and uses public settings with `NEXT_PUBLIC_WHATSAPP_PHONE` fallback. No migration. | `src/app/api/order-notifications/telegram/route.ts`; `/checkout`; `/order-success`; `src/lib/checkout.ts`; `src/lib/admin/admin-settings.ts` |
| **Product images** (Phase 19A) | Real product images in the public **`product-images`** Supabase Storage bucket (public read, admin-only write via `is_admin()` storage policies). Admin ProductDrawer → Media uploads into `products.gallery`, stages Primary/Default selection in the drawer, supports a temporary `/products` card preview, and publishes `products.image_url` only through **Save Changes**; Cancel discards the staged selection. Delete remains an explicit immediate gallery action. Public product-card image areas use an 8:5 frame (recommended source: 1600×1000); managed uploads use `object-contain`, while static fallbacks retain `object-cover`. No new table or follow-up migration. | migration `20260704180000`; `src/lib/admin/admin-product-images.ts`; `src/lib/admin/admin-catalog.ts`; `src/components/admin/products/ProductDrawer.tsx`; `src/components/product/ProductCard.tsx`; `src/components/product/CatalogProductCard.tsx`; `/products`; `next.config.ts` |
| **Packaging stock admin** (Phase 19B) | The Packaging tab in Admin Inventory now reads the real count-based `packaging_items` catalog, exposes OK/Low/Out status and thresholds, supports admin restock/manual adjustment with notes through the existing FIFO-safe `adjust_packaging_stock` RPC, edits catalog settings through `upsert_packaging_item`, and shows the real `packaging_movements` ledger. Packaging is explicitly separated from coffee KG stock. No migration; checkout shortage behavior remains non-blocking and unchanged. | `src/components/admin/inventory/PackagingInventoryPanel.tsx`; `src/app/admin/inventory/page.tsx`; `src/lib/admin/admin-packaging.ts`; existing migration `20260701104031` |
| **Promo code admin + checkout safety** (Phase 19C) | The Promo Codes tab now manages real `promo_codes` data through the existing admin-only RPCs: create/edit, active/inactive controls, percentage/fixed values, product-subtotal minimums, caps, date windows, total/per-customer limits, notes, and real redemption counts. Checkout remains server-authoritative and now gives clearer bilingual eligibility/stale-cart feedback plus stricter client validation of returned totals. Delivery remains outside the discount calculation. No migration. | `src/components/admin/marketing/PromoCodesPanel.tsx`; `src/app/admin/marketing/page.tsx`; `src/lib/admin/admin-marketing.ts`; `src/lib/checkout.ts`; `/checkout`; existing migration `20260701104031` |
| **Public SEO / AI-search foundation** (Phase 20A) | Launch SEO with **no UI/design change** and **no migration**. Global metadata (title template, description, keywords, Open Graph + Twitter, robots) + Organization/WebSite JSON-LD in the root layout. Server `layout.tsx` wrappers add real per-page metadata + JSON-LD: Product/Breadcrumb (with real min-variant price, no fake ratings) on product detail, CollectionPage/Breadcrumb on categories, Article/Breadcrumb on blog posts, plus About/ContactPage and listing/legal/builder pages. `sitemap.xml` (live product/category/blog URLs + static routes, hourly revalidate, static fallback on DB failure), `robots.txt` (public allow; `/admin` `/account` `/checkout` `/order-success` `/cart` `/auth` `/api` disallow; sitemap link), and `/llms.txt` (factual brand/category/builder/contact summary for AI search). Server-side reads use a lazy **anon** Supabase client (no service role) over the existing public views/tables only, and never throw. Set `NEXT_PUBLIC_SITE_URL` to the real launch domain (fallback `https://linecoffee.eg`). | `src/lib/seo/{site,data,metadata}.ts` + `jsonld.tsx`; `src/app/{sitemap.ts,robots.ts,llms.txt/route.ts}`; `src/app/layout.tsx`; `src/app/page.tsx`; 13 public `layout.tsx` SEO wrappers |

**Inventory lifecycle (Phase 1, applied):** reserve at checkout → keep the reservation through `shipped` → **deduct at `delivered`** → release on cancel. Migration `20260629120000_phase1_delivery_deduction_payment.sql` is applied and matches Locked Decision 6. Delivery never changes `payment_status`. (Phase 5 re-implements deduction at lot level.)

**Customer ownership (Phase 2, applied):** account data is no longer device-only. Migration `20260629130000_phase2_customer_identity_ownership.sql` adds `account_customer_id(p_guest_id)` — a unified resolver: authenticated callers resolve by `auth.uid()` (registered customer, **cross-device**); anonymous callers by validated `guest_id` (guest customer, **same-device**). Account RPCs scope orders by `orders.customer_id` (not the raw `guest_id`), so registered customers read their own orders/profile/addresses on any device, profile/addresses work for registered customers, and a registered order cannot leak to a different person using the same device as a guest. Wishlist has an `auth_user_id` path. `link_guest_data_to_account()` (authenticated-only) promotes/merges **same-device** guest data on signup/login (orders, addresses, wishlist) — **no auto-merge by phone/email**.

**Public settings (Phase 17B, applied):** the Phase-17A additive grants migration `20260704160000_phase17a_site_settings_grants.sql` is applied. Public reads are limited by RLS to `is_public = true` rows and further narrowed in code to `brand`, `contact`, `social_links`, and `storefront`; JSON values are defensively mapped to known safe fields. Store-closed messaging replaces the public announcement and appears on populated checkout. **Atomic order blocking is now applied (Phase 18B).** No delivery fee/zone logic changed.

**Order notification (Phase 18A, code-only):** Telegram is called only after the checkout RPC returns a valid saved order. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are read only inside the Next.js route; no token is serialized to the browser. Checkout has an in-flight guard; the success page never calls Telegram, so refresh cannot resend it. WhatsApp uses the settings number when valid, otherwise `NEXT_PUBLIC_WHATSAPP_PHONE`, normalizes Egyptian local numbers to `20…` for `wa.me`, and displays them as `01…`.

**Launch hardening (Phase 18B, applied):** migration `20260704170000_phase18b_store_closed_and_notification_log.sql`. (1) `create_checkout_order` is now a thin replay-aware wrapper (Phase 6-7 body kept byte-for-byte as `_create_checkout_order_phase67`) that blocks a **new** order when `site_settings.storefront.storeOpen = false` — replay-safe (an existing `checkout_attempt_id` still returns its receipt) and fail-open when the setting is missing. Checkout also disables submit client-side when closed (server is authoritative). No pricing/delivery/promo/FIFO/COGS change. (2) A durable admin-read-only `order_notifications` log + anon-callable DEFINER RPCs `order_notification_was_sent` / `log_order_notification` provide sequential replay dedup and saved-order proof. They do **not** atomically claim a notification before the external send, so simultaneous cold instances can still double-send; an atomic claim/outbox requires an owner-approved migration. The route uses the public anon key (no service role) and DB/log failures cannot corrupt the saved order.

---

## Intentionally local or static — not fake business data

- **Cart** is local-only but owner-scoped: `line-cart-v1:guest:<guestId>` or `line-cart-v1:auth:<userId>`. The database treats it as untrusted and re-prices everything at checkout.
- `src/lib/mock-data/visual-content.ts` is a poorly named, versioned presentation/content asset map for the visually locked homepage. It does not supply product price, stock, order, customer, or accounting truth.
- `src/lib/mock-data/product-catalog.ts` has zero runtime imports. It is retained only as the deterministic input for `scripts/generate-catalog-seed.mjs`; do not treat it as live catalog truth or reapply the historical seed to production without a separate data review.
- Fabricated Marketing offers/targeting/performance tabs and their admin mock data were removed earlier. The current Marketing page contains only real Promo Codes and Announcements.

---

## MISSING — intentionally unimplemented

**Web-traffic analytics events** (visits, sessions, page views, conversion rate, device/channel attribution, top pages). Admin Analytics reports are real (Phase 16A) but are built entirely from existing business tables — there is still **no behavioural tracking source**, so those specific metrics are shown as "not connected yet" rather than faked. **Media Studio does not exist** — and per Decision 1 it never will (replaced by the Content Map).

> **Phase 13A CMS (applied):** migration `20260703140000_phase13a_cms_real_data.sql` adds RLS-protected `blog_posts`, `reviews`, `contact_messages`, and `legal_pages`; admin-only CMS write RPCs; and a validated public contact-message RPC. Public table policies expose only published blog/legal rows and approved, non-hidden reviews. Contact messages are never public-readable. Follow-up migration `20260703150000_phase13a_seed_launch_blog.sql` idempotently moves the six canonical launch articles into `blog_posts`. `/blog`, `/blog/[slug]`, and Admin CMS now share that table; the static frontend blog dataset was removed.

> **Payments / Returns / Refunds (Phase 10–11, applied):** migration `20260703120000_phase10_11_payments_returns_refunds.sql` adds admin-only `order_payments` / `order_refunds` / `order_returns` (+ `order_return_items`) ledgers and the RPCs `record_order_payment` / `record_order_refund` / `record_order_return` / `update_admin_order_note`. paid/remaining/refunded are DB-derived; `orders.payment_status` is recomputed from the ledgers (orders still start `pending`; delivered never auto-marks paid). Sellable returns restock through the order's original deducted FIFO/bean allocations (`returned_qty_kg` tracking); flavor never moves stock; packaging is never restored; refunds never touch stock/COGS. Data layer: `src/lib/admin/admin-orders.ts`; UI: `src/components/admin/orders/OrderFinancePanel.tsx` in both the order page and drawer.

> **Phase 6–7 foundation (applied):** migration `20260701104031_phase6_7_packaging_promos_pricing.sql` adds separate count-based packaging inventory, non-blocking shortage snapshots, and retry-safe server promo pricing around the Phase-5 checkout core. Typed data layers: `admin-packaging.ts`, `admin-marketing.ts`; the real Packaging and Promo Codes tabs were wired in Phases 19B–19C while their surrounding broad admin modules remain deferred.

> **Phase 4–5 purchasing/FIFO foundation (applied):** migrations `20260630120000` and `20260630130000` add purchasing, finished-product lots, checkout FIFO reservations, delivered deduction/COGS, and cancellation release. Data layer: `src/lib/admin/admin-purchasing.ts`; broad admin UI wiring is deferred.

> **Delivery zones (Phase 1, applied):** `create_checkout_order` resolves delivery **server-side** via `resolve_delivery_fee()` (Shorouk/Madinaty 30 · Haram/6 October/Sheikh Zayed 100 · remaining Cairo/Giza 50 · other governorates 0 + courier note), with an admin per-order override (`update_admin_order_delivery_fee`). The old hardcoded "free ≥500 EGP else 50" rule is no longer live.

---

## Custom Builders — current behavior

**Phase 8-9 foundation (applied):** migration `20260701120000_phase8_9_espresso_flavor_builders.sql` adds a raw-bean catalog with a separate kg-based FIFO inventory dimension plus a cost-only flavor catalog (no flavor stock table — Decision 4). `create_checkout_order` accepts and server-prices `custom_espresso`/`custom_flavor`, validates exact espresso ratios, reserves bean lots, and writes cost snapshots. `update_admin_order_status` deducts/releases bean reservations and rolls flavor cost snapshots into delivered COGS. Packaging remains product-only by documented deferral. Data layer: `src/lib/types/builders.ts`, `src/lib/admin/admin-espresso.ts`, `src/lib/admin/admin-flavor.ts`; both admin managers are real. Public builders read their live safe views and, as of 2026-07-16, fail closed with retry states instead of using static bean/base/flavor business fallbacks.

---

## Public Website (visually locked)

Routes exist and are styled; the homepage visual direction is **locked** — do not redesign:
`/` · `/products` · `/products?category=make-your-espresso` · `/products?category=make-your-flavor` · `/products/category/[slug]` · `/products/[slug]` · `/cart` · `/checkout` · `/order-success` · `/about` · `/blog` · `/blog/[slug]` · `/contact` · `/privacy` · `/terms` · `/shipping` · `/returns`.

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
- The master execution phases through the July 2026 SEO/accessibility migration are applied. Inventory, suppliers/purchases, Marketing Promo Codes/Announcements, Espresso Manager, Flavor Manager, CMS, Accounting, Analytics business metrics, Customers, Settings, product media, and order operations are real. Behavioral web-traffic tracking remains unstarted; unsafe order item/price editing remains deliberately deferred. For launch priority and unresolved gates, follow `LINE_COFFEE_V3_FINAL_LAUNCH_AUDIT.md`, not older phase text.
