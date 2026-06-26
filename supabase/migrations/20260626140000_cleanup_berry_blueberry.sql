-- =====================================================================
-- Migration: Berry → Blueberry catalog cleanup
-- =====================================================================
-- Business decision (owner): Line Coffee no longer sells a plain
-- berry/raspberry-style product. Hot Chocolate keeps Blueberry only;
-- Flavor Coffee's plain berry product becomes Blueberry / توت أزرق.
--
-- This migration aligns the LIVE Supabase rows with the corrected
-- catalog source of truth (src/lib/mock-data/product-catalog.ts and
-- supabase/seeds/20260625_catalog_seed.sql).
--
-- Deterministic: every statement targets an EXACT slug. No text-pattern
-- replacements, no random/bulk updates. Safe to run more than once
-- (each WHERE no-ops once the row is already in its target state).
--
-- updated_at is intentionally NOT set here — the products
-- `before update` trigger maintains it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Hot Chocolate — archive the plain berry product.
--    `raspberry-hot-chocolate` (هوت شوكليت توت). Blueberry Hot Chocolate
--    (`blueberry-hot-chocolate`) already exists and is kept untouched.
--
--    Archived (not deleted) to preserve referential integrity for any
--    historical order_items / variants. The public_products view filters
--    on status='active' AND visibility='public' AND show_on_website=true,
--    so archiving removes it from /products and the Hot Chocolate
--    category immediately. product_variants stay attached (FK by id) but
--    are no longer publicly visible (public_product_variants joins the
--    same visibility predicate).
-- ---------------------------------------------------------------------
update public.products
set status          = 'archived',
    visibility      = 'hidden',
    show_on_website = false
where slug = 'raspberry-hot-chocolate';

-- ---------------------------------------------------------------------
-- 2) Flavor Coffee — rename the plain berry product to Blueberry.
--    `raspberry-coffee` (Raspberry Coffee / قهوة توت)
--      → slug `blueberry-coffee`, "Blueberry Coffee" / "قهوة توت أزرق".
--
--    The slug rename is safe: product_variants reference product_id
--    (UUID FK, on delete cascade) — not the slug — so the 3 size variants
--    (250g/500g/1kg) follow automatically. order_items snapshot the slug
--    at purchase time, so historical lines are unaffected.
--
--    Guarded with NOT EXISTS so re-runs and any pre-existing
--    `blueberry-coffee` row never cause a unique-slug collision.
-- ---------------------------------------------------------------------
update public.products
set slug    = 'blueberry-coffee',
    name_en = 'Blueberry Coffee',
    name_ar = 'قهوة توت أزرق'
where slug = 'raspberry-coffee'
  and not exists (
    select 1 from public.products where slug = 'blueberry-coffee'
  );
