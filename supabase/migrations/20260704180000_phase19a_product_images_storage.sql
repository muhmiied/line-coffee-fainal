-- =====================================================================
-- Migration:  20260704180000_phase19a_product_images_storage
-- Project:    Line Coffee V3
-- Phase:      19A — Product Images + Supabase Storage
-- Runs after: 20260704170000_phase18b_store_closed_and_notification_log
-- =====================================================================
--
-- PURPOSE
--   Create a public Supabase Storage bucket for product images and add safe
--   Storage RLS policies so:
--     * ANYONE (anon + authenticated) can READ product image objects (the public
--       website renders them via <Image>).
--     * ONLY an active admin (public.is_admin()) can UPLOAD / UPDATE / DELETE
--       objects in the bucket.
--
-- IMAGE DATA MODEL — NO NEW TABLE, NO NEW COLUMNS
--   The product image model already exists on public.products:
--       image_url  text   -> the PRIMARY image URL
--       gallery    jsonb  -> ordered array of additional image URLs
--   Both are already:
--     * SELECTed by the public_products view (public site already renders them),
--     * covered by the table-wide UPDATE grant to `authenticated`
--       (20260626090000_admin_catalog_write_grants), and
--     * gated to admins by the products_admin_all RLS policy (is_admin()).
--   So per the "reuse existing fields if present" rule, admin image management
--   writes storage-hosted public URLs into image_url (primary) + gallery
--   (ordered list) through the EXISTING admin catalog write path. This migration
--   therefore only provisions Storage — it does NOT touch public.products, the
--   public_products view, any grant, or any product RLS policy.
--
-- SECURITY
--   * The bucket is PUBLIC read only (needed so <Image> can load the files with
--     the anon key). Write is admin-only through Storage RLS below.
--   * No service-role code anywhere. Uploads run in the admin browser session on
--     the publishable/anon key; the is_admin() policy is the authoritative gate.
--   * bucket-level allowed_mime_types + file_size_limit add defense-in-depth on
--     top of the app-level file validation.
--   * Object keys are product-scoped (`<product_id>/<file>`), enforced by the app.
--
-- IDEMPOTENT: bucket upsert + drop-policy-if-exists/create make this safe to
--   re-run and safe on a db reset.
-- =====================================================================

-- ── 1. Bucket ────────────────────────────────────────────────────────
-- Public-read bucket, capped at 5 MB per object, image mime types only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. Storage RLS policies (on storage.objects) ─────────────────────
-- storage.objects already has RLS enabled by Supabase; we only add policies
-- scoped to bucket_id = 'product-images'. Other buckets are unaffected.

-- Public read: anyone may SELECT (download) objects in this bucket.
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Admin insert (upload): only active admins may add objects here.
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

-- Admin update (e.g. overwrite / metadata): admin-only.
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

-- Admin delete: admin-only.
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
