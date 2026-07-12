# Line Coffee V3 — Security, SEO, Performance, Accessibility and State Audit

Audit date: 2026-07-12  
Method: static repository review plus `npm audit --omit=dev`; no penetration test, live headers, Supabase dashboard policy inspection, Lighthouse, browser/assistive-technology session, or production logs.

## Executive priorities

| Priority | Finding | Risk |
|---|---|---|
| P1 | Reject protocol-relative login `next` targets | High security/phishing risk |
| P1 | Stop shipping espresso purchase costs in the public client bundle | High commercial confidentiality risk |
| P1 | Connect public builders to cost-free public catalogs and legal pages to published legal content | High content integrity/governance risk |
| P1 | Replace capped browser aggregates with server/database aggregates | High financial/operational accuracy risk at scale |
| P1 | Add abuse controls to Telegram/contact/auth/reset/checkout paths | Medium security/availability/spam risk |
| P1 | Resolve production dependency advisory without blind downgrade | Moderate supply-chain/runtime risk |
| P2 | Add a tested CSP and review HSTS deployment scope | Defense-in-depth/configuration risk |
| P2 | Reduce client-only public fetching and large bundles | Performance/SEO resilience risk |
| P2 | Complete metadata/schema/content fact-checks and accessibility QA | Search/trust/usability risk |

## A. Security findings

### SEC-01 — Protocol-relative post-login redirect

- Rule: NEXT-REDIRECT-001 / REACT-REDIRECT-001
- Severity: **High**; Priority: **P1**
- Location: `src/app/(public)/auth/login/page.tsx:15-19`, consumed at `:39-40` and `:54-55`.
- Evidence: validation accepts any value starting with `/` except `/admin`; `//attacker.example` passes. It is then supplied to `router.replace()`.
- Impact: an attacker can craft a Line Coffee login URL that forwards a victim to an external lookalike after authentication, enabling phishing. Confirm exact Next router handling in the deployed version, but protocol-relative paths must be rejected regardless.
- Recommended fix later: allow exactly one leading slash and reject `//`, backslashes/control characters and absolute URLs; preferably use an allowlisted internal-path helper. Keep the admin destination separately gated.
- Mitigation: no sensitive query data is appended by current code; user interaction still required.

### SEC-02 — Internal purchase costs are bundled into public JavaScript

- Rule: frontend data exposure / least disclosure
- Severity: **High**; Priority: **P1**
- Location: `src/features/website/make-your-espresso/data/espressoBeans.ts:15-21,35-306`; imported by public `EspressoBlendStudio.tsx`.
- Evidence: every public bean object contains `purchasePrice` (for example lines 41, 51, 61); no UI use of that field was found, but importing the array into a client component ships it to browsers.
- Impact: supplier/input costs and implied margin are recoverable from the client bundle/source map even when not rendered.
- Recommended fix later: remove purchase cost from all public types/data. Public catalog/view should expose only names, taste data and sale prices; cost stays admin-only/RLS-protected.
- False-positive note: owner may not treat these historic numbers as confidential, but unused internal-looking cost fields should still not ship.

### SEC-03 — Abuse-prone endpoints/forms have no repository-visible throttling

- Rule: NEXT-DOS-001
- Severity: **Medium**; Priority: **P1**
- Locations: Telegram POST `src/app/api/order-notifications/telegram/route.ts:276-373`; public contact RPC calls `src/lib/cms/public-cms.ts:65-84`; checkout `CheckoutForm.tsx:506-628`; auth reset/sign-in routes.
- Evidence: Telegram validates same-origin when Origin is present and requires an exact order-id/checkout-attempt capability before sending, but has no per-IP/order attempt throttle or explicit request-size guard. Contact/auth/checkout show no app-level limiter.
- Impact: spam, database/RPC load, credential-reset abuse, repeated capability guessing, or resource exhaustion. Telegram durable dedupe prevents duplicate sends for a valid order, which limits impact.
- Recommended fix later: platform-edge/IP rate limits plus per-order/per-account throttles; request byte limits; contact honeypot/CAPTCHA only if abuse warrants; Supabase Auth rate settings review. Preserve checkout idempotency.
- Uncertainty: CDN/Vercel/Supabase controls may exist outside the repository; verify production configuration.

### SEC-04 — No Content Security Policy

- Rule: JS-CSP-001 / REACT-HEADERS-001
- Severity: **Medium**; Priority: **P2**
- Location: `next.config.ts:9-35`.
- Evidence: global headers include X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and HSTS, but comments explicitly omit CSP.
- Impact: less defense-in-depth if a future XSS sink is introduced. Current JSON-LD `dangerouslySetInnerHTML` is safely serialized with `<` escaped (`src/lib/seo/jsonld.tsx:202-216`); no untrusted raw HTML sink was otherwise found.
- Recommended fix later: test a nonce/hash-capable CSP in report-only first, including Next runtime, fonts, images and Supabase; enforce after violation review. Do not add blanket `unsafe-eval`.

### SEC-05 — HSTS is unconditional and includes subdomains

- Severity: **Low**; Priority: **P2**
- Location: `next.config.ts:25-29`.
- Evidence: `Strict-Transport-Security: max-age=31536000; includeSubDomains` is sent for every route.
- Impact: if any production subdomain is not HTTPS-ready, browsers can lock it out. Browsers ignore it on localhost/plain HTTP, but the `includeSubDomains` commitment is broad.
- Recommended action: inventory all domain/subdomain ownership and HTTPS readiness. Keep only after deployment confirmation; do not add preload casually.

### SEC-06 — Dependency audit reports a moderate production advisory

- Severity: **Medium**; Priority: **P1**
- Evidence: `npm audit --omit=dev --json` on 2026-07-12 reported two moderate entries: direct `next@16.2.9` through bundled `postcss<8.5.10`, advisory `GHSA-qx2v-qp2m-jg93`. It reported no high/critical items. npm's automatic “fix” proposed an invalid-for-this-app major downgrade to Next 9.3.3.
- Impact: advisory describes PostCSS CSS stringify XSS when untrusted CSS is stringified. Current app does not accept untrusted CSS, reducing exploitability, but the vulnerable dependency remains.
- Recommended action: track a patched supported Next release/override approved by Next; reproduce build/tests. Do **not** run the proposed downgrade blindly.

### SEC-07 — Client-side admin gate is not the boundary; verify every grant/policy in live Supabase

- Severity: **Info**, escalates to Critical if live RLS/grants differ; Priority: **P1 launch verification**
- Evidence: `src/middleware.ts:3-17` correctly documents the presence cookie as spoofable; `AdminShell` checks `admin_users`; migrations use `is_admin()` for admin tables/RPCs. Product storage policies scope public read/admin write (`20260704180000:61-93`). Customer RPC ownership uses account resolver. `customer_wishlist` deliberately disables RLS but comments state base-table access is ungranted and all access is through definer RPCs (`20260628110000:67-80`).
- Required verification: export live grants/RLS/function ownership/search paths; confirm anon has no base-table access to orders/customers/wishlist/promo costs; authenticated non-admin cannot call admin RPCs or write storage; all definer functions pin `search_path`; public views expose no costs.

### Positive security controls verified in code

- Checkout server re-reads prices, custom-builder catalog, stock and promo; no client totals are trusted.
- Order creation uses replay/idempotency and store-open enforcement.
- Telegram token/chat ID remain server-only; message payload is DB-authored by exact order + attempt capability; Telegram call has 5-second timeout and safe client responses.
- JSON-LD escapes `<`; blog bodies use structured React rendering rather than raw HTML.
- Storage writes are admin-policy gated; managed images are in Supabase Storage, not written into `public/` at runtime.
- Account order/detail RPCs resolve customer ownership rather than trusting a raw order ID.
- No `eval`, `new Function`, document.write, wildcard CORS, service-role reference, arbitrary server fetch URL, subprocess or filesystem request sink was found.

## B. SEO / GEO / AEO / AI search

### Implemented well

- Global bilingual-aware metadata template, description, keywords, OpenGraph/Twitter and robots in `src/app/layout.tsx:94-147` and `src/lib/seo/metadata.ts`.
- Canonical base controlled by `NEXT_PUBLIC_SITE_URL` with fallback in `src/lib/seo/site.ts:13-25`.
- Product metadata + Product/Breadcrumb JSON-LD uses live product/lowest variant price and does not fabricate rating (`products/[slug]/layout.tsx`; `seo/data.ts:98-149`).
- Category CollectionPage/Breadcrumb and blog Article/Breadcrumb schemas have route layouts.
- Organization/WebSite/About/Contact JSON-LD exists in `jsonld.tsx`.
- `sitemap.ts` includes static plus live product/category/blog URLs and revalidates hourly.
- `robots.ts` disallows admin/account/auth/cart/checkout/order-success/API while allowing public catalog/blog.
- `/llms.txt` exists with categories, builder links, contact and anti-fabrication instructions.

### Findings

| Priority | Finding / evidence | Recommended action |
|---|---|---|
| P1 | `NEXT_PUBLIC_SITE_URL` is not present in the inspected `.env.local`; code falls back to `https://linecoffee.eg` (`site.ts:13-14`). Deployment may differ. | Set/verify canonical origin in every environment; runtime-check canonical/OG/sitemap URLs |
| P1 | About and llms facts conflict with product reality or are unverified: “Arabica only” (`about/page.tsx:30-31`) while espresso catalog includes Robusta; llms claims family-run since 2015, nationwide, 72-hour freshness (`llms.txt:31-40`). | Owner fact-check and align About, metadata, llms, policy and GBP content |
| P1 | Public legal pages ignore published CMS rows, so search-indexed policies can be stale. | Connect published `legal_pages`; preserve static fallback |
| P2 | Sitemap includes query-string studio URLs (`sitemap.ts:32-33`) alongside `/products`, but builders have no dedicated canonical route. | Decide dedicated builder URLs or explicit canonicals to avoid duplicate/weak landing pages |
| P2 | `/reviews` redirects to `/contact`; no review index/review schema page. | Build factual review page or remove route expectation; never synthesize aggregate rating |
| P2 | Homepage journal is a static curated list, not live latest posts. | Query published CMS posts or label as curated |
| P2 | Most public route bodies fetch after hydration even though metadata is server-rendered. Search bots can index metadata, but content resilience and link discovery are weaker under JS/data failure. | Server-fetch initial public content, hydrate only interactive controls |
| P2 | No explicit LocalBusiness schema/complete local address/geo/hours found; Organization exists. | Add only after owner supplies verified business name/address/phone/hours/service area; align Google Business Profile |
| P2 | Arabic/English pages share URL and switch client-side; no alternate locale URLs/hreflang. | Decide whether single-URL bilingual behavior is intentional; for locale SEO, add stable locale URLs/hreflang |
| P3 | Product semantic richness includes description/price/category but taste metrics are fabricated heuristics and should not enter schema. | Store real origin/roast/process/tasting/brew attributes and expose factually |
| P3 | Product `lastModified` in sitemap uses audit time, not product update time (`sitemap.ts:49-54`). | Expose/use `updated_at` from public view |

Local Egypt intent recommendations: factual pages for Cairo/Giza delivery zones, Egyptian Arabic product terminology, brewing intents (Turkish/espresso), payment methods and delivery policy; all must reuse authoritative operational data. GBP readiness requires verified NAP consistency, hours, service area and owner-controlled photos—not inferable from the repo.

## C. Performance

| Priority | Location | Specific risk | Recommended future change |
|---|---|---|---|
| P1 | `admin-dashboard.ts`, `admin-analytics.ts`, `admin-accounting.ts` | Parallel full-row client scans (orders 5k, items 8–12k, ledgers 8k) duplicate queries/formulas and silently truncate | Database aggregate RPCs/materialized views by date/status; pagination; explicit completeness timestamp |
| P1 | `/products`, product/category/blog pages | Client components fetch full lists after hydration; loading flash and extra round trip | Server component initial fetch/caching, client island for search/cart/wishlist |
| P1 | Public builder catalogs | Large static arrays and studio code ship client-only; espresso file also includes unused costs | Fetch small cost-free active catalog; split engine/UI; remove cost fields |
| P2 | `PublicHeader.tsx` (1,205 lines) | Auth, settings, announcements, notifications, cart/wishlist, drawers and nav in one client bundle/component | Split stable nav, announcement, account, cart and notification islands |
| P2 | Large admin files | Accounting 2,491 lines; CMS 1,613; Products 1,333; Analytics 1,112; drawers 1,170+ | Route/tab lazy loading and feature modules; keep shared data formulas server-side |
| P2 | SEO data + public UI | Metadata layout and client page can issue separate Supabase reads; React `cache()` dedupes within server request only, not client | Server pass initial entity to UI; revalidation/tag cache for public catalog/CMS |
| P2 | Remote images | `next.config.ts:39-44` allows any `**.supabase.co` public-storage URL; images depend on remote response/optimizer | Narrow project hostname; ensure sizes/dimensions; upload validation/format/size policy; fallback/error UX |
| P2 | Global animations/CSS | Extensive glow/filter/marquee/reveal styles can cost GPU/battery; visual QA alone is insufficient | Profile mobile; honor reduced motion globally; use transform/opacity and pause offscreen |
| P3 | Recharts/dashboard | Sales chart dynamically loaded, but other admin tabs remain monolithic | Dynamic import tab-only charts/drawers and render active tab only |

No runtime Web Vitals/Lighthouse or bundle analyzer data was collected, so these are architecture risks rather than measured regressions.

## D. Accessibility

### Positive evidence

- Many icon-only controls have `aria-label`; hero arrows are RTL-aware; forms generally include labels; custom selects expose buttons/options; error/loading/empty states are visible.
- Focus rings/classes are common; buttons use real button elements; Next Image alt text is usually present.
- Direction is set globally and many chevrons rotate under RTL.

### Findings

| Priority | Location/problem | Recommendation |
|---|---|---|
| P1 | No automated or manual keyboard/screen-reader/contrast evidence; custom dropdowns, drawers and modals are numerous | Test NVDA/VoiceOver, keyboard-only, focus trap/return, Escape, role/name/state, scroll lock |
| P1 | Product gallery aria labels are English-only string templates (`products/[slug]/page.tsx:237`); rating labels likewise use English (`TestimonialsSection.tsx:136`) | Localize accessible names via `t()` |
| P1 | Some form labels wrap text but lack explicit `htmlFor` (e.g. login labels `page.tsx:79-105`) | Bind every label/input or nest input inside label consistently |
| P2 | Status often uses colored pills; some include text, but chart legends/tones and low-contrast muted gold/brown need measured contrast | Ensure non-color cues and WCAG AA contrast; test disabled/error/focus states |
| P2 | Auto-rotating hero/announcement/marquees | Provide pause where appropriate and fully disable/limit animation with `prefers-reduced-motion` |
| P2 | Modals/drawers use overlay buttons but focus trapping/restoration is not evident from static scan | Add accessible dialog primitive or documented focus management |
| P2 | Custom select in checkout must expose keyboard navigation, expanded state and active option | Audit `CheckoutPrimitives.tsx:20-105`; prefer native select or ARIA-complete listbox |
| P2 | RTL admin translation uses DOM text/attribute translation (`AdminLanguageProvider`) | Test live regions, accessible names and text direction after mutation; avoid mismatched screen-reader copy |
| P3 | Image fallbacks/error visuals are not consistently explicit | Add meaningful fallback and keep decorative images empty-alt |

## E. Error, loading and empty states

| Area | Present | Gaps / action |
|---|---|---|
| Global/public/admin | Route loading and error boundaries with retry/home | Verify production error redaction and logging correlation IDs |
| Products/category/detail/blog | Loading/error/empty/not-found panels | Client-only initial fetch causes avoidable loading; distinguish offline vs empty vs permission |
| Checkout | Empty cart, validation, promo states, store closed, RPC/notification warning | Telegram failure is non-fatal and currently not a durable owner-facing retry queue; add monitoring/retry |
| Contact | Success/error and retry | Add spam/throttle feedback; preserve typed form on transient failure |
| Account | Loading/error/empty across orders/addresses/notifications/wishlist/profile | Notifications have no read/unread state; direct success receipt depends on sessionStorage |
| Admin | Most pages have loading/retry/empty; analytics explicitly marks unconnected tracking | Aggregate cap incompleteness has no warning; add row horizon/data freshness |
| Images | next/image rendering/fallback sources | Remote object failure state is not consistently handled; add managed placeholder/monitoring |

## Verification checklist before launch

- Export live Supabase grants/RLS/function privileges and storage policies; test anon, customer, non-admin auth and admin roles.
- Exercise login with `next=//example.com` in a safe local test after fix and ensure it falls back internally.
- Inspect production JS to ensure purchase/cost fields are absent.
- Rate-test Telegram/contact/auth/checkout within safe staging limits.
- Capture production headers and CSP report-only violations.
- Run dependency audit after lockfile/Next update; no automatic major downgrade.
- Run Lighthouse/Web Vitals on `/`, `/products`, a product, checkout and admin dashboard using realistic data.
- Run axe plus keyboard/NVDA/RTL checks on header drawers, checkout selects, product gallery and admin modals.
- Validate canonical/OG/schema/sitemap/robots/llms on the real launch domain with owner-approved facts.

