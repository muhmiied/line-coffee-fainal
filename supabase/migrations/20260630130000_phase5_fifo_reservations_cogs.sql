-- =====================================================================
-- Migration:  20260630130000_phase5_fifo_reservations_cogs
-- Project:    Line Coffee V3
-- Phase:      5 (FIFO reservations, deductions, COGS, real inventory engine)
-- Runs after: 20260630120000_phase4_purchasing_suppliers_expenses_lots
-- =====================================================================
--
-- PURPOSE
--   Make finished-product inventory LOTS operational. Until now (Phase 1–4)
--   stock was a single kg-per-product balance on `inventory_stock`; lots existed
--   (Phase 4 receive) but were never drawn down. This migration turns lots into
--   the source of truth for cost basis and FIFO consumption WITHOUT changing any
--   business rule:
--     * checkout still RESERVES stock at Place Order — now FIFO across open lots,
--       recording an exact order→lot allocation ledger;
--     * `delivered` DEDUCTS the same reserved lots (permanent) + snapshots COGS;
--     * `shipped` still does nothing to stock;
--     * `cancelled` before delivery RELEASES the same reserved lots;
--     * `inventory_stock.available_kg` / `reserved_kg` stay consistent with lots
--       (kept as the denormalised aggregate + oversell guard);
--     * discounts never touch COGS; delivered never auto-marks paid.
--
-- DEPENDENCY
--   20260625120000 (products, orders, order_items, is_admin(), set_updated_at(),
--     variant_size_to_kg is in 20260627100000),
--   20260627100000 (inventory_stock, inventory_movements, variant_size_to_kg),
--   20260629120000 (Phase-1 create_checkout_order + update_admin_order_status:
--     reserve@checkout, deduct@delivered, release@cancel),
--   20260630120000 (inventory_lots, purchases, receive_purchase, the
--     'purchase_receive' movement kind).
--
-- DESTRUCTIVE?  NO. Purely additive + a one-time, guarded, NON-destructive data
--   reconciliation. No table/column/data is dropped. Existing purchase-lot
--   receipt history is preserved, although remaining_qty_kg may be drawn down
--   when Phase-1 deliveries already reduced inventory_stock before lots became
--   operational. Existing
--   inventory_stock balances are NOT changed by the reconciliation — opening
--   stock is re-expressed AS lots so the two agree (no double counting, master
--   plan §6.6). The two RPCs are replaced with CREATE OR REPLACE keeping their
--   exact return signatures.
--
-- IDEMPOTENCY  YES (best-effort). `add column if not exists`,
--   `create table if not exists`, `create index if not exists`,
--   `create or replace function`, `drop policy/constraint if exists` + recreate,
--   and the one-time reconciliation DO block GUARDS every write
--   (opening lots: `not exists (... source='opening')`; back-fill: `not exists
--   (order_lot_allocations for that order)`). Re-running is safe.
--
-- SAFETY GATE  The reconciliation ends with an ASSERT: for every product,
--   Σ(lot.reserved_qty_kg) must equal inventory_stock.reserved_kg AND
--   Σ(lot.remaining_qty_kg − lot.reserved_qty_kg) must equal
--   inventory_stock.available_kg. If ANY product fails, the whole migration
--   RAISES and rolls back — it only applies when lots and stock reconcile
--   perfectly. (Stop condition "reconcile safely or stop", honoured in SQL.)
--
-- STATUS  AUTHORED ONLY — not applied. Apply with `supabase db push` after Codex
--   review + owner approval. Until then the live checkout/inventory keep their
--   Phase-1 kg-only behaviour; nothing here runs by itself.
--
-- ROLLBACK / REPAIR  forward-fix only. To undo before any NEW (post-apply) order
--   is placed: drop the 2 helper objects + order_lot_allocations, then restore
--   create_checkout_order / update_admin_order_status from 20260629120000, and
--   (optionally) drop the added columns + opening lots. See the footer.
--
-- NON-GOALS (explicitly NOT in this phase — master plan §5 stop conditions):
--   * NO packaging inventory (Phase 6), NO Make-Your-Espresso raw-bean
--     manufacturing (Phase 8), NO Make-Your-Flavor cost logic (Phase 9).
--   * NO returns/refunds engine (Phase 11) — `returned` keeps its Phase-1
--     behaviour (no lot effect); a real restock-at-COGS lands in Phase 11.
--   * NO accounting reports / dashboards (Phase 14). COGS is only SNAPSHOTTED
--     here (order_items.line_cogs + orders.cogs_total); no P&L is derived.
--   * NO promo codes (Phase 7). discount_total stays 0; discounts never reduce COGS.
--   * NO service-role code. NO public/customer exposure of any cost/lot/COGS data
--     (order_lot_allocations is admin-read-only; the checkout result is cost-free).
--   * NO broad admin UI wiring; data-layer foundation + engine only.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — inventory_lots: reserved_qty_kg + source (FIFO operational fields)
-- =====================================================================
-- Phase 4 created lots with received_qty_kg (frozen) + remaining_qty_kg
-- (on-hand). FIFO needs to know how much of `remaining` is already RESERVED by
-- open orders, so available-in-lot = remaining_qty_kg − reserved_qty_kg.
--   * reserve  -> reserved_qty_kg += q     (remaining unchanged; goods still here)
--   * deduct   -> remaining_qty_kg -= q AND reserved_qty_kg -= q (goods leave)
--   * release  -> reserved_qty_kg -= q     (remaining unchanged; goods stay)
-- `source` distinguishes purchase lots from the one-time opening reconciliation.

alter table public.inventory_lots
  add column if not exists reserved_qty_kg numeric(12,3) not null default 0,
  add column if not exists source          text not null default 'purchase';

-- reserved_qty_kg >= 0 and reserved_qty_kg <= remaining_qty_kg. Existing rows
-- default reserved_qty_kg = 0, so both checks hold for them.
alter table public.inventory_lots
  drop constraint if exists inventory_lots_reserved_nonneg_chk;
alter table public.inventory_lots
  add constraint inventory_lots_reserved_nonneg_chk
  check (reserved_qty_kg >= 0);

alter table public.inventory_lots
  drop constraint if exists inventory_lots_reserved_lte_remaining_chk;
alter table public.inventory_lots
  add constraint inventory_lots_reserved_lte_remaining_chk
  check (reserved_qty_kg <= remaining_qty_kg);

alter table public.inventory_lots
  drop constraint if exists inventory_lots_source_chk;
alter table public.inventory_lots
  add constraint inventory_lots_source_chk
  check (source in ('purchase', 'opening', 'adjustment'));

comment on column public.inventory_lots.reserved_qty_kg is
  'Portion of remaining_qty_kg reserved by open orders. available-in-lot = remaining_qty_kg - reserved_qty_kg. Bumped on reserve, lowered on deduct (with remaining) or release.';
comment on column public.inventory_lots.source is
  'How the lot was created: purchase (received receipt), opening (Phase-5 one-time reconciliation of pre-existing inventory_stock), adjustment (future manual).';


-- =====================================================================
-- SECTION 2 — inventory_movements.lot_id (per-lot traceability)
-- =====================================================================
-- Phase 4 put lot_id only in metadata. The new per-lot reserve/deduct/release
-- movements set a real lot_id column so a movement can be traced to one lot.
-- Nullable + ON DELETE SET NULL keeps every existing movement valid (their
-- lot_id stays null). Old purchase_receive rows keep their metadata lot_id.

alter table public.inventory_movements
  add column if not exists lot_id uuid references public.inventory_lots (id) on delete set null;

create index if not exists inventory_movements_lot_idx
  on public.inventory_movements (lot_id) where lot_id is not null;

comment on column public.inventory_movements.lot_id is
  'The inventory lot this movement affected (Phase 5 reserve/deduct/release). Null for pre-Phase-5 movements and for movements that are not lot-specific.';


-- =====================================================================
-- SECTION 3 — orders.cogs_total (order-level COGS snapshot)
-- =====================================================================
-- Per-line COGS already has a home (order_items.line_cogs, Migration 1). Add an
-- order-level rollup snapshotted at `delivered` = Σ deducted lot (qty × unit_cost).
-- Private (admin/accounting only) — never selected by the public checkout result.

alter table public.orders
  add column if not exists cogs_total numeric(12,2)
    check (cogs_total is null or cogs_total >= 0);

comment on column public.orders.cogs_total is
  'PRIVATE order COGS snapshot, set at delivered from consumed FIFO lot costs (Σ order_items.line_cogs). Never exposed to anon/customers. Discounts never reduce it.';


-- =====================================================================
-- SECTION 4 — order_lot_allocations (order ↔ lot reservation ledger)
-- =====================================================================
-- The exact record of which lots a line reserved, so delivery deducts the SAME
-- lots, cancel releases the SAME lots, and COGS comes from the SAME unit_cost.
-- One row per (order line, lot). Admin-read only; all writes go through the
-- SECURITY DEFINER RPCs below (same model as inventory_lots in Phase 4).

create table if not exists public.order_lot_allocations (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  -- The specific order line (so line_cogs maps exactly). SET NULL keeps the
  -- allocation auditable even if a line snapshot is ever removed.
  order_item_id   uuid references public.order_items (id) on delete set null,
  product_id      uuid not null references public.products (id) on delete restrict,
  -- RESTRICT: a lot with allocations cannot be hard-deleted (history integrity).
  lot_id          uuid not null references public.inventory_lots (id) on delete restrict,
  reserved_qty_kg numeric(12,3) not null check (reserved_qty_kg >= 0),
  deducted_qty_kg numeric(12,3) not null default 0 check (deducted_qty_kg >= 0),
  -- Cost basis snapshot from the lot at allocation time (per kg, private).
  unit_cost       numeric(12,2) not null check (unit_cost >= 0),
  status          text not null default 'reserved'
                    check (status in ('reserved', 'deducted', 'released')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  constraint order_lot_allocations_deducted_lte_reserved_chk
    check (deducted_qty_kg <= reserved_qty_kg)
);

create index if not exists order_lot_allocations_order_idx   on public.order_lot_allocations (order_id);
create index if not exists order_lot_allocations_lot_idx     on public.order_lot_allocations (lot_id);
create index if not exists order_lot_allocations_product_idx on public.order_lot_allocations (product_id);
create index if not exists order_lot_allocations_status_idx  on public.order_lot_allocations (status);

drop trigger if exists trg_order_lot_allocations_updated_at on public.order_lot_allocations;
create trigger trg_order_lot_allocations_updated_at
  before update on public.order_lot_allocations
  for each row execute function public.set_updated_at();

-- Admin-read only. Carries unit_cost (private). No anon, no customer. Writes are
-- DEFINER-only (the RPCs run as the table owner and bypass the missing write
-- policy); the Data API gets SELECT for admin reads.
alter table public.order_lot_allocations enable row level security;

drop policy if exists order_lot_allocations_admin_read on public.order_lot_allocations;
create policy order_lot_allocations_admin_read on public.order_lot_allocations
  for select to authenticated using (public.is_admin());

grant select on table public.order_lot_allocations to authenticated;


-- =====================================================================
-- SECTION 5 — _allocate_lots_fifo (internal FIFO reservation helper)
-- =====================================================================
-- Reserves p_qty_kg of a product across its OPEN lots, oldest first
-- (received_date, created_at, id). For each lot it takes
-- min(available-in-lot, remaining-to-allocate), bumps the lot's reserved_qty_kg,
-- inserts an order_lot_allocations row (status 'reserved', unit_cost snapshot),
-- and (when p_write_movement) writes a per-lot 'reserve' inventory_movements row.
-- Raises if the product's open lots cannot cover p_qty_kg (caller rolls back).
--
-- Concurrency: locks the product's open lots FOR UPDATE in FIFO order. The
-- checkout caller has already taken the inventory_stock row lock for this
-- product (oversell guard), which serialises concurrent checkouts of the same
-- product, so two orders cannot reserve the same lot capacity.
--
-- Internal helper: revoked from anon/authenticated/public; only the DEFINER RPCs
-- (and the migration owner) call it, running as the table owner.

create or replace function public._allocate_lots_fifo(
  p_order_id       uuid,
  p_order_item_id  uuid,
  p_product_id     uuid,
  p_qty_kg         numeric,
  p_order_code     text,
  p_actor          text,
  p_write_movement boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_left numeric(12,3) := round(coalesce(p_qty_kg, 0), 3);
  v_take numeric(12,3);
  r      record;
begin
  if v_left <= 0 then
    return;
  end if;

  for r in
    select id, unit_cost, (remaining_qty_kg - reserved_qty_kg) as avail_kg
    from public.inventory_lots
    where product_id = p_product_id
      and status = 'open'
      and (remaining_qty_kg - reserved_qty_kg) > 0
    order by received_date asc, created_at asc, id asc
    for update
  loop
    exit when v_left <= 0;

    v_take := least(r.avail_kg, v_left);
    if v_take <= 0 then
      continue;
    end if;

    update public.inventory_lots
      set reserved_qty_kg = reserved_qty_kg + v_take
    where id = r.id;

    insert into public.order_lot_allocations (
      order_id, order_item_id, product_id, lot_id,
      reserved_qty_kg, deducted_qty_kg, unit_cost, status
    ) values (
      p_order_id, p_order_item_id, p_product_id, r.id,
      v_take, 0, r.unit_cost, 'reserved'
    );

    if p_write_movement then
      insert into public.inventory_movements (
        product_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
      ) values (
        p_product_id, p_order_id, r.id, 'reserve', v_take,
        'Checkout reservation (FIFO lot)',
        jsonb_build_object(
          'order_code', p_order_code,
          'lot_id', r.id,
          'unit_cost', r.unit_cost,
          'changed_by', p_actor
        )
      );
    end if;

    v_left := round(v_left - v_take, 3);
  end loop;

  if v_left > 0.0005 then
    raise exception 'Insufficient lot stock to reserve % kg for product %.',
      p_qty_kg, p_product_id using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public._allocate_lots_fifo(uuid, uuid, uuid, numeric, text, text, boolean)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 6 — ONE-TIME RECONCILIATION: opening lots + back-fill + assert
-- =====================================================================
-- Make lots authoritative without double counting (master plan §6.6). For each
-- product:
--   (a) OPENING LOT — re-express stock that is on hand (available+reserved) but
--       not yet represented by any lot as a single 'opening' lot. Cost basis =
--       products.purchase_cost_per_kg, or 0 when unknown (documented; real COGS
--       starts once priced purchase lots are consumed). received_date is an old
--       sentinel so opening stock is consumed FIRST by FIFO. If existing lots
--       already claim MORE on-hand than inventory_stock shows (a pre-Phase-5
--       delivered order deducted stock but not lots), draw the excess DOWN from
--       the oldest lots so lots match stock. This changes NO inventory_stock
--       value and writes NO stock movement — stock is already correct; we only
--       give it lot form.
--   (b) BACK-FILL — every currently-open order (pending/preparing/shipped) has a
--       Phase-1 reservation on inventory_stock but no lot allocation. Allocate
--       each open order line's reserved kg FIFO across the product's open lots
--       (now including the opening lot), oldest order first. Before writing,
--       require each order/product's item kg
--       to equal its still-open Phase-1 movement-ledger reservation; any legacy
--       mismatch stops and rolls back instead of assigning the wrong lots.
--       Create allocations + bump lot.reserved_qty_kg WITHOUT writing a new
--       reserve movement (the order's
--       original Phase-1 reserve movement stands). After this, every open order
--       drains through the lot path; no order is left on the legacy path.
--   (c) ASSERT — verify lots and inventory_stock reconcile for every product;
--       raise + roll back the whole migration on any mismatch.

do $$
declare
  p            record;
  v_on_hand    numeric(12,3);
  v_lot_remain numeric(12,3);
  v_gap        numeric(12,3);
  v_excess     numeric(12,3);
  v_take       numeric(12,3);
  lr           record;
  o            record;
  it           record;
  v_req        numeric(12,3);
  -- assert accumulators
  bad          integer := 0;
  a            record;
begin
  -- Every stock-tracked line on an open order must still be convertible to kg.
  -- Phase-1 checkout guarantees this; the guard stops on malformed/manual legacy
  -- rows rather than leaving an open order without a lot allocation.
  if exists (
    select 1
    from public.orders o2
    join public.order_items oi2 on oi2.order_id = o2.id
    where o2.status in ('pending', 'preparing', 'shipped')
      and oi2.kind = 'product'
      and (
        oi2.product_id is null
        or oi2.variant_size is null
        or coalesce(public.variant_size_to_kg(oi2.variant_size), 0) <= 0
      )
  ) then
    raise exception
      'Phase 5 reconciliation stopped: an open order has a product line that cannot be allocated.'
      using errcode = 'P0001';
  end if;

  -- The item snapshots and existing Phase-1 movement ledger must agree for each
  -- open order/product. A product-wide total alone could hide equal-and-opposite
  -- per-order errors and attach costs to the wrong order.
  if exists (
    with expected as (
      select o2.id as order_id,
             oi2.product_id,
             round(sum(public.variant_size_to_kg(oi2.variant_size) * oi2.quantity), 3)
               as required_kg
      from public.orders o2
      join public.order_items oi2 on oi2.order_id = o2.id
      where o2.status in ('pending', 'preparing', 'shipped')
        and oi2.kind = 'product'
        and oi2.product_id is not null
        and oi2.variant_size is not null
      group by o2.id, oi2.product_id
    ),
    ledger as (
      select o2.id as order_id,
             im.product_id,
             round(sum(
               case
                 when im.movement_type = 'reserve' then im.quantity_kg
                 when im.movement_type in ('release', 'deduct') then -im.quantity_kg
                 else 0
               end
             ), 3) as open_kg
      from public.orders o2
      join public.inventory_movements im on im.order_id = o2.id
      where o2.status in ('pending', 'preparing', 'shipped')
      group by o2.id, im.product_id
    )
    select 1
    from expected e
    full join ledger l
      on l.order_id = e.order_id and l.product_id = e.product_id
    where coalesce(e.required_kg, 0) <> coalesce(l.open_kg, 0)
  ) then
    raise exception
      'Phase 5 reconciliation stopped: open-order items do not match their reservation ledger.'
      using errcode = 'P0001';
  end if;

  -- ---- (a) opening lots / draw-down per product ----------------------
  for p in
    select s.product_id,
           s.available_kg,
           s.reserved_kg,
           coalesce(pr.purchase_cost_per_kg, 0)::numeric(12,2) as cost_basis
    from public.inventory_stock s
    join public.products pr on pr.id = s.product_id
  loop
    v_on_hand := round(p.available_kg + p.reserved_kg, 3);

    select coalesce(sum(remaining_qty_kg), 0)::numeric(12,3)
      into v_lot_remain
    from public.inventory_lots
    where product_id = p.product_id
      and status = 'open';

    v_gap := round(v_on_hand - v_lot_remain, 3);

    if v_gap > 0.0005 then
      -- Stock on hand not yet in any lot -> one opening lot (guarded: only once).
      if not exists (
        select 1 from public.inventory_lots
        where product_id = p.product_id and source = 'opening'
      ) then
        insert into public.inventory_lots (
          product_id, purchase_id, purchase_item_id, supplier_id,
          received_qty_kg, remaining_qty_kg, reserved_qty_kg,
          unit_cost, received_date, status, source
        ) values (
          p.product_id, null, null, null,
          v_gap, v_gap, 0,
          p.cost_basis, date '2020-01-01', 'open', 'opening'
        );
      end if;

    elsif v_gap < -0.0005 then
      -- Lots claim more on hand than stock shows (pre-Phase-5 delivered orders
      -- deducted stock but not lots). Draw the excess down FIFO so lots match.
      -- All lots have reserved_qty_kg = 0 at this point, so remaining can be
      -- reduced freely (never below 0; |gap| <= Σ remaining since on_hand >= 0).
      v_excess := round(-v_gap, 3);
      for lr in
        select id, remaining_qty_kg
        from public.inventory_lots
        where product_id = p.product_id
          and status = 'open'
          and remaining_qty_kg > 0
        order by received_date asc, created_at asc, id asc
        for update
      loop
        exit when v_excess <= 0;
        v_take := least(lr.remaining_qty_kg, v_excess);
        update public.inventory_lots
          set remaining_qty_kg = remaining_qty_kg - v_take,
              status = case when remaining_qty_kg - v_take <= 0 then 'closed' else status end
        where id = lr.id;
        v_excess := round(v_excess - v_take, 3);
      end loop;
    end if;
  end loop;

  -- ---- (b) back-fill open-order allocations --------------------------
  for o in
    select id, code
    from public.orders
    where status in ('pending', 'preparing', 'shipped')
      and not exists (
        select 1 from public.order_lot_allocations alloc where alloc.order_id = orders.id
      )
    order by placed_at asc, id asc
  loop
    for it in
      select oi.id as order_item_id, oi.product_id, oi.variant_size, oi.quantity
      from public.order_items oi
      where oi.order_id = o.id
        and oi.kind = 'product'
        and oi.product_id is not null
        and oi.variant_size is not null
      order by oi.created_at asc, oi.id asc
    loop
      v_req := round(
        coalesce(public.variant_size_to_kg(it.variant_size), 0) * it.quantity, 3
      );
      if v_req > 0 then
        -- p_write_movement = false: the original Phase-1 reserve movement already
        -- records this reservation; back-fill only migrates it onto the lots.
        perform public._allocate_lots_fifo(
          o.id, it.order_item_id, it.product_id, v_req, o.code, 'phase5_backfill', false
        );
      end if;
    end loop;
  end loop;

  -- Every open product line must now have exactly its required kg reserved in
  -- allocations. This also stops a re-run on a pre-existing partial allocation
  -- instead of treating "some allocation exists" as complete.
  if exists (
    with expected as (
      select oi2.id as order_item_id,
             oi2.order_id,
             oi2.product_id,
             round(public.variant_size_to_kg(oi2.variant_size) * oi2.quantity, 3)
               as required_kg
      from public.order_items oi2
      join public.orders o2 on o2.id = oi2.order_id
      where o2.status in ('pending', 'preparing', 'shipped')
        and oi2.kind = 'product'
        and oi2.product_id is not null
        and oi2.variant_size is not null
    ),
    allocated as (
      select al.order_item_id,
             al.order_id,
             al.product_id,
             round(sum(al.reserved_qty_kg), 3) as allocated_kg
      from public.order_lot_allocations al
      where al.status = 'reserved'
      group by al.order_item_id, al.order_id, al.product_id
    )
    select 1
    from expected e
    full join allocated al on al.order_item_id = e.order_item_id
    where e.order_item_id is null
       or al.order_item_id is null
       or e.order_id is distinct from al.order_id
       or e.product_id is distinct from al.product_id
       or coalesce(e.required_kg, 0) <> coalesce(al.allocated_kg, 0)
  ) then
    raise exception
      'Phase 5 reconciliation stopped: open-order lot allocations are incomplete or inconsistent.'
      using errcode = 'P0001';
  end if;

  -- ---- (c) assert lots reconcile with inventory_stock ----------------
  for a in
    with lot_totals as (
      select l.product_id,
             coalesce(sum(l.reserved_qty_kg), 0)::numeric(12,3) as lot_reserved,
             coalesce(sum(l.remaining_qty_kg - l.reserved_qty_kg), 0)::numeric(12,3)
               as lot_available,
             bool_or(
               l.status = 'closed'
               and (l.remaining_qty_kg <> 0 or l.reserved_qty_kg <> 0)
             ) as invalid_closed_lot
      from public.inventory_lots l
      group by l.product_id
    )
    select coalesce(s.product_id, lt.product_id) as product_id,
           s.product_id as stock_product_id,
           coalesce(s.available_kg, 0)::numeric(12,3) as available_kg,
           coalesce(s.reserved_kg, 0)::numeric(12,3) as reserved_kg,
           coalesce(lt.lot_reserved, 0)::numeric(12,3) as lot_reserved,
           coalesce(lt.lot_available, 0)::numeric(12,3) as lot_available,
           coalesce(lt.invalid_closed_lot, false) as invalid_closed_lot
    from public.inventory_stock s
    full join lot_totals lt on lt.product_id = s.product_id
  loop
    if a.stock_product_id is null
       or a.invalid_closed_lot
       or a.lot_reserved <> a.reserved_kg
       or a.lot_available <> a.available_kg then
      bad := bad + 1;
      raise warning
        'Phase 5 reconcile mismatch product %: stock(avail=%, reserved=%) vs lots(avail=%, reserved=%)',
        a.product_id, a.available_kg, a.reserved_kg, a.lot_available, a.lot_reserved;
    end if;
  end loop;

  if bad > 0 then
    raise exception
      'Phase 5 inventory reconciliation failed for % product(s); migration rolled back. See warnings above.',
      bad using errcode = 'P0001';
  end if;
end;
$$;


-- =====================================================================
-- SECTION 7 — create_checkout_order (FIFO lot reservation)
-- =====================================================================
-- Full replacement of the Phase-1 keystone. EVERYTHING Phase-1 does is preserved
-- verbatim (payload validation, DB-authoritative pricing, payment-method mapping,
-- all-methods-pending, zone delivery fee + snapshot, idempotent replay on
-- checkout_attempt_id, customer upsert, frozen snapshots, the atomic per-product
-- inventory_stock oversell guard). The ONLY change is the reservation:
--   * the per-product inventory_stock guard still runs (available_kg >= req) so
--     overselling is impossible and races are serialised on the stock row;
--   * the old single per-product 'reserve' movement is replaced by a per-LINE
--     FIFO allocation (_allocate_lots_fifo), which records order_lot_allocations
--     + bumps lot.reserved_qty_kg + writes one 'reserve' movement per lot.
-- inventory_stock and lots therefore stay in lockstep:
--   inventory_stock.available_kg = Σ(lot.remaining − lot.reserved),
--   inventory_stock.reserved_kg  = Σ(lot.reserved).
-- The result payload is UNCHANGED and cost-free (no COGS/lot data to the client).

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
  -- Decision 12 / Phase 1: every method starts pending. Unchanged in Phase 5.
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
  -- line_id is generated here so each order_items row has a known id for the
  -- per-line lot allocation below (so line_cogs maps to the exact line).
  create temp table pg_temp._checkout_lines (
    line_id      uuid,
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
        gen_random_uuid(), 'product', v_product.id, v_product.slug, v_variant.id, v_size,
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
  -- Phase 1 zone delivery (Decisions 10 + 11). Unchanged in Phase 5.
  v_zone          := public.resolve_delivery_fee(v_governorate, v_area);
  v_delivery_fee  := (v_zone->>'fee')::numeric(12,2);
  v_delivery_zone := v_zone->>'zone';
  v_delivery_note := v_zone->>'note';
  v_total         := v_subtotal - v_discount_total + v_delivery_fee;

  -- ---- 4. Resolve / create the customer ------------------------------
  if v_auth_uid is not null then
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

  -- Idempotent replay: a retry returns the original receipt and does NOT
  -- re-create items or re-reserve inventory/lots (unchanged from Phase 1).
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

  -- ---- 7. Order item snapshots (explicit line_id) --------------------
  insert into public.order_items (
    id, order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data
  )
  select
    line_id, v_order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data
  from pg_temp._checkout_lines;

  -- ---- 8a. Oversell guard on inventory_stock (per product, atomic) ---
  -- Aggregate kg per product and move available -> reserved with a WHERE guard
  -- that makes the check + write a single atomic step (no race, no negative
  -- stock). This also takes the stock row lock that serialises concurrent
  -- checkouts of the same product before the FIFO lot allocation below.
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
      raise exception 'Insufficient stock for "%". Please lower the quantity.', r.product_slug
        using errcode = '22023';
    end if;
  end loop;

  -- ---- 8b. FIFO lot reservation (per line -> allocations + movements) -
  -- Σ line req per product == the kg just moved into reserved above, and
  -- inventory_stock.available == Σ lot available (invariant), so each line's
  -- FIFO allocation is guaranteed to find capacity; if not, it raises and the
  -- whole order rolls back. _allocate_lots_fifo writes one 'reserve' movement
  -- per lot, so the per-product reserve movement of Phase 1 is no longer needed.
  for r in
    select line_id, product_id, required_kg
    from pg_temp._checkout_lines
    where product_id is not null
    order by product_id
  loop
    perform public._allocate_lots_fifo(
      v_order_id, r.line_id, r.product_id, r.required_kg, v_order_code, 'system', true
    );
  end loop;

  -- ---- 9. Append-only initial status event ---------------------------
  insert into public.order_status_events (order_id, status, note, changed_by)
  values (v_order_id, 'pending', 'Order placed via website checkout', 'system');

  -- ---- 10. Result for the success page (COST-FREE) -------------------
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

revoke all on function public.create_checkout_order(jsonb) from public;
revoke all on function public.create_checkout_order(jsonb) from anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to anon, authenticated;


-- =====================================================================
-- SECTION 8 — update_admin_order_status (lot deduct/release + COGS)
-- =====================================================================
-- Full replacement of the Phase-1 admin status RPC. Authorization, transition
-- map, actor resolution, order update, and the status event are UNCHANGED. The
-- inventory effect is rebuilt at lot level:
--   * delivered -> for each 'reserved' allocation of the order: deduct the lot
--     (remaining -= q, reserved -= q, close lot at 0), mark the allocation
--     'deducted', drop inventory_stock.reserved_kg by q, and snapshot COGS into
--     order_items.line_cogs (per line) + orders.cogs_total. Discounts untouched.
--   * cancelled -> for each 'reserved' allocation: release the lot (reserved -=
--     q), mark the allocation 'released', return inventory_stock available += q /
--     reserved -= q. No COGS.
--   * shipped -> no inventory effect (parcel out; reservation stands).
--   * returned -> Phase-1 behaviour only (no lot effect); a real restock-at-COGS
--     is Phase 11.
-- FAIL-CLOSED LEGACY GUARD: an inventory-bearing order with NO allocations
-- cannot be deducted/released safely once lots are authoritative. Reconciliation
-- back-fills every valid open legacy order, and new checkout allocates atomically,
-- so this state means corruption/manual bypass and the transition is rejected.
-- delivered/cancelled stay idempotent (the transition map blocks re-entry, and
-- only 'reserved' allocations are processed).

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
  v_has_allocations boolean;
  v_cogs_total numeric(12,2) := 0;
  v_line_cogs numeric(12,2);
  a record;
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

    -- Fail closed if order lines or allocations were manually altered after
    -- checkout. Processing only a partial allocation set would desynchronise
    -- lots, inventory_stock, and per-line COGS.
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

      if v_effect_type = 'deduct' then
        update public.orders set cogs_total = round(v_cogs_total, 2) where id = v_order.id;
      end if;

    else
      -- ---------- FAIL-CLOSED LEGACY GUARD ------------------------------
      -- Changing only inventory_stock here would contradict authoritative lots.
      -- Valid open Phase-1 orders were back-filled during this migration.
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
$$;

revoke all on function public.update_admin_order_status(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.update_admin_order_status(uuid, text, text)
  to authenticated;


-- =====================================================================
-- FOOTER — Rollback notes (forward-fix only; before any post-apply order)
-- =====================================================================
--   -- 1. Restore the Phase-1 RPCs from 20260629120000 (re-run that file's
--   --    SECTION 3 + SECTION 4 create-or-replace bodies).
--   -- 2. Drop the Phase-5 objects:
--   drop function if exists public._allocate_lots_fifo(uuid,uuid,uuid,numeric,text,text,boolean);
--   drop table if exists public.order_lot_allocations;
--   -- 3. (Optional) remove the added columns + opening lots:
--   delete from public.inventory_lots where source = 'opening';
--   alter table public.orders             drop column if exists cogs_total;
--   alter table public.inventory_movements drop column if exists lot_id;
--   alter table public.inventory_lots     drop column if exists reserved_qty_kg;
--   alter table public.inventory_lots     drop column if exists source;
-- (Only safe before any NEW order has reserved/deducted lots under this engine;
--  after that, dropping these columns loses live reservation state.)
-- =====================================================================
