-- Phase 1 (Customer Correctness + Security Hardening) — launch security audit
-- follow-up. Two confirmed, additive, no-behavior-change hardening fixes found
-- via `supabase db advisors --linked` + live `pg_get_functiondef` inspection
-- against the linked remote project. Neither changes pricing, checkout,
-- inventory, RLS row-visibility, or any application-visible behavior.

-- ============================================================================
-- 1) Pin search_path on functions flagged `function_search_path_mutable`
-- ============================================================================
-- The advisor flagged 5 functions with no `SET search_path` at all
-- (set_updated_at, next_order_code, sync_products_category_slug,
-- variant_size_to_kg, resolve_delivery_fee). A 6th, create_admin_product, was
-- found during manual review to pin search_path to 'public' instead of the
-- project's established `''` convention (used by every other SECURITY DEFINER
-- function in this codebase). Every one of these six was inspected via
-- pg_get_functiondef and confirmed to either reference no schema objects at
-- all, or fully schema-qualify every reference it does make (e.g.
-- `public.products`, `public.order_code_seq`) — so pinning search_path to ''
-- cannot change behavior; it only removes reliance on the caller's session
-- search_path for name resolution. Applied via ALTER FUNCTION (not a body
-- redefinition) to eliminate any risk of a transcription error changing logic.
alter function public.set_updated_at() set search_path = '';
alter function public.next_order_code() set search_path = '';
alter function public.sync_products_category_slug() set search_path = '';
alter function public.variant_size_to_kg(text) set search_path = '';
alter function public.resolve_delivery_fee(text, text) set search_path = '';
alter function public.create_admin_product(
  uuid, text, text, text, text, text, numeric, numeric, numeric, numeric,
  boolean, boolean, timestamp with time zone, boolean
) set search_path = '';

-- ============================================================================
-- 2) Revoke residual TRUNCATE from anon/authenticated on all public tables
-- ============================================================================
-- A live grants audit (information_schema.role_table_grants) found every
-- table in `public` still carries a TRUNCATE grant to anon and/or
-- authenticated, left over from the project's initial default-privilege
-- bootstrap and never revoked when each table's real RLS/grant model was
-- built out. Row Level Security does not govern TRUNCATE (it is a table-level
-- operation, not row-level), and no application code ever issues TRUNCATE
-- from the client. PostgREST's REST/RPC surface has no mechanism to send a
-- raw TRUNCATE today, so this was not reachable through the actual anon-key
-- attack surface — but it is unused, unnecessary privilege surface, so it is
-- revoked here as defense-in-depth. REFERENCES/TRIGGER grants are left as-is:
-- both require DDL privileges (CREATE) that anon/authenticated do not hold
-- and cannot obtain through the client surface, so they are inert.
revoke truncate on all tables in schema public from anon, authenticated;
