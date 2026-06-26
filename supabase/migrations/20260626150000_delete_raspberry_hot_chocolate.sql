-- =====================================================================
-- Migration: Hard-delete the plain berry Hot Chocolate
-- =====================================================================
-- Follow-up to 20260626140000_cleanup_berry_blueberry.sql.
--
-- Owner decision: `raspberry-hot-chocolate` (هوت شوكليت توت) must be gone
-- from EVERYWHERE — public site AND admin dashboard. The previous
-- migration only archived it (still visible to admin). This migration
-- removes the row entirely.
--
-- Safety:
--   • product_variants.product_id is a UUID FK with ON DELETE CASCADE,
--     so the 3 size variants (250g/500g/1kg) are removed automatically.
--   • order_items.product_id is ON DELETE SET NULL and snapshots
--     product_slug, so any historical order lines are preserved (the
--     line keeps its slug + price snapshot; only the live FK is nulled).
--
-- Deterministic: targets the EXACT slug. Idempotent: a second run simply
-- deletes zero rows once the product is already gone.
-- =====================================================================

delete from public.products
where slug = 'raspberry-hot-chocolate';
