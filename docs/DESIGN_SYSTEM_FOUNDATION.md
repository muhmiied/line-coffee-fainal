# Line Coffee Design System Foundation

This document defines the reusable visual foundation for Line Coffee Final /
Visual Lab. It is not a page brief and it does not define backend, CMS, or
dashboard logic.

## Brand Colors

- Primary brown: `#522500`
- Warm beige: `#FFDCC2`
- Black: `#000000`
- White: `#FFFFFF`

Semantic surfaces extend the brand palette with deep coffee-black layers,
muted brown panels, warm beige borders, and restrained status colors for admin
states.

## Typography

- Arabic: Cairo
- English display: Playfair Display
- Default interface/body font: Cairo

Use Playfair Display with restraint for brand-level headings only. Product UI,
dashboard labels, tables, forms, and dense controls should use Cairo.

## Component Usage

- `LCButton`: shared action primitive with primary, secondary, outline, ghost,
  and danger variants.
- `LCSection`: reusable public section wrapper.
- `LCSectionHeading`: consistent section title and description structure.
- `LCGlassPanel`: purposeful premium overlay panel. Do not use glass everywhere.
- `LCCard`: compact content/data card with restrained radius.
- `LCBadge`: status and metadata labels.
- `LCContainer`: responsive page width and side padding.
- `LCStack`: flex layout helper using gap, not spacing hacks.
- `LCLanguageDirection`: locale wrapper for Arabic RTL and English LTR.
- `LCReveal`: CSS-only reveal that respects reduced motion.
- `LCImageFrame`: stable media frame for future Media Studio assets.
- `LCEmptyState`: reusable empty state for public and admin surfaces.

## Bilingual Rules

- Use `*_ar` and `*_en` fields for editable content structures.
- Arabic surfaces must set `dir="rtl"` and `lang="ar"`.
- English surfaces must set `dir="ltr"` and `lang="en"`.
- Do not mix Arabic and English labels unless the product explicitly calls for
  it.
- Use localization helpers from `src/types/localization.ts` instead of ad hoc
  field selection.

## Motion Rules

- Motion should communicate hierarchy or state.
- Use 150ms to 360ms durations.
- Use transform, opacity, clip, and shadow carefully.
- Do not hide content behind JS-only reveal behavior.
- Always support `prefers-reduced-motion`.

## Responsive Rules

- Mobile first.
- Keep tap targets comfortable.
- Prefer stacked controls on narrow screens.
- Avoid horizontal overflow, especially in Arabic.
- Use stable dimensions for cards, media frames, shells, and metric panels.

## What Not To Do

- Do not build generic SaaS UI.
- Do not build cheap ecommerce cards.
- Do not copy old Line Coffee UI.
- Do not copy Irish Cafe or Cafenza.
- Do not add heavy libraries without a clear reason.
- Do not create single-language content models.
- Do not bypass the future Media Studio with isolated asset handling.
- Do not build real pages, dashboard workflows, backend logic, auth, or
  Supabase integration in this phase.
