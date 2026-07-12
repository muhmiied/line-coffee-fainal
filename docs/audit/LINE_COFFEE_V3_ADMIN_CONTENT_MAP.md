# Line Coffee V3 — Admin Content Map

Audit date: 2026-07-12  
Scope: routes under `src/app/admin`; current code and migrations, not a live database  
All pages are client-rendered inside `src/app/admin/layout.tsx` → `src/components/admin/layout/AdminShell.tsx`.

## Access and shared shell

- `/admin` redirects to `/admin/dashboard` (`src/app/admin/page.tsx:1-5`).
- Edge middleware checks only the spoofable, non-sensitive `line-auth` presence cookie (`src/middleware.ts:18-37`). It is a UX gate, not authorization.
- `AdminShell` resolves the Supabase session and `admin_users` row, requires active `admin`/`super_admin`, and provides loading, signed-out, forbidden and error screens (`AdminShell.tsx:33-225`; `src/lib/auth/admin.ts:96-170`).
- Database RLS and `is_admin()` are the authoritative security boundary. Admin language is localStorage/cookie controlled through `AdminLanguageProvider`.
- Sidebar/top bar: `src/components/admin/layout/AdminSidebar.tsx`, `AdminTopBar.tsx`; notification counts poll orders/low-stock every 30 seconds (`AdminShell.tsx:56-93`).

## Route map

### `/admin/dashboard`

Files: `src/app/admin/dashboard/page.tsx:1-129`; loader/formulas `src/lib/admin/admin-dashboard.ts:343-707`; cards under `src/components/admin/dashboard/`.

| UI | Visible value/calculation | Source | Action / risk |
|---|---|---|---|
| Welcome hero | New pending orders; low-stock count | `orders.status`; `inventory_stock` vs threshold | Links/quick awareness |
| KPI: Sales | Sum of `orders.total` excluding cancelled, with today/week/month/all windows | `orders` scan; `buildPeriodKpi()` | Real, but browser aggregate capped at 5,000 orders |
| KPI: Orders | Count/status breakdown | `orders` | Real, same cap |
| KPI: Customers | Total customers; period values are new joins; “new” = last 30 days | `customers.joined_at/created_at` | Real, capped at 5,000 |
| KPI: Net Collected | Payments minus refunds in matching time windows | `order_payments`, `order_refunds` | Real cash metric, both capped at 8,000 rows |
| Sales chart | Week/day, month/5-day bucket, year/month revenue and order count | Non-cancelled order events | `SalesChart.tsx` dynamically imported; no server aggregation |
| Best sellers | Sum quantity and revenue by product/custom line, excluding cancelled; top rows | `order_items` joined order status; product/category maps | Real; 8,000-item cap |
| Latest orders | Six most recent | `getAdminOrders()` | Opens order route |
| Inventory / low stock | Available/reserved/on-hand and thresholds | `inventory_stock`, `products` | Links to Inventory |
| Preparing / fulfillment | pending/preparing/shipped/delivered counts and rates | `orders` | Real |
| Latest review | Latest approved, non-hidden; average approved rating; pending count | `reviews` | Real CMS data |
| Alerts | low stock, preparation older than configured cutoff, pending reviews, new messages | stock/orders/reviews/contact messages | Links to relevant admin route |
| Quick actions | Static navigation shortcuts | `QuickActions.tsx` | Not data/actions themselves |

Loading/retry/empty states are explicit in `dashboard/page.tsx:33-128`. No mock KPI values were found.

### `/admin/products`

Files: `src/app/admin/products/page.tsx:1-1333`; `src/lib/admin/admin-catalog.ts`; `ProductDrawer.tsx`; `ProductCreateDrawer.tsx`; image service `admin-product-images.ts`.

| Area | Content/actions | Persistence / public consumer |
|---|---|---|
| Products tab | KPI cards Total, Active, Low Stock, Out of Stock, Best Sellers (`page.tsx:894-920,1175-1179`); search/status/category filters; product table/cards; preview/edit/archive/restore/create | `products`, `product_variants`, `inventory_stock`; public views feed all product pages/cards |
| Statuses | all/active/draft/archived; badges/flags including featured, best seller, new, sold out | Product row + `new_until`; public views filter visibility/archive rules |
| Product editor | Identity, bilingual content, category, flags, lifecycle, variant prices/SKUs, image/gallery, low-stock threshold | Direct admin-gated table updates; create via `create_admin_product`; threshold via `inventory_stock` |
| Media | Upload, primary/default, delete, reorder, temporary public-card preview | Public `product-images` bucket; gallery and `image_url` in `products` |
| Categories tab | Counts; all/visible/hidden/draft/archived; create/edit/reorder/archive/restore | `categories`; public nav/category pages consume public view |

Important side effects: product archive/restore changes public visibility, not historical order snapshots. Image delete is immediate storage/gallery mutation; other primary image changes are staged until Save. The detail route `/admin/products/[slug]` (`page.tsx:34-378`) loads by slug, shows product/variant status and opens the same editing workflow; not-found/loading/error states are present.

### `/admin/orders` and `/admin/orders/[id]`

Files: list `src/app/admin/orders/page.tsx:1-334`; detail `orders/[id]/page.tsx:1-258`; service `src/lib/admin/admin-orders.ts:471-1063`; components in `src/components/admin/orders/`.

| Area | Content | Source/action |
|---|---|---|
| KPIs/filters | Total, Pending, Preparing, Shipped, Delivered, Cancelled; status pills; search | `orders`; list filtering is client-side |
| List/table/cards | code, customer, placed date, total, order/payment status/type; open action | `getAdminOrders()` |
| Detail | customer/address/maps, line items (product/custom builders), totals, delivery, promo, notes, status timeline | `orders`, `order_items`, `order_status_events` |
| Status actions | Allowed transition map in `admin-orders.ts:280+`; optional note | `update_admin_order_status` RPC; inventory/COGS side effects are atomic in SQL |
| Delivery fee | Admin override | `update_admin_order_delivery_fee` RPC; changes order total/accounting revenue |
| Payments | amount/date/method/reference/note | `record_order_payment`; updates payment ledger/status |
| Refunds | amount/date/method/reference/note | `record_order_refund`; payment/refund ledger only, no stock |
| Returns | items/condition/quantity/refund choice/note | `record_order_return`; sellable quantities may restock original allocations; packaging is not restored |
| Admin note | Edit internal note | `update_admin_order_note` RPC |

Inventory lifecycle: checkout reserves; shipped retains reservation; delivered deducts FIFO and records COGS; cancelled releases; returned sellable units restock through original allocation. Status changes do not automatically mark payment paid.

### `/admin/inventory`

Files: `src/app/admin/inventory/page.tsx:1-806`; `src/lib/admin/admin-inventory.ts`; `admin-espresso.ts`; `admin-packaging.ts`; `admin-purchasing.ts`; `PackagingInventoryPanel.tsx`.

| Tab | Visible content/actions | Tables/RPCs |
|---|---|---|
| Finished Products | Cards/search; available, reserved, on-hand, threshold, OK/Low/Out; signed stock movement with reason | `inventory_stock`, `products`, categories; `adjust_finished_product_stock` preserves FIFO consistency |
| Espresso Beans | Bean balances/status; signed movement | `espresso_beans`, `espresso_bean_stock`; `adjust_espresso_bean_stock` |
| Packaging | Count stock, threshold/status, edit catalog, adjust, movement ledger, shortage orders | `packaging_items`, `packaging_movements`, `order_packaging_lines`; `upsert_packaging_item`, `adjust_packaging_stock` |
| Stock Movements | Product/bean movement history with reason/order/quantity | `inventory_movements`, espresso movements via service |
| FIFO Lots | Remaining/reserved/unit cost/status per lot | `inventory_lots`, `espresso_bean_lots` where surfaced |
| Suppliers | Create/edit supplier identity/status/contact/note | Direct RLS-gated `suppliers` writes |

Supplier purchases/payments are intentionally in Accounting. Packaging shortage is non-blocking at checkout and is surfaced here, so it can represent a fulfillment risk after a valid order.

### `/admin/marketing`

Files: `src/app/admin/marketing/page.tsx:15-62`; `PromoCodesPanel.tsx:1-782`; `AnnouncementsPanel.tsx:1-527`; services `admin-marketing.ts`, `admin-announcements.ts`.

- Promo Codes tab: code; active/inactive; percentage/fixed; value; minimum product subtotal; maximum discount; start/end; total/per-customer limits; notes; redemption counts; create/edit/deactivate. Writes through `upsert_promo_code`/`deactivate_promo_code`. Checkout validates again server-side and records `promo_redemptions`.
- Announcement Bar tab: bilingual text, CTA label/href, active flag, style/animation/timing/sort as supported by row type; create/edit/activate/delete. Public header fetches active rows and uses static fallback on failure/empty.
- There is no current offers campaign builder or traffic-performance tab. Older docs describing `marketing-mock.ts` are obsolete; that file is absent.

### `/admin/analytics`

Files: `src/app/admin/analytics/page.tsx:1-1112`; `src/lib/admin/admin-analytics.ts:306-707`.

| Tab | Metrics/formulas | Data source |
|---|---|---|
| Overview | Sales excluding cancelled; order count; AOV = sales / non-cancelled orders; net collected = payments − refunds; 30-day trends; status/rate cards | orders/payments/refunds |
| Sales | Week/month/year revenue+orders; payment status split; delivered/cancelled/returned rates = status count / all orders | orders/payment ledgers |
| Products | Top units/revenue and category share; cancelled lines excluded | `order_items` joined order status, products/categories |
| Customers | total; registered/guest; repeat = ≥2 orders; new by period; average orders; top spend | customers + orders |
| Marketing | promo uses, discount given, attributed non-cancelled order revenue; active promo count; review/contact moderation counts | promo codes/redemptions/orders/reviews/contact messages |
| Geography | orders, non-cancelled revenue, customers, repeat, AOV by governorate | orders/customers |

The UI explicitly says web visits, sessions, page views, conversion, devices, channels and top pages are “not connected yet” (`page.tsx:630,1083`). This is honest, not mock data. Risk: client-side scans cap orders 5,000, items 12,000, payments/refunds 8,000, customers/redemptions 5,000, so lifetime totals silently truncate after scale thresholds.

### `/admin/cms`

Files: `src/app/admin/cms/page.tsx:1-1613`; service `src/lib/admin/admin-cms.ts:369-495`.

| Tab | Tables/columns/actions | Public consumer |
|---|---|---|
| Blog | image/title/category/author/status/date; create/edit/duplicate/archive/publish; bilingual excerpt/body/images/tags/read time | `blog_posts` via `save_admin_blog_post`; `/blog` and `/blog/[slug]` consume published rows |
| Reviews | customer/rating/comment/product/status/featured/hidden; add/edit/approve/reject/feature/hide | `reviews` via `save_admin_review`; homepage consumes approved non-hidden rows |
| Legal Pages | page type/version/status/last-updated; bilingual sections; preview/save draft/publish | `legal_pages` via `save_admin_legal_page`; **no public route consumer currently** |
| Contact Messages | sender/contact/subject/message/status/internal note; copy, in-progress/replied/archive/save note | `contact_messages`; created by both public contact forms; never public-readable |

Legal publishing is a disconnected admin action: it persists but does not change `/privacy`, `/terms`, `/shipping`, or `/returns`.

### `/admin/customers`

Files: `src/app/admin/customers/page.tsx:1-613`; `CustomerDrawer.tsx`; service `src/lib/admin/admin-customers.ts:296-622`.

- KPI cards: Total, Registered, Guest, Repeat, VIP, Inactive >90d (`page.tsx:374-418`).
- Filters: all/registered/guest/VIP/repeat/new/inactive/at-risk/wholesale; sorts by spend/orders/activity/inactivity; search.
- Table/drawer: identity/contact/type, joined/last order, order count, spend, addresses, order/payment/refund/status activity, tags, computed segments/lifecycle and suggested promotion.
- Sources: `customers`, `customer_addresses`, `orders`, payment/refund/status ledgers. Tags update `customers` directly.
- Segments are application formulas in `admin-customers.ts:565-622`, not persisted truth; owner should treat them as operational suggestions.
- Scan limits in service mean large histories can be partial; document thresholds before launch-scale usage.

### `/admin/accounting`

Files: `src/app/admin/accounting/page.tsx:1-2491`; calculations `src/lib/admin/admin-accounting.ts:307-700`; purchasing `admin-purchasing.ts`.

| Tab/workflow | Visible content / formula | Source / side effect |
|---|---|---|
| Overview | P&L: Delivered Net Sales − COGS = Gross Profit; margin = GP / delivered net sales; GP − operating expenses = Net Profit. Cash, receivable, payables, returns, monthly chart | Orders, stored COGS, expenses, ledgers, purchases |
| Revenue | Product subtotal, discounts, delivery, net product sales, delivered basis, payment method/status | Orders and payment/refund ledgers |
| Purchases | Supplier/date/reference/lines/total/paid/unpaid/status; add draft; receive draft | `create_purchase` raises payable but no stock/P&L; `receive_purchase` creates FIFO lots/movements and stock |
| Expenses | category/amount/date/method/reference/note; add | Direct `expenses` insert; operating expenses affect net profit |
| Suppliers | payable summary; pay supplier partially/fully | `record_purchase_payment`; reduces payable, does not change order cash metrics |
| Activity | inflow/outflow/neutral timeline | Synthesized from real ledgers and events |

Exact accounting details (`admin-accounting.ts:419-535`): net product sales = subtotal − discount; delivered net sales uses delivered order sales basis; gross profit = delivered net sales − stored `orders.cogs_total`; net collected = all recorded payments − refunds; net profit = gross profit − operating expenses. Packaging/flavor/bean costs enter COGS through order snapshots/fulfillment SQL. Limits: orders 5,000; ledgers 8,000; purchases/expenses 2,000; supplier payments/returns 5,000.

### `/admin/settings`

Files: `src/app/admin/settings/page.tsx:1-477`; `src/lib/admin/admin-settings.ts:67-346`.

- Sections edit brand name/tagline/logo, contact phone/WhatsApp/email/location, social URLs, and storefront open/closed notice (according to `AdminSettings` contract).
- Loads/saves `site_settings` keys and defensively maps known public fields. Admin UI says changes are saved to Supabase.
- Public consumers: Header, Footer, Contact page, homepage contact, checkout store notice/closed behavior and WhatsApp handoff.
- Delivery pricing is explicitly not settings-controlled; `resolve_delivery_fee()` owns it.

### `/admin/espresso-manager`

Files: `src/app/admin/espresso-manager/page.tsx:1-379`; `src/lib/admin/admin-espresso.ts:108-198`.

- Real bean catalog + stock status cards. Fields include bilingual name, family/origin/active/sort and pricing/cost/metrics supported by the type; save uses `upsert_espresso_bean`.
- Stock is displayed from `espresso_bean_stock`; adjustments occur in Inventory, not this editor.
- Checkout validates custom espresso keys/prices and reserves bean FIFO from these tables.
- **Critical content wiring note:** public studio still renders `data/espressoBeans.ts`, so manager edits may not be visible until checkout.

### `/admin/flavor-manager`

Files: `src/app/admin/flavor-manager/page.tsx:1-405`; `src/lib/admin/admin-flavor.ts:130-214`.

- Tabs: Bases and Flavors. Bilingual catalog/pricing/active/sort/metric fields are persisted through `upsert_flavor_base` and `upsert_flavor_item`.
- UI accurately states flavors are price/catalog-only and not stock tracked (`page.tsx:395`). Checkout snapshots optional costs and recognizes COGS on delivered.
- Public studio still renders local `flavorData.ts`; admin edits may not be visible until checkout validation.

## Admin owner edit paths and side-effect warnings

| Owner action | Public/account effect | Side effects to understand |
|---|---|---|
| Edit/archive product/category | Catalog, cards, nav/category pages | Historical order snapshots remain; active carts may become stale |
| Change variant price | Product/cart next load | Checkout re-prices; existing local carts can display an old snapshot until submission |
| Change order status | Account timeline/admin/accounting | Cancel releases reservations; delivered deducts and records COGS; transition rules enforced |
| Record payment/refund/return | Payment state/cash/returns | Refund does not change stock; sellable return may restock; payment not tied automatically to delivery |
| Publish blog/review | Blog/home testimonials | Subject to public status/date/hidden filters |
| Publish legal page | No current public effect | Disconnected consumer: fix wiring before relying on it |
| Edit bean/flavor | Checkout truth only | Public builder display remains static and may drift |
| Receive purchase | Inventory/accounting | Creates lots and stock; irreversible operational event without a compensating workflow |

