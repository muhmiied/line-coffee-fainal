> Archived / historical. Current source of truth is `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.
> This audit described readiness before the Products phase and must not override current repo state.

# LINE COFFEE V3 — Products Phase Readiness Audit

> **Prepared by:** Claude Sonnet 4.6  
> **Date:** 2026-06-16  
> **Scope:** Pre-Products-Phase architecture, homepage, language/RTL, and gap analysis  
> **Constraint:** Audit only — no code changes

---

## 1. Executive Summary

The project is in a solid state. The homepage visual direction is locked, the language/RTL system is stable after the Session 3 polish, and the core component primitives (`SectionHeading`, `ProductCard`, `premium-button`, `cinematic-section`, `reveal-on-scroll`) are reusable.

There are **no blocking architectural flaws**. There are minor items that should be fixed in the first Products session rather than before it.

```
PRODUCTS_PHASE_READY = YES_WITH_MINOR_FIXES
```

**Fixes that should happen during (not before) the Products build:**

- Expand mock product data (`visual-content.ts` has only 4 products; needs 20+)
- Expand mock category data (`categories.ts` has only 5/9; `visual-content.ts` has 7/9)
- Correct footer route links (`/privacy-policy` → `/privacy`, `/terms-of-use` → `/terms`)
- Remove dead CSS in `globals.css` (announcement-marquee rules, unused skeleton classes)
- Establish `(public)` route group layout before the first route goes live

None of these require touching the homepage.

---

## 2. Files Inspected

| File/Path | Purpose | Finding | Action Needed |
|---|---|---|---|
| `src/app/layout.tsx` | Root layout, fonts, language provider | Clean. SSR lang cookie read. suppressHydrationWarning set. Blocking script in head. | None |
| `src/app/page.tsx` | Homepage entry | Minimal delegation to LineCoffeeHome. | None |
| `src/app/globals.css` | All design tokens + component CSS | Contains ~4 dead CSS class groups (announcement-marquee, hero-copy-placeholder, story-copy-shell, social-drift quirk). Core system is solid. | Remove dead CSS (P2, deferred) |
| `src/lib/context/language.tsx` | Language + direction context | Clean after Session 3 fix. Synchronous setLanguageState in useLayoutEffect. No flicker risk. | None |
| `src/components/layout/public/PublicHeader.tsx` | Fixed nav bar | Clean. Scroll progress, announcement fade, commerce popover all correct. RTL arrows on popover need checking later. | None |
| `src/components/layout/public/PublicFooter.tsx` | Footer | Routes `/privacy-policy` and `/terms-of-use` do not match master plan routes (`/privacy`, `/terms`). Will 404. | Fix route links |
| `src/components/ui/SectionHeading.tsx` | Reusable section heading | Clean. 3 align modes. Bilingual. | None — fully reusable |
| `src/components/product/ProductCard.tsx` | Product card (homepage and future pages) | Uses `VisualProduct` type from `@/types/homepage`. Functional and polished. Will be reused on product pages with same visual data shape. | Ensure new product mock data matches VisualProduct shape |
| `src/features/website/home/LineCoffeeHome.tsx` | Homepage composition | Minimal. Mounts scroll reveal hook + all sections. | None |
| `src/features/website/home/sections/HeroSection.tsx` | Hero carousel | Clean after polish. Count-up, RTL arrows, dot indicators all working. | None |
| `src/features/website/home/sections/CategoriesSection.tsx` | Category marquee | Clean. home-after-hero modifier correctly flushes to hero. | None |
| `src/features/website/home/sections/FeaturesSection.tsx` | Features grid | Clean. | None |
| `src/features/website/home/sections/StorySection.tsx` | Story section | Clean. | None |
| `src/features/website/home/sections/BestSellersSection.tsx` | Product marquee | Clean. Uses reveal=false correctly on marquee cards. | None |
| `src/features/website/home/sections/JournalSection.tsx` | Blog cards | Clean. | None |
| `src/features/website/home/sections/TestimonialsSection.tsx` | Review cards | Clean. | None |
| `src/features/website/home/sections/SocialGallerySection.tsx` | Instagram gallery marquee | Clean. | None |
| `src/features/website/home/sections/ContactSection.tsx` | Contact form + info | Clean. Mock submit state works. | None |
| `src/features/website/home/hooks/useLuxuryScrollReveal.ts` | IntersectionObserver scroll reveal | Clean. rootMargin -4%, threshold 0.06, language re-run, alreadyVisible check. | None |
| `src/lib/mock-data/visual-content.ts` | Homepage visual data | Only 4 products. 7/9 categories. Sufficient for homepage; insufficient for Products pages. | Expand mock products (P1) |
| `src/lib/mock-data/categories.ts` | Structured category mock data | 5/9 categories. Missing: Coffee Mix, Cappuccino, Hot Chocolate, Make Your Flavor. | Expand (P1) |
| `src/lib/mock-data/products.ts` | Structured product mock data | Only 2 stub products. Prices are `0`. Empty gallery. | Expand significantly (P1) |
| `src/lib/mock-data/types.ts` | ProductMock / CategoryMock types | `ProductMock` uses `name_ar`/`name_en` (BilingualFields pattern), not `LocalizedValue { en, ar }`. Different from `VisualProduct`. | Strategy decision needed (P1) |
| `src/types/homepage.ts` | VisualProduct + homepage content types | Clean and reusable for product pages if visual-content.ts is expanded. | None |
| `src/types/localization.ts` | BilingualFields utility types + helpers | Well-built. Ready for use in product pages. `getLocalizedField`, `getLocalizedText` available. | None |
| `src/lib/utils/cn.ts` | clsx + tailwind-merge | Standard. | None |
| `src/app/(public)/` | Public route group placeholder | `.gitkeep` only. No layout.tsx. No pages yet. | Create group layout before first Products route |
| `src/app/(dashboard)/` | Dashboard placeholder | `.gitkeep` only. Out of scope. | None |

---

## 3. Architecture Audit

| Area | Status | Notes | Recommended Action |
|---|---|---|---|
| Next.js App Router structure | ✅ OK | `(public)` and `(dashboard)` route groups exist. Page.tsx minimal. | Add `(public)/layout.tsx` before first new route |
| Language provider (SSR + client) | ✅ OK | Cookie read in layout.tsx. Blocking inline script prevents EN flash. useLayoutEffect synchronous state set. suppressHydrationWarning on html. | None |
| html dir/lang handling | ✅ OK | Set server-side from cookie, confirmed by inline script, and updated on client switch. All three layers consistent. | None |
| Typography variables | ✅ OK | `--font-playfair` (EN heading), `--font-cairo` (AR UI), `--font-tajawal` (AR display). CSS vars wired. `@theme inline` correct. | None |
| ArabicTestAligarh font loading | ⚠️ Warning | `@font-face` for ArabicTestTinta still loaded in globals.css. Body active var now also points to ArabicTestAligarh. TintaArabic font files are fetched on every page load even though they are unused for body text. | Remove ArabicTestTinta @font-face (P2) |
| Component structure | ✅ OK | `layout/public/`, `ui/`, `product/` folders are correctly separated. | None |
| Duplicate component risk | ✅ OK | No duplicates found. SectionHeading and ProductCard are single sources. | None |
| Dead homepage code | ⚠️ Warning | `globals.css` has unused `.announcement-marquee*` CSS (bar switched to fade cycle). Also `.hero-copy-placeholder` and `.story-copy-shell` not referenced in any component. | Remove dead CSS (P2) |
| Naming consistency | ✅ OK | PascalCase components, camelCase hooks, kebab-case files, consistent `Visual*` prefix for homepage types. | None |
| Two mock data shapes | ⚠️ Warning | `VisualProduct` (in `@/types/homepage.ts`) uses `{ en, ar }` inline objects and flat image strings. `ProductMock` (in `@/lib/mock-data/types.ts`) uses `name_ar`/`name_en` BilingualFields and MediaReferenceMock objects. ProductCard uses VisualProduct. For Products phase, continue using VisualProduct shape in visual-content.ts — do NOT use ProductMock for UI components until Supabase is wired. | Confirm strategy: expand visual-content.ts for Products pages (P1) |
| Route readiness | ⚠️ Warning | `(public)` route group has no layout.tsx. Products routes `/products`, `/products/category/[slug]`, `/products/[slug]` do not exist. Footer links use wrong legal route slugs. | Create group layout + correct footer routes (P1) |
| Build/lint state | ✅ OK | Per project log, last build passed lint and build with only non-fatal SWC native-binding warnings (irrelevant). | None |

---

## 4. Homepage Production Audit

| Section | Status | What Is Good | Issues Found | Must Fix Before Products? | Can Defer? |
|---|---|---|---|---|---|
| **HeroSection** | ✅ OK | Slideshow, count-up, RTL arrows, dot indicators, scroll cue all working. Stats bar responsive. | None critical. | No | Yes |
| **CategoriesSection** | ✅ OK | Marquee seamless in LTR and RTL. `home-after-hero` modifier makes it flush. SectionHeading with flush align + parent margin correct. | None. | No | Yes |
| **FeaturesSection** | ✅ OK | 4-card grid. `cinematic-section` stacked card. Reveal animation correct. | None. | No | Yes |
| **StorySection** | ✅ OK | 2-column layout. Image reveal-from-right. Stats panel RTL-aware. Value cards staggered. | None. | No | Yes |
| **BestSellersSection** | ✅ OK | Marquee with repetition factor 4. ProductCards with reveal=false (correct for marquee). Live vs duplicate aria split correct. | None. | No | Yes |
| **JournalSection** | ✅ OK | 3-column grid. Hover lift. Journal links go to `/blog/[slug]`. | Route `/blog/[slug]` will 404 until blog is built — acceptable for current phase. | No | Yes |
| **TestimonialsSection** | ✅ OK | 3-column card grid. Stagger children. `premium-info-card` hover. Star rating accessible. | Button links to `/reviews` (unbuilt) — acceptable. | No | Yes |
| **SocialGallerySection** | ✅ OK | Marquee clean. GalleryItem/GalleryItemDupe split correct. aria-hidden="true" string literal. | None. | No | Yes |
| **ContactSection** | ✅ OK | 2-column layout. Mock submit state. `line-input` CSS class for all inputs. Reveal animations on both columns. | None. | No | Yes |
| **PublicHeader** | ✅ OK | Announcement fade (3.8s). Scroll progress bar. Glass after 20px. Language toggle. Commerce popover (empty state). | Scroll progress bar hardcoded `top-[42px]` to match announcement bar height — brittle if bar height changes. | No | Yes |
| **PublicFooter** | ⚠️ Warning | Layout clean. Logo sized correctly. Social links. 4-column on desktop. | `/privacy-policy` → should be `/privacy`. `/terms-of-use` → should be `/terms`. Wrong routes will 404 when legal pages are built. | Yes, but only for legal routes | Fix when legal routes are built |

---

## 5. Language + RTL Audit

| Area | Status | Notes |
|---|---|---|
| `html lang` attribute | ✅ OK | Set server-side from cookie in layout.tsx. Updated by LanguageProvider useEffect. Inline blocking script pre-sets on initial load. |
| `html dir` attribute | ✅ OK | Same triple-layer system as lang. |
| Refresh flicker (language) | ✅ Resolved | useLayoutEffect + synchronous setLanguageState in LanguageProvider. suppressHydrationWarning on html. No flash observed. |
| Arabic typography (display) | ✅ OK | ArabicTestAligarh via `--font-arabic-display-active`. Applied via `.arabic-display` class. h1/h2 Tajawal fallback. |
| Arabic typography (body/UI) | ✅ OK | ArabicTestAligarh also used for body via `--font-arabic-body-active`. Cairo for UI elements (nav, inputs). |
| English typography | ✅ OK | Playfair Display for headings, system sans for body. |
| RTL arrows/icons | ✅ Resolved | All `ArrowRight` icons use `dir==="rtl" && "rotate-180"` pattern. Hero arrow container has explicit `dir="ltr"` to prevent flex reversal. |
| RTL marquee direction | ✅ Resolved | Marquee tracks have `direction: ltr` to force consistent DOM order. RTL animation uses `category-drift-rtl` (translateX(+50%)). Individual loop children restored to `direction: rtl` for card text. |
| Arabic card text alignment | ✅ OK | `.arabic-body` class on sections + `direction: rtl` restore on children handles alignment inside marquee. |
| `arabic-number` / `numeric-symbol` classes | ✅ OK | Clean isolation with `unicode-bidi: isolate` and `direction: ltr` to prevent price/weight text from inheriting RTL flow. |
| Remaining risks | ⚠️ Minor | Any new component added must use `t(localizedValue)` for text, `dir` for layout, and `rotate-180` for directional icons. Easy to miss on first implementation — review before each PR. |

---

## 6. Animation Audit

| Area | Status | Notes |
|---|---|---|
| `reveal-on-scroll` system | ✅ OK | IntersectionObserver in `useLuxuryScrollReveal`. rootMargin `-4%`, threshold `0.06`. Language change re-runs the observer. |
| Card initial visibility | ✅ OK | `alreadyVisible` check uses full `window.innerHeight` (not 0.94×). Cards already in viewport on load get `is-visible` immediately without waiting for scroll. |
| Card animation subtlety | ✅ OK | `translateY(14px)` + `scale(0.992)` + `660ms` — subtle and premium. Previous values (30px, 0.988, 780ms) were too heavy. |
| `reveal-from-right` | ✅ OK | `translateX(22px)` in LTR, `translateX(-22px)` in RTL. Correct. |
| Marquee (category/bestSellers/social) | ✅ OK | CSS-only infinite animations. Pause on hover. RTL uses separate keyframes. |
| Hero slideshow | ✅ OK | CSS opacity crossfade + scale. `hero-image-drift` 9s on active slide. `hero-copy-animate` stagger layers on slide change. |
| Hero count-up | ✅ OK | 36-frame ease-out quad interval. Runs on mount. No re-trigger on slide change. |
| Arabic/English animation parity | ✅ OK | No language-specific animation differences that could cause layout shifts. |
| Announcement bar | ✅ OK | CSS fade (opacity transition 300ms). Correct — not marquee. |
| Dead animation CSS | ⚠️ Warning | `@keyframes announcement-marquee` and `@keyframes announcement-marquee-rtl` in globals.css are orphaned. The bar was switched to a fade cycle — these keyframes are never used. Should be removed. |
| `luxury-settle` on card reveal | ✅ OK | `.reveal-on-scroll.is-visible.premium-image-card` plays a shadow settle animation on reveal. Matches visual expectations. |
| Items to remove later | The `hero-copy-placeholder` CSS block (skeleton loading) and `story-copy-shell` CSS block appear to be scaffolding remnants with no matching component usage. Safe to remove later. |

---

## 7. Component Readiness Table

| Component | Exists? | Reusable for Products? | Needs Changes? | Notes |
|---|---|---|---|---|
| **PublicHeader** | ✅ Yes | ✅ Yes — no changes needed | No | Fixed, glass-on-scroll, RTL-aware, commerce popover. |
| **PublicFooter** | ✅ Yes | ✅ Yes | Fix 2 route links | `/privacy-policy` → `/privacy`, `/terms-of-use` → `/terms` |
| **SectionHeading** | ✅ Yes | ✅ Yes — fully reusable | No | 3 align modes, bilingual, eyebrow + title. |
| **ProductCard** | ✅ Yes | ✅ Yes — with note | Ensure product data uses VisualProduct shape | Uses `VisualProduct` type. ProductMock shape is different. Decision: keep VisualProduct for UI, expand visual-content.ts. |
| **PageHero** | ❌ No | — | Must create | Needed for /products, /products/category/[slug], /products/[slug]. Short dark hero with h1 + subtitle. Reuse on all pages. |
| **Breadcrumb** | ❌ No | — | Must create | Needed for /products/category/[slug] and /products/[slug]. Simple: Home > Products > [Category] > [Product] |
| **ProductGrid** | ❌ No | — | Must create | Responsive grid: 2-col mobile / 3-col tablet / 4-col desktop. Gap + stagger reveal. |
| **FilterSortBar** | ❌ No | — | Must create | Sticky below header. Category pills + sort dropdown. |
| **CategoryPill** | ❌ No | — | Must create | Rounded pill, gold outlined inactive, gold filled active. Controlled component. |
| **ProductGallery** | ❌ No | — | Must create | Main image + thumbnail strip. For /products/[slug] only. |
| **PriceBlock** | ❌ No | — | Must create | Price display with currency label, size context, gold color. |
| **WeightSelector** | ❌ No | — | Must create | 250g / 500g / 1kg pill selector. Controlled. |
| **GrindSelector** | ❌ No | — | Must create | Grind option pills: حبة / مطحون ناعم / مطحون متوسط / مطحون خشن |
| **QuantitySelector** | ❌ No | — | Must create | [−] [qty] [+] stepper. Min 1. |
| **EmptyState** | ❌ No | — | Must create | For /products when filter returns 0. Coffee cup icon + gold heading + CTA. |
| **PremiumButton** | ✅ Yes (CSS class) | ✅ Yes | No | `.premium-button` + `.premium-button-outline` CSS classes in globals.css. Use as className. |
| **line-input** | ✅ Yes (CSS class) | ✅ Yes | No | `.line-input` CSS class. Already used in ContactSection. |
| **luxury-panel** | ✅ Yes (CSS class) | ✅ Yes | No | `.luxury-panel` CSS class for glass panels. |
| **useLuxuryScrollReveal** | ✅ Yes | ✅ Yes | No | Hook. Mount on any page-level client component that has [data-reveal] elements. |
| **useLanguage** | ✅ Yes | ✅ Yes | No | Fully stable after Session 3 fixes. |
| **cn()** | ✅ Yes | ✅ Yes | No | `src/lib/utils/cn.ts` |

---

## 8. Products Phase Gap List

### Must Create Now (before /products page can render)

| Item | Type | Location |
|---|---|---|
| Expanded mock products (20+ products, all categories) | Mock data | `src/lib/mock-data/visual-content.ts` |
| All 9 categories in visual-content.ts | Mock data | `src/lib/mock-data/visual-content.ts` |
| `(public)/layout.tsx` | Route group layout | `src/app/(public)/layout.tsx` |
| `PageHero` component | Component | `src/components/ui/PageHero.tsx` |
| `Breadcrumb` component | Component | `src/components/ui/Breadcrumb.tsx` |
| `FilterSortBar` component | Component | `src/components/product/FilterSortBar.tsx` |
| `CategoryPill` component | Component | `src/components/ui/CategoryPill.tsx` |
| `ProductGrid` component | Component | `src/components/product/ProductGrid.tsx` |
| `EmptyState` component | Component | `src/components/ui/EmptyState.tsx` |
| `/products` page | Route | `src/app/(public)/products/page.tsx` |
| `/products/category/[slug]` page | Route | `src/app/(public)/products/category/[slug]/page.tsx` |
| `/products/[slug]` page | Route | `src/app/(public)/products/[slug]/page.tsx` |
| `ProductGallery` component | Component | `src/components/product/ProductGallery.tsx` |
| `PriceBlock` component | Component | `src/components/product/PriceBlock.tsx` |
| `WeightSelector` component | Component | `src/components/product/WeightSelector.tsx` |
| `GrindSelector` component | Component | `src/components/product/GrindSelector.tsx` |
| `QuantitySelector` component | Component | `src/components/product/QuantitySelector.tsx` |

### Can Reuse Now (no changes needed)

| Item | Location |
|---|---|
| `SectionHeading` | `src/components/ui/SectionHeading.tsx` |
| `ProductCard` | `src/components/product/ProductCard.tsx` |
| `PublicHeader` | `src/components/layout/public/PublicHeader.tsx` |
| `PublicFooter` | `src/components/layout/public/PublicFooter.tsx` |
| All CSS design tokens | `src/app/globals.css :root` |
| `.premium-button`, `.premium-button-outline` | `src/app/globals.css` |
| `.reveal-on-scroll`, `.reveal-from-right` | `src/app/globals.css` |
| `.luxury-card`, `.premium-image-card`, `.luxury-panel` | `src/app/globals.css` |
| `.premium-info-card` | `src/app/globals.css` |
| `.line-input` | `src/app/globals.css` |
| `useLuxuryScrollReveal` | `src/features/website/home/hooks/useLuxuryScrollReveal.ts` |
| `useLanguage` | `src/lib/context/language.tsx` |
| `cn()` | `src/lib/utils/cn.ts` |
| `LocalizedValue`, `LocalizedText`, helper functions | `src/types/localization.ts` |
| `mockCategories` (5 entries, partial) | `src/lib/mock-data/categories.ts` |

### Must NOT Touch Now

| Item | Reason |
|---|---|
| `src/features/website/home/**` | Homepage is locked. Do not edit sections. |
| `src/app/globals.css` cinematic-section block | Locked visual direction. |
| `src/app/globals.css` font-face declarations | Typography locked. |
| `src/lib/context/language.tsx` | Stable after Session 3 fix. No changes needed. |
| `src/app/layout.tsx` | Root layout. Only touch if a font must be added. |
| `src/lib/mock-data/products.ts` (`ProductMock` shape) | Use VisualProduct shape for Products UI. ProductMock is reserved for future Supabase integration. |

### Can Defer

| Item | Reason |
|---|---|
| Remove dead `.announcement-marquee*` CSS | Not blocking. Cleanup pass later. |
| Remove `ArabicTestTinta` @font-face | Minor — font file still loads but is unused. |
| Fix footer route links | Only matters when `/privacy` and `/terms` are built (Phase 5). |
| Remove `.hero-copy-placeholder`, `.story-copy-shell` CSS | Orphaned skeleton classes. Cleanup later. |
| Expand `src/lib/mock-data/categories.ts` to 9 categories | Only needed when `CategoryMock` type is used directly (not needed for Products UI). |

---

## 9. Recommended Products Phase File Structure

### Mock Data (expand first)

```
src/lib/mock-data/visual-content.ts   ← expand visualProducts (20+ products) and visualCategories (9 categories)
```

No new mock files needed for Phase 1. All visual data stays in visual-content.ts.

### Components (new files)

```
src/components/ui/
  PageHero.tsx           ← short cinematic hero for inner pages (title + subtitle + optional breadcrumb)
  Breadcrumb.tsx         ← simple breadcrumb: Home > Products > Category > Product
  CategoryPill.tsx       ← controlled pill: active/inactive, gold border
  EmptyState.tsx         ← zero-results state: icon + gold heading + CTA

src/components/product/
  ProductGrid.tsx        ← responsive grid with stagger reveal wrapper
  FilterSortBar.tsx      ← sticky filter + sort bar (category pills + sort dropdown)
  ProductGallery.tsx     ← main image + thumbnail strip for detail page
  PriceBlock.tsx         ← price + currency with size context
  WeightSelector.tsx     ← 250g / 500g / 1kg pill selector
  GrindSelector.tsx      ← grind option pills
  QuantitySelector.tsx   ← [−] [qty] [+] stepper
```

### Routes (new files, all inside `(public)`)

```
src/app/(public)/
  layout.tsx                                  ← minimal wrapper (no extra chrome, just children — header/footer already in root layout)

  products/
    page.tsx                                  ← /products — all products, filter/sort
    category/
      [slug]/
        page.tsx                              ← /products/category/[slug] — single category
    [slug]/
      page.tsx                                ← /products/[slug] — product detail
```

**Critical:** Do NOT use:
- `/products/[category]` — wrong pattern
- `/products/[category]/[slug]` — wrong nesting
- `/products/categories/[slug]` — wrong segment name

**Correct routes:**
- `/products`
- `/products/category/[slug]` (the word "category" is a literal segment)
- `/products/[slug]`

### (public) Route Group Layout

The `(public)/layout.tsx` should be nearly empty since the root layout already wraps everything with `PublicHeader` and `PublicFooter`. It exists only to allow future route-group-specific metadata, middleware, or suspense boundaries:

```tsx
// src/app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

## 10. Risks and Fixes Before Products

### P0 — Blocking for correct behavior

| Risk | Details | Fix |
|---|---|---|
| ProductCard type vs new pages | `ProductCard` uses `VisualProduct` type. New product pages must use the same shape — not `ProductMock`. If you accidentally import from products.ts and pass `ProductMock` objects, TypeScript will flag it but the data shape (flat image strings vs MediaReferenceMock objects, price strings vs price_egp numbers) will cause runtime issues. | **Decision:** Treat `ProductMock` as the DB-layer type only. For Products phase, expand `visualProducts` in `visual-content.ts` with all products — full names, real image paths, correct price strings, badge values. Never pass `ProductMock` directly to `ProductCard`. |
| No `(public)` layout | Without `src/app/(public)/layout.tsx`, Next.js may refuse to compile the route group or produce unexpected behavior. | **Create** the minimal layout file before adding any product routes. |

### P1 — Should fix in first Products session

| Risk | Details | Fix |
|---|---|---|
| Mock data insufficient | Only 4 products in `visualProducts`. Product pages need 20+ products across 9 categories. Without real-looking mock data, the grid, filter, and detail page all look broken. | Expand `visualProducts` and `visualCategories` in `visual-content.ts` as part of the /products task. |
| No real product images | Current product assets (`/assets/products/classic-pouch.png` etc.) are placeholder images, not the real Line Coffee product photography. Using them repeatedly for 20+ products will make the catalog look repetitive. | Reuse the 4 existing assets at first (different products can share images during mock phase). Add a TODO comment noting image replacement. |
| FilterSortBar language-aware state | The filter bar with category pills must correctly handle RTL pill layout (pills flow right-to-left in AR). | Use `dir` from `useLanguage()` in FilterSortBar and apply to the pill container. |
| Breadcrumb in RTL | Breadcrumb separators (>) must flip to (<) in RTL, and path order may need to read right-to-left. | Use `ChevronLeft` / `ChevronRight` conditioned on `dir`, or a CSS-mirrored separator. |

### P2 — Can defer to after Products

| Risk | Details | Fix |
|---|---|---|
| Footer links 404 | `/privacy-policy` and `/terms-of-use` go nowhere. | Fix when legal pages are built (Phase 5). |
| Dead CSS in globals.css | `.announcement-marquee*` keyframes and classes, `.hero-copy-placeholder`, `.story-copy-shell` — orphaned, never used. Small but adds noise. | Clean up in a dedicated CSS pass after Products phase. |
| ArabicTestTinta font loaded but unused | @font-face declaration still loads TintaArabic font files on every page, adding minor page weight. | Remove the two ArabicTestTinta @font-face blocks once confirmed it's not used anywhere. |
| Scroll progress bar hardcoded position | `.scroll-progress-bar` uses inline `top-[42px]` (announcement bar height). If bar height changes, it will be misaligned. | Move to a CSS variable or compute from layout. Low priority. |
| SSR / hydration risk on product detail | Product detail page will need `useParams()` to get the slug. This must be a `"use client"` page or use a server component. The pattern used for the homepage (all client) works fine. | Use `"use client"` on all Products pages to stay consistent with existing pattern. |

---

## 11. Final Recommended Next Action

The project is ready. The homepage is production-quality. The language system is stable. The core component system is reusable.

**The next task is:**

```
Build /products UI-only page (Phase 1, Step 1).
```

Before writing the page, the agent must:

1. Expand `visualProducts` in `visual-content.ts` to include all 9 categories × 2–3 products each (20–27 products total) with real bilingual names, correct size labels, price strings, and category slugs
2. Ensure `visualCategories` in `visual-content.ts` includes all 9 categories
3. Create `src/app/(public)/layout.tsx` (minimal passthrough)
4. Then build the `/products` page with `PageHero`, `FilterSortBar`, `ProductGrid`, and `EmptyState`

Do NOT start with `/products/[slug]` (detail page) — that is Step 3 in the phase. Do NOT start with `/products/category/[slug]` — that is Step 2.

---

## 12. Ready-to-Copy Next Prompt

Copy and use this prompt directly for the next agent task:

---

```
You are working on Line Coffee V3 / line-coffee-final.

Project: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, bilingual (AR/EN), dark cinematic luxury aesthetic.
No backend — static mock data only in src/lib/mock-data/.

BEFORE STARTING, read:
1. AGENT_WORK_PROTOCOL.md
2. LINE_COFFEE_V3_PROJECT_LOG.md (for context — do not break existing patterns)
3. src/lib/mock-data/visual-content.ts (current mock data)
4. src/types/homepage.ts (VisualProduct, VisualCategory types — use these)
5. src/components/product/ProductCard.tsx (reuse this component)
6. src/components/ui/SectionHeading.tsx (reuse this component)
7. src/app/globals.css (use existing CSS classes — do not add new design tokens)

TASK: Build the /products page — UI only, no backend.

STEP 1 (first): Expand mock data in src/lib/mock-data/visual-content.ts
- Add all 9 product categories to visualCategories:
  turkish-blends, espresso-blends, easy-coffee, flavor-coffee, coffee-mix, cappuccino, hot-chocolate, make-your-espresso, make-your-flavor
- Add 20+ products to visualProducts, spread across all categories
  Use bilingual names and notes. Use existing image assets (reuse the 4 existing product images across products — real photography comes later).
  All prices in EGP as strings (e.g., "185"). All three size variants (250g / 500g / 1kg) per product.
  Mark 3–4 products as best_seller (badge: { en: "Best Seller", ar: "الأكثر مبيعًا" }).
  Mark 2–3 products as new (badge: { en: "New", ar: "جديد" }).

STEP 2: Create src/app/(public)/layout.tsx
- Minimal passthrough: export default function PublicLayout({ children }) { return <>{children}</>; }

STEP 3: Create src/components/ui/PageHero.tsx
- Short cinematic hero. Props: eyebrow (LocalizedValue), title (LocalizedValue), subtitle (LocalizedValue), optional: count string (e.g., "20 products").
- Same dark background as cinematic-section. min-h-[220px]. Gold h1. Cream subtitle.
- Bilingual — use t() from useLanguage().
- "use client" — uses useLanguage hook.

STEP 4: Create src/components/ui/CategoryPill.tsx
- Controlled pill component. Props: label (string), active (boolean), onClick () => void, disabled? (boolean).
- Inactive: outlined gold border. Active: gold-filled background. Rounded-full. text-sm.
- "use client".

STEP 5: Create src/components/ui/EmptyState.tsx
- Zero-results state. Props: message (LocalizedValue), ctaLabel? (LocalizedValue), ctaHref? (string).
- Centered layout. Coffee cup or leaf SVG icon (gold). Gold heading. Cream text. Optional premium-button CTA.
- "use client".

STEP 6: Create src/components/product/ProductGrid.tsx
- Responsive grid wrapper. Props: children (ReactNode).
- grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 on desktop.
- "use client" (uses useLuxuryScrollReveal internally OR parent mounts the hook).

STEP 7: Create src/components/product/FilterSortBar.tsx
- Sticky bar below header (top: 72px on mobile, top: 90px on desktop — adjust per header height).
- Props: categories (VisualCategory[]), activeCategory (string | null), onCategoryChange (fn), sortValue (string), onSortChange (fn).
- Left side: horizontal scrollable category pills (All + one per category).
- Right side: sort dropdown (Newest / Best Seller / Price: Low to High / Price: High to Low).
- background: var(--coffee-surface). border-bottom: 1px solid rgba(182,136,94,0.15).
- Bilingual: use t() for pill labels and sort options.
- "use client".

STEP 8: Create src/app/(public)/products/page.tsx
- "use client".
- Import: visualProducts, visualCategories from visual-content.ts.
- Import: PageHero, FilterSortBar, ProductGrid, ProductCard, EmptyState, SectionHeading.
- Import: useLuxuryScrollReveal from home hooks.
- Page state: activeCategory (string | null), sortValue (string).
- Filter logic: if activeCategory === null → show all; else filter by product.category === activeCategory.
- Sort logic: apply sort to filtered array (by badge "Best Seller", by price of first size, etc.).
- Layout: PageHero → FilterSortBar → ProductGrid (ProductCard × N) OR EmptyState.
- No route params needed on this page — all client-side filter state.
- Call useLuxuryScrollReveal() at the top of the component.

CONSTRAINTS:
- Do NOT touch src/features/website/home/** (homepage is locked).
- Do NOT add to Supabase, Dashboard, Checkout, Cart, Auth, or DB logic.
- Do NOT create /products/[slug] or /products/category/[slug] in this task.
- Do NOT redesign the visual direction — use existing CSS classes.
- Do NOT add comments that describe what the code does (names do that).
- All sections must use "use client" (pattern from homepage).
- All directional icons must use dir === "rtl" && "rotate-180" pattern.
- All aria-hidden must use string literal "true", never boolean.
- Use t() from useLanguage() for all display text.

AFTER FINISHING:
- Run npm run lint and npm run build — fix any errors.
- Update LINE_COFFEE_V3_PROJECT_LOG.md Agent Work Log with a new entry.
- Update CLAUDE.md Change Log with a new entry.
```

---

*End of audit report.*
