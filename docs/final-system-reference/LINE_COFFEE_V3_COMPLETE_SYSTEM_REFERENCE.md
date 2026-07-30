# Line Coffee V3 — Complete System Reference

**Last updated:** 2026-07-28
**Status:** Authoritative. Supersedes all prior `docs/ai/*`, `docs/audit/*`, and root-level planning/audit documents.
**Companion documents:** `LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md` (every route, its data source, and where to edit copy/images) and `LINE_COFFEE_V3_FINAL_AUDIT_AND_OPERATIONS.md` (schema inventory, accepted risks, launch checklist, zero-state confirmation).

This document describes the system **as it is currently built**, not as it was originally planned. Where an older planning document and this file disagree, this file wins.

---

## 1. What Line Coffee V3 is

A bilingual (Arabic/English), premium Egyptian specialty-coffee e-commerce site with a real Supabase backend: public storefront, two custom product builders (Make Your Espresso, Make Your Flavor), customer accounts, and a full admin operations dashboard (catalog, orders, inventory/FIFO, accounting, analytics, marketing, CMS, settings). There is no service-role server anywhere — every write goes through a validated `SECURITY DEFINER` RPC in Postgres.

---

## 2. Architecture and stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (CSS-first `@theme inline` in `globals.css`) |
| Fonts | Playfair Display (English display), Cairo (Arabic body), Tajawal (Arabic display) |
| Backend | Supabase Postgres — browser talks to it directly on the **anon/publishable key**; all writes go through **`SECURITY DEFINER` RPCs** that validate and price server-side |
| Test runner | Vitest 4 + `@testing-library/react` |
| Hosting target | Vercel (not yet deployed as of this writing) |

**The trust boundary is the database, not a server.** `src/lib/supabase/client.ts` creates the one browser Supabase client on the publishable key. There is no service-role key anywhere in the codebase (verified by repeated grep sweeps across every phase of this project). Every RPC that writes data:
- validates its inputs inside `plpgsql`,
- re-reads prices/stock/eligibility from the database rather than trusting the caller,
- is pinned with `set search_path = ''` to prevent search-path hijacking,
- is gated by either `is_admin()` (admin writes) or an ownership check against `auth.uid()` / a validated device `guest_id` (customer writes).

**One narrow exception:** `src/app/api/order-notifications/telegram/route.ts` is the only server-side code. It exists solely to keep the Telegram bot token off the browser. It never writes business data directly — it calls the same RPCs the browser would, on the same anon key, after fetching a trusted, cost-free order snapshot.

### Layout ownership

- `src/app/layout.tsx` (root) — only document metadata, fonts, and the initial cookie-derived `lang`/`dir` attributes.
- `src/app/(public)/layout.tsx` — public language/cart providers, header, footer, skip link, main landmark, Organization/WebSite/Store JSON-LD. Admin routes do **not** mount this tree.
- `src/app/admin/layout.tsx` → `AdminShell.tsx` — its own language provider (`AdminLanguageProvider`, dictionary-based, English-primary), its own shell, its own auth gate.
- `src/proxy.ts` (the Next 16 replacement for the deprecated `middleware.ts` filename) — gives a signed-out visitor to `/admin/*` an early redirect to `/auth/login?next=...` using a **non-authoritative** presence cookie (`line-auth`). This is a UX convenience only; Supabase RLS and the admin resolver (`useCurrentAdmin`) are the real gate. A spoofed cookie grants no data.

### Ownership model (who can read what)

- **Guest customers**: a UUID `guest_id` created by `getOrCreateGuestId()` (`src/lib/checkout.ts`), stored in `localStorage`, validated server-side as 8–64 chars matching `^[A-Za-z0-9_-]+$`. Scopes orders/addresses/wishlist to one device.
- **Registered customers**: resolved by `auth.uid()` via `account_customer_id(p_guest_id)`, which ignores the passed `guest_id` when the caller is authenticated — cross-device, and a signed-in user can never read another device's guest data by supplying its token.
- **Guest → account linking**: `link_guest_data_to_account()` (authenticated-only) promotes or merges same-device guest data (orders, addresses, wishlist) on sign-in/sign-up. **Never** auto-merges by phone or email.
- **Admin**: `admin_users` table (`auth_user_id`, `role`, `status`) + `is_admin()`/`is_super_admin()` — not an email allowlist, not JWT metadata.

---

## 3. Public website

Homepage visual direction is **locked** — do not redesign. Full route inventory and per-route data sources live in the companion `LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md`. In summary:

- **Homepage** (`/`) — hero slideshow, category marquee, real best-sellers (Supabase), features, story, journal, real approved testimonials (Supabase), social gallery, contact form (writes to `contact_messages` via RPC). Most section copy/images are static config in `src/lib/mock-data/visual-content.ts` — this is a deliberate, versioned presentation asset map, not a CMS gap (Media Studio is cancelled, Locked Decision 1).
- **Catalog** (`/products`, `/products/category/[slug]`, `/products/[slug]`) — 100% Supabase (`public_products`, `public_categories`, `public_product_variants`).
- **Builders** (`/products?category=make-your-espresso`, `/products?category=make-your-flavor`) — real backend catalogs (`public_espresso_beans`, `public_flavor_bases`, `public_flavor_items`); fail closed (retry state, add-to-cart disabled) instead of falling back to fake data when a live query fails.
- **Cart** — local-only, owner-scoped `localStorage` (`line-cart-v1:guest:<id>` / `line-cart-v1:auth:<id>`), always re-priced by the server at checkout.
- **Checkout → order-success** — real order creation; see §7.
- **Editorial** (`/about`, `/contact`, `/blog`, `/blog/[slug]`, legal pages) — blog and reviews are real Supabase (`blog_posts`, `reviews`); legal pages have a real `legal_pages` table with a static fallback (all four rows are currently empty drafts, so the static fallback is what renders); about/contact bodies are inline constants.

---

## 4. Customer account

Real, Supabase-backed, ownership-resolved as in §2:

| Route | RPC(s) |
|---|---|
| `/account/orders`, `/account/orders/[id]` | `get_customer_orders`, `get_customer_order_detail` |
| `/account/profile` | `get_customer_profile`, `update_customer_profile` |
| `/account/addresses` | `get_customer_addresses`, `add_customer_address`, `update_customer_address`, `delete_customer_address`, `set_default_customer_address` |
| `/account/wishlist` | `get_customer_wishlist`, `add_customer_wishlist_item`, `remove_customer_wishlist_item` |
| `/account/notifications` | `get_customer_notifications` |
| `/account/settings` | language preference only (no fake notification-preference toggles — removed when found to be decorative) |

**Contract to know:** the wishlist RPCs **throw** on a server error (so a failed read is never mistaken for "the wishlist is empty"); the profile/address RPCs **return `false`/`null`** on error instead (a deliberate, different contract, both directions covered by `customer-account.test.ts`).

**Owner-resolution history (important prior bug, now fixed and test-covered):** `useWishlist`/`useAuth` used to run independent auth listeners that could race ahead of `link_guest_data_to_account()`, letting Account A's items flash for Account B after a login/logout. The fix is a single shared "commerce owner resolver" (`src/lib/hooks/useAuth.ts`: `resolveCommerceOwner`, `COMMERCE_OWNER_LINKED_EVENT`, `getResolvedCommerceOwner`) that only announces an owner as ready once guest-data linking has settled (bounded to 8s) or a sign-out has completed. `useWishlist.ts` subscribes to that event instead of running its own listener, clears the previous owner's list immediately, never persists an authenticated wishlist to `localStorage`, and queues per-slug writes so rapid toggles serialize and a stale failure never clobbers a newer confirmed state. Fully covered by `useAuth.test.ts` and `useWishlist.test.ts`.

---

## 5. Admin dashboard

All client-rendered inside `src/app/admin/layout.tsx` → `AdminShell.tsx`, gated by `useCurrentAdmin()` (RLS-backed, not the proxy cookie). Every module below is real Supabase data, not mock, unless stated:

| Module | Real since | Notes |
|---|---|---|
| Dashboard | Phase 14A | KPIs, sales trend, best sellers, latest orders, alerts, low-stock, fulfillment, latest review — all real; no fabricated visitor/traffic metrics |
| Products | ongoing | Full CRUD, archive/restore, image management via Storage, low-stock badge from real `inventory_stock` |
| Orders | Phase 1 + 10-11 | Status transitions with real inventory effects; `OrderFinancePanel` for payments/refunds/returns/notes |
| Inventory | Phase 4-5, 19B | Finished-product FIFO, espresso bean FIFO, packaging (count-based), movements ledger, suppliers |
| Marketing | 19C, 20C | Promo Codes + Announcement Bar only — fabricated Offers/Targeting/Performance tabs were removed |
| Accounting | 15, 15B–15D | Real sales/COGS/gross-profit/net-profit/receivables/purchases/supplier-payables; Add Expense, Pay Supplier, Add/Receive Purchase all write real rows |
| Analytics | 16A | Real sales/customer/product/marketing/geography reports; web-traffic metrics honestly shown as "not connected yet" (no tracking source exists) |
| CMS | 13A | Blog, review moderation, contact inbox, legal-page drafts/publishing |
| Customers | 12A | Real list/detail from `customers`+`customer_addresses`+`orders`; segments computed, not stored |
| Settings | 17A-17B | Store name/contact/social/storefront-open state — public-scoped `site_settings` rows |
| Espresso Manager / Flavor Manager | 8-9, 20E | Real backend catalogs (`espresso_beans`, `flavor_bases`, `flavor_items`) |

---

## 6. Auth and permissions

- **Customer auth**: real Supabase Auth (email/password). Login/signup/forgot-password/reset-password are fully wired to `supabase.auth.*`. `safePostLoginPath()` (`src/lib/auth/safe-redirect.ts`) rejects protocol-relative (`//`), backslash, and control-character redirect targets before `router.replace()` — this closes a phishing-redirect class of bug an earlier audit flagged; it is fixed and verified in current code (`CONTROL_CHARACTERS` regex + origin re-parse against a sentinel).
- **Password reset**: waits for the real `PASSWORD_RECOVERY` auth event before allowing `updateUser({password})` — not a generic "any session present" check.
- **Admin auth**: `src/lib/auth/admin.ts` resolves `CurrentAdmin` from `admin_users` keyed by `auth_user_id`; `formatAdminRole()` returns plain English role labels **by design**, because the admin dashboard's own translation layer (`AdminLanguageProvider`, `t: (english: string) => string`) is a dictionary lookup over plain strings, incompatible in shape with the public site's `useLanguage()` (`t: ({en, ar}) => string`). Where an admin's role badge is shown on the *customer-facing* header, a separate small bilingual helper (`publicAdminRoleLabel` in `PublicHeader.tsx`) is used instead — deliberately not unified, since unifying would break one side or the other.
- **Sign-out**: `signOut()` awaits the Supabase revoke call first and only clears local state on confirmed success (a failed sign-out must never silently flip a user to "guest" while still authenticated). `signOutEverywhere()` uses `scope: "global"` to revoke every session.

---

## 7. Catalog, cart, and wishlist

- **Catalog**: `public_products` / `public_categories` / `public_product_variants` views. 124 non-archived products, 7 categories, every product with exactly 250g/500g/1kg variants (verified in the 2026-07-16 audit; re-confirmed unchanged in shape by this documentation pass — counts will differ once the store is stocked/curated post-launch since the database is currently at its intentional zero/seed state, see the Final Audit doc).
- **Cart**: local-only, owner-scoped, never trusted — the checkout RPC re-reads every price/stock value.
- **Wishlist**: see §4.
- **Availability**: `public_products.is_available` is a real derived boolean from `inventory_stock`; product cards/detail/wishlist all honor it and fail closed (hide add-to-cart) when a product is out of stock, rather than assuming availability.

---

## 8. Checkout and orders

`create_checkout_order` is a thin, replay-aware wrapper (`_create_checkout_order_phase67`, itself wrapping the original Phase-5 body `_create_checkout_order_phase5`) that:

1. Re-reads every price from the database (never trusts the client's cart totals).
2. Validates and computes builder pricing (`custom_espresso` ratio validation, `custom_flavor` base+flavor pricing).
3. Resolves the delivery fee **server-side** via `resolve_delivery_fee(governorate, area)` — Shorouk/Madinaty 30 EGP → Haram/6 October/Sheikh Zayed 100 EGP → remaining Cairo/Giza 50 EGP → other governorates 0 EGP + courier-collects note (checked in that priority order because the first three zones sit *inside* the Cairo/Giza governorates).
4. Applies a server-validated promo code (`_evaluate_promo_code`) to the **product subtotal only** — delivery is never discounted.
5. Reserves FIFO inventory (coffee lots, espresso bean lots) and deducts packaging immediately (Locked Decisions 5–7).
6. Blocks a **genuinely new** order when `site_settings.storefront.storeOpen = false`, while a replay of an existing `checkout_attempt_id` still returns its original receipt (idempotent either way).
7. All payment methods (Cash on Delivery, InstaPay, E-Wallet) start `payment_status = 'pending'` — nothing is ever auto-marked paid (Locked Decision 12).

**Order status lifecycle**: `pending → preparing → shipped → delivered`, with `cancelled`/`returned` as terminal branches. Inventory reserves at checkout, **stays reserved through `shipped`**, deducts (with a COGS snapshot) only at `delivered`, and releases on `cancelled` (Locked Decision 6). This is enforced by `update_admin_order_status` and mirrored client-side by `ALLOWED_ADMIN_ORDER_TRANSITIONS`.

**Payments / refunds / returns** (Phase 10-11): `order_payments`, `order_refunds`, `order_returns` (+`order_return_items`) are admin-only ledgers. `paid`/`remaining`/`refunded` are always DB-derived, never stored as a mutable field. A sellable return restocks **only** through the order's own original deducted FIFO/bean allocations (tracked via `returned_qty_kg` on the allocation tables) — it can never invent stock beyond what that specific order actually consumed. Flavor lines never move stock (cost-only, Locked Decision 4); packaging is never restored on return.

**Notification trust boundary**: the browser posts only `{orderId, checkoutAttemptId}` to the Telegram route and to the WhatsApp handoff builder — never raw customer/order data. Both channels build their message from the same DB-authored, cost-free RPC (`get_order_notification_payload`), which requires proof of the order's own `checkout_attempt_id` to return anything. See §11 for the concurrency-safety details.

---

## 9. Inventory, FIFO, espresso, and packaging

Three independent resource dimensions, each with its own FIFO lot table and movement ledger:

| Dimension | Stock table | Lot table | Movement table |
|---|---|---|---|
| Finished product (coffee) | `inventory_stock` (kg) | `inventory_lots` | `inventory_movements` |
| Raw espresso beans | `espresso_bean_stock` (kg) | `espresso_bean_lots` | `espresso_bean_movements` |
| Packaging (count-based) | `packaging_items` | `packaging_lots` | `packaging_movements` |

**FIFO rule**: every purchase/adjustment creates a lot; the oldest open lot is consumed first (`_allocate_lots_fifo`, `_allocate_espresso_bean_lots_fifo`). COGS is snapshotted from the **actual consumed lots' unit cost**, never recomputed from current stock, and only at `delivered` (never estimated at checkout).

**Make Your Espresso** is the only manufacturing path (Locked Decision 3) — it pulls real raw beans by validated ratio and reserves bean lots exactly like a finished product reserves coffee lots. **Make Your Flavor is cost-only** (Locked Decision 4) — no stock table exists for it by design; its cost snapshot is taken at checkout time from `flavor_bases`/`flavor_items.cost_per_kg`, and if any component's cost is unconfigured (`null`), the line is flagged `flavor_cost_known = false` so Accounting hides (never estimates) that order's gross profit/margin — this is the Phase 5 Batch A "Flavor COGS honesty" fix.

**Packaging deducts immediately at Place Order** (Locked Decision 7), not at delivery — a documented, deliberate asymmetry with coffee/beans. A packaging shortage is a non-blocking snapshot on the order, never a hard block on checkout.

---

## 10. Accounting and analytics

**Accounting** (`get_admin_accounting_report_v1`): Sales (Σ order total excl. cancelled), Net Product Sales, delivered-basis Gross Profit/Margin (from `orders.cogs_total`, itself from consumed-lot costs only), Net Collected (payments − refunds), Receivable, Operating Expenses (Σ real `expenses.amount` — supplier purchases are inventory/cost basis, **never** a P&L expense), Net Profit, Supplier Payable, and a unified transactions timeline. All real writes: Add Expense, Pay Supplier, Add Purchase (draft), Receive Purchase (draft→received, atomically creates lots+movements+stock).

**Analytics** (`get_admin_analytics_report_v1`): real sales/customer/product/marketing/geography reports built entirely from existing business tables (orders, order_items, payments, refunds, promo_redemptions, reviews, contact_messages). There is **no behavioral web-traffic tracking source** (visits, sessions, page views, conversion, device/channel attribution) — these are shown as "not connected yet," never faked.

---

## 11. Marketing and CMS

**Marketing**: Promo Codes (real `promo_codes`/`promo_redemptions`, server-validated, product-subtotal-only, never discounts delivery) and Announcement Bar (real `announcements` table, admin CRUD, public header reads active rows with a built-in fallback so the bar is never blank). Fabricated Offers/Customer-Targeting/Performance tabs from an earlier iteration were removed.

**CMS**: `blog_posts` (real, published-only public reads), `reviews` (approval-only — Locked Decision 15, homepage shows only approved rows), `contact_messages` (admin-only, anon-callable write RPC with a per-device soft throttle), `legal_pages` (real table with a static code fallback; all four rows are currently empty drafts).

---

## 12. Telegram and WhatsApp

**Telegram** (`src/app/api/order-notifications/telegram/route.ts`): the only server route in the app. Validates same-origin, caps body size, requires a valid UUID+checkout-attempt shape, fetches the trusted cost-free snapshot via `get_order_notification_payload`, then runs an **atomic claim-before-send** state machine:

1. `claim_order_notification` — an `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE` claim (a real Postgres row-lock), returning `claimed` / `already_sent` / `in_progress` / `error`.
2. Only a `claimed` result proceeds to actually call the Telegram API.
3. The caller **always** either `mark_order_notification_sent` (success) or `release_order_notification_claim` (any failure) before returning — never leaves a claim dangling except via its own stale-claim timeout self-heal.

This closes a previously-documented concurrent double-send race (the earlier design was check-then-send, not atomic — two cold serverless instances could both observe "not sent" and both call Telegram before either finished logging). The atomic version was verified race-safe via 8 rolled-back concurrency trials against the live database during Phase 5 Batch A.

**WhatsApp**: the customer-facing handoff on `/order-success` builds its message from the **same** trusted `get_order_notification_payload` snapshot as Telegram (not from live client/form state, which was the prior, less-trustworthy design), localizing item names by the active language. Auto-opens once per browser session; a manual send button remains available.

---

## 13. SEO and accessibility

**SEO**: global metadata + Organization/WebSite JSON-LD in the root layout; per-route metadata + Product/Breadcrumb/CollectionPage/Article/ContactPage/FAQPage JSON-LD via server `layout.tsx` wrappers; `sitemap.xml` (live DB URLs + static fallback), `robots.txt`, `/llms.txt`. `SITE_URL` (`src/lib/seo/site.ts`) is deploy-aware: quiet `console.warn` + localhost fallback in real local dev; loud `console.error` only on a genuine live Vercel production deployment (`VERCEL_ENV === "production"`) when the env var is missing; a quieter `console.warn` for everything else (local `next build`, CI, previews) — this avoids both silent misconfiguration on a real launch and log-spam on routine local builds.

**Accessibility**: skip-to-content link, one main landmark per page, mobile-menu focus trap with focus return, checkout combobox semantics (`role="listbox"`/keyboard nav on the governorate/area `CustomSelect`), auth `autocomplete` metadata, and — from the most recent Phase 5 cleanup — a wishlist toggle button whose `aria-label`/`aria-pressed` now reflect actual state instead of always saying "Add", and a single persistent `role="status"` region wrapping all four loading/found/failed/no-data branches of the `/order-success` recovery flow (previously split across only two branches, which meant React's DOM-node reuse across same-position ternary branches silently dropped the announcement on the most common transition).

---

## 14. Locked business decisions (verbatim reference)

1. Media Studio cancelled — copy/images edited in code or via Admin Products; see the Route/Data-Flow Map for exactly where.
2. Regular products are bought finished, not manufactured.
3. Make Your Espresso is the only manufacturing path (real raw beans by ratio).
4. Make Your Flavor is cost-only — no stock deduction.
5. FIFO costing — every purchase creates a lot; oldest consumed first.
6. Reserve at Place Order, deduct at Delivered.
7. Packaging deducts immediately at Place Order.
8. Discount reduces Net Sales, not COGS.
9. Promo applies to product subtotal only (never delivery).
10. Zone delivery: Shorouk/Madinaty 30 · Cairo/Giza 50 · Haram-end/October/Sheikh Zayed 100.
11. Other governorates: customer pays the courier directly (outside Line Coffee revenue).
12. All payments start Pending; admin changes status manually.
13. Customer can edit an order before shipping; admin-only after.
14. Returns/refunds are admin-only.
15. Reviews show only after admin approval.
16. Purchases = anything entering stock; Expenses = anything that doesn't.
17. Suppliers support paid/partially-paid/unpaid balances.
18. `/admin` must stay protected.
19. Product images managed from Admin Products (Supabase Storage).
20. Anything unspecified → the practical default that doesn't contradict the above.

---

## 15. Environment variables

No secret values are recorded here — names and purposes only. There is no `.env.example` committed; this table is the closest equivalent.

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser-bundled) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase anon/publishable key (preferred name) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Fallback if the publishable key var is absent |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site origin for SEO metadata, sitemap, JSON-LD, and the Telegram route's admin-order link |
| `NEXT_PUBLIC_BASE_URL` | Public | Secondary fallback for the site URL |
| `NEXT_PUBLIC_WHATSAPP_PHONE` | Public | WhatsApp number shown when `site_settings` has no configured value |
| `TELEGRAM_BOT_TOKEN` | Server-only | Read only inside the Telegram route handler; never serialized to the browser |
| `TELEGRAM_CHAT_ID` | Server-only | Chat ID the bot notifies |

No `SUPABASE_SERVICE_ROLE_KEY` (or any service-role credential) is read anywhere in application code — verified by repeated grep sweeps across every phase of this project.

---

## 16. Automated test setup

Vitest 4 + `@testing-library/react`/`dom` + `@vitest/coverage-v8` + jsdom (per-file via `// @vitest-environment jsdom` docblock, not global — most tests run in the faster default `node` environment). Config: `vitest.config.ts`. Scripts: `npm run test` (watch), `npm run test:run` (CI mode), `npm run test:coverage`.

**99 tests across 7 files**, every external boundary mocked (Supabase client, `@supabase/supabase-js`, `fetch`, dynamic-imported sibling modules) — no real network, no real credentials, no live orders or messages:

| File | What it proves |
|---|---|
| `src/lib/validation/phone.test.ts` | Egyptian mobile normalization: operator-digit allowlist (010/011/012/015 only), international-prefix forms, missing leading zero |
| `src/lib/delivery.test.ts` | The full delivery-zone priority matrix, matching the SQL `resolve_delivery_fee()` exactly |
| `src/lib/checkout.test.ts` | `isCheckoutOrderResult`/`buildWhatsAppOrderHref` client-side trust guards — tampered totals, over-discount, invalid payment method/status, the WhatsApp URL host allowlist |
| `src/lib/account/customer-account.test.ts` | The exact silent-failure-vs-throw contract each RPC wrapper promises, plus an owner-scoping assertion on the exact RPC name + `p_guest_id` sent |
| `src/lib/hooks/useAuth.test.ts` | The commerce-owner resolver state machine — auth-lookup failure is never read as guest, sign-in waits for guest-data linking, sign-out doesn't, epoch supersession prevents a stale resolution from clobbering a newer one |
| `src/lib/hooks/useWishlist.test.ts` | Owner-switch isolation, never-persist-auth-to-localStorage, optimistic-add reconciliation on failure, rapid same-slug toggles, and the owner-token skip guard (asserted at both the wrapper-spy level and the underlying `supabase.rpc` level) |
| `src/app/api/order-notifications/telegram/route.test.ts` | The real exported `POST` handler — origin check, body-size limit, tamper guard, every claim outcome (`claimed`/`already_sent`/`in_progress`/`error`) and its release-on-failure path, and the actual outbound Telegram message body content |

Two of these files (`useAuth.test.ts`, `useWishlist.test.ts`) needed real engineering care beyond "make it pass": module-level singleton state means each test must call `vi.resetModules()` and re-import fresh; `useWishlist.test.ts` additionally needed explicit `cleanup()` (Testing Library's auto-cleanup is disabled project-wide) and `vi.doMock()` re-registration per cycle, because repeated reset-module cycles in one file were empirically observed to occasionally resolve a dynamic import to the real (unmocked) sibling module instead of the mock — a Vitest module-graph quirk, not a code defect, closed by asserting the critical ownership guarantee at two independent levels so it holds regardless of which resolution path is taken.

---

## 17. CI pipeline

`.github/workflows/ci.yml`, one job (`quality`), `timeout-minutes: 15`, triggered on push/PR to `main`:

1. Checkout
2. `actions/setup-node@v4` (Node 20, npm cache)
3. `npm ci`
4. `npm run lint`
5. `npx tsc --noEmit`
6. `npm run test:run`
7. `npm run build`

Non-secret placeholder env vars (`NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`, a placeholder publishable key, `NEXT_PUBLIC_SITE_URL=https://linecoffee.eg`) let the build compile/prerender shells without contacting a live project — the browser fetches real data at runtime.

---

## 18. Where to go next

- **Route-by-route data sources and content-editing locations** → `LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md`.
- **Live schema inventory, accepted risks, dependency/Advisor status, zero-data-state confirmation, and the launch checklist** → `LINE_COFFEE_V3_FINAL_AUDIT_AND_OPERATIONS.md`.
- **Full historical build log** (every phase, every migration, every fix, in chronological detail) → `CLAUDE.md`'s Change Log section, which remains the permanent project history and is not superseded by this document.
