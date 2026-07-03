-- =====================================================================
-- Migration:  20260703130000_phase12a_admin_customers_read_grants
-- Project:    Line Coffee V3
-- Phase:      12A — Admin Customers real data
-- Runs after: 20260703120000_phase10_11_payments_returns_refunds
-- =====================================================================
--
-- PURPOSE
--   Let an authenticated admin browser session read the `customers` and
--   `customer_addresses` base tables directly, so the Admin Customers module
--   can replace its fully mock dataset with real Supabase-backed customer /
--   address / order data. Also lets an admin persist the one write this phase
--   needs (the customer Tags panel), scoped to a single column.
--
-- WHY ONLY GRANTS (no new RLS policy, no new table)
--   GRANT (table privilege) and RLS (row policy) are two separate layers; a
--   role must pass BOTH. Migration 1 (20260625120000) already created the row
--   policies:
--       customers_admin_all           for all using (is_admin()) with check (is_admin())
--       customer_addresses_admin_all  for all using (is_admin()) with check (is_admin())
--   `for all` already covers SELECT/UPDATE for admins, so no new policy is
--   needed here — the only missing layer is the table-level privilege. This
--   project leaves `auto_expose_new_tables` unset, so base-table privileges
--   are never auto-granted to the Data API roles (same reasoning as
--   20260625203528_admin_catalog_read_grants.sql and
--   20260627110000_admin_orders_status_inventory.sql, which had to grant
--   SELECT on products/orders explicitly for the same reason).
--
-- SECURITY — WHAT THIS DOES AND DOES NOT DO
--   * anon is NEVER granted anything here. Only the logged-in `authenticated`
--     role gets privileges, and the existing is_admin() RLS policies still
--     restrict actual reads/writes to active admin/super_admin users. A
--     signed-in non-admin (or a guest/registered customer session) passes the
--     GRANT layer but is blocked by RLS and sees/changes zero rows.
--   * `customers` gets SELECT only, plus UPDATE restricted to the single
--     `tags` column (column-level GRANT) — the only field the Admin Customers
--     Tags panel writes. No other column (status, type, auth_user_id, email,
--     phone, whatsapp, marketing_opt_in, ...) can be updated through this
--     grant, so even an authenticated-but-non-admin session that somehow
--     bypassed the UI could not use it to rewrite identity/contact fields.
--   * `customer_addresses` gets SELECT only — the Admin Customers detail view
--     is read-only for addresses in this phase; address editing stays a
--     customer-account feature.
--   * RLS remains ENABLED on both tables. No policy is created, dropped, or
--     altered. No DISABLE/BYPASS of RLS anywhere. No new table.
--   * Ownership, checkout, payments, refunds, returns, and inventory/FIFO
--     behavior are entirely untouched by this migration.
--
-- IDEMPOTENT: re-granting an existing privilege is a no-op, so this migration
--   is safe to re-run and safe on a db reset.
-- =====================================================================

grant usage on schema public to authenticated;

grant select on table public.customers to authenticated;
grant select on table public.customer_addresses to authenticated;

grant update (tags) on table public.customers to authenticated;
