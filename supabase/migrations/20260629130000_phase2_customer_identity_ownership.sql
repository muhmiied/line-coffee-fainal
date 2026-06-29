-- =====================================================================
-- Migration:  20260629130000_phase2_customer_identity_ownership
-- Project:    Line Coffee V3
-- Phase:      2 — Customer identity, ownership, and account correctness
-- Runs after: 20260629120000_phase1_delivery_deduction_payment
-- =====================================================================
--
-- WHAT THIS MIGRATION DOES (Phase 2 of the Master Execution Plan §5.0 / Phase 2)
--
--   The customer account area was 100% device-scoped: every account RPC took a
--   `p_guest_id` (localStorage device token) and read `orders.guest_id`. That had
--   two correctness/ownership defects:
--
--     A. A REGISTERED customer who logs in on a NEW device sees nothing — their
--        orders/profile/addresses were only reachable by the OLD device guest_id,
--        not by their authenticated identity.
--     B. The profile/address RPCs only matched `type='guest'` customers, so a
--        registered customer could not read/update their own profile or address
--        book at all.
--     C. Reading orders by `orders.guest_id` was also a latent LEAK: a registered
--        customer's order keeps the device guest_id, so a different person using
--        the same device as a guest (same localStorage token) could read it.
--
--   Phase 2 introduces a UNIFIED OWNERSHIP RESOLVER and rewrites the account RPCs
--   to scope by the resolved CUSTOMER, never by the raw device token:
--
--     * `account_customer_id(p_guest_id)` (new, internal):
--         - authenticated caller  -> the customer row WHERE auth_user_id = auth.uid()
--         - anonymous caller      -> the GUEST customer WHERE guest_id = p_guest_id
--         - never trusts email / phone for ownership.
--       The auth path IGNORES the passed guest_id for ownership, so a logged-in
--       user cannot read another device's guest data by passing its token.
--
--     * Order reads (orders / order detail / notifications) now scope by
--       `orders.customer_id = account_customer_id(...)`. This:
--         - gives a registered customer cross-device access (auth.uid()),
--         - keeps a guest's same-device access (guest_id -> guest customer),
--         - fixes defect C: a registered order's customer_id is the registered
--           customer, so a same-device guest (different customer) cannot read it.
--
--     * Profile + Address RPCs resolve the SAME way, so registered customers can
--       finally read/update their profile and manage their address book (defect B).
--       `update_customer_profile` upserts a registered customer row when the user
--       has none yet (they supply whatsapp, satisfying the NOT NULL contract).
--
--     * Wishlist gains an `auth_user_id` ownership path (a registered customer's
--       wishlist follows the account across devices); guests keep the guest_id path.
--
--     * `link_guest_data_to_account(p_guest_id)` (new, authenticated-only) safely
--       links SAME-DEVICE guest data to the account on signup/login:
--         - PROMOTE: if the account has no customer row yet, the same-device guest
--           customer row is promoted in place (type->registered, auth_user_id set,
--           guest_id cleared). Its orders/addresses come along automatically.
--         - MERGE: if the account already has a customer row, the guest customer's
--           orders + addresses are reassigned to it, then the empty guest shell is
--           neutralized (guest_id cleared, status inactive — no destructive delete).
--         - WISHLIST: device wishlist rows migrate to auth_user_id (deduped).
--       There is NO automatic merge by phone/email — only by same-device guest_id,
--       triggered explicitly after the user authenticates.
--
-- WHAT THIS MIGRATION DOES NOT TOUCH
--   * No Phase 1 behaviour change: delivery zones, payment-pending defaults, and
--     deduct-at-delivered are all preserved (create_checkout_order /
--     update_admin_order_status are NOT redefined here).
--   * No FIFO/lots, packaging, promo, builders, accounting.
--   * No service-role server. Everything stays on the anon/publishable key behind
--     SECURITY DEFINER RPCs that self-scope by ownership.
--
-- RETURN-TYPE NOTE
--   Every existing account RPC is replaced with CREATE OR REPLACE keeping its
--   EXACT returns-table signature (Postgres forbids changing a function's return
--   type via OR REPLACE), so the TypeScript data layer keeps working unchanged.
--
-- IDEMPOTENT: ADD COLUMN/INDEX IF NOT EXISTS; CREATE OR REPLACE for functions;
--   link RPC is safe to call repeatedly (re-running finds nothing to migrate).
--
-- AUTHORED ONLY — NOT APPLIED. Apply with `supabase db push` after owner approval
--   + Codex review. Until then the live account stays device-scoped (Phase 1).
-- =====================================================================


-- =====================================================================
-- SECTION 1 — customer_wishlist: add an auth-based ownership path
-- =====================================================================
-- The wishlist was keyed only by guest_id (device). Add auth_user_id so a
-- registered customer's wishlist follows their account across devices, WITHOUT
-- needing a customers row (a freshly-registered user may not have one yet).

alter table public.customer_wishlist
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade;

-- Registered rows have auth_user_id (guest_id null); guest rows have guest_id
-- (auth_user_id null). Relax the original NOT NULL so registered rows are legal.
alter table public.customer_wishlist
  alter column guest_id drop not null;

-- A row must be owned by exactly one of the two identity paths (at least one set).
alter table public.customer_wishlist
  drop constraint if exists customer_wishlist_owner_chk;
alter table public.customer_wishlist
  add constraint customer_wishlist_owner_chk
  check (guest_id is not null or auth_user_id is not null);

create index if not exists customer_wishlist_auth_user_id_idx
  on public.customer_wishlist (auth_user_id) where auth_user_id is not null;

-- One row per (account, product). The original (guest_id, product_slug) unique
-- constraint still enforces the guest path; NULL guest_id rows are distinct under
-- it, so they don't collide.
create unique index if not exists customer_wishlist_auth_slug_key
  on public.customer_wishlist (auth_user_id, product_slug) where auth_user_id is not null;


-- =====================================================================
-- SECTION 2 — account_customer_id(): the unified ownership resolver
-- =====================================================================
-- The single source of truth for "which customer is the caller?".
--   * authenticated  -> the customer linked to auth.uid() (may be null if the
--                        account has no customer row yet -> caller returns empty).
--   * anonymous      -> the GUEST customer matched by the validated device token.
-- Ownership is NEVER derived from email/phone. The auth path deliberately ignores
-- the passed guest_id, so a signed-in user can't read another device's guest data.
--
-- SECURITY DEFINER + internal-only: revoked from anon/authenticated. It is called
-- exclusively by the other SECURITY DEFINER account RPCs in this file (which run
-- as the function owner, so the owner's EXECUTE right is what applies). auth.uid()
-- still resolves the REAL request caller even inside DEFINER context.

create or replace function public.account_customer_id(p_guest_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is not null then
    -- Registered: scope by the authenticated identity, cross-device.
    select c.id into v_id
    from customers c
    where c.auth_user_id = v_uid
    limit 1;
    return v_id;  -- may be null (no customer row yet) -> empty result for callers
  end if;

  -- Guest: scope by the validated device token only.
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return null;
  end if;

  select c.id into v_id
  from customers c
  where c.guest_id = p_guest_id
    and c.type = 'guest'
  limit 1;
  return v_id;
end;
$$;

revoke all on function public.account_customer_id(text) from public, anon, authenticated;


-- =====================================================================
-- SECTION 3 — Order read RPCs (scope by customer_id, not guest_id)
-- =====================================================================

-- ---- RPC: get_customer_orders ---------------------------------------
create or replace function public.get_customer_orders(p_guest_id text)
returns table (
  id              uuid,
  code            text,
  status          text,
  type            text,
  payment_method  text,
  payment_status  text,
  subtotal        numeric,
  discount_total  numeric,
  delivery_fee    numeric,
  total           numeric,
  item_count      bigint,
  placed_at       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    return;  -- no resolvable owner -> empty (never leaks)
  end if;

  return query
    select
      o.id,
      o.code,
      o.status::text,
      o.type::text,
      o.payment_method::text,
      o.payment_status::text,
      o.subtotal,
      o.discount_total,
      o.delivery_fee,
      o.total,
      (
        select count(*)
        from   order_items oi
        where  oi.order_id   = o.id
          and  oi.kind::text = 'product'
      ) as item_count,
      o.placed_at
    from orders o
    where o.customer_id = v_customer_id
    order by o.placed_at desc
    limit 50;
end;
$$;


-- ---- RPC: get_customer_order_detail ---------------------------------
-- Both the order code AND ownership (customer_id) must match — prevents
-- order-code enumeration, and a registered/guest caller can only open their own.
create or replace function public.get_customer_order_detail(
  p_order_code text,
  p_guest_id   text
)
returns table (
  id               uuid,
  code             text,
  status           text,
  type             text,
  payment_method   text,
  payment_status   text,
  subtotal         numeric,
  discount_total   numeric,
  delivery_fee     numeric,
  total            numeric,
  address_snapshot jsonb,
  customer_note    text,
  placed_at        timestamptz,
  items            jsonb,
  timeline         jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
  v_order_id    uuid;
begin
  if v_customer_id is null then
    return;
  end if;

  if p_order_code is null
     or length(p_order_code) < 1
     or length(p_order_code) > 32
  then
    return;
  end if;

  select o.id into v_order_id
  from   orders o
  where  o.code        = p_order_code
    and  o.customer_id = v_customer_id;

  if v_order_id is null then
    return;
  end if;

  return query
    select
      o.id,
      o.code,
      o.status::text,
      o.type::text,
      o.payment_method::text,
      o.payment_status::text,
      o.subtotal,
      o.discount_total,
      o.delivery_fee,
      o.total,
      o.address_snapshot,
      o.customer_note,
      o.placed_at,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'name_en',    oi.name_en,
              'name_ar',    oi.name_ar,
              'detail_en',  oi.detail_en,
              'detail_ar',  oi.detail_ar,
              'quantity',   oi.quantity,
              'unit_price', oi.unit_price,
              'line_total', oi.line_total,
              'kind',       oi.kind::text
            ) order by oi.created_at
          )
          from order_items oi
          where oi.order_id   = o.id
            and oi.kind::text = 'product'
        ),
        '[]'::jsonb
      ) as items,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'status',     e.status::text,
              'note',       e.note,
              'changed_at', e.changed_at
            ) order by e.changed_at
          )
          from order_status_events e
          where e.order_id = o.id
        ),
        '[]'::jsonb
      ) as timeline
    from orders o
    where o.id = v_order_id;
end;
$$;


-- ---- RPC: get_customer_notifications --------------------------------
create or replace function public.get_customer_notifications(p_guest_id text)
returns table (
  event_id    uuid,
  order_id    uuid,
  order_code  text,
  status      text,
  note        text,
  changed_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    return;
  end if;

  return query
    select
      e.id       as event_id,
      e.order_id,
      o.code     as order_code,
      e.status::text,
      e.note,
      e.changed_at
    from order_status_events e
    join orders o on o.id = e.order_id
    where o.customer_id = v_customer_id
    order by e.changed_at desc
    limit 100;
end;
$$;


-- =====================================================================
-- SECTION 4 — Profile RPCs (auth-or-guest)
-- =====================================================================

-- ---- RPC: get_customer_profile --------------------------------------
create or replace function public.get_customer_profile(p_guest_id text)
returns table (
  customer_id uuid,
  name        text,
  email       text,
  phone       text,
  whatsapp    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    return;
  end if;

  return query
    select c.id as customer_id, c.name, c.email, c.phone, c.whatsapp
    from customers c
    where c.id = v_customer_id;
end;
$$;


-- ---- RPC: update_customer_profile -----------------------------------
-- Whitelist (Migration 1 Finding 1): ONLY name / phone / whatsapp are writable.
-- status / type / tags / joined_at / auth_user_id are never touched here.
-- Auth path: if the registered caller has no customer row yet, create one
-- (whatsapp is supplied, satisfying customers.whatsapp NOT NULL non-empty).
create or replace function public.update_customer_profile(
  p_guest_id  text,
  p_name      text,
  p_phone     text,
  p_whatsapp  text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    -- Registered caller with no customer row yet: upsert one if a whatsapp is
    -- provided (required + non-empty by contract). Guests must already exist
    -- (their row is created at checkout).
    if v_uid is not null and btrim(coalesce(p_whatsapp, '')) <> '' then
      insert into customers (auth_user_id, type, name, phone, whatsapp)
      values (
        v_uid,
        'registered',
        coalesce(nullif(btrim(coalesce(p_name, '')), ''), 'Customer'),
        nullif(btrim(coalesce(p_phone, '')), ''),
        btrim(p_whatsapp)
      )
      on conflict (auth_user_id) where auth_user_id is not null
      do update set
        name     = case when btrim(coalesce(excluded.name, '')) <> '' then excluded.name     else customers.name     end,
        phone    = coalesce(excluded.phone, customers.phone),
        whatsapp = case when btrim(coalesce(excluded.whatsapp, '')) <> '' then excluded.whatsapp else customers.whatsapp end
      returning id into v_customer_id;
      return v_customer_id is not null;
    end if;
    return false;
  end if;

  update customers
  set
    name     = case when btrim(coalesce(p_name, ''))     <> '' then btrim(p_name)     else name     end,
    phone    = case when btrim(coalesce(p_phone, ''))    <> '' then btrim(p_phone)    else phone    end,
    whatsapp = case when btrim(coalesce(p_whatsapp, '')) <> '' then btrim(p_whatsapp) else whatsapp end
  where id = v_customer_id;

  return found;
end;
$$;


-- =====================================================================
-- SECTION 5 — Address RPCs (auth-or-guest ownership)
-- =====================================================================

-- ---- RPC: get_customer_addresses ------------------------------------
create or replace function public.get_customer_addresses(p_guest_id text)
returns table (
  id             uuid,
  label          text,
  recipient_name text,
  phone          text,
  governorate    text,
  city           text,
  area           text,
  street         text,
  building       text,
  floor          text,
  apartment      text,
  landmark       text,
  location_url   text,
  is_default     boolean,
  created_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    return;
  end if;

  return query
    select
      a.id, a.label, a.recipient_name, a.phone,
      a.governorate, a.city, a.area, a.street,
      a.building, a.floor, a.apartment, a.landmark,
      a.location_url, a.is_default, a.created_at
    from customer_addresses a
    where a.customer_id = v_customer_id
    order by a.is_default desc, a.created_at asc;
end;
$$;


-- ---- RPC: add_customer_address --------------------------------------
create or replace function public.add_customer_address(
  p_guest_id      text,
  p_label         text,
  p_recipient_name text,
  p_phone         text,
  p_governorate   text,
  p_city          text,
  p_area          text,
  p_street        text,
  p_building      text,
  p_floor         text,
  p_apartment     text,
  p_landmark      text,
  p_location_url  text,
  p_is_default    boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
  v_new_id      uuid;
begin
  if v_customer_id is null then
    return null;
  end if;

  if btrim(coalesce(p_governorate, '')) = ''
     or btrim(coalesce(p_city, ''))     = ''
     or btrim(coalesce(p_street, ''))   = ''
  then
    return null;
  end if;

  if p_is_default then
    update customer_addresses
    set is_default = false
    where customer_id = v_customer_id;
  end if;

  insert into customer_addresses (
    customer_id, label, recipient_name, phone,
    governorate, city, area, street,
    building, floor, apartment, landmark,
    location_url, is_default
  ) values (
    v_customer_id,
    coalesce(nullif(btrim(coalesce(p_label, '')), ''), 'Address'),
    nullif(btrim(coalesce(p_recipient_name, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    btrim(p_governorate),
    btrim(p_city),
    nullif(btrim(coalesce(p_area, '')), ''),
    btrim(p_street),
    nullif(btrim(coalesce(p_building, '')), ''),
    nullif(btrim(coalesce(p_floor, '')), ''),
    nullif(btrim(coalesce(p_apartment, '')), ''),
    nullif(btrim(coalesce(p_landmark, '')), ''),
    nullif(btrim(coalesce(p_location_url, '')), ''),
    coalesce(p_is_default, false)
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;


-- ---- RPC: update_customer_address -----------------------------------
create or replace function public.update_customer_address(
  p_guest_id      text,
  p_address_id    uuid,
  p_label         text,
  p_recipient_name text,
  p_phone         text,
  p_governorate   text,
  p_city          text,
  p_area          text,
  p_street        text,
  p_building      text,
  p_floor         text,
  p_apartment     text,
  p_landmark      text,
  p_location_url  text,
  p_is_default    boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null or p_address_id is null then
    return false;
  end if;

  if btrim(coalesce(p_governorate, '')) = ''
     or btrim(coalesce(p_city, ''))     = ''
     or btrim(coalesce(p_street, ''))   = ''
  then
    return false;
  end if;

  -- Verify ownership before any write.
  if not exists (
    select 1 from customer_addresses
    where id = p_address_id and customer_id = v_customer_id
  ) then
    return false;
  end if;

  if p_is_default then
    update customer_addresses
    set is_default = false
    where customer_id = v_customer_id;
  end if;

  update customer_addresses
  set
    label          = coalesce(nullif(btrim(coalesce(p_label, '')), ''), label),
    recipient_name = nullif(btrim(coalesce(p_recipient_name, '')), ''),
    phone          = nullif(btrim(coalesce(p_phone, '')), ''),
    governorate    = btrim(p_governorate),
    city           = btrim(p_city),
    area           = nullif(btrim(coalesce(p_area, '')), ''),
    street         = btrim(p_street),
    building       = nullif(btrim(coalesce(p_building, '')), ''),
    floor          = nullif(btrim(coalesce(p_floor, '')), ''),
    apartment      = nullif(btrim(coalesce(p_apartment, '')), ''),
    landmark       = nullif(btrim(coalesce(p_landmark, '')), ''),
    location_url   = nullif(btrim(coalesce(p_location_url, '')), ''),
    is_default     = coalesce(p_is_default, is_default)
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;


-- ---- RPC: delete_customer_address -----------------------------------
create or replace function public.delete_customer_address(
  p_guest_id   text,
  p_address_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null or p_address_id is null then
    return false;
  end if;

  delete from customer_addresses
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;


-- ---- RPC: set_default_customer_address ------------------------------
create or replace function public.set_default_customer_address(
  p_guest_id   text,
  p_address_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null or p_address_id is null then
    return false;
  end if;

  update customer_addresses
  set is_default = false
  where customer_id = v_customer_id;

  update customer_addresses
  set is_default = true
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;


-- =====================================================================
-- SECTION 6 — Wishlist RPCs (auth_user_id path + guest_id path)
-- =====================================================================

-- ---- RPC: get_customer_wishlist -------------------------------------
create or replace function public.get_customer_wishlist(p_guest_id text)
returns table (product_slug text, added_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is not null then
    return query
      select w.product_slug, w.created_at
      from customer_wishlist w
      where w.auth_user_id = v_uid
      order by w.created_at desc;
    return;
  end if;

  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return;
  end if;

  return query
    select w.product_slug, w.created_at
    from customer_wishlist w
    where w.guest_id = p_guest_id
    order by w.created_at desc;
end;
$$;


-- ---- RPC: add_customer_wishlist_item --------------------------------
create or replace function public.add_customer_wishlist_item(
  p_guest_id    text,
  p_product_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_product_slug is null or btrim(p_product_slug) = '' then
    return false;
  end if;

  if v_uid is not null then
    insert into customer_wishlist (auth_user_id, product_slug)
    values (v_uid, btrim(p_product_slug))
    on conflict (auth_user_id, product_slug) where auth_user_id is not null
    do nothing;
    return true;
  end if;

  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return false;
  end if;

  insert into customer_wishlist (guest_id, product_slug)
  values (p_guest_id, btrim(p_product_slug))
  on conflict (guest_id, product_slug) do nothing;

  return true;
end;
$$;


-- ---- RPC: remove_customer_wishlist_item -----------------------------
create or replace function public.remove_customer_wishlist_item(
  p_guest_id    text,
  p_product_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_product_slug is null then
    return false;
  end if;

  if v_uid is not null then
    delete from customer_wishlist
    where auth_user_id = v_uid and product_slug = btrim(p_product_slug);
    return true;
  end if;

  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return false;
  end if;

  delete from customer_wishlist
  where guest_id = p_guest_id and product_slug = btrim(p_product_slug);

  return true;
end;
$$;


-- =====================================================================
-- SECTION 7 — link_guest_data_to_account(): safe same-device linking
-- =====================================================================
-- Authenticated-only. Links SAME-DEVICE guest data (matched by guest_id only) to
-- the caller's registered account. There is NO automatic merge by phone/email.
-- Safe to call on every signup/login: re-running finds nothing to migrate.
--
--   PROMOTE  - account has no customer row yet -> promote the same-device guest
--              customer in place (type->registered, auth_user_id set, guest_id
--              cleared). Orders/addresses follow automatically (same row id).
--   MERGE    - account already has a customer row -> reassign the guest customer's
--              orders + addresses to it, then neutralize the empty guest shell
--              (guest_id cleared + status inactive; NOT deleted — non-destructive).
--   WISHLIST - device wishlist rows (guest_id) migrate to auth_user_id, deduped.

create or replace function public.link_guest_data_to_account(p_guest_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_guest_customer uuid;
  v_reg_customer   uuid;
  v_moved_orders   integer := 0;
  v_mode           text := 'noop';
begin
  if v_uid is null then
    return jsonb_build_object('linked', false, 'reason', 'not_authenticated');
  end if;

  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return jsonb_build_object('linked', false, 'reason', 'invalid_guest_id');
  end if;

  select c.id into v_guest_customer
  from customers c
  where c.guest_id = p_guest_id and c.type = 'guest'
  limit 1;

  select c.id into v_reg_customer
  from customers c
  where c.auth_user_id = v_uid
  limit 1;

  -- 1) Migrate the device wishlist to the account (deduped), regardless of
  --    whether a same-device guest CUSTOMER exists.
  update customer_wishlist cw
    set auth_user_id = v_uid, guest_id = null
  where cw.guest_id = p_guest_id
    and not exists (
      select 1 from customer_wishlist x
      where x.auth_user_id = v_uid
        and x.product_slug = cw.product_slug
    );
  -- Drop any leftover device rows that were duplicates of account rows.
  delete from customer_wishlist where guest_id = p_guest_id;

  -- 2) Link the customer record + its orders/addresses.
  if v_guest_customer is null then
    return jsonb_build_object(
      'linked', true, 'mode', 'wishlist_only', 'moved_orders', 0
    );
  end if;

  if v_reg_customer is null then
    -- PROMOTE in place. No unique-index clash: the account has no auth_user_id
    -- row yet. Orders keep customer_id = this row; their device guest_id no
    -- longer resolves a guest customer (guest_id cleared), so a logged-out guest
    -- on the device can no longer read them.
    update customers
      set type = 'registered',
          auth_user_id = v_uid,
          guest_id = null
    where id = v_guest_customer;
    v_reg_customer := v_guest_customer;
    v_mode := 'promote';

  elsif v_reg_customer = v_guest_customer then
    v_mode := 'noop';

  else
    -- MERGE the guest customer into the existing registered customer.
    update orders
      set customer_id = v_reg_customer
    where customer_id = v_guest_customer;
    get diagnostics v_moved_orders = row_count;

    -- Avoid two default addresses for one customer (partial unique index):
    -- demote moved guest defaults only when the account already has addresses.
    if exists (
      select 1 from customer_addresses where customer_id = v_reg_customer
    ) then
      update customer_addresses
        set is_default = false
      where customer_id = v_guest_customer and is_default = true;
    end if;

    update customer_addresses
      set customer_id = v_reg_customer
    where customer_id = v_guest_customer;

    -- Neutralize the now-empty guest shell (non-destructive: no row deleted).
    update customers
      set guest_id = null, status = 'inactive'
    where id = v_guest_customer;
    v_mode := 'merge';
  end if;

  return jsonb_build_object(
    'linked', true,
    'mode', v_mode,
    'moved_orders', v_moved_orders,
    'customer_id', v_reg_customer
  );
end;
$$;


-- =====================================================================
-- SECTION 8 — GRANTS
-- =====================================================================
-- account_customer_id() stays internal-only (revoked in Section 2). The account
-- read/write RPCs keep their anon + authenticated surface (CREATE OR REPLACE
-- preserves grants, but we re-assert them so the contract is explicit). Linking
-- requires an authenticated identity, so it is granted to authenticated only.

grant execute on function public.get_customer_orders(text)              to anon, authenticated;
grant execute on function public.get_customer_order_detail(text, text)  to anon, authenticated;
grant execute on function public.get_customer_notifications(text)       to anon, authenticated;
grant execute on function public.get_customer_profile(text)             to anon, authenticated;
grant execute on function public.update_customer_profile(text, text, text, text)
  to anon, authenticated;
grant execute on function public.get_customer_addresses(text)           to anon, authenticated;
grant execute on function public.add_customer_address(
  text,text,text,text,text,text,text,text,text,text,text,text,text,boolean
) to anon, authenticated;
grant execute on function public.update_customer_address(
  text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean
) to anon, authenticated;
grant execute on function public.delete_customer_address(text, uuid)    to anon, authenticated;
grant execute on function public.set_default_customer_address(text, uuid) to anon, authenticated;
grant execute on function public.get_customer_wishlist(text)            to anon, authenticated;
grant execute on function public.add_customer_wishlist_item(text, text) to anon, authenticated;
grant execute on function public.remove_customer_wishlist_item(text, text) to anon, authenticated;

revoke all on function public.link_guest_data_to_account(text) from public, anon;
grant execute on function public.link_guest_data_to_account(text) to authenticated;
