-- =====================================================================
-- Phase 20E — Critical launch blockers
-- =====================================================================
-- Scope:
--   1) Return a cost-free, DB-authored Telegram order snapshot only when the
--      caller proves knowledge of the order's checkout_attempt_id.
--   2) Require that same proof for durable Telegram dedupe operations.
--   3) Add one admin-only finished-product stock adjustment RPC that preserves
--      the inventory_stock ↔ FIFO-lot invariant.
--
-- Safety:
--   * No table, column, row, price, delivery rule, order lifecycle, payment,
--     refund, return, COGS formula, or existing FIFO allocation is changed.
--   * No service-role access is introduced.
--   * The notification snapshot exposes no cost/admin fields and is usable only
--     with the high-entropy checkout attempt identifier that created the order.
--   * Finished-product stock changes lock aggregate stock before lots, matching
--     checkout/order lifecycle lock order.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — Server-trusted Telegram order snapshot
-- =====================================================================

create or replace function public.get_order_notification_payload(
  p_order_id uuid,
  p_checkout_attempt_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt text := btrim(coalesce(p_checkout_attempt_id, ''));
  v_payload jsonb;
begin
  if p_order_id is null
     or length(v_attempt) < 8
     or length(v_attempt) > 64
     or v_attempt !~ '^[A-Za-z0-9_-]+$' then
    return null;
  end if;

  select jsonb_build_object(
    'order_id', o.id,
    'order_code', o.code,
    'customer', jsonb_build_object(
      'name', coalesce(o.customer_snapshot->>'name', o.customer_name, ''),
      'phone', coalesce(o.customer_snapshot->>'phone', ''),
      'whatsapp', coalesce(
        o.customer_snapshot->>'whatsapp',
        o.customer_whatsapp,
        o.customer_snapshot->>'phone',
        ''
      )
    ),
    'address', jsonb_build_object(
      'governorate', coalesce(o.address_snapshot->>'governorate', o.governorate, ''),
      'area', coalesce(o.address_snapshot->>'area', o.address_snapshot->>'city', ''),
      'street', coalesce(o.address_snapshot->>'street', ''),
      'building', coalesce(o.address_snapshot->>'building', ''),
      'floor_apt', coalesce(
        o.address_snapshot->>'floor',
        o.address_snapshot->>'apartment',
        ''
      ),
      'landmark', coalesce(o.address_snapshot->>'landmark', '')
    ),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'name', oi.name_en,
          'detail', coalesce(oi.detail_en, ''),
          'quantity', oi.quantity
        )
        order by oi.created_at, oi.id
      )
      from public.order_items oi
      where oi.order_id = o.id
        and oi.kind not in ('shipping', 'discount_adjustment')
    ), '[]'::jsonb),
    'subtotal', o.subtotal,
    'discount', o.discount_total,
    'delivery', o.delivery_fee,
    'total', o.total,
    'payment_method', o.payment_method,
    'notes', o.customer_note
  )
  into v_payload
  from public.orders o
  where o.id = p_order_id
    and o.checkout_attempt_id = v_attempt;

  return v_payload;
end;
$$;

revoke all on function public.get_order_notification_payload(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_order_notification_payload(uuid, text)
  to anon, authenticated;

comment on function public.get_order_notification_payload(uuid, text) is
  'Cost-free Telegram snapshot. Requires exact order id + checkout attempt capability; never returns COGS, admin notes, or payment credentials.';


-- The old two-argument dedupe functions accepted any real order UUID from an
-- anonymous caller. Keep them for migration compatibility, but remove public
-- execution and expose proof-bound overloads instead.
revoke all on function public.order_notification_was_sent(uuid, text)
  from public, anon, authenticated;
revoke all on function public.log_order_notification(uuid, text)
  from public, anon, authenticated;

create or replace function public.order_notification_was_sent(
  p_order_id uuid,
  p_channel text,
  p_checkout_attempt_id text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    join public.order_notifications n on n.order_id = o.id
    where o.id = p_order_id
      and o.checkout_attempt_id = btrim(coalesce(p_checkout_attempt_id, ''))
      and length(btrim(coalesce(p_checkout_attempt_id, ''))) between 8 and 64
      and btrim(coalesce(p_checkout_attempt_id, '')) ~ '^[A-Za-z0-9_-]+$'
      and n.channel = lower(btrim(coalesce(p_channel, '')))
      and n.status = 'sent'
  );
$$;

create or replace function public.log_order_notification(
  p_order_id uuid,
  p_channel text,
  p_checkout_attempt_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_attempt text := btrim(coalesce(p_checkout_attempt_id, ''));
  v_rows integer;
begin
  if p_order_id is null
     or length(v_attempt) < 8
     or length(v_attempt) > 64
     or v_attempt !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid notification proof.' using errcode = '22023';
  end if;
  if v_channel not in ('telegram') then
    raise exception 'Unsupported notification channel.' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.orders
    where id = p_order_id
      and checkout_attempt_id = v_attempt
  ) then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  insert into public.order_notifications (order_id, channel, status)
  values (p_order_id, v_channel, 'sent')
  on conflict on constraint order_notifications_order_channel_key do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.order_notification_was_sent(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.order_notification_was_sent(uuid, text, text)
  to anon, authenticated;

revoke all on function public.log_order_notification(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.log_order_notification(uuid, text, text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 2 — FIFO-safe finished-product stock adjustment
-- =====================================================================

create or replace function public.adjust_finished_product_stock(
  p_product_id uuid,
  p_quantity_delta_kg numeric,
  p_unit_cost numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta numeric(12,3);
  v_outstanding numeric(12,3);
  v_take numeric(12,3);
  v_cost numeric(12,2);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_actor text;
  v_stock record;
  v_product record;
  v_lot record;
  v_new_lot_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_product_id is null or p_quantity_delta_kg is null then
    raise exception 'Product and quantity delta are required.' using errcode = '22023';
  end if;
  if length(coalesce(v_note, '')) > 500 then
    raise exception 'Adjustment note is too long.' using errcode = '22023';
  end if;

  v_delta := round(p_quantity_delta_kg, 3);
  if v_delta = 0 or abs(v_delta) > 100000 then
    raise exception 'Quantity delta must be non-zero and no more than 100000 kg.'
      using errcode = '22023';
  end if;

  select id, purchase_cost_per_kg
  into v_product
  from public.products
  where id = p_product_id
    and kind = 'standard';

  if not found then
    raise exception 'Finished product not found.' using errcode = 'P0002';
  end if;

  -- Lock aggregate first, then lots: same order as checkout and status changes.
  select available_kg, reserved_kg, low_stock_threshold_kg
  into v_stock
  from public.inventory_stock
  where product_id = p_product_id
  for update;

  if not found then
    raise exception 'Inventory stock row not found.' using errcode = 'P0002';
  end if;

  select coalesce(a.display_name, a.email, (select auth.uid())::text)
  into v_actor
  from public.admin_users a
  where a.auth_user_id = (select auth.uid())
    and a.status = 'active'
  limit 1;

  if v_delta > 0 then
    v_cost := round(coalesce(p_unit_cost, v_product.purchase_cost_per_kg, 0), 2);
    if v_cost < 0 or v_cost > 10000000 then
      raise exception 'Unit cost is outside the allowed range.' using errcode = '22023';
    end if;

    insert into public.inventory_lots (
      product_id, received_qty_kg, remaining_qty_kg, reserved_qty_kg,
      unit_cost, received_date, status, source
    ) values (
      p_product_id, v_delta, v_delta, 0,
      v_cost, current_date, 'open', 'adjustment'
    )
    returning id into v_new_lot_id;

    update public.inventory_stock
    set available_kg = available_kg + v_delta
    where product_id = p_product_id;

    insert into public.inventory_movements (
      product_id, lot_id, movement_type, quantity_kg, reason, metadata
    ) values (
      p_product_id,
      v_new_lot_id,
      'adjustment',
      v_delta,
      coalesce(v_note, 'Admin stock restock'),
      jsonb_build_object(
        'direction', 'in',
        'unit_cost', v_cost,
        'changed_by', v_actor
      )
    );
  else
    v_outstanding := abs(v_delta);
    if v_stock.available_kg < v_outstanding then
      raise exception 'Adjustment exceeds available stock.' using errcode = '22023';
    end if;

    for v_lot in
      select id, remaining_qty_kg, reserved_qty_kg
      from public.inventory_lots
      where product_id = p_product_id
        and status = 'open'
        and remaining_qty_kg > reserved_qty_kg
      order by received_date, created_at, id
      for update
    loop
      exit when v_outstanding <= 0;
      v_take := least(v_outstanding, v_lot.remaining_qty_kg - v_lot.reserved_qty_kg);

      update public.inventory_lots
      set remaining_qty_kg = remaining_qty_kg - v_take,
          status = case
            when remaining_qty_kg - v_take = 0 then 'closed'
            else 'open'
          end
      where id = v_lot.id;

      insert into public.inventory_movements (
        product_id, lot_id, movement_type, quantity_kg, reason, metadata
      ) values (
        p_product_id,
        v_lot.id,
        'adjustment',
        v_take,
        coalesce(v_note, 'Admin stock adjustment'),
        jsonb_build_object('direction', 'out', 'changed_by', v_actor)
      );

      v_outstanding := round(v_outstanding - v_take, 3);
    end loop;

    if v_outstanding <> 0 then
      raise exception 'FIFO lots do not cover the requested adjustment.'
        using errcode = 'P0001';
    end if;

    update public.inventory_stock
    set available_kg = available_kg + v_delta
    where product_id = p_product_id;
  end if;

  select available_kg, reserved_kg, low_stock_threshold_kg
  into v_stock
  from public.inventory_stock
  where product_id = p_product_id;

  if v_stock.available_kg <> coalesce((
       select sum(remaining_qty_kg - reserved_qty_kg)
       from public.inventory_lots
       where product_id = p_product_id
     ), 0)
     or v_stock.reserved_kg <> coalesce((
       select sum(reserved_qty_kg)
       from public.inventory_lots
       where product_id = p_product_id
     ), 0) then
    raise exception 'Inventory FIFO invariant failed; adjustment rolled back.'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'available_kg', v_stock.available_kg,
    'reserved_kg', v_stock.reserved_kg,
    'on_hand_kg', v_stock.available_kg + v_stock.reserved_kg
  );
end;
$$;

revoke all on function public.adjust_finished_product_stock(uuid, numeric, numeric, text)
  from public, anon, authenticated;
grant execute on function public.adjust_finished_product_stock(uuid, numeric, numeric, text)
  to authenticated;

comment on function public.adjust_finished_product_stock(uuid, numeric, numeric, text) is
  'Admin-only FIFO-safe finished-product restock/manual adjustment. Positive deltas create adjustment lots; negative deltas consume only unreserved lot quantity oldest-first.';
