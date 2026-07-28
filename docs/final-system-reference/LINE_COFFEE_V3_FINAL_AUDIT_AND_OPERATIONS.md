# Line Coffee V3 — Final Audit & Operations Reference

**Last updated:** 2026-07-28
**Companion to:** `LINE_COFFEE_V3_COMPLETE_SYSTEM_REFERENCE.md`, `LINE_COFFEE_V3_ROUTE_DATA_FLOW_MAP.md`

This document is the schema inventory, risk register, and operations/launch reference. It supersedes the 2026-07-16 `LINE_COFFEE_V3_FINAL_LAUNCH_AUDIT.md` and the 2026-07-13 `docs/audit/z.ai/LINE_COFFEE_V3_MASTER_AUDIT.md` — their still-relevant findings are carried forward here with current status; their now-resolved findings are marked closed with the fix that closed them.

---

## 1. Current database state (verified live, 2026-07-28)

The database is intentionally at a **clean zero-transactional-data** state, with catalog/master data and admin access preserved:

| Table group | Count | Note |
|---|---:|---|
| `orders` + every child table (items, status events, payments, refunds, returns, return items, notifications, lot allocations, bean allocations, packaging lines/allocations) | 0 | Zero across the board |
| `promo_redemptions` | 0 | |
| `purchases`, `purchase_items`, `supplier_payments`, `expenses` | 0 | |
| `customer_wishlist` | 0 | |
| `contact_messages` | 0 | |
| `reviews` | 0 | |
| `inventory_stock` (nonzero rows), `inventory_lots` (open), `inventory_movements` | 0 | Coffee stock at zero |
| `espresso_bean_stock` (nonzero), `espresso_bean_lots` (open), `espresso_bean_movements` | 0 | Bean stock at zero |
| `packaging_lots` (open), `packaging_movements` | 0 | Packaging at zero |
| `suppliers` | 0 | |
| `products` (non-archived) | 124 | Catalog preserved |
| `categories` | 7 | Catalog preserved |
| `customers` | 4 | A small number of real/QA-created accounts remain — not a transactional-data concern |
| `customer_addresses` | 1 | |
| `admin_users` | 1 | Owner admin access preserved |
| `site_settings.storefront.storeOpen` | `true` | Store is **open** |

**Before opening the store for real traffic**, the owner must load real launch stock (finished-product kg, espresso bean kg, packaging counts), confirm/rotate promo codes, and confirm the announcement bar text — none of this is faked or auto-seeded; the zero state is deliberate and honest.

---

## 2. Supabase schema inventory (live, verified 2026-07-28)

### Tables (44)

`admin_users` · `announcements` · `blog_posts` · `categories` · `contact_messages` · `customer_addresses` · `customer_wishlist` · `customers` · `espresso_bean_lots` · `espresso_bean_movements` · `espresso_bean_stock` · `espresso_beans` · `expenses` · `flavor_bases` · `flavor_items` · `inventory_lots` · `inventory_movements` · `inventory_stock` · `legal_pages` · `order_espresso_bean_allocations` · `order_items` · `order_lot_allocations` · `order_notifications` · `order_packaging_allocations` · `order_packaging_lines` · `order_payments` · `order_refunds` · `order_return_items` · `order_returns` · `order_status_events` · `orders` · `packaging_items` · `packaging_lots` · `packaging_movements` · `product_variants` · `products` · `promo_codes` · `promo_redemptions` · `purchase_items` · `purchases` · `reviews` · `site_settings` · `supplier_payments` · `suppliers`

### Views (6) — all public-safe, cost-free, curated columns only

`public_categories` · `public_espresso_beans` · `public_flavor_bases` · `public_flavor_items` · `public_product_variants` · `public_products`

### Triggers (31)

29 follow one consistent pattern — `set_updated_at()` on `INSERT`/`UPDATE` for nearly every table that has an `updated_at` column. Two are special-purpose:
- `trg_categories_sync_slug` (on `categories`) → `sync_products_category_slug()` — when a category's slug changes, rewrites every child `products.category_slug` in the same transaction (the denormalized column that feeds `public_products`/category routing).
- `trg_products_initialize_inventory` (on `products`) → `initialize_product_inventory()` — auto-creates the matching `inventory_stock` row when a product is created.

### Functions / RPCs (76 distinct signatures, a few overloaded)

The full live list is enumerable via `select proname from pg_proc where pronamespace = 'public'::regnamespace and prokind='f'`. By role:

- **Internal helpers** (never directly callable by `anon`/`authenticated` — most are prefixed `_`; two are not but are equally locked down, corrected during the Phase 8 review after a live `has_function_privilege` check): `_allocate_espresso_bean_lots_fifo`, `_allocate_lots_fifo`, `_apply_order_packaging`, `_apply_packaging_quantity`, `_create_checkout_order_phase5`, `_create_checkout_order_phase67`, `_deduct_packaging_fifo`, `_evaluate_promo_code`, `_packaging_available`, `_recompute_order_payment_status`, `_restore_espresso_return_lots`, `_restore_product_return_lots`, **`account_customer_id`** (no `_` prefix, but confirmed live to have zero `anon`/`authenticated` execute grant — it is the shared ownership resolver called internally by every account RPC below, never called directly by the browser).
- **Public/anon-callable customer RPCs** (confirmed live, `has_function_privilege('anon', ..., 'execute') = true`): `create_checkout_order`, `create_contact_message`, `get_customer_addresses`, `get_customer_notifications`, `get_customer_order_detail`, `get_customer_orders`, `get_customer_profile`, `get_customer_wishlist`, `add_customer_address`, `add_customer_wishlist_item`, `update_customer_address`, `update_customer_profile`, `delete_customer_address`, `remove_customer_wishlist_item`, `set_default_customer_address`, `validate_promo_code`, `get_order_notification_payload`, `claim_order_notification`, `mark_order_notification_sent`, `release_order_notification_claim`, `log_order_notification`, `order_notification_was_sent`.
- **Authenticated-only customer RPC** (confirmed live: `anon` execute = false, `authenticated` execute = true — moved out of the anon-callable list above during the Phase 8 review, where it was previously and incorrectly grouped): `link_guest_data_to_account` — matches its own correct description elsewhere in this document set ("authenticated-only").
- **Admin-only RPCs** (`is_admin()`/`is_super_admin()` gated): `create_admin_product`, `create_purchase`, `receive_purchase`, `record_purchase_payment`, `deactivate_promo_code`, `upsert_promo_code`, `upsert_packaging_item`, `adjust_packaging_stock`, `adjust_finished_product_stock`, `adjust_espresso_bean_stock`, `upsert_espresso_bean`, `upsert_flavor_base`, `upsert_flavor_item`, `update_admin_order_status`, `update_admin_order_note`, `update_admin_order_delivery_fee`, `record_order_payment`, `record_order_refund`, `record_order_return`, `save_admin_blog_post`, `save_admin_legal_page`, `save_admin_review`, `update_admin_contact_message`.
- **Read-model aggregators** (`SECURITY INVOKER`, real reporting queries, RLS enforces admin-only access to their underlying tables): `get_admin_accounting_report_v1`, `get_admin_analytics_report_v1`, `get_admin_dashboard_report_v1`, `list_admin_customers_v1`, `list_admin_orders_v1`.
- **Pure/utility** (`SECURITY INVOKER`, no privileged access): `resolve_delivery_fee`, `variant_size_to_kg`, `next_order_code`, `set_updated_at`, `sync_products_category_slug`, `private_resolve_customer_guest`.

### Migrations

44 migration files, dated `20260625120000` through `20260726110000`. **Local and remote histories are fully in sync** (verified via `supabase migration list --linked`, every row's Local/Remote timestamp column matches). No migration is pending, authored-but-unapplied, or drifted. (Re-verified live during the Phase 8 review, 2026-07-28: `ls supabase/migrations/*.sql | wc -l` and the live `migration list` both independently confirm 44 — this document previously undercounted at 37, corrected here.)

---

## 3. Known accepted risks (carried forward, status current as of this document)

| # | Risk | Original source | Current status |
|---|---|---|---|
| R1 | Robust anonymous-checkout abuse control (bot/rate-limit/CAPTCHA in front of `create_checkout_order`) is not implemented — a script can rotate `guest_id` and create unlimited COD order attempts | 2026-07-16 Final Launch Audit | **Open.** Requires an owner decision on edge/WAF/CAPTCHA infrastructure; explicitly out of scope for code-only phases. |
| R2 | Telegram concurrent double-send race | 2026-07-16 Final Launch Audit, z.ai audit | **Closed.** Phase 5 Batch A replaced check-then-send with an atomic claim-before-send (`claim_order_notification`), verified race-safe via 8 rolled-back concurrency trials. See System Reference §12. |
| R3 | Make Your Flavor COGS could silently show 0 instead of "unknown" when a cost component was unconfigured | Phase 5 mission finding | **Closed.** `flavor_cost_known` tracking + honest UI hiding (not estimating) gross profit/margin on affected orders. |
| R4 | WhatsApp handoff text built from live client/form state (same class of trust gap Telegram already had) | Phase 5 mission finding | **Closed.** Both channels now share the same DB-authored, checkout-attempt-proof-gated snapshot. |
| R5 | SMTP not configured in `supabase/config.toml` — signup confirmation/password-reset emails would not deliver | z.ai audit (2026-07-13) | **Open, owner action.** This is local dev config; the hosted Supabase project's SMTP must be configured/verified directly in the dashboard, not via this repo. |
| R6 | No rate limit on `/api/order-notifications/telegram` beyond the durable dedupe | z.ai audit | **Open, low severity.** Durable dedupe prevents duplicate sends for one order; a determined caller could still spam distinct order-notification attempts. Platform-edge rate limiting recommended. |
| R7 | `create_contact_message` has a per-device soft throttle (3 messages/15 min) but no CAPTCHA | Phase 1 hardening (2026-07-13) partially closed the earlier "no throttle at all" finding | **Partially closed.** The throttle is honestly documented as a soft deterrent (a `guest_id` is client-generated and rotatable by a determined sender) — real protection needs a CAPTCHA or platform-level rate limit, an owner decision. |
| R8 | Auth signup has no CAPTCHA (`[auth.captcha]` disabled in local config) | z.ai audit | **Open, owner action** — dashboard/hosted-project configuration, not a code change. |
| R9 | Protocol-relative post-login redirect (`//attacker.example`) | Security/SEO/Performance audit (2026-07-12) | **Closed.** `src/lib/auth/safe-redirect.ts`'s `safePostLoginPath()` rejects `//`, backslashes, control characters, and re-validates the parsed origin — verified present in current code. |
| R10 | Public builder bundle shipped internal purchase costs (`espressoBeans.ts`) | Security/SEO/Performance audit (2026-07-12) | **Closed.** No `purchasePrice`/cost field remains in the public builder data file (verified by direct grep); the real backend catalog view (`public_espresso_beans`) is cost-free by construction. |
| R11 | Order receipt + customer PII stashed in `sessionStorage` for `/order-success` | z.ai audit | **Open, low severity.** Short exposure window (clears on tab close); the recovery path already added in Phase 1 (2026-07-13) fetches from the ownership-scoped RPC when the session value is missing, but the initial happy-path still uses the session stash. Recommended future fix: fetch from the RPC unconditionally. |
| R12 | `customer_wishlist` had RLS disabled at the table level | z.ai audit | **Closed** (this document previously said "accepted, not a gap" — corrected during the Phase 8 review, 2026-07-28, after live re-verification showed the true current state). Phase 5 Group 3 (`20260725120000_phase5_group3_db_rpc_hardening.sql`, audit finding M2) enabled RLS and added a real `customer_wishlist_owner_all` ownership policy (`auth_user_id = auth.uid()`, `for all to authenticated`), explicitly as defense-in-depth — the migration's own comment notes `anon`/`authenticated` already held zero direct grants on the table, so the change was a hardening step, not a fix to a live hole. Re-verified live during Phase 8: `relrowsecurity = true`; `anon`/`authenticated` grants are `REFERENCES,TRIGGER` only (no `SELECT`/`INSERT`/`UPDATE`/`DELETE`); all real access remains through the `SECURITY DEFINER` RPCs, which self-scope by `auth_user_id`/`guest_id` and are unaffected by row security on tables they touch. |
| R13 | Guest access is same-device-only by design | Multiple audits | **Accepted, documented tradeoff** (Locked-decision-adjacent) — a shared/compromised device exposes that device's guest order history. Cross-account leakage (a different concern) was closed in Phase 2. |

---

## 4. npm dependency vulnerabilities

**Updated during the Phase 8 review (2026-07-28).** The independent Phase 8 code review found that the `postcss` finding below had regressed from "0 high in production" (as this document previously claimed) back to **2 high** — a newer PostCSS advisory (`GHSA-r28c-9q8g-f849`, path traversal via source-map auto-loading, range `<=8.5.17`) was published after the Group 1 fix and the project's own exact-pinned `"postcss": "8.5.15"` override (added 2026-07-16 to clear an earlier, different audit finding) was now the thing holding the tree on a vulnerable version. Verified a patched release exists in the same safe minor line (`8.5.18`–`8.5.24`, confirmed via `npm view postcss versions`); the override was bumped to **`8.5.24`** (one line in `package.json`, no breaking change), `npm install` re-run, and `tsc`/`lint`/`vitest run` (99/99)/`build` (all routes) re-verified clean afterward.

**Current state:** `npm audit` (full, including devDependencies): **9 high, 0 critical** (down from 13). `npm audit --omit=dev` (production-relevant only): **0 vulnerabilities** (down from 2 high).

The remaining 9 (dev-only) are attributable to one pre-existing dependency chain, not introduced by any Phase 5-8 work:

1. **`brace-expansion`/`minimatch` (via `eslint`'s own dependency tree, `eslint-plugin-import`/`eslint-plugin-jsx-a11y`/`eslint-plugin-react`, and `eslint-config-next`)** — needs an `eslint` major-version bump to clear fully; deferred as a devDependency-only, non-shipping risk, matching the project's established precedent of never accepting `npm audit fix --force`'s breaking suggestions for a live dependency it can avoid.

This chain never ships to the production bundle or browser — build/lint-time tooling only.

---

## 5. Supabase Security Advisor findings (80 total, `--type security --level warn`)

| Count | Finding | Status |
|---:|---|---|
| 49 | "Signed-In Users Can Execute SECURITY DEFINER Function" (informational enumeration of every RPC callable by `authenticated`) | **Accepted — by design.** This is the entire architecture: every write goes through a validated `SECURITY DEFINER` RPC because there is no service-role server. Each function has its own internal `is_admin()` or ownership guard. |
| 23 | "Public Can Execute SECURITY DEFINER Function" (same, for `anon`) | **Accepted — by design.** These are exactly the customer-facing checkout/account/wishlist/promo/notification RPCs that must be anon-callable for a guest checkout to work; each validates ownership/proof internally. |
| 6 | "Security Definer View" (`public_products`, `public_categories`, `public_product_variants`, `public_espresso_beans`, `public_flavor_bases`, `public_flavor_items`) | **Accepted — verified safe.** Each view was individually inspected in the 2026-07-16 audit and exposes only curated, cost-free, catalog-safe columns. Redesigning to invoker-mode would require an approved migration and regression suite; not undertaken without an explicit owner decision. |
| 1 | "Public Bucket Allows Listing" (`product-images` Storage bucket) | **Accepted.** Expected for a public product-photo bucket; write access remains `is_admin()`-gated. |
| 1 | "Leaked Password Protection Disabled" | **Open, owner action.** A Supabase Dashboard → Authentication → Policies toggle, not fixable via SQL/CLI. |

No finding in this list is new relative to the 2026-07-16 audit's Section 13 — Phase 5 work introduced zero new Advisor findings.

---

## 6. Preserved generated / design-provenance assets

Two items were re-verified as unused by any current code path, but **deliberately not deleted**, because a prior audit (`docs/audit/LINE_COFFEE_V3_MOCK_DEAD_CODE_AUDIT.md`, now superseded by this document but whose judgment call here is preserved) flagged them as an **owner decision**, not a code-cleanup one:

- **`public/images/generated/`** — a set of images that may be the original AI-generation source material for the currently-used `public/assets/*` files. Deleting them could remove the ability to regenerate or re-crop the current assets later.
- **`graphify-out/`** — an undocumented generated-output directory; its purpose in the current app is not established from code alone.

Both remain on disk, untouched, pending an explicit owner decision on archival/deletion.

`src/lib/mock-data/product-catalog.ts` is similarly preserved — not because it's ambiguous, but because it is **actually used**: `scripts/generate-catalog-seed.mjs` reads it via a dynamic VM-based transpile keyed by file path, a reference pattern invisible to a normal import grep. Do not delete it without also retiring that script.

---

## 7. Deployment procedure

1. Freeze the launch commit; confirm `git status` is clean and record the exact commit hash.
2. Confirm Supabase backup/PITR policy is active for the linked project (dashboard action).
3. Confirm local/remote migration parity (`supabase migration list --linked`) — do not apply any new migration as part of a deploy unless it has been separately authored, dry-run, and reviewed.
4. Set production environment variables (see System Reference §15) on the hosting platform — never print/log their values.
5. Run `npm ci && npm run lint && npx tsc --noEmit && npm run test:run && npm run build` in CI (this is what `.github/workflows/ci.yml` already does).
6. Deploy to a preview/staging environment first with production-equivalent config.
7. Run the public EN/AR smoke pass across representative viewports (desktop + mobile at minimum).
8. Perform credentialed customer and admin acceptance testing — **not yet done in this project**; no test credentials have been available to any automated session so far. This remains the single largest gap between "code-verified" and "launch-ready."
9. Place one real, approved QA order per critical checkout type/payment method if the owner wants live-path confirmation; verify totals, inventory reservation, packaging, Telegram, WhatsApp, admin visibility, delivered-deduction/COGS, and cancellation.
10. Promote to production; immediately re-check the real domain's canonical URLs, `robots.txt`, `sitemap.xml`, and the Supabase Auth redirect allowlist.
11. Monitor errors, order rate, inventory movement, and notification delivery through an agreed observation window.

## 8. Rollback procedure

- **Code/config rollback**: revert to the previously deployed commit/tag on the hosting platform. This project's Git history is linear and every Phase 5 change is a small, isolated commit — reverting a specific commit rather than the whole branch is generally safe if only one area regressed.
- **Never reverse a data migration or delete business data ad hoc** as a rollback action. If a migration must be undone, author a new forward migration that safely reverses its effect, and review it with the same rigor as the original.
- Define the rollback threshold and communication owner **before** launch, not during an incident — this project has not yet had that conversation with the owner.

---

## 9. Final launch checklist

Owner-only items (cannot be verified or performed from an automated coding session):

- [ ] Confirm the real production domain; set `NEXT_PUBLIC_SITE_URL` to it everywhere it's deployed.
- [ ] Set Supabase Auth Site URL + redirect allowlist to the real domain.
- [ ] Configure and test real SMTP delivery for signup confirmation and password reset (R5).
- [ ] Enable leaked-password protection (Security Advisor finding, §5).
- [ ] Decide and deploy an anonymous-checkout abuse control (R1) — the single largest open risk.
- [ ] Load real launch stock: finished-product kg, espresso bean kg, packaging unit counts.
- [ ] Review/rotate promo codes and confirm the announcement bar text.
- [ ] Confirm owner + backup-admin `admin_users` access with appropriate account security (MFA where available).
- [ ] Connect error monitoring, uptime monitoring, and define alert ownership.
- [ ] Confirm Supabase backup/PITR policy and do one restore-readiness review.
- [ ] Perform credentialed customer and admin acceptance testing (blocked so far on test credentials).
- [ ] Approve a rollback owner, threshold, and communication plan.

Code-level items (all confirmed complete by this document and its companions):

- [x] `tsc --noEmit`, `eslint`, `vitest run` (99/99), `next build` (42/42 routes) all pass clean.
- [x] No service-role key anywhere in the codebase.
- [x] Every business-critical value (price, delivery fee, promo discount, inventory, COGS) is server-computed, never client-trusted.
- [x] Telegram notification is concurrency-safe (atomic claim).
- [x] Database is at a clean, honest zero-transactional-data state with catalog/admin access preserved.
- [x] No pending/drifted migrations.

---

## 10. Documentation deletion manifest (Phase 7, commit `2243b8a`)

Every file below was deleted only after a zero-code-reference check (grep across `src/`, `scripts/`, `supabase/`, and this doc set). Historical mentions inside dated `CLAUDE.md` changelog entries and one immutable migration-file comment (`supabase/migrations/20260625120000_p0_migration_1_catalog_customers_orders_admin.sql:26`) are intentionally left untouched — they are dated history/provenance notes, not operational pointers, and are not "dangling links." Re-verified 2026-07-28 (Phase 8): all 30 paths confirmed absent from disk; zero remaining non-historical reference anywhere in tracked files.

| # | Original path | Reason for deletion | Replacement (current doc / section) |
|---|---|---|---|
| 1 | `LINE_COFFEE_V3_CUSTOM_BUILDERS_REVIEW_AND_ENHANCEMENTS.md` | Pre-implementation UX planning doc for the two builders; predates the real Supabase-backed builder catalogs | System Reference §9 ("Inventory, FIFO, espresso, and packaging"), §5 (Espresso/Flavor Manager row) |
| 2 | `LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md` | Same — pre-implementation visual planning for Make Your Espresso/Flavor | Route/Data-Flow Map §4 ("Builders") |
| 3 | `LINE_COFFEE_V3_PROJECT_LOG.md` | Superseded running log; the complete chronological record now lives solely in `CLAUDE.md`'s Change Log | `CLAUDE.md` Change Log (unchanged, still the permanent history) |
| 4 | `LINE_COFFEE_V3_PUBLIC_WEBSITE_MASTER_VISUAL_PLAN.md` | Pre-implementation homepage/public-site planning doc; the site described in it is now built | System Reference §3 ("Public website"); Route/Data-Flow Map §2 ("Homepage") |
| 5 | `PRODUCT.md` | Early product-vision doc predating the real backend/build | System Reference §1 ("What Line Coffee V3 is") |
| 6 | `docs/AI_HANDOFF_MARKETING.md` | Superseded marketing-module handoff note; Marketing is now real (Promo Codes + Announcement Bar) | System Reference §11 ("Marketing and CMS") |
| 7 | `docs/DESIGN_SYSTEM_FOUNDATION.md` | Described colors/components/fonts that were never actually built this way — a pre-implementation document contradicted by the real, shipped design system | `CLAUDE.md` Design System section (the real, current tokens/classes) |
| 8 | `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md` | Superseded content-source map; phases it tracked are complete | Route/Data-Flow Map (entire document — this is its direct successor) |
| 9 | `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` | Superseded current-state snapshot; every claim in it is either stale or now folded into the new reference | System Reference (entire document — direct successor) |
| 10 | `docs/ai/LINE_COFFEE_V3_DATA_CONTRACTS_AND_MIGRATIONS.md` | Superseded type/migration-workflow doc; its still-useful guidance (e.g. `npm run gen:types` usage) was inlined elsewhere | `src/lib/types/README.md` ("Supabase generated DB types" section, now self-contained) |
| 11 | `docs/ai/LINE_COFFEE_V3_FINAL_DECISIONS_AND_ROADMAP.md` | Superseded decisions/roadmap doc; all 20 decisions are now locked and listed directly | System Reference §14 ("Locked business decisions") |
| 12 | `docs/ai/LINE_COFFEE_V3_FINAL_LAUNCH_AUDIT.md` (2026-07-16) | Superseded launch audit; its still-open findings are carried forward with current status | Final Audit & Operations §3 ("Known accepted risks", R1/R5/R6/R8/R9/R10/R11 trace to this audit) |
| 13 | `docs/ai/LINE_COFFEE_V3_MASTER_EXECUTION_PLAN.md` | Superseded phase-execution plan; all phases through 20F+ are complete and described in present tense now | System Reference (entire document) + `CLAUDE.md` Change Log for phase history |
| 14 | `docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md` | Deep-reference planning doc already self-marked "partially superseded"; Media Studio (which it still described) is cancelled | System Reference §14 (Locked Decision 1) |
| 15 | `docs/ai/LINE_COFFEE_V3_SYSTEM_AUDIT.md` | Historical audit predating the real backend; explicitly self-marked superseded already | Final Audit & Operations (entire document) |
| 16 | `docs/archive/LINE_COFFEE_V3_PRODUCTS_PHASE_READINESS_AUDIT.md` | Already-archived, now doubly-superseded readiness audit for the Products phase (long complete) | System Reference §5 ("Admin dashboard" — Products row) |
| 17 | `docs/audit/LINE_COFFEE_V3_ADMIN_CONTENT_MAP.md` | Superseded admin content-source map | Route/Data-Flow Map §8 ("Admin routes") |
| 18 | `docs/audit/LINE_COFFEE_V3_DATA_FLOW_MAP.md` | Superseded data-flow map; the checkout/inventory/notification flows it described are now diagrammed fresh | Route/Data-Flow Map §10-12 (the three ASCII data-flow diagrams) |
| 19 | `docs/audit/LINE_COFFEE_V3_MOCK_DEAD_CODE_AUDIT.md` | Superseded dead-code audit; its three "delete in cleanup phase" findings were executed in Phase 5 Batch C, and its two "owner decision, keep for now" findings are carried forward | Final Audit & Operations §6 ("Preserved generated / design-provenance assets") |
| 20 | `docs/audit/LINE_COFFEE_V3_PUBLIC_CONTENT_MAP.md` | Superseded public content-source map | Route/Data-Flow Map §2-7 (Homepage through Account/auth) |
| 21 | `docs/audit/LINE_COFFEE_V3_REFACTOR_AND_DOCS_PLAN.md` | Superseded refactor/documentation planning doc; the refactor and documentation rebuild it planned is this Phase 5-7 work itself | This document + System Reference (both are the completed output of that plan) |
| 22 | `docs/audit/LINE_COFFEE_V3_REPORTING_AGGREGATES_IMPLEMENTATION_PLAN.md` | Superseded reporting-aggregates plan; the aggregator RPCs it planned (`get_admin_*_report_v1`) are implemented and live | System Reference §2 schema inventory (Read-model aggregators row), §10 ("Accounting and analytics") |
| 23 | `docs/audit/LINE_COFFEE_V3_SECURITY_SEO_PERFORMANCE_AUDIT.md` (2026-07-12) | Superseded security/SEO/performance audit; its still-open findings are carried forward | Final Audit & Operations §3 (R9/R10 trace to this audit), §13 (SEO section of System Reference) |
| 24 | `docs/audit/z.ai/LINE_COFFEE_V3_MASTER_AUDIT.md` | Superseded external audit (2026-07-13); explicitly instructed for deletion after its findings were folded in | Final Audit & Operations §3 (risk register carries its F1-F16 findings forward with current status) |
| 25 | `docs/audit/z.ai/LINE_COFFEE_V3_MASTER_AUDIT.pdf` | Rendered copy of the same audit; same reason as #24 | Same as #24 |
| 26 | `docs/audit/z.ai/diagram1_architecture.png` | Diagram rendering from the same superseded audit | System Reference §2 (architecture description, prose form) |
| 27 | `docs/audit/z.ai/diagram2_order_lifecycle.png` | Same | Route/Data-Flow Map §10 (checkout-to-delivered-order ASCII diagram) |
| 28 | `docs/audit/z.ai/diagram3_risk_matrix.png` | Same | Final Audit & Operations §3 (risk register table) |
| 29 | `docs/audit/z.ai/diagram4_data_flow.png` | Same | Route/Data-Flow Map §10-12 (ASCII data-flow diagrams) |
| 30 | `docs/audit/z.ai/diagram5_disconnects.png` | Same | Final Audit & Operations §3 (each disconnect finding's current closed/open status) |
| 30 | `docs/audit/z.ai/diagram6_refactor_roadmap.png` | Same | System Reference (entire document is the completed roadmap output) |

**Verification method:** `git show --name-status --diff-filter=D 2243b8a` for the exact deletion list; `git grep` across all tracked files for each deleted filename (zero non-historical hits); direct filesystem check that none of the 30 paths exist. Re-run and confirmed during the Phase 8 independent review (2026-07-28).
