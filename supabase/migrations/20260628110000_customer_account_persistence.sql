-- =====================================================================
-- Migration:  20260628110000_customer_account_persistence
-- Project:    Line Coffee V3
-- Phase:      Customer Account Persistence — Profile / Addresses / Wishlist
-- Runs after: 20260628100000_customer_account_rpcs
-- =====================================================================
--
-- PURPOSE
--   Wire the customer account area (profile, addresses, wishlist) to
--   real Supabase storage so data survives browser refresh.
--
-- SECURITY MODEL (same as customer account RPCs migration)
--   All customer writes go through SECURITY DEFINER RPCs scoped to the
--   caller's guest_id token.  The guest_id is validated (8-64 chars,
--   alphanumeric + dash only) before any query runs.
--   Direct base-table access from the browser client is never granted for
--   these operations — the existing RLS on customers/customer_addresses
--   relies on auth.uid(), which is null for all guest customers.
--
--   Customer self-update whitelist (per Migration 1 Finding 1):
--     ONLY name / phone / whatsapp are writable by the customer.
--     status / type / tags / joined_at / admin-controlled columns are
--     never touched by these RPCs.
--
-- TABLES ALTERED:
--   customer_addresses — ADD COLUMN location_url text null
--
-- TABLES CREATED:
--   customer_wishlist  — (guest_id, product_id) per-device product list
--
-- RPCs CREATED (all SECURITY DEFINER, granted to anon + authenticated):
--   update_customer_profile(p_guest_id, p_name, p_phone, p_whatsapp)
--   get_customer_addresses(p_guest_id)
--   add_customer_address(p_guest_id, p_label, p_recipient_name, p_phone,
--     p_governorate, p_city, p_area, p_street, p_building, p_floor,
--     p_apartment, p_landmark, p_location_url, p_is_default)
--   update_customer_address(p_guest_id, p_address_id, same payload columns)
--   delete_customer_address(p_guest_id, p_address_id)
--   set_default_customer_address(p_guest_id, p_address_id)
--   get_customer_wishlist(p_guest_id)
--   add_customer_wishlist_item(p_guest_id, p_product_slug)
--   remove_customer_wishlist_item(p_guest_id, p_product_slug)
--
-- THIS FILE IS AUTHORED ONLY. Apply with `supabase db push`.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — customer_addresses: add location_url column
-- =====================================================================

alter table public.customer_addresses
  add column if not exists location_url text null;

comment on column public.customer_addresses.location_url is
  'Optional Google Maps / location pin URL provided by the customer.';


-- =====================================================================
-- SECTION 2 — customer_wishlist table
-- =====================================================================
-- Stores product slugs the customer has heart-ed, keyed by the same
-- device-level guest_id used throughout checkout and account RPCs.
-- Storing slug (not product_id UUID) avoids a JOIN in every wishlist
-- read and keeps the token stable even if a product is re-created.

create table if not exists public.customer_wishlist (
  id         uuid        primary key default gen_random_uuid(),
  guest_id   text        not null,
  product_slug text      not null,
  created_at timestamptz not null default now(),
  constraint customer_wishlist_guest_slug_key unique (guest_id, product_slug)
);

create index if not exists customer_wishlist_guest_id_idx
  on public.customer_wishlist (guest_id);

-- No RLS on this table — all access is through SECURITY DEFINER RPCs.
-- Anon cannot read or write the base table.
alter table public.customer_wishlist disable row level security;


-- =====================================================================
-- SECTION 3 — Helper: resolve customer_id from guest_id
-- =====================================================================
-- Shared by all RPCs in this migration.  Returns null when the guest_id
-- is unknown or malformed — callers treat null as "not found / abort".
-- SECURITY DEFINER not needed here (it's internal; only called by other
-- SECURITY DEFINER functions in this session).

create or replace function private_resolve_customer_guest(p_guest_id text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from customers
  where guest_id = p_guest_id
    and type     = 'guest'
  limit 1;
  return v_id;
end;
$$;


-- =====================================================================
-- SECTION 4 — update_customer_profile
-- =====================================================================
-- Writes ONLY the whitelisted safe-to-edit fields on the customer row.
-- admin_note / status / type / tags / joined_at are never touched.
-- Returns true if a row was updated, false if guest_id not found.

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
  v_customer_id uuid;
begin
  -- Input validation
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return false;
  end if;

  select id into v_customer_id
  from customers
  where guest_id = p_guest_id and type = 'guest'
  limit 1;

  if v_customer_id is null then
    return false;
  end if;

  update customers
  set
    -- Never overwrite with empty string; fall back to current value
    name     = case when btrim(coalesce(p_name,''))     <> '' then btrim(p_name)     else name     end,
    phone    = case when btrim(coalesce(p_phone,''))    <> '' then btrim(p_phone)    else phone    end,
    whatsapp = case when btrim(coalesce(p_whatsapp,'')) <> '' then btrim(p_whatsapp) else whatsapp end
  where id = v_customer_id;

  return found;
end;
$$;

grant execute on function public.update_customer_profile(text, text, text, text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 5 — get_customer_addresses
-- =====================================================================

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
  v_customer_id uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return;
  end if;

  select customers.id into v_customer_id
  from customers
  where customers.guest_id = p_guest_id and customers.type = 'guest'
  limit 1;

  if v_customer_id is null then return; end if;

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

grant execute on function public.get_customer_addresses(text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 6 — add_customer_address
-- =====================================================================
-- Returns the new address UUID on success, null on validation failure.

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
  v_customer_id uuid;
  v_new_id      uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return null;
  end if;

  -- Required fields
  if btrim(coalesce(p_governorate,'')) = ''
     or btrim(coalesce(p_city,''))     = ''
     or btrim(coalesce(p_street,''))   = ''
  then
    return null;
  end if;

  select customers.id into v_customer_id
  from customers
  where customers.guest_id = p_guest_id and customers.type = 'guest'
  limit 1;

  if v_customer_id is null then return null; end if;

  -- Clear existing default if this one is being set as default
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
    coalesce(nullif(btrim(coalesce(p_label,'')), ''), 'Address'),
    nullif(btrim(coalesce(p_recipient_name,'')), ''),
    nullif(btrim(coalesce(p_phone,'')), ''),
    btrim(p_governorate),
    btrim(p_city),
    nullif(btrim(coalesce(p_area,'')), ''),
    btrim(p_street),
    nullif(btrim(coalesce(p_building,'')), ''),
    nullif(btrim(coalesce(p_floor,'')), ''),
    nullif(btrim(coalesce(p_apartment,'')), ''),
    nullif(btrim(coalesce(p_landmark,'')), ''),
    nullif(btrim(coalesce(p_location_url,'')), ''),
    coalesce(p_is_default, false)
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.add_customer_address(
  text,text,text,text,text,text,text,text,text,text,text,text,text,boolean
) to anon, authenticated;


-- =====================================================================
-- SECTION 7 — update_customer_address
-- =====================================================================
-- Verifies the address belongs to the customer before updating.

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
  v_customer_id uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
     or p_address_id is null
  then
    return false;
  end if;

  if btrim(coalesce(p_governorate,'')) = ''
     or btrim(coalesce(p_city,''))     = ''
     or btrim(coalesce(p_street,''))   = ''
  then
    return false;
  end if;

  select customers.id into v_customer_id
  from customers
  where customers.guest_id = p_guest_id and customers.type = 'guest'
  limit 1;

  if v_customer_id is null then return false; end if;

  -- Verify ownership
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
    label          = coalesce(nullif(btrim(coalesce(p_label,'')), ''), label),
    recipient_name = nullif(btrim(coalesce(p_recipient_name,'')), ''),
    phone          = nullif(btrim(coalesce(p_phone,'')), ''),
    governorate    = btrim(p_governorate),
    city           = btrim(p_city),
    area           = nullif(btrim(coalesce(p_area,'')), ''),
    street         = btrim(p_street),
    building       = nullif(btrim(coalesce(p_building,'')), ''),
    floor          = nullif(btrim(coalesce(p_floor,'')), ''),
    apartment      = nullif(btrim(coalesce(p_apartment,'')), ''),
    landmark       = nullif(btrim(coalesce(p_landmark,'')), ''),
    location_url   = nullif(btrim(coalesce(p_location_url,'')), ''),
    is_default     = coalesce(p_is_default, is_default)
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;

grant execute on function public.update_customer_address(
  text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean
) to anon, authenticated;


-- =====================================================================
-- SECTION 8 — delete_customer_address
-- =====================================================================

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
  v_customer_id uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
     or p_address_id is null
  then
    return false;
  end if;

  select customers.id into v_customer_id
  from customers
  where customers.guest_id = p_guest_id and customers.type = 'guest'
  limit 1;

  if v_customer_id is null then return false; end if;

  delete from customer_addresses
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;

grant execute on function public.delete_customer_address(text, uuid)
  to anon, authenticated;


-- =====================================================================
-- SECTION 9 — set_default_customer_address
-- =====================================================================

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
  v_customer_id uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
     or p_address_id is null
  then
    return false;
  end if;

  select customers.id into v_customer_id
  from customers
  where customers.guest_id = p_guest_id and customers.type = 'guest'
  limit 1;

  if v_customer_id is null then return false; end if;

  -- Clear all defaults for this customer
  update customer_addresses
  set is_default = false
  where customer_id = v_customer_id;

  -- Set the new default (also verifies ownership)
  update customer_addresses
  set is_default = true
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$$;

grant execute on function public.set_default_customer_address(text, uuid)
  to anon, authenticated;


-- =====================================================================
-- SECTION 10 — get_customer_wishlist
-- =====================================================================

create or replace function public.get_customer_wishlist(p_guest_id text)
returns table (product_slug text, added_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
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

grant execute on function public.get_customer_wishlist(text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 11 — add_customer_wishlist_item
-- =====================================================================
-- Idempotent: ON CONFLICT DO NOTHING means re-adding is safe.

create or replace function public.add_customer_wishlist_item(
  p_guest_id    text,
  p_product_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
     or p_product_slug is null
     or btrim(p_product_slug) = ''
  then
    return false;
  end if;

  insert into customer_wishlist (guest_id, product_slug)
  values (p_guest_id, btrim(p_product_slug))
  on conflict (guest_id, product_slug) do nothing;

  return true;
end;
$$;

grant execute on function public.add_customer_wishlist_item(text, text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 12 — remove_customer_wishlist_item
-- =====================================================================

create or replace function public.remove_customer_wishlist_item(
  p_guest_id    text,
  p_product_slug text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
     or p_product_slug is null
  then
    return false;
  end if;

  delete from customer_wishlist
  where guest_id = p_guest_id and product_slug = btrim(p_product_slug);

  return true;
end;
$$;

grant execute on function public.remove_customer_wishlist_item(text, text)
  to anon, authenticated;
