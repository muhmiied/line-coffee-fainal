-- =====================================================================
-- Migration:  20260626160000_admin_categories_write
-- Project:    Line Coffee V3
-- Phase:      Admin Categories Write Layer
-- Runs after: 20260626090000_admin_catalog_write_grants
-- =====================================================================
--
-- PURPOSE
--   Let an authenticated admin browser session UPDATE existing categories from
--   the Admin Products → Categories tab (rename, slug, description, status,
--   website visibility, sort order, archive/restore, reorder).
--
-- WHY ONLY A GRANT (no new RLS policy)
--   GRANT (table privilege) and RLS (row policy) are separate layers; a role
--   must pass BOTH. Migration 1 already created the row policy:
--       categories_admin_all  for all using (is_admin()) with check (is_admin())
--   `for all` already covers UPDATE for admins, so NO new policy is needed — the
--   only missing layer is the table-level UPDATE privilege. The earlier
--   read-grants migration granted SELECT only; the product write-grants
--   migration deliberately left categories out. This migration adds the
--   category UPDATE privilege now that category editing is implemented.
--
-- DENORMALIZED SLUG SAFETY (the important part)
--   products.category_slug is a denormalized mirror of categories.slug used by
--   the public_products view and the /products/category/[slug] route. If a
--   category slug is renamed without updating its products, the public category
--   page would query a slug that no product carries and return nothing.
--   To keep this correct ATOMICALLY, a trigger rewrites every child product's
--   category_slug in the SAME transaction as the category slug change. The app
--   then only writes the category row; the DB guarantees consistency.
--
-- SECURITY
--   * anon is NEVER granted anything. Only `authenticated` gets UPDATE, and the
--     existing is_admin() RLS still restricts the actual writes to admins. A
--     signed-in non-admin passes the GRANT but is blocked by RLS and updates
--     zero rows.
--   * RLS stays ENABLED. No policy is created, dropped, or altered.
--   * Only UPDATE is granted — no INSERT, no DELETE. Category create/delete stay
--     out of scope (the admin UI archives instead of deleting).
--   * The sync trigger function is SECURITY INVOKER (default): the cascaded
--     products UPDATE runs as the calling admin and is itself gated by the
--     existing products_admin_all RLS policy + the products UPDATE grant added
--     in 20260626090000. No privilege escalation.
--
-- IDEMPOTENT: re-granting is a no-op; the function uses CREATE OR REPLACE and
--   the trigger is dropped-if-exists before being recreated. Safe to re-run.
--
-- THIS FILE IS AUTHORED ONLY. Apply it with your normal migration workflow
-- (e.g. supabase db push) before testing admin category writes.
-- =====================================================================

grant usage on schema public to authenticated;

grant update on table public.categories to authenticated;

-- ---------------------------------------------------------------------
-- Keep products.category_slug in sync when a category's slug changes.
-- Fires only when slug actually changes (not on sort_order / status edits),
-- so routine category updates stay cheap.
-- ---------------------------------------------------------------------
create or replace function public.sync_products_category_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug then
    update public.products
    set category_slug = new.slug
    where category_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_sync_slug on public.categories;

create trigger trg_categories_sync_slug
  after update of slug on public.categories
  for each row
  execute function public.sync_products_category_slug();
