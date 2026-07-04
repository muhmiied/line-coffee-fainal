-- =====================================================================
-- Phase 17A — Site Settings table-level grants (browser usability)
-- Migration: 20260704160000_phase17a_site_settings_grants
-- Runs after: 20260703150000_phase13a_seed_launch_blog
-- =====================================================================
-- PURPOSE
--   public.site_settings was created in Migration 1 (20260625120000) with the
--   correct RLS already in place:
--     * site_settings_admin_all   -> admins (is_admin()) read/write ALL rows.
--     * site_settings_public_read  -> anon/authenticated read ONLY rows where
--                                     is_public = true.
--   plus a CHECK that a row can only be is_public = true when scope = 'public'.
--
--   But that table never received a table-level GRANT to the Data API roles.
--   On this project `auto_expose_new_tables` is UNSET, so RLS alone is not
--   enough — a role must ALSO hold the table privilege (GRANT and RLS are two
--   separate permission layers). Without the GRANT, the admin Settings page hits
--   "permission denied for table site_settings" and no public-safe read is
--   possible. This is the same gap that 20260625130000 (admin_users) and
--   20260625203528 (catalog read grants) closed for their tables.
--
--   This migration adds ONLY the missing privileges. It creates no table,
--   changes no schema/column, and creates / drops / alters NO RLS policy. It is
--   additive and idempotent (re-granting an existing privilege is a no-op).
--
-- SECURITY
--   * authenticated: select / insert / update. Row visibility AND writes stay
--     gated by the existing site_settings_admin_all (is_admin()) policy, so only
--     a real admin can read or change settings. DELETE is intentionally NOT
--     granted — the app upserts a fixed set of keys, never deletes.
--   * anon: select only. Gated by site_settings_public_read (is_public = true)
--     and the scope CHECK, so anon can only ever read public-scoped, is_public
--     rows (store name, contact, social links) and never an admin/system row or
--     any private admin data. No anon write.
--   * No service-role code. RLS stays enabled. No policy is touched.
-- =====================================================================

-- Schema USAGE (idempotent; normally already held on Supabase). Makes a fresh
-- environment / db reset self-contained.
grant usage on schema public to anon, authenticated;

-- Admins manage all settings. RLS is_admin() still governs which rows/whether
-- the caller may touch the table. Upsert needs insert + update; no delete.
grant select, insert, update on table public.site_settings to authenticated;

-- Public-safe reads. RLS restricts anon to is_public = true rows only.
grant select on table public.site_settings to anon;

-- =====================================================================
-- FOOTER — SCOPE NOTES
-- =====================================================================
--   - Touches ONLY site_settings privileges. No data seeded, no table created,
--     no schema/RLS change. The Admin Settings page reads existing rows and
--     upserts the brand / contact / social_links / storefront keys on save.
-- =====================================================================
