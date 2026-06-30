# LINE COFFEE V3 — Website Content Map

Last updated: 2026-06-28

**Purpose (Decision 1):** Media Studio is cancelled. There is no CMS for general site copy/images. This map tells you **exactly which file holds each piece of public text and each image**, so changing a word or a picture is a lookup — not a hunt.

**Legend:** **Static** = hardcoded in code (edit the file, then redeploy). **Dynamic** = comes from Supabase (edit via Admin). **Image source**: `/public/assets/...` paths are listed in the `assets` map in `src/lib/mock-data/visual-content.ts`.

---

## Global chrome

| Element | Text/Image | Source file | Type |
|---|---|---|---|
| Announcement bar (3 rotating messages) | Text + CTA | `src/components/layout/public/PublicHeader.tsx` → local `announcements` array (~line 40) | Static |
| Header nav labels, cart/wishlist/bell | Labels | `PublicHeader.tsx` | Static |
| Header notifications dropdown | Order events | `order_status_events` via `get_customer_notifications` | Dynamic |
| Footer columns, links, social | Text + links | `src/components/layout/public/PublicFooter.tsx` | Static |
| Footer background | `dark-roast.png` | `PublicFooter.tsx` + `assets` map | Static |

---

## Homepage `/` — sections in `src/features/website/home/sections/`

| Section | Component | Text source | Image source | Type |
|---|---|---|---|---|
| Hero slideshow | `HeroSection.tsx` | `heroSlides`, `heroStats` in `visual-content.ts` | `assets.hero.darkRoast`, `assets.story.roastery` | Static |
| Categories marquee | `CategoriesSection.tsx` | `visualCategories` in `visual-content.ts` | `assets.categories.*` | Static |
| Best Sellers | `BestSellersSection.tsx` | **Supabase** `public_products` where `best_seller=true` | product `image_url` | **Dynamic** |
| Features (4-grid) | `FeaturesSection.tsx` | `visualFeatures` in `visual-content.ts` | `roastery.png` ambient | Static |
| Story | `StorySection.tsx` | `storyCopy` in `visual-content.ts` | `assets.story.roastery` | Static |
| Journal | `JournalSection.tsx` | `visualJournal` in `visual-content.ts` | inline | Static |
| Testimonials | `TestimonialsSection.tsx` | `visualTestimonials` in `visual-content.ts` | `dark-roast.png` ambient | Static *(→ Phase 13: real `reviews`)* |
| Social gallery | `SocialGallerySection.tsx` | `socialGalleryImages` in `visual-content.ts` | gallery paths | Static |
| Contact | `ContactSection.tsx` | `contactItems` in `visual-content.ts` | `roastery.png` ambient | Static |

> `visual-content.ts` exports: `assets`, `heroSlides`, `heroStats`, `visualCategories`, `visualProducts`, `visualFeatures`, `storyCopy`, `visualJournal`, `visualTestimonials`, `contactItems`, `socialGalleryImages`.

---

## Products

| Route | Text/Image source | Type |
|---|---|---|
| `/products` (grid, sidebar, search, hero) | Catalog from `public_products`/`public_categories` (`src/lib/catalog/public-catalog.ts`); hero image inline in `products/page.tsx` | **Dynamic** catalog · Static hero |
| `/products/category/[slug]` | `public_products` by category | **Dynamic** |
| `/products/[slug]` (detail) | `public_products` + `public_product_variants`; product name/desc/price/blend/images all from DB | **Dynamic** |
| Product images | `products.image_url` + `gallery` (Admin Products → Supabase Storage, Phase 12) | **Dynamic** |

---

## Builders

| Route | Source | Type |
|---|---|---|
| `/make-your-espresso` | Bean catalog + copy in `src/features/website/make-your-espresso/*` (local) | Static *(→ Phase 8: real beans)* |
| `/make-your-flavor` | Bases/flavors + copy in `src/features/website/make-your-flavor/data/flavorData.ts` | Static *(→ Phase 9: real config)* |

---

## Shopping flow

| Route | Source | Type |
|---|---|---|
| `/cart` | Cart context (`src/lib/context/cart.tsx`, owner-scoped `localStorage`) | Local |
| `/checkout` | Form labels inline in `checkout/page.tsx`; governorate/area lists inline; submit → `create_checkout_order` | Static UI · **Dynamic** submit |
| `/order-success` | Order snapshot from `sessionStorage` | Local |

---

## Editorial / brand pages (inline constants — edit the page file)

| Route | Text source | Image source | Type |
|---|---|---|---|
| `/about` | Inline constants `INTRO`, `PHILOSOPHY`, `JOURNEY`, `QUOTE`, `CTA_SECTION` in `about/page.tsx` | `dark-roast.png`, `roastery.png` | Static |
| `/contact` | Inline `SITE_CONTACT` (WhatsApp/phone/email/location) + `FAQ_ITEMS` in `contact/page.tsx` | `roastery.png` | Static |
| `/blog` | `src/lib/mock-data/blog-data.ts` (`BlogPost[]`) | per-post `image` | Static *(→ future CMS optional)* |
| `/blog/[slug]` | `blog-data.ts` body blocks | cover image | Static |
| `/privacy` `/terms` `/shipping` `/returns` | Inline `sections` array in each route via `src/components/ui/LegalPageLayout.tsx` | hero only | Static |

---

## Account / auth (UI labels static; data dynamic)

| Route | Data | Type |
|---|---|---|
| `/account/orders`, `/orders/[id]` | `get_customer_orders` / `get_customer_order_detail` | **Dynamic** |
| `/account/profile` | `get_customer_profile` / `update_customer_profile` | **Dynamic** |
| `/account/addresses` | address CRUD RPCs | **Dynamic** |
| `/account/wishlist` | `get_customer_wishlist` + catalog | **Dynamic** |
| `/account/notifications` | `get_customer_notifications` | **Dynamic** |
| `/auth/*` | Labels inline; auth via Supabase | Static UI · **Dynamic** auth |

---

## Site-wide values to centralize later (`site_settings`, Phase 1+)

Currently scattered as inline constants; planned to move into a `site_settings` table so the owner can edit without code:
- Contact info (`SITE_CONTACT` in `contact/page.tsx`)
- Delivery zone fees (Phase 1)
- Announcement messages (`announcements` in `PublicHeader.tsx`)
- Social links (`PublicFooter.tsx`)

> When a value moves from Static → Dynamic in a later phase, update its row here.
