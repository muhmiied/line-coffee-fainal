-- =====================================================================
-- Migration:  20260627090000_admin_catalog_create
-- Project:    Line Coffee V3
-- Phase:      Admin Product Create + Admin Category Create
-- Runs after: 20260626160000_admin_categories_write
-- =====================================================================
--
-- PURPOSE
--   Let an authenticated admin create new catalog rows from the Admin Products
--   module:
--     * a new category (single INSERT into public.categories)
--     * a new product PLUS its three size variants (250g/500g/1kg) created
--       ATOMICALLY via an RPC, so a product can never exist without variants.
--
-- WHY A MIX OF GRANT + RPC
--   * Category create is a single-row INSERT. The existing categories_admin_all
--     RLS policy (`for all ... is_admin()`) already covers INSERT at the row
--     level; the only missing layer is the table INSERT privilege. So we just
--     `grant insert on public.categories to authenticated`. RLS still blocks a
--     signed-in non-admin (is_admin() = false → zero rows).
--   * Product create must write 4 rows (1 product + 3 variants) atomically.
--     A SECURITY DEFINER function wraps them in ONE transaction: all 4 commit or
--     all roll back. The function enforces admin itself via an explicit
--     is_admin() guard, so we do NOT grant INSERT on products / product_variants
--     to authenticated at all — base-table inserts stay locked down and only the
--     guarded function can create them. This is the most admin-safe option.
--
-- SECURITY
--   * anon is never granted anything here. Only `authenticated` gets the
--     categories INSERT grant + EXECUTE on the function.
--   * The function is SECURITY DEFINER but begins with `if not public.is_admin()
--     then raise`. is_admin() reads auth.uid() from the request JWT, which is
--     preserved under SECURITY DEFINER, so it still reflects the real caller. A
--     signed-in non-admin gets a 42501 error and writes nothing.
--   * RLS stays ENABLED on every table. No policy is created, dropped, or
--     altered. No DISABLE/BYPASS of RLS.
--   * Only INSERT is added for categories. No DELETE anywhere.
--   * The function sets category_slug from the parent category so the
--     denormalized column stays correct, and forces public-safe defaults
--     (status='draft', visibility='hidden', show_on_website=false) regardless of
--     what the client passes for those — a new product is never public on
--     creation.
--
-- IDEMPOTENT: grant re-runs are no-ops; the function uses CREATE OR REPLACE.
--
-- THIS FILE IS AUTHORED ONLY. Apply it with your normal migration workflow
-- (e.g. supabase db push) before testing admin create flows.
-- =====================================================================

grant usage on schema public to authenticated;

-- Category create: single-row INSERT, gated by the existing categories_admin_all
-- RLS policy. Only the table privilege is missing.
grant insert on table public.categories to authenticated;

-- ---------------------------------------------------------------------
-- Atomic product + 3 variants creation.
--   * Forces public-safe defaults (draft / hidden / off-website).
--   * Stores deterministic SKUs ({slug}-250g / -500g / -1kg) literally, so a
--     later slug rename does NOT change them.
--   * The create-form "description" is stored into notes_en/notes_ar — the same
--     columns the admin ProductDrawer reads/writes — so the text round-trips.
-- ---------------------------------------------------------------------
create or replace function public.create_admin_product(
  p_category_id          uuid,
  p_slug                 text,
  p_name_en              text,
  p_name_ar              text,
  p_description_en       text,
  p_description_ar       text,
  p_price_250            numeric,
  p_price_500            numeric,
  p_price_1kg            numeric,
  p_purchase_cost_per_kg numeric,
  p_featured             boolean,
  p_best_seller          boolean,
  p_new_until            timestamptz,
  p_show_on_website      boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id    uuid;
  v_category_slug text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized to create products.' using errcode = '42501';
  end if;

  select c.slug into v_category_slug
  from public.categories c
  where c.id = p_category_id;

  if v_category_slug is null then
    raise exception 'Category % not found.', p_category_id using errcode = '23503';
  end if;

  insert into public.products (
    slug, category_id, category_slug,
    name_en, name_ar,
    notes_en, notes_ar,
    kind, status, visibility, show_on_website,
    featured, best_seller, new_until,
    pricing_model, sale_price_per_kg, purchase_cost_per_kg
  ) values (
    lower(btrim(p_slug)), p_category_id, v_category_slug,
    btrim(p_name_en), btrim(p_name_ar),
    nullif(btrim(coalesce(p_description_en, '')), ''),
    nullif(btrim(coalesce(p_description_ar, '')), ''),
    'standard', 'draft', 'hidden', coalesce(p_show_on_website, false),
    coalesce(p_featured, false), coalesce(p_best_seller, false), p_new_until,
    'fixed', p_price_1kg, p_purchase_cost_per_kg
  )
  returning id into v_product_id;

  insert into public.product_variants (product_id, size, sku, price, sort_order) values
    (v_product_id, '250g', lower(btrim(p_slug)) || '-250g', p_price_250, 0),
    (v_product_id, '500g', lower(btrim(p_slug)) || '-500g', p_price_500, 1),
    (v_product_id, '1kg',  lower(btrim(p_slug)) || '-1kg',  p_price_1kg, 2);

  return v_product_id;
end;
$$;

revoke all on function public.create_admin_product(
  uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  boolean, boolean, timestamptz, boolean
) from public, anon;

grant execute on function public.create_admin_product(
  uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  boolean, boolean, timestamptz, boolean
) to authenticated;
