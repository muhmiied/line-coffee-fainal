# Line Coffee V3 — Final Launch Audit

Audit date: 2026-07-16  
Audited branch: `main`  
Audited base commit: `e18110a427070d71a2af96711423d8cbfdc9a84c` (`feat: improve SEO accessibility and account navigation`)  
Auditor: Codex GPT-5  

This is a non-destructive production-closure audit. Source review is not treated as runtime proof, build success is not treated as load-test proof, and unavailable credentials are recorded as **Not tested**.

## 1. Executive verdict

**Verdict: Not launch-ready.**

The application is substantially implemented and the public storefront is stable in the tested production build. The catalog, builders, checkout pricing, order inventory lifecycle, accounting formulas, SEO foundation, bilingual rendering, and public RLS boundary have strong evidence. The code-level defects found in this pass were fixed and all final static/build/browser checks passed.

The verdict remains “Not launch-ready” because the anonymous checkout RPC does not have a robust abuse control in front of order creation and inventory reservation; authenticated customer and admin business flows could not be acceptance-tested without credentials; one live pending order carries a packaging-shortage marker; and deployment-owner controls such as the real domain/Auth redirects, leaked-password protection, monitoring, backups, and launch data still need explicit confirmation. A migration-gated concurrent Telegram double-send race also remains.

### Production readiness scorecard

| Category | Status | Evidence and strengths | Risks / blockers | Recommendation |
|---|---|---|---|---|
| Scalability | Needs work | Server-side pagination exists on key admin lists; public products are paged; local 10-way read smoke completed without failures. | Anonymous callers can rotate guest IDs and create COD orders/reservations; several admin/CMS reads use bounded client-side aggregation; no production load test. | Add an owner-approved edge/WAF/CAPTCHA/rate-limit control before launch; profile real traffic after launch. |
| Security | Needs work | Sensitive tables denied to anon in live tests; admin RPCs contain role checks; no service-role key; trusted server-side pricing; strong response headers. | Six Supabase `security_definer_view` errors, leaked-password protection disabled, CSP report-only, public bucket listing, and no robust checkout anti-abuse layer. | Resolve/accept each advisor finding, enable leaked-password protection, and deploy an abuse-control decision before opening the store. |
| Reliability | Needs work | Atomic checkout/FIFO/promo/packaging logic; replay-safe checkout attempt IDs; zero live invariant mismatches in core financial/inventory checks. | Telegram dedupe is not an atomic claim; signed-in/admin mutations are Not tested; one pending packaging-shortage order needs review. | Add an atomic notification claim/outbox after migration approval and complete credentialed release smoke. |
| Performance | Ready with non-blockers | Production build succeeds; representative local cold loads were 0.55–0.70 MB; local focused read smoke p95 was 539 ms and broad final route smoke p95 was 1.426 s. | These are local measurements, not production Core Web Vitals or capacity proof; some admin modules and category HTML are large. | Add production RUM/Speed Insights and watch category/admin payloads. |
| SEO/GEO/AEO | Ready with non-blockers | Canonicals, robots, sitemap, `llms.txt`, Open Graph, and route-specific JSON-LD were browser-verified. | `NEXT_PUBLIC_SITE_URL` is absent locally; builder query entries canonicalize to `/products`; product-specific imagery is sparse. | Set and verify the production domain, submit Search Console, and complete product media. |
| Maintainability | Ready with non-blockers | Clear public/admin boundaries, shared catalog mappers, typed data layers, clean TypeScript/ESLint, and no duplicate public layout ownership. | Historical docs were stale; a few large admin components and bounded aggregate queries remain. | Keep this audit/current-state docs canonical and split large modules only when changing them. |
| Observability | Needs work | Durable order notification log, order status events, inventory movements, and financial ledgers exist. | No connected error monitor, uptime monitor, behavioral traffic source, or verified production CSP reporting endpoint. | Connect error/uptime/RUM monitoring and define alert owners/rollback thresholds before launch. |
| Deployment readiness | Blocked | Clean production build and final production server smoke on port 3001. Local/remote migrations match. | Credentialed acceptance, production environment/domain/Auth/SMTP, backups, launch stock/promos, monitoring, and rollback approval remain unconfirmed. | Complete Sections 25–26 and re-run the credentialed launch smoke. |

## 2. Tested branch, commit, and working-tree state

- Preflight branch: `main`.
- Preflight commit: `e18110a427070d71a2af96711423d8cbfdc9a84c`.
- Preflight working tree: 27 modified tracked files plus the untracked audit document from the interrupted prior session. The owner explicitly approved continuing on top of all 28 items as prior-session work; nothing was discarded or reset.
- Worktree during final verification: only the approved prior-session changes plus the resumed scoped architecture, proxy, test-runner, and documentation changes listed in Section 28. Generated screenshots were stored outside the repository; temporary runtime processes/artifacts were removed or stopped before handoff.
- No commit, push, pull request, deployment, branch change, database write, or production-secret change was performed.

## 3. Environment tested

| Surface | Evidence | Result |
|---|---|---|
| Development/source | Repository inspection, TypeScript, ESLint, dependency graph, secret/dead-code scans | Pass |
| Production build | Next.js 16.2.9, React 19.2.4, webpack build, 42 generated pages | Pass twice after final edits; no framework warning after proxy migration |
| Production server | `next start -p 3001` | Pass |
| Browser | Headless Chromium/Playwright against the production server | Pass for public/signed-out coverage |
| Database | Linked live Supabase schema, advisors, privileges, safe-view reads, invariants, and migration parity | Pass with findings in Sections 11 and 13 |
| Languages | English LTR and Arabic RTL | Pass on tested routes |
| Viewports | Earlier audit: 1920, 1440, 768, 430, 375, and 320 px; final repeatable run: 1440 desktop and 390 mobile | Pass on tested representative routes |
| Authenticated customer | Credentials unavailable | **Not tested** |
| Authenticated admin | Credentials unavailable | **Not tested** |

## 4. System architecture map

- Next.js App Router owns the web application. The root layout owns document metadata/fonts and initial cookie-derived `lang`/`dir` only. The `(public)` layout owns the language/cart providers, public business JSON-LD, header, footer, skip link, and main landmark. Admin uses its own language provider/protected shell and does not mount the public cart/settings/structured-data tree.
- Public site-settings reads are isolated in `src/lib/settings/public-site-settings.ts`; safe types/parsing/normalization live in `site-settings-shared.ts`; authenticated admin reads/writes remain in `src/lib/admin/admin-settings.ts`.
- `src/proxy.ts` gives signed-out admin visitors an early UX redirect using a non-authoritative presence cookie. The admin resolver and database RLS remain the security boundary.
- Public catalog reads use the anon/publishable key against six curated public views: products, categories, variants, espresso beans, flavor bases, and flavor items.
- Private reads and every write rely on Supabase RLS plus validated `SECURITY DEFINER` RPCs. The browser never has a service-role key.
- Product prices, promo eligibility, delivery fees, order totals, packaging allocation, inventory reservation, FIFO allocation, and cost snapshots are recomputed in PostgreSQL at checkout.
- The cart and unsent builder configurations are browser-local and owner-scoped. Orders, customers, addresses, wishlist ownership, notifications, inventory, accounting, CMS, settings, and admin data are Supabase-backed.
- The only narrow server route is `/api/order-notifications/telegram`; it reads server-only Telegram credentials and builds its message from a trusted saved-order snapshot returned by the database.
- Builder entry points are `/products?category=make-your-espresso` and `/products?category=make-your-flavor`. They are intentional product-page modes, not standalone canonical routes.

### Data-source classification

| Area | Source | Trust boundary |
|---|---|---|
| Product/category/variant storefront | Supabase public views | Read-only curated columns |
| Espresso/flavor builders | Supabase public builder views | Read-only pricing/catalog; no fake fallback after this pass |
| Cart | `localStorage`, guest/auth namespaced | Untrusted; server re-prices at checkout |
| Checkout/order | `create_checkout_order` RPC | Database authoritative and atomic |
| Customer account | Auth UID or validated guest ID through scoped RPCs | Database ownership resolver |
| Admin | Auth session + `admin_users` + RLS/RPC guards | Database authorization |
| Telegram | Next server route + saved-order RPC snapshot | Server secret + trusted database payload |
| WhatsApp | Saved checkout handoff + validated public setting | Client opens a prefilled external link |
| Homepage visual fallbacks | Versioned static assets | Presentation-only; no price/stock/business fallback |

## 5. Static checks

- `npx tsc --noEmit`: pass, zero errors.
- `npm run lint`: pass, zero errors and zero warnings.
- `npm run build`: pass twice after final edits; all 42 application pages generated/compiled without the former middleware-convention warning.
- `npm audit --omit=dev`: zero vulnerabilities after pinning transitive PostCSS to 8.5.15.
- Clean `npm ci`: 411 packages installed from the lockfile; audit remained at zero vulnerabilities. `npm ls` confirmed Next 16.2.9, React/React DOM 19.2.4, Supabase JS 2.108.2, and PostCSS 8.5.15; npm reports optional WASM support packages as extraneous on this Windows install, but exits successfully and the native production build passes.
- `git diff --check`: clean apart from Git's local LF→CRLF notices; no whitespace errors.
- Tracked-secret scan: no credentials or service-role key found.
- Escape-hatch scan: no new TypeScript ignores, ESLint disables, swallowed error boundaries, broad `ssr: false`, console suppression, or fake business-data fallback introduced.
- Native Windows Next SWC was repaired locally; the final build used the native binding. This did not add a direct package dependency.
- `node scripts/generate-catalog-seed.mjs --check`: pass after updating its stale post-cleanup assertions to the current 124 products / 372 variants. The historical catalog source remains tooling input, not a runtime data source.
- `scripts/final-production-smoke.mjs`: ESLint-clean and repeatably passes against `next start`; it performs read-only route/browser checks and never submits checkout/contact/admin actions.

## 6. Route matrix

The earlier broad production-server sweep tested 177 unique URLs: all 146 sitemap URLs plus private/auth/admin/builder extras, with 164 HTTP 200 and 13 expected HTTP 307 admin-to-login redirects. The resumed final repeatable runner rechecked all 146 sitemap URLs plus 9 public/private/auth/admin extras (155 unique routes) and found zero 4xx, 5xx, timeout, or network failures.

| Family | Representative coverage | Result |
|---|---|---|
| Public core | `/`, `/about`, `/contact`, legal/shipping/returns/reviews | Pass |
| Catalog | `/products`, 7 category routes, 124 product routes | Pass |
| Builders | Both query-based builder entries | Pass; live catalogs loaded |
| CMS/SEO | `/blog`, 6 posts, sitemap, robots, `llms.txt` | Pass |
| Cart/checkout | `/cart`, populated `/checkout`, `/order-success` shell | Pass without placing an order |
| Auth | login, signup, forgot, reset | Pass signed out |
| Account | profile/orders/addresses/wishlist/notifications/settings | Signed-out protection pass; authenticated behavior Not tested |
| Admin | 13 top-level admin routes | Expected 307 to login; authenticated rendering/mutations Not tested |
| Telegram API | GET, invalid origin/body/oversize tests | 405/403/400/413 as expected |

Browser representatives had one visible H1, one main landmark, no horizontal overflow, no visible error boundary, and no console/page errors.

## 7. Public findings

- Homepage, products, category, product detail, builders, blog, article, about, contact, legal, cart, checkout, order-success shell, and signed-out account/auth surfaces rendered in the production server.
- Final public catalog: 124 products, 7 categories, and 372 variants. Every product has exactly 250g, 500g, and 1kg; no duplicate slugs, duplicate product/size pairs, orphan public variants, invalid prices, or missing bilingual required names were found.
- Builder catalogs are live and valid: 27 espresso beans, 4 flavor bases, and 29 flavor items; no invalid keys/prices/categories or duplicates.
- The two builders previously contained static business-data fallbacks. Those fallbacks were removed. A failed or empty live query now shows a bilingual retry state and disables add-to-cart.
- Public cards/detail/wishlist now consume the database-derived `is_available` signal and fail closed when product inventory reaches zero.
- 123/124 public products and all 7 categories currently have no database image URL. Versioned category/product assets keep rendering functional, but product-specific media completion is an owner content-quality item.
- `/reviews` resolves to the approved contact/review experience. No standalone review data leak was observed.

## 8. Auth and customer findings

- Supabase Auth is real; login/signup/forgot/reset pages render without runtime errors.
- Email, current-password, new-password, name, and confirmation fields now expose appropriate `name`/`autocomplete` metadata.
- Signed-out account routes redirect or resolve to login without exposing customer content.
- Source review confirms registered ownership resolves by Auth UID and guest ownership by validated device guest ID; guest data linking requires an authenticated same-device action and does not auto-merge by email/phone.
- Password reset intentionally avoids account-existence disclosure.
- Credentialed signup/login/recovery, cross-device account ownership, addresses, wishlist persistence, notifications, order-detail ownership, logout-all, and session refresh are **Not tested**.
- Supabase Auth Site URL, redirect allowlist, SMTP delivery, recovery emails, production rate limits, and leaked-password protection require owner verification.

## 9. Admin findings

- All admin top-level routes reject a signed-out browser with 307 login redirects.
- A spoofed UX cookie does not grant access: the server/admin resolver and RLS still redirect and expose no dashboard content.
- Admin data layers use real tables/RPCs for dashboard, orders, products/categories, inventory, espresso/flavor managers, customers, accounting, analytics business metrics, CMS, promo codes, packaging, suppliers/purchases, and public settings.
- Admin Products previously derived stock badges from 372 null legacy variant `stock_state` fields. It now uses the real `inventory_stock.available_kg` and low-stock threshold, matching Admin Inventory.
- Marketing now contains only real Promo Codes and Announcements; earlier fabricated offers/targeting/performance tabs were removed. Behavioral web-traffic analytics remains intentionally unconnected and is reported honestly.
- Admin components are route-chunked, but Accounting and CMS remain large modules and some reports use bounded client-side aggregation.
- Authenticated admin page rendering, role differences, CRUD, order transitions, payment/refund/return entry, inventory adjustments, promo/settings/CMS writes, and dashboard accuracy in the UI are **Not tested**.

## 10. Checkout and order findings

- Browser buyer-path smoke added an existing product to the local cart and opened populated checkout; no order was submitted.
- Cash on Delivery, InstaPay, and E-Wallet are present. Google Maps URL remains optional and validated.
- Delivery display mirrors the database rule: Shorouk/Madinaty 30 EGP; Haram/October/Sheikh Zayed 100 EGP; remaining Cairo/Giza 50 EGP; other governorates 0 in the Line Coffee total with courier-paid note.
- The RPC re-reads variants/prices, locks required rows, validates builder ratios, computes promo/packaging/delivery/totals, reserves FIFO inventory, and reuses `checkout_attempt_id` for idempotent replay.
- Live data had zero duplicate checkout-attempt IDs and zero order total or line-subtotal formula mismatches.
- The UI submit guard was tested with invalid/empty data only; no order, customer, promo redemption, packaging deduction, inventory reservation, or notification was created.
- **High risk:** the anonymous RPC has only a client-rotatable device token/guest ID control. A bot can create many COD orders and reserve stock. A robust control requires an owner decision/new infrastructure and was not invented in this pass.

## 11. Inventory and packaging findings

- Live invariants returned zero mismatches between finished-product balance and FIFO lots, espresso stock and lots, order allocation inequalities, packaging arithmetic, or delivered COGS snapshots.
- Lifecycle remains: reserve product/raw stock at checkout; deduct FIFO lots at delivered; release on cancel. Packaging deducts at checkout; flavor is cost-only.
- All 124 public products were available during the audit. The public UI now honors the live availability boolean.
- Four historical orders carry packaging-shortage markers: two cancelled, two not cancelled. One is delivered and one is still pending. The pending order needs owner review before opening the store.
- Three historical orders lack the later Phase 6–7 marker: one cancelled and two delivered. They predate the wrapper and do not create a current invariant mismatch.
- Variant `stock_state` is null across all 372 variants; product-level inventory is the authoritative model. Admin Products was corrected to stop relying on the legacy field.

## 12. Telegram and WhatsApp findings

- Telegram route rejects GET, cross-origin POST, invalid JSON/body, and payloads over 2 KB with the expected status codes.
- The browser sends only order ID and checkout-attempt proof. The route fetches a trusted saved-order snapshot before composing a message; Telegram secrets remain server-only.
- Sequential replays are checked against `order_notifications`; Telegram failure does not roll back a saved order.
- **Concurrency finding:** `was_sent` followed by send followed by unique log is not an atomic claim. Two cold serverless instances can both observe “not sent” and both call Telegram before one log insert loses the unique race. Fixing this safely requires a migration-approved claim/outbox state or database lock.
- WhatsApp uses a validated saved-order handoff and public phone configuration. The success page limits auto-open behavior per browser session and keeps a manual action.
- A real Telegram message and a real WhatsApp handoff after a newly placed order were **Not tested** to avoid production side effects.

## 13. Security and RLS findings

### Verified strengths

- Direct anon reads were denied for orders, customers, admin users, inventory, contact inbox, promos, payments/refunds/returns, and wishlist. The six public catalog/builder views were readable and exposed only sale/catalog fields.
- `customer_wishlist` does not have RLS enabled, but anon/authenticated have no direct table privileges; access is through scoped RPCs.
- All sampled admin `SECURITY DEFINER` functions include `is_admin()`/`is_super_admin()` checks. Account guest functions are intentionally callable and enforce ownership/proof internally.
- Public/anon/authenticated roles do not have schema CREATE privilege, reducing search-path object-hijack risk. Recent hardening pins critical functions.
- No service-role key or tracked secret was found.
- HSTS, frame denial, MIME sniff denial, strict referrer policy, and permissions policy are enforced.

### Advisor and configuration findings

- Supabase security advisor: 6 `security_definer_view` errors for the curated public views; 20 anon-executable and 46 authenticated-executable `SECURITY DEFINER` warnings; public `product-images` listing; leaked-password protection disabled.
- The public views were individually inspected and expose safe columns, but blindly switching them to invoker mode would break their current underlying RLS design. Any redesign requires an approved migration and regression plan.
- Performance advisor: 11 multiple-permissive-policy findings and 3 auth-initplan findings (`customers`, `admin_users`, `customer_addresses`). These are optimization/clarity work, not a demonstrated data leak.
- CSP is `Content-Security-Policy-Report-Only` and still permits inline script/style. It was not promoted to enforcing without authenticated/admin and real-order coverage.
- Public bucket object listing exposes file metadata by design. Write access remains admin-gated.

## 14. SEO, GEO, and AEO findings

- Browser checks confirmed canonical URLs, descriptions, index/noindex behavior, Open Graph metadata, and valid route-specific JSON-LD.
- Product JSON-LD uses the live minimum variant price, EGP currency, database-derived availability, canonical product URL, and no fabricated rating.
- Category pages emit CollectionPage/Breadcrumb data; blog posts emit Article/Breadcrumb; contact emits ContactPage/FAQ; global Organization/WebSite/Store data is present.
- Private cart/checkout/order/auth pages are noindex/nofollow and omit canonicals.
- `robots.txt`, dynamic sitemap, and `llms.txt` respond successfully. The sitemap contained 146 URLs at audit time.
- Builder query modes intentionally canonicalize to `/products` and are omitted as separate sitemap URLs. If the owner wants them independently discoverable, that is a future information-architecture decision, not a closure patch.
- Production must explicitly set `NEXT_PUBLIC_SITE_URL`; local audit environment used the safe `https://linecoffee.eg` fallback.

## 15. Accessibility findings

- Added a bilingual skip link and one focusable public main landmark.
- Removed nested main landmarks from products, category, and product-detail templates.
- Added associated labels/required semantics to checkout identity/address/custom-select/payment-detail fields and search labels to products/category/blog.
- Checkout governorate/area triggers now expose combobox semantics and `aria-required` without applying unsupported ARIA to a plain implicit button role.
- Added correct auth `autocomplete` metadata and changed checkout empty state to a real H1.
- Footer heading levels now avoid H2→H4 jumps.
- Mobile menu opens with focus on Close, traps forward/backward Tab inside the dialog, closes with Escape, and returns focus to Open menu.
- Final manual DOM sweep on home/products/blog/contact/login/populated checkout: zero unnamed visible fields/buttons/links, zero missing image `alt` attributes, zero duplicate IDs, zero heading jumps, one H1, one main, and no horizontal overflow.
- This was a targeted browser/DOM audit, not a formal WCAG conformance certification or screen-reader lab.

## 16. Performance findings

- Representative local cold transfer totals: home 698 KB; products 587 KB; espresso builder 549 KB; flavor builder 545 KB; product detail 619 KB; blog 546 KB.
- Home measured about 241 KB script, 253 KB CSS, 92 KB images, and 44 requests in the local lab.
- Focused safe GET smoke across home/products/product at concurrency 10: p50 235 ms, p95 539 ms, maximum 630 ms.
- Final broad 177-URL production-server sweep at concurrency 10: p50 386 ms, p95 1,426 ms, maximum 1,509 ms.
- Build output is route-chunked; the scanned application chunk set was 2.72 MB across 111 files, largest about 333 KB. Home page/application layout chunks were approximately 60 KB each.
- Category routes can render many products server-side and some admin pages are large. These are watch items, not failures at the current 124-product scale.
- No claim is made about production Core Web Vitals, CDN behavior, sustained throughput, database connection saturation, or mobile hardware performance.

## 17. Scalability and concurrency findings

- Checkout locks and computes pricing/inventory atomically and uses a stable attempt ID, reducing duplicate-order and oversell races for honest callers.
- Promo usage, FIFO allocation, packaging, finished-product stock, and builder bean reservations use database locking/invariants.
- The unresolved checkout abuse path can intentionally consume order/inventory capacity without rotating a stable identity.
- Telegram notification dedupe is sequentially durable but not an atomic concurrent claim.
- Admin customer/accounting/analytics/CMS code contains explicit row caps (commonly 500–5,000) and client-side aggregation. Current live cardinality is small, but these paths need server-side pagination/aggregation before material growth.
- The local concurrency smoke is a regression check only; no destructive order-write load test was run.

## 18. Reliability and deployment findings

- Production build and production start are reproducible locally.
- Linked local/remote migration histories are in parity through `20260715120000`.
- Checkout, inventory, promo, packaging, delivery, and COGS are database-authoritative and replay-aware.
- Store-open enforcement is server-side and replays existing checkout attempts safely.
- No production environment, hosting project, deployment alias, DNS, SMTP, backup, monitoring, or rollback action was changed.
- Deployment remains blocked on the owner checklists, credentialed flow acceptance, abuse-control decision, and pending packaging-shortage review.
- The Next 16 proxy convention now replaces the deprecated middleware filename with unchanged UX-only redirect behavior; the final build is warning-free.

## 19. Observability findings

- Existing durable operational evidence includes orders/order items, status events, payments/refunds/returns, inventory/packaging movements, FIFO allocations, expenses/purchases/supplier payments, contact messages, and notification logs.
- Developer-only warnings are scoped and no PII was observed in browser console output.
- There is no verified production error monitoring, uptime monitor, RUM/Core Web Vitals, behavioral page/session analytics, or alert/incident ownership.
- CSP is report-only but no reporting endpoint/monitoring workflow was verified.
- Define alerts for checkout RPC errors, order rate spikes, inventory reservation spikes, Telegram failures/duplicates, Auth failures, and Supabase capacity before launch.

## 20. Maintainability and navigation findings

- Route/layout/provider ownership is coherent: public providers/header/footer/business JSON-LD are scoped to `(public)` and do not wrap admin; public catalog mapping is shared by server and client.
- Public settings reads no longer import an admin-owned module. Public data access, neutral shared mapping, and admin writes have explicit one-way ownership.
- Builder fake business fallbacks were removed rather than hidden behind error suppression.
- Availability is now a shared typed catalog field, and Admin Products uses the same inventory source as Admin Inventory.
- Checkout field primitives now own label/required behavior instead of repeating inaccessible markup.
- The historical `mock-data/product-catalog.ts` is retained only because the deterministic seed-review tool consumes it; runtime imports are zero. Its stale count assertions were corrected rather than deleting a tooling dependency.
- Stale project documentation was corrected and this audit is the closure reference.
- Large files such as Admin Accounting/CMS and broad public header remain maintainability risks. Split only as part of future feature work with regression coverage.

## 21. Accounting reconciliation

Point-in-time live audit values:

| Measure | Value |
|---|---:|
| Orders | 14 |
| Delivered / cancelled / pending / returned | 4 / 7 / 2 / 1 |
| Delivered revenue | 1,495.00 EGP |
| Delivered COGS | 396.95 EGP |
| Delivered gross profit | 1,098.05 EGP |
| Operating expenses | 100.00 EGP |
| Delivered-basis net profit | 998.05 EGP |
| Payment ledger inflow | 500.00 EGP |
| Refund ledger outflow | 50.00 EGP |
| Purchases / supplier payments | 0.00 / 0.00 EGP |

- Zero mismatches were found in order total formulas, line subtotals, delivered COGS snapshots, duplicate promo redemptions, or duplicate order/channel notification rows.
- Profit and cash are intentionally different bases. Delivered revenue/COGS/expenses produce profit; payments/refunds/supplier payments produce cash/collection state. The values should not be forced to equal.
- Packaging cost was zero in the delivered snapshot set and matched the stored COGS invariants.
- A credentialed comparison against every rendered Admin Accounting card/table is **Not tested**.

## 22. Launch blockers

1. **Robust checkout abuse protection:** choose and deploy an edge/WAF/CAPTCHA/rate-limit design that cannot be bypassed by rotating guest IDs, then regression-test legitimate retries and idempotency.
2. **Credentialed acceptance:** test registered customer ownership and every launch-critical admin read/write flow with real test accounts/roles.
3. **Pending packaging shortage:** identify the live pending order with a shortage marker and resolve/accept it operationally.
4. **Production owner controls:** complete domain/Auth redirects/SMTP/environment/leaked-password protection/backups/monitoring/rollback checks in Sections 25–26.
5. **Launch data sign-off:** confirm real stock, packaging quantities, promo codes, announcements, storefront open/closed state, owner admin access, and QA-data cleanup.

## 23. Non-blockers

- Atomic concurrent Telegram claim is not implemented; sequential dedupe works, but a rare double-send race remains migration-gated.
- Six curated public views trigger Supabase `security_definer_view` errors. Their columns/privileges were verified safe, but the architecture should be reviewed rather than blindly toggled.
- CSP is report-only and permits inline script/style.
- Public product-image storage permits object listing.
- 11 multiple-permissive-policy and 3 auth-initplan advisor findings may affect clarity/performance.
- Product/category database media is sparse and falls back to versioned static assets.
- Builder entries are not independently canonical/indexed.
- Large admin modules and bounded client aggregates need future scaling work.

## 24. Deferred post-launch work

- Add an atomic notification claim/outbox after explicit migration approval.
- Redesign the six safe public views/policies only with an approved migration and anon regression suite.
- Promote CSP to enforcing after report telemetry and credentialed admin/order coverage.
- Add production RUM, error tracking, uptime checks, traffic analytics, and alerting.
- Move high-cardinality admin analytics/accounting/CMS aggregation server-side as data grows.
- Add product-specific media and verify image optimization/CDN behavior.
- Decide whether builders deserve standalone canonical routes.
- Extend the repeatable production browser runner with credentialed customer/admin roles once safe QA credentials and cleanup approval exist.

## 25. Owner manual checklist

- [ ] Confirm the real production domain and set `NEXT_PUBLIC_SITE_URL` consistently.
- [ ] Set Supabase Auth Site URL to the real domain.
- [ ] Allow only required production/local redirect URLs, including reset-password.
- [ ] Configure and test SMTP/email provider delivery.
- [ ] Enable leaked-password protection.
- [ ] Verify production/staging/development environment separation in Vercel.
- [ ] Verify all required production variables exist without exposing their values.
- [ ] Verify Telegram bot/chat secrets with one approved QA order.
- [ ] Verify WhatsApp number and public contact/site settings.
- [ ] Check canonical, sitemap, and robots domains after deployment.
- [ ] Add/verify Search Console and submit sitemap.
- [ ] Confirm Analytics/RUM choice and consent implications.
- [ ] Update/verify Google Business Profile links.
- [ ] Connect error monitoring and uptime monitoring with alert owners.
- [ ] Confirm Supabase backups/PITR policy and perform a restore-readiness review.
- [ ] Review launch product/bean/packaging stock and low-stock thresholds.
- [ ] Review promo codes, limits, dates, and historical QA redemptions.
- [ ] Review announcements and storefront open/closed state.
- [ ] Confirm owner and backup-admin access with MFA/security controls.
- [ ] Resolve the pending packaging-shortage order and remove/label QA data.
- [ ] Approve an anonymous checkout abuse-control plan.
- [ ] Approve rollback owner, thresholds, and communication plan.

## 26. Production deployment checklist

1. Freeze launch changes and capture the approved commit/tag.
2. Confirm Supabase backup and local/remote migration parity.
3. If any later migration is approved, dry-run/review/apply it before code that depends on it; otherwise apply none.
4. Verify production environment variables and domain/Auth/SMTP settings without printing secrets.
5. Run `npm ci`, TypeScript, ESLint, production dependency audit, and production build in CI.
6. Deploy to a non-production/preview environment with production-equivalent configuration.
7. Run public EN/AR smoke at 320/375/430/768/1440/1920.
8. Run credentialed customer and admin acceptance, including role denial tests.
9. Place one approved QA order per critical checkout type/payment; verify totals, reservation, packaging, Telegram, WhatsApp, account visibility, admin handling, delivered deduction/COGS, and cancellation/return rules as applicable.
10. Confirm abuse control, monitoring, alerts, backups, stock, promos, announcement, and store-open state.
11. Promote to production and immediately recheck domain/canonical/robots/sitemap/Auth recovery/checkout/admin.
12. Monitor errors, order rate, inventory, notifications, and Supabase capacity through the agreed observation window.
13. Roll back code/config at the approved threshold. Do not reverse data migrations or delete business data ad hoc.

## 27. Side effects and QA data

- No order was placed; no contact message, auth user, customer, payment, refund, return, promo redemption, inventory movement, packaging movement, Telegram message, WhatsApp message, or admin write was created.
- Browser QA changed only isolated browser storage/cookies (cart item and language) in ephemeral contexts.
- The prior-session package/lockfile change pins the PostCSS override. The resumed `npm ci` consumed that lockfile without adding a new package decision.
- `.next` output and production logs remain ignored/local. This audit's screenshots were written under the Codex visualization workspace, not the repository; no screenshot is part of the Git changes. An older ignored `.playwright-mcp` screenshot set dated June was already present and was left untouched.
- The production server used local port 3001 only and was stopped before final git capture.

## 28. Exact files changed

### Package/configuration

- `package.json`
- `package-lock.json`
- `scripts/generate-catalog-seed.mjs`
- `scripts/final-production-smoke.mjs`
- `src/middleware.ts` (deleted; deprecated convention)
- `src/proxy.ts` (replacement)

### Public/auth/catalog/accessibility

- `src/app/(public)/account/wishlist/page.tsx`
- `src/app/(public)/auth/forgot-password/page.tsx`
- `src/app/(public)/auth/login/page.tsx`
- `src/app/(public)/auth/reset-password/page.tsx`
- `src/app/(public)/auth/signup/page.tsx`
- `src/app/(public)/blog/BlogPageClient.tsx`
- `src/app/(public)/contact/page.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/(public)/products/ProductsPageClient.tsx`
- `src/app/(public)/products/[slug]/ProductDetailClient.tsx`
- `src/app/(public)/products/category/[slug]/CategoryPageClient.tsx`
- `src/app/layout.tsx`
- `src/components/layout/public/PublicFooter.tsx`
- `src/components/layout/public/PublicHeader.tsx`
- `src/components/product/ProductCard.tsx`
- `src/features/website/home/sections/ContactSection.tsx`
- `src/features/website/home/sections/SocialGallerySection.tsx`
- `src/lib/catalog/public-catalog-shared.ts`
- `src/lib/admin/admin-catalog.ts`
- `src/lib/admin/admin-settings.ts`
- `src/lib/settings/public-site-settings.ts`
- `src/lib/settings/site-settings-shared.ts`

### Checkout/builders

- `src/features/website/checkout/AddressSection.tsx`
- `src/features/website/checkout/CheckoutForm.tsx`
- `src/features/website/checkout/CheckoutPrimitives.tsx`
- `src/features/website/checkout/PaymentSection.tsx`
- `src/features/website/make-your-espresso/EspressoBlendStudio.tsx`
- `src/features/website/make-your-flavor/FlavorMixStudio.tsx`

### Documentation

- `AGENT_WORK_PROTOCOL.md`
- `docs/ai/LINE_COFFEE_V3_FINAL_LAUNCH_AUDIT.md`
- `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`
- `LINE_COFFEE_V3_PROJECT_LOG.md`
- `CLAUDE.md`

## 29. Migration confirmation

- No migration was created, edited, applied, rolled back, or deleted in this audit.
- No `supabase db push`, reset, seed, DDL, DML, or production data mutation was run.
- `npx supabase migration list --linked` (CLI 2.107.0) confirmed all 40 local/remote pairs match through `20260715120000_phase3_seo_availability_lastmodified.sql`.
- The checkout rate-limit decision, atomic Telegram claim, and any public-view security redesign require explicit owner approval before a migration is authored or applied.
