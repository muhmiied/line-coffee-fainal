-- =====================================================================
-- Migration:  20260630120000_phase4_purchasing_suppliers_expenses_lots
-- Project:    Line Coffee V3
-- Phase:      4 (Purchases / suppliers / expenses / inventory lots foundation)
-- Runs after: 20260629130000_phase2_customer_identity_ownership
-- =====================================================================
--
-- Purpose: create the real backend FOUNDATION for stock inputs and cost —
--   suppliers, purchase receipts (header + line items), supplier payment
--   state, finished-product inventory lots, and operating expenses — and let a
--   received purchase increase the existing Phase-1 operational stock
--   (inventory_stock.available_kg) + record a ledger movement + create lots.
--   This prepares the system for FIFO/COGS in Phase 5 WITHOUT implementing FIFO
--   consumption yet.
--
-- Idempotency: YES — `create table if not exists`, `add column if not exists`,
--   `create or replace function`, `drop policy if exists` + recreate, guarded
--   `create index if not exists`, and the CHECK widening uses
--   `drop constraint if exists` + add (same proven pattern as
--   20260627100000's payment CHECK widening). Re-running is safe.
--
-- Destructive: NO. Purely additive. No table/column/data is dropped or
--   rewritten. The ONLY constraint touched is inventory_movements'
--   movement_type CHECK, which is widened ADDITIVELY (every existing allowed
--   value is preserved; only 'purchase_receive' is added) so all existing
--   ledger rows stay valid.
--
-- Status: AUTHORED ONLY — not applied. Apply with `supabase db push` after
--   Codex review + owner approval. Until then nothing here runs; the live
--   checkout/inventory keep their Phase-1 behaviour unchanged.
--
-- Rollback / repair: forward-fix only. To undo before any data is entered:
--   drop the 3 new functions, the 6 new tables (no FKs point INTO them from
--   pre-existing tables), and restore the inventory_movements CHECK to its
--   pre-Phase-4 value (the 5 original kinds). See "Rollback notes" footer.
--
-- Depends on: 20260625120000 (is_admin(), set_updated_at(), products,
--   customers, orders), 20260627100000 (inventory_stock, inventory_movements,
--   movement_type CHECK).
--
-- NON-GOALS (explicitly NOT in this phase — see master plan §5):
--   * NO FIFO consumption. Lots are created/received only; they are NOT consumed
--     at checkout or delivery. Phase 1's simple kg reserve/deduct on
--     inventory_stock remains the operational checkout stock source (Phase 5
--     replaces/extends it and converts opening stock -> opening lots atomically).
--   * NO opening-lot seed from the existing seeded available_kg — doing so would
--     immediately diverge from the live available_kg (Phase 1 deducts stock but
--     this phase does not consume lots), creating a double-count window. The
--     opening-stock -> opening-lot conversion belongs to Phase 5 (master §6.6).
--   * NO packaging inventory (Phase 6), NO raw-bean / espresso lots (Phase 8),
--     NO Make-Your-Flavor cost logic (Phase 9), NO accounting reports/dashboard
--     derivation (Phase 14), NO generic `inventory_items` abstraction (lots are
--     keyed directly by product_id to match the existing inventory_stock model
--     and stay within the finished-product scope).
--   * NO service-role code, NO public/customer access to any cost/supplier/
--     expense/purchase/lot data (all new tables are admin-only via is_admin()).
-- =====================================================================


-- =====================================================================
-- SECTION 1 — suppliers
-- =====================================================================
-- Practical supplier master. Balances are DERIVED (purchases.total_amount vs
-- paid_amount + supplier_payments), not stored here, to avoid drift.

create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (btrim(name) <> ''),
  contact_name text,
  phone        text,
  email        text,
  address      text,
  notes        text,
  status       text not null default 'active'
                 check (status in ('active', 'inactive')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index if not exists suppliers_status_idx on public.suppliers (status);
create index if not exists suppliers_name_idx   on public.suppliers (lower(name));


-- =====================================================================
-- SECTION 2 — purchases (header)
-- =====================================================================
-- A purchase from a supplier. status drives the receive flow; payment_status +
-- paid_amount track what is owed. total_amount is server-computed from the line
-- items (never trusted from the client). A purchase entering stock creates lots
-- + a stock movement only when RECEIVED (Section 7 receive_purchase RPC).

create table if not exists public.purchases (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references public.suppliers (id) on delete restrict,
  reference      text,                       -- optional invoice / PO number
  notes          text,
  status         text not null default 'draft'
                   check (status in ('draft', 'received', 'cancelled')),
  purchase_date  date not null default current_date,
  -- Money snapshot. total_amount = sum(purchase_items.line_cost), recomputed
  -- server-side. paid_amount accumulates supplier_payments for this purchase.
  total_amount   numeric(12,2) not null default 0 check (total_amount >= 0),
  paid_amount    numeric(12,2) not null default 0 check (paid_amount >= 0),
  payment_status text not null default 'unpaid'
                   check (payment_status in ('unpaid', 'partial', 'paid')),
  received_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists purchases_supplier_idx        on public.purchases (supplier_id);
create index if not exists purchases_status_idx          on public.purchases (status);
create index if not exists purchases_payment_status_idx  on public.purchases (payment_status);
create index if not exists purchases_purchase_date_idx   on public.purchases (purchase_date desc);


-- =====================================================================
-- SECTION 3 — purchase_items (lines)
-- =====================================================================
-- One line per finished product bought, in KG, at a per-kg unit cost. line_cost
-- = round(quantity_kg * unit_cost, 2), server-computed. Each line becomes its
-- own inventory_lot on receive (distinct cost lots are required for FIFO later).

create table if not exists public.purchase_items (
  id           uuid primary key default gen_random_uuid(),
  purchase_id  uuid not null references public.purchases (id) on delete cascade,
  -- Finished product (products.kind = 'standard'). RESTRICT keeps a purchase
  -- line auditable even if a product is later archived (archive != delete here).
  product_id   uuid not null references public.products (id) on delete restrict,
  -- Display snapshot so a later product rename doesn't rewrite purchase history.
  product_name text,
  quantity_kg  numeric(12,3) not null check (quantity_kg > 0),
  unit_cost    numeric(12,2) not null check (unit_cost >= 0),   -- per kg
  line_cost    numeric(12,2) not null check (line_cost >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists purchase_items_purchase_idx on public.purchase_items (purchase_id);
create index if not exists purchase_items_product_idx  on public.purchase_items (product_id);


-- =====================================================================
-- SECTION 4 — inventory_lots (FIFO foundation, finished products)
-- =====================================================================
-- A received stock lot for a finished product, keyed by product_id (matching
-- the existing inventory_stock model). received_qty_kg is frozen; remaining_qty_kg
-- is what FIFO will draw down LATER (Phase 5). In this phase remaining_qty_kg is
-- created equal to received_qty_kg and is NEVER decremented — nothing consumes
-- lots yet. unit_cost is the per-kg cost basis for future COGS.

create table if not exists public.inventory_lots (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  purchase_id      uuid references public.purchases (id) on delete set null,
  purchase_item_id uuid references public.purchase_items (id) on delete set null,
  supplier_id      uuid references public.suppliers (id) on delete set null,
  received_qty_kg  numeric(12,3) not null check (received_qty_kg > 0),
  remaining_qty_kg numeric(12,3) not null check (remaining_qty_kg >= 0),
  unit_cost        numeric(12,2) not null check (unit_cost >= 0),   -- per kg
  received_date    date not null default current_date,
  -- 'open' = has remaining qty; 'closed' = fully consumed (Phase 5 onward).
  status           text not null default 'open'
                     check (status in ('open', 'closed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  constraint inventory_lots_remaining_lte_received_chk
    check (remaining_qty_kg <= received_qty_kg)
);

-- FIFO read index (oldest open lots first per product) for Phase 5.
create index if not exists inventory_lots_product_fifo_idx
  on public.inventory_lots (product_id, received_date, created_at)
  where status = 'open';
create index if not exists inventory_lots_purchase_idx on public.inventory_lots (purchase_id);


-- =====================================================================
-- SECTION 5 — supplier_payments (reduce payable)
-- =====================================================================
-- A payment made TO a supplier, optionally allocated to a specific purchase.
-- Recorded via record_purchase_payment (Section 7) which also bumps the
-- purchase's paid_amount + payment_status atomically.

create table if not exists public.supplier_payments (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  purchase_id uuid references public.purchases (id) on delete set null,
  amount      numeric(12,2) not null check (amount > 0),
  method      text,
  notes       text,
  paid_at     date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists supplier_payments_supplier_idx on public.supplier_payments (supplier_id);
create index if not exists supplier_payments_purchase_idx on public.supplier_payments (purchase_id);


-- =====================================================================
-- SECTION 6 — expenses (operating costs — NEVER touch stock)
-- =====================================================================
-- Operating expenses are running business costs (rent/utilities/marketing/...),
-- explicitly NOT inventory buys. They have NO product link and create NO stock
-- movement and NO lot — the only thing keeping purchases and expenses separate.

create table if not exists public.expenses (
  id             uuid primary key default gen_random_uuid(),
  expense_date   date not null default current_date,
  category       text not null check (btrim(category) <> ''),
  amount         numeric(12,2) not null check (amount >= 0),
  payment_method text,
  notes          text,
  attachment_url text,                        -- placeholder for a future receipt image
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists expenses_date_idx     on public.expenses (expense_date desc);
create index if not exists expenses_category_idx on public.expenses (category);


-- =====================================================================
-- SECTION 7 — widen inventory_movements.movement_type for 'purchase_receive'
-- =====================================================================
-- The Phase-1 ledger only knew initial_stock / reserve / release / deduct /
-- adjustment. Receiving a purchase needs a dedicated, auditable movement kind so
-- a purchase receipt is distinguishable from a manual adjustment in reports.
-- This is an ADDITIVE CHECK widening (all existing kinds preserved) — the exact
-- proven pattern used by 20260627100000 for the orders payment CHECKs. Existing
-- ledger rows stay valid; nothing is rewritten. (NOT a risky enum change: it is
-- a text CHECK, additive, and required for the documented receive flow.)

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in (
    'initial_stock', 'reserve', 'release', 'deduct', 'adjustment',
    'purchase_receive'
  ));


-- =====================================================================
-- SECTION 8 — updated_at triggers
-- =====================================================================
drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_purchases_updated_at on public.purchases;
create trigger trg_purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_lots_updated_at on public.inventory_lots;
create trigger trg_inventory_lots_updated_at
  before update on public.inventory_lots
  for each row execute function public.set_updated_at();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECTION 9 — RLS + grants (ADMIN-ONLY; no anon, no customer)
-- =====================================================================
-- Every new table holds private cost / supplier / expense data. None of it is
-- ever readable by anon or by a customer. All access is gated by is_admin().
-- (config.toml has auto-expose OFF, so explicit grants are required for the
-- Data API to reach these at all.)
--
-- Write strategy:
--   * suppliers + expenses: simple records with no cross-row computation ->
--     direct admin CRUD via RLS (the data layer writes them).
--   * purchases / purchase_items / inventory_lots / supplier_payments: written
--     ONLY through the SECURITY DEFINER RPCs in this section (server-computed
--     totals, atomic lot/stock effects). The Data API gets SELECT only, so a
--     client can read but cannot hand-insert an unbalanced purchase or a lot.

alter table public.suppliers         enable row level security;
alter table public.purchases         enable row level security;
alter table public.purchase_items    enable row level security;
alter table public.inventory_lots    enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.expenses          enable row level security;

-- suppliers — full admin CRUD.
drop policy if exists suppliers_admin_all on public.suppliers;
create policy suppliers_admin_all on public.suppliers
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- expenses — full admin CRUD.
drop policy if exists expenses_admin_all on public.expenses;
create policy expenses_admin_all on public.expenses
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- purchases / purchase_items / inventory_lots / supplier_payments — admin READ
-- only via the API; writes go through the DEFINER RPCs (which run as the table
-- owner and so are not blocked by the absence of a write policy).
drop policy if exists purchases_admin_read on public.purchases;
create policy purchases_admin_read on public.purchases
  for select to authenticated using (public.is_admin());

drop policy if exists purchase_items_admin_read on public.purchase_items;
create policy purchase_items_admin_read on public.purchase_items
  for select to authenticated using (public.is_admin());

drop policy if exists inventory_lots_admin_read on public.inventory_lots;
create policy inventory_lots_admin_read on public.inventory_lots
  for select to authenticated using (public.is_admin());

drop policy if exists supplier_payments_admin_read on public.supplier_payments;
create policy supplier_payments_admin_read on public.supplier_payments
  for select to authenticated using (public.is_admin());

-- Table privileges. RLS gates the rows; these grant the privilege layer.
-- anon is never granted anything here.
grant select, insert, update, delete on table public.suppliers to authenticated;
grant select, insert, update, delete on table public.expenses   to authenticated;
grant select on table public.purchases         to authenticated;
grant select on table public.purchase_items    to authenticated;
grant select on table public.inventory_lots    to authenticated;
grant select on table public.supplier_payments to authenticated;


-- =====================================================================
-- SECTION 10 — create_purchase(jsonb)  (draft, server-computed totals)
-- =====================================================================
-- Creates a DRAFT purchase + its line items in one transaction. Computes
-- line_cost + total_amount server-side. No stock effect (a draft has not been
-- received). Admin-only.
--
-- payload:
--   { "supplier_id": "<uuid>",
--     "reference"?: "...", "notes"?: "...", "purchase_date"?: "YYYY-MM-DD",
--     "items": [ { "product_id": "<uuid>", "quantity_kg": 5.0, "unit_cost": 120 } ] }
-- returns: { purchase_id, total_amount, item_count, status }

create or replace function public.create_purchase(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supplier_id   uuid;
  v_reference     text := nullif(btrim(coalesce(p_payload->>'reference', '')), '');
  v_notes         text := nullif(btrim(coalesce(p_payload->>'notes', '')), '');
  v_date          date;
  v_item          jsonb;
  v_product       public.products%rowtype;
  v_qty           numeric(12,3);
  v_unit_cost     numeric(12,2);
  v_line_cost     numeric(12,2);
  v_total         numeric(12,2) := 0;
  v_item_count    integer := 0;
  v_purchase_id   uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid purchase payload.' using errcode = '22023';
  end if;

  v_supplier_id := nullif(btrim(coalesce(p_payload->>'supplier_id', '')), '')::uuid;
  if v_supplier_id is null then
    raise exception 'A supplier is required.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.suppliers s where s.id = v_supplier_id) then
    raise exception 'Supplier not found.' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_payload->'items') <> 'array'
     or jsonb_array_length(p_payload->'items') = 0 then
    raise exception 'A purchase needs at least one item.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_payload->'items') > 200 then
    raise exception 'Too many items in one purchase.' using errcode = '22023';
  end if;

  v_date := coalesce(
    nullif(btrim(coalesce(p_payload->>'purchase_date', '')), '')::date,
    current_date
  );
  if length(coalesce(v_reference, '')) > 120
     or length(coalesce(v_notes, '')) > 2000 then
    raise exception 'Purchase reference or notes too long.' using errcode = '22023';
  end if;

  insert into public.purchases (
    supplier_id, reference, notes, status, purchase_date,
    total_amount, paid_amount, payment_status
  ) values (
    v_supplier_id, v_reference, v_notes, 'draft', v_date,
    0, 0, 'unpaid'
  )
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_payload->'items')
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Invalid purchase item.' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = nullif(btrim(coalesce(v_item->>'product_id', '')), '')::uuid;
    if not found then
      raise exception 'Purchase item product not found.' using errcode = 'P0002';
    end if;
    -- Phase 4 scope: finished products only (raw beans Phase 8, packaging Phase 6).
    if v_product.kind <> 'standard' then
      raise exception 'Only finished products can be purchased in this phase.'
        using errcode = '22023';
    end if;

    v_qty := (v_item->>'quantity_kg')::numeric;
    if v_qty is null or v_qty <= 0 or v_qty > 100000 then
      raise exception 'Invalid purchase item quantity.' using errcode = '22023';
    end if;

    v_unit_cost := round((v_item->>'unit_cost')::numeric, 2);
    if v_unit_cost is null or v_unit_cost < 0 or v_unit_cost > 1000000 then
      raise exception 'Invalid purchase item unit cost.' using errcode = '22023';
    end if;

    v_line_cost := round(v_qty * v_unit_cost, 2);
    v_total     := v_total + v_line_cost;
    v_item_count := v_item_count + 1;

    insert into public.purchase_items (
      purchase_id, product_id, product_name, quantity_kg, unit_cost, line_cost
    ) values (
      v_purchase_id, v_product.id, v_product.name_en, v_qty, v_unit_cost, v_line_cost
    );
  end loop;

  update public.purchases
    set total_amount = v_total
  where id = v_purchase_id;

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'total_amount', v_total,
    'item_count', v_item_count,
    'status', 'draft'
  );
end;
$$;

revoke all on function public.create_purchase(jsonb) from public, anon, authenticated;
grant execute on function public.create_purchase(jsonb) to authenticated;


-- =====================================================================
-- SECTION 11 — receive_purchase(uuid)  (draft -> received; creates lots + stock)
-- =====================================================================
-- Atomically receives a DRAFT purchase:
--   * one inventory_lot per purchase_item (received = remaining = line qty),
--   * increases inventory_stock.available_kg by the purchased kg per product
--     (reserved_kg and the Phase-1 reserve/deduct logic are UNTOUCHED),
--   * writes a 'purchase_receive' inventory_movements ledger row per line,
--   * flips the purchase to status='received', received_at=now().
-- It does NOT consume any lot and does NOT change payment state. Admin-only.
-- Guarded so a purchase cannot be received twice (no double stock).
-- returns: { purchase_id, status, lots_created, total_kg }

create or replace function public.receive_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase    public.purchases%rowtype;
  r             record;
  v_lot_id      uuid;
  v_lots        integer := 0;
  v_total_kg    numeric(12,3) := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_purchase_id is null then
    raise exception 'Purchase id is required.' using errcode = '22023';
  end if;

  select * into v_purchase
  from public.purchases
  where id = p_purchase_id
  for update;
  if not found then
    raise exception 'Purchase not found.' using errcode = 'P0002';
  end if;

  -- Only a draft can be received. A received/cancelled purchase is rejected so
  -- stock can never be added twice for the same receipt.
  if v_purchase.status <> 'draft' then
    raise exception 'Only a draft purchase can be received (current status: %).',
      v_purchase.status using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.purchase_items pi where pi.purchase_id = v_purchase.id
  ) then
    raise exception 'Cannot receive a purchase with no items.' using errcode = '22023';
  end if;

  -- One lot + one stock increment + one ledger row per line.
  for r in
    select pi.id, pi.product_id, pi.quantity_kg, pi.unit_cost
    from public.purchase_items pi
    where pi.purchase_id = v_purchase.id
    order by pi.created_at, pi.id
  loop
    insert into public.inventory_lots (
      product_id, purchase_id, purchase_item_id, supplier_id,
      received_qty_kg, remaining_qty_kg, unit_cost, received_date, status
    ) values (
      r.product_id, v_purchase.id, r.id, v_purchase.supplier_id,
      r.quantity_kg, r.quantity_kg, r.unit_cost, v_purchase.purchase_date, 'open'
    )
    returning id into v_lot_id;

    -- Increase operational available stock (Phase 1 model). reserved_kg and the
    -- reserve/deduct lifecycle are intentionally not touched. Upsert is robust if
    -- a stock row is somehow missing (every product gets one via the seed/trigger).
    insert into public.inventory_stock (product_id, available_kg)
    values (r.product_id, r.quantity_kg)
    on conflict (product_id) do update
      set available_kg = inventory_stock.available_kg + excluded.available_kg;

    insert into public.inventory_movements (
      product_id, order_id, movement_type, quantity_kg, reason, metadata
    ) values (
      r.product_id, null, 'purchase_receive', r.quantity_kg, 'Purchase received',
      jsonb_build_object(
        'purchase_id', v_purchase.id,
        'purchase_item_id', r.id,
        'lot_id', v_lot_id,
        'supplier_id', v_purchase.supplier_id,
        'unit_cost', r.unit_cost
      )
    );

    v_lots := v_lots + 1;
    v_total_kg := v_total_kg + r.quantity_kg;
  end loop;

  update public.purchases
    set status = 'received', received_at = now()
  where id = v_purchase.id;

  return jsonb_build_object(
    'purchase_id', v_purchase.id,
    'status', 'received',
    'lots_created', v_lots,
    'total_kg', v_total_kg
  );
end;
$$;

revoke all on function public.receive_purchase(uuid) from public, anon, authenticated;
grant execute on function public.receive_purchase(uuid) to authenticated;


-- =====================================================================
-- SECTION 12 — record_purchase_payment(jsonb)  (paid / partial / unpaid)
-- =====================================================================
-- Records a payment to a supplier against a purchase, bumps the purchase's
-- paid_amount, and recomputes payment_status (unpaid/partial/paid). Overpayment
-- is allowed (paid_amount may exceed total_amount — a supplier advance/credit,
-- per accounting.ts SupplierPayable.creditBalance) and still reads as 'paid'.
-- Admin-only. returns: { purchase_id, paid_amount, total_amount, payment_status }

create or replace function public.record_purchase_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase_id uuid;
  v_amount      numeric(12,2);
  v_method      text := nullif(btrim(coalesce(p_payload->>'method', '')), '');
  v_notes       text := nullif(btrim(coalesce(p_payload->>'notes', '')), '');
  v_paid_at     date;
  v_purchase    public.purchases%rowtype;
  v_new_paid    numeric(12,2);
  v_status      text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid payment payload.' using errcode = '22023';
  end if;

  v_purchase_id := nullif(btrim(coalesce(p_payload->>'purchase_id', '')), '')::uuid;
  if v_purchase_id is null then
    raise exception 'A purchase is required.' using errcode = '22023';
  end if;

  v_amount := round((p_payload->>'amount')::numeric, 2);
  if v_amount is null or v_amount <= 0 or v_amount > 100000000 then
    raise exception 'Invalid payment amount.' using errcode = '22023';
  end if;
  if length(coalesce(v_method, '')) > 60 or length(coalesce(v_notes, '')) > 1000 then
    raise exception 'Payment method or notes too long.' using errcode = '22023';
  end if;
  v_paid_at := coalesce(
    nullif(btrim(coalesce(p_payload->>'paid_at', '')), '')::date,
    current_date
  );

  select * into v_purchase
  from public.purchases
  where id = v_purchase_id
  for update;
  if not found then
    raise exception 'Purchase not found.' using errcode = 'P0002';
  end if;
  if v_purchase.status = 'cancelled' then
    raise exception 'Cannot pay a cancelled purchase.' using errcode = '22023';
  end if;

  insert into public.supplier_payments (
    supplier_id, purchase_id, amount, method, notes, paid_at
  ) values (
    v_purchase.supplier_id, v_purchase.id, v_amount, v_method, v_notes, v_paid_at
  );

  v_new_paid := v_purchase.paid_amount + v_amount;
  v_status := case
    when v_new_paid <= 0 then 'unpaid'
    when v_new_paid >= v_purchase.total_amount then 'paid'
    else 'partial'
  end;

  update public.purchases
    set paid_amount = v_new_paid,
        payment_status = v_status
  where id = v_purchase.id;

  return jsonb_build_object(
    'purchase_id', v_purchase.id,
    'paid_amount', v_new_paid,
    'total_amount', v_purchase.total_amount,
    'payment_status', v_status
  );
end;
$$;

revoke all on function public.record_purchase_payment(jsonb) from public, anon, authenticated;
grant execute on function public.record_purchase_payment(jsonb) to authenticated;


-- =====================================================================
-- FOOTER — Rollback notes (forward-fix only; before any data is entered)
-- =====================================================================
--   drop function if exists public.record_purchase_payment(jsonb);
--   drop function if exists public.receive_purchase(uuid);
--   drop function if exists public.create_purchase(jsonb);
--   drop table if exists public.supplier_payments;
--   drop table if exists public.inventory_lots;
--   drop table if exists public.purchase_items;
--   drop table if exists public.purchases;
--   drop table if exists public.expenses;
--   drop table if exists public.suppliers;
--   -- restore the pre-Phase-4 movement CHECK (drop 'purchase_receive'):
--   alter table public.inventory_movements
--     drop constraint if exists inventory_movements_movement_type_check;
--   alter table public.inventory_movements
--     add constraint inventory_movements_movement_type_check
--     check (movement_type in
--       ('initial_stock','reserve','release','deduct','adjustment'));
-- (Restoring the CHECK only works if no 'purchase_receive' rows exist yet.)
-- =====================================================================
