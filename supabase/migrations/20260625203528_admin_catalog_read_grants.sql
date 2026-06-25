-- Allow authenticated admin users to read admin catalog base tables.
-- RLS still controls which authenticated users can actually read rows.
-- Public website must continue using public-safe views only.

grant usage on schema public to authenticated;

grant select on table public.categories to authenticated;
grant select on table public.products to authenticated;
grant select on table public.product_variants to authenticated;