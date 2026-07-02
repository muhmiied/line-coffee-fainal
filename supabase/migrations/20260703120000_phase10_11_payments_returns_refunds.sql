-- =====================================================================
-- Migration:  20260703120000_phase10_11_payments_returns_refunds
-- Project:    Line Coffee V3
-- Phase:      10-11 (Payments · safe order metadata editing · Returns · Refunds)
-- Runs after: 20260701124938_phase8_9_harden_builder_views
-- =====================================================================
--
-- PURPOSE
--   Add a real, auditable money + returns layer on top of the existing order
--   lifecycle, WITHOUT touching checkout pricing, delivery, discounts, FIFO
--   reservation/deduction, COGS snapshots, ownership, or checkout idempotency.
--
--     * PAYMENTS  — `order_payments` ledger + `record_order_payment` RPC. Admin
--       records partial/full payments (cash / bank_transfer / mobile_wallet /
--       other) with amount, reference, notes, date. paid / remaining / refunded
--       are always derived from the ledger. Overpayment (gross paid > order
--       total) is rejected. `orders.payment_status` is RECOMPUTED from real
--       ledger data — orders still START pending, and `delivered` never
--       auto-marks paid (that RPC is untouched).
--     * REFUNDS   — `order_refunds` ledger + `record_order_refund` RPC. Separate
--       from returns. Full/partial. A refund can never exceed
--       (paid − previous refunds). Refunds only move the payment/refund balance;
--       they never change subtotal, delivery, discount, stock, or COGS.
--     * RETURNS   — `order_returns` (+ `order_return_items`) + `record_order_return`
--       RPC. Admin returns delivered order lines per item/quantity with a
--       reason, notes, and condition (sellable / damaged / other). A SELLABLE
--       return restores stock ONLY through the order's original deducted FIFO
--       allocations (coffee via inventory_lots, espresso via espresso_bean_lots);
--       Make-Your-Flavor never moves stock; damaged/other never restock;
--       packaging is never restored. You can never return more units than
--       remain un-returned on a line. A return does NOT imply a refund.
--     * EDITING   — `update_admin_order_note` RPC for the always-safe admin note
--       (metadata only, any status). Item/price editing is DEFERRED as unsafe
--       (would corrupt FIFO/allocations/promo/COGS); delivery-fee editing before
--       delivery already exists (`update_admin_order_delivery_fee`, Phase 1).
--
-- DEPENDENCY
--   20260625120000 (orders/order_items/is_admin()/admin_users; order_items
--     already has returned_quantity with a 0<=returned<=quantity CHECK;
--     variant_size_to_kg via 20260627100000),
--   20260627100000 (inventory_stock/inventory_movements; payment_status CHECK
--     already widened to include 'pending'),
--   20260630130000 (order_lot_allocations + inventory_lots.reserved_qty_kg —
--     this migration adds returned_qty_kg to the allocation ledger and restores
--     into those exact lots),
--   20260701120000 (order_espresso_bean_allocations + espresso_bean_lots/stock —
--     same return-restore treatment for the separate bean resource).
--
-- DESTRUCTIVE?  NO. Purely additive: 4 new tables, 2 additive columns +
--   guarded CHECKs on 2 existing allocation tables, 6 new functions (2 internal
--   restore helpers + 1 internal status-recompute + 3 admin RPCs) and 1 admin
--   note RPC. No existing table/column/row is dropped or rewritten. NO existing
--   function is replaced (checkout + status RPCs are untouched).
--
-- IDEMPOTENCY  YES. `create table/index if not exists`,
--   `add column if not exists`, `drop constraint/policy if exists` + recreate,
--   `create or replace function`. Re-running is safe.
--
-- SECURITY
--   * order_payments / order_refunds / order_returns / order_return_items:
--     admin-only base tables (RLS admin SELECT; NO anon access). All writes go
--     through SECURITY DEFINER RPCs (`set search_path = ''`, `is_admin()`
--     guard). No customer-facing RPC/view reads these — refund/payment data is
--     never exposed to anon/customers; the customer order-detail RPC is
--     untouched and stays cost-free.
--   * Internal helpers (_restore_*_return_lots, _recompute_order_payment_status)
--     are SECURITY DEFINER, `set search_path = ''`, revoked from client roles.
--   * No service-role code anywhere.
--
-- SAFE-OR-STOP
--   A sellable restock that cannot be fully satisfied from the order's own
--   DEDUCTED allocations RAISES (rolls the whole return back) rather than
--   silently corrupting stock. Overpayment / over-refund RAISE. All money +
--   stock writes for one call are one transaction.
--
-- NON-GOALS (out of scope here — master plan stop conditions):
--   * NO item/price order editing (deferred as unsafe). NO change to checkout,
--     delivery, discounts/promo, FIFO reserve/deduct, COGS, or ownership.
--   * NO Phase 12/13/14/15 work. NO broad admin mock cleanup. NO public
--     redesign. NO service-role code.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — order_payments (money received ledger)
-- =====================================================================
create table if not exists public.order_payments (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  method     text not null check (method in ('cash', 'bank_transfer', 'mobile_wallet', 'other')),
  reference  text,
  notes      text,
  paid_at    timestamptz not null default now(),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists order_payments_order_idx on public.order_payments (order_id, paid_at);

alter table public.order_payments enable row level security;

drop policy if exists order_payments_admin_read on public.order_payments;
create policy order_payments_admin_read on public.order_payments
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.order_payments from anon, authenticated;
grant select on table public.order_payments to authenticated;


-- =====================================================================
-- SECTION 2 — order_refunds (money returned ledger, separate from returns)
-- =====================================================================
create table if not exists public.order_refunds (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null check (method in ('cash', 'bank_transfer', 'mobile_wallet', 'other')),
  reference   text,
  notes       text,
  refunded_at timestamptz not null default now(),
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists order_refunds_order_idx on public.order_refunds (order_id, refunded_at);

alter table public.order_refunds enable row level security;

drop policy if exists order_refunds_admin_read on public.order_refunds;
create policy order_refunds_admin_read on public.order_refunds
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.order_refunds from anon, authenticated;
grant select on table public.order_refunds to authenticated;


-- =====================================================================
-- SECTION 3 — order_returns (header) + order_return_items (lines)
-- =====================================================================
create table if not exists public.order_returns (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  reason       text,
  notes        text,
  -- Summary of sellable kg restocked by this return event (coffee + beans).
  restocked_kg numeric(12,3) not null default 0 check (restocked_kg >= 0),
  created_by   text,
  created_at   timestamptz not null default now()
);

create index if not exists order_returns_order_idx on public.order_returns (order_id, created_at);

create table if not exists public.order_return_items (
  id            uuid primary key default gen_random_uuid(),
  return_id     uuid not null references public.order_returns (id) on delete cascade,
  -- RESTRICT: keep the return line auditable; do not allow deleting a returned
  -- order line out from under its return record.
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  -- Snapshot of the line kind at return time (product / custom_espresso / custom_flavor).
  kind          text not null,
  quantity      integer not null check (quantity > 0),
  condition     text not null check (condition in ('sellable', 'damaged', 'other')),
  restocked     boolean not null default false,
  restocked_kg  numeric(12,3) not null default 0 check (restocked_kg >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists order_return_items_return_idx on public.order_return_items (return_id);
create index if not exists order_return_items_order_item_idx on public.order_return_items (order_item_id);

alter table public.order_returns enable row level security;
alter table public.order_return_items enable row level security;

drop policy if exists order_returns_admin_read on public.order_returns;
create policy order_returns_admin_read on public.order_returns
  for select to authenticated using ((select public.is_admin()));

drop policy if exists order_return_items_admin_read on public.order_return_items;
create policy order_return_items_admin_read on public.order_return_items
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.order_returns from anon, authenticated;
revoke all on table public.order_return_items from anon, authenticated;
grant select on table public.order_returns to authenticated;
grant select on table public.order_return_items to authenticated;


-- =====================================================================
-- SECTION 4 — Return-tracking columns on the deducted-allocation ledgers
-- =====================================================================
-- Additive. `returned_qty_kg` tracks how much of each DEDUCTED allocation has
-- been restored by sellable returns, so a return can never restore more than
-- was delivered from that lot, and repeat returns can't double-restore.
-- Existing rows default to 0 (0 <= deducted_qty_kg holds), so the guarded
-- CHECKs are valid for all pre-existing data.

alter table public.order_lot_allocations
  add column if not exists returned_qty_kg numeric(12,3) not null default 0;

alter table public.order_lot_allocations
  drop constraint if exists order_lot_allocations_returned_lte_deducted_chk;
alter table public.order_lot_allocations
  add constraint order_lot_allocations_returned_lte_deducted_chk
  check (returned_qty_kg >= 0 and returned_qty_kg <= deducted_qty_kg);

alter table public.order_espresso_bean_allocations
  add column if not exists returned_qty_kg numeric(12,3) not null default 0;

alter table public.order_espresso_bean_allocations
  drop constraint if exists order_espresso_bean_alloc_returned_lte_deducted_chk;
alter table public.order_espresso_bean_allocations
  add constraint order_espresso_bean_alloc_returned_lte_deducted_chk
  check (returned_qty_kg >= 0 and returned_qty_kg <= deducted_qty_kg);


-- =====================================================================
-- SECTION 5 — _recompute_order_payment_status (internal)
-- =====================================================================
-- Derives orders.payment_status from the real ledgers. Called by the payment
-- and refund RPCs (which already hold the order row FOR UPDATE).
--   paid = Σ order_payments.amount ; refunded = Σ order_refunds.amount
--   paid = 0                       -> 'pending'  (initial state preserved)
--   refunded >= paid               -> 'refunded' (everything paid was refunded)
--   (paid - refunded) >= total     -> 'paid'
--   else                           -> 'partially_paid'
-- Never sets 'paid' from a delivery/status change — only real money moves here.
create or replace function public._recompute_order_payment_status(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total    numeric(12,2);
  v_paid     numeric(12,2);
  v_refunded numeric(12,2);
  v_status   text;
begin
  select total into v_total from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.order_payments where order_id = p_order_id;

  select coalesce(sum(amount), 0) into v_refunded
  from public.order_refunds where order_id = p_order_id;

  if v_paid = 0 then
    v_status := 'pending';
  elsif v_refunded >= v_paid then
    v_status := 'refunded';
  elsif (v_paid - v_refunded) >= v_total then
    v_status := 'paid';
  else
    v_status := 'partially_paid';
  end if;

  update public.orders
    set payment_status = v_status,
        updated_at = now()
  where id = p_order_id;

  return v_status;
end;
$$;

revoke all on function public._recompute_order_payment_status(uuid)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 6 — record_order_payment (admin RPC)
-- =====================================================================
create or replace function public.record_order_payment(
  p_order_id  uuid,
  p_amount    numeric,
  p_method    text,
  p_reference text default null,
  p_notes     text default null,
  p_paid_at   timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order     public.orders%rowtype;
  v_amount    numeric(12,2);
  v_method    text := lower(btrim(coalesce(p_method, '')));
  v_ref       text := nullif(btrim(coalesce(p_reference, '')), '');
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_paid_at   timestamptz := coalesce(p_paid_at, now());
  v_actor     text;
  v_paid      numeric(12,2);
  v_refunded  numeric(12,2);
  v_status    text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;

  begin
    v_amount := round(p_amount::numeric, 2);
  exception when others then
    raise exception 'Invalid payment amount.' using errcode = '22023';
  end;
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then
    raise exception 'Payment amount must be greater than zero.' using errcode = '22023';
  end if;
  if v_method not in ('cash', 'bank_transfer', 'mobile_wallet', 'other') then
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;
  if length(coalesce(v_ref, '')) > 160 or length(coalesce(v_notes, '')) > 1000 then
    raise exception 'Payment reference or notes are too long.' using errcode = '22023';
  end if;

  -- Serialize against concurrent payment/refund writes for the same order.
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'Cannot record a payment on a cancelled order.' using errcode = '22023';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.order_payments where order_id = p_order_id;

  -- Overpayment guard: gross recorded payments may not exceed the order total.
  if round(v_paid + v_amount, 2) > v_order.total then
    raise exception 'Payment exceeds the order total. Recorded % of % EGP already paid.',
      v_paid, v_order.total using errcode = '22023';
  end if;

  select coalesce(a.display_name, a.email, auth.uid()::text) into v_actor
  from public.admin_users a
  where a.auth_user_id = auth.uid() and a.status = 'active'
  limit 1;

  insert into public.order_payments (order_id, amount, method, reference, notes, paid_at, created_by)
  values (p_order_id, v_amount, v_method, v_ref, v_notes, v_paid_at, coalesce(v_actor, auth.uid()::text));

  v_status := public._recompute_order_payment_status(p_order_id);

  select coalesce(sum(amount), 0) into v_paid     from public.order_payments where order_id = p_order_id;
  select coalesce(sum(amount), 0) into v_refunded from public.order_refunds  where order_id = p_order_id;

  return jsonb_build_object(
    'order_id',       v_order.id,
    'code',           v_order.code,
    'total',          v_order.total,
    'paid_total',     v_paid,
    'refunded_total', v_refunded,
    'net_paid',       round(v_paid - v_refunded, 2),
    'remaining',      greatest(round(v_order.total - (v_paid - v_refunded), 2), 0),
    'payment_status', v_status
  );
end;
$$;

revoke all on function public.record_order_payment(uuid, numeric, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_order_payment(uuid, numeric, text, text, text, timestamptz)
  to authenticated;


-- =====================================================================
-- SECTION 7 — record_order_refund (admin RPC)
-- =====================================================================
create or replace function public.record_order_refund(
  p_order_id    uuid,
  p_amount      numeric,
  p_method      text,
  p_reference   text default null,
  p_notes       text default null,
  p_refunded_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order       public.orders%rowtype;
  v_amount      numeric(12,2);
  v_method      text := lower(btrim(coalesce(p_method, '')));
  v_ref         text := nullif(btrim(coalesce(p_reference, '')), '');
  v_notes       text := nullif(btrim(coalesce(p_notes, '')), '');
  v_refunded_at timestamptz := coalesce(p_refunded_at, now());
  v_actor       text;
  v_paid        numeric(12,2);
  v_refunded    numeric(12,2);
  v_status      text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;

  begin
    v_amount := round(p_amount::numeric, 2);
  exception when others then
    raise exception 'Invalid refund amount.' using errcode = '22023';
  end;
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then
    raise exception 'Refund amount must be greater than zero.' using errcode = '22023';
  end if;
  if v_method not in ('cash', 'bank_transfer', 'mobile_wallet', 'other') then
    raise exception 'Unsupported refund method.' using errcode = '22023';
  end if;
  if length(coalesce(v_ref, '')) > 160 or length(coalesce(v_notes, '')) > 1000 then
    raise exception 'Refund reference or notes are too long.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount), 0) into v_paid     from public.order_payments where order_id = p_order_id;
  select coalesce(sum(amount), 0) into v_refunded from public.order_refunds  where order_id = p_order_id;

  if v_paid = 0 then
    raise exception 'Cannot refund an order with no recorded payment.' using errcode = '22023';
  end if;
  -- A refund can never exceed (paid − previous refunds).
  if round(v_refunded + v_amount, 2) > v_paid then
    raise exception 'Refund exceeds the refundable amount (% paid, % already refunded).',
      v_paid, v_refunded using errcode = '22023';
  end if;

  select coalesce(a.display_name, a.email, auth.uid()::text) into v_actor
  from public.admin_users a
  where a.auth_user_id = auth.uid() and a.status = 'active'
  limit 1;

  insert into public.order_refunds (order_id, amount, method, reference, notes, refunded_at, created_by)
  values (p_order_id, v_amount, v_method, v_ref, v_notes, v_refunded_at, coalesce(v_actor, auth.uid()::text));

  v_status := public._recompute_order_payment_status(p_order_id);

  select coalesce(sum(amount), 0) into v_paid     from public.order_payments where order_id = p_order_id;
  select coalesce(sum(amount), 0) into v_refunded from public.order_refunds  where order_id = p_order_id;

  return jsonb_build_object(
    'order_id',       v_order.id,
    'code',           v_order.code,
    'total',          v_order.total,
    'paid_total',     v_paid,
    'refunded_total', v_refunded,
    'net_paid',       round(v_paid - v_refunded, 2),
    'remaining',      greatest(round(v_order.total - (v_paid - v_refunded), 2), 0),
    'payment_status', v_status
  );
end;
$$;

revoke all on function public.record_order_refund(uuid, numeric, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_order_refund(uuid, numeric, text, text, text, timestamptz)
  to authenticated;


-- =====================================================================
-- SECTION 8 — _restore_product_return_lots (internal FIFO restore, coffee)
-- =====================================================================
-- Restores p_restore_kg of a delivered PRODUCT line back into the exact lots it
-- was deducted from (respecting original FIFO allocations), reopening closed
-- lots and bumping inventory_stock.available_kg. Returns the kg actually
-- restored. RAISES if the order's own DEDUCTED allocations can't cover the
-- requested restore (safe-or-stop: never over-restore or invent stock).
create or replace function public._restore_product_return_lots(
  p_order_id      uuid,
  p_order_item_id uuid,
  p_product_id    uuid,
  p_restore_kg    numeric,
  p_order_code    text,
  p_actor         text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left numeric(12,3) := round(coalesce(p_restore_kg, 0), 3);
  v_take numeric(12,3);
  a      record;
begin
  if v_left <= 0 then
    return 0;
  end if;

  -- Lock the aggregate stock row first (same object order as checkout/deduct)
  -- so a concurrent status change / checkout cannot deadlock.
  perform 1 from public.inventory_stock where product_id = p_product_id for update;

  for a in
    select id, lot_id, deducted_qty_kg, returned_qty_kg
    from public.order_lot_allocations
    where order_id = p_order_id
      and order_item_id = p_order_item_id
      and status = 'deducted'
      and (deducted_qty_kg - returned_qty_kg) > 0
    order by created_at asc, id asc
    for update
  loop
    exit when v_left <= 0;
    v_take := least(a.deducted_qty_kg - a.returned_qty_kg, v_left);
    if v_take <= 0 then
      continue;
    end if;

    -- Goods come back into the same lot; reopen it if it had closed.
    update public.inventory_lots
      set remaining_qty_kg = remaining_qty_kg + v_take,
          status = 'open'
    where id = a.lot_id;

    update public.order_lot_allocations
      set returned_qty_kg = returned_qty_kg + v_take
    where id = a.id;

    update public.inventory_stock
      set available_kg = available_kg + v_take
    where product_id = p_product_id;

    insert into public.inventory_movements (
      product_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
    ) values (
      p_product_id, p_order_id, a.lot_id, 'adjustment', v_take,
      'Customer return; sellable stock restored',
      jsonb_build_object(
        'order_code', p_order_code, 'lot_id', a.lot_id,
        'order_item_id', p_order_item_id, 'kind', 'customer_return',
        'changed_by', p_actor
      )
    );

    v_left := round(v_left - v_take, 3);
  end loop;

  if v_left > 0.0005 then
    raise exception 'Cannot safely restock this return: delivered lot allocations do not cover % kg. No stock was changed.',
      p_restore_kg using errcode = 'P0001';
  end if;

  return round(p_restore_kg, 3);
end;
$$;

revoke all on function public._restore_product_return_lots(uuid, uuid, uuid, numeric, text, text)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 9 — _restore_espresso_return_lots (internal FIFO restore, beans)
-- =====================================================================
-- Mirror of Section 8 for a custom_espresso line, restoring across the line's
-- deducted bean allocations (respecting espresso bean allocations).
create or replace function public._restore_espresso_return_lots(
  p_order_id      uuid,
  p_order_item_id uuid,
  p_restore_kg    numeric,
  p_order_code    text,
  p_actor         text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left numeric(12,3) := round(coalesce(p_restore_kg, 0), 3);
  v_take numeric(12,3);
  b      record;
begin
  if v_left <= 0 then
    return 0;
  end if;

  -- Lock the aggregate bean-stock rows for this line's beans first.
  perform 1
  from public.espresso_bean_stock
  where bean_id in (
    select distinct al.bean_id
    from public.order_espresso_bean_allocations al
    where al.order_id = p_order_id
      and al.order_item_id = p_order_item_id
      and al.status = 'deducted'
  )
  for update;

  for b in
    select id, bean_id, lot_id, deducted_qty_kg, returned_qty_kg
    from public.order_espresso_bean_allocations
    where order_id = p_order_id
      and order_item_id = p_order_item_id
      and status = 'deducted'
      and (deducted_qty_kg - returned_qty_kg) > 0
    order by created_at asc, id asc
    for update
  loop
    exit when v_left <= 0;
    v_take := least(b.deducted_qty_kg - b.returned_qty_kg, v_left);
    if v_take <= 0 then
      continue;
    end if;

    update public.espresso_bean_lots
      set remaining_qty_kg = remaining_qty_kg + v_take,
          status = 'open'
    where id = b.lot_id;

    update public.order_espresso_bean_allocations
      set returned_qty_kg = returned_qty_kg + v_take
    where id = b.id;

    update public.espresso_bean_stock
      set available_kg = available_kg + v_take
    where bean_id = b.bean_id;

    insert into public.espresso_bean_movements (
      bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
    ) values (
      b.bean_id, p_order_id, b.lot_id, 'adjustment', v_take,
      'Customer return; sellable bean stock restored',
      jsonb_build_object(
        'order_code', p_order_code, 'lot_id', b.lot_id,
        'order_item_id', p_order_item_id, 'kind', 'customer_return',
        'changed_by', p_actor
      )
    );

    v_left := round(v_left - v_take, 3);
  end loop;

  if v_left > 0.0005 then
    raise exception 'Cannot safely restock this espresso return: delivered bean allocations do not cover % kg. No stock was changed.',
      p_restore_kg using errcode = 'P0001';
  end if;

  return round(p_restore_kg, 3);
end;
$$;

revoke all on function public._restore_espresso_return_lots(uuid, uuid, numeric, text, text)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 10 — record_order_return (admin RPC)
-- =====================================================================
-- Records a return of one or more delivered order lines. Per line: validates
-- the quantity against (quantity − returned_quantity), bumps
-- order_items.returned_quantity, and — only when condition = 'sellable' —
-- restores stock through the line's original deducted allocations:
--   * product          -> _restore_product_return_lots (coffee FIFO)
--   * custom_espresso   -> _restore_espresso_return_lots (bean FIFO)
--   * custom_flavor     -> NO stock movement (Make-Your-Flavor is cost-only)
-- damaged/other never restock. Packaging is never restored. A return is NOT a
-- refund — money is untouched here. p_items: jsonb array of
--   { order_item_id, quantity, condition, notes? }.
create or replace function public.record_order_return(
  p_order_id uuid,
  p_reason   text,
  p_notes    text,
  p_items    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order        public.orders%rowtype;
  v_reason       text := nullif(btrim(coalesce(p_reason, '')), '');
  v_notes        text := nullif(btrim(coalesce(p_notes, '')), '');
  v_actor        text;
  v_return_id    uuid;
  v_item         jsonb;
  v_order_item   public.order_items%rowtype;
  v_oi_id        uuid;
  v_qty          integer;
  v_condition    text;
  v_line_notes   text;
  v_available    integer;
  v_per_unit_kg  numeric;
  v_restore_kg   numeric(12,3);
  v_restocked    boolean;
  v_restocked_kg numeric(12,3);
  v_total_restock_kg numeric(12,3) := 0;
  v_result_items jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item to return.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many return lines in one request.' using errcode = '22023';
  end if;
  if length(coalesce(v_reason, '')) > 500 or length(coalesce(v_notes, '')) > 1000 then
    raise exception 'Return reason or notes are too long.' using errcode = '22023';
  end if;

  -- Lock the order; returns are only for delivered orders (delivered path
  -- guarantees deducted allocations exist for a sellable restock).
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if v_order.status not in ('delivered', 'returned') then
    raise exception 'Returns can only be created for delivered orders.' using errcode = '22023';
  end if;

  select coalesce(a.display_name, a.email, auth.uid()::text) into v_actor
  from public.admin_users a
  where a.auth_user_id = auth.uid() and a.status = 'active'
  limit 1;

  insert into public.order_returns (order_id, reason, notes, restocked_kg, created_by)
  values (p_order_id, v_reason, v_notes, 0, coalesce(v_actor, auth.uid()::text))
  returning id into v_return_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid return line.' using errcode = '22023';
    end if;

    begin
      v_oi_id := (v_item->>'order_item_id')::uuid;
    exception when others then
      raise exception 'Invalid return line item.' using errcode = '22023';
    end;
    if length(coalesce(v_item->>'quantity', '')) > 4
       or coalesce(v_item->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'Invalid return quantity.' using errcode = '22023';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    v_condition := lower(btrim(coalesce(v_item->>'condition', '')));
    v_line_notes := nullif(btrim(coalesce(v_item->>'notes', '')), '');
    if v_condition not in ('sellable', 'damaged', 'other') then
      raise exception 'Return condition must be sellable, damaged, or other.' using errcode = '22023';
    end if;
    if length(coalesce(v_line_notes, '')) > 500 then
      raise exception 'Return line notes are too long.' using errcode = '22023';
    end if;

    -- Lock the line so returned_quantity moves atomically.
    select * into v_order_item
    from public.order_items
    where id = v_oi_id and order_id = p_order_id
    for update;
    if not found then
      raise exception 'A selected line does not belong to this order.' using errcode = '22023';
    end if;
    if v_order_item.kind not in ('product', 'custom_espresso', 'custom_flavor') then
      raise exception 'This line kind cannot be returned.' using errcode = '22023';
    end if;

    v_available := v_order_item.quantity - v_order_item.returned_quantity;
    if v_qty <= 0 or v_qty > v_available then
      raise exception 'Cannot return % unit(s) of line %; only % remain returnable.',
        v_qty, v_order_item.name_en, v_available using errcode = '22023';
    end if;

    v_restocked := false;
    v_restocked_kg := 0;

    if v_condition = 'sellable' then
      if v_order_item.kind = 'product' then
        v_per_unit_kg := public.variant_size_to_kg(v_order_item.variant_size);
        if v_per_unit_kg is null or v_per_unit_kg <= 0 then
          raise exception 'Cannot restock a product line with an unknown package size.' using errcode = '22023';
        end if;
        v_restore_kg := round(v_per_unit_kg * v_qty, 3);
        perform public._restore_product_return_lots(
          p_order_id, v_oi_id, v_order_item.product_id, v_restore_kg, v_order.code, coalesce(v_actor, 'system')
        );
        v_restocked := true;
        v_restocked_kg := v_restore_kg;

      elsif v_order_item.kind = 'custom_espresso' then
        v_per_unit_kg := public.variant_size_to_kg(v_order_item.variant_size);
        if v_per_unit_kg is null or v_per_unit_kg <= 0 then
          raise exception 'Cannot restock an espresso line with an unknown package size.' using errcode = '22023';
        end if;
        v_restore_kg := round(v_per_unit_kg * v_qty, 3);
        perform public._restore_espresso_return_lots(
          p_order_id, v_oi_id, v_restore_kg, v_order.code, coalesce(v_actor, 'system')
        );
        v_restocked := true;
        v_restocked_kg := v_restore_kg;

      else
        -- custom_flavor: cost-only, never touches stock. Sellable is accepted
        -- but restores nothing.
        v_restocked := false;
        v_restocked_kg := 0;
      end if;
    end if;

    update public.order_items
      set returned_quantity = returned_quantity + v_qty
    where id = v_oi_id;

    insert into public.order_return_items (
      return_id, order_item_id, kind, quantity, condition, restocked, restocked_kg, notes
    ) values (
      v_return_id, v_oi_id, v_order_item.kind, v_qty, v_condition, v_restocked, v_restocked_kg, v_line_notes
    );

    v_total_restock_kg := v_total_restock_kg + v_restocked_kg;

    v_result_items := v_result_items || jsonb_build_array(jsonb_build_object(
      'order_item_id', v_oi_id,
      'name_en',       v_order_item.name_en,
      'kind',          v_order_item.kind,
      'quantity',      v_qty,
      'condition',     v_condition,
      'restocked',     v_restocked,
      'restocked_kg',  v_restocked_kg
    ));
  end loop;

  update public.order_returns
    set restocked_kg = round(v_total_restock_kg, 3)
  where id = v_return_id;

  return jsonb_build_object(
    'return_id',          v_return_id,
    'order_id',           v_order.id,
    'code',               v_order.code,
    'total_restocked_kg', round(v_total_restock_kg, 3),
    'items',              v_result_items
  );
end;
$$;

revoke all on function public.record_order_return(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_order_return(uuid, text, text, jsonb) to authenticated;


-- =====================================================================
-- SECTION 11 — update_admin_order_note (safe metadata editing, any status)
-- =====================================================================
-- The admin note is pure metadata — never touches money, stock, delivery, or
-- discount — so it is always safe to edit at any status. Item/price editing is
-- deliberately NOT provided (unsafe against FIFO/allocations/promo/COGS);
-- delivery-fee editing before delivery is the Phase-1 RPC.
create or replace function public.update_admin_order_note(
  p_order_id   uuid,
  p_admin_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_note  text := nullif(btrim(coalesce(p_admin_note, '')), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;
  if length(coalesce(v_note, '')) > 2000 then
    raise exception 'Admin note is too long.' using errcode = '22023';
  end if;

  update public.orders
    set admin_note = v_note,
        updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('order_id', v_order.id, 'code', v_order.code, 'admin_note', v_order.admin_note);
end;
$$;

revoke all on function public.update_admin_order_note(uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_admin_order_note(uuid, text) to authenticated;


-- =====================================================================
-- FOOTER — Rollback notes (forward-fix preferred)
-- =====================================================================
-- Before any Phase-10/11 payment/refund/return exists, this migration can be
-- rolled back by dropping the new objects (money/return ledgers are additive):
--   drop function if exists public.update_admin_order_note(uuid, text);
--   drop function if exists public.record_order_return(uuid, text, text, jsonb);
--   drop function if exists public._restore_espresso_return_lots(uuid, uuid, numeric, text, text);
--   drop function if exists public._restore_product_return_lots(uuid, uuid, uuid, numeric, text, text);
--   drop function if exists public.record_order_refund(uuid, numeric, text, text, text, timestamptz);
--   drop function if exists public.record_order_payment(uuid, numeric, text, text, text, timestamptz);
--   drop function if exists public._recompute_order_payment_status(uuid);
--   alter table public.order_espresso_bean_allocations drop constraint if exists order_espresso_bean_alloc_returned_lte_deducted_chk;
--   alter table public.order_espresso_bean_allocations drop column if exists returned_qty_kg;
--   alter table public.order_lot_allocations drop constraint if exists order_lot_allocations_returned_lte_deducted_chk;
--   alter table public.order_lot_allocations drop column if exists returned_qty_kg;
--   drop table if exists public.order_return_items;
--   drop table if exists public.order_returns;
--   drop table if exists public.order_refunds;
--   drop table if exists public.order_payments;
-- After real money/return data exists, repair forward instead (dropping loses
-- the payment/refund/return ledgers and the returned_qty_kg restore tracking).
-- =====================================================================
