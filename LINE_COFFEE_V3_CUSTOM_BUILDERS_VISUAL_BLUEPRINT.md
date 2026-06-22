# LINE COFFEE V3 — Custom Builders Visual Blueprint

> **Type:** Planning / UX / Visual Blueprint — NO CODE, NO SUPABASE, NO CART BACKEND
> **Date:** 2026-06-17
> **Routes:** `/make-your-espresso` · `/make-your-flavor`
> **Status:** Planning complete — ready for Phase A implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Old Project Reference Audit](#2-old-project-reference-audit)
3. [UX Flow — Make Your Espresso](#3-ux-flow--make-your-espresso)
4. [UX Flow — Make Your Flavor](#4-ux-flow--make-your-flavor)
5. [Visual Layout Blueprint](#5-visual-layout-blueprint)
6. [Component List](#6-component-list)
7. [Data Model Awareness (No Implementation)](#7-data-model-awareness-no-implementation)
8. [Visual Rules](#8-visual-rules)
9. [Arabic / English Copy](#9-arabic--english-copy)
10. [Implementation Phase Plan](#10-implementation-phase-plan)
11. [Codex-Ready Prompts](#11-codex-ready-prompts)
12. [Recommendation & Design Risks](#12-recommendation--design-risks)

---

## 1. Executive Summary

The two builders are **fundamentally different** in their user mental model:

| Dimension | Make Your Espresso `/make-your-espresso` | Make Your Flavor `/make-your-flavor` |
|---|---|---|
| What they build | A custom **bean blend** | A flavored **finished product** |
| Customer decision | "How do I want my espresso to taste?" | "What base + what flavor?" |
| Complexity | Higher — abstract taste dimensions | Lower — concrete visual choices |
| Steps | 6 | 6 |
| Output label | "My Custom Espresso" | "Turkish Lotus" / "Cappuccino Mango" |
| Who uses it | Coffee enthusiasts, curious buyers | General customers, gifting, family orders |
| Visual metaphor | Lab / craft / precision | Menu / palette / mood |

**Key separation:** Make Your Espresso is a *taste engineering* experience. Make Your Flavor is a *product customization* experience. Both share a builder shell, stepper, option cards, and review card — but their content, language, and interaction feel are distinct.

Neither has backend logic in Phase 2. All state is local `useState`. No Supabase. No cart binding yet.

---

## 2. Old Project Reference Audit

Old project inspected at: `d:/website/line-coffee-old-reference/`

| Old File / Component | Visual Idea Found | Reuse Conceptually | Do NOT Copy |
|---|---|---|---|
| `components/products/premium-configurator.tsx` | `PremiumConfiguratorShell` — eyebrow + icon + title panel above builder | Use the visual pattern: icon circle, uppercase eyebrow, serif title, small description | The `icon` / `eyebrow` / `title` prop pattern is fine; strip Supabase data |
| `premium-configurator.tsx` → `PremiumOptionCard` | Dark gradient card, gold ring on selected, check vs chevron icon, gold glow shadow | Reuse this card pattern exactly — it's near-perfect for V3 | `disabled` logic that reads from DB stock; toast imports; wishlist store |
| `premium-configurator.tsx` → `IndicatorBar` | Gold metric bar (1–5 scale, label + value, animated fill) | Reuse this component visually — ideal for blend analysis display | None — pure visual, clean |
| `premium-configurator.tsx` → `LiveConfiguratorPanel` | Sticky sidebar: gold price, cream note, action slot | Use this as the sticky BuilderSummaryPanel pattern | Cart store import, real pricing logic |
| `lib/config/espresso-intelligence.ts` | 5 taste profiles (balanced, crema, chocolate-nutty, bright, strong), metric system (crema/body/acidity/bitterness/strength), smart ratio algorithm | Use the 5 profiles and the metric names as V3's taste direction system. Use mock deterministic mapping table instead of algorithm | `CoffeeBeanOption` DB shape, stock checks, `scoreBean()` algorithm — all require live bean catalog |
| `lib/config/customization.ts` | Flavor data structure: `FlavorBaseOption`, `FlavorAdditionOption`, groups (original/sweets/nuts/fruits/special), `bases: string[]` availability per flavor | Use the group structure and base-availability concept | DB price system, `applyOfficialBeanSalePrice()`, Supabase queries, `PACKAGE_COSTS` runtime calcs |
| `components/products/product-card.tsx` | Category gradient placeholders, cinematic glow, wishlist + quick-add overlay pattern | Already incorporated into V3 `ProductCard` — reference only | Cart store, wishlist store, toast, `getStockState`, old type shape |
| `components/pages/products/products-hero.tsx` | Dark image hero with gradient overlay for product pages | Already done in V3 products page | None needed |
| `app/products/[slug]/page.tsx` | Full detail page with size selector | Reference for detail page phase — not builder | Backend DB fetch, revalidate |
| `lib/custom-stock.ts` | Stock availability logic | Not needed — V3 is mock-only | All of it |

**Overall old-project verdict:** The `premium-configurator.tsx` file is a gold mine — the visual components (`PremiumOptionCard`, `IndicatorBar`, `LiveConfiguratorPanel`, `PremiumConfiguratorShell`) are very close to V3 design language and should be adapted directly. The intelligence/algorithm layer (`espresso-intelligence.ts`) is too complex for Phase 2 but its **profile taxonomy** and **metric names** are exactly what we need for the mock logic.

---

## 3. UX Flow — Make Your Espresso

### Page Purpose

Customers who want more than a fixed blend — they want to shape the *taste direction* of their espresso. The builder translates abstract preferences (strong, smooth, crema-heavy) into a visual blend composition they can order.

**Mock logic approach (no AI, no backend):** A lookup table maps `tastProfileId + bodyLevel` → fixed bean percentages. Every choice is deterministic. Customer feels the UI is "smart" because the blend updates live, but it's just a mapping table in mock data.

---

### Step 0 — Builder Intro (Landing / Hero)

**Customer sees:**
- Full-width cinematic dark hero, min-height 60vh
- Background: espresso close-up photo with dark overlay
- Gold eyebrow: "صمّم اسبريسوك / Build Your Espresso"
- Large serif H1: "كوّن توليفتك" / "Craft Your Blend"
- Cream subtitle: brief 1-line concept explanation
- Single gold CTA: "ابدأ الآن / Start Building"
- Below hero: 3-stat strip (e.g. 5 steps · 100% Arabica options · Custom grind)

**Customer does:** Click CTA to enter Step 1

**UI components:** `BuilderHero`, `BuilderCTA`

**Mobile:** Full screen, CTA pinned to bottom safe area

**Arabic copy:** "أنتَ تختار. نحن نطحن. كل كوب — طقوسك أنت."
**English copy:** "You choose the taste. We grind the blend. Every cup — your ritual."

**Notes:** This intro is visible before any stepper. Once CTA is clicked, the stepper mounts and Step 1 appears. The hero scrolls away or fades out.

---

### Step 1 — Choose Taste Profile

**Customer sees:**
- Step heading: "ما الاتجاه الذي تريده؟" / "What direction?"
- 5 option cards in a grid (2-col mobile, 3-col desktop or 2+3 wrapping)
- Each card shows:
  - Arabic name (large, Tajawal)
  - English name (small, cream-dim)
  - 1-line Arabic description
  - A mini 3-bar preview (body / crema / strength at-a-glance sparklines)
  - Gold ring on hover/selected, checkmark on selected

**The 5 profiles:**

| Profile ID | AR label | EN label | AR description |
|---|---|---|---|
| `balanced` | متوازن | Balanced | قوام ثابت، كريما ناعمة، نهاية نظيفة |
| `crema` | هيفي كريما | Heavy Crema | كريما أكثف، قوام ممتلئ، استخلاص أقوى |
| `strong` | قوي جداً | Dark & Bold | كافيين عالي، مرارة عميقة، حضور واضح |
| `smooth` | ناعم وعطري | Smooth Aroma | أرابيكا خالصة، عطر بارز، حموضة خفيفة |
| `chocolate-nutty` | شوكولاتة ومكسرات | Chocolate-Nutty | دفء الشوكولاتة، لمسة مكسرات، قوام فاخر |

**Customer does:** Tap one card → it highlights gold, mini bars animate to show that profile's metric preview

**UI components:** `BuilderStepPanel`, `TasteProfileCard` (variant of `BuilderOptionCard`)

**Mobile:** 1 column, each card ~120px tall, full width touch target

**Data needed later:** `EspressoProfileId` string saved to builder state

**Notes:** This is the most important step — all subsequent steps refine the direction set here.

---

### Step 2 — Fine-Tune Taste Controls

**Customer sees:**
- Step heading: "ضبّط الطعم" / "Fine-tune the taste"
- 4 pill selectors (not sliders — pills are more premium on mobile):

```
القوام / Body:         [خفيف]  [متوسط ✓]  [ممتلئ]
الكريما / Crema:       [خفيفة]  [متوسطة]   [كثيفة ✓]
الحموضة / Acidity:     [منخفضة ✓] [متوسطة]  [مرتفعة]
القوة / Strength:      [خفيف]  [متوسط]    [قوي ✓]
```

- Each row: label on the right (AR) / left (EN), 3 pills in a row
- Selected pill: gold fill, dark text
- Unselected: dark bg, cream border, cream text

**Customer does:** Tap any pill to update. Defaults are derived from the profile chosen in Step 1.

**UI components:** `TasteControlRow`, `TasteControlPill`, `BuilderStepPanel`

**Mobile:** Full-width rows, pills `flex-1` equal width

**Data needed later:** `body: "light" | "medium" | "full"`, `crema: "light" | "medium" | "heavy"`, `acidity: "low" | "medium" | "high"`, `strength: "light" | "medium" | "strong"`

**Notes:** Default values come from profile. Customer may skip adjustments entirely. If they don't change anything, that's fine — the defaults from Step 1 still generate a valid blend.

---

### Step 3 — Smart Blend Suggestion

**Customer sees:**
- Step heading: "توليفتك المقترحة" / "Your Suggested Blend"
- A `BeanCompositionCard`:
  - Dark surface card, gold rim
  - Blend rows — each showing: bean name (AR + EN) · percentage bar · % number
  - Example:
    ```
    برازيلي 17-18      ████████░░  45%
    هندي               ████░░░░░░  25%
    كولومبي عادي       ███░░░░░░░  20%
    روبوستا هندي AA    █░░░░░░░░░  10%
    ```
  - Below: the profile reason text (1 line)
- A `SmartSuggestionCard` (advice panel):
  - Gold icon (lightbulb or coffee drop)
  - Arabic tip: "عايز كريما أكتف؟ الروبوستا هي السر."
  - English: "Want thicker crema? The Robusta is the key."
  - Advice is deterministic from profile + controls

**Customer does:** Read and continue. No interaction needed here (read-only step).

**UI components:** `BeanCompositionCard`, `SmartSuggestionCard`, `BuilderStepPanel`

**Mobile:** Stacked cards, full width

**Data needed later:** `suggestedBlend: Array<{ origin: {en, ar}, beanType: "arabica"|"robusta", pct: number }>`

**Notes:** The blend is generated from a static lookup table in mock data, keyed by `profileId + body + strength`. No AI. No DB. A `ESPRESSO_BLEND_MAP` object with 5 profiles × 3 body levels = 15 entries, each with a fixed array of 3-5 beans and percentages. This is clean and totally predictable.

**Mock blend map example:**
```
balanced + medium body → Brazil 17-18 45% + Indian 25% + Colombian Regular 20% + Robusta AA 10%
crema + full body      → Brazil 17-18 40% + Indian 30% + AA Indian Robusta 20% + Indonesian XL 10%
strong + full body     → Indian 35% + AA Indian Robusta 30% + Brazilian Regular 25% + Ugandan 18 10%
```

---

### Step 4 — Blend Analysis Bars

**Customer sees:**
- Step heading: "تحليل توليفتك" / "Your Blend Analysis"
- 5 animated `IndicatorBar` components (from old project — reuse visually):
  - القوام / Body
  - الكريما / Crema
  - الحموضة / Acidity
  - المرارة / Bitterness
  - القوة / Strength
- Values on 1–10 scale, displayed as gold fill bars
- Below bars: `SmartSuggestionCard` — 1 contextual tip based on the blend's dominant characteristic

**Customer does:** Read. No interaction.

**UI components:** `TasteBarsPanel`, `IndicatorBar` × 5, `SmartSuggestionCard`, `BuilderStepPanel`

**Mobile:** Full-width bars, generous spacing

**Data needed later:** `blendMetrics: { body, crema, acidity, bitterness, strength }` — derived from the suggested blend in mock data

**Notes:** Metrics come directly from the lookup table entry — no runtime calculation needed. Each `ESPRESSO_BLEND_MAP` entry stores pre-computed metrics alongside the bean percentages.

---

### Step 5 — Choose Grind

**Customer sees:**
- Step heading: "اختر الطحن" / "Choose your grind"
- 4 option cards in a 2×2 grid:

| Card | AR | EN | Icon hint |
|---|---|---|---|
| `whole-bean` | حبة كاملة | Whole Bean | bean icon |
| `fine` | ناعم جداً | Fine (Espresso) | fine powder icon |
| `medium-fine` | ناعم | Medium-Fine | medium grind icon |
| `coarse` | خشن | Coarse | coarse grind icon |

- Each card: gold icon, large AR name, small EN name, 1-line Arabic description of use case
- Gold selected state

**Customer does:** Tap one card

**UI components:** `GrindSelector`, `BuilderOptionCard` × 4, `BuilderStepPanel`

**Mobile:** 2×2 grid, each card min 120px

**Data needed later:** `grind: "whole-bean" | "fine" | "medium-fine" | "coarse"`

---

### Step 6 — Choose Weight + Review

**Customer sees:**
Two sub-sections on one screen:

**Weight selector:**
- 3 pill buttons in a row: `250g` · `500g` · `1 كيلو`
- Selected: gold fill, dark text
- Below each pill: price placeholder (e.g. "— ج.م" or "من X ج.م")

**Review card** (below weight):
- `BuilderReviewCard`:
  - Header row: "ملخص توليفتك / Your Blend Summary"
  - Row: الاتجاه / Direction → profile name
  - Row: التوليفة / Blend → "Brazil 45% · Indian 25% · ..." (compact)
  - Row: الطحن / Grind → selected grind
  - Row: الوزن / Weight → selected weight
  - Row: السعر / Price → "— ج.م" placeholder
  - Large gold CTA: "أضف للعربة / Add to Cart" (no-op for now — visual only)

**Customer does:** Select weight → review card updates → tap CTA (future)

**UI components:** `WeightSelector`, `BuilderReviewCard`, `BuilderCTA`, `BuilderStepPanel`

**Mobile:** Stacked, CTA pinned to bottom safe area

**Data needed later:** `weight: "250g" | "500g" | "1kg"`, `price: number` (placeholder)

---

## 4. UX Flow — Make Your Flavor

### Page Purpose

Customers who want to customize a **finished product** — not a bean blend. The decision is visual and immediate: pick a base, pick a flavor. Think of it as a digital menu with a creative layer.

---

### Step 0 — Builder Intro (Landing / Hero)

**Customer sees:**
- Cinematic hero, min-height 55vh
- Background: colorful flavored coffee / Arabic coffee culture visual, dark overlay
- Gold eyebrow: "صمّم نكهتك / Create Your Flavor"
- Large serif H1: "كوّن قهوتك" / "Build Your Coffee"
- Cream subtitle: "اختر الأساس — اختر النكهة — قهوتك على مزاجك"
- Single gold CTA: "ابدأ الآن / Start Now"
- 3-stat strip: "4 أساسات · 30 نكهة · تخصيص كامل"

**Customer does:** Click CTA to enter Step 1

**UI components:** `BuilderHero`, `BuilderCTA`

---

### Step 1 — Choose Base

**Customer sees:**
- Step heading: "اختر الأساس" / "Choose your base"
- 4 large image cards (2×2 grid on mobile, 4-col on desktop):

| Base | AR | EN | Visual |
|---|---|---|---|
| `turkish-coffee` | قهوة تركي | Turkish Coffee | dark copper, coffee cup icon |
| `coffee-mix` | كوفي ميكس | Coffee Mix | warm brown, sachet icon |
| `cappuccino` | كابتشينو | Cappuccino | creamy beige, froth icon |
| `hot-chocolate` | هوت شوكليت | Hot Chocolate | deep chocolate, mug icon |

- Each card: full-bleed tinted background (not white), large Arabic name, English sub-label, short 1-line description
- Gold ring + checkmark on selected

**Customer does:** Tap one base card

**UI components:** `BaseSelector`, `BuilderOptionCard` × 4, `BuilderStepPanel`

**Mobile:** 2×2 grid. Each card min 130px height. Touch-friendly.

**RTL note:** Cards maintain same left-to-right reading order regardless of language — it's a visual grid, not a list.

**Data needed later:** `baseId: "turkish-coffee" | "coffee-mix" | "cappuccino" | "hot-chocolate"`

---

### Step 2 — Choose Flavor Group

**Customer sees:**
- Step heading: "اختر المجموعة" / "Choose a flavor group"
- 4 large icon cards in a row (or 2×2 on mobile):

| Group | AR | EN | Icon idea |
|---|---|---|---|
| `sweets` | حلويات | Sweets | chocolate bar / candy |
| `nuts` | مكسرات | Nuts | hazelnut |
| `fruits` | فواكه | Fruits | strawberry |
| `special` | طلب خاص | Special Order | star / sparkle |

- Cards are large, icon-centered (48px icon), name below in large Arabic text
- Selected: gold border + gold icon tint

**Customer does:** Tap one group → advances to Step 3 automatically (no Next button needed for this step — it's a single-choice pivot)

**UI components:** `FlavorGroupSelector`, `BuilderOptionCard` × 4, `BuilderStepPanel`

**Mobile:** 2×2 grid, equal height cards

**Data needed later:** `flavorGroupKey: "sweets" | "nuts" | "fruits" | "special"`

---

### Step 3 — Choose Flavor

**Customer sees:**
- Step heading: "اختر النكهة" / "Choose your flavor"
- Group name shown as subtitle: e.g. "الحلويات — ٧ نكهات"
- `FlavorChipGrid` — a wrap grid of pill chips, one per flavor in selected group
- Each chip: Arabic name in Cairo font, selected = gold fill + dark text, unselected = dark bg + cream border + cream text
- Chip size: `px-4 py-2.5`, rounded-full, touch-friendly min 44px

**Flavor catalog by group (final approved list):**

```
Sweets (حلويات) — 7:
  شوكولاتة قطع | شوكولاتة | كراميل | فانيلا | لوتس | أوريو | كرز

Nuts (مكسرات) — 4:
  بندق قطع | بندق | لوز | فستق

Fruits (فواكه) — 8:
  فراولة | موز | تفاح | أناناس | جوافة | مانجو | برتقال | كيوي

Special Order (طلب خاص) — 6:
  جوز الهند | موكا | بينا كولادا | شيشة تفاح | شيشة عنب | هوت سيدر
```

**Customer does:** Tap one chip (single-select — one flavor per order)

**UI components:** `FlavorChipGrid`, `FlavorChip`, `BuilderStepPanel`

**Mobile:** Wrapping flex grid, 2–3 per row based on label length, full padding

**RTL:** Chips flow right-to-left in AR, left-to-right in EN — both look natural since it's a wrap grid

**Data needed later:** `flavorId: string`, `flavorNameAr: string`, `flavorNameEn: string`

---

### Step 4 — Choose Sweetness

**Customer sees:**
- Step heading: "مستوى السكر" / "Sweetness level"
- 4 pill options in a single row:

| Value | AR label | EN label |
|---|---|---|
| `none` | بدون سكر | No Sugar |
| `light` | خفيف | Light |
| `medium` | متوسط | Medium |
| `extra` | سكر زيادة | Extra Sweet |

- Visual: horizontal pill group, selected = gold fill
- An optional note below: "الافتراضي هو متوسط · default is medium"

**Customer does:** Tap one pill (default: `medium`)

**UI components:** `SweetnessSelector`, `BuilderStepPanel`

**Mobile:** 4 pills in one row, `flex-1` equal width. If too crowded at very small widths (360px), wrap to 2×2

**Data needed later:** `sweetness: "none" | "light" | "medium" | "extra"`

---

### Step 5 — Choose Weight + Review

**Customer sees:**

**Weight selector:**
- 3 pills: `250g` · `500g` · `1 كيلو`
- Price placeholder below each

**Product preview name** (auto-generated string):
```
AR: "قهوة تركي لوتس · متوسط · 500 جرام"
EN: "Turkish Coffee Lotus · Medium · 500g"
```

**Review card:**
- `BuilderReviewCard`:
  - Header: "ملخص طلبك / Your Order Summary"
  - Row: الأساس / Base → base name
  - Row: المجموعة / Group → group name
  - Row: النكهة / Flavor → flavor name
  - Row: السكر / Sweetness → sweetness level
  - Row: الوزن / Weight → selected weight
  - Row: السعر / Price → "— ج.م" placeholder
  - Large gold CTA: "أضف للعربة / Add to Cart" (no-op for now)

**Customer does:** Select weight → review updates → tap CTA (future)

**UI components:** `WeightSelector`, `BuilderReviewCard`, `BuilderCTA`, `BuilderStepPanel`

---

## 5. Visual Layout Blueprint

### 5.1 Shared Page Shell

```
┌─────────────────────────────────────────────────────────┐
│  [PublicHeader — fixed, glass on scroll]                │
├─────────────────────────────────────────────────────────┤
│  [BuilderHero — cinematic, 55–60vh, full-bleed image]   │
│    eyebrow + H1 + subtitle + CTA button                 │
├─────────────────────────────────────────────────────────┤
│  [BuilderStepper — sticky top-20, below header]         │
│    ●━━━○━━━○━━━○━━━○━━━○   step dots + thin gold line   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [BuilderStepPanel — centered content area]             │
│    max-width: 720px, mx-auto, px-4                      │
│    Step heading (large serif)                           │
│    Step description (small cream-muted)                 │
│    Option grid / pill row / composition card            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [BuilderNavBar — prev/next, sticky bottom]             │
│    [← السابق]                        [التالي →]         │
│    (or [أضف للعربة] on last step)                       │
└─────────────────────────────────────────────────────────┘
```

### 5.2 BuilderStepper

```
Step indicator — horizontal, top-pinned

Mobile (≤640px):
  ●━━━○━━━○━━━○━━━○━━━○
  Each dot: 10px circle, gold filled (done/active), cream outline (upcoming)
  Active step: 14px gold circle with inner dot
  No labels — too crowded on mobile
  Thin gold progress line fills left-to-right as steps complete

Desktop (≥640px):
  ① الاتجاه ━━ ② التحكم ━━ ③ التوليفة ━━ ④ التحليل ━━ ⑤ الطحن ━━ ⑥ الوزن
  Numbered gold circles, step label below in 10px Cairo
  Connecting line: 1px gold/12% at rest, gold/60% when step completed
```

### 5.3 BuilderOptionCard

```
┌──────────────────────────────────────┐
│  [ambient glow — top right corner]   │
│                                      │
│  [Icon — 32px, gold tint]            │
│                                      │
│  Arabic Name                    ○    │  ← checkmark circle
│  (Tajawal bold, 20px)                │
│                                      │
│  English name (Cairo, 11px, dim)     │
│                                      │
│  Short description (Cairo, 12px,     │
│  cream-muted/76)                     │
│                                      │
│  [meta / badge row — optional]       │
└──────────────────────────────────────┘

Rest state:   border rgba(182,136,94,0.16), bg gradient coffee-dark→coffee-black
Hover state:  border rgba(182,136,94,0.38), lift -translate-y-1
Selected:     border rgba(214,163,115,0.55), gold glow shadow,
              checkmark circle → gold fill with dark check icon
```

### 5.4 BeanCompositionCard (Espresso only)

```
┌──────────────────────────────────────┐
│  توليفتك المقترحة                    │  ← eyebrow, gold/55
│                                      │
│  برازيلي 17-18       ████████░░  45% │
│  هندي                ████░░░░░░  25% │
│  كولومبي عادي        ███░░░░░░░  20% │
│  روبوستا هندي AA     █░░░░░░░░░  10% │
│                                      │
│  ─────────────────────────────────── │
│  "إسبريسو متوازن بقوام ثابت..."      │  ← profile reason
└──────────────────────────────────────┘

Bar style: 4px height, rounded-full, bg rgba(182,136,94,0.10), fill gold
% text: gold-light, monospace weight
Origin name: Cairo AR or EN depending on lang
```

### 5.5 TasteBarsPanel (Espresso Step 4)

```
القوام / Body       ████████░░  8.2
الكريما / Crema     █████████░  9.0
الحموضة / Acidity   ███░░░░░░░  2.8
المرارة / Bitterness ████░░░░░░  3.5
القوة / Strength    ████████░░  8.5

Bar: 6px height, gold fill, dark track
Value: gold-light on right (EN) / left (AR)
Scale: 1–10 for display (maps from internal 1–5 metric × 2)
Animation: CSS width transition 500ms ease-out on mount
```

### 5.6 FlavorChipGrid (Flavor Step 3)

```
Mobile wrap grid:
  [فراولة] [موز] [تفاح]
  [أناناس] [جوافة] [مانجو]
  [برتقال] [كيوي]

Each chip:
  px-4 py-2.5, rounded-full
  Rest: border rgba(182,136,94,0.22), bg transparent, text cream-dim
  Selected: bg gold, text coffee-black, no border
  Hover: bg rgba(182,136,94,0.12)
  Font: Cairo AR 13px, Cairo EN 12px
  Min touch target: 44px height
```

### 5.7 BuilderReviewCard (Last Step)

```
┌──────────────────────────────────────┐
│  ملخص توليفتك                         │
│  Your Blend Summary                  │
│  ──────────────────────────────────  │
│  الاتجاه         متوازن / Balanced   │
│  التوليفة        Brazil 45% · ...    │
│  الطحن           ناعم / Fine         │
│  الوزن           500 جرام            │
│  ──────────────────────────────────  │
│  السعر           — ج.م              │  ← placeholder
│                                      │
│  [أضف للعربة ←→ Add to Cart]        │  ← premium-button full width
└──────────────────────────────────────┘
```

### 5.8 BuilderNavBar (Sticky Bottom)

```
Desktop: right-aligned below step panel
Mobile: fixed bottom-0, full-width, safe-area padding

[← السابق / Previous]         [التالي / Next →]

Both buttons: premium-button-outline (prev) + premium-button (next)
Last step: next button becomes "أضف للعربة / Add to Cart"
First step: prev button hidden or disabled
RTL: arrows flip — right arrow becomes left
```

---

## 6. Component List

### BuilderPageShell
- **Purpose:** Root wrapper for both builder pages. Mounts hero, stepper, step panel, nav bar. Manages `currentStep` state.
- **Used on:** Both pages
- **Props (later):** `steps: BuilderStep[]`, `onComplete: () => void`
- **Visual rules:** Full-height page, `bg-[--coffee-black]`, no cinematic-section class (builder is not a stacked section)

### BuilderHero
- **Purpose:** Full-bleed cinematic intro before the builder starts. Shown only on step 0.
- **Used on:** Both pages (different image + copy)
- **Props:** `imageUrl`, `eyebrow: LocalizedValue`, `title: LocalizedValue`, `subtitle: LocalizedValue`, `onStart: () => void`
- **Visual rules:** `min-h-[55vh]`, dark overlay `bg-black/55`, gradient bottom fade to `--coffee-black`

### BuilderStepper
- **Purpose:** Top progress indicator. Shows step dots (mobile) or numbered step labels (desktop).
- **Used on:** Both pages
- **Props:** `steps: { label: LocalizedValue }[]`, `currentStep: number`
- **Visual rules:** `sticky top-20 z-30`, `bg-[--coffee-black]/90 backdrop-blur-md`, `py-3 border-b border-[#B6885E]/12`

### BuilderStepPanel
- **Purpose:** Content container for each step. Heading + description + children.
- **Used on:** Both pages
- **Props:** `heading: LocalizedValue`, `description?: LocalizedValue`, `children: ReactNode`
- **Visual rules:** `max-w-[720px] mx-auto px-4 py-10`, heading = `font-serif text-2xl md:text-3xl text-[--cream]`

### TasteProfileCard (variant of BuilderOptionCard)
- **Purpose:** Profile selection card for Espresso Step 1. Includes mini metric preview bars.
- **Used on:** Make Your Espresso only
- **Props:** `profile: EspressoProfile`, `selected: boolean`, `onSelect: () => void`
- **Visual rules:** `min-h-40`, mini bars occupy bottom 1/3 of card

### TasteControlRow
- **Purpose:** One row of 3 pills for a taste dimension (Body / Crema / Acidity / Strength).
- **Used on:** Make Your Espresso only
- **Props:** `label: LocalizedValue`, `options: { value: string; label: LocalizedValue }[]`, `value: string`, `onChange: (v: string) => void`
- **Visual rules:** `flex gap-2 items-center`, pills `flex-1`, label right/left by dir

### BeanCompositionCard
- **Purpose:** Displays the suggested blend with horizontal bars and percentages.
- **Used on:** Make Your Espresso (Steps 3 + 6)
- **Props:** `blend: BlendComponent[]`, `reason: LocalizedValue`
- **Visual rules:** Dark surface card, gold bars, `space-y-2` between rows

### TasteBarsPanel
- **Purpose:** Animated metric bars (Body/Crema/Acidity/Bitterness/Strength on 1–10 scale).
- **Used on:** Make Your Espresso Step 4
- **Props:** `metrics: BlendMetrics`
- **Visual rules:** `space-y-3`, bars animate on mount with CSS transition

### IndicatorBar
- **Purpose:** Single metric bar — label + value + gold fill bar. (Adapted from old `premium-configurator.tsx`)
- **Used on:** TasteBarsPanel
- **Props:** `label: string`, `value: number`, `max?: number`
- **Visual rules:** `h-1.5` track, `bg-[--gold]` fill, transition `500ms ease-out`

### SmartSuggestionCard
- **Purpose:** Advisory tip card with a lightbulb/coffee icon and a bilingual tip.
- **Used on:** Make Your Espresso Steps 3 + 4
- **Props:** `message: LocalizedValue`, `tone?: "neutral" | "highlight"`
- **Visual rules:** `rounded-xl border border-[#B6885E]/20 bg-[#D6A373]/6 px-4 py-3`, gold left accent line

### BaseSelector
- **Purpose:** 4-card grid for selecting the flavor base (Turkish/Mix/Cappuccino/Chocolate).
- **Used on:** Make Your Flavor Step 1
- **Props:** `bases: FlavorBase[]`, `value: string`, `onChange: (id: string) => void`
- **Visual rules:** `grid grid-cols-2 gap-3`, each card has tinted bg image placeholder

### FlavorGroupSelector
- **Purpose:** 4-card icon grid for selecting the flavor group.
- **Used on:** Make Your Flavor Step 2
- **Props:** `groups: FlavorGroup[]`, `value: string`, `onChange: (key: string) => void`
- **Visual rules:** `grid grid-cols-2 gap-3`, icon centered, name below in Tajawal

### FlavorChipGrid
- **Purpose:** Wrapping grid of pill chips for the flavor list in selected group.
- **Used on:** Make Your Flavor Step 3
- **Props:** `flavors: FlavorOption[]`, `value: string`, `onChange: (id: string) => void`
- **Visual rules:** `flex flex-wrap gap-2`, chips `rounded-full px-4 py-2.5`, selected = gold fill

### SweetnessSelector
- **Purpose:** 4-pill sweetness selector row.
- **Used on:** Make Your Flavor Step 4
- **Props:** `value: string`, `onChange: (v: string) => void`
- **Visual rules:** `flex gap-2`, pills `flex-1 py-2.5`, same gold-select pattern

### WeightSelector
- **Purpose:** 3-pill weight selector (250g / 500g / 1kg) with price placeholder.
- **Used on:** Both builders (last step)
- **Props:** `value: string`, `onChange: (v: string) => void`, `priceHints?: Record<string, string>`
- **Visual rules:** `flex gap-3`, pills min-h `52px`, price hint below in gold-dim text

### GrindSelector
- **Purpose:** 4-card grid for grind selection.
- **Used on:** Make Your Espresso Step 5
- **Props:** `value: string`, `onChange: (v: string) => void`
- **Visual rules:** `grid grid-cols-2 gap-3`, each card shows icon + name + use-case description

### BuilderReviewCard
- **Purpose:** Final summary card before CTA. Shows all selected options + price placeholder.
- **Used on:** Both builders (last step)
- **Props:** `rows: { label: LocalizedValue; value: string }[]`, `price?: string`
- **Visual rules:** Dark surface card, gold top border accent, `space-y-3` rows, price row larger gold text

### BuilderSummaryPanel
- **Purpose:** Sticky side panel (desktop only) showing running summary as user progresses.
- **Used on:** Both pages (≥1024px only, hidden mobile)
- **Props:** `selections: BuilderSelection`, `price?: string`
- **Visual rules:** `lg:sticky lg:top-28`, `rounded-2xl border border-[#B6885E]/18`, right/left column depending on dir

### BuilderCTA
- **Purpose:** Final "Add to Cart" button. No-op for now. Premium style.
- **Used on:** Both builders (last step)
- **Props:** `label?: LocalizedValue`, `onClick?: () => void`, `disabled?: boolean`
- **Visual rules:** `premium-button w-full py-4 text-base`, gold fill, coffee-black text

### BuilderNavBar
- **Purpose:** Prev / Next navigation bar, sticky at bottom.
- **Used on:** Both pages
- **Props:** `currentStep: number`, `totalSteps: number`, `onPrev: () => void`, `onNext: () => void`, `nextLabel?: LocalizedValue`
- **Visual rules:** Mobile: fixed bottom-0, safe-area, `bg-[--coffee-black]/95 backdrop-blur-md border-t border-[#B6885E]/12`. Desktop: below step panel, right-aligned

---

## 7. Data Model Awareness (No Implementation)

These are shape references only. All to be stored in `src/lib/mock-data/builders.ts` or similar.

```ts
// Espresso

type EspressoProfileId = "balanced" | "crema" | "strong" | "smooth" | "chocolate-nutty"

type EspressoProfile = {
  id: EspressoProfileId
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  previewMetrics: { body: number; crema: number; strength: number }  // 1-5 scale for mini bars
}

type BlendComponent = {
  origin: { en: string; ar: string }
  beanType: "arabica" | "robusta"
  pct: number
}

type BlendMetrics = {
  body: number      // 1-10
  crema: number     // 1-10
  acidity: number   // 1-10
  bitterness: number // 1-10
  strength: number  // 1-10
}

type EspressoBlendEntry = {
  profileId: EspressoProfileId
  body: "light" | "medium" | "full"
  strength: "light" | "medium" | "strong"
  blend: BlendComponent[]
  metrics: BlendMetrics
  suggestion: { en: string; ar: string }  // smart tip for SmartSuggestionCard
  reason: { en: string; ar: string }      // profile summary text
}

// Builder state (local useState in page component)
type EspressoBuilderState = {
  profile: EspressoProfileId
  body: "light" | "medium" | "full"
  crema: "light" | "medium" | "heavy"
  acidity: "low" | "medium" | "high"
  strength: "light" | "medium" | "strong"
  grind: "whole-bean" | "fine" | "medium-fine" | "coarse"
  weight: "250g" | "500g" | "1kg"
}

// ─────────────────────────────────────────────────────────────

// Flavor Builder

type FlavorBaseId = "turkish-coffee" | "coffee-mix" | "cappuccino" | "hot-chocolate"

type FlavorBase = {
  id: FlavorBaseId
  name: { en: string; ar: string }
  description: { en: string; ar: string }
  image: string
}

type FlavorGroupKey = "sweets" | "nuts" | "fruits" | "special"

type FlavorGroup = {
  key: FlavorGroupKey
  name: { en: string; ar: string }
  icon: string           // icon name from lucide or SVG path
  flavorCount: number
}

type FlavorOption = {
  id: string
  name: { en: string; ar: string }
  group: FlavorGroupKey
  type: "standard" | "chunks"    // chunks = slightly different texture product
  availableBases: FlavorBaseId[] // which bases support this flavor
}

type FlavorBuilderState = {
  baseId: FlavorBaseId
  flavorGroupKey: FlavorGroupKey
  flavorId: string
  sweetness: "none" | "light" | "medium" | "extra"
  weight: "250g" | "500g" | "1kg"
}
```

---

## 8. Visual Rules

### Background & Surfaces
- Page bg: `bg-[#0B0806]` (always `--coffee-black`, never pure black)
- Card bg: `bg-gradient-to-br from-[#1B140F]/95 via-[#120D09]/92 to-[#0B0806]/95`
- Panel/aside: `bg-[#0B0806]/78`
- No whites, no light grays

### Cards & Borders
- Rest: `border border-[#B6885E]/16`
- Hover: `border-[#D6A373]/38 -translate-y-1` (lift)
- Selected: `border-[#D6A373]/55 shadow-[0_0_38px_rgba(182,136,94,0.18)]`
- Card radius: `rounded-2xl` (never larger on card)
- Pills: `rounded-full`

### Progress Stepper
- Done step dot: `bg-[#D6A373]` (solid gold)
- Active step dot: `bg-[#D6A373] ring-2 ring-[#D6A373]/30` (gold + outer glow ring)
- Upcoming dot: `bg-transparent border border-[#B6885E]/40`
- Progress line: 1px, `bg-[#D6A373]` for completed portion, `bg-[#B6885E]/15` for remaining

### Buttons
- Primary / Next: `.premium-button` — gold bg, dark text
- Prev / Ghost: `.premium-button-outline` — transparent, gold border, cream text
- Disabled: `opacity-40 cursor-not-allowed`
- CTA size on mobile: `py-4 text-base` (generous touch target)

### Typography in Builder
- Step heading: `font-serif text-2xl md:text-3xl font-bold text-[#F5E6D8]` (Playfair EN / Tajawal AR)
- Step description: `text-sm text-[#D6B79A]/70 mt-1.5 leading-relaxed`
- Card title: `font-serif text-xl font-bold text-[#F5E6D8]` (Playfair EN / Tajawal AR)
- Card description: `text-sm text-[#D6B79A]/76 leading-relaxed`
- Metric labels: `text-[11px] font-medium text-[#D6B79A]/62 uppercase tracking-wider`
- Review row labels: `text-xs text-[#D6B79A]/60` · values: `text-sm text-[#F5E6D8]/90 font-medium`
- Price (large): `font-serif text-3xl text-[#D6A373] font-bold`

### Numbers & Metrics
- Metric values on bars: `text-[#D6A373] font-semibold`
- Percentages in blend: `text-[#D6A373]/65 font-semibold tabular-nums`
- Prices: always gold-light, Playfair/Tajawal weight 600+

### RTL Behavior
- Arrow icons on BuilderNavBar: `rtl:rotate-180` on both prev and next arrows
- BuilderSummaryPanel (desktop): floats to `ltr:right-0 rtl:left-0`
- Flex rows in review card: `ltr:justify-between rtl:flex-row-reverse`
- Chip grid: natural wrap — works in both directions
- Step labels (desktop stepper): text-align follows `dir`
- Profile/base cards: label text-align `text-start` (logical property)
- `dir="ltr"` on any numeric-heavy displays (percentages, prices) to prevent RTL number reversal

### Mobile Layout
- Stepper: dots-only mode (no text labels below 640px)
- Cards: 2-column grid (1 column only for very long content cards)
- BuilderNavBar: fixed bottom-0, `pb-[env(safe-area-inset-bottom)]`
- BuilderSummaryPanel: hidden on mobile (`hidden lg:block`)
- FlavorChipGrid: 2–3 per row wrap
- TasteControlRow pills: `flex-1` equal width in 3-col row
- Step content: `min-h-[60vh]` to feel full-screen on each step

### Animation Limits
- Step transition: `opacity-0 → opacity-100` + `translateX(±20px) → translateX(0)` — CSS only, 350ms
- Metric bars: `width` transition on mount, `duration-500 ease-out`
- Card hover: `transition-all duration-300 ease-out`
- No scroll-driven transforms
- No JS-driven scroll handlers
- No Framer Motion — CSS only to stay consistent with project

---

## 9. Arabic / English Copy

### Make Your Espresso

| Element | Arabic | English |
|---|---|---|
| Page hero eyebrow | صمّم إسبريسوك | Build Your Espresso |
| Page hero H1 | كوّن توليفتك | Craft Your Blend |
| Page hero subtitle | أنتَ تختار. نحن نطحن. كل كوب — طقوسك أنت. | You choose the taste. We grind the blend. Every cup — your ritual. |
| CTA start | ابدأ الآن | Start Building |
| Step 1 heading | ما الاتجاه الذي تريده؟ | What's your direction? |
| Step 1 description | اختر الطابع العام لإسبريسوك | Choose the overall character of your espresso |
| Step 2 heading | ضبّط الطعم | Fine-tune the taste |
| Step 2 description | هذه الخيارات تشكّل التوليفة النهائية | These controls shape your final blend |
| Step 3 heading | توليفتك المقترحة | Your Suggested Blend |
| Step 3 description | بناءً على اختياراتك، هذه توليفتنا المقترحة لك | Based on your choices, here's our suggested blend |
| Step 4 heading | تحليل توليفتك | Your Blend Analysis |
| Step 4 description | إليك توقعنا لطعم هذه التوليفة | Here's what we predict this blend will taste like |
| Step 5 heading | اختر الطحن | Choose your grind |
| Step 5 description | كل طريقة تحضير تحتاج طحنها المناسب | Every brewing method needs the right grind |
| Step 6 heading | الوزن ومراجعة طلبك | Weight & Review |
| Grind option: whole-bean desc | الأفضل إذا كان عندك مطحنة في البيت | Best if you have a home grinder |
| Grind option: fine desc | مثالي للإسبريسو الكلاسيكي | Perfect for classic espresso machines |
| Grind option: medium-fine desc | يناسب الموكا وبعض الفلاتر | Good for moka pot and some filter methods |
| Grind option: coarse desc | للفرنش بريس والقهوة الباردة | For french press and cold brew |
| Blend analysis title | تحليل الطعم | Taste Analysis |
| Smart tip — crema high | كريما عالية — مثالي للكابتشينو والمشروبات اللبنية | High crema — ideal for cappuccino and milk drinks |
| Smart tip — acidity high | حموضة مرتفعة — جرّبه أمريكانو أو فلتر | Higher acidity — try it as americano or filter |
| Smart tip — strength | قوة كافيين عالية — الأول في الصبح هو وبس | High caffeine punch — your first-morning-only cup |
| Review: blend label | التوليفة | Blend |
| Review: grind label | الطحن | Grind |
| Review: weight label | الوزن | Weight |
| Review: price label | السعر | Price |
| Review: price placeholder | يُحدد قريباً | To be confirmed |
| CTA final | أضف للعربة | Add to Cart |
| Empty state (no profile selected) | اختر اتجاهك أولاً | Choose your direction first |

### Make Your Flavor

| Element | Arabic | English |
|---|---|---|
| Page hero eyebrow | صمّم نكهتك | Create Your Flavor |
| Page hero H1 | كوّن قهوتك | Build Your Coffee |
| Page hero subtitle | اختر الأساس — اختر النكهة — قهوتك على مزاجك | Choose the base. Choose the flavor. Coffee, your way. |
| CTA start | ابدأ الآن | Start Now |
| Step 1 heading | اختر الأساس | Choose your base |
| Step 1 description | ما نوع المشروب اللي تحب؟ | What type of drink do you prefer? |
| Base: Turkish desc | قهوة تركية مضبوطة، غنية وعميقة الطعم | Classic Turkish coffee, rich and deep |
| Base: Mix desc | ناعمة خفيفة وسريعة التحضير | Smooth, light and quick to prepare |
| Base: Cappuccino desc | كريمية مع لمسة لبن ناعمة | Creamy with a smooth milk touch |
| Base: Chocolate desc | دفء الشوكولاتة في كل رشفة | The warmth of chocolate in every sip |
| Step 2 heading | اختر المجموعة | Choose a flavor group |
| Step 2 description | من أي عالم تريد نكهتك؟ | Which flavor world calls to you? |
| Group: sweets desc | حلويات كلاسيكية، شوكولاتة وكراميل | Classic sweets — chocolate, caramel and more |
| Group: nuts desc | دفء المكسرات وغناها | The warmth and richness of nuts |
| Group: fruits desc | فواكه طازجة وعطرية | Fresh and fragrant fruit flavors |
| Group: special desc | نكهات استثنائية خارج المعتاد | Exceptional flavors beyond the ordinary |
| Step 3 heading | اختر النكهة | Choose your flavor |
| Step 3 description | اختر نكهة واحدة من القائمة | Choose one flavor from the list |
| Step 4 heading | مستوى السكر | Sweetness level |
| Step 4 description | ممكن نضبطه على مزاجك | We can adjust it to your taste |
| Sweetness: none | بدون سكر | No Sugar |
| Sweetness: light | خفيف | Light |
| Sweetness: medium | متوسط | Medium |
| Sweetness: extra | سكر زيادة | Extra Sweet |
| Sweetness default note | الافتراضي هو متوسط | Default is medium |
| Step 5 heading | الوزن ومراجعة طلبك | Weight & Review |
| Auto-name example | قهوة تركي لوتس - متوسط - 500 جرام | Turkish Coffee Lotus · Medium · 500g |
| Review: base label | الأساس | Base |
| Review: group label | المجموعة | Group |
| Review: flavor label | النكهة | Flavor |
| Review: sweetness label | السكر | Sweetness |
| Review: weight label | الوزن | Weight |
| Review: price placeholder | يُحدد قريباً | To be confirmed |
| CTA final | أضف للعربة | Add to Cart |
| Empty: no base selected | اختر الأساس الأول | Choose a base first |
| Empty: no flavor selected | اختر نكهة من المجموعة | Choose a flavor from the group |

---

## 10. Implementation Phase Plan

### Phase A — Shared Builder Shell & Components
Build the shared infrastructure used by both pages.

Tasks:
1. Create `src/lib/mock-data/builders.ts`:
   - `ESPRESSO_PROFILES` array (5 profiles with names, descriptions, preview metrics)
   - `ESPRESSO_BLEND_MAP` (deterministic lookup: profileId + body + strength → blend + metrics + suggestion)
   - `FLAVOR_BASES` array (4 bases)
   - `FLAVOR_GROUPS` array (4 groups)
   - `FLAVOR_OPTIONS` array (30 flavors with group + availableBases)
2. Create `src/components/builder/`:
   - `BuilderStepper.tsx`
   - `BuilderStepPanel.tsx`
   - `BuilderOptionCard.tsx`
   - `IndicatorBar.tsx`
   - `WeightSelector.tsx`
   - `BuilderReviewCard.tsx`
   - `BuilderNavBar.tsx`
   - `BuilderSummaryPanel.tsx`
   - `BuilderCTA.tsx`
3. Add any builder-specific CSS classes to `globals.css` (`.builder-chip`, `.builder-card`, `.builder-stepper-dot`)

Deliverable: A shared component library ready to be composed into both pages.

---

### Phase B — Make Your Flavor UI

Build `/make-your-flavor` first (simpler, more concrete choices).

Tasks:
1. Create `src/app/(public)/make-your-flavor/page.tsx` with full 6-step flow
2. Build flavor-specific components:
   - `BaseSelector.tsx`
   - `FlavorGroupSelector.tsx`
   - `FlavorChipGrid.tsx`
   - `SweetnessSelector.tsx`
3. Implement local `FlavorBuilderState` with `useState`
4. Auto-generate product name string from selections
5. Full bilingual (AR + EN) for every element
6. Mobile test: all touch targets ≥ 44px

Deliverable: Fully navigable Make Your Flavor page with review card.

---

### Phase C — Make Your Espresso UI

Build `/make-your-espresso` second (more complex).

Tasks:
1. Create `src/app/(public)/make-your-espresso/page.tsx` with full 6-step flow
2. Build espresso-specific components:
   - `TasteProfileCard.tsx` (profile card with mini bars)
   - `TasteControlRow.tsx` (pill rows for Body/Crema/Acidity/Strength)
   - `BeanCompositionCard.tsx`
   - `TasteBarsPanel.tsx`
   - `SmartSuggestionCard.tsx`
   - `GrindSelector.tsx`
3. Implement local `EspressoBuilderState` with `useState`
4. Implement `getBlendEntry(profileId, body, strength)` lookup from `ESPRESSO_BLEND_MAP`
5. Metrics display from the lookup entry
6. Full bilingual, full mobile

Deliverable: Fully navigable Make Your Espresso page with review card.

---

### Phase D — Polish & Local State Review

Tasks:
1. Verify step transitions (CSS opacity + translate, not JS scroll)
2. Test RTL — both pages in AR: arrows flip, chips wrap correctly, stepper labels right-aligned
3. Verify no inline styles → all dynamic values through CSS classes or Tailwind
4. Test BuilderSummaryPanel sticky behavior on desktop
5. Verify auto-generated product names are clean Arabic strings
6. Test WCAG touch targets on mobile (all ≥ 44px)
7. Add `aria-current="step"` to active stepper step
8. Confirm all `aria-hidden` usages are string `"true"` not boolean

Deliverable: Both builders polished, RTL-verified, ARIA-correct.

---

### Phase E — Future Cart / Data Binding (Deferred)

When cart backend is ready:
1. Connect `BuilderCTA` `onClick` to cart store `addCustomItem()`
2. Define `CustomItem` shape (see Section 7.3 in master plan)
3. Bind `WeightSelector` prices to real pricing table
4. Connect `ESPRESSO_BLEND_MAP` entries to real bean IDs for stock checking
5. Connect flavor availability to real DB flavor list

None of this is in scope for Phase 2.

---

## 11. Codex-Ready Prompts

---

### Prompt A — Build Shared Builder Components

```
We are working on Line Coffee V3 in line-coffee-final (Next.js 15, React 19, Tailwind CSS v4, TypeScript strict mode, no Supabase, no backend).

Task: Build the shared builder component library for the two custom builder pages.

DO NOT:
- Implement /make-your-espresso page
- Implement /make-your-flavor page
- Touch homepage, products page, or any existing page
- Connect to Supabase
- Start cart or checkout logic
- Start Dashboard

DO:
1. Create src/lib/mock-data/builders.ts with:
   - ESPRESSO_PROFILES: 5 profiles (balanced/crema/strong/smooth/chocolate-nutty), each with { id, name: {en,ar}, description: {en,ar}, previewMetrics: {body,crema,strength} }
   - ESPRESSO_BLEND_MAP: array of EspressoBlendEntry objects (see data shapes below)
   - FLAVOR_BASES: 4 bases (turkish-coffee/coffee-mix/cappuccino/hot-chocolate)
   - FLAVOR_GROUPS: 4 groups (sweets/nuts/fruits/special)
   - FLAVOR_OPTIONS: 30 flavors with id, name {en,ar}, group, availableBases

2. Create src/components/builder/ folder with these components:
   - BuilderStepper.tsx — step progress dots (mobile) + labeled steps (desktop)
   - BuilderStepPanel.tsx — heading + description + children content slot
   - BuilderOptionCard.tsx — dark gradient card, selected=gold ring+checkmark
   - IndicatorBar.tsx — label + value + gold fill bar (1–10 scale)
   - WeightSelector.tsx — 3 pills: 250g / 500g / 1kg
   - BuilderReviewCard.tsx — summary rows table + price placeholder
   - BuilderNavBar.tsx — sticky prev/next nav, mobile fixed bottom
   - BuilderSummaryPanel.tsx — sticky desktop sidebar summary
   - BuilderCTA.tsx — premium-button "أضف للعربة / Add to Cart" (no-op)

Visual rules:
- All "use client"
- Dark bg #0B0806, cards from-[#1B140F] via-[#120D09] to-[#0B0806]
- Gold accent #D6A373 / #B6885E — selected state, bars, prices
- Cream text #F5E6D8 headings, #D6B79A/75 body
- Playfair Display / Tajawal for headings, Cairo for UI text
- Fully bilingual — useLanguage() hook, t({ en, ar }) pattern
- RTL: rtl: Tailwind variant + dir-aware arrow icons
- No inline styles — Tailwind + cn() only

Reference: line-coffee-old-reference/components/products/premium-configurator.tsx for visual patterns
Reference: LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md for full specs

Append to CLAUDE.md change log when done.
Append to LINE_COFFEE_V3_PROJECT_LOG.md when done.
```

---

### Prompt B — Build Make Your Flavor Page

```
We are working on Line Coffee V3 in line-coffee-final.
Shared builder components already exist in src/components/builder/.
Mock data already exists in src/lib/mock-data/builders.ts.

Task: Build the complete Make Your Flavor page at /make-your-flavor.

Route: src/app/(public)/make-your-flavor/page.tsx

DO NOT:
- Touch homepage
- Touch products page
- Touch Make Your Espresso page
- Connect to Supabase
- Implement real cart logic
- Start Dashboard
- Modify existing components outside src/components/builder/

The page has 6 steps managed by local useState (no URL params):

Step 0 — Hero (BuilderHero): cinematic full-bleed hero with CTA "ابدأ الآن"
Step 1 — Choose Base (BaseSelector): 4 cards — Turkish / Coffee Mix / Cappuccino / Hot Chocolate
Step 2 — Choose Flavor Group (FlavorGroupSelector): 4 icon cards — حلويات / مكسرات / فواكه / طلب خاص
Step 3 — Choose Flavor (FlavorChipGrid): pill chips from selected group's FLAVOR_OPTIONS
Step 4 — Choose Sweetness (SweetnessSelector): 4 pills — بدون سكر / خفيف / متوسط / سكر زيادة
Step 5 — Weight + Review (WeightSelector + BuilderReviewCard + BuilderCTA)

Additional components to build:
- src/components/builder/BaseSelector.tsx
- src/components/builder/FlavorGroupSelector.tsx
- src/components/builder/FlavorChipGrid.tsx + FlavorChip.tsx
- src/components/builder/SweetnessSelector.tsx

State shape:
type FlavorBuilderState = {
  baseId: string
  flavorGroupKey: string
  flavorId: string
  sweetness: "none" | "light" | "medium" | "extra"
  weight: "250g" | "500g" | "1kg"
}

Auto-generate product name string for review:
AR: "[base name AR] [flavor name AR] · [sweetness AR] · [weight]"
EN: "[base name EN] [flavor name EN] · [sweetness EN] · [weight]"

Full bilingual — Arabic + English — all copy from LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md §9
Mobile-first, RTL-ready, no inline styles, "use client"
All touch targets ≥ 44px
Grind selector NOT on this page (espresso only)

Append to CLAUDE.md change log when done.
Append to LINE_COFFEE_V3_PROJECT_LOG.md when done.
```

---

### Prompt C — Build Make Your Espresso Page

```
We are working on Line Coffee V3 in line-coffee-final.
Shared builder components already exist in src/components/builder/.
Mock data already exists in src/lib/mock-data/builders.ts.

Task: Build the complete Make Your Espresso page at /make-your-espresso.

Route: src/app/(public)/make-your-espresso/page.tsx

DO NOT:
- Touch homepage
- Touch products page
- Touch Make Your Flavor page
- Connect to Supabase
- Implement real cart logic
- Start Dashboard
- Modify existing pages

The page has 6 steps managed by local useState:

Step 0 — Hero (BuilderHero): "كوّن توليفتك / Craft Your Blend"
Step 1 — Choose Profile (TasteProfileCard × 5): balanced/crema/strong/smooth/chocolate-nutty
Step 2 — Tune Taste (TasteControlRow × 4): Body / Crema / Acidity / Strength — each 3-pill row
Step 3 — View Blend (BeanCompositionCard + SmartSuggestionCard): lookup from ESPRESSO_BLEND_MAP
Step 4 — View Analysis (TasteBarsPanel × 5 bars + SmartSuggestionCard): metrics from lookup
Step 5 — Choose Grind (GrindSelector): 4 cards — حبة / ناعم / ناعم متوسط / خشن
Step 6 — Weight + Review (WeightSelector + BuilderReviewCard + BuilderCTA)

Additional components to build:
- src/components/builder/TasteProfileCard.tsx — profile option card with 3 mini IndicatorBars
- src/components/builder/TasteControlRow.tsx — label + 3 pills in a row
- src/components/builder/BeanCompositionCard.tsx — blend with bars + reason text
- src/components/builder/TasteBarsPanel.tsx — 5 IndicatorBar instances
- src/components/builder/SmartSuggestionCard.tsx — advisory tip card
- src/components/builder/GrindSelector.tsx — 4 cards with icon + name + use-case

Lookup function (pure, in mock data file):
function getBlendEntry(profileId, body, strength): EspressoBlendEntry
Returns the matching entry from ESPRESSO_BLEND_MAP or falls back to first entry.
Re-runs whenever Step 1 or Step 2 selections change.

State shape:
type EspressoBuilderState = {
  profile: EspressoProfileId
  body: "light" | "medium" | "full"
  crema: "light" | "medium" | "heavy"
  acidity: "low" | "medium" | "high"
  strength: "light" | "medium" | "strong"
  grind: "whole-bean" | "fine" | "medium-fine" | "coarse"
  weight: "250g" | "500g" | "1kg"
}

Full bilingual, mobile-first, RTL-ready, no inline styles, "use client"
All animations CSS-only (no JS scroll handlers, no Framer Motion)
All copy from LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md §9

Append to CLAUDE.md change log when done.
Append to LINE_COFFEE_V3_PROJECT_LOG.md when done.
```

---

## 12. Recommendation & Design Risks

### Which Builder to Build First?

**Recommendation: Build Make Your Flavor first (Phase B before Phase C).**

**Reasons:**
1. Simpler decision tree — concrete product choices, not abstract taste dimensions
2. Fewer custom components — reuses all shared components, needs only 4 additions
3. Lower risk of scope creep — flavor list is fixed, no algorithm
4. Immediately understandable to customers — serves the broadest audience
5. The data is simpler — all flavor options are already defined in the approved list

Make Your Espresso is the more impressive feature, but it requires more unique components (TasteProfileCard, BeanCompositionCard, TasteBarsPanel, SmartSuggestionCard, GrindSelector) and a lookup table to design carefully. Build the simpler one first to validate the shared shell, then layer the complexity.

---

### Top 5 Design Risks

**Risk 1 — Step transition feeling choppy on mobile**
The builder is a multi-step flow. If step transitions are not smooth, the premium feel is lost.
*Mitigation:* Use CSS `opacity + translateX` transitions, not JS. Test on real device. Keep transition ≤350ms.

**Risk 2 — RTL FlavorChipGrid wrapping order**
In RTL, flex-wrap reverses visual order. Arabic chips may wrap in confusing order.
*Mitigation:* Force `direction: ltr` on the chip grid wrapper, restore `direction: rtl` on individual chips for text — same pattern used in product marquee.

**Risk 3 — Espresso blend suggestion feels random or meaningless**
If the `ESPRESSO_BLEND_MAP` lookup table only has a few entries and doesn't feel personalized, customers won't trust it.
*Mitigation:* Design at least 9–12 distinct map entries (3 profiles × 3 body/strength combos). Each entry must have meaningfully different bean compositions. Include real Line Coffee blend origins (from product-catalog.ts — branzili, santes, habashi, etc.).

**Risk 4 — Mobile BuilderNavBar covering content**
Fixed-bottom nav bar may overlap the review card or last content element.
*Mitigation:* Add `pb-24 safe-area` to step content area. Test on iPhone SE (smallest common size).

**Risk 5 — TasteControlRow pill layout at 360px**
4 rows × 3 pills each may be too tight on very small screens. Pills may overflow or become unreadably small.
*Mitigation:* Set pills to `flex-1 min-w-0 text-xs` inside rows, and test layout at 360px. If still crowded, allow 2×2 wrap on that row for the 3-option pill group on very small screens.
```

---

*Document created: 2026-06-17*
*Scope: Planning only. No code, no Supabase, no cart backend.*
*Next step: Phase A — shared builder components.*
