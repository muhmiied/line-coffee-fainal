> Historical planning document. Current source of truth is `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.
> If this document conflicts with current state, follow `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.

# LINE COFFEE V3 — Public Website Master Visual Plan

> **Status:** Planning Document — Typography locked. Ready to begin Products Experience phase.
> **Phase:** Products Experience (next) → Custom Builders → Checkout → Brand Pages → Legal/Account
> **Constraints:** No Supabase binding, no Dashboard work, no checkout backend logic, no new homepage sections.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Source Files Reviewed](#2-source-files-reviewed)
3. [Current Locked Decisions](#3-current-locked-decisions)
4. [Full Sitemap Table](#4-full-sitemap-table)
5. [Page-by-Page Visual Blueprints](#5-page-by-page-visual-blueprints)
6. [Products Experience Phase — Deep Detail](#6-products-experience-phase--deep-detail)
7. [Custom Builders Phase — Deep Detail](#7-custom-builders-phase--deep-detail)
8. [Component Inventory](#8-component-inventory)
9. [Visual Rules System](#9-visual-rules-system)
10. [Content & Media Requirements](#10-content--media-requirements)
11. [Data Model Awareness (No Implementation)](#11-data-model-awareness-no-implementation)
12. [Build Execution Plan — 9 Phases](#12-build-execution-plan--9-phases)
13. [Agent Prompts (Codex-Ready)](#13-agent-prompts-codex-ready)
14. [Next Recommended Step](#14-next-recommended-step)

---

## 1. Executive Summary

Line Coffee V3 is a premium Egyptian specialty-coffee brand's public website. It is a **visual-first, bilingual (AR/EN), dark cinematic luxury** experience. There is no backend in the current build phase — all data is static mock data.

The homepage has undergone a major art direction pass (Session 1, 2026-06-16) and is nearly locked pending typography approval. This document covers **every remaining public page** after the homepage — from the Products catalog through the Contact page and legal pages.

### V3 Core Visual Identity
- **Palette:** Near-black warm backgrounds (`#0b0806`), copper/gold accents (`#b6885e`, `#d6a373`), warm cream text (`#f5e6d8`)
- **Feel:** Boutique coffee brand — editorial, cinematic, unhurried
- **Layout:** Generous whitespace, large product photography, clean typographic hierarchy
- **Motion:** CSS-only where possible; scroll reveal via IntersectionObserver; luxury easing `cubic-bezier(0.22, 1, 0.36, 1)`
- **Language:** Full bilingual — Arabic RTL (`lang="ar"`, `dir="rtl"`) and English LTR (`lang="en"`, `dir="ltr"`)

### What This Document Is NOT
- Not an implementation guide for Supabase
- Not a Dashboard/Admin planning doc
- Not a checkout backend specification
- Not a changelog — changes go in CLAUDE.md

---

## 2. Source Files Reviewed

| File | Role |
|---|---|
| `LINE_COFFEE_V2_MASTER_SPECIFICATION.md` | Full system scope, feature definitions |
| `LINE_COFFEE_V2_MASTER_BLUEPRINT.md` | Business logic, product rules, order flow |
| `LINE_COFFEE_V2_DATABASE_BLUEPRINT.md` | Data shape reference (16 table groups) |
| `LINE_COFFEE_V2_ADMIN_MODULES_BLUEPRINT.md` | Dashboard modules (deferred, not in scope) |
| `LINE_COFFEE_V2_CONTENT_COPY_BLUEPRINT.md` | All bilingual copy — hero, categories, products, cart, checkout, empty states, error states |
| `LINE_COFFEE_V2_CODEX_PROMPT_PACK.md` | Ready-to-use AI coding prompt templates |
| `LINE_COFFEE_V2_EXECUTION_PLAN.md` | 18-phase implementation roadmap (V2 reference) |
| `LINE_COFFEE_V2_CURRENT_STATE_AUDIT.md` | Repo audit: existing routes, what's missing |
| `LINE_COFFEE_V2_BUILD_BLUEPRINT_FROM_OLD_UI.md` | Visual rebuild guide from old UI |
| `LINE_COFFEE_V2_PROJECT_INDEX.md` | Document index and reading order |
| `LINE_COFFEE_V2_LAUNCH_CHECKLIST.md` | Pre-launch checklist |
| `Pasted markdown.md` | Detailed old UI description in Arabic — every page, component, animation, CSS class |
| `Customer Matching Rule.md` | Customer deduplication logic |
| `CLAUDE.md` (project) | Locked design system, file structure, critical rules, change log |
| Memory: `project_master_spec.md` | V3 Visual Lab vision, pages, design rules, anti-patterns |

---

## 3. Current Locked Decisions

These decisions are final and must not be revisited without explicit user approval.

### 3.1 Visual Direction (Locked)
- Dark cinematic luxury — warm black/brown/copper
- `.cinematic-section` stacked-card effect (border-radius 22px/32px, negative margin-top, gold box-shadow) — do not alter
- No gradient bridges between sections
- No smoke/fog overlays
- No excessive shimmer on large headings
- No trust strips
- No section-blend class
- `cinematic-section::before` gold line divider — do not suppress

### 3.2 Typography (Locked)
| Role | Font | Weight |
|---|---|---|
| EN Display (h1–h3) | Playfair Display | 400–700 |
| EN Body/UI | System sans-serif / Cairo | 400–500 |
| AR Display (h1–h6) | ArabicTestAligarh | varies |
| AR Body (cards, buttons, small text) | ArabicTestAligarh | varies |
| AR Numbers | ArabicTestAligarh | varies |
| Symbols / units / currency / technical Latin | numeric-symbol safe font (system fallback) | — |
| AR UI (nav, inputs) | Cairo | 400–500 |
| AR Section headings | Tajawal | 700–800 |

> **Note:** ArabicTestAligarh is the confirmed font for all Arabic display and body roles. ArabicTestTinta was tested and **rejected visually** — do not use it in any future implementation. The typography decision is locked; no further approval gate is pending.

### 3.3 Color Tokens (Locked — `globals.css` `:root`)
```
--coffee-black:   #0b0806
--coffee-deep:    #120d09
--coffee-dark:    #15100b
--coffee-surface: #1b140f
--gold:           #b6885e
--gold-light:     #d6a373
--cream:          #f5e6d8
--cream-muted:    #d6b79a
--cream-dim:      #b79b85
--ease-luxury:    cubic-bezier(0.22, 1, 0.36, 1)
```

### 3.4 Animation Rules (Locked)
- No `transform: translateY()` via JS scroll handler — causes compositor jitter
- No `position: sticky` with JS-driven opacity on hero
- Scroll reveal: IntersectionObserver + CSS class toggle only
- Hero slide transitions: CSS-only opacity crossfade
- All `aria-hidden` must use string `"true"`, never boolean expression

### 3.5 Product Catalog (Locked)

**9 Categories:**
1. Turkish Blends — صح القهوة
2. Espresso Blends — اسبريسو
3. Easy Coffee — قهوة سهلة
4. Flavor Coffee — قهوة بالنكهات
5. Coffee Mix — كوفي ميكس
6. Cappuccino — كابتشينو
7. Hot Chocolate — شوكولاتة ساخنة
8. Make Your Espresso — كوّن اسبريسو
9. Make Your Flavor — كوّن نكهتك

**Products per category (confirmed):**
- Turkish Blends: Turkish Silk, Strike Coffee, Cairo Nights, High Mood
- Espresso Blends: HEAVY CREMA, AROMA BODY, HEADSHOT, BLACK LABEL
- Easy Coffee: Classic Line, Gold Line
- Flavor Coffee: فرنساوي / أوريجينال (Original LINE) — standalone products, NOT inside Make Your Flavor builder
- سحلب: REMOVED from all lists permanently
- Make Your Flavor bases: Turkish Coffee, Coffee Mix, Cappuccino, Hot Chocolate

**Make Your Flavor — Final Approved Flavor Catalog (30 flavors):**

Sweets (حلويات):
- شوكولاتة قطع، شوكولاتة، كراميل، فانيلا، لوتس، أوريو، كرز

Nuts (مكسرات):
- بندق قطع، بندق، لوز، فستق

Fruits (فواكه):
- فراولة، موز، تفاح، أناناس، جوافة، مانجو، برتقال، كيوي

Special Order (طلب خاص):
- جوز الهند، موكا، بينا كولادا، شيشة تفاح، شيشة عنب، هوت سيدر

### 3.6 Architecture Rules (Locked)
- Framework: Next.js 15 App Router
- All sections: `"use client"` (hooks used)
- Static mock data only in `src/lib/mock-data/`
- No Supabase, no API routes for data
- Tailwind CSS v4 — `@theme inline` in `globals.css` only (no `tailwind.config.js`)

---

## 4. Full Sitemap Table

| Route | Page Name (EN) | Page Name (AR) | Priority | Phase |
|---|---|---|---|---|
| `/` | Homepage | الرئيسية | ✅ Done | — |
| `/products` | All Products | جميع المنتجات | 🔴 Next | Phase 1 |
| `/products/category/[slug]` | Category Page | صفحة التصنيف | 🔴 Next | Phase 1 |
| `/products/[slug]` | Product Detail | تفاصيل المنتج | 🔴 Next | Phase 1 |
| `/make-your-espresso` | Make Your Espresso | كوّن اسبريسو | 🟡 Phase 2 | Phase 2 |
| `/make-your-flavor` | Make Your Flavor | كوّن نكهتك | 🟡 Phase 2 | Phase 2 |
| `/cart` | Cart | العربة | 🟡 Phase 2 | Phase 2 |
| `/checkout` | Checkout | الدفع | 🟠 Phase 3 | Phase 3 |
| `/order-success` | Order Success | تم الطلب | 🟠 Phase 3 | Phase 3 |
| `/about` | About Line | عن لاين | 🟢 Phase 4 | Phase 4 |
| `/blog` | Journal / Blog | المجلة | 🟢 Phase 4 | Phase 4 |
| `/blog/[slug]` | Blog Post | مقالة | 🟢 Phase 4 | Phase 4 |
| `/contact` | Contact | تواصل معنا | 🟢 Phase 4 | Phase 4 |
| `/privacy` | Privacy Policy | سياسة الخصوصية | 🔵 Phase 5 | Phase 5 |
| `/terms` | Terms of Service | الشروط والأحكام | 🔵 Phase 5 | Phase 5 |
| `/shipping` | Shipping Policy | سياسة الشحن | 🔵 Phase 5 | Phase 5 |
| `/returns` | Returns Policy | سياسة الإرجاع | 🔵 Phase 5 | Phase 5 |
| `/account/profile` | Profile Settings | إعدادات الملف | 🔵 Phase 5 | Phase 5 |
| `/account/orders` | My Orders | طلباتي | 🔵 Phase 5 | Phase 5 |
| `/account/addresses` | Saved Addresses | عناويني | 🔵 Phase 5 | Phase 5 |
| `/account/wishlist` | Wishlist | قائمة الرغبات | 🔵 Phase 5 | Phase 5 |
| `/account/settings` | Account Settings | إعدادات الحساب | 🔵 Phase 5 | Phase 5 |
| `/auth/login` | Login | تسجيل الدخول | 🔵 Phase 5 | Phase 5 |
| `/auth/signup` | Sign Up | إنشاء حساب | 🔵 Phase 5 | Phase 5 |
| `/auth/forgot-password` | Forgot Password | نسيت كلمة المرور | 🔵 Phase 5 | Phase 5 |
| `/auth/reset-password` | Reset Password | إعادة تعيين كلمة المرور | 🔵 Phase 5 | Phase 5 |
| `/dashboard/*` | Dashboard | لوحة التحكم | ⛔ Deferred | Last |
| `/media-studio/*` | Media Studio | استوديو الميديا | ⛔ Deferred | Last |

---

## 5. Page-by-Page Visual Blueprints

### 5.1 `/products` — All Products Page

**Purpose:** Entry point to the full catalog. Browse all 9 categories, filter/sort, see product grid.

**Layout Structure:**
```
[PublicHeader — fixed, glass]
[Page Hero — short, cinematic]
  "تصفح قهوتك / Browse Your Coffee"
  Subtitle: "9 تصنيف — أكثر من 20 منتج"
[Filter & Sort Bar — sticky below header]
  Category pills (horizontal scroll on mobile)
  Sort dropdown: الأحدث / الأكثر مبيعاً / السعر
[Product Grid — 2 cols mobile / 3 cols tablet / 4 cols desktop]
  ProductCard × N
[Empty State — if filtered to 0]
[PublicFooter]
```

**Visual Details:**
- Page hero: `min-height: 220px`, same dark background, gold `<h1>`, cream subtitle
- Filter bar: `background: var(--coffee-surface)`, `border-bottom: 1px solid rgba(182,136,94,0.15)`, sticky `top: 72px` (below header)
- Category pills: rounded full, gold-outlined inactive, gold-filled active
- Product grid: gap 20px mobile, 28px desktop; no border between cards
- ProductCard: dark surface bg (`--coffee-surface`), product image top (1:1 or 4:5 ratio), name + category label + price + "أضف للعربة" button
- Scroll reveal: cards animate in staggered as user scrolls (`[data-reveal]` + IntersectionObserver)

**Bilingual copy:**
- Heading EN: "Browse Our Coffee" / AR: "تصفح قهوتنا"
- Filter label EN: "Filter" / AR: "تصفية"
- Sort label EN: "Sort by" / AR: "ترتيب حسب"

---

### 5.2 `/products/category/[slug]` — Category Page

**Purpose:** Show all products in one category. Hero specific to that category.

**Layout Structure:**
```
[PublicHeader]
[Category Hero — tall, full-bleed image or video bg]
  Category name large (AR + EN)
  Description tagline
  Breadcrumb: الرئيسية > المنتجات > [تصنيف]
[Category About Strip — optional 1–2 sentence copy about this category]
[Product Grid]
  ProductCard × (products in category)
[Related Categories — horizontal scroll]
[PublicFooter]
```

**Visual Details:**
- Category hero: `min-height: 360px mobile / 480px desktop`, background = category image (with dark overlay gradient `linear-gradient(to bottom, rgba(11,8,6,0.3) 0%, rgba(11,8,6,0.85) 100%)`)
- Category name: large Playfair/Tajawal, gold color, centered
- About strip: `--coffee-surface` bg, left-aligned in EN / right-aligned in AR, cream text, 1px gold top border
- Related categories: same marquee card style as homepage CategoriesSection (no animation, simple horizontal scroll)

---

### 5.3 `/products/[slug]` — Product Detail Page

**Purpose:** Deep product page. Full info, size/grind options, quantity, add to cart, description, related products.

**Layout Structure:**
```
[PublicHeader]
[Breadcrumb]
[Product Hero — 2-column on desktop, stacked on mobile]
  LEFT: Product Image Gallery (main image + thumbnail strip)
  RIGHT: Product Info Panel
    - Badge: NEW / BESTSELLER / etc.
    - Product name (AR large / EN small)
    - Price (gold, large)
    - Short description
    - Size selector (if applicable): 250g / 500g / 1kg
    - Grind selector (if applicable): حبة / مطحون ناعم / مطحون متوسط / مطحون خشن
    - Quantity stepper: [−] [1] [+]
    - [أضف للعربة] — premium-button full-width
    - [أضف للمفضلة] — ghost icon button
    - WhatsApp order shortcut: small link "طلب عبر واتساب"
[Product Details Tabs]
  وصف المنتج | المكونات | طريقة التحضير
[Related Products — horizontal scroll]
[PublicFooter]
```

**Visual Details:**
- Product image: rounded `12px`, full-width on mobile; `max-width: 520px` on desktop
- Thumbnail strip: 4 thumbnails below, 60×60px, gold border on active
- Price: `--gold-light` color, `font-size: 2rem`, Playfair/Tajawal
- Size/grind selectors: pill buttons — outlined cream inactive, gold-filled active
- Quantity stepper: minimal — gold `−`/`+` buttons, cream number in center
- Tabs: underline style, gold active underline
- Related products: same ProductCard component, horizontal scroll with `overflow-x: auto`

---

### 5.4 `/make-your-espresso` — Custom Espresso Builder

**Purpose:** Step-by-step espresso builder. User selects base, roast level, intensity, grind, size.

_(See Section 7 for deep detail)_

---

### 5.5 `/make-your-flavor` — Custom Flavor Builder

**Purpose:** Step-by-step flavored coffee builder. User selects base, flavor group, specific flavors, size, sweetness.

_(See Section 7 for deep detail)_

---

### 5.6 `/cart` — Shopping Cart

**Purpose:** Review items before checkout.

**Layout Structure:**
```
[PublicHeader]
[Page Title: "عربة التسوق / Your Cart"]
[2-column layout desktop / stacked mobile]
  LEFT (main): Cart Item List
    CartItemRow × N
      - Product thumbnail
      - Name + options (size, grind, flavors)
      - Unit price
      - Quantity stepper [−] [qty] [+]
      - Remove button (×)
    Empty state: "عربتك فارغة — ابدأ التسوق"
  RIGHT (sidebar): Order Summary
    Items subtotal
    Delivery estimate (static "يحدد عند الشحن")
    Promo code input + apply
    Total (gold, large)
    [متابعة للدفع] — premium-button
    [متابعة التسوق] — ghost link back to /products
[You May Also Like — 4 ProductCards]
[PublicFooter]
```

**Visual Details:**
- CartItemRow: `--coffee-surface` card, image 80×80px rounded, text right/left by lang
- Empty state: centered icon (cup outline), gold heading, cream subtitle, gold "تسوق الآن" CTA
- Order summary: sticky on desktop (`position: sticky; top: 90px`), dark surface card, gold border top
- Promo input: cream outlined input, gold "تطبيق" button inline
- Total row: larger font, gold-light color
- Delete animation: fade + slide out on remove

---

### 5.7 `/checkout` — Checkout Page

**Purpose:** Customer info, delivery address, payment method selection.

> **CONSTRAINT:** No backend implementation. UI-only for now. No Supabase binding. No payment gateway integration.

**Layout Structure:**
```
[PublicHeader — simplified, no cart icon, no nav links]
[Checkout Steps Indicator]
  1. البيانات الشخصية → 2. التوصيل → 3. الدفع
[2-column layout desktop / stacked mobile]
  LEFT (form): Multi-step form
    Step 1: Name, phone, email
    Step 2: Governorate selector, full address, landmark, delivery notes
    Step 3: Payment method cards
      - الدفع عند الاستلام (COD)
      - (Vodafone Cash — future)
      - (Credit Card — future, grayed out "قريباً")
  RIGHT (sidebar): Order Summary (compact, same as cart sidebar)
[متابعة] / [إتمام الطلب] — premium-button
[PublicFooter — minimal]
```

**Visual Details:**
- Steps indicator: gold numbered circles, connecting line, active = filled gold, completed = gold checkmark
- Form inputs: dark surface bg, cream border, gold focus ring, Cairo font
- Governorate selector: styled `<select>` or custom dropdown
- Payment cards: large click-target cards, radio inside, gold border when selected
- COD card: coin icon + "الدفع عند الاستلام" — enabled; others grayed with "قريباً" badge

---

### 5.8 `/order-success` — Order Confirmation

**Purpose:** Celebrate the completed order. Show order number, summary, next steps.

**Layout Structure:**
```
[PublicHeader — simplified]
[Success Hero — centered]
  Gold animated checkmark (CSS only)
  "تم استلام طلبك!" large heading
  "سنتواصل معك خلال 30 دقيقة لتأكيد الطلب"
  Order number: #LC-00123
[Order Summary Card]
  Items ordered (compact list)
  Delivery address
  Total paid
[Next Steps]
  "تابع طلبك عبر واتساب" — WhatsApp link
  "متابعة التسوق" — back to /products
[PublicFooter]
```

**Visual Details:**
- Checkmark: SVG with CSS `stroke-dasharray` / `stroke-dashoffset` animation on mount
- Order number: gold, large, Playfair
- Summary card: `--coffee-surface`, cream border
- WhatsApp button: green-tinted, WhatsApp icon + Arabic copy

---

### 5.9 `/about` — About Line Coffee

**Purpose:** Brand story, philosophy, team, sourcing.

**Layout Structure:**
```
[PublicHeader]
[About Hero — full-bleed, editorial]
  "نحن لاين" / "We Are Line"
  Cinematic background image (roasting/origin)
[Story Section — 2 col]
  Copy: brand founding story (Arabic primary)
  Image: founder portrait or roasting process
[Values Grid — 3 cards]
  الأصالة / الجودة / الاستدامة
[Origin Section]
  World map or coffee farm image
  Copy about Ethiopian/single-origin sourcing
[Team Section — optional for now, placeholder]
[CTA — "تسوق الآن"]
[PublicFooter]
```

**Visual Details:**
- About hero: min-height 500px, dark overlay on image, gold `<h1>` centered
- Story section: same visual feel as homepage StorySection — image left, text right (EN) / reversed (AR)
- Values cards: `--coffee-surface`, gold icon (SVG), heading, 2-line description, no CTA on cards
- All copy from V2 content blueprint `about` section

---

### 5.10 `/blog` — Journal / Blog Index

**Purpose:** Brand editorial content — coffee culture, brewing guides, origin stories.

**Layout Structure:**
```
[PublicHeader]
[Journal Hero]
  "المجلة / The Journal"
  Subtitle: "قصص القهوة وعالمها"
[Featured Post — large hero card]
  Image (2/3 width) + Title + Excerpt + Category tag + Read more
[Post Grid — 2 cols tablet, 3 cols desktop]
  BlogCard × N
[Load More — pagination or infinite scroll (deferred)]
[PublicFooter]
```

**Visual Details:**
- Journal hero: short (200px), gold heading, cream subtitle
- Featured post: `--coffee-surface` card, image 16:9 ratio, category tag in gold pill, title Playfair large, excerpt 2-line clamp, "اقرأ المزيد" ghost link
- BlogCard: same structure, smaller scale, staggered reveal animation
- Category tags available: التحضير / الأصول / ثقافة القهوة / وصفات

---

### 5.11 `/blog/[slug]` — Blog Post

**Purpose:** Individual article view.

**Layout Structure:**
```
[PublicHeader]
[Post Header]
  Category tag (gold pill)
  Title (large Playfair/Tajawal)
  Author + Date + Read time
  Hero image (full-width, 16:9)
[Post Body — 2-col desktop: content + sidebar]
  LEFT: Article content (styled prose)
    - h2/h3 in gold
    - Blockquotes: left gold border, italic cream
    - Images: rounded 12px, optional caption
  RIGHT: Sidebar
    - Table of contents (sticky)
    - Related articles (3 cards)
    - CTA: "تسوق قهوتنا"
[Post Footer]
  Tags
  Social share (WhatsApp, X, copy link)
  "مقالات قد تعجبك" — 3 BlogCards
[PublicFooter]
```

**Visual Details:**
- Prose styles: defined in globals.css under `.prose-coffee` or similar
- TOC sidebar: sticky, max-height viewport, scroll inside, gold active link
- Share buttons: ghost pills, icons + label

---

### 5.12 `/contact` — Contact Page

**Purpose:** Get in touch via form or social links.

**Layout Structure:**
```
[PublicHeader]
[Contact Hero — short]
  "تواصل معنا / Get in Touch"
[2-column layout desktop]
  LEFT: Contact Form
    Name, phone/email, subject, message
    [إرسال الرسالة] — premium-button
    (sends to static endpoint or WhatsApp prefill — no backend)
  RIGHT: Contact Info
    WhatsApp number (large, clickable)
    Email address
    Working hours
    Social links (Instagram, TikTok, Facebook)
    Location / city
[Map Section — optional, static image or iframe]
[PublicFooter]
```

> Note: Contact form in current phase = mock submit (console.log or mailto: href). No backend.

---

### 5.13 `/privacy`, `/terms`, `/shipping`, `/returns` — Legal Pages

**Purpose:** Static legal content pages. Four separate top-level routes.

**Routes:**
- `/privacy` — Privacy Policy / سياسة الخصوصية
- `/terms` — Terms of Service / الشروط والأحكام
- `/shipping` — Shipping Policy / سياسة الشحن
- `/returns` — Returns Policy / سياسة الإرجاع

**Layout Structure:**
```
[PublicHeader]
[Legal Hero — minimal, 150px]
  Page title
[Legal Content Container — max-width 800px, centered]
  Prose content
  Last updated date
[PublicFooter]
```

**Visual Details:**
- Cream body text on dark surface, `--coffee-surface` sidebar-style left panel for section navigation (desktop only)
- All four pages share the same layout component — only content changes

---

### 5.14 `/account/*` — Account Pages (Phase 5, Deferred)

These pages are planned but deferred until after the main public catalog is built. They require auth state.

**Pages:**
- `/account/profile` — Edit name, phone, email, password
- `/account/orders` — Order history list with status
- `/account/addresses` — Saved delivery addresses
- `/account/wishlist` — Saved products
- `/account/settings` — Notification preferences, language, delete account

**Visual pattern:** All account pages share a sidebar nav layout (desktop) / tab nav (mobile). Same dark cinematic background. No redesign from the public page aesthetic.

---

### 5.15 `/auth/*` — Auth Pages (Phase 5, Deferred)

- `/auth/login` — Email + password, or phone OTP (UI only for now)
- `/auth/signup` — Name, phone, email, password
- `/auth/forgot-password` — Phone or email input to trigger reset
- `/auth/reset-password` — New password entry (via reset link/token)

**Visual:** Centered card on dark full-page background. Gold heading. Cairo font for inputs. Same form styling as checkout.

---

## 6. Products Experience Phase — Deep Detail

### Phase Goal
Build the full product browsing and discovery experience before adding to cart. This is Phase 1 and the immediate next task after homepage typography approval.

### 6.1 Build Order Within This Phase

```
Step 1: /products                    — catalog grid with filter/sort
Step 2: /products/category/[slug]    — category page
Step 3: /products/[slug]             — product detail page
```

### 6.2 ProductCard Component Spec

Used across all product pages.

```
[ProductCard]
  - Root: dark surface bg (#1b140f), rounded-2xl, overflow-hidden, hover: slight gold border
  - Image: aspect-[4/5] or aspect-square, object-cover, slight scale on hover (CSS only)
  - Body: px-4 py-4
    - Category label: gold-light, text-xs, uppercase, letter-spacing
    - Product name AR: Tajawal/Cairo, text-lg, cream
    - Product name EN: small, cream-dim, text-sm
    - Price: gold-light, text-xl, font-semibold
    - "أضف للعربة" button: premium-button-sm variant (smaller than hero CTA)
  - Badges: absolute top-3 right-3 (EN) / left-3 (AR): "جديد" / "الأكثر مبيعاً"
```

### 6.3 CategoryCard Component Spec (for /products page hero/filter)

```
[CategoryCard — filter pill variant]
  - Pill: rounded-full, px-5 py-2
  - Inactive: border gold 1px, text cream-dim
  - Active: bg gold, text coffee-black
  - Hover: bg gold/20
```

### 6.4 Product Data Shape (Mock Only — No Supabase)

All product data lives in `src/lib/mock-data/`. Shape awareness (not implementation):

```ts
// Reference shape — for mock data files only
type Product = {
  id: string
  slug: string
  categorySlug: string
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  price: number  // base price in EGP
  images: string[]  // local /public paths
  badges: ('new' | 'bestseller' | 'limited')[]
  sizes?: { label: string; priceModifier: number }[]
  grindOptions?: string[]
  inStock: boolean
}
```

### 6.5 Filter & Sort State

Managed in local component state (`useState`). No URL params required for Phase 1.

```
activeCategory: string | null  (null = all)
sortBy: 'default' | 'price-asc' | 'price-desc' | 'popular'
```

### 6.6 Image Strategy

- Product images: `/public/images/products/[slug]-hero.jpg`, `/public/images/products/[slug]-thumb.jpg`
- Placeholders acceptable for Phase 1 (dark bg + gold product name text as fallback)
- Next.js `<Image>` with `priority` on above-fold cards

---

## 7. Custom Builders Phase — Deep Detail

### Phase Goal
Two interactive step-by-step builders for custom coffee orders. Phase 2, after Products Experience is built.

### 7.1 Make Your Espresso — `/make-your-espresso`

**User journey:**
```
Step 1: Choose Base Espresso
  → Grid of espresso base options with images + names
  → (HEAVY CREMA, AROMA BODY, HEADSHOT, BLACK LABEL)

Step 2: Choose Roast Level
  → 3 options: فاتح / متوسط / داكن (Light / Medium / Dark)
  → Visual: gradient bar with selector

Step 3: Choose Intensity
  → 3 options: خفيف / متوسط / قوي (Mild / Medium / Strong)

Step 4: Choose Grind
  → حبة / ناعم / متوسط / خشن (Whole / Fine / Medium / Coarse)

Step 5: Choose Size
  → 250g / 500g / 1kg — with price shown

Step 6: Review & Add to Cart
  → Summary card showing all choices
  → Price calculation
  → "أضف للعربة" CTA
```

**Visual Design:**
- Full-page builder with dark background
- Step indicator: linear stepper at top, gold active step, cream completed, gray upcoming
- Each step: full-screen feel — centered option grid, large click targets (min 120px tall cards)
- Selection: gold border + gold checkmark icon on selected card
- "السابق / التالي" (Prev / Next) navigation at bottom
- Progress bar: thin gold line below stepper, fills as steps complete
- Mobile: full-screen steps, swipe-capable (touch events optional in Phase 2)
- Review card: `--coffee-surface`, lists all choices in two-column (label + value), final price large gold

**Pricing logic (mock only):**
```
base price = selected size base price
roast: no modifier
intensity: no modifier
grind: no modifier
total = base price
```

### 7.2 Make Your Flavor — `/make-your-flavor`

**User journey:**
```
Step 1: Choose Base
  → 4 options: Turkish Coffee / Coffee Mix / Cappuccino / Hot Chocolate
  → Large image cards with Arabic name

Step 2: Choose Flavor Group
  → 4 groups: حلويات / مكسرات / فواكه / طلب خاص
  → Icon + label cards

Step 3: Choose Flavors
  → Grid of flavors from selected group
  → Multi-select allowed (up to 3 flavors)
  → Shows flavor name in Arabic + small flavor icon

Step 4: Choose Sweetness
  → Slider or pill selector: بدون / خفيف / متوسط / سكر زيادة

Step 5: Choose Size
  → Same size selector as Espresso builder

Step 6: Notes (optional)
  → Short text area: "ملاحظات خاصة..."

Step 7: Review & Add to Cart
  → Summary card: base + flavors + sweetness + size + notes + price
```

**Visual Design:**
- Same step-by-step structure as Make Your Espresso builder
- Flavor group icons: custom SVG or emoji-style icons (nut, fruit, sweet, star)
- Multi-select flavor chips: pill buttons, gold when selected, stacked grid
- Sweetness: 5-point pill selector (not a range input — pill buttons are more premium feel)
- Notes textarea: minimal — dark bg, cream placeholder, no border unless focused
- Price display: updates live as user changes size selection

**Flavor Catalog (final approved — 30 flavors):**
```
Sweets:  شوكولاتة قطع, شوكولاتة, كراميل, فانيلا, لوتس, أوريو, كرز
Nuts:    بندق قطع, بندق, لوز, فستق
Fruits:  فراولة, موز, تفاح, أناناس, جوافة, مانجو, برتقال, كيوي
Special: جوز الهند, موكا, بينا كولادا, شيشة تفاح, شيشة عنب, هوت سيدر
```

Note: سحلب permanently removed from all lists. فرنساوي / أوريجينال are standalone Flavor Coffee products — not available as flavors inside this builder.

### 7.3 Cart Integration

Both builders add a `CustomItem` to the cart with:
```ts
type CustomItem = {
  type: 'make-your-espresso' | 'make-your-flavor'
  label: { en: string; ar: string }  // auto-generated summary
  options: Record<string, string>    // all selected options
  size: string
  price: number
  quantity: number
}
```

The cart renders custom items differently from regular product items — shows the options summary below the name.

---

## 8. Component Inventory

All components to be built for the public website (excluding homepage sections already built).

| # | Component | Used On | Priority |
|---|---|---|---|
| 1 | `ProductCard` | /products, /products/category/[slug], /products/[slug] related | Phase 1 |
| 2 | `ProductGrid` | /products, /products/category/[slug] | Phase 1 |
| 3 | `CategoryPill` | /products filter bar | Phase 1 |
| 4 | `FilterSortBar` | /products | Phase 1 |
| 5 | `ProductHero` | /products/category/[slug] | Phase 1 |
| 6 | `ProductImageGallery` | /products/[slug] | Phase 1 |
| 7 | `ProductInfoPanel` | /products/[slug] | Phase 1 |
| 8 | `SizeSelector` | Product detail, builders | Phase 1 |
| 9 | `GrindSelector` | Product detail, espresso builder | Phase 1 |
| 10 | `QuantityStepper` | Product detail, cart | Phase 1–2 |
| 11 | `ProductTabs` | Product detail | Phase 1 |
| 12 | `BuilderStepper` | Both builder pages | Phase 2 |
| 13 | `BuilderStep` | Both builder pages | Phase 2 |
| 14 | `FlavorChipGrid` | Make Your Flavor | Phase 2 |
| 15 | `BuilderReview` | Both builder pages | Phase 2 |
| 16 | `CartItemRow` | /cart | Phase 2 |
| 17 | `CartSummaryPanel` | /cart, /checkout | Phase 2 |
| 18 | `PromoCodeInput` | /cart | Phase 2 |
| 19 | `CheckoutSteps` | /checkout | Phase 3 |
| 20 | `CheckoutForm` | /checkout | Phase 3 |
| 21 | `PaymentMethodCard` | /checkout | Phase 3 |
| 22 | `OrderSuccessHero` | /order-success | Phase 3 |
| 23 | `BlogCard` | /blog, /blog/[slug] | Phase 4 |
| 24 | `BlogPostBody` | /blog/[slug] | Phase 4 |
| 25 | `TableOfContents` | /blog/[slug] | Phase 4 |
| 26 | `ContactForm` | /contact | Phase 4 |
| 27 | `LegalProse` | /privacy, /terms, /shipping, /returns | Phase 5 |
| 28 | `AccountSidebarNav` | /account/* | Phase 5 |
| 29 | `AuthCard` | /auth/* | Phase 5 |
| 30 | `PageHero` | Multiple pages | Phase 1 (shared) |
| 31 | `Breadcrumb` | Category + product detail | Phase 1 |
| 32 | `EmptyState` | Cart empty, 0 results | Phase 1–2 |
| 33 | `SectionHeading` | Already exists (homepage) | Reuse |
| 34 | `PremiumButton` | Already exists (globals.css) | Reuse |

---

## 9. Visual Rules System

These rules govern all pages built after the homepage. They encode the V3 design direction and must not be violated.

### 9.1 Background & Surface Rules
- **Page background:** always `var(--coffee-black)` (`#0b0806`) — never pure `#000` or any non-token color
- **Card/panel surfaces:** `var(--coffee-surface)` (`#1b140f`)
- **Elevated surfaces (dropdowns, modals):** `var(--coffee-deep)` (`#120d09`) or `var(--coffee-dark)` (`#15100b`)
- **No white backgrounds anywhere** — this is a dark-only brand

### 9.2 Border & Divider Rules
- **Card borders:** `1px solid rgba(182,136,94,0.12)` at rest → `rgba(182,136,94,0.35)` on hover/active
- **Section dividers:** use `cinematic-section::before` (gold line) — do not add additional `<hr>` or `<div>` dividers
- **Input borders:** `1px solid var(--cream-dim)` at rest → `1px solid var(--gold)` on focus
- **No `border-radius` larger than `16px` on cards** (exception: pill buttons use `rounded-full`)

### 9.3 Typography Rules
| Use | Font | Size | Weight | Color |
|---|---|---|---|---|
| Page `<h1>` | Playfair Display (EN) / Tajawal (AR) | 2.5–4rem | 700–800 | `--cream` |
| Section `<h2>` | Playfair Display (EN) / Tajawal (AR) | 1.75–2.5rem | 700 | `--cream` |
| Card title | Playfair (EN) / Cairo (AR) | 1–1.25rem | 600 | `--cream` |
| Body copy | System-ui (EN) / Cairo (AR) | 0.875–1rem | 400 | `--cream-muted` |
| Labels/captions | System-ui (EN) / Cairo (AR) | 0.75rem | 400 | `--cream-dim` |
| Prices | Playfair (EN) / Tajawal (AR) | 1.25–2rem | 600–700 | `--gold-light` |
| Category tags | Cairo (both) | 0.7rem | 500 | `--gold-light` |
| CTA buttons | Cairo (AR) / System (EN) | 0.875rem | 600 | `--coffee-black` on gold |

### 9.4 Color Usage Rules
- **Gold (`--gold`, `--gold-light`):** CTAs, prices, active states, headings accent, icon strokes — sparingly
- **Cream (`--cream`, `--cream-muted`, `--cream-dim`):** All body text, three tiers by importance
- **Never use pure `#ffffff`** — always one of the cream tokens
- **Never use `--gold` as a background** except on primary CTA buttons
- **Accent use maximum:** 20% of any card's visual space should be gold-toned

### 9.5 Spacing Rules
- Sections: `py-16 md:py-24` as baseline
- Card padding: `px-4 py-4` (compact) or `px-6 py-6` (generous) — never mix inconsistently
- Grid gaps: `gap-5 md:gap-7` for product grids
- Form row spacing: `space-y-4`
- Horizontal page padding: `px-4 sm:px-6 lg:px-8` (or Tailwind container with `mx-auto`)

### 9.6 Motion Rules
- **Easing:** always `var(--ease-luxury)` = `cubic-bezier(0.22, 1, 0.36, 1)`
- **Duration:** 300ms–500ms for transitions; 600ms–800ms for reveals
- **Scroll reveal:** IntersectionObserver + CSS class only — no JS scroll handlers updating transforms
- **Hover:** scale max `1.03` on images, never on cards (too jumpy); border/glow change is preferred
- **No shimmer on large headings** — shimmer only allowed on small decorative lines or button hover fill
- **Step transitions in builders:** CSS opacity + translateX (fixed direction) — not JS-driven

### 9.7 Responsive Rules
- **Mobile-first** always — design for 375px, scale up
- **Breakpoints:** Tailwind defaults (sm: 640, md: 768, lg: 1024, xl: 1280)
- **Product grid:** 2 cols mobile → 3 cols md → 4 cols lg
- **Text size:** never below `text-sm` (0.875rem) for readable body; never below `text-xs` (0.75rem) for anything
- **Touch targets:** min 44×44px for all interactive elements on mobile

### 9.8 RTL Rules
- Arabic: `dir="rtl"`, `lang="ar"` on root `<html>` — set by language context
- All flex/grid layouts must invert correctly using Tailwind's `rtl:` variant or logical properties
- Icons that imply direction (arrows, carets) must flip in RTL
- Form inputs: text-align follows direction
- Breadcrumb separator: flip in RTL
- No hardcoded `left`/`right` in custom CSS — use `start`/`end` or check RTL implications

---

## 10. Content & Media Requirements

### 10.1 Images Needed

| Content | Count | Format | Notes |
|---|---|---|---|
| Category hero images | 9 | 1200×600px min | One per category, dark-toned |
| Product hero shots | 20+ | 800×800px min | Square or portrait, on dark bg |
| Product detail alternates | 3–4 per product | 800×800px min | Same style |
| Make Your Espresso steps | 4–6 | 600×400px | Abstract/ingredient shots |
| Make Your Flavor bases | 4 | 600×600px | Cup shots for each base |
| About page hero | 1 | 1600×800px | Roasting/origin cinematic |
| About page story | 2–3 | 800×600px | Brand story images |
| Blog featured images | 5–10 | 1200×675px (16:9) | Coffee culture editorial |
| Contact page | 1 | 800×500px | Cafe/product atmosphere |

### 10.2 Bilingual Copy Needed (from V2 Content Blueprint)

| Page | Status |
|---|---|
| Homepage hero, stats | ✅ Done (in mock data) |
| Category descriptions | Available in V2 content blueprint |
| Product names + descriptions | Available in V2 content blueprint |
| Cart copy (empty state, labels) | Available in V2 content blueprint |
| Checkout copy | Available in V2 content blueprint |
| Order success | Available in V2 content blueprint |
| About page story | Needs to be written (Arabic primary) |
| Blog posts | Needs to be written |
| Legal pages | Needs to be written |
| Builder step labels/instructions | Needs to be written |

### 10.3 Icons Needed

- Cart icon (header) — already exists
- Category icons — 9 simple SVGs
- Flavor group icons — 4 SVGs (sweets, nuts, fruits, star/special)
- Payment method icons — COD coin, Vodafone Cash logo, card icon
- Social icons — WhatsApp, Instagram, TikTok, Facebook
- UI icons — search, close, chevron, check, minus, plus, heart (wishlist), share

All icons: outline style, gold stroke, consistent 24×24px viewBox.

---

## 11. Data Model Awareness (No Implementation)

This section documents the data shape the UI expects. No Supabase tables should be created. All data served from `src/lib/mock-data/*.ts` files.

### 11.1 Files to Create in `src/lib/mock-data/`

```
products.ts           — all products with full details
categories.ts         — 9 categories with metadata
espresso-builder.ts   — builder options (roasts, intensities, grinds, sizes)
flavor-builder.ts     — bases, flavor groups, flavors, sweetness options
blog-posts.ts         — 5–10 mock blog posts with content
```

### 11.2 Expected Shape Reference

```ts
// categories.ts
type Category = {
  slug: string
  name: LocalizedValue
  description: LocalizedValue
  image: string
  productCount: number
}

// products.ts
type Product = {
  id: string
  slug: string
  categorySlug: string
  name: LocalizedValue
  description: LocalizedValue
  shortDescription: LocalizedValue
  ingredients: LocalizedValue
  brewingNotes: LocalizedValue
  price: number
  images: string[]
  badges: ('new' | 'bestseller' | 'limited')[]
  sizes: { label: string; priceModifier: number }[]
  grindOptions?: LocalizedValue[]
  inStock: boolean
  featured: boolean
}

// blog-posts.ts
type BlogPost = {
  slug: string
  title: LocalizedValue
  excerpt: LocalizedValue
  content: LocalizedValue  // markdown
  category: string
  image: string
  author: string
  date: string
  readTime: number
}

// LocalizedValue (already defined in project)
type LocalizedValue = { en: string; ar: string }
```

### 11.3 Cart State

Cart is managed via React context or Zustand (local state, no server sync in current phase):

```ts
type CartItem = {
  id: string
  type: 'product' | 'make-your-espresso' | 'make-your-flavor'
  productId?: string
  name: LocalizedValue
  options?: Record<string, string>
  price: number
  quantity: number
  image?: string
}

type CartState = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}
```

---

## 12. Build Execution Plan — 9 Phases

### Phase 0 — Typography (COMPLETE)
**Status:** ✅ Locked. ArabicTestAligarh confirmed for all Arabic display and body roles. ArabicTestTinta rejected. No further gate.
**No blocker** — Phase 1 can begin.

---

### Phase 1 — Products Experience (NEXT after Phase 0)
**Goal:** Full product catalog browsable without any backend

**Tasks:**
1. Create `src/lib/mock-data/categories.ts` with all 9 categories
2. Create `src/lib/mock-data/products.ts` with all confirmed products
3. Build shared `PageHero` component
4. Build `Breadcrumb` component
5. Build `ProductCard` component
6. Build `ProductGrid` component
7. Build `FilterSortBar` with `CategoryPill`
8. Build `/products` page (app/products/page.tsx)
9. Build `/products/category/[slug]` page (app/products/category/[slug]/page.tsx)
10. Build `ProductImageGallery`, `SizeSelector`, `GrindSelector`, `ProductTabs`
11. Build `ProductInfoPanel`
12. Build `/products/[slug]` page (app/products/[slug]/page.tsx)

**Done when:** All products browsable, category filter works, product detail page shows full info

---

### Phase 2 — Cart + Custom Builders
**Goal:** Users can add products to cart and build custom orders

**Tasks:**
1. Create cart context (`src/lib/context/cart.tsx`)
2. Build `QuantityStepper` component
3. Build `CartItemRow`, `CartSummaryPanel`, `PromoCodeInput`
4. Build `/cart` page
5. Create `src/lib/mock-data/espresso-builder.ts` + `flavor-builder.ts`
6. Build `BuilderStepper`, `BuilderStep`, `BuilderReview`
7. Build `/make-your-espresso` page
8. Build `FlavorChipGrid`
9. Build `/make-your-flavor` page
10. Wire cart icon in header to cart page (count badge)

**Done when:** Full add-to-cart flow works for products + both builders; cart page shows all items

---

### Phase 3 — Checkout + Order Success
**Goal:** UI-only checkout flow (no payment gateway, no backend)

**Tasks:**
1. Build `CheckoutSteps` indicator
2. Build `CheckoutForm` (multi-step: personal → delivery → payment)
3. Build `PaymentMethodCard` (COD enabled, others disabled/grayed)
4. Build `/checkout` page (simplified header)
5. Build `OrderSuccessHero` (animated checkmark)
6. Build `/order-success` page

**Done when:** Checkout flow completes, success page shows with mock order number

---

### Phase 4 — Brand Pages
**Goal:** About, Blog, Contact pages complete

**Tasks:**
1. Write bilingual mock copy for About page
2. Build `/about` page
3. Create `src/lib/mock-data/blog-posts.ts` with 5–10 mock posts
4. Build `BlogCard` component
5. Build `/blog` page
6. Build `BlogPostBody`, `TableOfContents`
7. Build `/blog/[slug]` page
8. Build `ContactForm` (mailto: or WhatsApp prefill — no backend)
9. Build `/contact` page

**Done when:** All 4 brand pages live and bilingual

---

### Phase 5 — Legal + Account + Auth (UI only)
**Goal:** Remaining public pages exist as functional UI shells

**Tasks:**
1. Build `LegalProse` component
2. Build `/privacy`, `/terms`, `/shipping`, `/returns` pages
3. Build `AccountSidebarNav`
4. Build `/account/profile`, `/account/orders`, `/account/addresses`, `/account/wishlist`, `/account/settings` page shells
5. Build `AuthCard`
6. Build `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password` pages

**Done when:** All routes respond, all pages render with correct layout

---

### Phase 6 — Performance & SEO
**Tasks:**
1. Add `metadata` exports to all pages (Next.js App Router pattern)
2. Optimize all `<Image>` components (sizes, priority, placeholder)
3. Audit Core Web Vitals (LCP, CLS, FID)
4. Add `sitemap.ts` and `robots.ts`
5. Add Open Graph tags per page

---

### Phase 7 — Accessibility & QA
**Tasks:**
1. Keyboard navigation audit all interactive components
2. Screen reader pass (NVDA/VoiceOver)
3. Color contrast audit (gold on dark must pass AA)
4. RTL/LTR rendering QA on all pages
5. Mobile tap target audit
6. Cross-browser test (Chrome, Safari, Firefox)

---

### Phase 8 — Dashboard & Media Studio (DEFERRED)
Not in scope for current planning. Begins after all public pages are complete and approved.

---

### Phase 9 — Launch Prep
Based on `LINE_COFFEE_V2_LAUNCH_CHECKLIST.md`:
1. Replace all mock data with real content
2. Real product images
3. Real bilingual copy review
4. Connect to analytics (GA4 or Plausible)
5. Deploy to production (Vercel or custom)
6. DNS + domain setup
7. WhatsApp Business API (if used for orders)

---

## 13. Agent Prompts (Codex-Ready)

Use these prompts when delegating to an AI coding agent for each build step.

---

### Prompt 1 — Mock Data Files

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Tech: Next.js 15 App Router, TypeScript strict mode, Tailwind CSS v4.
All data is static — NO Supabase.

Create the following files in src/lib/mock-data/:

1. categories.ts — export a `categories` array of 9 coffee categories:
   Slugs: turkish-blends, espresso-blends, easy-coffee, flavor-coffee,
   coffee-mix, cappuccino, hot-chocolate, make-your-espresso, make-your-flavor
   Each has: slug, name {en, ar}, description {en, ar}, image (string placeholder path), productCount

2. products.ts — export a `products` array with all confirmed products.
   Turkish Blends: turkish-silk, strike-coffee, cairo-nights, high-mood
   Espresso Blends: heavy-crema, aroma-body, headshot, black-label
   Easy Coffee: classic-line, gold-line
   Flavor Coffee: french-coffee (standalone)
   Each has: id, slug, categorySlug, name {en,ar}, description {en,ar},
   price (EGP number), images (["/images/products/placeholder.jpg"]),
   badges, sizes [{label:"250g", priceModifier:0}, {label:"500g", priceModifier:50}, {label:"1kg", priceModifier:120}],
   grindOptions [{en:"Whole Bean",ar:"حبة"}, ...], inStock:true, featured:bool

Do NOT bind to Supabase. Do NOT add API routes. Type definitions at top of each file.
```

---

### Prompt 2 — ProductCard Component

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Tech: Next.js 15 App Router, TypeScript strict, Tailwind CSS v4.
Design: dark cinematic luxury. Tokens in src/app/globals.css (:root vars).
Bilingual: useLanguage() hook in src/lib/context/language.tsx returns {lang, dir, t}.

Create src/components/ui/ProductCard.tsx:
- "use client"
- Props: product (Product type from mock-data/products.ts), className?: string
- Dark surface card: bg [var(--coffee-surface)], rounded-2xl, overflow-hidden
- Image: Next.js <Image>, aspect-[4/5], object-cover. Slight scale on hover (CSS transition).
- Body: px-4 py-4
  - Category badge: gold-light text, text-xs, uppercase, tracking-wider
  - Name: t(product.name), Tajawal/Cairo Arabic or Playfair English by dir, text-lg, cream
  - Price: gold-light, text-xl, font-semibold. Format: "٢٥٠ ج.م" (AR) / "250 EGP" (EN)
  - "أضف للعربة" / "Add to Cart" button: small variant of premium-button class
- Badges: absolute top-3, right-3 (ltr) / left-3 (rtl): gold pill with label
- Hover state: gold border rgba(182,136,94,0.35) — CSS only, no JS
- All aria-hidden must be string "true" not boolean
- No comments unless non-obvious
```

---

### Prompt 3 — Products List Page

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Create src/app/products/page.tsx — the main product catalog.
"use client" — uses filter state.

Layout:
1. PageHero: min-height 220px, gold h1 "تصفح قهوتنا" / "Browse Our Coffee", cream subtitle
2. FilterSortBar: sticky top-[72px], bg var(--coffee-surface), border-bottom gold 1px rgba
   - Category pills: horizontal scroll, 9 categories + "الكل/All"
   - Sort dropdown: الأكثر مبيعاً, السعر ↑, السعر ↓, الأحدث
3. Product grid: 2 cols mobile / 3 cols md / 4 cols lg, gap-5 md:gap-7, px-4 container
4. Each card: <ProductCard /> component
5. Empty state if no results: centered cup icon, gold heading, cream subtitle, back-to-all link

State: activeCategory (string|null), sortBy string — local useState only
Filter logic: client-side JS filter on imported mock products array
No server components needed for data (all client-side from mock import)

Use design tokens from globals.css. No new CSS — only Tailwind classes + existing token vars.
```

---

### Prompt 4 — Product Detail Page

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Create src/app/products/[slug]/page.tsx — the product detail page.

Layout (desktop: 2-col, mobile: stacked):
LEFT (60%): ProductImageGallery
  - Main image: Next.js <Image>, rounded-xl, aspect-[4/5], bg coffee-surface
  - Thumbnail strip: 4 small images, 64×64px, gold border on active, click to switch

RIGHT (40%): ProductInfoPanel
  - Breadcrumb: الرئيسية > المنتجات > [category] > [product]
  - Badges (if any)
  - Product name large (AR: ArabicTestAligarh / EN: Playfair 700), cream, t(product.name)
  - Price: gold-light, 2rem, Playfair/ArabicTestAligarh
  - Short description: t(product.shortDescription), cream-muted, text-sm
  - SizeSelector: pill buttons (250g, 500g, 1kg with prices). Active: gold bg.
  - GrindSelector (if grindOptions exists): same pill buttons
  - QuantityStepper: gold − and + buttons, cream number, min 1
  - "أضف للعربة" premium-button, full width
  - "أضف للمفضلة" ghost icon button (heart)
  - WhatsApp shortcut: small link with WhatsApp icon

Below: ProductTabs (tabs: وصف | مكونات | طريقة التحضير)
Below: Related products horizontal scroll (same category, 4 cards max)

Data: import products array from src/lib/mock-data/products.ts
Find by params.slug. If not found, notFound().
Page is static-friendly (no useEffect for data — all from import).
```

---

### Prompt 5 — Cart Context + Cart Page

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
No Supabase. Cart is local state only.

1. Create src/lib/context/cart.tsx:
   - CartItem type: {id, type, productId?, name:{en,ar}, options?, price, quantity, image?}
   - CartContext with: items, addItem, removeItem, updateQuantity, clearCart, total, itemCount
   - Persist to localStorage (useEffect)
   - CartProvider wraps children, export useCart hook

2. Add <CartProvider> to src/app/layout.tsx (wrap around content)

3. Create src/app/cart/page.tsx:
   "use client"
   - 2-col desktop (cart items LEFT, summary RIGHT), stacked mobile
   - CartItemRow: thumbnail 80×80, name, options summary, unit price, QuantityStepper, remove ×
   - CartSummaryPanel: item count, subtotal, "delivery TBD" note, promo code input, total (gold), checkout CTA
   - Empty state: centered, gold heading "عربتك فارغة", cream subtitle, "تسوق الآن" CTA → /products
   - "قد يعجبك أيضاً" — 4 random ProductCards at bottom

Use design tokens. All aria-hidden as string. No backend calls.
```

---

### Prompt 6 — Make Your Flavor Builder

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Create src/app/make-your-flavor/page.tsx — a multi-step flavor coffee builder.
"use client"

Step structure (7 steps, one visible at a time):
1. Choose Base: 4 large image cards (Turkish Coffee / Coffee Mix / Cappuccino / Hot Chocolate)
2. Choose Flavor Group: 4 icon cards (Sweets/حلويات, Nuts/مكسرات, Fruits/فواكه, Special/طلب خاص)
3. Choose Flavors: grid of pills from selected group (multi-select up to 3). Arabic names:
   Sweets:  شوكولاتة قطع, شوكولاتة, كراميل, فانيلا, لوتس, أوريو, كرز
   Nuts:    بندق قطع, بندق, لوز, فستق
   Fruits:  فراولة, موز, تفاح, أناناس, جوافة, مانجو, برتقال, كيوي
   Special: جوز الهند, موكا, بينا كولادا, شيشة تفاح, شيشة عنب, هوت سيدر
4. Choose Sweetness: 5 pill options (بدون, خفيف, متوسط, سكر عادي, سكر زيادة)
5. Choose Size: 250g / 500g / 1kg with prices
6. Notes: optional textarea, maxLength 200, placeholder "ملاحظات خاصة..."
7. Review: summary card of all choices + price + "أضف للعربة" CTA

UI:
- Step indicator: gold numbered circles + connecting line at top
- Each step: centered content, generous padding, large click targets (min 56px height per option)
- Selection: gold border + gold checkmark on selected
- "التالي" / "السابق" navigation bottom — premium-button for next, ghost for back
- Progress: thin gold bar filling as steps advance
- CSS-only transitions between steps (opacity + translateX, not JS scroll)

State: local useState for selections object, currentStep number
On add to cart: dispatch to useCart() with type "make-your-flavor"
```

---

### Prompt 7 — About Page

```
You are working on Line Coffee V3 at d:\website\line-coffee-final.
Create src/app/about/page.tsx — the brand story page.
"use client" (uses useLanguage)

Layout:
1. About Hero (min-height: 480px):
   - Background: /public/images/about/hero.jpg with overlay gradient rgba(11,8,6,0.6)
   - Gold h1 large: "نحن لاين" (AR) / "We Are Line" (EN), centered
   - Cream subtitle: "قهوة مصرية متخصصة — بكل دقة وشغف"

2. Story Section (2-col desktop, stacked mobile):
   - Text side: Arabic-primary brand story paragraph (3–4 lines)
   - "نبدأ من الحبة، ونصل إليك بكل تفصيلة."
   - Image side: dark-toned coffee origin image
   - Text/image swap based on dir (RTL: image right, text left; LTR: image left, text right)

3. Values Grid (3 cards):
   - الأصالة — Authenticity — SVG leaf icon
   - الجودة — Quality — SVG checkmark icon
   - الاستدامة — Sustainability — SVG loop icon
   - Card: coffee-surface bg, gold icon, Tajawal heading, Cairo description

4. Origin Strip:
   - "مصدر حبوبنا" heading
   - Short copy about Ethiopian/arabica sourcing
   - Subtle background: world map image at 8% opacity

5. CTA: centered premium-button "تسوق الآن" → /products

Use design tokens. Bilingual with useLanguage(). No backend.
```

---

## 14. Next Recommended Step

### Immediate: Phase 1 — Products Experience

Typography is locked. No blocker. First build task is `/products` UI-only page.

**Step 1:** Run **Agent Prompt 1** (Mock Data Files) — create `categories.ts` and `products.ts` in `src/lib/mock-data/`.

**Step 2:** Run **Agent Prompt 2** (ProductCard Component) — the foundational product UI component used across all product pages.

**Step 3:** Run **Agent Prompt 3** (Products List Page) — `/products` catalog page with filter/sort.

**Step 4:** Build `/products/category/[slug]` — category page.

**Step 5:** Build `/products/[slug]` — product detail page.

**Estimated Phase 1 scope:** 3–5 sessions (depending on iteration on card design and filter UX).

---

### Phase Gate Checklist (before moving Phase 1 → Phase 2)

- [ ] `/products` renders all 9 categories + all 20+ products
- [ ] Category filter works client-side
- [ ] `/products/category/[slug]` renders category hero + filtered products
- [ ] `/products/[slug]` renders full product detail
- [ ] All pages bilingual (AR/EN toggle works)
- [ ] All pages mobile-responsive
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] Scroll reveal working on product cards

---

> **Remember:** No backend. No Supabase. No Dashboard. No Checkout backend logic.
> The only work in scope is visual UI — static data, client-side state, bilingual layout, dark cinematic design.

---

*Document version: 1.1 — Created 2026-06-16 / Patched 2026-06-16*
*Patch 1.1: Typography locked (ArabicTestAligarh confirmed, ArabicTestTinta rejected), product routes corrected to /products/category/[slug] + /products/[slug], legal routes flattened to /privacy /terms /shipping /returns, auth signup route corrected, account routes corrected, flavor catalog updated to final 30-flavor list.*
*Next review: After Phase 1 completion*
