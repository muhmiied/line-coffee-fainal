-- Migration: 20260701104031_phase6_7_packaging_promos_pricing
-- Phase: 6-7 (Packaging inventory + promo codes / server-side pricing)
-- Purpose: Add count-based packaging inventory with FIFO cost traceability,
--          non-blocking checkout shortages, promo-code redemption controls,
--          and a DB-authoritative checkout pricing snapshot.
-- Idempotency: YES where practical - IF NOT EXISTS, CREATE OR REPLACE, guarded
--              function rename, unique order/redemption keys, and upserts.
-- Destructive: NO - no rows or columns are deleted and no historical order,
--              coffee lot, allocation, movement, or COGS value is rewritten.
-- Status: AUTHORED ONLY - not applied. Apply with `supabase db push` only after
--         review, backup/staging rehearsal, and explicit owner approval.
-- Rollback / repair: Forward-fix preferred. Before any Phase-6/7 checkout,
--                    the new tables/columns/functions may be dropped and the
--                    internal Phase-5 checkout function renamed back. After
--                    orders use packaging/promos, preserve ledgers and repair
--                    forward so audit/cost history remains intact.
-- Depends on: 20260630120000 (purchasing/lots) and 20260630130000
--             (Phase-5 FIFO checkout and exact-lot lifecycle).
--
-- Safety decisions:
--   * Coffee inventory_lots/order_lot_allocations are not altered.
--   * Packaging is a separate integer/count inventory and is deducted at Place
--     Order. Cancellation never restores it automatically.
--   * A packaging shortage writes order_packaging_lines + orders flags and never
--     rejects an otherwise-valid product order.
--   * Packaging costs come from packaging_lots FIFO allocations and are private.
--   * Promo discount applies only to orders.subtotal. Delivery and COGS are
--     untouched. The client never supplies an accepted price or discount.
--   * The Phase-5 checkout body is preserved under an internal name; the public
--     wrapper calls it in the same transaction, then adds promo + packaging.


-- =====================================================================
-- SECTION 1 - Packaging catalog, lots, order lines, allocations, movements
-- =====================================================================

create table if not exists public.packaging_items (
  id                   uuid primary key default gen_random_uuid(),
  operational_key      text not null unique
                         check (operational_key ~ '^[a-z0-9_]{2,64}$'),
  name                 text not null check (btrim(name) <> ''),
  sku                  text,
  packaging_kind       text not null default 'bag'
                         check (packaging_kind in ('bag', 'jar', 'canister', 'other')),
  capacity_g           integer check (capacity_g is null or capacity_g > 0),
  unit_type            text not null default 'count'
                         check (unit_type in ('count')),
  available_quantity   integer not null default 0 check (available_quantity >= 0),
  low_stock_threshold  integer not null default 0 check (low_stock_threshold >= 0),
  active               boolean not null default true,
  cost_per_unit        numeric(12,2) check (cost_per_unit is null or cost_per_unit >= 0),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

create unique index if not exists packaging_items_sku_key
  on public.packaging_items (lower(sku)) where sku is not null;
create index if not exists packaging_items_active_capacity_idx
  on public.packaging_items (active, packaging_kind, capacity_g);
create index if not exists packaging_items_low_stock_idx
  on public.packaging_items (available_quantity, low_stock_threshold)
  where active;

create table if not exists public.packaging_lots (
  id                  uuid primary key default gen_random_uuid(),
  packaging_item_id   uuid not null references public.packaging_items (id) on delete restrict,
  received_quantity   integer not null check (received_quantity > 0),
  remaining_quantity  integer not null check (remaining_quantity >= 0),
  unit_cost            numeric(12,2) not null check (unit_cost >= 0),
  received_at          timestamptz not null default now(),
  source               text not null default 'adjustment'
                         check (source in ('purchase', 'opening', 'adjustment')),
  status               text not null default 'open'
                         check (status in ('open', 'closed')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz,
  constraint packaging_lots_remaining_lte_received_chk
    check (remaining_quantity <= received_quantity)
);

create index if not exists packaging_lots_fifo_idx
  on public.packaging_lots (packaging_item_id, received_at, created_at, id)
  where status = 'open' and remaining_quantity > 0;

create table if not exists public.order_packaging_lines (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders (id) on delete cascade,
  packaging_item_id     uuid not null references public.packaging_items (id) on delete restrict,
  operational_key       text not null,
  name_snapshot         text not null,
  required_quantity     integer not null default 0 check (required_quantity >= 0),
  deducted_quantity     integer not null default 0 check (deducted_quantity >= 0),
  shortage_quantity     integer not null default 0 check (shortage_quantity >= 0),
  cost_total            numeric(12,2) not null default 0 check (cost_total >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  constraint order_packaging_lines_qty_balance_chk
    check (deducted_quantity + shortage_quantity = required_quantity),
  constraint order_packaging_lines_order_item_key
    unique (order_id, packaging_item_id)
);

create index if not exists order_packaging_lines_order_idx
  on public.order_packaging_lines (order_id);
create index if not exists order_packaging_lines_shortage_idx
  on public.order_packaging_lines (order_id)
  where shortage_quantity > 0;

create table if not exists public.order_packaging_allocations (
  id                    uuid primary key default gen_random_uuid(),
  order_packaging_line_id uuid not null
                           references public.order_packaging_lines (id) on delete cascade,
  order_id              uuid not null references public.orders (id) on delete cascade,
  packaging_item_id     uuid not null references public.packaging_items (id) on delete restrict,
  packaging_lot_id      uuid not null references public.packaging_lots (id) on delete restrict,
  quantity              integer not null check (quantity > 0),
  unit_cost             numeric(12,2) not null check (unit_cost >= 0),
  created_at            timestamptz not null default now()
);

create index if not exists order_packaging_allocations_line_idx
  on public.order_packaging_allocations (order_packaging_line_id);
create index if not exists order_packaging_allocations_order_idx
  on public.order_packaging_allocations (order_id);
create index if not exists order_packaging_allocations_lot_idx
  on public.order_packaging_allocations (packaging_lot_id);

create table if not exists public.packaging_movements (
  id                    uuid primary key default gen_random_uuid(),
  packaging_item_id     uuid not null references public.packaging_items (id) on delete restrict,
  packaging_lot_id      uuid references public.packaging_lots (id) on delete set null,
  order_id              uuid references public.orders (id) on delete set null,
  movement_type         text not null
                          check (movement_type in (
                            'opening', 'adjustment_in', 'adjustment_out',
                            'order_deduction'
                          )),
  quantity_delta        integer not null check (quantity_delta <> 0),
  unit_cost             numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  note                  text,
  changed_by            text,
  created_at            timestamptz not null default now()
);

create index if not exists packaging_movements_item_created_idx
  on public.packaging_movements (packaging_item_id, created_at desc);
create index if not exists packaging_movements_order_idx
  on public.packaging_movements (order_id) where order_id is not null;
create index if not exists packaging_movements_lot_idx
  on public.packaging_movements (packaging_lot_id) where packaging_lot_id is not null;


-- =====================================================================
-- SECTION 2 - Promo catalog and idempotent redemption ledger
-- =====================================================================

create table if not exists public.promo_codes (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique
                        check (
                          code = upper(btrim(code))
                          and code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'
                        ),
  status              text not null default 'active'
                        check (status in ('active', 'inactive')),
  discount_type       text not null
                        check (discount_type in ('fixed_amount', 'percentage')),
  value               numeric(12,2) not null check (value > 0),
  minimum_subtotal    numeric(12,2)
                        check (minimum_subtotal is null or minimum_subtotal >= 0),
  max_discount        numeric(12,2)
                        check (max_discount is null or max_discount > 0),
  starts_at           timestamptz,
  ends_at             timestamptz,
  usage_limit         integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit  integer check (per_customer_limit is null or per_customer_limit > 0),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  constraint promo_codes_percentage_value_chk
    check (discount_type <> 'percentage' or value <= 100),
  constraint promo_codes_date_window_chk
    check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists promo_codes_status_window_idx
  on public.promo_codes (status, starts_at, ends_at);

create table if not exists public.promo_redemptions (
  id                  uuid primary key default gen_random_uuid(),
  promo_code_id       uuid not null references public.promo_codes (id) on delete restrict,
  order_id            uuid not null references public.orders (id) on delete restrict,
  customer_id         uuid not null references public.customers (id) on delete restrict,
  code_snapshot       text not null,
  discount_amount     numeric(12,2) not null check (discount_amount >= 0),
  subtotal_snapshot   numeric(12,2) not null check (subtotal_snapshot >= 0),
  redeemed_at         timestamptz not null default now(),
  constraint promo_redemptions_order_key unique (order_id)
);

create index if not exists promo_redemptions_promo_idx
  on public.promo_redemptions (promo_code_id, redeemed_at);
create index if not exists promo_redemptions_customer_promo_idx
  on public.promo_redemptions (customer_id, promo_code_id);


-- =====================================================================
-- SECTION 3 - Order snapshots (public receipt remains cost-free)
-- =====================================================================

alter table public.orders
  add column if not exists promo_snapshot jsonb,
  add column if not exists pricing_snapshot jsonb,
  add column if not exists packaging_shortage boolean not null default false,
  add column if not exists packaging_snapshot jsonb,
  add column if not exists packaging_cost_total numeric(12,2)
    check (packaging_cost_total is null or packaging_cost_total >= 0),
  add column if not exists phase67_priced_at timestamptz;

comment on column public.orders.packaging_cost_total is
  'PRIVATE packaging cost snapshot from FIFO packaging lots. Never expose to anon/customers.';
comment on column public.orders.packaging_snapshot is
  'Admin-safe packaging requirement/deduction/shortage summary; detailed costs stay in admin-only packaging ledgers.';
comment on column public.orders.pricing_snapshot is
  'Frozen product subtotal, promo discount, delivery fee, and final total computed server-side at checkout.';


-- =====================================================================
-- SECTION 4 - Timestamps, RLS, explicit Data API grants
-- =====================================================================

drop trigger if exists trg_packaging_items_updated_at on public.packaging_items;
create trigger trg_packaging_items_updated_at
  before update on public.packaging_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_packaging_lots_updated_at on public.packaging_lots;
create trigger trg_packaging_lots_updated_at
  before update on public.packaging_lots
  for each row execute function public.set_updated_at();

drop trigger if exists trg_order_packaging_lines_updated_at on public.order_packaging_lines;
create trigger trg_order_packaging_lines_updated_at
  before update on public.order_packaging_lines
  for each row execute function public.set_updated_at();

drop trigger if exists trg_promo_codes_updated_at on public.promo_codes;
create trigger trg_promo_codes_updated_at
  before update on public.promo_codes
  for each row execute function public.set_updated_at();

alter table public.packaging_items enable row level security;
alter table public.packaging_lots enable row level security;
alter table public.order_packaging_lines enable row level security;
alter table public.order_packaging_allocations enable row level security;
alter table public.packaging_movements enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

drop policy if exists packaging_items_admin_read on public.packaging_items;
create policy packaging_items_admin_read on public.packaging_items
  for select to authenticated using ((select public.is_admin()));

drop policy if exists packaging_lots_admin_read on public.packaging_lots;
create policy packaging_lots_admin_read on public.packaging_lots
  for select to authenticated using ((select public.is_admin()));

drop policy if exists order_packaging_lines_admin_read on public.order_packaging_lines;
create policy order_packaging_lines_admin_read on public.order_packaging_lines
  for select to authenticated using ((select public.is_admin()));

drop policy if exists order_packaging_allocations_admin_read on public.order_packaging_allocations;
create policy order_packaging_allocations_admin_read on public.order_packaging_allocations
  for select to authenticated using ((select public.is_admin()));

drop policy if exists packaging_movements_admin_read on public.packaging_movements;
create policy packaging_movements_admin_read on public.packaging_movements
  for select to authenticated using ((select public.is_admin()));

drop policy if exists promo_codes_admin_read on public.promo_codes;
create policy promo_codes_admin_read on public.promo_codes
  for select to authenticated using ((select public.is_admin()));

drop policy if exists promo_redemptions_admin_read on public.promo_redemptions;
create policy promo_redemptions_admin_read on public.promo_redemptions
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.packaging_items from anon, authenticated;
revoke all on table public.packaging_lots from anon, authenticated;
revoke all on table public.order_packaging_lines from anon, authenticated;
revoke all on table public.order_packaging_allocations from anon, authenticated;
revoke all on table public.packaging_movements from anon, authenticated;
revoke all on table public.promo_codes from anon, authenticated;
revoke all on table public.promo_redemptions from anon, authenticated;

grant select on table public.packaging_items to authenticated;
grant select on table public.packaging_lots to authenticated;
grant select on table public.order_packaging_lines to authenticated;
grant select on table public.order_packaging_allocations to authenticated;
grant select on table public.packaging_movements to authenticated;
grant select on table public.promo_codes to authenticated;
grant select on table public.promo_redemptions to authenticated;


-- =====================================================================
-- SECTION 5 - Canonical launch packaging rows (zero stock, no stock effect)
-- =====================================================================

insert into public.packaging_items (
  operational_key, name, sku, packaging_kind, capacity_g,
  unit_type, available_quantity, low_stock_threshold, active, notes
) values
  ('bag_250g', '250g bag / container', 'PKG-BAG-250G', 'bag', 250,
   'count', 0, 10, true, 'Default packaging for 250g products and fallback for larger sizes.'),
  ('bag_500g', '500g bag / container', 'PKG-BAG-500G', 'bag', 500,
   'count', 0, 8, true, 'Default packaging for 500g products and fallback for 1kg.'),
  ('bag_1kg', '1kg bag / container', 'PKG-BAG-1KG', 'bag', 1000,
   'count', 0, 5, true, 'Default packaging for 1kg products.'),
  ('jar_canister', 'Jar / canister', 'PKG-JAR', 'canister', null,
   'count', 0, 5, false, 'Flexible inactive foundation; activate and map when a current product needs it.')
on conflict (operational_key) do nothing;


-- =====================================================================
-- SECTION 6 - Admin packaging RPCs + private FIFO deduction helper
-- =====================================================================

create or replace function public.upsert_packaging_item(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id              uuid;
  v_operational_key text := lower(btrim(coalesce(p_payload->>'operational_key', '')));
  v_name            text := btrim(coalesce(p_payload->>'name', ''));
  v_sku             text := nullif(btrim(coalesce(p_payload->>'sku', '')), '');
  v_kind            text := lower(btrim(coalesce(p_payload->>'packaging_kind', 'bag')));
  v_capacity_g      integer;
  v_threshold       integer;
  v_active          boolean;
  v_cost            numeric(12,2);
  v_notes           text := nullif(btrim(coalesce(p_payload->>'notes', '')), '');
  v_row             public.packaging_items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid packaging payload.' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_payload->>'id', '')::uuid;
    v_capacity_g := nullif(p_payload->>'capacity_g', '')::integer;
    v_threshold := coalesce(nullif(p_payload->>'low_stock_threshold', '')::integer, 0);
    v_active := coalesce(nullif(p_payload->>'active', '')::boolean, true);
    v_cost := nullif(p_payload->>'cost_per_unit', '')::numeric(12,2);
  exception when others then
    raise exception 'Invalid packaging values.' using errcode = '22023';
  end;

  if v_operational_key !~ '^[a-z0-9_]{2,64}$'
     or v_name = ''
     or v_kind not in ('bag', 'jar', 'canister', 'other')
     or v_threshold < 0
     or (v_capacity_g is not null and v_capacity_g <= 0)
     or (v_cost is not null and v_cost < 0)
     or length(v_name) > 160
     or length(coalesce(v_sku, '')) > 80
     or length(coalesce(v_notes, '')) > 2000 then
    raise exception 'Invalid packaging values.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.packaging_items (
      operational_key, name, sku, packaging_kind, capacity_g,
      low_stock_threshold, active, cost_per_unit, notes
    ) values (
      v_operational_key, v_name, v_sku, v_kind, v_capacity_g,
      v_threshold, v_active, v_cost, v_notes
    )
    returning * into v_row;
  else
    update public.packaging_items
    set operational_key = v_operational_key,
        name = v_name,
        sku = v_sku,
        packaging_kind = v_kind,
        capacity_g = v_capacity_g,
        low_stock_threshold = v_threshold,
        active = v_active,
        cost_per_unit = v_cost,
        notes = v_notes
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Packaging item not found.' using errcode = 'P0002';
    end if;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'operational_key', v_row.operational_key,
    'name', v_row.name,
    'sku', v_row.sku,
    'packaging_kind', v_row.packaging_kind,
    'capacity_g', v_row.capacity_g,
    'unit_type', v_row.unit_type,
    'available_quantity', v_row.available_quantity,
    'low_stock_threshold', v_row.low_stock_threshold,
    'active', v_row.active,
    'cost_per_unit', v_row.cost_per_unit,
    'notes', v_row.notes,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
exception
  when unique_violation then
    raise exception 'Packaging key or SKU is already in use.' using errcode = '23505';
end;
$$;

create or replace function public._deduct_packaging_fifo(
  p_packaging_item_id uuid,
  p_quantity integer,
  p_order_id uuid,
  p_order_packaging_line_id uuid,
  p_movement_type text,
  p_note text,
  p_changed_by text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item       public.packaging_items%rowtype;
  v_remaining  integer := p_quantity;
  v_take       integer;
  v_cost_total numeric(12,2) := 0;
  v_lot        record;
begin
  if p_quantity <= 0 then
    return 0;
  end if;
  if p_movement_type not in ('adjustment_out', 'order_deduction') then
    raise exception 'Unsupported packaging deduction type.' using errcode = '22023';
  end if;

  select * into v_item
  from public.packaging_items
  where id = p_packaging_item_id
  for update;

  if not found or v_item.available_quantity < p_quantity then
    raise exception 'Packaging inventory is inconsistent.' using errcode = '23514';
  end if;

  for v_lot in
    select id, remaining_quantity, unit_cost
    from public.packaging_lots
    where packaging_item_id = p_packaging_item_id
      and status = 'open'
      and remaining_quantity > 0
    order by received_at, created_at, id
    for update
  loop
    exit when v_remaining = 0;
    v_take := least(v_remaining, v_lot.remaining_quantity);

    update public.packaging_lots
    set remaining_quantity = remaining_quantity - v_take,
        status = case when remaining_quantity - v_take = 0 then 'closed' else 'open' end
    where id = v_lot.id;

    if p_order_packaging_line_id is not null then
      insert into public.order_packaging_allocations (
        order_packaging_line_id, order_id, packaging_item_id,
        packaging_lot_id, quantity, unit_cost
      ) values (
        p_order_packaging_line_id, p_order_id, p_packaging_item_id,
        v_lot.id, v_take, v_lot.unit_cost
      );
    end if;

    insert into public.packaging_movements (
      packaging_item_id, packaging_lot_id, order_id, movement_type,
      quantity_delta, unit_cost, note, changed_by
    ) values (
      p_packaging_item_id, v_lot.id, p_order_id, p_movement_type,
      -v_take, v_lot.unit_cost, p_note, p_changed_by
    );

    v_cost_total := v_cost_total + round(v_take * v_lot.unit_cost, 2);
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining <> 0 then
    raise exception 'Packaging lot balance is inconsistent.' using errcode = '23514';
  end if;

  update public.packaging_items
  set available_quantity = available_quantity - p_quantity
  where id = p_packaging_item_id;

  if p_order_packaging_line_id is not null then
    update public.order_packaging_lines
    set cost_total = round(cost_total + v_cost_total, 2)
    where id = p_order_packaging_line_id;
  end if;

  return round(v_cost_total, 2);
end;
$$;

create or replace function public.adjust_packaging_stock(
  p_packaging_item_id uuid,
  p_quantity_delta integer,
  p_unit_cost numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  return jsonb_build_object(
    'packaging_item_id', v_item.id,
    'available_quantity', v_item.available_quantity,
    'quantity_delta', p_quantity_delta,
    'cost_total', coalesce(v_cost_total, round(p_quantity_delta * v_cost, 2))
  );
end;
$$;

revoke all on function public.upsert_packaging_item(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_packaging_item(jsonb) to authenticated;
revoke all on function public._deduct_packaging_fifo(uuid, integer, uuid, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.adjust_packaging_stock(uuid, integer, numeric, text)
  from public, anon, authenticated;
grant execute on function public.adjust_packaging_stock(uuid, integer, numeric, text)
  to authenticated;


-- =====================================================================
-- SECTION 7 - Promo evaluation + admin CRUD + safe public preview
-- =====================================================================

create or replace function public._evaluate_promo_code(
  p_code text,
  p_subtotal numeric,
  p_customer_id uuid,
  p_lock_row boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code           text := upper(btrim(coalesce(p_code, '')));
  v_promo          public.promo_codes%rowtype;
  v_usage_count    integer;
  v_customer_count integer;
  v_discount       numeric(12,2);
begin
  if v_code = '' or v_code !~ '^[A-Z0-9][A-Z0-9_-]{1,31}$' then
    return jsonb_build_object(
      'status', 'invalid', 'code', null, 'discount_total', 0,
      'subtotal', round(greatest(coalesce(p_subtotal, 0), 0), 2),
      'discounted_subtotal', round(greatest(coalesce(p_subtotal, 0), 0), 2),
      'message', 'Promo code is invalid.'
    );
  end if;

  if p_lock_row then
    select * into v_promo
    from public.promo_codes
    where code = v_code
    for update;
  else
    select * into v_promo
    from public.promo_codes
    where code = v_code;
  end if;

  if not found then
    return jsonb_build_object(
      'status', 'invalid', 'code', null, 'discount_total', 0,
      'subtotal', round(p_subtotal, 2),
      'discounted_subtotal', round(p_subtotal, 2),
      'message', 'Promo code is invalid.'
    );
  end if;
  if v_promo.status <> 'active' then
    return jsonb_build_object(
      'status', 'inactive', 'code', v_code, 'discount_total', 0,
      'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
      'message', 'Promo code is inactive.'
    );
  end if;
  if v_promo.starts_at is not null and now() < v_promo.starts_at then
    return jsonb_build_object(
      'status', 'not_started', 'code', v_code, 'discount_total', 0,
      'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
      'message', 'Promo code is not active yet.'
    );
  end if;
  if v_promo.ends_at is not null and now() >= v_promo.ends_at then
    return jsonb_build_object(
      'status', 'expired', 'code', v_code, 'discount_total', 0,
      'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
      'message', 'Promo code has expired.'
    );
  end if;
  if v_promo.minimum_subtotal is not null and p_subtotal < v_promo.minimum_subtotal then
    return jsonb_build_object(
      'status', 'minimum_not_met', 'code', v_code, 'discount_total', 0,
      'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
      'minimum_subtotal', v_promo.minimum_subtotal,
      'message', 'Product subtotal does not meet this promo minimum.'
    );
  end if;

  if v_promo.usage_limit is not null then
    select count(*)::integer into v_usage_count
    from public.promo_redemptions
    where promo_code_id = v_promo.id;
    if v_usage_count >= v_promo.usage_limit then
      return jsonb_build_object(
        'status', 'usage_limit_reached', 'code', v_code, 'discount_total', 0,
        'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
        'message', 'Promo code usage limit has been reached.'
      );
    end if;
  end if;

  if v_promo.per_customer_limit is not null and p_customer_id is not null then
    select count(*)::integer into v_customer_count
    from public.promo_redemptions
    where promo_code_id = v_promo.id
      and customer_id = p_customer_id;
    if v_customer_count >= v_promo.per_customer_limit then
      return jsonb_build_object(
        'status', 'customer_limit_reached', 'code', v_code, 'discount_total', 0,
        'subtotal', round(p_subtotal, 2), 'discounted_subtotal', round(p_subtotal, 2),
        'message', 'This promo code has already reached your usage limit.'
      );
    end if;
  end if;

  if v_promo.discount_type = 'percentage' then
    v_discount := round(p_subtotal * v_promo.value / 100, 2);
  else
    v_discount := round(v_promo.value, 2);
  end if;
  if v_promo.max_discount is not null then
    v_discount := least(v_discount, v_promo.max_discount);
  end if;
  v_discount := least(greatest(v_discount, 0), p_subtotal);

  return jsonb_build_object(
    'status', 'valid',
    'promo_code_id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'value', v_promo.value,
    'discount_total', round(v_discount, 2),
    'subtotal', round(p_subtotal, 2),
    'discounted_subtotal', round(p_subtotal - v_discount, 2),
    'message', 'Promo code applied.'
  );
end;
$$;

create or replace function public.validate_promo_code(
  p_code text,
  p_subtotal numeric,
  p_guest_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_guest_id    text := nullif(btrim(coalesce(p_guest_id, '')), '');
begin
  if p_subtotal is null or p_subtotal < 0 or p_subtotal > 100000000 then
    raise exception 'Invalid product subtotal.' using errcode = '22023';
  end if;

  if auth.uid() is not null then
    select id into v_customer_id
    from public.customers
    where auth_user_id = auth.uid();
  elsif v_guest_id is not null then
    if length(v_guest_id) > 64 or v_guest_id !~ '^[A-Za-z0-9_-]+$' then
      raise exception 'Invalid guest identity.' using errcode = '22023';
    end if;
    select id into v_customer_id
    from public.customers
    where type = 'guest' and guest_id = v_guest_id;
  end if;

  return public._evaluate_promo_code(
    p_code, round(p_subtotal, 2), v_customer_id, false
  );
end;
$$;

create or replace function public.upsert_promo_code(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id                 uuid;
  v_code               text := upper(btrim(coalesce(p_payload->>'code', '')));
  v_status             text := lower(btrim(coalesce(p_payload->>'status', 'active')));
  v_type               text := lower(btrim(coalesce(p_payload->>'discount_type', '')));
  v_value              numeric(12,2);
  v_minimum            numeric(12,2);
  v_max_discount       numeric(12,2);
  v_starts             timestamptz;
  v_ends               timestamptz;
  v_usage_limit        integer;
  v_per_customer_limit integer;
  v_notes              text := nullif(btrim(coalesce(p_payload->>'notes', '')), '');
  v_row                public.promo_codes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid promo payload.' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_payload->>'id', '')::uuid;
    v_value := nullif(p_payload->>'value', '')::numeric(12,2);
    v_minimum := nullif(p_payload->>'minimum_subtotal', '')::numeric(12,2);
    v_max_discount := nullif(p_payload->>'max_discount', '')::numeric(12,2);
    v_starts := nullif(p_payload->>'starts_at', '')::timestamptz;
    v_ends := nullif(p_payload->>'ends_at', '')::timestamptz;
    v_usage_limit := nullif(p_payload->>'usage_limit', '')::integer;
    v_per_customer_limit := nullif(p_payload->>'per_customer_limit', '')::integer;
  exception when others then
    raise exception 'Invalid promo values.' using errcode = '22023';
  end;

  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'
     or v_status not in ('active', 'inactive')
     or v_type not in ('fixed_amount', 'percentage')
     or v_value is null or v_value <= 0
     or (v_type = 'percentage' and v_value > 100)
     or (v_minimum is not null and v_minimum < 0)
     or (v_max_discount is not null and v_max_discount <= 0)
     or (v_usage_limit is not null and v_usage_limit <= 0)
     or (v_per_customer_limit is not null and v_per_customer_limit <= 0)
     or (v_starts is not null and v_ends is not null and v_ends <= v_starts)
     or length(coalesce(v_notes, '')) > 2000 then
    raise exception 'Invalid promo values.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.promo_codes (
      code, status, discount_type, value, minimum_subtotal, max_discount,
      starts_at, ends_at, usage_limit, per_customer_limit, notes
    ) values (
      v_code, v_status, v_type, v_value, v_minimum, v_max_discount,
      v_starts, v_ends, v_usage_limit, v_per_customer_limit, v_notes
    )
    returning * into v_row;
  else
    update public.promo_codes
    set code = v_code,
        status = v_status,
        discount_type = v_type,
        value = v_value,
        minimum_subtotal = v_minimum,
        max_discount = v_max_discount,
        starts_at = v_starts,
        ends_at = v_ends,
        usage_limit = v_usage_limit,
        per_customer_limit = v_per_customer_limit,
        notes = v_notes
    where id = v_id
    returning * into v_row;
    if not found then
      raise exception 'Promo code not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
exception
  when unique_violation then
    raise exception 'Promo code is already in use.' using errcode = '23505';
end;
$$;

create or replace function public.deactivate_promo_code(p_promo_code_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.promo_codes%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.promo_codes
  set status = 'inactive'
  where id = p_promo_code_id
  returning * into v_row;

  if not found then
    raise exception 'Promo code not found.' using errcode = 'P0002';
  end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public._evaluate_promo_code(text, numeric, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.validate_promo_code(text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.validate_promo_code(text, numeric, text)
  to anon, authenticated;
revoke all on function public.upsert_promo_code(jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_promo_code(jsonb) to authenticated;
revoke all on function public.deactivate_promo_code(uuid)
  from public, anon, authenticated;
grant execute on function public.deactivate_promo_code(uuid) to authenticated;


-- =====================================================================
-- SECTION 8 - Packaging requirement resolution and FIFO consumption
-- =====================================================================
-- Locked launch mapping:
--   250g -> 1 x 250g
--   500g -> 1 x 500g, fallback 2 x 250g
--   1kg  -> 1 x 1kg, fallback 2 x 500g, final fallback 4 x 250g
-- Exact packages are consumed first. A fallback is used only when it can fully
-- package the remaining product units. Any unresolved quantity is recorded as
-- a shortage against the exact-size packaging item and never blocks checkout.

create or replace function public._packaging_available(p_packaging_item_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select greatest(
    least(
      i.available_quantity,
      coalesce(sum(l.remaining_quantity) filter (
        where l.status = 'open' and l.remaining_quantity > 0
      ), 0)::integer
    ),
    0
  )
  from public.packaging_items i
  left join public.packaging_lots l on l.packaging_item_id = i.id
  where i.id = p_packaging_item_id
    and i.active
  group by i.id, i.available_quantity;
$$;

create or replace function public._apply_packaging_quantity(
  p_order_id uuid,
  p_packaging_item_id uuid,
  p_required integer,
  p_deducted integer,
  p_shortage integer,
  p_order_code text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.packaging_items%rowtype;
  v_line_id uuid;
begin
  if p_required = 0 then
    return 0;
  end if;
  if p_required < 0 or p_deducted < 0 or p_shortage < 0
     or p_deducted + p_shortage <> p_required then
    raise exception 'Invalid packaging requirement.' using errcode = '23514';
  end if;

  select * into v_item
  from public.packaging_items
  where id = p_packaging_item_id;
  if not found then
    raise exception 'Required packaging catalog row is missing.' using errcode = '23514';
  end if;

  insert into public.order_packaging_lines (
    order_id, packaging_item_id, operational_key, name_snapshot,
    required_quantity, deducted_quantity, shortage_quantity
  ) values (
    p_order_id, v_item.id, v_item.operational_key, v_item.name,
    p_required, p_deducted, p_shortage
  )
  on conflict on constraint order_packaging_lines_order_item_key
  do update set
    required_quantity = order_packaging_lines.required_quantity + excluded.required_quantity,
    deducted_quantity = order_packaging_lines.deducted_quantity + excluded.deducted_quantity,
    shortage_quantity = order_packaging_lines.shortage_quantity + excluded.shortage_quantity
  returning id into v_line_id;

  if p_deducted > 0 then
    return public._deduct_packaging_fifo(
      p_packaging_item_id,
      p_deducted,
      p_order_id,
      v_line_id,
      'order_deduction',
      format('Packaging deducted at Place Order for %s', p_order_code),
      'system'
    );
  end if;
  return 0;
end;
$$;

create or replace function public._apply_order_packaging(
  p_order_id uuid,
  p_order_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_250_id          uuid;
  v_500_id          uuid;
  v_1kg_id          uuid;
  v_need_250        integer := 0;
  v_need_500        integer := 0;
  v_need_1kg        integer := 0;
  v_remaining       integer;
  v_available       integer;
  v_product_units   integer;
  v_container_units integer;
  v_required_total  integer := 0;
  v_deducted_total  integer := 0;
  v_shortage_total  integer := 0;
  v_cost_total      numeric(12,2) := 0;
  v_lines           jsonb;
begin
  select id into v_250_id
  from public.packaging_items where operational_key = 'bag_250g';
  select id into v_500_id
  from public.packaging_items where operational_key = 'bag_500g';
  select id into v_1kg_id
  from public.packaging_items where operational_key = 'bag_1kg';

  if v_250_id is null or v_500_id is null or v_1kg_id is null then
    raise exception 'Canonical packaging catalog is incomplete.' using errcode = '23514';
  end if;

  -- Consistent lock ordering prevents two differently-sized concurrent orders
  -- from deadlocking while they choose exact/fallback packaging.
  perform 1
  from public.packaging_items
  where id in (v_250_id, v_500_id, v_1kg_id)
  order by id
  for update;

  select
    coalesce(sum(quantity) filter (where variant_size = '250g'), 0)::integer,
    coalesce(sum(quantity) filter (where variant_size = '500g'), 0)::integer,
    coalesce(sum(quantity) filter (where variant_size = '1kg'), 0)::integer
  into v_need_250, v_need_500, v_need_1kg
  from public.order_items
  where order_id = p_order_id
    and kind = 'product';

  -- 250g exact.
  v_available := coalesce(public._packaging_available(v_250_id), 0);
  v_container_units := least(v_need_250, v_available);
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_250_id, v_need_250, v_container_units,
    v_need_250 - v_container_units, p_order_code
  );
  v_required_total := v_required_total + v_need_250;
  v_deducted_total := v_deducted_total + v_container_units;
  v_shortage_total := v_shortage_total + (v_need_250 - v_container_units);

  -- 500g exact, then complete fallback sets of 2 x 250g.
  v_remaining := v_need_500;
  v_available := coalesce(public._packaging_available(v_500_id), 0);
  v_product_units := least(v_remaining, v_available);
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_500_id, v_product_units, v_product_units, 0, p_order_code
  );
  v_required_total := v_required_total + v_product_units;
  v_deducted_total := v_deducted_total + v_product_units;
  v_remaining := v_remaining - v_product_units;

  v_available := coalesce(public._packaging_available(v_250_id), 0);
  v_product_units := least(v_remaining, floor(v_available / 2.0)::integer);
  v_container_units := v_product_units * 2;
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_250_id, v_container_units, v_container_units, 0, p_order_code
  );
  v_required_total := v_required_total + v_container_units;
  v_deducted_total := v_deducted_total + v_container_units;
  v_remaining := v_remaining - v_product_units;

  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_500_id, v_remaining, 0, v_remaining, p_order_code
  );
  v_required_total := v_required_total + v_remaining;
  v_shortage_total := v_shortage_total + v_remaining;

  -- 1kg exact, then 2 x 500g, then 4 x 250g.
  v_remaining := v_need_1kg;
  v_available := coalesce(public._packaging_available(v_1kg_id), 0);
  v_product_units := least(v_remaining, v_available);
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_1kg_id, v_product_units, v_product_units, 0, p_order_code
  );
  v_required_total := v_required_total + v_product_units;
  v_deducted_total := v_deducted_total + v_product_units;
  v_remaining := v_remaining - v_product_units;

  v_available := coalesce(public._packaging_available(v_500_id), 0);
  v_product_units := least(v_remaining, floor(v_available / 2.0)::integer);
  v_container_units := v_product_units * 2;
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_500_id, v_container_units, v_container_units, 0, p_order_code
  );
  v_required_total := v_required_total + v_container_units;
  v_deducted_total := v_deducted_total + v_container_units;
  v_remaining := v_remaining - v_product_units;

  v_available := coalesce(public._packaging_available(v_250_id), 0);
  v_product_units := least(v_remaining, floor(v_available / 4.0)::integer);
  v_container_units := v_product_units * 4;
  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_250_id, v_container_units, v_container_units, 0, p_order_code
  );
  v_required_total := v_required_total + v_container_units;
  v_deducted_total := v_deducted_total + v_container_units;
  v_remaining := v_remaining - v_product_units;

  v_cost_total := v_cost_total + public._apply_packaging_quantity(
    p_order_id, v_1kg_id, v_remaining, 0, v_remaining, p_order_code
  );
  v_required_total := v_required_total + v_remaining;
  v_shortage_total := v_shortage_total + v_remaining;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'operational_key', operational_key,
        'name', name_snapshot,
        'required_quantity', required_quantity,
        'deducted_quantity', deducted_quantity,
        'shortage_quantity', shortage_quantity
      )
      order by operational_key
    ),
    '[]'::jsonb
  )
  into v_lines
  from public.order_packaging_lines
  where order_id = p_order_id;

  return jsonb_build_object(
    'has_shortage', v_shortage_total > 0,
    'required_units', v_required_total,
    'deducted_units', v_deducted_total,
    'shortage_units', v_shortage_total,
    'cost_total', round(v_cost_total, 2),
    'lines', v_lines
  );
end;
$$;

revoke all on function public._packaging_available(uuid)
  from public, anon, authenticated;
revoke all on function public._apply_packaging_quantity(uuid, uuid, integer, integer, integer, text)
  from public, anon, authenticated;
revoke all on function public._apply_order_packaging(uuid, text)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 9 - Preserve Phase-5 checkout and add the Phase-6/7 wrapper
-- =====================================================================
-- The Phase-5 function is renamed once and kept byte-for-byte as the internal
-- order/customer/coffee-FIFO engine. The wrapper runs in the same transaction:
-- any invalid promo rolls the Phase-5 work back; any retry returns the original
-- receipt before promo usage or packaging can be counted twice.

do $phase67_checkout_rename$
begin
  if to_regprocedure('public._create_checkout_order_phase5(jsonb)') is null then
    alter function public.create_checkout_order(jsonb)
      rename to _create_checkout_order_phase5;
  end if;
end
$phase67_checkout_rename$;

revoke all on function public._create_checkout_order_phase5(jsonb)
  from public, anon, authenticated;

create or replace function public.create_checkout_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_uid            uuid := auth.uid();
  v_guest_id            text := nullif(btrim(coalesce(p_payload->>'guest_id', '')), '');
  v_checkout_attempt_id text := nullif(btrim(coalesce(p_payload->>'checkout_attempt_id', '')), '');
  v_existing            public.orders%rowtype;
  v_item_count          integer;
  v_base                jsonb;
  v_order               public.orders%rowtype;
  v_promo_code          text := upper(btrim(coalesce(p_payload->>'promo_code', '')));
  v_promo               jsonb;
  v_discount            numeric(12,2) := 0;
  v_total               numeric(12,2);
  v_packaging           jsonb;
begin
  -- Fast replay path. This intentionally returns historical/pre-migration
  -- orders unchanged and prevents a retry from retroactively applying Phase 6/7.
  if v_checkout_attempt_id is not null
     and length(v_checkout_attempt_id) <= 64
     and v_checkout_attempt_id ~ '^[A-Za-z0-9_-]+$' then
    select * into v_existing
    from public.orders
    where checkout_attempt_id = v_checkout_attempt_id;

    if found then
      if (
        v_auth_uid is null
        and v_existing.guest_id is distinct from v_guest_id
      ) or (
        v_auth_uid is not null
        and not exists (
          select 1
          from public.customers c
          where c.id = v_existing.customer_id
            and c.auth_user_id = v_auth_uid
        )
      ) then
        raise exception 'Checkout attempt identity is already in use.'
          using errcode = '22023';
      end if;

      select coalesce(sum(quantity), 0)::integer into v_item_count
      from public.order_items
      where order_id = v_existing.id;

      return jsonb_build_object(
        'order_id', v_existing.id,
        'code', v_existing.code,
        'subtotal', v_existing.subtotal,
        'discount_total', v_existing.discount_total,
        'delivery_fee', v_existing.delivery_fee,
        'total', v_existing.total,
        'promo_code', v_existing.promo_code,
        'payment_method', v_existing.payment_method,
        'payment_status', v_existing.payment_status,
        'item_count', v_item_count
      );
    end if;
  end if;

  -- Phase-5 order creation + exact coffee FIFO reservation. It still rejects
  -- builders, computes product prices/delivery server-side, and starts payment
  -- pending. Any exception below rolls all of this back atomically.
  v_base := public._create_checkout_order_phase5(p_payload);

  select * into v_order
  from public.orders
  where id = (v_base->>'order_id')::uuid
  for update;

  -- Concurrent same-attempt fallback: the winning transaction already applied
  -- promo + packaging. Return its stored receipt without repeating side effects.
  if v_order.phase67_priced_at is not null then
    return jsonb_build_object(
      'order_id', v_order.id,
      'code', v_order.code,
      'subtotal', v_order.subtotal,
      'discount_total', v_order.discount_total,
      'delivery_fee', v_order.delivery_fee,
      'total', v_order.total,
      'promo_code', v_order.promo_code,
      'payment_method', v_order.payment_method,
      'payment_status', v_order.payment_status,
      'item_count', (v_base->>'item_count')::integer
    );
  end if;

  if v_promo_code <> '' then
    v_promo := public._evaluate_promo_code(
      v_promo_code, v_order.subtotal, v_order.customer_id, true
    );
    if v_promo->>'status' <> 'valid' then
      raise exception 'Promo code rejected: %', v_promo->>'message'
        using errcode = '22023';
    end if;
    v_discount := (v_promo->>'discount_total')::numeric(12,2);
  else
    v_promo := null;
  end if;

  v_total := round(v_order.subtotal - v_discount + v_order.delivery_fee, 2);
  if v_total < 0 then
    raise exception 'Resulting order total would be negative.' using errcode = '23514';
  end if;

  if v_promo is not null then
    insert into public.promo_redemptions (
      promo_code_id, order_id, customer_id, code_snapshot,
      discount_amount, subtotal_snapshot
    ) values (
      (v_promo->>'promo_code_id')::uuid,
      v_order.id,
      v_order.customer_id,
      v_promo->>'code',
      v_discount,
      v_order.subtotal
    )
    on conflict on constraint promo_redemptions_order_key do nothing;
  end if;

  v_packaging := public._apply_order_packaging(v_order.id, v_order.code);

  update public.orders
  set promo_code = nullif(v_promo_code, ''),
      promo_snapshot = case
        when v_promo is null then null
        else jsonb_build_object(
          'code', v_promo->>'code',
          'discount_type', v_promo->>'discount_type',
          'value', (v_promo->>'value')::numeric,
          'discount_total', v_discount
        )
      end,
      discount_total = v_discount,
      total = v_total,
      pricing_snapshot = jsonb_build_object(
        'subtotal', v_order.subtotal,
        'discount_total', v_discount,
        'delivery_fee', v_order.delivery_fee,
        'total', v_total,
        'currency', 'EGP'
      ),
      packaging_shortage = (v_packaging->>'has_shortage')::boolean,
      packaging_snapshot = v_packaging - 'cost_total',
      packaging_cost_total = (v_packaging->>'cost_total')::numeric(12,2),
      phase67_priced_at = now()
  where id = v_order.id;

  return jsonb_build_object(
    'order_id', v_order.id,
    'code', v_order.code,
    'subtotal', v_order.subtotal,
    'discount_total', v_discount,
    'delivery_fee', v_order.delivery_fee,
    'total', v_total,
    'promo_code', nullif(v_promo_code, ''),
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'item_count', (v_base->>'item_count')::integer
  );
end;
$$;

revoke all on function public.create_checkout_order(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb)
  to anon, authenticated;


-- =====================================================================
-- SECTION 10 - Post-apply verification / manual rollback notes
-- =====================================================================
-- Verify after an owner-approved push:
--   select operational_key, available_quantity, low_stock_threshold, active
--   from public.packaging_items order by operational_key;
--   select code, status, discount_type, value, usage_limit
--   from public.promo_codes order by created_at desc;
--   select code, subtotal, discount_total, delivery_fee, total, promo_code,
--          packaging_shortage, packaging_snapshot, packaging_cost_total
--   from public.orders order by placed_at desc limit 20;
--   select * from public.order_packaging_lines order by created_at desc;
--   select * from public.promo_redemptions order by redeemed_at desc;
--
-- Forward-fix is required after real Phase-6/7 orders exist. Before any exist,
-- a manual rollback may:
--   drop function public.create_checkout_order(jsonb);
--   alter function public._create_checkout_order_phase5(jsonb)
--     rename to create_checkout_order;
--   grant execute on function public.create_checkout_order(jsonb)
--     to anon, authenticated;
-- Then drop Phase-6/7 helper/admin RPCs, tables, and the six additive order
-- columns only after confirming there are no Phase-6/7 records to preserve.
