> Historical planning/review document. Current source of truth is `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.
> If this document conflicts with current state, follow `docs/ai/LINE_COFFEE_V3_CURRENT_STATE.md`.

# LINE COFFEE V3 — Custom Builders: Deep Review & Enhancements

> **Role:** Senior UX Designer · E-commerce Product Designer · Coffee Product Experience Designer
> **Date:** 2026-06-17
> **Scope:** Review of `LINE_COFFEE_V3_CUSTOM_BUILDERS_VISUAL_BLUEPRINT.md` — no code, no Supabase, no cart
> **Verdict:** Blueprint is structurally sound but has 3 critical UX problems that will hurt conversion before they hurt experience

---

## Table of Contents

1. [Current Blueprint Strengths](#1-current-blueprint-strengths)
2. [Current Blueprint Weaknesses](#2-current-blueprint-weaknesses)
3. [Make Your Flavor — Full Critical Review & Improvements](#3-make-your-flavor--full-critical-review--improvements)
4. [Make Your Espresso — Full Critical Review & Improvements](#4-make-your-espresso--full-critical-review--improvements)
5. [Mobile-First Recommendations](#5-mobile-first-recommendations)
6. [RTL Arabic Experience Recommendations](#6-rtl-arabic-experience-recommendations)
7. [Premium Luxury Recommendations](#7-premium-luxury-recommendations)
8. [Conversion Optimization Recommendations](#8-conversion-optimization-recommendations)
9. [Features to Postpone](#9-features-to-postpone)
10. [Final Recommended Flow — Make Your Flavor](#10-final-recommended-flow--make-your-flavor)
11. [Final Recommended Flow — Make Your Espresso](#11-final-recommended-flow--make-your-espresso)
12. [My Recommendation: Which to Build First and Why](#12-my-recommendation-which-to-build-first-and-why)

---

## 1. Current Blueprint Strengths

These are working well and should be kept as-is.

**1.1 Correct fundamental separation**
The blueprint correctly identifies Make Your Flavor as a "product customization" experience and Make Your Espresso as a "taste engineering" experience. These are genuinely different user mental models and keeping them separate is right.

**1.2 Shared component architecture**
`BuilderOptionCard`, `IndicatorBar`, `WeightSelector`, `BuilderReviewCard`, `BuilderNavBar` — all shared across both builders. This is correct engineering and will save significant build time.

**1.3 Deterministic mock logic**
The `ESPRESSO_BLEND_MAP` lookup table approach is the right call for Phase 2. No AI, no DB — just a keyed lookup that feels smart. This is honest and maintainable.

**1.4 RTL as a first-class concern**
The blueprint explicitly addresses `rtl:rotate-180` on arrows, `dir="ltr"` on numeric displays, logical properties on flex layouts. This is the right level of rigor.

**1.5 No backend commitment**
All state is local `useState`. No cart binding yet. This keeps the scope clean and lets the UI be built and iterated independently.

**1.6 Visual component references from old project**
`PremiumOptionCard`, `IndicatorBar`, `LiveConfiguratorPanel` — these are directly reusable patterns from `muhmiied/line-coffee`. The blueprint correctly identifies them.

**1.7 Single-select flavor architecture**
The decision to allow one flavor per order (not multi-select) is correct for Phase 2. Multi-select adds complexity to pricing, labeling, and the review card. One flavor keeps the product name clean: "تركي لوتس" not "تركي لوتس + كراميل + فانيلا".

---

## 2. Current Blueprint Weaknesses

These are problems that will hurt conversion or experience in production.

### CRITICAL: 6 steps for Make Your Flavor is too many

A customer clicking "Make Your Flavor" already wants to buy. Every extra step is attrition. The current flow has:

```
Step 0: Hero + "Start Now" click
Step 1: Choose Base
Step 2: Choose Group
Step 3: Choose Flavor
Step 4: Choose Sweetness
Step 5: Weight + Review
```

That is 6 screens and 7 decisions (including the opening CTA click) before the customer reaches the cart. For a product that is conceptually as simple as "Turkish coffee + Lotus," this is 3 screens too many.

**The core problem:** Group selection (Step 2) and Flavor selection (Step 3) are currently split into two screens. There is no reason for this. The user should see both together: group tabs at the top, flavor chips below.

### CRITICAL: Two passive read-only screens in Make Your Espresso

Steps 3 and 4 in the Espresso builder are both read-only. The user hits Next with no action, then hits Next again with no action. That is two "nothing" screens.

```
Step 3: [READ ONLY] View suggested blend
Step 4: [READ ONLY] View taste bars
```

These must be merged into one screen. A user who just spent 2 steps choosing preferences should be rewarded with ALL the output at once — not drip-fed across two pages.

### CRITICAL: No price signal until the last step

The current flow shows "— ج.م" price placeholder on the review card at the final step. This is a conversion killer. Egyptian customers are price-conscious. A customer who goes through 5 steps and then sees a price they weren't expecting will abandon.

The price range (or at minimum "starting from X ج.م") must appear on Step 1 itself, or in the sticky summary sidebar throughout.

### MODERATE: Intro hero requires an extra click to start

Both builders have a "Step 0" hero with a "Start Building" / "ابدأ الآن" CTA. This means the first thing a customer does after navigating to the page is click a button to start what they came to do.

This extra click has no function — it does not set any state, does not show different content, it just mounts the stepper. Cut the click. The builder should start immediately when the page loads.

### MODERATE: Step 2 (Fine-Tune) in Make Your Espresso is inaccessible to casual customers

The blueprint's Step 2 asks users to tune Body, Crema, Acidity, and Strength. Most Line Coffee customers — especially those ordering Turkish coffee, coffee mix, and flavored coffee — do not know what "حموضة" (acidity) means in a coffee context. Presenting these 4 controls as a required step before showing the blend will confuse and lose casual customers.

The profile selection in Step 1 already sets sensible defaults for all 4 dimensions. Fine-tuning should be optional and labeled as "Advanced."

### MODERATE: Grind selection (Step 5) is unfamiliar to most customers

"خشن / Coarse" for cold brew and "حبة / Whole Bean" requiring a home grinder are options that most Egyptian café-culture consumers will not understand. The current blueprint just shows 4 equal cards. Without a strong guidance cue, customers will hover on this step and feel anxious.

### MINOR: "مرارة" (Bitterness) in the taste bars sounds negative

The Taste Analysis screen in Make Your Espresso includes "المرارة / Bitterness" as one of the 5 bars. In Arabic, "مرارة" is a strongly negative word — it literally means "the state of being bitter" and carries emotional weight beyond just a coffee descriptor. No customer wants to see their custom blend described as having high "مرارة". The word will land wrong.

Replace with "العمق / Depth" which conveys the same rich, dark characteristic positively.

### MINOR: No "aha moment" in the flow

Premium builders must have one moment where the customer feels: "this brand is different." Currently, the flows are functional but never magical. There is no moment that earns an emotional reaction. This is addressed in Section 7.

### MINOR: Blueprint uses "Product Group" as a separate step but flavor chip grid can filter by group inline

The 4 flavor groups (Sweets/Nuts/Fruits/Special) do not need their own page. They work better as sticky filter tabs above the chip grid. This is a standard pattern (Amazon, Noon, Talabat) that users already understand from Egyptian e-commerce.

---

## 3. Make Your Flavor — Full Critical Review & Improvements

### 3.1 The Hero Problem

**Current blueprint:** Full-screen hero with "Start Now" CTA before the builder begins.

**Problem:** Users who navigated here want to start immediately. The hero is a gate, not an invitation. This is the same friction problem as popup newsletters that ask "want discounts?" before you've even seen the products.

**Recommendation:** Kill the hero as a separate gated step. Replace with an **inline hero block** that sits above Step 1 as decorative context — beautiful image, eyebrow text, H1, and a 2-line brand statement. The stepper and Step 1 cards are already visible below the fold. The user scrolls naturally into the builder.

On mobile: the hero is 40vh. The cards of Step 1 are visible in the first scroll. No click needed.

**Result:** -1 click from the critical path.

---

### 3.2 Combine Group + Flavor Into One Screen

**Current blueprint:** Step 2 = Group selection (full screen), Step 3 = Flavor chips (next full screen).

**Recommended:** Single screen with group tabs at the top and flavor chips below.

```
اختر النكهة / Choose Your Flavor

[حلويات] [مكسرات] [فواكه] [طلب خاص]   ← group tabs, pill style

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[شوكولاتة قطع] [شوكولاتة] [كراميل]
[فانيلا] [لوتس] [أوريو] [كرز]
```

The group tabs are sticky below the step heading. Tapping a group tab immediately filters the chips. No screen change. No navigation penalty.

**Result:** -1 full step from the flow.

---

### 3.3 Move Weight Before Sweetness

**Current:** Sweetness → Weight → Review

**Problem:** Weight is the price-driving decision. Sweetness is a preference that customers in Egypt often override at order time anyway. If a customer is hesitating, let them see the price (weight) before asking them about a secondary preference (sweetness).

**Recommended order:** Base → Flavor → Weight (+ see price) → Sweetness → Review

**Why weight before sweetness:** Weight unlocks the price. As soon as customers see "500 جرام — 320 ج.م", they feel grounded. Sweetness after weight feels like "one last small thing" rather than "another big decision before I know the price."

---

### 3.4 "Most Popular" Signals

Add exactly 3 "الأكثر طلباً" chips across the flavor grid, always visible regardless of which group tab is active. These are static labels, not backend data.

Suggested:
- لوتس (Sweets) ← most popular by far
- بندق (Nuts)
- فراولة (Fruits)

On the group tab for those flavors, add a small gold dot indicator: `[حلويات ●]`

Additionally, on the Base selection cards, add a "الأكثر طلباً" gold ribbon on Turkish Coffee.

---

### 3.5 Persistent Mini-Summary

**Problem:** Once a user has selected their base, they cannot see what they picked when they're on the flavor screen. If they go back, they lose their place cognitively.

**Desktop:** Sticky sidebar (LiveConfiguratorPanel pattern from old project). Shows:
- الأساس: قهوة تركي
- النكهة: لوتس
- السكر: متوسط
- الوزن: 500 جرام
- السعر: 320 ج.م (placeholder)

**Mobile:** A compact "summary chip" pinned below the stepper:
```
تركي · لوتس · متوسط · 500 جرام  ›
```
Tap expands into a mini drawer with all selections. This is a single line that grows as the user makes choices.

---

### 3.6 Review Card as the "Virtual Product" Moment

The review card at the final step should not look like a data table. It should feel like a **product card being brought into existence** — the "aha moment" for Make Your Flavor.

Layout: Dark product card with tinted background (same as ProductCard from homepage), product-style image placeholder with the base's visual tint, the auto-generated Arabic name in large Tajawal:

```
┌──────────────────────────────────┐
│  [dark tinted base image]        │
│                                  │
│                                  │
├──────────────────────────────────┤
│  تركي لوتس                       │ ← Tajawal 22px
│  Turkish Coffee Lotus            │ ← 12px dim
│                                  │
│  متوسط · 500 جرام                │
│                                  │
│  320 ج.م  ←  [أضف للعربة]       │
└──────────────────────────────────┘
```

This transforms the review from a boring summary into a product being born. The customer sees their creation as a real Line Coffee product.

---

### 3.7 Special Order Flavor Descriptions

The "طلب خاص / Special Order" group contains items that require explanation:
- بينا كولادا — most customers don't know what this tastes like in coffee
- شيشة تفاح / شيشة عنب — unusual combination, needs context
- هوت سيدر — almost unknown in Egypt

For this group only, use **larger flavor cards** instead of chips, with a 1-line description:

```
[شيشة تفاح]
نكهة شيشة تفاح خفيفة ومنعشة في قهوتك

[بينا كولادا]
توليفة استوائية من جوز الهند والأناناس
```

For Sweets/Nuts/Fruits: regular chips are fine — everyone knows what "فراولة" tastes like.

---

### 3.8 WhatsApp Escape Hatch

On every step, include a small low-friction link:

```
مش متأكد؟ اطلب عبر واتساب ←
```

Small, below the navigation bar. Not intrusive. But critical for customers who get confused mid-flow. This prevents abandoned builders from becoming lost sales.

---

## 4. Make Your Espresso — Full Critical Review & Improvements

### 4.1 Beginner vs Advanced Mode

The single biggest UX improvement for Make Your Espresso is introducing a mode selector.

**The core problem:** The current flow tries to serve both the curious first-timer and the knowledgeable enthusiast with the same 6-step linear flow. The first-timer gets overwhelmed by Body/Crema/Acidity pills. The enthusiast feels restricted by the lack of granular bean control.

**Recommended solution:** Add a mode toggle on the first interaction screen:

```
كيف تحب؟
[بكل سهولة — سريع]    [بالتفصيل — متقدم]
```

**Quick/Beginner flow (3 active steps + review):**
Step 1: Profile cards (with preset shortcuts)
Step 2: Blend + Analysis combined (read-only reveal)
Step 3: Grind + Weight
Step 4: Review

**Advanced flow (5 active steps + review):**
Step 1: Profile cards
Step 2: Fine-Tune (Body/Crema/Acidity/Strength)
Step 3: Blend + Analysis combined
Step 4: Grind
Step 5: Weight + Review

90% of customers should default to Quick mode. Advanced mode is for those who specifically want granular control.

---

### 4.2 Merge Blend + Analysis Into One Screen

**Current:** Step 3 (Blend) and Step 4 (Analysis) are separate read-only screens.
**Recommendation:** Merge into one screen.

```
توليفتك                         Taste Profile
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

برازيلي 17-18   ████████░░  45%   │  القوام   ████████░░  8
هندي            ████░░░░░░  25%   │  الكريما  █████████░  9
كولومبي عادي   ███░░░░░░░  20%   │  الحموضة  ███░░░░░░░  3
روبوستا هندي   ██░░░░░░░░  10%   │  القوة    ████████░░  8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ  إسبريسو بقوام ممتلئ، كريما غنية، ومذاق يدوم
```

Left column: blend percentages. Right column: taste bars. One screen. One "Next" click instead of two.

---

### 4.3 Profile Cards Need "Inspired By" Shortcuts

The existing Line Coffee products (Heavy Crema, Black Label, etc.) are already familiar to returning customers. Use them as conversion bridges.

Add small "مستوحى من / Inspired by" labels on the profile cards:

```
┌─────────────────────────────┐
│  هيفي كريما                 │ ← Crema profile
│  كريما أكثف، قوام ممتلئ    │
│                             │
│  ★ من أبرز مبيعاتنا         │ ← static social proof
│  [الكريما] [القوام] [القوة] │ ← 3 mini bars
│                             │
│  مستوحى من: Heavy Crema    │ ← small gold tag
└─────────────────────────────┘
```

This gives a returning customer an instant anchor. They know Heavy Crema, so "Crema profile" is immediately understood.

**Preset mapping:**

| Profile | Inspired by |
|---|---|
| متوازن / Balanced | Classic Line |
| هيفي كريما / Heavy Crema | Heavy Crema |
| داكن وقوي / Dark & Bold | Headshot |
| عطري / Smooth Aroma | Aroma Body |
| شوكولاتة / Chocolate-Nutty | Black Label |

---

### 4.4 Rename the 5 Profiles — Shorter Arabic Labels

The current labels have length problems on mobile cards:

| Current | Problem | Recommended |
|---|---|---|
| متوازن | Fine | متوازن |
| هيفي كريما | Fine | كريما |
| قوي جداً | "جداً" feels juvenile | داكن وقوي |
| ناعم وعطري | Too long in 2-col grid | عطري |
| شوكولاتة ومكسرات | Way too long | شوكولاتة |

---

### 4.5 Fix the "Bitterness" Bar — Rename to "Depth"

"المرارة" in the taste analysis bars carries negative connotation in Arabic. A customer who sees "المرارة: 8/10" will think their blend is bad, not that it has rich depth.

**Replace:** المرارة → العمق (Depth)

This is how premium coffee brands globally reframe this characteristic. A deep espresso is desirable. A bitter espresso sounds like a mistake.

---

### 4.6 Show Price Range on Step 1

On the profile selection screen (Step 1), add below each profile card:

```
يبدأ من 175 ج.م (250 جرام)
```

This is a static placeholder price, not live calculation. But it anchors customer expectations before they invest 4+ more clicks.

The sticky summary sidebar (desktop) should show the price range immediately from Step 1 selection.

---

### 4.7 Grind Step — Add "Recommended For You" Default

Based on the selected profile, pre-select the most logical grind:

| Profile | Pre-selected Grind |
|---|---|
| Any espresso profile | Fine (ناعم) |
| Smooth/Bright | Medium-Fine |
| Strong | Fine |

Add a soft recommendation chip below the grind grid:

```
💡 للإسبريسو — ننصح بـ "ناعم"
```

Arabic-reading customers in Egypt overwhelmingly have espresso machines or use cafés. "Coarse" and "Whole Bean" are edge cases. Pre-selecting the right option reduces decision friction.

---

### 4.8 Bean Explanation Lines in the Blend View

The blend composition shows bean names and percentages. Most customers don't know what "برازيلي 17-18" contributes to their cup.

Add one micro-explanation per bean — 4–6 words maximum:

```
برازيلي 17-18   ████████░░  45%   ← القاعدة الناعمة
هندي            ████░░░░░░  25%   ← يضيف القوام والثقل
كولومبي عادي   ███░░░░░░░  20%   ← لمسات حلاوة خفيفة
روبوستا هندي   ██░░░░░░░░  10%   ← سر الكريما الكثيفة
```

These labels are static — they come from the mock blend map entry, not runtime analysis. But they make the customer feel educated and confident.

---

### 4.9 Live Blend Preview as User Picks Profile

Currently the blend is only revealed in Step 3 after the user has gone through Steps 1 and 2. There is no live feedback while the user is choosing a profile.

**Recommendation:** On the profile selection screen (Step 1), when a user hovers/taps a profile card, a **mini blend preview** appears immediately below the cards:

```
[متوازن ✓ selected]

طلق مبدئي:
برازيل 45% · هندي 25% · كولومبي 20% · روبوستا 10%
```

This preview is instant. It uses the lookup table. It gives the customer a sense that "something is being generated" even though it's a static lookup. The experience feels smart.

On mobile, this mini-preview appears below the selected card, not as a separate screen.

---

### 4.10 The "Advanced" Fine-Tune Screen — Make It Optional

For Advanced mode users who reach the Fine-Tune step (Step 2), add a large clear "تخطى / Skip" option:

```
Step 2 of 5 — Fine-Tune (Optional)

[تخطى هذه الخطوة →]

Or adjust below:
القوام:   [خفيف] [متوسط ✓] [ممتلئ]
...
```

The skip action uses the profile's defaults and jumps to Step 3. This removes the anxiety of mandatory interaction for users who don't feel confident adjusting these dimensions.

---

## 5. Mobile-First Recommendations

### 5.1 Stepper Position

**Current:** Stepper sticky at `top-20` (below header).
**Problem:** On a 375px iPhone, the header (60px) + stepper (48px) + step heading + description pushes the first interaction card to below-the-fold. The user sees nothing actionable on first load without scrolling.

**Fix:** 
- Mobile: Compact stepper. Dots only, no labels, 36px total height. Consider showing it as a **thin progress bar** instead of dot indicators. A 4px gold progress line at the very top of the content area reads immediately and takes almost no space.
- The step heading + cards should be the first visible content at 375px, not the 4th or 5th element.

### 5.2 Touch Target Sizing

The current blueprint specifies `min 44px` which is the correct iOS minimum. Verify:
- Flavor chips: currently `px-4 py-2.5` which is approximately 40px height. Increase to `py-3` to guarantee 44px.
- Grind cards: `min 120px` height — fine.
- Profile cards on mobile (1 col): should be `min 110px` not just 120px total — fine as specified.
- Sweetness pills: 4 pills in a single row at 375px = ~84px each. At `py-2.5` that is only ~40px height. Increase to `py-3`.

### 5.3 BuilderNavBar Safe Area

The fixed bottom nav must use:
```
pb-[calc(16px_+_env(safe-area-inset-bottom))]
```
Not just `pb-4`. iPhone Home Indicator is 34px and will overlap the nav buttons without this.

### 5.4 Flavor Chip Wrapping at 320px

The "Special Order" group has "بينا كولادا" which is 10 characters in Arabic. At 320px with `px-4 py-3`, this chip may overflow its container. Test wrap at 320px and ensure no chip overflows.

### 5.5 Card Grid at 360px

The 2×2 grid for Base Selection (4 cards) at 360px gives each card approximately 164px width. This is fine. But ensure images inside base cards don't create aspect ratio issues. Use `aspect-[4/3]` for base cards, not `aspect-square`.

### 5.6 The BuilderSummaryPanel on Desktop

On `lg:` screens, the summary panel is sticky on the right (LTR) or left (RTL). The main content area `max-w-[720px]` and sidebar `w-64` at `lg:` means the total is `984px`. At 1024px breakpoint, this only leaves `40px` of margin. Consider:
- Main content: `max-w-[640px]` at lg
- Sidebar: `w-72` (288px)
- Container: `max-w-[1024px] mx-auto`

---

## 6. RTL Arabic Experience Recommendations

### 6.1 Progress Bar Direction

The stepper progress line fills left-to-right in LTR (logical: step 1 is on the left, step 5 is on the right). In RTL Arabic, step 1 should be on the right and the progress fills right-to-left.

**Fix:** Use `ltr:left-0 rtl:right-0` for the progress fill div, and reverse the `width` fill direction accordingly.

### 6.2 BuilderNavBar — "السابق / التالي" Physical Position

In Arabic RTL:
- "التالي ←" (Next) should be on the LEFT (the forward direction in RTL)
- "← السابق" (Previous) should be on the RIGHT

This is counterintuitive for the implementer but correct for the user. The LTR layout (Previous on left, Next on right) becomes RTL (Previous on right, Next on left) via `flex-row-reverse`.

**Also critical:** The arrows on the buttons must flip:
- LTR: `← السابق` and `التالي →`  
- RTL: `السابق →` and `← التالي`

Use `rtl:rotate-180` on the ChevronRight icon, not manual text changes.

### 6.3 Flavor Chip Grid Direction

The chip grid wraps. In RTL, flex-wrap should flow from right to left. Set `dir="rtl"` on the chip container when language is Arabic, and ensure individual chips read correctly.

Do NOT apply `direction: ltr` on the flavor chip grid (unlike marquee components). Marquee needed `ltr` to prevent animation collision. Flavor chips have no animation and should respect RTL naturally.

### 6.4 Blend Composition Bars in RTL

In the blend composition card:

**LTR:**
```
Brazil 17-18   ████████░░   45%
```
(bar fills left to right, percentage on right)

**RTL:**
```
45%   ░░████████   برازيلي 17-18
```
(name on right, bar fills right to left, percentage on left)

Implement with `ltr:origin-left rtl:origin-right` on the bar fill div, and `flex-row-reverse` on the row in RTL.

### 6.5 BuilderReviewCard Row Layout

Each row has a label and a value. In LTR: `label left · value right`. In RTL: `label right · value left`. Use `justify-between` with text alignment via `text-start` (logical, follows dir).

### 6.6 Profile Card Micro-Bars in RTL

The 3-bar mini-preview on the profile cards (Body/Crema/Strength) should also fill right-to-left in RTL. Same `rtl:origin-right` fix applies.

### 6.7 Auto-Generated Product Name in Arabic

The auto-name for Make Your Flavor: "تركي لوتس · متوسط · 500 جرام" — verify that the Arabic middle dot (·) renders correctly in Cairo font across devices. On some Android systems, the middle dot between Arabic words can display as a square. Use `،` (Arabic comma) or ` – ` as a safer separator: "تركي لوتس – متوسط – 500 جرام".

---

## 7. Premium Luxury Recommendations

### 7.1 The "Aha Moment" — Virtual Product Card in Make Your Flavor Review

When the customer reaches the final review in Make Your Flavor, do not show a data table. Show a **virtual product card** — styled identically to the existing `ProductCard` component, with:

- A generated tinted dark background based on the base (Turkish = deep copper tint, Cappuccino = warm cream-dark tint)
- The auto-generated name in large Tajawal: "تركي لوتس"
- English sub-name: "Turkish Coffee + Lotus"
- The weight and price
- An "أضف للعربة" premium button

This transforms a transactional summary into a creation moment. The customer feels like they "made" a product, not just "filled a form."

### 7.2 The "Aha Moment" — Live Blend Preview in Make Your Espresso

When the customer selects a profile card and the mini blend preview appears below it, add a staggered animation to the bean rows appearing one by one:

```
[profile selected]

→ 200ms pause
→ برازيلي 17-18 slides in from left (or right in RTL)
→ 80ms delay
→ هندي slides in
→ 80ms delay
→ كولومبي عادي slides in
→ 80ms delay
→ روبوستا هندي AA slides in
```

Total animation: ~540ms. Feels like the blend is being "computed." In reality it's CSS `animation-delay` on static elements. But the rhythm makes it feel intentional.

### 7.3 Gold Shimmer on Selection

When a card is selected (profile, base, flavor), add a brief `shimmer` sweep across the card — a gold highlight that passes left-to-right (right-to-left in RTL) in ~400ms and then settles into the selected state.

This is a one-line CSS animation: `@keyframes gold-sweep { from { background-position: -100% } to { background-position: 200% } }` on a pseudo-element with `linear-gradient(90deg, transparent, rgba(214,163,115,0.18), transparent)`. Elegant, not gaudy.

### 7.4 Taste Bar Animation — Staggered, Not Simultaneous

When the blend analysis bars appear, they should animate in sequence, not all at once:

- Bar 1 (القوام): fills at T=0
- Bar 2 (الكريما): fills at T=120ms
- Bar 3 (الحموضة): fills at T=240ms
- Bar 4 (العمق): fills at T=360ms
- Bar 5 (القوة): fills at T=480ms

This stagger is pure CSS (`animation-delay`). Total duration feels like a reveal. Each bar holds the viewer's attention for a moment before the next appears.

### 7.5 The Builder Header — A Distinct Visual Identity

Both builders should have a persistent identity marker — a subtle branded header strip below the PublicHeader that replaces the stepper during the intro, then becomes the stepper container:

```
╔════════════════════════════════════════╗
║  صمّم نكهتك                            ║  ← gold eyebrow, small
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║  ← thin gold divider
║  ● ── ○ ── ○ ── ○                      ║  ← stepper dots
╚════════════════════════════════════════╝
```

The eyebrow text reminds the user which builder they're in throughout the journey. Useful for UX context and premium brand feel.

### 7.6 Profile Card Visual Differentiation by Color Tint

Each of the 5 espresso profiles should have a subtly different warm tint on the card background:

| Profile | Tint Direction |
|---|---|
| متوازن | Neutral warm brown |
| كريما | Amber / caramel |
| داكن وقوي | Very deep near-black |
| عطري | Lighter brown, slight warmth |
| شوكولاتة | Deep chocolate brown |

Not a color change — just a slight gradient variation. `from-[#1B140F]/95 via-[#12090A]/92` vs `from-[#1B1209]/95 via-[#0E0905]/92`. Subtle but gives each profile a distinct personality.

---

## 8. Conversion Optimization Recommendations

### 8.1 Price Anchoring — Show It Early

**Current:** Price appears only on the review card at the final step.
**Fix:** On the mode/profile selection screen for Espresso, and the base selection screen for Flavor, add:

```
التوليفة المخصصة تبدأ من 175 ج.م · حجم 250 جرام
```

Static placeholder. No calculation. But it sets expectations and removes the "I don't know what this will cost" anxiety.

### 8.2 Social Proof on Profile and Base Cards

Static text labels — no backend required. Add on:
- Make Your Espresso: "الأكثر طلباً" on the Crema profile card
- Make Your Flavor: "الأكثر طلباً" on Turkish Coffee base card and Lotus flavor chip

These are permanently baked into the mock data. They guide first-time customers toward proven choices.

### 8.3 Progress Momentum Text

Below the stepper, add a small text: "خطوة 2 من 4 · 50% اكتملت" in `text-xs text-[#D6B79A]/45`. This is invisible during normal use but creates pull for hesitating customers. Progress percentage increases urgency to complete.

### 8.4 WhatsApp Escape Hatch

Every step should have at the very bottom (below BuilderNavBar), in tiny text:

```
محتاج مساعدة؟  واتسابنا هنا →
```

This is an anchor tag with a WhatsApp prefill URL. Not a button — just a link. It's for the 5% of customers who get confused and would otherwise close the tab. Keeping them on WhatsApp keeps them in the purchase funnel.

### 8.5 "Skip to Quick Order" Entry Point

On both builder pages, add a small dismissible banner at the very top (above even the hero):

```
[×]  تعرف إيه عايزه؟  تصفح المنتجات الجاهزة ←
```

This acknowledges that some users land on builder pages from nav clicks when they actually wanted a preset product. Giving them an immediate exit to `/products` prevents frustration and reduces bounce.

### 8.6 CTA Microcopy

The current "أضف للعربة / Add to Cart" CTA is functional but generic. For a custom-built product, the copy should reflect the creation:

- Make Your Flavor: "احجز توليفتك / Reserve Your Blend"
- Make Your Espresso: "احجز توليفتي / Reserve My Blend"

This small language change signals that the customer is ordering something made specifically for them, not adding a commodity to a cart.

---

## 9. Features to Postpone

These ideas appeared in the brief but should not be built in Phase 2. They belong in Phase 3 or later.

### 9.1 Coffee Flavor Wheel — Postpone

A visual coffee flavor wheel (the professional sensory map used by baristas) would be a genuinely distinctive feature. However, building a clean interactive SVG wheel with RTL labels, proper mobile interaction, and meaningful integration into the builder logic requires significant design and implementation effort that is disproportionate to Phase 2 scope.

**When to add:** Phase 3, when the cart and order flow are built and the builder has been validated with real users.

### 9.2 Flavor Map / Scatter Plot — Postpone

A two-axis "flavor map" (acidity vs body, for example) where bean origins are plotted as dots is a beautiful premium feature. But it requires:
- SVG or Canvas rendering
- Proper Arabic label placement
- RTL-compatible interaction
- Custom visual design that matches the V3 aesthetic

This is 1–2 weeks of design work alone. Postpone.

### 9.3 Multi-Select Flavors (Choose 2 or 3) — Postpone

Phase 2 uses single flavor selection. Multi-select (e.g. "لوتس + كراميل") adds complexity to:
- The product label generation
- Price calculation
- Review card display
- Cart item serialization

**When to add:** Phase 3 once single-select is validated and cart binding is in place.

### 9.4 Save Blend / Resume Later — Postpone

Requires user accounts (auth), local storage, or session management. Out of scope for Phase 2.

### 9.5 Custom Ratio Input for Advanced Users — Postpone

The old project had a number input where users could type exact percentages. This is a great Advanced mode feature but adds validation complexity (total must equal 100%, no negative values, etc.) beyond Phase 2 scope.

### 9.6 Real-Time Price Calculation — Postpone

The old project calculated price from actual bean prices and percentages. Phase 2 uses static placeholder prices. Real calculation requires bean price data from Supabase. Postpone until Phase 3.

### 9.7 Sound Design (Selection Click Sound) — Postpone

Web Audio API click/selection sounds on card tap would feel extremely premium. But they require:
- Browser permission handling
- Accessibility consideration (users with audio off)
- Sound asset design

This is a Phase 4+ enhancement.

---

## 10. Final Recommended Flow — Make Your Flavor

**Total clicks to order:** 5 decisions + 1 CTA = **6 clicks** (down from 8 in original blueprint)

```
[Page Load]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INLINE HERO (decorative, no click required)
  صمّم قهوتك — "Choose your base. Pick your flavor. Coffee your way."
  Scrolls naturally. No gate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: CHOOSE BASE
  4 cards (2×2): تركي · كوفي ميكس · كابتشينو · هوت شوكليت
  "الأكثر طلباً" badge on تركي
  Price anchor: "يبدأ من 175 ج.م"

  [Click 1: Tap base card]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 2: CHOOSE FLAVOR
  Group tabs: [حلويات] [مكسرات ●] [فواكه] [طلب خاص]
  Chips below, filtered by active tab
  "الأكثر طلباً" badge on لوتس, بندق, فراولة
  Special Order group shows cards with descriptions (not chips)

  [Click 2: Tap group tab]
  [Click 3: Tap flavor chip]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 3: WEIGHT + SWEETNESS (same screen)
  Weight pills first (250g / 500g / 1kg) with price hints
  Sweetness pills below (بدون / خفيف / متوسط / سكر زيادة) — متوسط pre-selected
  Price becomes visible and specific here: "340 ج.م"

  [Click 4: Tap weight pill]
  [Optional: Change sweetness — default is متوسط]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 4: REVIEW — Virtual Product Card
  Rendered as a product card with tinted image bg
  Auto-generated name: "تركي لوتس"
  "Turkish Coffee + Lotus"
  Weight · Sweetness · Price
  [احجز توليفتك] — premium CTA

  [Click 5: CTA — future cart binding]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Steps:** 4 (down from 6)
**Required decisions:** 3 (Base, Flavor, Weight) + 1 optional (Sweetness)
**Passive screens:** 0 (down from 0 — good, keep it)

**Persistent on desktop:** Sticky sidebar showing running selections + price
**Persistent on mobile:** Summary chip row below stepper, grows as choices are made

---

## 11. Final Recommended Flow — Make Your Espresso

**Beginner Mode (default) — 3 steps + review:**

```
[Page Load]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INLINE HERO + MODE SELECTOR
  صمّم إسبريسوك — "You choose the taste. We grind the blend."
  Mode toggle: [بكل سهولة ✓] [بالتفصيل]
  Price anchor: "توليفة مخصصة من 175 ج.م"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: CHOOSE PROFILE
  5 profile cards (shorter Arabic names):
    متوازن · كريما · داكن وقوي · عطري · شوكولاتة
  Each card shows:
    - Short AR name (Tajawal bold)
    - 1-line AR description
    - 3 mini IndicatorBars (Body, Crema, Strength)
    - "مستوحى من: Heavy Crema" for Crema profile (etc.)
    - "الأكثر طلباً" badge on كريما profile
  On selection: IMMEDIATE mini blend preview appears below cards
    "طلق مبدئي: برازيل 45% · هندي 25% · كولومبي 20% · روبوستا 10%"
  Price becomes specific in sidebar: "يبدأ من 175 ج.م (250g)"

  [Click 1: Tap profile card]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 2: BLEND + ANALYSIS (combined, read-only)

  Left/Right two-column layout on desktop:
    LEFT — Blend composition with bean explanations:
      برازيلي 17-18   ████████  45%   القاعدة الناعمة
      هندي            ████      25%   يضيف القوام والثقل
      كولومبي عادي   ███       20%   لمسات حلاوة خفيفة
      روبوستا هندي   ██        10%   سر الكريما الكثيفة

    RIGHT — Taste bars (staggered animation):
      القوام   ████████  8
      الكريما  █████████ 9
      الحموضة  ███       3
      العمق    ████      4
      القوة    ████████  8

  Below: Smart tip (SmartSuggestionCard):
    "هذه التوليفة مثالية للكابتشينو والمشروبات اللبنية"

  [Click 2: Read + click Next — no decisions needed here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 3: GRIND + WEIGHT (same screen)
  Grind: 4 cards in 2×2 — Fine pre-selected
    "💡 للإسبريسو — ننصح بـ ناعم"
  Weight: 3 pills with placeholder prices
  Price in sidebar/review becomes final

  [Click 3: Tap weight (grind pre-selected)]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 4: REVIEW
  Blend summary: bar chart + percentages + bean explanations (condensed)
  Profile name + grind + weight
  Price (placeholder)
  [احجز توليفتي] — premium CTA

  [Click 4: CTA — future cart binding]
```

**Beginner mode steps:** 3 active steps + review = **4 screens** (down from 6 in original blueprint)
**Required decisions:** Profile, Weight (Grind pre-selected)
**Optional decisions:** Weight (can keep default)

---

**Advanced Mode — 5 steps + review:**

```
Step 1: PROFILE (same as beginner)
Step 2: FINE-TUNE (Body/Crema/Acidity/Strength pills) — with "تخطى" skip button
Step 3: BLEND + ANALYSIS (same merged screen)
Step 4: GRIND (standalone)
Step 5: WEIGHT + REVIEW
```

---

## 12. My Recommendation: Which to Build First and Why

**Build Make Your Flavor first.**

Not for the reasons in the original blueprint ("it's simpler"). For a more specific reason:

**Make Your Flavor will immediately convert customers who are already close to buying.**

The typical customer who visits `/make-your-flavor` is someone who:
- Already knows they want Turkish coffee
- Already knows they want a flavor (probably saw "تركي لوتس" somewhere, or was recommended by a friend)
- Just needs a way to configure weight and sweetness

For this customer, the builder is 3 meaningful clicks:
1. Tap Turkish Coffee
2. Tap Lotus
3. Tap 500g

Then they hit Add to Cart. This flow works even in Phase 2 with no backend. The cart binding can come later. But the experience of building the product feels complete.

**Make Your Espresso, by contrast, requires customers who already have intent to explore.** The profile and fine-tuning questions assume curiosity. A casual customer doesn't know what "متوازن" profile means for their morning espresso. Make Your Espresso will generate fewer initial orders and more confusion until it is tested and refined.

**The sequencing also benefits the shared components:**

Building Make Your Flavor first will produce and stress-test:
- `BuilderStepPanel`
- `BuilderOptionCard`
- `WeightSelector`
- `BuilderReviewCard`
- `BuilderNavBar`
- `BuilderSummaryPanel`
- RTL behavior across all of the above

When Make Your Espresso is built next, all of these will already be validated. The Espresso builder adds only its unique components on top: `TasteProfileCard`, `BeanCompositionCard`, `TasteBarsPanel`, `SmartSuggestionCard`, `GrindSelector`.

**Final answer:**

Build Make Your Flavor with the revised 4-step flow first. Release it. Watch how customers interact with it. Then build Make Your Espresso with the Beginner/Advanced mode split. Both features are stronger built in sequence than in parallel.

---

*Review completed: 2026-06-17*
*Scope: Planning only. No code, no Supabase, no cart backend.*
*Next step: Update blueprint then proceed to Phase A implementation.*
