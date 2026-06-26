-- =====================================================================
-- Migration: Admin Orders Real + atomic inventory status effects
-- Runs after: 20260627100000_checkout_orders_inventory
-- =====================================================================
-- This migration exposes admin-only order reads through the existing RLS
-- policies and adds one guarded RPC for status transitions. It does not delete
-- or rewrite existing order, item, event, stock, or movement data.

grant usage on schema public to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_status_events to authenticated;

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

  -- Checkout already reduced available_kg and increased reserved_kg. Only
  -- cancellation and shipping consume the open reservation here.
  if v_next_status in ('cancelled', 'shipped') then
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
          else 'Order shipped; reservation deducted'
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
