# Line Coffee V3 — Refactor and Documentation Plan

Audit date: 2026-07-12  
This is a proposal only. No refactor, move, deletion or migration was performed.

## 1. Current architecture

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4; Supabase JS 2; Recharts for admin charts.
- `src/app`: filesystem routes. Root layout owns public header/footer, language and cart. `(public)` groups customer routes; `admin` has a separate gated shell; one Telegram route handler exists.
- `src/features/website`: homepage, checkout and two custom-builder feature areas.
- `src/components`: public/admin layouts, product cards, admin feature panels/drawers, UI/error/icon primitives.
- `src/lib`: Supabase browser client; public catalog/CMS; account/checkout; admin service modules; SEO; types; contexts/hooks; static content.
- `supabase/migrations`: additive evolution from catalog/orders through FIFO, customer ownership, accounting, builders, CMS, settings, notifications, storage, announcements and launch hardening.
- Security boundary: Supabase RLS/grants/definer RPCs; no service-role client. Next middleware is only a presence-cookie UX gate.
- Styles/tokens: large `src/app/globals.css` plus local utility classes; admin/public visual responsibilities are separated by naming/layout.
- Documentation: current state plus multiple older plans/audits/logs; substantial historical duplication.

## 2. Folder organization review

### Keep

- Route groups and admin/public layout separation.
- Feature-specific checkout and builder directories.
- Public/admin service separation and one Supabase client.
- Domain type modules under `src/lib/types`.
- Migration chronology; never rewrite/delete applied migrations.

### Improve later

| Priority | Current issue | Proposed destination/shape | Risk/control |
|---|---|---|---|
| P1 | Public builder UI data and admin DB catalogs diverge | `src/lib/builders/public-builders.ts` reads cost-free public views; local files retain presets/labels only | Requires grants/public-view review and checkout parity tests |
| P1 | Legal CMS disconnected | `src/lib/cms/public-legal.ts` + server legal route loader with static fallback | Preserve published-only RLS and no raw HTML |
| P1 | Browser admin aggregates duplicated | Database aggregate RPC/view layer + thin typed `admin-reporting.ts` | Formula migration needs reconciliation tests |
| P2 | `lib/mock-data/visual-content.ts` is not really mock | Rename to `lib/content/homepage.ts` after import-only patch | Low, but update docs/scripts |
| P2 | Very large route/page files | Feature folders: `features/admin/accounting`, `cms`, `analytics`, `catalog` | Split by tab/workflow, no behavior change first |
| P2 | Obsolete dashboard placeholder folder | Delete after reference/build verification | Low |
| P2 | Admin language translation file is a 969-line string map | Namespaced message dictionaries with typed keys | Avoid changing visible translations during mechanical move |
| P3 | Root historical docs clutter | `docs/archive/<year>/<phase>/`; index with status | Owner approval and link updates |

## 3. Large/mixed files

| Priority | File | Lines (audit) | Problem | Proposed split |
|---|---|---:|---|---|
| P1 | `src/app/admin/accounting/page.tsx` | 2,491 | Six tabs, three large mutation drawers, charts and orchestration | `AccountingPage`, tab components, `AddExpenseDrawer`, `AddPurchaseDrawer`, `PaySupplierDrawer`, form schemas/hooks |
| P1 | `src/app/admin/cms/page.tsx` | 1,613 | Four content domains and all editors/tables | `features/admin/cms/{blog,reviews,legal,contact}` + shared drawer primitives |
| P1 | `src/app/admin/products/page.tsx` | 1,333 | Products/categories/KPIs/filters/editor launch | Split product list, category manager, KPI/filter model; keep drawers separate |
| P1 | `EspressoBlendStudio.tsx` | 1,235 | Catalog, recommendation engine UI, manual ratios, cart panel | Catalog hook, Guide panel, Bean library, Ratio editor, Live cart; preserve engine tests |
| P1 | `PublicHeader.tsx` | 1,205 | Five data domains, polling, desktop/mobile/drawers | Announcement, PrimaryNav, AccountMenu, CartDrawer, WishlistDrawer, NotificationsMenu |
| P1 | `ProductDrawer.tsx` | 1,170 | Identity/content/pricing/media/inventory editor | Tab components with one form controller; isolate immediate image-delete semantics |
| P1 | `admin-catalog.ts` | 1,159 | mapping, queries, create/update/category/variants | `catalog-mappers`, `products-repository`, `categories-repository`, `variants-repository` |
| P1 | `admin-analytics/page.tsx` | 1,112 | six tabs and charts | Tab components; dynamic load charts |
| P1 | `admin-orders.ts` | 1,063 | order mapping + status + finance/returns | read repository, lifecycle service, finance service, shared mapper |
| P2 | `admin-i18n.ts` | 969 | translation data and helpers | locale JSON/TS dictionaries by feature |
| P2 | `PackagingInventoryPanel.tsx` | 914 | catalog editor, adjustment, ledger, shortages | four panels/drawers |
| P2 | `admin-purchasing.ts` | 874 | suppliers, purchases, lots, expenses | suppliers/purchases/inventory-lots/expenses repositories |
| P2 | `admin-inventory/page.tsx` | 806 | six tabs and mutations | tab modules + inventory orchestration hook |
| P2 | `PromoCodesPanel.tsx` | 782 | form, validation, list/table | editor drawer + list + schema |
| P2 | `FlavorMixStudio.tsx` | 762 | catalog/presets/scoring/cart | parallel builder primitives |
| P2 | `CheckoutForm.tsx` | 734 | prefill/settings/validation/promo/RPC/notification/navigation | `useCheckoutData`, form schema, submit service, sections; keep transaction flow explicit |

First split should be mechanical with characterization tests; do not combine a file move with formula/business changes.

## 4. Duplicated logic plan

| Domain | Current duplication | Target |
|---|---|---|
| Money/number/date | admin metrics, pages, cards, public account and MixedNumeric | Locale-aware `formatMoney`, `formatPercent`, `formatQuantity`, `formatDate`; explicit cents policy |
| Delivery | SQL and TS mirror plus legal copy | SQL authority; parity test fixture; policy content references exported zone descriptions |
| Order statuses | admin orders, analytics, accounting, public header/account | Shared semantic status constants/transitions generated from one contract; localized UI maps |
| Product cards | `ProductCard` / `CatalogProductCard` | Shared media/price/badge/actions primitives; context wrappers |
| Admin drawers/forms | repeated overlays/fields/actions | Accessible `AdminDialog/Drawer`, typed Field/Select/Notice components |
| Product pricing | public mapper/detail/cart/checkout/admin | DB authoritative; client display DTO from variants; integration tests for stale cart |
| Builder catalog | static public vs DB admin | Public cost-free views and typed public DTOs; remove all cost from client |
| Supabase error mapping | many local `readError`/devWarn variants | Domain-safe error types and redacted user messages |
| Reporting queries | dashboard/analytics/accounting scans | Server aggregate functions/views with shared definitions/date windows |
| Content | settings/env/default contact, legal arrays/CMS, journal static/CMS | Explicit precedence/fallback module and owner edit matrix |
| Route constants | repeated string links | Small typed route helpers only where they prevent actual drift |

## 5. Phased plan

### Phase A — Documentation consolidation (P0/P1, no behavior)

1. Owner reviews these six audit files and marks disputed facts.
2. Refresh `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` from verified findings.
3. Add a docs status index: Current / Reference / Archive.
4. Create the final master guide only after decisions.

Exit gate: owner can locate every data/content edit source and trusts current-state labels.

### Phase B — Dead docs/archive cleanup (P2)

Archive obsolete marketing handoff, old system audit/blueprint and completed visual plans with banners; compact project log/CLAUDE history; delete suspected placeholder components only after `rg`, typecheck, build and smoke.

### Phase C — Mock/static data decisions (P1)

1. Connect builder UI to cost-free public DB views; remove purchase costs from browser.
2. Connect published legal content with fallback.
3. Decide CMS vs code ownership for homepage/category/journal/social content.
4. Replace product taste heuristics with owner-managed real attributes or label/remove them.
5. Fact-check About/llms/legal/shipping claims.

### Phase D — Security fixes (P1)

Fix redirect validation; audit live Supabase policies/grants/definer search paths; add edge/app abuse controls; dependency patch; upload type/size policy; CSP report-only → enforce; production header verification.

### Phase E — SEO/AI search upgrades (P1/P2)

Verify launch domain/facts; dedicated builder canonical strategy; LocalBusiness only with verified NAP/hours; real updated dates; product semantic attributes; decide locale URL/hreflang model; Google Business Profile consistency checklist.

### Phase F — Performance refactor (P1)

Move reporting to aggregate RPCs; server-render initial catalog/blog/legal data; add cache/revalidation invalidation; paginate admin lists; split/lazy-load charts/studios; optimize/validate uploaded images; capture Web Vitals budgets.

### Phase G — Code architecture cleanup (P2)

Mechanical large-file splits; shared format/status/dialog/product primitives; rename content folder; remove proven dead exports/components; keep domain boundaries.

### Phase H — Testing/QA automation (P0/P1)

Add DB/RPC integration tests, Playwright customer/admin smoke suites, accessibility checks, SEO response tests, reporting reconciliation and migration backup/restore drills.

## 6. Final master guide proposal

Target: `docs/LINE_COFFEE_V3_MASTER_SYSTEM_GUIDE.md`

Proposed table of contents:

1. Guide status, owners and last verified commit
2. Brand identity and verified claims
3. Tech stack and architecture diagram
4. Local setup/run and CI
5. Environment variables (names, scope, secret/public classification)
6. Supabase project, tables/views/RPCs/storage/RLS
7. Public website route/content map
8. Admin dashboard route/action map
9. Customer journey: discover → cart → checkout → account
10. Admin journey: catalog → inventory → orders → finance → CMS
11. Product/category/image/content editing guide
12. Checkout, pricing, delivery and promo rules
13. Order lifecycle and transition matrix
14. Finished-product/bean/packaging inventory lifecycles
15. Accounting formulas and reconciliation
16. Customer ownership/auth/wishlist/cart behavior
17. Notifications: Telegram/WhatsApp/status events
18. SEO/GEO/AEO/AI-search model
19. Security model and access matrix
20. Error handling, logging and debugging guide
21. Automated/manual testing checklist
22. Known limitations and decision backlog
23. Deployment/launch checklist
24. Backup, migration and rollback runbook
25. Change-control/documentation update rules

Each section should state source files/RPCs, owner edit path, validation command, and last verified date. Do not paste historical narratives into the guide; link archive entries.

## 7. Cleanup rules

- Delete only after zero-reference search, framework/dynamic-use check, relevant test/build and owner approval for content/history.
- Archive completed plans, prompts, audits and long histories; do not let them compete with current state.
- Merge stable facts into the master guide; link rather than duplicate formulas.
- Owner approval required for brand claims, policy text, images, product catalog, cost data, legacy docs and analytics definitions.
- Never delete/rewrite applied migrations, order/accounting ledgers, seed provenance, legal history or storage objects without backup, dependency mapping and rollback.
- Any reporting formula change requires before/after reconciliation against fixed sample orders.

## 8. Testing plan

### Customer smoke

- EN/AR/RTL; header/footer/announcement/settings fallbacks.
- Browse/search/filter/category/detail; image/error/not-found; price/variant/badge.
- Guest/auth cart isolation; wishlist isolation; stale cart price.
- Checkout each delivery zone/payment method/promo status; double-submit/replay/store closed/stock failure.
- Success WhatsApp once/manual; Telegram failure does not lose order.
- Blog/CMS review/legal/contact flows; legal publish reaches website after wiring.
- Account cross-device auth and same-device guest; ownership denial for another order/address.

### Admin smoke

- Signed out/non-admin/disabled/admin/super-admin access.
- Product/category CRUD/archive/restore/image staging/delete/variant/threshold.
- Order valid/invalid status transitions, fee override, payments/refunds/returns/notes.
- Inventory adjustments/FIFO/packaging shortages/suppliers.
- Promo/announcement dates/limits/activation; CMS status/public visibility.
- Builder edit appears publicly and checkout matches.
- Accounting purchase create/receive/pay and expense; analytics/report reconciliation.

### Automated layers

- Unit: delivery parity fixtures, formatters, builder scoring, status maps, promo/error mapping.
- SQL/integration: checkout price/stock/promo/idempotency, FIFO release/deduct/return, customer ownership, admin authorization, accounting snapshots.
- Playwright: core customer and admin journeys, mobile/RTL, visual snapshots where stable.
- Accessibility: axe plus keyboard/dialog/select/focus manual tests.
- SEO: metadata/canonical/schema/robots/sitemap/llms response assertions.
- Performance: budgets for LCP/INP/CLS, route JS, query count and aggregate latency.

## 9. Monitoring/logging plan

| Event | Required signal | Alert/runbook |
|---|---|---|
| Checkout failure | attempt ID, safe error class, item kinds, user/guest hash, duration; never secrets/full address | Spike alert; distinguish inventory/promo/schema/network |
| Telegram failure | order ID, response class/status, retry count; durable sent state | Retry queue/manual resend; alert sustained failures |
| Supabase errors | operation/table/RPC, code, latency, request correlation | Error-rate/latency alert by domain |
| Admin mutation | admin user, action, entity, before/after safe diff, timestamp | Audit trail; sensitive fields redacted |
| Order status | actor/from/to/note, inventory effect result | Reconcile stuck reservations/COGS |
| Image upload/delete | admin/product/path/type/size/result | Orphan/missing-primary report |
| Reporting | data horizon, max scanned row/date, calculated timestamp | Warn incomplete/capped data; later DB reconciliation |
| Contact/auth abuse | rate-limit decision and coarse source fingerprint | Tune thresholds without storing excess PII |

## 10. Backup and migration safety

1. Export schema, policies/grants/functions and data backup before migrations.
2. Review migrations for destructive DDL/DML, locks, function replacement, grants, rollback feasibility and data backfill.
3. Apply to staging clone with production-like volume; run RPC lifecycle tests and reporting reconciliation.
4. Define seed/reset separately: catalog seed must never overwrite production orders/accounting; launch reset requires an explicit table retention list.
5. Rollback is usually a forward compensating migration; never edit applied migration history.
6. Back up Supabase Storage metadata/objects as well as Postgres; test product image restoration.
7. Record migration version, operator, backup ID, validation results and go/no-go owner.
8. For order/inventory/accounting changes, reconcile reserved/available/on-hand, allocations, COGS, payments/refunds and payables before and after.

