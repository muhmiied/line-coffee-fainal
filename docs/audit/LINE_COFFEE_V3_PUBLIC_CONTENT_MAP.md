# Line Coffee V3 — Public Content Map

Audit date: 2026-07-12  
Scope: current repository only; documentation pass, no runtime/database inspection  
Status legend: **Real** = current Supabase data; **Static config** = code-controlled intentional content; **Mock** = illustrative/fabricated; **Needs owner decision** = may be intentional but cannot be verified from code.

## Shared public shell

| Area | Primary files | Visible content and behavior | Source / owner edit path | Status / notes |
|---|---|---|---|---|
| Metadata, language, providers | `src/app/layout.tsx:1-180` | Global title template, description, keywords, OpenGraph/Twitter, Organization/WebSite JSON-LD; EN/AR direction; cart and language providers | SEO: `src/lib/seo/site.ts`, `metadata.ts`, `jsonld.tsx`; initial language cookie/local storage | Real SEO + static brand config |
| Header navigation | `src/components/layout/public/PublicHeader.tsx:49-62, 790-1205` | Home, Products, About, Contact, Blog; account links; login/signup/admin; cart, wishlist, notifications and mobile drawers | Link labels are inline; cart from `CartProvider`; wishlist/account notifications from Supabase-backed hooks/RPCs | Mixed static UI + real commerce/account |
| Announcement bar | `PublicHeader.tsx:790-1010`; `src/lib/content/announcements.ts` | Rotating bilingual text and optional CTA; fade timer | Active rows from `announcements`; fallback `DEFAULT_ANNOUNCEMENTS`; Admin → Marketing → Announcement Bar | Real with static fallback. Cycle logic around `PublicHeader.tsx:849-857` |
| Footer | `src/components/layout/public/PublicFooter.tsx:26-269` | Product/custom/brand/support links, social icons, contact details, copyright | Links inline; brand/contact/social from public `site_settings` via `getPublicSettings()`; edit Admin → Settings | Mixed static UI + dashboard-controlled settings |
| Loading/errors | `src/app/loading.tsx`; `src/app/(public)/loading.tsx`; `src/app/error.tsx`; `src/app/(public)/error.tsx`; `src/app/global-error.tsx`; `src/components/error/ErrorScreen.tsx` | Shared loading screen and retry/home error actions | Code-controlled | Real states; detailed DB errors are generally mapped in page components |

## Route inventory

### `/` — homepage

Primary composition: `src/app/page.tsx:1-12` → `src/features/website/home/LineCoffeeHome.tsx:3-26`.

| Section | Component / lines | Visible content, links, images and interactions | Data/edit source | Status / risk |
|---|---|---|---|---|
| Hero | `HeroSection.tsx:20-320` | Three slides. Slide 1 “Coffee Crafted for Quiet Luxury” → `/products`, “Our Story” → `/about`; slide 2 “Craft Your Own Espresso Blend” → `/products?category=make-your-espresso` and espresso blends; slide 3 “Design Your Flavored Coffee” → flavor builder/category. Images: dark roast, roastery, flavor category. Arrow/dot controls, RTL-aware labels, auto-rotation, animated stats | `src/lib/mock-data/visual-content.ts:17-99`; auto-cycle at `HeroSection.tsx:45-55,98-103` | **Static config**. Owner changes copy/CTA/image in `visual-content.ts`; no dashboard editor |
| Category marquee | `CategoriesSection.tsx:1-142` | Seven cards: Turkish, Espresso, Make Your Espresso, Easy Coffee, Coffee Mix, Cappuccino, Flavor Coffee; each links to `/products?category=<slug>`; repeated marquee imagery | `visual-content.ts:101-143`; assets under `public/assets/categories` / `products` | **Static config**. Categories can drift from real Supabase category visibility |
| Benefits | `FeaturesSection.tsx:1-77` | “Built Around Your Ritual”; Genuine Support, Delivered to Your Door, Fresh Roast, Premium Quality | `visual-content.ts:216-246` | Static marketing claims; owner approval recommended |
| Story | `StorySection.tsx:1-150` | “A Warmer Way to Make Coffee,” three value cards, numeric stats, roastery visual | `visual-content.ts:253-282` and `heroStats` | Static brand content / numbers; not Admin-controlled |
| Best sellers | `BestSellersSection.tsx:18-200` | Product cards, loading/error/empty text, “View All Best Sellers” → `/products`; marquee when more than four | `getPublicBestSellers()` → `public_products`; product/variant data from Supabase | **Real**. Images/prices/badges via Admin Products |
| Journal | `JournalSection.tsx:1-100` | Three fixed cards (“Roast Notes”, “Blend Guide”, “Keeping It Fresh”) → fixed blog slugs; “View all posts” | `visual-content.ts:290-319` | **Static config**, not the newest CMS posts; can become stale |
| Testimonials | `TestimonialsSection.tsx:1-165` | “Loved in Everyday Rituals,” approved customer cards, star labels; Browse Menu → `/products`; Leave a Review → `/contact` | `listApprovedHomepageReviews()` → `reviews` approved/non-hidden, in `public-cms.ts:34-60`; Admin → CMS → Reviews | **Real**. No public review-submission workflow; contact is only a handoff |
| Social gallery | `SocialGallerySection.tsx:1-128` | “Follow Our Journey,” social buttons and six linked images | Images: `visual-content.ts:379-386`; URLs from props/default values rather than `site_settings` in this component | Static gallery; social URLs should be verified against Settings wiring |
| Contact | `ContactSection.tsx:1-271` | Contact cards; name/email/subject/message form; success, retry and error copy | Form → `create_contact_message` RPC via `public-cms.ts:65-84`; phone/settings fetched; labels/assets in `visual-content.ts` | Real form + mixed static/settings contact data |

Owner guide: Admin Products controls best-seller product data; Admin CMS controls homepage reviews; Admin Marketing controls announcement rows; Admin Settings controls public contact/social/storefront fields. All other homepage story/hero/category/journal/gallery copy remains code-controlled in `visual-content.ts` or its section component.

### `/products`

- Primary: `src/app/(public)/products/page.tsx:41-360`; cards: `src/components/product/ProductCard.tsx:1-316`; data: `src/lib/catalog/public-catalog.ts:423-538`.
- Purpose/sections: image hero; category/sidebar chooser; search; category count; product grid; embedded Make Your Espresso and Make Your Flavor studios; loading, query failure and empty states.
- Data: categories/products/variants come from `public_categories`, `public_products`, and `public_product_variants`. Names, descriptions, badges, image, archive/visibility and prices are Supabase-controlled through Admin Products.
- Links: product cards → `/products/[slug]`; sidebar updates `?category=`; studio choices render in-place. `previewProduct`/`previewImage` query parameters provide an admin image preview (`products/page.tsx:126-181`).
- Images: product `image_url` or catalog mapper fallback; category hero/fallback assets are code-controlled. Managed storage images use the public `product-images` bucket.
- Interactions: client-side search/filter; dynamic imports with `ssr:false` for both studios (`products/page.tsx:26-38`); cards support cart/wishlist/size selection.
- Owner guide: edit catalog in Admin → Products. Studio-facing catalog/prices are not read from Admin; see builder warning below.
- Risk: page is a client component and fetches the full public catalog after hydration. The two studio bundles are client-only. This costs first-interaction time and leaves metadata/body content less useful during a failed client fetch.

### `/products/[slug]`

- Primary UI: `src/app/(public)/products/[slug]/page.tsx:28-599`; metadata/schema: adjacent `layout.tsx:23-77`.
- Sections: loading/error/not-found; breadcrumb; image gallery/thumbnails; bilingual title/description; badge/category; weight/variant and quantity controls; computed total; add-to-cart and wishlist; flavor/taste bars; blend composition; product story; related products/FAQ/review presentation near the lower page.
- Real sources: product, gallery and variants through `getPublicCatalogProductBySlug()` and categories through `public-catalog.ts`; SEO Product/Breadcrumb schema reads live public views through `src/lib/seo/data.ts:98-149`.
- Numbers: option prices are variant `price`; total = selected variant price × quantity (`page.tsx:401-403`).
- **Mock/heuristic numbers:** taste bars are generated in `getProductMetrics()` from category, price thresholds and Robusta share (`page.tsx:60-116`); they are not stored tasting data. Do not present them as laboratory/roaster measurements without owner approval.
- Images: `products.image_url` + gallery; category/default local asset fallback (`page.tsx:119-126`). Edit Admin Products → product → Media.
- Risk: gallery alt labels are English-only templates at `page.tsx:237`; metrics and lower editorial copy are code-controlled and can drift from product CMS/catalog copy.

### `/products/category/[slug]`

- Primary UI: `src/app/(public)/products/category/[slug]/page.tsx:19-519`; metadata/schema: adjacent `layout.tsx:22-68`.
- Real data: selected category, category products and all products/categories via public catalog views (`page.tsx:259-262`).
- Static editorial data: `categoryExperiences` supplies seven category hero titles/descriptions/images (`page.tsx:38-123`). Unknown real categories fall back to database name/description.
- Filters: search; price groups All, under 400, 400–700, 700+ (`125-129`); Featured, price ascending/descending, name (`132-136`); results count and related categories.
- Links: breadcrumb → `/`, `/products`; cards → product detail; related categories → this route.
- Owner guide: catalog identity/visibility/images in Admin Products; hero story for known slugs in this page file.
- Risk: price filters use the mapped product price and fixed EGP bands; editorial map must be updated when slugs/categories change.

### Cart, checkout and success

| Route | Responsible files | Visible fields/content/actions | Source and calculations | Risks / owner edit |
|---|---|---|---|---|
| `/cart` | `src/app/(public)/cart/page.tsx:1-238`; `src/lib/context/cart.tsx` | Empty-cart CTA; item image/name/detail; quantity ±; remove; subtotal; checkout CTA | Owner-scoped local storage keys `line-cart-v1:guest:<guestId>` or `:auth:<userId>`; item prices are snapshots and are revalidated at checkout | Local cart is not durable cross-device. Checkout server is authoritative |
| `/checkout` | route wrapper `checkout/page.tsx`; `CheckoutForm.tsx:139-734`; `AddressSection.tsx`; `PaymentSection.tsx`; `PromoSection.tsx`; `OrderSummary.tsx` | Full name, phone, WhatsApp, optional email; saved address; governorate, area, street, building, floor/apartment, landmark, Google Maps URL; order note; cash/Instapay/e-wallet and conditional reference/phone; promo; totals; store-closed/error/empty states | Form is code-controlled. Saved profile/addresses from customer RPCs. Promo → `validate_promo_code`. Submit → `create_checkout_order`. UI delivery mirror in `src/lib/delivery.ts:44-79`; server recomputes. Fees: Shorouk/Madinaty 30 EGP; Haram/October/Zayed 100; other Cairo/Giza 50; outside Cairo/Giza 0 in order plus customer-pays-courier note | Server safely re-reads catalog/prices/stock/promo. Client displays raw-ish mapped auth/DB errors in some flows. No page-level rate limit. Google Maps accepts only http/https validation in form |
| `/order-success` | `src/app/(public)/order-success/page.tsx:1-254`; `src/lib/checkout.ts:77-211` | Receipt/order code, order summary, WhatsApp handoff, continue shopping/home | Receipt/handoff snapshot in `sessionStorage` keyed by order ID; auto-opens WhatsApp once per session; manual button remains | Direct/reloaded visits without session snapshot show a generic state. This is not the durable receipt source; account Orders is |

Server total formula: `subtotal - discount_total + delivery_fee`, clamped/validated server-side (`20260701104031_phase6_7_packaging_promos_pricing.sql:1298-1311`). Percentage discount = subtotal × value/100; fixed = value; then cap by `max_discount` and subtotal (`:734-752`). Delivery is outside the discount.

### Brand, contact, blog, reviews and legal

| Route | Purpose / major sections | Text/images/links | Source / edit path | Status / risks |
|---|---|---|---|---|
| `/about` | Intro, philosophy, three facts, journey, quote band, CTA | Local roastery/dark-roast images; CTAs to products and both builders | Inline constants `INTRO`, `PHILOSOPHY`, `JOURNEY`, `QUOTE`, `CTA_SECTION` in `about/page.tsx:11-82` | **Static config / Needs owner decision**. Claims “Arabica only,” 72-hour roast window, founding timeline; catalog includes Robusta, so claim consistency must be reviewed |
| `/contact` | Hero, contact cards, real form, channel buttons, FAQ, products CTA | WhatsApp/phone/email/location; name/phone/email/subject/message; FAQ; local roastery image | Public `site_settings` via `getPublicSettings()` (`page.tsx:126-190`); form RPC (`:200+`); FAQ inline (`:23+`) | Real contact/settings + static FAQ. Comment still calls content “Static mock” (`:21`) although most contact values are settings-backed |
| `/blog` | Hero, search, category filter, featured/card grid, empty/error/loading | CMS titles/excerpts/images/category/date/read time; links to `/blog/[slug]` | `listPublishedBlogPosts()` → published `blog_posts`; Admin → CMS → Blog | Real. Client fetch after hydration |
| `/blog/[slug]` | Cover, breadcrumb, metadata row, structured body blocks, related posts, products CTA | CMS post and other published posts | Same `blog_posts`; metadata/Article/Breadcrumb schema via adjacent layout and `seo/data.ts` | Real. Body is rendered as structured paragraphs/headings, not raw HTML |
| `/reviews` | Redirect only | Redirects to `/contact` (`reviews/page.tsx:1-5`) | Code-controlled | **Dead-content expectation risk:** route name suggests a review index but none exists |
| `/privacy` | LegalPageLayout with 7 sections | Contact CTA → `/contact` | Inline `sections` at `privacy/page.tsx:8-98` | **Static config**; Admin CMS legal publishing does not feed this route |
| `/terms` | 7 sections | Contact CTA | Inline `terms/page.tsx:8-103` | Same wiring gap |
| `/shipping` | 6 sections | Contact CTA | Inline `shipping/page.tsx:8-93` | Static fee/time claims can drift from `resolve_delivery_fee()` |
| `/returns` | 7 sections | Contact CTA | Inline `returns/page.tsx:8-98` | Static policy can drift from admin returns behavior |

Legal owner warning: Admin → CMS → Legal Pages writes `legal_pages`, but none of these four public routes calls a public legal-page reader. Publishing there currently does **not** update the website.

### Authentication

| Route | Form/actions | Source | States / risks |
|---|---|---|---|
| `/auth/login` | Email, password, show/hide, forgot password, signup | `useAuth().signIn`; post-login admin lookup | Loading/error/already-signed-in redirect. `next` validation accepts protocol-relative values such as `//host`; see security audit SEC-01 |
| `/auth/signup` | Name, email, password/confirm; login link | Supabase Auth sign-up; guest data linking after auth | Inline validation/errors; destination resolved through admin membership |
| `/auth/forgot-password` | Email; reset link request | `supabase.auth.resetPasswordForEmail`, redirect based on `window.location.origin` | Success/error states. Rate limiting depends on Supabase/project edge settings, not visible here |
| `/auth/reset-password` | New/confirm password; recovery-session verification | `onAuthStateChange` then `updateUser({password})` | Invalid/expired recovery, saving, success/error states |

All auth/account/cart routes use `noindex` metadata through their layouts or shared private metadata.

### Account area

Shared shell: `src/components/layout/account/AccountShell.tsx:1-147`; ownership boundary: `src/app/(public)/account/AccountOwnerBoundary.tsx`. Registered ownership resolves through `auth.uid()`; anonymous ownership uses device `guest_id`; account functions are in `src/lib/account/customer-account.ts`.

| Route | Visible content/actions | RPC/data source | Reality / notes |
|---|---|---|---|
| `/account/profile` | Identity fields, save, auth state, empty/error | `get_customer_profile`, `update_customer_profile`; auth email fallback | Real. Registered profile is cross-device; guest same-device |
| `/account/addresses` | Address cards; add/edit/delete/default; governorate/area selects; Maps URL | `get/add/update/delete/set_default_customer_address` | Real Supabase persistence and ownership checks |
| `/account/orders` | Order cards: code/date/status/payment/total; detail links; empty/error | `get_customer_orders` | Real. Status labels inline |
| `/account/orders/[id]` | Items, address, totals, payment method/status, timeline/status events | `get_customer_order_detail(guest_id, code)` | Real and ownership-scoped in RPC; URL parameter is order code |
| `/account/notifications` | Status-event notification cards and order links; empty/error | `get_customer_notifications` from `order_status_events` | Real derived notifications; no separate read/unread persistence |
| `/account/wishlist` | Product cards, remove, add to cart, empty/error | Authenticated: wishlist RPCs; guest: guest-scoped localStorage cache; products resolved from public catalog | Real for auth, device-local for guests |
| `/account/settings` | Language choice; navigation/security/account links | Writes local storage key and reloads (`page.tsx:54-149`) | **Static/local only**. No notification/privacy preference persistence |

## Builder warning: visible catalog versus checkout catalog

The public builder UI imports local arrays:

- Espresso: `src/features/website/make-your-espresso/data/espressoBeans.ts:35-306` (including visible sale and internal-looking purchase prices) and `EspressoBlendStudio.tsx`.
- Flavor: `src/features/website/make-your-flavor/data/flavorData.ts:70-404` and `FlavorMixStudio.tsx`.

Admin Espresso/Flavor Managers edit Supabase tables `espresso_beans`, `flavor_bases`, and `flavor_items`. Checkout then validates keys and recalculates pricing from those tables. Public views (`public_espresso_beans`, `public_flavor_bases`, `public_flavor_items`) exist, but the UI does not consume them. Therefore an admin edit can leave the builder showing stale availability/name/price; checkout may reject the item or return a different authoritative amount. This is **P1 / High** content-integrity risk.

## Public owner quick-edit matrix

| Change wanted | Current edit source |
|---|---|
| Product name, image, description, badge, visibility, variants/prices | Admin → Products |
| Announcement bar | Admin → Marketing → Announcement Bar |
| Contact, social links, store-open message | Admin → Settings |
| Blog, reviews and contact inbox | Admin → CMS |
| Hero/story/features/category marquee/journal/social gallery | `src/lib/mock-data/visual-content.ts` + redeploy |
| About/FAQ/category editorial copy | Route file + redeploy |
| Legal website text | Route file + redeploy (Admin Legal is currently disconnected) |
| Delivery fee rules | SQL `resolve_delivery_fee()` and matching `src/lib/delivery.ts`; must change together |
| Builder display catalog | Local builder data files; admin edits do not currently update display |

