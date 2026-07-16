-- =====================================================================
-- Migration:  20260715120000_phase3_seo_availability_lastmodified
-- Project:    Line Coffee V3
-- Runs after: 20260713161500_phase2_admin_customers_all_segment_counts
-- =====================================================================
--
-- PURPOSE (Phase 3 — SEO/GEO/AEO correctness)
--   Product JSON-LD currently hardcodes `availability: InStock` for every
--   product (src/lib/seo/jsonld.tsx), and the sitemap stamps every product/
--   category URL with the current request time instead of a real
--   last-modified value (src/app/sitemap.ts). Both are SEO-correctness bugs,
--   not business-logic changes. This migration adds two READ-ONLY, derived
--   columns to the existing public catalog views so the server-only SEO
--   reader (src/lib/seo/data.ts) can fix both without ever touching a base
--   table directly or exposing anything new to the browser catalog UI.
--
-- WHY A VIEW CHANGE (not a new table/RPC)
--   The real, authoritative stock signal already exists: `inventory_stock`
--   (product_id, available_kg, reserved_kg) — the same Phase-1/5 ledger the
--   checkout FIFO engine reads. It is admin-only (RLS `is_admin()`, no anon/
--   authenticated grant), so it cannot be queried directly from the browser
--   or the SEO reader. `public_product_variants.stock_state` (Migration 1)
--   is a separate, never-written admin-editable enum with no code path that
--   keeps it in sync with `inventory_stock` — using it for availability
--   would risk showing an equally-wrong signal, just from a different
--   column. So this migration derives a genuine, always-correct boolean
--   from the real ledger and exposes ONLY that boolean — never available_kg,
--   reserved_kg, or any threshold — through the already-public view.
--
-- SCHEMA CHANGE
--   None. No new table, no new column on any base table.
--
-- VIEW CHANGES (both CREATE OR REPLACE — preserve OID + existing grants)
--   public.public_products adds:
--     - is_available boolean   -- standard-kind products: available_kg > 0;
--                                  non-standard kinds (no per-product kg
--                                  ledger applies): true (fail-open, same
--                                  precedent as every other "missing row"
--                                  case in this codebase).
--     - updated_at timestamptz -- coalesce(products.updated_at, created_at),
--                                  so the sitemap gets a real, always-non-null
--                                  last-modified value instead of "now()".
--   public.public_categories adds:
--     - updated_at timestamptz -- coalesce(categories.updated_at, created_at)
--
-- SECURITY
--   - inventory_stock stays admin-only; this migration adds no grant on it.
--   - The LEFT JOIN reads inventory_stock only inside the SECURITY DEFINER-
--     equivalent view context (views run as the view owner here, same as
--     every other public_* view in this project — `security_invoker = false`,
--     matching the existing pattern), so anon/authenticated never gain a
--     direct grant on inventory_stock; they only ever see the derived
--     boolean via the view, exactly like `is_new` was added in
--     20260626120000.
--   - No stock quantity, reserved quantity, or threshold is ever selected.
--   - No RLS policy changes. No new GRANT statements needed (CREATE OR
--     REPLACE VIEW preserves the existing SELECT grants to anon/authenticated
--     from Migration 1).
--
-- IDEMPOTENT: CREATE OR REPLACE VIEW is always safe to re-run.
--
-- THIS FILE IS AUTHORED AND MEANT TO BE APPLIED per this task's instructions
-- (a confirmed SEO/public-projection defect requiring a minimal migration).
-- Apply with `supabase db push --linked`, then confirm with
-- `supabase migration list` that local/remote history match.
-- =====================================================================


-- ─── 1. Recreate public_products with is_available + updated_at ──────────────

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
    -- is_new: true while new_until is set and has not yet passed (unchanged).
    (p.new_until is not null and p.new_until > now()) as is_new,
    -- is_available: derived from the real inventory ledger, never the raw kg.
    -- Non-'standard' kinds (no per-product kg stock model) fail open to true.
    case
      when p.kind = 'standard' then coalesce(inv.available_kg, 0) > 0
      else true
    end as is_available,
    -- Real last-modified for the sitemap (falls back to created_at, so this
    -- is never null even for a row that has never been updated since insert).
    coalesce(p.updated_at, p.created_at) as updated_at
  from public.products p
  left join public.inventory_stock inv on inv.product_id = p.id
  where p.status = 'active'
    and p.visibility = 'public'
    and p.show_on_website = true;


-- ─── 2. Recreate public_categories with updated_at ────────────────────────────

create or replace view public.public_categories
with (security_invoker = false) as
  select
    c.id,
    c.slug,
    c.name_en,
    c.name_ar,
    c.description_en,
    c.description_ar,
    c.image_url,
    c.sort_order,
    coalesce(c.updated_at, c.created_at) as updated_at
  from public.categories c
  where c.status = 'visible'
    and c.show_on_website = true;
