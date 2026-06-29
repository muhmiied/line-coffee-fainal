-- =====================================================================
-- Migration:  20260629120000_phase1_delivery_deduction_payment
-- Project:    Line Coffee V3
-- Phase:      1 — Current operational corrections
--             (delivery zones · deduction timing · payment defaults)
-- Runs after: 20260628110000_customer_account_persistence
-- =====================================================================
--
-- WHAT THIS MIGRATION DOES (Phase 1 of the Master Execution Plan)
--
--   1. DELIVERY ZONES (server-side, never trusted from the UI)
--      Replaces the old "free over 500 EGP / flat 50 EGP" rule with the
--      locked zone model (Decisions 10 + 11, master plan §6.5). Fee is
--      resolved inside create_checkout_order via resolve_delivery_fee()
--      and a delivery-zone + courier-note snapshot is frozen on the order.
--        1. Shorouk / Madinaty           -> 30 EGP
--        2. Haram / 6 October / Sh. Zayed -> 100 EGP  (checked before #3)
--        3. remaining Cairo / Giza        -> 50 EGP
--        4. all other governorates        -> 0 EGP + courier note
--      "More specific zone wins": #1 and #2 sit inside Cairo/Giza, so they
--      are matched before the general Cairo/Giza rule.
--
--   2. INVENTORY DEDUCTION TIMING (Decision 6 / master plan Phase 1.3)
--      The simple kg reservation model previously DEDUCTED at `shipped`.
--      This moves the deduction to `delivered`. `shipped` now keeps the
--      reservation only; `cancelled` still releases it. This is a MINIMAL
--      trigger-point move — Phase 5 re-implements deduction at lot level.
--
--   3. PAYMENT DEFAULTS (Decision 12 / master plan Phase 1.4)
--      Every payment method (Cash / InstaPay / Wallet) now starts `pending`.
--      Nothing is auto-marked paid; `delivered` never touches payment_status.
--
--   4. ADMIN DELIVERY OVERRIDE (master plan Phase 1.2)
--      New admin-only RPC update_admin_order_delivery_fee() lets an admin set
--      the delivery fee per order (e.g. to charge a governorate courier fee),
--      recomputes the order total, flags delivery_fee_overridden, and writes
--      an audit line into admin_note (order_status_events.status has a CHECK
--      that only permits the 6 lifecycle statuses, so it cannot hold a
--      non-status audit row — admin_note is the safe place for the trail).
--
-- TRUST MODEL: unchanged. Everything runs on the anon/publishable key through
--   SECURITY DEFINER RPCs that recompute every authoritative number
--   server-side. No service-role server is introduced.
--
-- IDEMPOTENT: CREATE OR REPLACE for functions; ADD COLUMN IF NOT EXISTS for
--   the new order columns. Re-running is safe.
--
-- AUTHORED ONLY — NOT APPLIED. Apply with your normal workflow
--   (`supabase db push`) after owner approval + Codex review. Until then the
--   live checkout keeps the old flat-50 behaviour; nothing here runs by itself.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — orders: delivery-zone snapshot + override flag
-- =====================================================================
-- delivery_fee already exists (numeric(12,2), >= 0). We add the zone key, the
-- frozen courier note, and an explicit "an admin changed this fee" flag so the
-- admin UI can show it and accounting can later tell organic vs overridden fees.

alter table public.orders
  add column if not exists delivery_zone           text,
  add column if not exists delivery_note           text,
  add column if not exists delivery_fee_overridden boolean not null default false;

comment on column public.orders.delivery_zone is
  'Resolved delivery zone key at checkout: shorouk_madinaty | haram_october_zayed | cairo_giza | governorate_courier. Snapshot — server-decided, never trusted from the client.';
comment on column public.orders.delivery_note is
  'Frozen delivery/courier note shown to admin (e.g. governorate courier-paid note). Set by checkout or by an admin delivery-fee override.';
comment on column public.orders.delivery_fee_overridden is
  'True once an admin manually set the delivery fee for this order via update_admin_order_delivery_fee().';


-- =====================================================================
-- SECTION 2 — resolve_delivery_fee(governorate, area)
-- =====================================================================
-- Pure function of its inputs (immutable). Returns the zone fee + zone key +
-- optional courier note. The fee mapping lives ONLY here, server-side. The
-- public checkout UI mirrors this in TS (src/lib/delivery.ts) for display, but
-- create_checkout_order always recomputes from this function, so a hostile or
-- stale client cannot forge a delivery fee.
--
-- Resolution order (first match wins; more-specific zone beats the general
-- governorate, per master plan §6.5):
--   1. Shorouk / Madinaty               -> 30
--   2. Haram / 6 October / Sheikh Zayed -> 100   (these sit inside Cairo/Giza,
--      so they are checked BEFORE the general Cairo/Giza rule)
--   3. remaining Cairo / Giza           -> 50
--   4. all other governorates           -> 0 + courier note

create or replace function public.resolve_delivery_fee(
  p_governorate text,
  p_area text
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_gov  text := lower(btrim(coalesce(p_governorate, '')));
  v_area text := lower(btrim(coalesce(p_area, '')));
  v_is_cairo_giza boolean;
begin
  v_is_cairo_giza := v_gov in ('cairo', 'giza', 'القاهرة', 'الجيزة');

  -- 1. Shorouk / Madinaty -> 30
  if v_area like '%shorouk%' or v_area like '%madinaty%'
     or v_area like '%الشروق%' or v_area like '%مدينتي%' then
    return jsonb_build_object(
      'fee', 30, 'zone', 'shorouk_madinaty', 'note', null
    );
  end if;

  -- 2. Haram / 6 October / Sheikh Zayed -> 100  (before the general Cairo/Giza)
  if v_area like '%haram%' or v_area like '%الهرم%'
     or v_area like '%october%' or v_area like '%اكتوبر%' or v_area like '%أكتوبر%'
     or v_area like '%sheikh zayed%' or v_area like '%زايد%' then
    return jsonb_build_object(
      'fee', 100, 'zone', 'haram_october_zayed', 'note', null
    );
  end if;

  -- 3. remaining Cairo / Giza -> 50
  if v_is_cairo_giza then
    return jsonb_build_object(
      'fee', 50, 'zone', 'cairo_giza', 'note', null
    );
  end if;

  -- 4. all other governorates -> 0 + courier note
  return jsonb_build_object(
    'fee', 0,
    'zone', 'governorate_courier',
    'note', 'Outside Cairo/Giza: the customer pays the courier directly on delivery. The delivery fee is outside Line Coffee revenue unless an admin overrides it for this order.'
  );
end;
$$;

-- Internal helper only — called from inside create_checkout_order (DEFINER).
revoke all on function public.resolve_delivery_fee(text, text)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 3 — create_checkout_order(jsonb)  (zone fee + payments pending)
-- =====================================================================
-- Full replacement of the keystone RPC. The ONLY behavioural changes vs the
-- 20260627100000 version are:
--   * SECTION 1 (payment): all methods -> payment_status 'pending' (Decision 12).
--   * SECTION 3 (totals):  delivery fee comes from resolve_delivery_fee(), and
--     the zone + courier note are stored on the order.
-- Everything else (validation, DB-authoritative pricing, atomic reservation,
-- idempotent replay, snapshots) is preserved exactly.

create or replace function public.create_checkout_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item              jsonb;
  v_kind              text;
  v_slug              text;
  v_size              text;
  v_qty               integer;
  v_product           public.products%rowtype;
  v_variant           public.product_variants%rowtype;
  v_unit_price        numeric(12,2);
  v_line_total        numeric(12,2);
  v_req_kg            numeric;

  v_subtotal          numeric(12,2) := 0;
  v_discount_total    numeric(12,2) := 0;
  v_delivery_fee      numeric(12,2);
  v_delivery_zone     text;
  v_delivery_note     text;
  v_zone              jsonb;
  v_total             numeric(12,2);
  v_item_count        integer := 0;

  v_auth_uid          uuid := auth.uid();
  v_guest_id          text := nullif(btrim(coalesce(p_payload->>'guest_id', '')), '');
  v_checkout_attempt_id text := nullif(btrim(coalesce(p_payload->>'checkout_attempt_id', '')), '');

  v_pm_in             text := lower(coalesce(p_payload->'payment'->>'method', ''));
  v_payment_method    text;
  v_payment_status    text;
  v_pay_ref           text := nullif(btrim(coalesce(p_payload->'payment'->>'reference', '')), '');
  v_pay_phone         text := nullif(btrim(coalesce(p_payload->'payment'->>'phone', '')), '');

  v_name              text := btrim(coalesce(p_payload->'customer'->>'name', ''));
  v_phone             text := nullif(btrim(coalesce(p_payload->'customer'->>'phone', '')), '');
  v_whatsapp          text := nullif(btrim(coalesce(p_payload->'customer'->>'whatsapp', '')), '');
  v_email             text := nullif(btrim(coalesce(p_payload->'customer'->>'email', '')), '');
  v_customer_note     text := nullif(btrim(coalesce(p_payload->>'customer_note', '')), '');

  v_addr              jsonb := coalesce(p_payload->'address', '{}'::jsonb);
  v_governorate       text := btrim(coalesce(v_addr->>'governorate', ''));
  v_area              text := nullif(btrim(coalesce(v_addr->>'area', '')), '');
  v_city              text := nullif(btrim(coalesce(v_addr->>'city', '')), '');
  v_street            text := btrim(coalesce(v_addr->>'street', ''));

  v_customer_id       uuid;
  v_customer_snapshot jsonb;
  v_address_snapshot  jsonb;
  v_order_id          uuid;
  v_order_code        text;
  v_existing_order    public.orders%rowtype;
  v_existing_item_count integer;

  r                   record;
  v_updated           integer;
begin
  -- ---- 0. Payload-level validation -----------------------------------
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid checkout payload.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload->'items') <> 'array'
     or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'Your cart is empty.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_payload->'items') > 100 then
    raise exception 'Too many items in one order.' using errcode = '22023';
  end if;
  if v_name = '' then
    raise exception 'Customer name is required.' using errcode = '22023';
  end if;
  if v_phone is null then
    raise exception 'Phone number is required.' using errcode = '22023';
  end if;
  if v_whatsapp is null then
    raise exception 'WhatsApp number is required.' using errcode = '22023';
  end if;
  if v_governorate = '' or v_street = '' then
    raise exception 'Delivery governorate and street are required.' using errcode = '22023';
  end if;
  if v_auth_uid is null and v_guest_id is null then
    raise exception 'Guest checkout identity is required.' using errcode = '22023';
  end if;
  if v_checkout_attempt_id is null
     or length(v_checkout_attempt_id) > 64
     or v_checkout_attempt_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid checkout attempt identity.' using errcode = '22023';
  end if;
  if v_guest_id is not null
     and (length(v_guest_id) > 64 or v_guest_id !~ '^[A-Za-z0-9_-]+$') then
    raise exception 'Invalid guest checkout identity.' using errcode = '22023';
  end if;
  if length(v_name) > 160
     or length(v_phone) > 40
     or length(v_whatsapp) > 40
     or length(v_governorate) > 120
     or length(v_street) > 500
     or length(coalesce(v_email, '')) > 320
     or length(coalesce(v_customer_note, '')) > 2000
     or length(coalesce(v_pay_ref, '')) > 160
     or length(coalesce(v_pay_phone, '')) > 40 then
    raise exception 'One or more checkout fields are too long.' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address.' using errcode = '22023';
  end if;

  -- ---- 1. Map payment method/status (server-decided) -----------------
  -- Decision 12 / Phase 1: every method starts pending. Admin updates payment
  -- status manually later; delivery never auto-marks an order paid.
  if v_pm_in in ('cash', 'cash_on_delivery', 'cod') then
    v_payment_method := 'cash_on_delivery';
  elsif v_pm_in = 'instapay' then
    v_payment_method := 'instapay';
  elsif v_pm_in in ('e-wallet', 'ewallet', 'wallet', 'vodafone_cash') then
    v_payment_method := 'wallet';
  else
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;
  v_payment_status := 'pending';

  -- ---- 2. Resolve + validate every line into a temp table ------------
  create temp table pg_temp._checkout_lines (
    kind         text,
    product_id   uuid,
    product_slug text,
    variant_id   uuid,
    variant_size text,
    sku          text,
    name_en      text,
    name_ar      text,
    detail_en    text,
    detail_ar    text,
    unit_price   numeric(12,2),
    quantity     integer,
    line_total   numeric(12,2),
    required_kg  numeric,
    custom_data  jsonb
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid cart item.' using errcode = '22023';
    end if;
    v_kind := lower(coalesce(v_item->>'kind', 'product'));
    if length(coalesce(v_item->>'quantity', '')) > 4
       or coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Invalid item quantity.' using errcode = '22023';
    end if;
    v_qty := (v_item->>'quantity')::integer;

    if v_qty <= 0 or v_qty > 1000 then
      raise exception 'Invalid item quantity.' using errcode = '22023';
    end if;

    if v_kind in ('product', '') then
      v_slug := nullif(btrim(coalesce(v_item->>'slug', '')), '');
      v_size := nullif(btrim(coalesce(v_item->>'size', '')), '');
      if v_slug is null or v_size is null then
        raise exception 'A product line is missing its product or size.' using errcode = '22023';
      end if;

      -- Public-safety gate: only active + public + on-website products sell.
      select * into v_product
      from public.products
      where slug = v_slug
        and status = 'active'
        and visibility = 'public'
        and show_on_website = true;
      if not found then
        raise exception 'Product "%" is not available for purchase.', v_slug using errcode = '22023';
      end if;

      select * into v_variant
      from public.product_variants
      where product_id = v_product.id and size = v_size;
      if not found then
        raise exception 'Size "%" of "%" is not available.', v_size, v_slug using errcode = '22023';
      end if;

      -- Authoritative price from the DB — client price is ignored.
      v_unit_price := v_variant.price;
      v_line_total := round(v_unit_price * v_qty, 2);
      v_req_kg     := public.variant_size_to_kg(v_size) * v_qty;

      v_subtotal    := v_subtotal + v_line_total;
      v_item_count  := v_item_count + v_qty;

      insert into pg_temp._checkout_lines values (
        'product', v_product.id, v_product.slug, v_variant.id, v_size,
        v_variant.sku, v_product.name_en, v_product.name_ar, v_size, v_size,
        v_unit_price, v_qty, v_line_total, v_req_kg, null
      );

    elsif v_kind in ('custom_espresso', 'espresso-blend', 'custom_flavor', 'flavor-mix') then
      raise exception 'Custom builder checkout is not available yet.'
        using errcode = '22023';

    else
      raise exception 'Unknown item kind.' using errcode = '22023';
    end if;
  end loop;

  -- ---- 3. Server-side totals -----------------------------------------
  -- Phase 1: zone-based delivery (Decisions 10 + 11, master plan §6.5). The fee
  -- mapping lives in resolve_delivery_fee(); the UI is never trusted. The zone
  -- key + courier note are frozen on the order below.
  v_zone          := public.resolve_delivery_fee(v_governorate, v_area);
  v_delivery_fee  := (v_zone->>'fee')::numeric(12,2);
  v_delivery_zone := v_zone->>'zone';
  v_delivery_note := v_zone->>'note';
  v_total         := v_subtotal - v_discount_total + v_delivery_fee;

  -- ---- 4. Resolve / create the customer ------------------------------
  if v_auth_uid is not null then
    -- Registered: atomically upsert by the authenticated user. auth.uid() is the
    -- real caller even under SECURITY DEFINER.
    insert into public.customers (auth_user_id, type, name, email, phone, whatsapp)
    values (v_auth_uid, 'registered', v_name, v_email, v_phone, v_whatsapp)
    on conflict (auth_user_id) where auth_user_id is not null
    do update set
      type     = 'registered',
      name     = excluded.name,
      email    = coalesce(excluded.email, customers.email),
      phone    = excluded.phone,
      whatsapp = excluded.whatsapp
    returning id into v_customer_id;
  else
    -- Guest: match a prior GUEST row by same-device guest_id ONLY. Never match a
    -- registered customer by phone/email (that would let a guest hijack an
    -- account). phone/email are still stored for later opt-in linking.
    insert into public.customers (type, name, email, phone, whatsapp, guest_id)
    values ('guest', v_name, v_email, v_phone, v_whatsapp, v_guest_id)
    on conflict (guest_id) where type = 'guest' and guest_id is not null
    do update set
      name     = excluded.name,
      email    = coalesce(excluded.email, customers.email),
      phone    = excluded.phone,
      whatsapp = excluded.whatsapp
    returning id into v_customer_id;
  end if;

  -- ---- 5. Frozen snapshots -------------------------------------------
  v_customer_snapshot := jsonb_build_object(
    'customerId', v_customer_id,
    'name',       v_name,
    'email',      v_email,
    'phone',      v_phone,
    'whatsapp',   v_whatsapp,
    'type',       case when v_auth_uid is not null then 'registered' else 'guest' end
  );
  v_address_snapshot := jsonb_build_object(
    'recipientName', coalesce(nullif(btrim(v_addr->>'recipient_name'), ''), v_name),
    'phone',         coalesce(v_phone, v_whatsapp),
    'whatsapp',      v_whatsapp,
    'governorate',   v_governorate,
    'city',          coalesce(v_city, v_area, v_governorate),
    'area',          v_area,
    'street',        v_street,
    'building',      nullif(btrim(v_addr->>'building'), ''),
    'floor',         nullif(btrim(v_addr->>'floor'), ''),
    'apartment',     nullif(btrim(v_addr->>'apartment'), ''),
    'landmark',      nullif(btrim(v_addr->>'landmark'), '')
  );

  -- ---- 6. Create the order (atomic code via next_order_code) ---------
  v_order_code := public.next_order_code();
  insert into public.orders (
    code, customer_id, customer_snapshot, address_snapshot,
    customer_name, customer_whatsapp, governorate,
    status, type, channel,
    subtotal, discount_total, delivery_fee, delivery_zone, delivery_note, total,
    payment_method, payment_status, payment_reference, payment_phone,
    guest_id, checkout_attempt_id, customer_note
  ) values (
    v_order_code, v_customer_id, v_customer_snapshot, v_address_snapshot,
    v_name, v_whatsapp, v_governorate,
    'pending', 'standard', 'website',
    v_subtotal, v_discount_total, v_delivery_fee, v_delivery_zone, v_delivery_note, v_total,
    v_payment_method, v_payment_status, v_pay_ref, v_pay_phone,
    v_guest_id, v_checkout_attempt_id, v_customer_note
  )
  on conflict (checkout_attempt_id) where checkout_attempt_id is not null
  do nothing
  returning id into v_order_id;

  -- A retry can race with the original request after a network timeout. The
  -- unique attempt id makes only one insert win; the loser returns the original
  -- safe receipt and does not create items or reserve inventory again.
  if v_order_id is null then
    select * into v_existing_order
    from public.orders
    where checkout_attempt_id = v_checkout_attempt_id;

    if not found
       or (
         v_auth_uid is null
         and v_existing_order.guest_id is distinct from v_guest_id
       )
       or (
         v_auth_uid is not null
         and not exists (
           select 1
           from public.customers c
           where c.id = v_existing_order.customer_id
             and c.auth_user_id = v_auth_uid
         )
       ) then
      raise exception 'Checkout attempt identity is already in use.'
        using errcode = '22023';
    end if;

    select coalesce(sum(quantity), 0)::integer
      into v_existing_item_count
    from public.order_items
    where order_id = v_existing_order.id;

    return jsonb_build_object(
      'order_id',       v_existing_order.id,
      'code',           v_existing_order.code,
      'subtotal',       v_existing_order.subtotal,
      'discount_total', v_existing_order.discount_total,
      'delivery_fee',   v_existing_order.delivery_fee,
      'total',          v_existing_order.total,
      'payment_method', v_existing_order.payment_method,
      'payment_status', v_existing_order.payment_status,
      'item_count',     v_existing_item_count
    );
  end if;

  -- ---- 7. Order item snapshots ---------------------------------------
  insert into public.order_items (
    order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data
  )
  select
    v_order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data
  from pg_temp._checkout_lines;

  -- ---- 8. Reserve inventory (atomic guarded update) ------------------
  -- Aggregate kg per product (a cart can hold 250g + 1kg of the same product),
  -- then move available -> reserved with a WHERE guard that makes the check and
  -- the write a single atomic step (no race, no negative stock).
  for r in
    select product_id, product_slug, sum(required_kg) as req_kg
    from pg_temp._checkout_lines
    where product_id is not null
    group by product_id, product_slug
    order by product_id
  loop
    update public.inventory_stock
      set available_kg = available_kg - r.req_kg,
          reserved_kg  = reserved_kg + r.req_kg
    where product_id = r.product_id
      and available_kg >= r.req_kg;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      -- Either no stock row, or not enough available. Whole txn rolls back.
      raise exception 'Insufficient stock for "%". Please lower the quantity.', r.product_slug
        using errcode = '22023';
    end if;

    insert into public.inventory_movements (product_id, order_id, movement_type, quantity_kg, reason, metadata)
    values (
      r.product_id, v_order_id, 'reserve', r.req_kg, 'Checkout reservation',
      jsonb_build_object('order_code', v_order_code)
    );
  end loop;

  -- ---- 9. Append-only initial status event ---------------------------
  insert into public.order_status_events (order_id, status, note, changed_by)
  values (v_order_id, 'pending', 'Order placed via website checkout', 'system');

  -- ---- 10. Result for the success page -------------------------------
  return jsonb_build_object(
    'order_id',       v_order_id,
    'code',           v_order_code,
    'subtotal',       v_subtotal,
    'discount_total', v_discount_total,
    'delivery_fee',   v_delivery_fee,
    'total',          v_total,
    'payment_method', v_payment_method,
    'payment_status', v_payment_status,
    'item_count',     v_item_count
  );
end;
$$;

-- Re-assert the same grant surface as the prior version (CREATE OR REPLACE keeps
-- existing grants, but we re-state them so the contract is explicit and safe).
revoke all on function public.create_checkout_order(jsonb) from public;
revoke all on function public.create_checkout_order(jsonb) from anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to anon, authenticated;


-- =====================================================================
-- SECTION 4 — update_admin_order_status: deduct at DELIVERED (not shipped)
-- =====================================================================
-- Full replacement. The ONLY behavioural change vs the 20260627110000 version:
-- the inventory effect now fires on 'delivered' (deduct) instead of 'shipped'.
-- 'cancelled' still releases the reservation; 'shipped' now keeps the
-- reservation untouched. The allowed transition map is unchanged.
-- This is the minimal kg-model trigger-point move; Phase 5 rewrites it at lot
-- level.

create or replace function public.update_admin_order_status(
  p_order_id uuid,
  p_next_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_next_status text := lower(btrim(coalesce(p_next_status, '')));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor text;
  v_effect_type text;
  v_updated integer;
  v_open_reservation numeric(12,3);
  r record;
begin
  -- SECURITY DEFINER is required for one atomic order + inventory transaction,
  -- but authorization is always resolved from the caller JWT.
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

  select coalesce(a.display_name, a.email, auth.uid()::text)
    into v_actor
  from public.admin_users a
  where a.auth_user_id = auth.uid()
    and a.status = 'active'
  limit 1;

  -- Checkout reserved stock (available_kg -> reserved_kg). Decision 6 / Phase 1:
  -- the reservation is now CONSUMED at 'delivered' (goods left for good), and
  -- RELEASED at 'cancelled'. 'shipped' deliberately does nothing to inventory —
  -- it only marks the parcel as out for delivery while the reservation stands.
  if v_next_status in ('cancelled', 'delivered') then
    v_effect_type := case
      when v_next_status = 'cancelled' then 'release'
      else 'deduct'
    end;

    -- Every stock-tracked product line must still have an open reservation.
    if exists (
      select 1
      from (
        select distinct oi.product_id
        from public.order_items oi
        where oi.order_id = v_order.id
          and oi.product_id is not null
      ) products_in_order
      left join (
        select
          im.product_id,
          sum(
            case
              when im.movement_type = 'reserve' then im.quantity_kg
              when im.movement_type in ('release', 'deduct') then -im.quantity_kg
              else 0
            end
          ) as open_kg
        from public.inventory_movements im
        where im.order_id = v_order.id
        group by im.product_id
      ) ledger on ledger.product_id = products_in_order.product_id
      where coalesce(ledger.open_kg, 0) <= 0
    ) then
      raise exception 'Inventory reservation is missing or already consumed.'
        using errcode = 'P0001';
    end if;

    for r in
      select
        im.product_id,
        sum(
          case
            when im.movement_type = 'reserve' then im.quantity_kg
            when im.movement_type in ('release', 'deduct') then -im.quantity_kg
            else 0
          end
        )::numeric(12,3) as open_kg
      from public.inventory_movements im
      where im.order_id = v_order.id
      group by im.product_id
      having sum(
        case
          when im.movement_type = 'reserve' then im.quantity_kg
          when im.movement_type in ('release', 'deduct') then -im.quantity_kg
          else 0
        end
      ) > 0
      order by im.product_id
    loop
      v_open_reservation := r.open_kg;

      if v_effect_type = 'release' then
        update public.inventory_stock
        set
          available_kg = available_kg + v_open_reservation,
          reserved_kg = reserved_kg - v_open_reservation
        where product_id = r.product_id
          and reserved_kg >= v_open_reservation;
      else
        update public.inventory_stock
        set reserved_kg = reserved_kg - v_open_reservation
        where product_id = r.product_id
          and reserved_kg >= v_open_reservation;
      end if;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'Inventory reservation is inconsistent.'
          using errcode = 'P0001';
      end if;

      insert into public.inventory_movements (
        product_id,
        order_id,
        movement_type,
        quantity_kg,
        reason,
        metadata
      )
      values (
        r.product_id,
        v_order.id,
        v_effect_type,
        v_open_reservation,
        case
          when v_effect_type = 'release' then 'Order cancelled; reservation released'
          else 'Order delivered; reservation deducted'
        end,
        jsonb_build_object(
          'order_code', v_order.code,
          'previous_status', v_order.status,
          'next_status', v_next_status,
          'changed_by', v_actor
        )
      );
    end loop;
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
    order_id,
    status,
    note,
    changed_by
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
$$;

revoke all on function public.update_admin_order_status(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.update_admin_order_status(uuid, text, text)
  to authenticated;


-- =====================================================================
-- SECTION 5 — update_admin_order_delivery_fee (admin per-order override)
-- =====================================================================
-- Lets an admin set the delivery fee for a single order (e.g. to charge a
-- governorate courier fee that the zone model leaves at 0). Recomputes the
-- order total, flags delivery_fee_overridden, stores an optional delivery_note,
-- and appends an audit line to admin_note. Only allowed BEFORE delivery
-- (pending / preparing / shipped) — after delivered/cancelled/returned the
-- money is settled and changes belong to returns/refunds (Phase 11).

create or replace function public.update_admin_order_delivery_fee(
  p_order_id uuid,
  p_delivery_fee numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_fee numeric(12,2);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor text;
  v_new_total numeric(12,2);
  v_audit text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;

  if p_delivery_fee is null then
    raise exception 'Delivery fee is required.' using errcode = '22023';
  end if;

  v_fee := round(p_delivery_fee::numeric, 2);
  if v_fee < 0 or v_fee > 100000 then
    raise exception 'Delivery fee is out of range.' using errcode = '22023';
  end if;

  if length(coalesce(v_note, '')) > 500 then
    raise exception 'Delivery note is too long.' using errcode = '22023';
  end if;

  select *
    into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if v_order.status not in ('pending', 'preparing', 'shipped') then
    raise exception 'Delivery fee can only be changed before the order is delivered.'
      using errcode = '22023';
  end if;

  -- total = product subtotal - discounts + delivery (promo never touches delivery).
  v_new_total := v_order.subtotal - v_order.discount_total + v_fee;
  if v_new_total < 0 then
    raise exception 'Resulting order total would be negative.' using errcode = '22023';
  end if;

  select coalesce(a.display_name, a.email, auth.uid()::text)
    into v_actor
  from public.admin_users a
  where a.auth_user_id = auth.uid()
    and a.status = 'active'
  limit 1;

  v_audit := '[Delivery fee override] '
    || trim(to_char(v_order.delivery_fee, 'FM999990.00')) || ' -> '
    || trim(to_char(v_fee, 'FM999990.00')) || ' EGP by '
    || coalesce(v_actor, 'admin')
    || coalesce('. ' || v_note, '');

  update public.orders
  set
    delivery_fee = v_fee,
    total = v_new_total,
    delivery_fee_overridden = true,
    delivery_note = coalesce(v_note, delivery_note),
    admin_note = case
      when admin_note is null or btrim(admin_note) = '' then v_audit
      else admin_note || E'\n' || v_audit
    end,
    updated_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'code', v_order.code,
    'delivery_fee', v_fee,
    'total', v_new_total,
    'delivery_fee_overridden', true
  );
end;
$$;

revoke all on function public.update_admin_order_delivery_fee(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.update_admin_order_delivery_fee(uuid, numeric, text)
  to authenticated;
