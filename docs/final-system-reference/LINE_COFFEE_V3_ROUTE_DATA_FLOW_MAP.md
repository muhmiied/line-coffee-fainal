# Line Coffee V3 — Route & Data Flow Map

**Last updated:** 2026-07-30
**Companion to:** `LINE_COFFEE_V3_COMPLETE_SYSTEM_REFERENCE.md`

This is the single place to look up **where a route's content lives** (so editing a word or image is a file lookup, not a hunt) and **how data moves through the system** for the flows that matter most (checkout, order lifecycle, inventory). Media Studio is cancelled (Locked Decision 1) — this document is what replaces it.

**Legend:** **Static** = hardcoded in code, edit the file and redeploy. **Dynamic** = comes from Supabase, edit via Admin.

---

## 1. Global chrome

| Element | Source | Type |
|---|---|---|
| Announcement bar | Real `announcements` table, admin CRUD via Marketing → Announcement Bar; public header has a built-in fallback if the table read fails/is empty | Dynamic |
| Header nav labels, cart/wishlist/bell icons | `src/components/layout/public/PublicHeader.tsx` | Static |
| Header notifications dropdown | `order_status_events` via `get_customer_notifications` | Dynamic |
| Footer columns, contact info, social links | Public-scoped `site_settings` rows (`brand`/`contact`/`social_links`) via `src/lib/settings/public-site-settings.ts`, rendered in `PublicFooter.tsx` | Dynamic (falls back to hidden/honest-empty when unset) |

---

## 2. Homepage `/` — `src/features/website/home/sections/`

| Section | Component | Text source | Image source | Type |
|---|---|---|---|---|
| Hero slideshow | `HeroSection.tsx` | `heroSlides`, `heroStats` in `src/lib/mock-data/visual-content.ts` | `assets.hero.darkRoast`, `assets.story.roastery` | Static |
| Categories marquee | `CategoriesSection.tsx` | `visualCategories` in `visual-content.ts` | `assets.categories.*` | Static |
| Best Sellers | `BestSellersSection.tsx` | Supabase `public_products` where `best_seller=true` | product `image_url` | Dynamic |
| Features (4-grid) | `FeaturesSection.tsx` | `visualFeatures` in `visual-content.ts` | `roastery.png` ambient | Static |
| Story | `StorySection.tsx` | `storyCopy` in `visual-content.ts` | `assets.story.roastery` | Static |
| Journal | `JournalSection.tsx` | `visualJournal` in `visual-content.ts` | inline | Static |
| Testimonials | `TestimonialsSection.tsx` | Approved `reviews` rows scoped to homepage/both | `dark-roast.png` ambient | Dynamic |
| Social gallery | `SocialGallerySection.tsx` | `socialGalleryImages` in `visual-content.ts` | gallery paths | Static |
| Contact | `ContactSection.tsx` | `contactItems` in `visual-content.ts`; form writes via `create_contact_message` | `roastery.png` ambient | Contact info static · form Dynamic |

`visual-content.ts` currently exports: `assets`, `heroSlides`, `heroStats`, `visualCategories`, `visualFeatures`, `storyCopy`, `visualJournal`, `contactItems`, `socialGalleryImages`. (The dead `visualProducts`/`visualTestimonials` exports were removed in the Phase 5 Batch C cleanup — the homepage has read real best-sellers/reviews since well before that; those two exports had zero remaining consumers.)

---

## 3. Products

| Route | Data source | Type |
|---|---|---|
| `/products` | `public_products` / `public_categories` via `src/lib/catalog/public-catalog.ts`; hero image inline | Dynamic catalog · static hero |
| `/products/category/[slug]` | `public_products` filtered by category | Dynamic |
| `/products/[slug]` | `public_products` + `public_product_variants` — name/description/price/blend composition/images all DB-sourced | Dynamic |
| Product images | `products.image_url` + `products.gallery`, managed via Admin Products → Media tab → Supabase Storage bucket `product-images` | Dynamic |

`/products` and `/products/category/[slug]` share the UI-only taste-family taxonomy in `src/lib/catalog/product-taste-filters.ts`. It classifies the existing public product slugs into category-appropriate filter chips (for example original, fruit, nuts, chocolate, desserts) without adding a database field or changing product/pricing truth. The two builder routes remain intentionally excluded.

`/products` server-renders the directly requested category for useful first HTML, then treats sidebar category changes as in-page client state. The URL is synchronized through the native History API (no repeat App Router server navigation); category reads share in-flight/session promises, prefetch on pointer/focus intent, reuse the already-rendered category list, and fetch the small public variant-price view in parallel once per browser session. Product-detail links disable viewport-wide automatic prefetch and prefetch only on pointer/focus intent. Catalog cards use `content-visibility: auto` and a layered translucent surface instead of one live backdrop filter per card; the larger sidebar/search panels retain real glass blur.

---

## 4. Builders

| Route | Data source | Type |
|---|---|---|
| `/products?category=make-your-espresso` | `public_espresso_beans` (real backend catalog); UI/copy/engine in `src/features/website/make-your-espresso/*` | Dynamic catalog · static UI |
| `/products?category=make-your-flavor` | `public_flavor_bases` + `public_flavor_items` (real backend catalog); UI/copy/engine in `src/features/website/make-your-flavor/*` | Dynamic catalog · static UI |

Both builders fail closed (bilingual retry state, add-to-cart disabled) if their live catalog query fails or returns empty — they do not fall back to a static business-data catalog.

---

## 5. Shopping flow

| Route | Data source | Type |
|---|---|---|
| `/cart` | `src/lib/context/cart.tsx`, owner-scoped `localStorage` | Local |
| `/checkout` | Form labels inline in `src/features/website/checkout/*`; governorate/area lists in `src/lib/checkout/governorates.ts`; submit → `create_checkout_order` | Static UI · dynamic submit |
| `/order-success` | In-session receipt (`sessionStorage`) or, if missing, a real ownership-scoped recovery fetch via `get_customer_order_detail` | Local + dynamic recovery |

---

## 6. Editorial / brand pages

| Route | Text source | Image source | Type |
|---|---|---|---|
| `/about` | Inline constants (`INTRO`, `PHILOSOPHY`, `JOURNEY`, `QUOTE`, `CTA_SECTION`) in `about/page.tsx` | `dark-roast.png`, `roastery.png` | Static |
| `/contact` | Inline `SITE_CONTACT` + `FAQ_ITEMS` in `contact/page.tsx`; public-scoped `site_settings` override contact values when configured | `roastery.png` | Static text · dynamic contact values |
| `/blog` | Published rows from `blog_posts` via `src/lib/cms/public-blog.ts` | `card_image` with `hero_image` fallback | Dynamic |
| `/blog/[slug]` | Published `blog_posts.content_en/ar` parsed into heading/paragraph blocks | `hero_image` with `card_image` fallback | Dynamic |
| `/privacy` `/terms` `/shipping` `/returns` | `legal_pages` table (currently all four rows are empty drafts) with a static code fallback via `src/components/ui/LegalPageLayout.tsx` | hero only | Dynamic-with-fallback |

---

## 7. Account / auth

| Route | Data | Type |
|---|---|---|
| `/account/orders`, `/account/orders/[id]` | `get_customer_orders` / `get_customer_order_detail` | Dynamic |
| `/account/profile` | `get_customer_profile` / `update_customer_profile` | Dynamic |
| `/account/addresses` | Address CRUD RPCs | Dynamic |
| `/account/wishlist` | `get_customer_wishlist` + catalog join | Dynamic |
| `/account/notifications` | `get_customer_notifications` | Dynamic |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password` | Labels inline; auth via real Supabase Auth | Static UI · dynamic auth |

---

## 8. Admin routes

All under `src/app/admin/*`, gated by `useCurrentAdmin()`.

| Route | Primary data layer |
|---|---|
| `/admin/dashboard` | `src/lib/admin/admin-dashboard.ts` (`get_admin_dashboard_report_v1`) |
| `/admin/products`, `/admin/products/[slug]` | `src/lib/admin/admin-catalog.ts` |
| `/admin/orders`, `/admin/orders/[id]` | `src/lib/admin/admin-orders.ts` (`list_admin_orders_v1`, `OrderFinancePanel`) |
| `/admin/inventory` | `src/lib/admin/admin-inventory.ts`, `admin-purchasing.ts`, `admin-packaging.ts` |
| `/admin/marketing` | `src/lib/admin/admin-marketing.ts`, `admin-announcements.ts` |
| `/admin/accounting` | `src/lib/admin/admin-accounting.ts` (`get_admin_accounting_report_v1`) |
| `/admin/analytics` | `src/lib/admin/admin-analytics.ts` (`get_admin_analytics_report_v1`) |
| `/admin/cms` | `src/lib/admin/admin-cms.ts` |
| `/admin/customers` | `src/lib/admin/admin-customers.ts` (`list_admin_customers_v1`) |
| `/admin/settings` | `src/lib/admin/admin-settings.ts` |
| `/admin/espresso-manager` | `src/lib/admin/admin-espresso.ts` |
| `/admin/flavor-manager` | `src/lib/admin/admin-flavor.ts` |

---

## 9. API routes

| Route | Purpose |
|---|---|
| `/api/order-notifications/telegram` | The only server-side route in the app. Server-only bot token; atomic claim-before-send; see the System Reference §12. |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | Generated SEO/AI-search endpoints (`src/app/sitemap.ts`, `robots.ts`, `llms.txt/route.ts`) |

---

## 10. Data flow — checkout to delivered order

```
Browser cart (localStorage, untrusted)
        │  place order
        ▼
create_checkout_order  (public RPC wrapper, replay-safe on checkout_attempt_id)
        │
        ├─ re-read every price/variant from DB
        ├─ validate builder ratios (espresso) / base+flavor (flavor)
        ├─ resolve_delivery_fee(governorate, area)  → server-computed delivery
        ├─ _evaluate_promo_code                      → product-subtotal-only discount
        ├─ reserve FIFO lots: inventory_lots (coffee), espresso_bean_lots (beans)
        ├─ deduct packaging immediately (_apply_order_packaging)
        ├─ upsert guest/registered customer
        └─ insert orders + order_items (payment_status = 'pending' for every method)
        │
        ▼
Browser receives cost-free receipt
        │
        ├─ Telegram: POST {orderId, checkoutAttemptId} → get_order_notification_payload
        │            → claim_order_notification → send → mark_order_notification_sent
        └─ WhatsApp: same trusted snapshot → prefilled wa.me link, auto-opens once/session

Admin moves order:  pending → preparing → shipped → delivered
                                                        │
                                                        ├─ deduct FIFO lots (coffee + bean)
                                                        ├─ snapshot COGS → order_items.line_cogs, orders.cogs_total
                                                        └─ roll any custom_flavor cost-only snapshot into cogs_total

  cancelled at any point before delivered → release all reserved allocations, no COGS recorded
  returned (after delivered) → record_order_return restocks ONLY the order's own deducted
                                allocations for sellable items; flavor/packaging never restock
```

---

## 11. Data flow — inventory FIFO (any of the three resource dimensions)

```
Purchase / adjustment
        │
        ▼
New lot created (inventory_lots / espresso_bean_lots / packaging_lots)
  unit_cost = actual cost paid, received_date = now
        │
        ▼
Order reserves against OLDEST open lot first (FIFO)
        │
        ├─ delivered → deduct from that lot, snapshot its unit_cost as COGS
        └─ cancelled → release the reservation, lot remains open
```

Coffee and espresso beans follow reserve-at-order/deduct-at-delivered. Packaging deducts immediately at order placement (a deliberate, documented exception — Locked Decision 7). Flavor has no lot table at all (cost-only, Locked Decision 4).

---

## 12. Data flow — Telegram notification (concurrency-safe)

```
POST { orderId, checkoutAttemptId }
        │
        ├─ reject: cross-origin, oversized body, malformed shape
        ▼
get_order_notification_payload(orderId, checkoutAttemptId)
        │  (requires proof of the order's own checkout_attempt_id; cost-free)
        ▼
claim_order_notification  ──▶ "already_sent"  → respond ok, duplicate (no send)
        │                 └─▶ "in_progress"   → respond ok, someone else owns it (no send)
        │                 └─▶ "error"         → respond 503 (no send)
        ▼ "claimed"
Send Telegram message
        │
        ├─ success → mark_order_notification_sent, respond ok
        └─ failure → release_order_notification_claim, respond error
                     (a released or stale claim can be retried; a stale claim
                      also self-heals after its timeout even if release fails)
```

---

## 13. Site-wide values now centralized in `site_settings` (public-scoped)

These used to be hardcoded inline; Phases 17A-17B moved them into the real, admin-editable `site_settings` table (public reads limited to `is_public = true` rows, further narrowed in code to `brand`/`contact`/`social_links`/`storefront`):

- Contact info (support phone/email, WhatsApp number)
- Social links
- Store name
- Storefront open/closed state + closed-notice message

Delivery zone fees remain owned by the SQL function `resolve_delivery_fee()`, not `site_settings` — deliberately not exposed as an editable table field so it can never silently drift from the checkout engine.
