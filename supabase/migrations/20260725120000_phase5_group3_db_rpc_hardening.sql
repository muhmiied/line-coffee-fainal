-- =============================================================================
-- Phase 5 (final system stabilization) — Group 3: Database / RPC hardening
-- =============================================================================
-- Source: docs/ai (session scratchpad) PHASE4_AUDIT_REPORT.md §7 "Database
-- Changes Requiring Explicit Approval" (items 1-4) + phase4_db_findings.md.
-- AUTHORED ONLY. Every statement below is additive / zero-behavior-change
-- (same technique already used by every prior hardening migration in this
-- project, e.g. 20260713120000). Apply only after explicit owner review —
-- per the mission's own rule, this migration is NOT applied by this task.
--
-- Four independent, additive fixes, all zero business-logic change:
--
-- 1) search_path hardening on the 15 customer-account RPCs (audit finding
--    L1). These 15 functions were already SECURITY DEFINER + pinned to
--    `search_path = 'public'` (not exploitable today — CREATE on the public
--    schema is already revoked from anon/authenticated), but every other
--    SECURITY DEFINER function in this project is pinned to `''` (empty) per
--    the project's own established convention (20260713120000's header).
--    Because these 15 bodies reference tables unqualified (`customers`,
--    `customer_addresses`, `customer_wishlist`, `orders`, `order_items`,
--    `order_status_events`), a plain `ALTER FUNCTION ... SET search_path=''`
--    is NOT safe here (unlike the 6 functions fixed in 20260713120000, whose
--    bodies were already fully qualified) — every unqualified reference is
--    re-qualified to `public.*` below via CREATE OR REPLACE FUNCTION,
--    verbatim otherwise (identical parameters/logic/return shape, so every
--    existing GRANT EXECUTE is preserved automatically since CREATE OR
--    REPLACE keeps the function's OID).
--
-- 2) `customer_wishlist` RLS (audit finding M2). This is the only table in
--    the 44-table schema with RLS disabled; currently safe only because
--    anon/authenticated hold zero SELECT/INSERT/UPDATE/DELETE grants on it
--    (all access goes through the SECURITY DEFINER RPCs above, which bypass
--    RLS as the function owner). Enabling RLS here changes nothing reachable
--    today — it is defense-in-depth so a future migration that accidentally
--    grants direct table access without also adding RLS does not instantly
--    create a cross-account read/write hole. `anon` intentionally gets no
--    policy (deny-by-default; guest rows have no verifiable session identity
--    for RLS to check against — guest scoping is enforced by the RPCs'
--    explicit device-token validation, not by a session claim).
--
-- 3) FIFO invariant assertion on `adjust_espresso_bean_stock` and
--    `adjust_packaging_stock` (audit finding M3). `adjust_finished_product_
--    stock` (20260705133831) already asserts, after every adjustment, that
--    the aggregate stock row matches the sum of its own lots — and rolls
--    back on any mismatch. The two sibling functions were never given the
--    same assertion. Ported verbatim (same pattern, same error class),
--    adapted per resource: espresso beans track a reserved quantity (like
--    coffee), packaging does not (packaging_lots has no reserved_quantity
--    column — Decision 7, packaging deducts immediately, no reservation
--    step — confirmed live via information_schema before writing this).
--
-- 4) Coffee vs. espresso consistency-check reconciliation in
--    `update_admin_order_status` (audit finding L5). The coffee path
--    validates that every stock-tracked order line has a resolvable,
--    positive required kg BEFORE cross-checking allocations, with a clear,
--    specific error. The espresso path had no equivalent pre-check — a
--    malformed custom_espresso line (null variant_size) would only be
--    caught indirectly by the later expected-vs-allocated cross-check,
--    with less specific diagnostics and a real (if narrow) risk that a
--    corrupted required_kg/allocated_kg pair could both coalesce to 0 and
--    silently pass. Added the same explicit pre-check for the espresso
--    path, placed identically. The coffee path's separate "fail-closed
--    legacy guard" (the else-branch when v_has_allocations is false) is
--    deliberately NOT replicated for espresso: it is provably unreachable
--    today given the coffee cross-check already guarantees allocations
--    exist whenever order_items do (same guarantee the espresso
--    cross-check already provides) — it predates the FIFO-lot era and is
--    kept on the coffee side purely as inherited defensive code, not a
--    real behavioral gap worth duplicating into new code.
--
-- No pricing, delivery, promo, payment, refund, or return-rule change. No
-- change to any RPC's parameters or return shape. No service-role code.
-- =============================================================================


-- =============================================================================
-- §1 — search_path hardening: 15 customer-account RPCs
-- =============================================================================

CREATE OR REPLACE FUNCTION public.account_customer_id(p_guest_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is not null then
    -- Registered: scope by the authenticated identity, cross-device.
    select c.id into v_id
    from public.customers c
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
  from public.customers c
  where c.guest_id = p_guest_id
    and c.type = 'guest'
  limit 1;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.add_customer_address(p_guest_id text, p_label text, p_recipient_name text, p_phone text, p_governorate text, p_city text, p_area text, p_street text, p_building text, p_floor text, p_apartment text, p_landmark text, p_location_url text, p_is_default boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    update public.customer_addresses
    set is_default = false
    where customer_id = v_customer_id;
  end if;

  insert into public.customer_addresses (
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
$function$;

CREATE OR REPLACE FUNCTION public.add_customer_wishlist_item(p_guest_id text, p_product_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if p_product_slug is null or btrim(p_product_slug) = '' then
    return false;
  end if;

  if v_uid is not null then
    insert into public.customer_wishlist (auth_user_id, product_slug)
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

  insert into public.customer_wishlist (guest_id, product_slug)
  values (p_guest_id, btrim(p_product_slug))
  on conflict (guest_id, product_slug) do nothing;

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_customer_address(p_guest_id text, p_address_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null or p_address_id is null then
    return false;
  end if;

  delete from public.customer_addresses
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_addresses(p_guest_id text)
 RETURNS TABLE(id uuid, label text, recipient_name text, phone text, governorate text, city text, area text, street text, building text, floor text, apartment text, landmark text, location_url text, is_default boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    from public.customer_addresses a
    where a.customer_id = v_customer_id
    order by a.is_default desc, a.created_at asc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_notifications(p_guest_id text)
 RETURNS TABLE(event_id uuid, order_id uuid, order_code text, status text, note text, changed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    from public.order_status_events e
    join public.orders o on o.id = e.order_id
    where o.customer_id = v_customer_id
    order by e.changed_at desc
    limit 100;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_order_detail(p_order_code text, p_guest_id text)
 RETURNS TABLE(id uuid, code text, status text, type text, payment_method text, payment_status text, subtotal numeric, discount_total numeric, delivery_fee numeric, total numeric, address_snapshot jsonb, customer_note text, placed_at timestamp with time zone, items jsonb, timeline jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  from   public.orders o
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
          from public.order_items oi
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
          from public.order_status_events e
          where e.order_id = o.id
        ),
        '[]'::jsonb
      ) as timeline
    from public.orders o
    where o.id = v_order_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_orders(p_guest_id text)
 RETURNS TABLE(id uuid, code text, status text, type text, payment_method text, payment_status text, subtotal numeric, discount_total numeric, delivery_fee numeric, total numeric, item_count bigint, placed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        from   public.order_items oi
        where  oi.order_id   = o.id
          and  oi.kind::text = 'product'
      ) as item_count,
      o.placed_at
    from public.orders o
    where o.customer_id = v_customer_id
    order by o.placed_at desc
    limit 50;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_profile(p_guest_id text)
 RETURNS TABLE(customer_id uuid, name text, email text, phone text, whatsapp text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    return;
  end if;

  return query
    select c.id as customer_id, c.name, c.email, c.phone, c.whatsapp
    from public.customers c
    where c.id = v_customer_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_wishlist(p_guest_id text)
 RETURNS TABLE(product_slug text, added_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is not null then
    return query
      select w.product_slug, w.created_at
      from public.customer_wishlist w
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
    from public.customer_wishlist w
    where w.guest_id = p_guest_id
    order by w.created_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.link_guest_data_to_account(p_guest_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  from public.customers c
  where c.guest_id = p_guest_id and c.type = 'guest'
  limit 1;

  select c.id into v_reg_customer
  from public.customers c
  where c.auth_user_id = v_uid
  limit 1;

  -- 1) Migrate the device wishlist to the account (deduped), regardless of
  --    whether a same-device guest CUSTOMER exists.
  update public.customer_wishlist cw
    set auth_user_id = v_uid, guest_id = null
  where cw.guest_id = p_guest_id
    and not exists (
      select 1 from public.customer_wishlist x
      where x.auth_user_id = v_uid
        and x.product_slug = cw.product_slug
    );
  -- Drop any leftover device rows that were duplicates of account rows.
  delete from public.customer_wishlist where guest_id = p_guest_id;

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
    update public.customers
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
    update public.orders
      set customer_id = v_reg_customer
    where customer_id = v_guest_customer;
    get diagnostics v_moved_orders = row_count;

    -- Avoid two default addresses for one customer (partial unique index):
    -- demote moved guest defaults only when the account already has addresses.
    if exists (
      select 1 from public.customer_addresses where customer_id = v_reg_customer
    ) then
      update public.customer_addresses
        set is_default = false
      where customer_id = v_guest_customer and is_default = true;
    end if;

    update public.customer_addresses
      set customer_id = v_reg_customer
    where customer_id = v_guest_customer;

    -- Neutralize the now-empty guest shell (non-destructive: no row deleted).
    update public.customers
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
$function$;

CREATE OR REPLACE FUNCTION public.remove_customer_wishlist_item(p_guest_id text, p_product_slug text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if p_product_slug is null then
    return false;
  end if;

  if v_uid is not null then
    delete from public.customer_wishlist
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

  delete from public.customer_wishlist
  where guest_id = p_guest_id and product_slug = btrim(p_product_slug);

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_default_customer_address(p_guest_id text, p_address_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null or p_address_id is null then
    return false;
  end if;

  update public.customer_addresses
  set is_default = false
  where customer_id = v_customer_id;

  update public.customer_addresses
  set is_default = true
  where id = p_address_id and customer_id = v_customer_id;

  return found;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_customer_address(p_guest_id text, p_address_id uuid, p_label text, p_recipient_name text, p_phone text, p_governorate text, p_city text, p_area text, p_street text, p_building text, p_floor text, p_apartment text, p_landmark text, p_location_url text, p_is_default boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    select 1 from public.customer_addresses
    where id = p_address_id and customer_id = v_customer_id
  ) then
    return false;
  end if;

  if p_is_default then
    update public.customer_addresses
    set is_default = false
    where customer_id = v_customer_id;
  end if;

  update public.customer_addresses
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
$function$;

CREATE OR REPLACE FUNCTION public.update_customer_profile(p_guest_id text, p_name text, p_phone text, p_whatsapp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid         uuid := auth.uid();
  v_customer_id uuid := public.account_customer_id(p_guest_id);
begin
  if v_customer_id is null then
    -- Registered caller with no customer row yet: upsert one if a whatsapp is
    -- provided (required + non-empty by contract). Guests must already exist
    -- (their row is created at checkout).
    if v_uid is not null and btrim(coalesce(p_whatsapp, '')) <> '' then
      insert into public.customers as customers (auth_user_id, type, name, phone, whatsapp)
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

  update public.customers
  set
    name     = case when btrim(coalesce(p_name, ''))     <> '' then btrim(p_name)     else name     end,
    phone    = case when btrim(coalesce(p_phone, ''))    <> '' then btrim(p_phone)    else phone    end,
    whatsapp = case when btrim(coalesce(p_whatsapp, '')) <> '' then btrim(p_whatsapp) else whatsapp end
  where id = v_customer_id;

  return found;
end;
$function$;


-- =============================================================================
-- §2 — Enable RLS on customer_wishlist (audit finding M2)
-- =============================================================================
-- Defense-in-depth only: anon/authenticated currently hold zero direct
-- data-access grants on this table (verified live before authoring this),
-- so this changes nothing reachable today. All real access continues
-- through the SECURITY DEFINER RPCs above (which run as the function owner
-- and are unaffected by row security on tables they touch).

alter table public.customer_wishlist enable row level security;

create policy customer_wishlist_owner_all
on public.customer_wishlist
for all
to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));


-- =============================================================================
-- §3 — FIFO invariant assertion: adjust_espresso_bean_stock, adjust_packaging_stock
-- =============================================================================
-- Ports the same "safe-or-stop" final assertion adjust_finished_product_stock
-- already has (20260705133831): after every adjustment, re-verify the
-- aggregate stock row matches the sum of its own lots, and roll back the
-- whole adjustment if it does not. Espresso beans track a reserved quantity
-- (mirrors coffee exactly); packaging does not (packaging_lots has no
-- reserved_quantity column — packaging deducts immediately, no reservation
-- step, per Decision 7), so its invariant checks only the available/remaining
-- side.

CREATE OR REPLACE FUNCTION public.adjust_espresso_bean_stock(p_bean_id uuid, p_quantity_delta_kg numeric, p_unit_cost numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_bean   public.espresso_beans%rowtype;
  v_stock  public.espresso_bean_stock%rowtype;
  v_cost   numeric(12,2);
  v_lot_id uuid;
  v_actor  text := auth.uid()::text;
  v_left   numeric(12,3);
  v_take   numeric(12,3);
  r        record;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_quantity_delta_kg is null or p_quantity_delta_kg = 0 then
    raise exception 'Stock adjustment must be a non-zero quantity.' using errcode = '22023';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Adjustment note is too long.' using errcode = '22023';
  end if;

  select * into v_bean from public.espresso_beans where id = p_bean_id for update;
  if not found then
    raise exception 'Espresso bean not found.' using errcode = 'P0002';
  end if;

  insert into public.espresso_bean_stock (bean_id, available_kg, reserved_kg)
  values (p_bean_id, 0, 0)
  on conflict (bean_id) do nothing;

  select * into v_stock from public.espresso_bean_stock where bean_id = p_bean_id for update;

  if p_quantity_delta_kg > 0 then
    v_cost := round(coalesce(p_unit_cost, v_bean.purchase_cost_per_kg, 0), 2);
    if v_cost < 0 then
      raise exception 'Unit cost cannot be negative.' using errcode = '22023';
    end if;

    insert into public.espresso_bean_lots (
      bean_id, received_qty_kg, remaining_qty_kg, reserved_qty_kg,
      unit_cost, received_date, status, source, notes
    ) values (
      p_bean_id, p_quantity_delta_kg, p_quantity_delta_kg, 0,
      v_cost, current_date, 'open', 'adjustment', nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_lot_id;

    update public.espresso_bean_stock
      set available_kg = available_kg + p_quantity_delta_kg
    where bean_id = p_bean_id;

    insert into public.espresso_bean_movements (
      bean_id, lot_id, movement_type, quantity_kg, reason, metadata
    ) values (
      p_bean_id, v_lot_id, 'adjustment', p_quantity_delta_kg,
      nullif(btrim(coalesce(p_note, '')), ''),
      jsonb_build_object('changed_by', v_actor, 'unit_cost', v_cost)
    );
  else
    v_left := round(abs(p_quantity_delta_kg), 3);
    if v_stock.available_kg < v_left then
      raise exception 'Adjustment exceeds available bean stock.' using errcode = '22023';
    end if;

    for r in
      select id, remaining_qty_kg, reserved_qty_kg, unit_cost
      from public.espresso_bean_lots
      where bean_id = p_bean_id
        and status = 'open'
        and (remaining_qty_kg - reserved_qty_kg) > 0
      order by received_date asc, created_at asc, id asc
      for update
    loop
      exit when v_left <= 0;
      v_take := least(r.remaining_qty_kg - r.reserved_qty_kg, v_left);
      if v_take <= 0 then
        continue;
      end if;

      update public.espresso_bean_lots
        set remaining_qty_kg = remaining_qty_kg - v_take,
            status = case when remaining_qty_kg - v_take <= 0 then 'closed' else status end
      where id = r.id;

      insert into public.espresso_bean_movements (
        bean_id, lot_id, movement_type, quantity_kg, reason, metadata
      ) values (
        p_bean_id, r.id, 'adjustment', -v_take,
        nullif(btrim(coalesce(p_note, '')), ''),
        jsonb_build_object('changed_by', v_actor, 'unit_cost', r.unit_cost)
      );

      v_left := round(v_left - v_take, 3);
    end loop;

    if v_left > 0.0005 then
      raise exception 'Bean lot balance is inconsistent.' using errcode = '23514';
    end if;

    update public.espresso_bean_stock
      set available_kg = available_kg - abs(p_quantity_delta_kg)
    where bean_id = p_bean_id;
  end if;

  select * into v_stock from public.espresso_bean_stock where bean_id = p_bean_id;

  -- Safe-or-stop: mirrors adjust_finished_product_stock's final assertion.
  if v_stock.available_kg <> coalesce((
       select sum(remaining_qty_kg - reserved_qty_kg)
       from public.espresso_bean_lots
       where bean_id = p_bean_id
     ), 0)
     or v_stock.reserved_kg <> coalesce((
       select sum(reserved_qty_kg)
       from public.espresso_bean_lots
       where bean_id = p_bean_id
     ), 0) then
    raise exception 'Espresso bean FIFO invariant failed; adjustment rolled back.'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'bean_id', p_bean_id,
    'available_kg', v_stock.available_kg,
    'reserved_kg', v_stock.reserved_kg,
    'quantity_delta_kg', p_quantity_delta_kg
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_packaging_stock(p_packaging_item_id uuid, p_quantity_delta integer, p_unit_cost numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item       public.packaging_items%rowtype;
  v_cost       numeric(12,2);
  v_lot_id     uuid;
  v_actor      text := auth.uid()::text;
  v_cost_total numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_quantity_delta = 0 or abs(p_quantity_delta) > 1000000 then
    raise exception 'Stock adjustment must be a non-zero practical quantity.'
      using errcode = '22023';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Adjustment note is too long.' using errcode = '22023';
  end if;

  select * into v_item
  from public.packaging_items
  where id = p_packaging_item_id
  for update;

  if not found then
    raise exception 'Packaging item not found.' using errcode = 'P0002';
  end if;

  if p_quantity_delta > 0 then
    v_cost := round(coalesce(p_unit_cost, v_item.cost_per_unit, 0), 2);
    if v_cost < 0 then
      raise exception 'Unit cost cannot be negative.' using errcode = '22023';
    end if;

    insert into public.packaging_lots (
      packaging_item_id, received_quantity, remaining_quantity,
      unit_cost, source, notes
    ) values (
      p_packaging_item_id, p_quantity_delta, p_quantity_delta,
      v_cost, 'adjustment', nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_lot_id;

    update public.packaging_items
    set available_quantity = available_quantity + p_quantity_delta,
        cost_per_unit = coalesce(p_unit_cost, cost_per_unit)
    where id = p_packaging_item_id;

    insert into public.packaging_movements (
      packaging_item_id, packaging_lot_id, movement_type,
      quantity_delta, unit_cost, note, changed_by
    ) values (
      p_packaging_item_id, v_lot_id, 'adjustment_in',
      p_quantity_delta, v_cost, nullif(btrim(coalesce(p_note, '')), ''), v_actor
    );
  else
    if v_item.available_quantity < abs(p_quantity_delta) then
      raise exception 'Packaging adjustment exceeds available stock.'
        using errcode = '22023';
    end if;

    v_cost_total := public._deduct_packaging_fifo(
      p_packaging_item_id,
      abs(p_quantity_delta),
      null,
      null,
      'adjustment_out',
      nullif(btrim(coalesce(p_note, '')), ''),
      v_actor
    );
  end if;

  select * into v_item
  from public.packaging_items
  where id = p_packaging_item_id;

  -- Safe-or-stop: packaging has no reservation concept (packaging_lots has
  -- no reserved_quantity column — deducts immediately per Decision 7), so
  -- only the available/remaining side is asserted.
  if v_item.available_quantity <> coalesce((
       select sum(remaining_quantity)
       from public.packaging_lots
       where packaging_item_id = p_packaging_item_id
     ), 0) then
    raise exception 'Packaging FIFO invariant failed; adjustment rolled back.'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'packaging_item_id', v_item.id,
    'available_quantity', v_item.available_quantity,
    'quantity_delta', p_quantity_delta,
    'cost_total', coalesce(v_cost_total, round(p_quantity_delta * v_cost, 2))
  );
end;
$function$;


-- =============================================================================
-- §4 — Reconcile coffee/espresso consistency-check asymmetry in
--       update_admin_order_status (audit finding L5)
-- =============================================================================
-- Adds the same explicit "is this stock-tracked line well-formed" pre-check
-- the coffee path already has, to the espresso path, with a specific error
-- message. Everything else in this function — transition map, lock order,
-- deduction/release logic, COGS snapshot, movement records — is byte-for-byte
-- unchanged from the live definition (verified via pg_get_functiondef before
-- writing this).

CREATE OR REPLACE FUNCTION public.update_admin_order_status(p_order_id uuid, p_next_status text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_next_status text := lower(btrim(coalesce(p_next_status, '')));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor text;
  v_effect_type text;
  v_updated integer;
  v_has_allocations boolean;
  v_cogs_total numeric(12,2) := 0;
  v_line_cogs numeric(12,2);
  v_flavor_cogs numeric(12,2);
  a record;
  b record;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;

  if v_next_status not in (
    'pending', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'
  ) then
    raise exception 'Unsupported order status.' using errcode = '22023';
  end if;

  if length(coalesce(v_note, '')) > 1000 then
    raise exception 'Status note is too long.' using errcode = '22023';
  end if;

  -- Serializes concurrent status updates for the same order.
  select *
    into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  -- Idempotent retry/no-op: no new event and no inventory movement.
  if v_next_status = v_order.status then
    return jsonb_build_object(
      'order_id', v_order.id,
      'code', v_order.code,
      'previous_status', v_order.status,
      'status', v_order.status,
      'no_op', true
    );
  end if;

  if not (
    (v_order.status = 'pending'   and v_next_status in ('preparing', 'cancelled'))
    or
    (v_order.status = 'preparing' and v_next_status in ('shipped', 'cancelled'))
    or
    (v_order.status = 'shipped'   and v_next_status = 'delivered')
    or
    (v_order.status = 'delivered' and v_next_status = 'returned')
  ) then
    raise exception 'Invalid order status transition from "%" to "%".',
      v_order.status, v_next_status
      using errcode = '22023';
  end if;

  select coalesce(a2.display_name, a2.email, auth.uid()::text)
    into v_actor
  from public.admin_users a2
  where a2.auth_user_id = auth.uid()
    and a2.status = 'active'
  limit 1;

  -- Inventory effect fires only on cancel (release) and deliver (deduct).
  -- shipped/returned do not touch stock here (returned is Phase 11).
  if v_next_status in ('cancelled', 'delivered') then
    v_effect_type := case when v_next_status = 'cancelled' then 'release' else 'deduct' end;

    -- ===== COFFEE / FINISHED-PRODUCT LOTS (Phase 5, unchanged) =========
    if exists (
      select 1
      from public.order_items oi
      where oi.order_id = v_order.id
        and oi.kind = 'product'
        and (
          oi.product_id is null
          or oi.variant_size is null
          or coalesce(public.variant_size_to_kg(oi.variant_size), 0) <= 0
        )
    ) then
      raise exception 'Order has an invalid stock-tracked line; inventory was not changed.'
        using errcode = 'P0001';
    end if;

    if exists (
      with expected as (
        select oi.id as order_item_id,
               oi.product_id,
               round(public.variant_size_to_kg(oi.variant_size) * oi.quantity, 3)
                 as required_kg
        from public.order_items oi
        where oi.order_id = v_order.id
          and oi.kind = 'product'
          and oi.product_id is not null
          and oi.variant_size is not null
      ),
      allocated as (
        select al.order_item_id,
               al.product_id,
               round(sum(al.reserved_qty_kg), 3) as allocated_kg
        from public.order_lot_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
        group by al.order_item_id, al.product_id
      )
      select 1
      from expected e
      full join allocated al on al.order_item_id = e.order_item_id
      where e.order_item_id is null
         or al.order_item_id is null
         or e.product_id is distinct from al.product_id
         or coalesce(e.required_kg, 0) <> coalesce(al.allocated_kg, 0)
    ) then
      raise exception 'Order lot allocations are incomplete or inconsistent; inventory was not changed.'
        using errcode = 'P0001';
    end if;

    -- Match checkout's lock order (inventory_stock -> inventory_lots) so a
    -- delivery/cancellation cannot deadlock with a concurrent checkout for the
    -- same product. Product ordering also keeps multi-product orders consistent.
    perform s.product_id
    from public.inventory_stock s
    where s.product_id in (
      select distinct al.product_id
      from public.order_lot_allocations al
      where al.order_id = v_order.id
        and al.status = 'reserved'
    )
    order by s.product_id
    for update;

    select exists (
      select 1 from public.order_lot_allocations al
      where al.order_id = v_order.id and al.status = 'reserved'
    ) into v_has_allocations;

    if v_has_allocations then
      -- ---------- LOT PATH (FIFO allocations) ----------
      for a in
        select al.id, al.order_item_id, al.product_id, al.lot_id,
               al.reserved_qty_kg, al.unit_cost
        from public.order_lot_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
        order by al.product_id, al.created_at, al.id
        for update
      loop
        if v_effect_type = 'deduct' then
          -- Lot: goods leave for good. remaining -= q, reserved -= q, close at 0.
          update public.inventory_lots
            set remaining_qty_kg = remaining_qty_kg - a.reserved_qty_kg,
                reserved_qty_kg  = reserved_qty_kg  - a.reserved_qty_kg,
                status = case
                  when remaining_qty_kg - a.reserved_qty_kg <= 0 then 'closed'
                  else status
                end
          where id = a.lot_id
            and reserved_qty_kg  >= a.reserved_qty_kg
            and remaining_qty_kg >= a.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Lot reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          update public.order_lot_allocations
            set deducted_qty_kg = reserved_qty_kg, status = 'deducted'
          where id = a.id;

          -- Operational stock: reserved -> gone (available untouched, matches P1).
          update public.inventory_stock
            set reserved_kg = reserved_kg - a.reserved_qty_kg
          where product_id = a.product_id
            and reserved_kg >= a.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Inventory reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          v_line_cogs := round(a.reserved_qty_kg * a.unit_cost, 2);
          v_cogs_total := v_cogs_total + v_line_cogs;

          -- Per-line COGS snapshot (accumulate when a line spans lots).
          if a.order_item_id is not null then
            update public.order_items
              set line_cogs = round(coalesce(line_cogs, 0) + v_line_cogs, 2)
            where id = a.order_item_id;
          end if;

          insert into public.inventory_movements (
            product_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            a.product_id, v_order.id, a.lot_id, 'deduct', a.reserved_qty_kg,
            'Order delivered; lot deducted',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', a.lot_id,
              'unit_cost', a.unit_cost, 'line_cogs', v_line_cogs,
              'order_item_id', a.order_item_id, 'changed_by', v_actor
            )
          );
        else
          -- release: goods stay; reservation lifted off the lot.
          update public.inventory_lots
            set reserved_qty_kg = reserved_qty_kg - a.reserved_qty_kg
          where id = a.lot_id
            and reserved_qty_kg >= a.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Lot reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          update public.order_lot_allocations
            set status = 'released'
          where id = a.id;

          update public.inventory_stock
            set available_kg = available_kg + a.reserved_qty_kg,
                reserved_kg  = reserved_kg  - a.reserved_qty_kg
          where product_id = a.product_id
            and reserved_kg >= a.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Inventory reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          insert into public.inventory_movements (
            product_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            a.product_id, v_order.id, a.lot_id, 'release', a.reserved_qty_kg,
            'Order cancelled; lot reservation released',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', a.lot_id,
              'order_item_id', a.order_item_id, 'changed_by', v_actor
            )
          );
        end if;
      end loop;
    else
      -- ---------- FAIL-CLOSED LEGACY GUARD ------------------------------
      if exists (
        select 1
        from public.order_items oi
        where oi.order_id = v_order.id
          and oi.kind = 'product'
      ) then
        raise exception 'Lot allocation is missing; inventory was not changed.'
          using errcode = 'P0001';
      end if;
    end if;

    -- ===== ESPRESSO BEAN LOTS (Phase 8) — independent resource ==========
    -- Same well-formedness pre-check the coffee path has above (Group 3,
    -- reconciles audit finding L5) — a malformed custom_espresso line
    -- (null/zero variant_size) now raises here with a specific error
    -- instead of only being caught indirectly by the cross-check below.
    if exists (
      select 1
      from public.order_items oi
      where oi.order_id = v_order.id
        and oi.kind = 'custom_espresso'
        and (
          oi.variant_size is null
          or coalesce(public.variant_size_to_kg(oi.variant_size), 0) <= 0
        )
    ) then
      raise exception 'Order has an invalid stock-tracked espresso line; inventory was not changed.'
        using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.order_items oi
      where oi.order_id = v_order.id and oi.kind = 'custom_espresso'
    ) then
      if exists (
        with expected as (
          select oi.id as order_item_id,
                 round(public.variant_size_to_kg(oi.variant_size) * oi.quantity, 3) as required_kg
          from public.order_items oi
          where oi.order_id = v_order.id
            and oi.kind = 'custom_espresso'
        ),
        allocated as (
          select al.order_item_id,
                 round(sum(al.reserved_qty_kg), 3) as allocated_kg
          from public.order_espresso_bean_allocations al
          where al.order_id = v_order.id
            and al.status = 'reserved'
          group by al.order_item_id
        )
        select 1
        from expected e
        full join allocated al on al.order_item_id = e.order_item_id
        where e.order_item_id is null
           or al.order_item_id is null
           or coalesce(e.required_kg, 0) <> coalesce(al.allocated_kg, 0)
      ) then
        raise exception 'Espresso bean lot allocations are incomplete or inconsistent; inventory was not changed.'
          using errcode = 'P0001';
      end if;

      -- Same lock order as checkout (inventory_stock/products first, then
      -- espresso_bean_stock) so a status change cannot deadlock a concurrent
      -- checkout that reserves both resources.
      perform s.bean_id
      from public.espresso_bean_stock s
      where s.bean_id in (
        select distinct al.bean_id
        from public.order_espresso_bean_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
      )
      order by s.bean_id
      for update;

      for b in
        select al.id, al.order_item_id, al.bean_id, al.lot_id, al.reserved_qty_kg, al.unit_cost
        from public.order_espresso_bean_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
        order by al.bean_id, al.created_at, al.id
        for update
      loop
        if v_effect_type = 'deduct' then
          update public.espresso_bean_lots
            set remaining_qty_kg = remaining_qty_kg - b.reserved_qty_kg,
                reserved_qty_kg  = reserved_qty_kg  - b.reserved_qty_kg,
                status = case
                  when remaining_qty_kg - b.reserved_qty_kg <= 0 then 'closed'
                  else status
                end
          where id = b.lot_id
            and reserved_qty_kg  >= b.reserved_qty_kg
            and remaining_qty_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean lot reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          update public.order_espresso_bean_allocations
            set deducted_qty_kg = reserved_qty_kg, status = 'deducted'
          where id = b.id;

          update public.espresso_bean_stock
            set reserved_kg = reserved_kg - b.reserved_qty_kg
          where bean_id = b.bean_id
            and reserved_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean stock reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          v_line_cogs := round(b.reserved_qty_kg * b.unit_cost, 2);
          v_cogs_total := v_cogs_total + v_line_cogs;

          if b.order_item_id is not null then
            update public.order_items
              set line_cogs = round(coalesce(line_cogs, 0) + v_line_cogs, 2)
            where id = b.order_item_id;
          end if;

          insert into public.espresso_bean_movements (
            bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            b.bean_id, v_order.id, b.lot_id, 'deduct', b.reserved_qty_kg,
            'Order delivered; bean lot deducted',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', b.lot_id,
              'unit_cost', b.unit_cost, 'line_cogs', v_line_cogs,
              'order_item_id', b.order_item_id, 'changed_by', v_actor
            )
          );
        else
          update public.espresso_bean_lots
            set reserved_qty_kg = reserved_qty_kg - b.reserved_qty_kg
          where id = b.lot_id
            and reserved_qty_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean lot reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          update public.order_espresso_bean_allocations
            set status = 'released'
          where id = b.id;

          update public.espresso_bean_stock
            set available_kg = available_kg + b.reserved_qty_kg,
                reserved_kg  = reserved_kg  - b.reserved_qty_kg
          where bean_id = b.bean_id
            and reserved_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean stock reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          insert into public.espresso_bean_movements (
            bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            b.bean_id, v_order.id, b.lot_id, 'release', b.reserved_qty_kg,
            'Order cancelled; bean lot reservation released',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', b.lot_id,
              'order_item_id', b.order_item_id, 'changed_by', v_actor
            )
          );
        end if;
      end loop;
    end if;

    -- ===== FLAVOR COST-ONLY SNAPSHOT (Phase 9) — no stock movement ======
    -- Make Your Flavor never touches inventory. Its (optional) per-line cost
    -- snapshot was frozen once at checkout on order_items.line_cogs; roll it
    -- into the order-level COGS rollup at delivered only (matching revenue
    -- recognition timing), alongside coffee + bean lot COGS above.
    if v_effect_type = 'deduct' then
      select coalesce(sum(line_cogs), 0)
        into v_flavor_cogs
      from public.order_items
      where order_id = v_order.id
        and kind = 'custom_flavor';
      v_cogs_total := v_cogs_total + coalesce(v_flavor_cogs, 0);
    end if;

    -- Combined COGS rollup across coffee lots + espresso bean lots + the
    -- flavor cost-only snapshot (moved out of the coffee-only branch above so
    -- espresso/flavor-only orders also get a correct orders.cogs_total).
    if v_effect_type = 'deduct' then
      update public.orders set cogs_total = round(v_cogs_total, 2) where id = v_order.id;
    end if;
  end if;

  update public.orders
  set
    status = v_next_status,
    updated_at = now(),
    delivered_at = case
      when v_next_status = 'delivered' then coalesce(delivered_at, now())
      else delivered_at
    end,
    cancelled_at = case
      when v_next_status = 'cancelled' then coalesce(cancelled_at, now())
      else cancelled_at
    end,
    returned_at = case
      when v_next_status = 'returned' then coalesce(returned_at, now())
      else returned_at
    end
  where id = v_order.id;

  insert into public.order_status_events (
    order_id, status, note, changed_by
  )
  values (
    v_order.id,
    v_next_status,
    coalesce(v_note, 'Status changed from ' || v_order.status || ' to ' || v_next_status),
    v_actor
  );

  return jsonb_build_object(
    'order_id', v_order.id,
    'code', v_order.code,
    'previous_status', v_order.status,
    'status', v_next_status,
    'no_op', false
  );
end;
$function$;
