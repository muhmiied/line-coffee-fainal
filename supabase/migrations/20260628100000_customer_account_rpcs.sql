-- =====================================================================
-- Migration:  20260628100000_customer_account_rpcs
-- Project:    Line Coffee V3
-- Phase:      Customer Account Real — Safe Order Access RPCs
-- Runs after: 20260627110000_admin_orders_status_inventory
-- =====================================================================
--
-- PURPOSE
--   Expose order data to the public customer account area via four
--   SECURITY DEFINER RPCs scoped to a device-level guest_id token.
--
-- SECURITY MODEL
--   * guest_id is a UUID written to localStorage at checkout time and
--     reused for every order from the same device.
--   * These RPCs are callable by anon + authenticated but return ONLY
--     rows where orders.guest_id = p_guest_id (strict equality).
--   * For single-order detail, BOTH code AND guest_id must match,
--     preventing order-code enumeration.
--   * p_guest_id is validated: 8-64 chars, alphanumeric + dash only.
--     Empty strings, injected SQL, and random short values are all
--     rejected before any query runs.
--   * SECURITY DEFINER bypasses the restrictive orders/customers RLS
--     (admin-only) — but each function is self-scoping, so no other
--     customer's data can ever leak.
--
-- LIMITATIONS (acceptable for launch phase)
--   * Clears localStorage → customer loses order access on that device.
--   * Cross-device order history requires a logged-in customer account
--     once full Supabase customer auth is implemented.
--   * No persistent notification "read" state — tracked in-session only.
--
-- THIS FILE IS AUTHORED ONLY. Apply with `supabase db push`.
-- =====================================================================


-- =====================================================================
-- RPC 1 — List orders for a guest device
-- =====================================================================

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
begin
  -- Reject malformed or missing guest_id (prevents empty-string bypass)
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
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
      (
        select count(*)
        from   order_items oi
        where  oi.order_id   = o.id
          and  oi.kind::text = 'product'
      ) as item_count,
      o.placed_at
    from orders o
    where o.guest_id = p_guest_id
    order by o.placed_at desc
    limit 50;
end;
$$;


-- =====================================================================
-- RPC 2 — Single order detail (code + guest_id both required)
-- =====================================================================

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
  v_order_id uuid;
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return;
  end if;

  if p_order_code is null
     or length(p_order_code) < 1
     or length(p_order_code) > 32
  then
    return;
  end if;

  -- Both conditions must match — prevents order-code enumeration
  select o.id into v_order_id
  from   orders o
  where  o.code     = p_order_code
    and  o.guest_id = p_guest_id;

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


-- =====================================================================
-- RPC 3 — Order status events as notifications
-- =====================================================================

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
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
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
    where o.guest_id = p_guest_id
    order by e.changed_at desc
    limit 100;
end;
$$;


-- =====================================================================
-- RPC 4 — Customer profile linked to this device's orders
-- =====================================================================

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
begin
  if p_guest_id is null
     or length(p_guest_id) < 8
     or length(p_guest_id) > 64
     or p_guest_id !~ '^[A-Za-z0-9_-]+$'
  then
    return;
  end if;

  -- Return the customer linked to the most-recent order on this device
  return query
    select
      c.id       as customer_id,
      c.name,
      c.email,
      c.phone,
      c.whatsapp
    from customers c
    join orders o on o.customer_id = c.id
    where o.guest_id = p_guest_id
    order by o.placed_at desc
    limit 1;
end;
$$;


-- =====================================================================
-- GRANTS
-- =====================================================================

grant execute on function public.get_customer_orders(text)              to anon, authenticated;
grant execute on function public.get_customer_order_detail(text, text)  to anon, authenticated;
grant execute on function public.get_customer_notifications(text)       to anon, authenticated;
grant execute on function public.get_customer_profile(text)             to anon, authenticated;
