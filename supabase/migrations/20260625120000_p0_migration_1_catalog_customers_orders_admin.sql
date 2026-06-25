-- =====================================================================
-- SECTION 1 — MIGRATION HEADER
-- =====================================================================
--
-- Migration:  20260625120000_p0_migration_1_catalog_customers_orders_admin
-- Project:    Line Coffee V3
-- Phase:      Phase 6 — P0 Migration 1 (first real-data foundation)
--
-- PURPOSE
--   Define the minimum real database foundation for the first vertical slice
--   of the launch path:
--
--     DB-backed categories / products / product_variants
--       -> future checkout createOrder (writes orders + order_items)
--       -> Admin Orders reads the same orders
--       -> Customer Account reads the same orders
--
--   This moves the project toward the correct direction:
--     Admin Dashboard -> Supabase Database -> Public Website / Account / Admin
--   (NOT: mock files -> UI).
--
-- SCHEMA AUTHORITY
--   The canonical TypeScript data contracts in `src/lib/types/*`
--   (common/category/product/customer/order/admin/settings) are the schema
--   authority for this migration, together with the Operating Model Blueprint
--   (docs/ai/LINE_COFFEE_V3_OPERATING_MODEL_BLUEPRINT.md). Mock files were used
--   only as discovery/seed references, never as schema authority.
--
-- SCOPE — TABLES CREATED (10):
--   admin_users, categories, products, product_variants, customers,
--   customer_addresses, orders, order_items, order_status_events, site_settings
--
-- EXPLICIT NON-GOALS / DEFERRED (NOT created in this migration):
--   This migration does NOT seed any data (no products, no categories, no
--   orders, no customers, no accounting, no analytics, no notifications, no
--   admin users). Seeding is a later, separate task.
--
--   This migration does NOT implement inventory, accounting, promotions/offers,
--   announcement bar, CMS (blog/reviews/legal/contact), analytics, notifications,
--   audit logs, suppliers/purchases/expenses, espresso/flavor catalogs,
--   multi-staff role tables, website_pages/page_sections, or Media Studio
--   (media_assets). Those domains arrive in later migrations.
--
--   No payment-gateway logic is implemented; payment columns are data only.
--   No server actions, no application wiring, no triggers that depend on app code.
--
-- CONVENTIONS (approved for Migration 1):
--   - IDs: uuid primary keys, default gen_random_uuid().
--   - Localized short labels: explicit paired columns (name_en/name_ar, ...).
--     jsonb is used only for structured snapshots and rich/variable content.
--   - Enums: text columns + CHECK constraints (no native PostgreSQL enum types).
--   - Money: numeric(12,2). NOTE: the TS `Money` contract is integer EGP; the
--     future server/data layer maps numeric(12,2) <-> number.
--   - Blend stored as jsonb on products (NOT normalized to a
--     product_blend_components table yet — see comment in Section 5).
--   - Order snapshots stored as jsonb (customer_snapshot / address_snapshot)
--     plus denormalized display/search columns.
--
-- PLATFORM NOTES (Supabase):
--   - gen_random_uuid() is built into PostgreSQL 13+ (Supabase runs 15+); no
--     extension is strictly required. pgcrypto is created defensively below.
--   - `auth.users` and `auth.uid()` are provided by Supabase Auth.
--   - The Supabase `service_role` has BYPASSRLS, so future server-side seeding
--     and the createOrder server action can write through RLS without explicit
--     "service role" policies. Customer/admin access is granted via policies.
--
-- THIS FILE IS AUTHORED ONLY. It is NOT applied here. No database/Supabase
-- commands are run as part of producing this file.
-- =====================================================================


-- =====================================================================
-- SECTION 2 — EXTENSIONS / SHARED HELPERS
-- =====================================================================

-- gen_random_uuid() is core in PG13+. pgcrypto also provides it; created
-- defensively (no-op if already installed on the Supabase instance).
create extension if not exists pgcrypto;

-- Generic updated_at maintenance trigger. Attached to every table that has an
-- updated_at column (Section 14). Pure SQL/PLPGSQL, no app dependency.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: the admin authorization helpers is_admin()/is_super_admin() are defined
-- in Section 3, immediately AFTER admin_users exists (they query that table).
-- The order-code sequence + next_order_code() helper are defined in Section 9,
-- next to the orders table.


-- =====================================================================
-- SECTION 3 — admin_users  (+ authorization helpers)
-- =====================================================================
-- Canonical admin identity. Closes the launch-critical security gap where the
-- admin area is gated only by a localStorage auto-seed. At launch this is
-- owner-first (super_admin); 'admin' and 'viewer' tiers exist in the contract
-- but no multi-staff role tables are built yet.
-- Contract: src/lib/types/admin.ts (AdminUser, AdminRole, AdminUserStatus,
-- AdminPermission, ADMIN_ROLE_PERMISSIONS).

create table public.admin_users (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text,
  role          text not null default 'viewer'
                  check (role in ('super_admin', 'admin', 'viewer')),
  status        text not null default 'active'
                  check (status in ('active', 'disabled')),
  -- Per-user permission overrides. When null, the role's default set applies
  -- (ADMIN_ROLE_PERMISSIONS in the contract). Validated against the launch
  -- permission vocabulary so unknown permission strings are rejected.
  permissions   text[]
                  check (
                    permissions is null
                    or permissions <@ array[
                      'dashboard.read',
                      'products.manage',
                      'categories.manage',
                      'orders.manage',
                      'customers.manage',
                      'inventory.manage',
                      'accounting.manage',
                      'marketing.manage',
                      'cms.manage',
                      'settings.manage',
                      'admin_users.manage'
                    ]::text[]
                  ),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  last_login_at timestamptz
);

-- Case-insensitive unique email.
create unique index admin_users_email_lower_key on public.admin_users (lower(email));

alter table public.admin_users enable row level security;

-- Authorization helpers. SECURITY DEFINER so they read admin_users as the table
-- owner and therefore do NOT recurse through admin_users' own RLS policies.
-- search_path is pinned to avoid hijacking.
--
-- SECURITY (Codex review, Finding 3): these are NO-ARGUMENT helpers that read
-- auth.uid() internally. They deliberately do NOT accept an arbitrary user_id,
-- so they cannot be used as an "is this UUID an admin?" oracle. They return
-- false when auth.uid() is null (unauthenticated). EXECUTE is revoked from
-- PUBLIC + anon and granted only to `authenticated` (the role whose RLS policies
-- evaluate them); anon never evaluates an admin policy, so anon needs no EXECUTE.
-- (auth.uid() reads the per-request JWT claim, so even under SECURITY DEFINER
-- these resolve the CURRENT caller, not the function owner.)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.admin_users a
      where a.auth_user_id = auth.uid()
        and a.status = 'active'
        and a.role in ('super_admin', 'admin')
    );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.admin_users a
      where a.auth_user_id = auth.uid()
        and a.status = 'active'
        and a.role = 'super_admin'
    );
$$;

-- Lock down execution: remove the default PUBLIC grant (which would let anon
-- probe admin membership) and grant only to authenticated, whose RLS policies
-- evaluate these helpers. anon is revoked explicitly in case a Supabase default
-- privilege granted it directly.
revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
revoke all on function public.is_super_admin() from public;
revoke all on function public.is_super_admin() from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;


-- =====================================================================
-- SECTION 4 — categories
-- =====================================================================
-- Single category source for website nav, category pages, product filters, and
-- the admin Products -> Categories tab. Contract: src/lib/types/category.ts.

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name_en         text not null,
  name_ar         text not null,
  description_en  text,
  description_ar  text,
  status          text not null default 'visible'
                    check (status in ('visible', 'hidden', 'draft', 'archived')),
  -- Independent of status: a 'visible' category can still be kept off the site.
  show_on_website boolean not null default true,
  sort_order      integer not null default 0 check (sort_order >= 0),
  image_url       text,
  source          text check (source in ('catalog', 'admin', 'system')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index categories_status_show_idx on public.categories (status, show_on_website);
create index categories_sort_order_idx  on public.categories (sort_order);

alter table public.categories enable row level security;
-- RLS: admin read/write via policies (Section 15). Public read is provided
-- exclusively through the public_categories view (Section 13) for a uniform,
-- safe public-read surface — the base table is not anon-readable.


-- =====================================================================
-- SECTION 5 — products
-- =====================================================================
-- Canonical product. Merges the website catalog product and the admin product
-- meta into one shape; per-size pricing lives in product_variants (Section 6).
-- Contract: src/lib/types/product.ts.

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  category_id          uuid not null references public.categories (id) on delete restrict,
  -- Denormalized category slug for fast website routing/filtering without a join.
  category_slug        text,
  name_en              text not null,
  name_ar              text not null,
  subtitle_en          text,
  subtitle_ar          text,
  description_en       text,
  description_ar       text,
  notes_en             text,
  notes_ar             text,
  kind                 text not null default 'standard'
                         check (kind in ('standard', 'custom_espresso', 'custom_flavor')),
  status               text not null default 'draft'
                         check (status in ('active', 'draft', 'archived')),
  visibility           text not null default 'public'
                         check (visibility in ('public', 'hidden')),
  show_on_website      boolean not null default true,
  featured             boolean not null default false,
  best_seller          boolean not null default false,
  pricing_model        text not null default 'fixed'
                         check (pricing_model in ('fixed', 'per_kg', 'custom_builder')),
  -- Per-kg sale price for 'per_kg' products (loose origin beans).
  sale_price_per_kg    numeric(12,2) check (sale_price_per_kg is null or sale_price_per_kg >= 0),
  -- PRIVATE per-kg purchase cost. Admin/accounting only. MUST NOT be exposed to
  -- anon/customers — see the public_products view (Section 13) which omits it.
  purchase_cost_per_kg numeric(12,2) check (purchase_cost_per_kg is null or purchase_cost_per_kg >= 0),
  -- Blend composition as jsonb for Migration 1 (e.g. array of
  -- { origin_en, origin_ar, bean_type, percentage }). It is intentionally NOT a
  -- product_blend_components table yet; normalize to a child table later if the
  -- blend ever needs FK links to an espresso_beans catalog.
  blend                jsonb,
  image_url            text,
  -- Gallery as jsonb (array of image refs) until a media_assets table exists.
  gallery              jsonb,
  seo_title_en         text,
  seo_title_ar         text,
  seo_description_en   text,
  seo_description_ar   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

comment on column public.products.purchase_cost_per_kg is
  'PRIVATE cost. Never expose to anon/customers. Excluded from public_products view.';
comment on column public.products.blend is
  'Migration 1 jsonb blend snapshot. Normalize to product_blend_components later if FK links to espresso_beans are needed.';

create index products_category_id_idx     on public.products (category_id);
create index products_status_vis_show_idx on public.products (status, visibility, show_on_website);
-- Partial indexes for the common "featured" / "best seller" website queries.
create index products_featured_idx        on public.products (id) where featured;
create index products_best_seller_idx     on public.products (id) where best_seller;

alter table public.products enable row level security;
-- CRITICAL COST SECURITY: no broad public SELECT policy on this base table.
-- The base table is admin-only (Section 15). Public read happens ONLY through
-- the cost-free public_products view (Section 13).


-- =====================================================================
-- SECTION 6 — product_variants
-- =====================================================================
-- Purchasable size of a product (250g / 500g / 1kg). Contract: ProductVariant
-- in src/lib/types/product.ts.

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  size             text not null check (size in ('250g', '500g', '1kg')),
  sku              text,
  price            numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  stock_state      text check (stock_state in ('in_stock', 'low_stock', 'out_of_stock')),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  -- One row per size per product.
  constraint product_variants_product_size_key unique (product_id, size),
  -- A strike-through compare price must not be below the actual price.
  constraint product_variants_compare_gte_price_chk
    check (compare_at_price is null or compare_at_price >= price)
);

-- SKU unique only when present.
create unique index product_variants_sku_key on public.product_variants (sku) where sku is not null;
create index product_variants_product_id_idx on public.product_variants (product_id);

alter table public.product_variants enable row level security;
-- Public read only through the public_product_variants view (Section 13), gated
-- on the parent product being published. Base table is admin-only (Section 15).


-- =====================================================================
-- SECTION 7 — customers
-- =====================================================================
-- Canonical customer ledger. Guests are valid customers (type='guest', no auth
-- link). Registered customers link to a Supabase Auth user via auth_user_id.
-- Contract: src/lib/types/customer.ts.

create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  -- Null/absent for guests; set for registered customers.
  auth_user_id       uuid references auth.users (id) on delete set null,
  type               text not null default 'guest'
                       check (type in ('guest', 'registered')),
  status             text not null default 'active'
                       check (status in ('active', 'inactive', 'blocked')),
  name               text not null,
  email              text,
  phone              text,
  -- WhatsApp is the primary contact channel and is required + non-empty.
  whatsapp           text not null check (btrim(whatsapp) <> ''),
  avatar_url         text,
  marketing_opt_in   boolean not null default false,
  tags               text[] not null default '{}',
  -- SECURITY (Codex review, Finding 2): no customers.default_address_id in
  -- Migration 1. An FK column on customers cannot guarantee the referenced
  -- address belongs to the same customer (ownership escape risk). The default
  -- address is instead DERIVED from customer_addresses.is_default, enforced one
  -- per customer by the partial unique index in Section 8. A same-customer-
  -- validated default pointer can be reintroduced later via a trigger/constraint.
  joined_at          date not null default current_date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

-- A given auth user maps to at most one customer row (guests have null).
create unique index customers_auth_user_id_key on public.customers (auth_user_id) where auth_user_id is not null;
create index customers_whatsapp_idx   on public.customers (whatsapp);
create index customers_phone_idx      on public.customers (phone);
create index customers_email_idx      on public.customers (email);
create index customers_type_status_idx on public.customers (type, status);

alter table public.customers enable row level security;
-- RLS: customers read their own row (no direct customer UPDATE — see Finding 1
-- in Section 15); admins read/write all. Guest rows are created by the future
-- service-role checkout action (service_role bypasses RLS). No anon/public
-- access (Section 15).


-- =====================================================================
-- SECTION 8 — customer_addresses
-- =====================================================================
-- Saved delivery addresses. Contract: CustomerAddress in
-- src/lib/types/customer.ts.

create table public.customer_addresses (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers (id) on delete cascade,
  label          text not null,
  recipient_name text,
  phone          text,
  whatsapp       text,
  governorate    text not null,
  city           text not null,
  area           text,
  street         text not null,
  building       text,
  floor          text,
  apartment      text,
  landmark       text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index customer_addresses_customer_id_idx on public.customer_addresses (customer_id);
-- At most one default address per customer. This partial unique index is the
-- single source of truth for the customer's default address — Migration 1 has
-- no customers.default_address_id pointer (see Finding 2 note in Section 7).
create unique index customer_addresses_one_default_idx
  on public.customer_addresses (customer_id) where is_default;

alter table public.customer_addresses enable row level security;
-- RLS: a customer manages their own addresses (via customer ownership); admins
-- read/write all (Section 15).


-- =====================================================================
-- SECTION 9 — orders  (+ order-code sequence/helper)
-- =====================================================================
-- The launch keystone. One orders table feeding the website success page, Admin
-- Orders, Customer Account, and (later) Accounting. Identity + delivery details
-- are frozen as jsonb snapshots at purchase time so later edits never rewrite
-- history; denormalized columns support search/display without parsing jsonb.
-- Contract: src/lib/types/order.ts (Order, OrderStatus, PaymentMethod, ...).

-- Order-code sequence + helper. The future createOrder server action assigns
-- orders.code by calling next_order_code() inside its transaction; this keeps
-- code generation atomic and in one controlled place. The column is therefore
-- NOT given a DEFAULT here. Format: LC-000001 (6-digit zero-padded, growable).
create sequence if not exists public.order_code_seq as bigint start with 1 increment by 1 minvalue 1 cache 1;

create or replace function public.next_order_code()
returns text
language sql
volatile
as $$
  select 'LC-' || lpad(nextval('public.order_code_seq')::text, 6, '0');
$$;

-- Order codes are minted server-side only (the createOrder action runs as
-- service_role). Lock execution down so anon/authenticated can't burn the
-- sequence.
revoke all on function public.next_order_code() from public, anon, authenticated;
grant execute on function public.next_order_code() to service_role;

-- SECURITY (Codex review, Finding 4): harden the sequence itself so order codes
-- cannot be minted (nextval) by anyone but the server. Revoke the default grants
-- and grant only USAGE to service_role, which next_order_code() needs for
-- nextval(). next_order_code() stays SECURITY INVOKER + service-role-only.
revoke all on sequence public.order_code_seq from public;
revoke all on sequence public.order_code_seq from anon;
revoke all on sequence public.order_code_seq from authenticated;
grant usage on sequence public.order_code_seq to service_role;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  -- Human-facing order code (e.g. LC-000123). Unique; assigned by createOrder.
  code              text not null unique,
  -- Link to a customer record; null for pure-guest orders with no customer row.
  -- RESTRICT prevents deleting a customer who has orders.
  customer_id       uuid references public.customers (id) on delete restrict,
  -- Frozen identity + delivery address at purchase time (jsonb snapshots).
  customer_snapshot jsonb not null,
  address_snapshot  jsonb not null,
  -- Denormalized display/search columns (mirror the snapshots).
  customer_name     text not null,
  customer_whatsapp text,
  governorate       text,
  status            text not null default 'pending'
                      check (status in ('pending', 'preparing', 'shipped',
                                        'delivered', 'cancelled', 'returned')),
  type              text not null default 'standard'
                      check (type in ('standard', 'custom_espresso',
                                      'custom_flavor', 'mixed')),
  channel           text not null default 'website'
                      check (channel in ('website', 'admin', 'whatsapp', 'manual')),
  subtotal          numeric(12,2) not null check (subtotal >= 0),
  discount_total    numeric(12,2) not null default 0 check (discount_total >= 0),
  delivery_fee      numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total             numeric(12,2) not null check (total >= 0),
  promo_code        text,
  payment_method    text not null default 'cash_on_delivery'
                      check (payment_method in ('cash_on_delivery', 'vodafone_cash',
                                                'instapay', 'bank_transfer',
                                                'card', 'unknown')),
  payment_status    text not null default 'unpaid'
                      check (payment_status in ('unpaid', 'partially_paid', 'paid',
                                                'refunded', 'failed')),
  placed_at         timestamptz not null default now(),
  updated_at        timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  returned_at       timestamptz,
  admin_note        text,
  customer_note     text
);

comment on column public.orders.customer_snapshot is
  'Frozen CustomerSnapshot (jsonb) at purchase time. Source of truth for who ordered, even if the customer record later changes.';
comment on column public.orders.address_snapshot is
  'Frozen AddressSnapshot (jsonb) at purchase time. Delivery destination as it was when ordered.';

create index orders_customer_id_idx     on public.orders (customer_id);
create index orders_status_idx          on public.orders (status);
create index orders_placed_at_idx       on public.orders (placed_at desc);
create index orders_payment_status_idx  on public.orders (payment_status);

alter table public.orders enable row level security;
-- RLS: admin/service-role ONLY on the base table (Section 15). There is NO
-- direct customer SELECT here — that would expose the whole row including the
-- internal admin_note (RLS is row-level, not column-level). Customer order reads
-- are deferred to a future customer-safe view/RPC. Inserts are future
-- service-role createOrder only — no anon or direct customer insert policy.


-- =====================================================================
-- SECTION 10 — order_items
-- =====================================================================
-- Order lines. Product/variant references and all prices are SNAPSHOTS at
-- purchase time so later catalog edits never rewrite order history. Builder
-- lines carry a custom_data jsonb snapshot. Contract: OrderItem in
-- src/lib/types/order.ts.

create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  kind              text not null
                      check (kind in ('product', 'custom_espresso', 'custom_flavor',
                                      'shipping', 'discount_adjustment')),
  -- Soft references: keep the line even if the catalog row is later deleted.
  product_id        uuid references public.products (id) on delete set null,
  product_slug      text,
  variant_id        uuid references public.product_variants (id) on delete set null,
  variant_size      text check (variant_size in ('250g', '500g', '1kg')),
  name_en           text not null,
  name_ar           text not null,
  detail_en         text,
  detail_ar         text,
  sku               text,
  unit_price        numeric(12,2) not null check (unit_price >= 0),
  quantity          integer not null check (quantity > 0),
  line_total        numeric(12,2) not null check (line_total >= 0),
  -- PRIVATE cost of goods for this line. Admin/accounting only — used for
  -- COGS/profit on delivery. MUST NOT be exposed to anon/customers.
  line_cogs         numeric(12,2) check (line_cogs is null or line_cogs >= 0),
  returned_quantity integer not null default 0,
  -- Builder snapshot (EspressoOrderData / FlavorOrderData) when kind is custom.
  custom_data       jsonb,
  created_at        timestamptz not null default now(),
  constraint order_items_returned_qty_chk
    check (returned_quantity >= 0 and returned_quantity <= quantity)
);

comment on column public.order_items.line_cogs is
  'PRIVATE cost of goods. Never expose to anon/customers. Customer-facing order detail must use a cost-free view/RPC.';

create index order_items_order_id_idx   on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

alter table public.order_items enable row level security;
-- CRITICAL COST SECURITY: order_items carries line_cogs. Because RLS is
-- row-level (cannot hide a single column), the base table is admin-only
-- (Section 15). The customer-facing order detail will read through a future
-- cost-free customer-safe view/RPC (deferred — see Section 15 + footer).


-- =====================================================================
-- SECTION 11 — order_status_events
-- =====================================================================
-- Append-only audit trail of order status transitions. Contract:
-- OrderStatusEvent in src/lib/types/order.ts.

create table public.order_status_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  status     text not null
               check (status in ('pending', 'preparing', 'shipped',
                                 'delivered', 'cancelled', 'returned')),
  note       text,
  -- Admin/system actor (user id or display name).
  changed_by text,
  changed_at timestamptz not null default now()
);

create index order_status_events_order_changed_idx
  on public.order_status_events (order_id, changed_at);

alter table public.order_status_events enable row level security;
-- RLS: admins read + insert (append-only — no update/delete policy is granted,
-- so even admins cannot rewrite history through RLS; service_role can correct
-- data if ever needed). Customer timeline read is DEFERRED (Section 15).


-- =====================================================================
-- SECTION 12 — site_settings
-- =====================================================================
-- Single key/value store for site-wide config (delivery fees, contact info,
-- payment methods, brand/SEO, ...). `is_public` is the hard read-gate for anon.
-- Contract: src/lib/types/settings.ts (SiteSetting, SiteSettingScope).

create table public.site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  scope      text not null check (scope in ('public', 'admin', 'system')),
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_by uuid references public.admin_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- SECURITY (Codex review, Finding 5): a row can only be public if its scope is
  -- 'public'. Prevents accidentally exposing an admin/system-scoped row by
  -- flipping is_public = true. The is_public read-gate policy then applies on top.
  constraint site_settings_public_requires_public_scope_chk
    check (is_public = false or scope = 'public')
);

create index site_settings_is_public_idx on public.site_settings (is_public);

alter table public.site_settings enable row level security;
-- RLS: anon/authenticated read only rows where is_public = true; admins
-- read/write all (Section 15).


-- =====================================================================
-- SECTION 13 — PUBLIC-SAFE VIEWS
-- =====================================================================
-- The ONLY public (anon/authenticated) read surface for catalog data. These
-- views run with DEFINER semantics (security_invoker = false) on purpose: the
-- base tables (categories/products/product_variants) keep RLS with no anon
-- policy, and these views expose just the safe columns of just the published
-- rows. This is what protects private cost columns at the column level — RLS
-- alone cannot hide a single column. (Supabase's linter will flag these as
-- "security definer view"; that is intentional and reviewed here.)
--
-- public_products EXCLUDES purchase_cost_per_kg.
-- public_product_variants EXCLUDES sku (internal) and exposes only display/
-- pricing fields, gated on the parent product being published.

create view public.public_categories
with (security_invoker = false) as
  select
    c.id,
    c.slug,
    c.name_en,
    c.name_ar,
    c.description_en,
    c.description_ar,
    c.image_url,
    c.sort_order
  from public.categories c
  where c.status = 'visible'
    and c.show_on_website = true;

create view public.public_products
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
    p.sale_price_per_kg,   -- public sale price is safe; purchase_cost_per_kg is NOT selected
    p.featured,
    p.best_seller,
    p.blend,
    p.image_url,
    p.gallery,
    p.seo_title_en,
    p.seo_title_ar,
    p.seo_description_en,
    p.seo_description_ar
  from public.products p
  where p.status = 'active'
    and p.visibility = 'public'
    and p.show_on_website = true;

create view public.public_product_variants
with (security_invoker = false) as
  select
    v.id,
    v.product_id,
    v.size,
    v.price,
    v.compare_at_price,
    v.stock_state,
    v.sort_order
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where p.status = 'active'
    and p.visibility = 'public'
    and p.show_on_website = true;

-- Expose the views (and only the views) to public roles.
grant select on public.public_categories       to anon, authenticated;
grant select on public.public_products          to anon, authenticated;
grant select on public.public_product_variants  to anon, authenticated;


-- =====================================================================
-- SECTION 14 — updated_at TRIGGERS
-- =====================================================================
-- Attach set_updated_at() to every table that has an updated_at column.
-- (order_items and order_status_events are intentionally excluded: order items
-- are immutable snapshots; status events are append-only.)

create trigger trg_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create trigger trg_customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger trg_site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECTION 15 — RLS POLICIES
-- =====================================================================
-- RLS is enabled on every table above. service_role (Supabase) has BYPASSRLS,
-- so future server-side seeding and the createOrder server action write without
-- needing explicit "service role" policies. Policies below cover admin and
-- customer access. Where a customer-facing read would expose a private cost
-- column, the policy is intentionally DEFERRED (noted inline) in favor of a
-- future cost-free view/RPC. Better to be restrictive now than to leak
-- cost/customer/order data.

-- ---- admin_users -----------------------------------------------------
-- An admin can read their own row; super_admins manage all admin users.
create policy admin_users_self_read on public.admin_users
  for select to authenticated
  using (auth_user_id = auth.uid());

create policy admin_users_super_admin_all on public.admin_users
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---- categories ------------------------------------------------------
-- Admin read/write all. Public read is via public_categories (Section 13).
create policy categories_admin_all on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- products --------------------------------------------------------
-- Admin read/write all. NO anon policy (cost protection). Public read is via
-- public_products (Section 13), which omits purchase_cost_per_kg.
create policy products_admin_all on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- product_variants ------------------------------------------------
-- Admin read/write all. Public read is via public_product_variants (Section 13).
create policy product_variants_admin_all on public.product_variants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- customers -------------------------------------------------------
-- A registered customer reads ONLY their own row. Admins manage all. Guest rows
-- are created by the service-role checkout action (no anon insert).
create policy customers_self_read on public.customers
  for select to authenticated
  using (auth_user_id = auth.uid());

-- SECURITY (Codex review, Finding 1): NO direct customer UPDATE policy on the
-- base table. A broad self-update would let a customer change admin-controlled
-- fields (status, type, tags, joined_at, ...). Customer profile edits are
-- DEFERRED to a future server-side action/RPC that whitelists only safe-to-edit
-- fields (e.g. name, phone, whatsapp, avatar_url, marketing_opt_in). Until then
-- customers can read but not write their row; admins (and service_role) write.

create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- customer_addresses ----------------------------------------------
-- A customer manages addresses that belong to their own customer row. The
-- EXISTS subquery resolves through the customer's own (self-read) RLS, so no
-- recursion. Admins manage all.
create policy customer_addresses_owner_all on public.customer_addresses
  for all to authenticated
  using (
    exists (
      select 1 from public.customers c
      where c.id = customer_addresses.customer_id
        and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customers c
      where c.id = customer_addresses.customer_id
        and c.auth_user_id = auth.uid()
    )
  );

create policy customer_addresses_admin_all on public.customer_addresses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- orders ----------------------------------------------------------
-- SECURITY (Codex review 2, HIGH): NO direct customer SELECT policy on the base
-- orders table. RLS is row-level, not column-level — a customer-own SELECT would
-- expose the entire row, including the internal `admin_note` (and any future
-- private columns). The base table is therefore admin/service-role ONLY.
-- `admin_note` stays in the orders table for admin use; it is simply never
-- reachable by customers because no customer policy exists here.
--
-- Customer order reads (Account "my orders" / order tracking) are DEFERRED to a
-- future customer-safe projection — a view/RPC/server action that SELECTs only
-- customer-safe columns (excludes admin_note and any internal fields) and scopes
-- rows to the caller's own customer_id. Not built in this migration.
--
-- Inserts are future service-role createOrder only (service_role bypasses RLS) —
-- no anon/customer insert policy.
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- order_items -----------------------------------------------------
-- Admin read/write all. Customer read is DEFERRED because order_items carries
-- the private line_cogs column and RLS cannot hide a single column. Customer
-- order detail will read through a future cost-free customer-safe view/RPC.
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- order_status_events ---------------------------------------------
-- Append-only: admins may SELECT and INSERT, but no UPDATE/DELETE policy is
-- granted (history cannot be rewritten through RLS). Customer timeline read is
-- DEFERRED (will arrive with the customer order-detail view/RPC).
create policy order_status_events_admin_read on public.order_status_events
  for select to authenticated
  using (public.is_admin());

create policy order_status_events_admin_insert on public.order_status_events
  for insert to authenticated
  with check (public.is_admin());

-- ---- site_settings ---------------------------------------------------
-- Anyone may read only public settings; admins read/write all.
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (is_public = true);

create policy site_settings_admin_all on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =====================================================================
-- FOOTER — DEFERRED IN THIS MIGRATION (handled by later migrations/actions)
-- =====================================================================
--   - Seeding any data (catalog, settings, admin users, orders, ...).
--   - Customer-facing read of orders / order_items / order_status_events via a
--     customer-safe view or SECURITY DEFINER RPC (scoped to the caller's own
--     customer_id; excludes admin_note, line_cogs, and any internal fields).
--   - createOrder / updateOrderStatus server actions (order code assignment via
--     next_order_code(); status-effect side effects per ORDER_STATUS_EFFECTS).
--   - product_blend_components normalization (blend is jsonb for now).
--   - media_assets / gallery normalization (image_url + gallery jsonb for now).
--   - Inventory, accounting, marketing/promotions, announcement bar, CMS,
--     analytics, notifications, audit logs, suppliers/purchases/expenses,
--     espresso/flavor catalogs, roles tables, website_pages/page_sections.
--   - Payment-gateway integration (payment columns are data only).
-- =====================================================================
