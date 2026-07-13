-- Public builder catalogs intentionally use owner permissions so the views can
-- read active rows without weakening the admin-only RLS on their base tables.
-- Each projection is security-barrier protected and explicitly excludes all
-- cost, supplier, margin, private-note, and admin metadata columns.

-- Recreate rather than replace because the prior private views included UUID
-- ids that the public builders do not use.
drop view if exists public.public_espresso_beans;
drop view if exists public.public_flavor_bases;
drop view if exists public.public_flavor_items;

create view public.public_espresso_beans
with (security_invoker = false, security_barrier = true) as
  select
    bean_key,
    name_en,
    name_ar,
    family,
    origin_en,
    origin_ar,
    taste_hint_en,
    taste_hint_ar,
    metrics,
    sale_price_per_kg,
    sort_order
  from public.espresso_beans
  where active = true;

create view public.public_flavor_bases
with (security_invoker = false, security_barrier = true) as
  select
    base_key,
    name_en,
    name_ar,
    hint_en,
    hint_ar,
    price_per_kg,
    sort_order
  from public.flavor_bases
  where active = true;

create view public.public_flavor_items
with (security_invoker = false, security_barrier = true) as
  select
    flavor_key,
    name_en,
    name_ar,
    hint_en,
    hint_ar,
    category,
    add_on_per_kg,
    metrics,
    sort_order
  from public.flavor_items
  where active = true;

revoke all on public.public_espresso_beans from public, anon, authenticated;
revoke all on public.public_flavor_bases from public, anon, authenticated;
revoke all on public.public_flavor_items from public, anon, authenticated;

grant select on public.public_espresso_beans to anon, authenticated;
grant select on public.public_flavor_bases to anon, authenticated;
grant select on public.public_flavor_items to anon, authenticated;
