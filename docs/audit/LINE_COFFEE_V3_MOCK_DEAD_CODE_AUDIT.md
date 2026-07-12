# Line Coffee V3 — Mock, Static Data and Dead Code Audit

Audit date: 2026-07-12  
No files were deleted or moved. “Dead” means no source import/reference found by repository search; dynamic references and external consumers should still be checked before removal.

## Executive classification

The application is no longer mock-only. Most commerce/admin data is real. Remaining risk is concentrated in duplicated static/public content, disconnected CMS legal publishing, public builders that do not consume their real admin catalogs, illustrative product taste metrics, and obsolete documentation/scaffolding.

## Active static/mock data

| Classification | Item / file | Why it exists and where used | Recommended action | Blind-removal risk |
|---|---|---|---|---|
| **KEEP — Static config** | `src/lib/mock-data/visual-content.ts` | Intentional homepage asset/copy config: hero, stats, category marquee, benefits, story, journal, contact defaults and social images; imported by all homepage sections | Rename/move later to `lib/content/homepage.ts` to stop “mock” confusion; keep until dashboard content decision | High: homepage loses most content/assets |
| **DELETE LATER** | `visualProducts` export, `visual-content.ts:149-210` | No source import found; old 4-product homepage mock replaced by real best sellers | Remove only after TypeScript/reference check | Low; older docs/scripts may refer conceptually |
| **DELETE LATER** | `visualTestimonials` export, `visual-content.ts:325-352` | No source import found; homepage now reads approved Supabase reviews | Remove after confirming no tests/storybook/external import | Low |
| **KEEP FOR NOW** | `src/lib/mock-data/product-catalog.ts` | 152-item historic/source catalog consumed by `scripts/generate-catalog-seed.mjs`, not runtime UI | Move to `scripts/data/` or archive after owner confirms it remains the canonical seed input | High if seed regeneration is still expected |
| **MIGRATE TO SUPABASE / P1** | `make-your-espresso/data/espressoBeans.ts` | Public studio visible names/prices/metrics; admin edits `espresso_beans` separately; checkout uses DB truth | Make public studio consume `public_espresso_beans`; retain only presentation metric defaults if needed | High: deleting now breaks studio |
| **MIGRATE TO SUPABASE / P1** | `make-your-flavor/data/flavorData.ts` (`flavorBases`, `flavorItems`) | Public studio visible catalog/prices; admin/checkout use real tables | Consume `public_flavor_bases/items`; keep presets/labels as intentional UI config | High |
| **KEEP — Static config** | Flavor/espresso presets, metric labels and builder scoring engines | User guidance/visual logic, not business truth if clearly labeled | Keep; document which metrics are advisory; server remains price authority | High for UX |
| **REPLACE WITH REAL DATA** | `getProductMetrics()` in `products/[slug]/page.tsx:60-116` | Creates taste scores from category, price and Robusta share | Add explicit product tasting fields or label as illustrative; do not imply measured attributes | Medium; removing leaves section empty |
| **NEEDS OWNER DECISION** | About claims `about/page.tsx:11-82` | Brand story, “Arabica only,” 72-hour roast window, milestones | Fact-check; catalog contains Robusta, so revise or qualify | Legal/brand credibility risk if removed/changed blindly |
| **NEEDS OWNER DECISION** | `llms.txt` claims (`src/app/llms.txt/route.ts:28-68`) | AI-search factual summary: family-run since 2015, nationwide delivery, roast-fresh ~72h | Align with verified owner facts and public policy | AI/search misinformation if unverified |
| **KEEP FOR NOW** | Homepage hero/stats/benefit/story/journal/category/social copy | Marketing/editorial content | Keep code-controlled unless owner wants CMS | Removing breaks brand experience |
| **MIGRATE TO SUPABASE** | Homepage journal cards | Fixed three posts may not be latest CMS articles | Query latest published posts or rename section to curated links | Low/medium stale-content risk |
| **MIGRATE TO SUPABASE** | Known category editorial map `category/[slug]/page.tsx:38-123` | Bespoke hero narratives/images | Add editorial fields to category or consciously keep code-owned | Low; fallback exists for unknown categories |
| **MIGRATE TO SUPABASE / P1** | Public legal page arrays | Public policies hardcoded while Admin CMS edits `legal_pages` | Connect published legal rows with safe static fallback | High content/governance drift |
| **KEEP FOR NOW** | `DEFAULT_ANNOUNCEMENTS` | Resilience fallback when announcement query fails/empty | Keep but make fallback text owner-approved and clearly documented | Removing can leave blank bar |
| **KEEP FOR NOW** | Local cart and guest wishlist storage | Deliberate device-local UX, owner-scoped | Keep; document non-durability and server validation | Removing loses carts/wishlists |
| **REPLACE WITH REAL DATA** | Account Settings page | Only language is persisted locally; settings-looking UI may imply account preferences | Either narrow page name/copy or add real notification/privacy preferences | Medium expectation risk |

## Disconnected or misleading areas

| Priority | Item | Evidence | Impact / action |
|---|---|---|---|
| P1 | Admin CMS legal publishing has no public consumer | `admin-cms.ts:460+`; public legal pages import no CMS helper | Owner can publish successfully but website stays unchanged. Wire before operational use |
| P1 | Builder admin-to-public drift | Public studios import local arrays; admin services write real builder tables; checkout SQL re-reads tables | Customer sees stale price/availability and can fail at checkout |
| P1 | Dashboard/analytics/accounting “all time” can be partial | fixed scan limits in three admin services | False business decisions after row caps. Replace with SQL/RPC aggregates/pagination |
| P2 | `/reviews` is not a reviews page | `reviews/page.tsx:3-4` redirects to `/contact` | Route/SEO/user expectation mismatch; decide review index or remove link expectation |
| P2 | Social gallery is static | six fixed images in `visual-content.ts` | “Follow our journey” can look stale; connect curated CMS/social assets or update process |
| P2 | Product taste metrics are inferred | `products/[slug]/page.tsx:60-116` | Can mislead customers; store explicit tasting data |
| P2 | Shipping/legal copy can contradict live fee engine | legal arrays vs `resolve_delivery_fee` | Create single policy source or operational checklist |

## Suspected dead code

| Classification | Path/symbol | Evidence/use | Recommendation / removal risk |
|---|---|---|---|
| **DELETE LATER** | `src/components/layout/dashboard/` (`DashboardShell`, `DashboardMetricCard`, placeholders, `index.ts`) | Only references are internal to that folder; live admin uses `components/admin/layout` | Remove as one unit after `rg` + build. Low runtime risk, medium import risk outside scanned repo |
| **DELETE LATER** | `src/components/admin/shared/AdminPlaceholder.tsx` | No import found | Remove after build; low risk |
| **DELETE LATER** | `visualProducts`, `visualTestimonials` exports | No runtime imports | Remove exports/data only in cleanup phase |
| **KEEP FOR NOW** | Generated duplicate images under `public/images/generated` and `public/assets` | Current code uses `/assets`; generated directory may be image-generation provenance | Owner decide archive/delete after checking design workflow |
| **NEEDS OWNER DECISION** | `graphify-out/` | Non-source generated directory; purpose not documented in current app | Inspect contents/consumer before archive; do not delete blindly |
| **KEEP** | Error/loading components | Route-level fallbacks; some look tiny but are framework entry points | Do not delete based on import search alone |
| **KEEP** | SEO layouts and route files | Next.js filesystem entry points; dynamic imports may not appear as ordinary consumers | Never classify via import count alone |

## Documentation/archive audit

| Classification | File(s) | Issue | Recommendation |
|---|---|---|---|
| **ARCHIVE / P1 docs** | `docs/AI_HANDOFF_MARKETING.md` | Says dashboard/admin are mock-only and refers to absent mock files/components | Move under `docs/archive/` with “obsolete pre-Supabase” banner or delete later after owner approval |
| **ARCHIVE** | `docs/ai/LINE_COFFEE_V3_SYSTEM_AUDIT.md`, `OPERATING_MODEL_BLUEPRINT.md` | Valuable history but pre-implementation current-reality tables are stale | Preserve as historical references; mark date/status prominently |
| **KEEP, UPDATE** | `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md` | Best source but dated 2026-07-04; its MOCK section formatting contains now-real modules and can confuse readers | Refresh after owner review from this audit |
| **KEEP, UPDATE** | `docs/ai/LINE_COFFEE_V3_CONTENT_MAP.md` | Earlier concise map; misses new wiring details and contains older assumptions | Supersede/merge into future master guide |
| **KEEP AS ARCHIVE** | `docs/archive/LINE_COFFEE_V3_PRODUCTS_PHASE_READINESS_AUDIT.md` | Correctly archived, but findings describe pre-real catalog | No action beyond archive index |
| **ARCHIVE / MERGE** | Root visual plans/blueprints/review docs | Large completed-phase plans clutter repository root | Move to versioned archive after owner review; retain decisions/assets provenance |
| **KEEP, UPDATE** | `AGENT_WORK_PROTOCOL.md` | Says admin work is mock-only, conflicting with its own designated current state and real code | Replace obsolete rule; do not follow it for backend truth |
| **ARCHIVE / COMPRESS** | `LINE_COFFEE_V3_PROJECT_LOG.md`, `CLAUDE.md` | 100KB/379KB histories are hard to use as onboarding sources | Preserve history, create recent changelog/index, keep master guide concise |

## Duplicate logic/data

| Duplicate | Locations | Risk | Plan |
|---|---|---|---|
| Builder catalogs/prices | local public data vs Supabase/admin tables | Customer/admin/checkout drift | Public views become single catalog truth |
| Delivery logic/copy | SQL `resolve_delivery_fee`, `src/lib/delivery.ts`, shipping policy copy | Display/charge/policy mismatch | Keep SQL authoritative; generate/type-test client mirror; policy references zones generically |
| Status labels/colors | public account/header, admin orders/analytics/accounting | Copy/style drift, incomplete new statuses | Shared semantic map per surface, with separate localized presentation |
| Metric formatting | multiple money/date/percentage helpers and inline formatting | Arabic numerals/cents inconsistency | Consolidate tested format helpers after behavior inventory |
| Product cards | `ProductCard` and `CatalogProductCard` | Divergent features/image behavior | Define shared product-card primitives, keep context-specific shells |
| Contact source | homepage defaults, contact page, settings, env fallback | Different phone/email/social presentation | `site_settings` as public source with explicit fallback module |
| Legal data | CMS legal rows vs route arrays | Publishing does nothing | Connect public reader and static fallback |
| Admin aggregate queries | dashboard/analytics/accounting each re-scan same tables | Performance and formula drift | Server-side aggregate RPCs/views with shared definitions |

## Route/file conclusions

- No listed public/admin route is a framework 404. `/reviews` is intentionally a redirect; `/admin` is intentionally a redirect.
- No runtime admin mock-data directory remains. Comments and old docs still use “mock” language.
- `visual-content.ts` must not be deleted as “mock”; it is active content configuration.
- Never delete migrations, seed inputs or filesystem route files solely because TypeScript import search shows zero consumers.

## Safe cleanup gate

Before any future deletion: owner approval → `rg` symbol/path search → confirm Next.js route convention/dynamic use → check scripts/docs/tests → run lint/typecheck/build → smoke affected route → commit cleanup separately. Database/migration cleanup needs a live schema and backup and is outside this audit.

