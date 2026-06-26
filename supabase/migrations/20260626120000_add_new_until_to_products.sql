-- =====================================================================
-- Migration:  20260626120000_add_new_until_to_products
-- Project:    Line Coffee V3
-- Runs after: 20260626090000_admin_catalog_write_grants
-- =====================================================================
--
-- PURPOSE
--   Implement a date-based "New" badge for products.
--   Instead of a static boolean, a timestamptz column (new_until) is the
--   source of truth. The badge is active while new_until > now(), and expires
--   automatically without any cron job.
--
-- BUSINESS RULES
--   - A product is "New" while new_until IS NOT NULL AND new_until > now().
--   - Existing products are NOT affected (new_until defaults to NULL).
--   - When Product Create is implemented, new products should set
--       new_until = now() + interval '40 days'
--     at insert time. This is a reminder; it is NOT implemented here.
--   - Admins can turn New on (sets new_until = now() + 40 days) or off
--     (sets new_until = null) via the Admin Product Drawer → Visibility tab.
--   - After 40 days, the badge disappears automatically (no manual action needed).
--
-- SCHEMA CHANGE (1 column addition)
--   public.products: new_until timestamptz null
--
-- VIEW CHANGE (recreate public_products to expose is_new)
--   public.public_products gains: is_new boolean (computed, not a stored column)
--   All existing columns are preserved unchanged.
--   CREATE OR REPLACE VIEW preserves the view OID and all existing grants.
--   No new GRANT is needed.
--
-- SECURITY
--   - new_until is on the base products table (admin-only via RLS).
--   - is_new (a safe derived boolean) is exposed through the public_products
--     view, which is already granted to anon and authenticated.
--   - purchase_cost_per_kg continues to be excluded from the public view.
--   - No RLS change. No new policy. No new GRANT.
--
-- IDEMPOTENT NOTES
--   The ALTER TABLE ... ADD COLUMN IF NOT EXISTS form is used so this migration
--   is safe to re-run. CREATE OR REPLACE VIEW is always idempotent.
--
-- THIS FILE IS AUTHORED ONLY. It is NOT applied here. No database/Supabase
-- commands are run as part of producing this file. Apply with your normal
-- migration workflow (e.g. supabase db push) before manual testing.
-- =====================================================================


-- ─── 1. Add new_until to products ─────────────────────────────────────────────
--
-- No DEFAULT is set intentionally:
--   - Existing rows receive NULL  →  not New (correct).
--   - New rows inserted via future Product Create should set new_until
--     explicitly at insert time: now() + interval '40 days'.
--   - A DB DEFAULT would silently make all future inserts New even if the
--     insert code forgets to set it, which could surface unexpected badges.
--     Explicit is safer.

alter table public.products
  add column if not exists new_until timestamptz null;

comment on column public.products.new_until is
  'Timestamp until which the New badge is shown. NULL = not New. '
  'Expires automatically; no cron job required. '
  'When Product Create is implemented, set to now() + interval ''40 days'' at insert.';


-- ─── 2. Recreate public_products view with is_new ─────────────────────────────
--
-- CREATE OR REPLACE preserves the existing view OID and its GRANT to
-- anon + authenticated (set in Migration 1). No re-grant needed.
--
-- The is_new expression is evaluated at query time (not stored), so it
-- always reflects the current clock. It is safe to expose publicly:
--   - It is a derived boolean computed from new_until.
--   - new_until itself (the raw timestamp) is NOT exposed to anon/customers.
--   - purchase_cost_per_kg remains excluded.

create or replace view public.public_products
with (security_invoker = false) as
  select
    p.id,
    p.slug,
    p.category_id,
    p.category_slug,
    p.name_en,
    p.name_ar,
    p.subtitle_en,
    p.subtitle_ar,
    p.description_en,
    p.description_ar,
    p.notes_en,
    p.notes_ar,
    p.kind,
    p.pricing_model,
    p.sale_price_per_kg,   -- public sale price; purchase_cost_per_kg is NOT selected
    p.featured,
    p.best_seller,
    p.blend,
    p.image_url,
    p.gallery,
    p.seo_title_en,
    p.seo_title_ar,
    p.seo_description_en,
    p.seo_description_ar,
    -- is_new: true while new_until is set and has not yet passed.
    -- Expires automatically; no cron job required.
    (p.new_until is not null and p.new_until > now()) as is_new
  from public.products p
  where p.status = 'active'
    and p.visibility = 'public'
    and p.show_on_website = true;
