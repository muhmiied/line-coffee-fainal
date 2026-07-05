-- =====================================================================
-- Phase 20B — Launch Data Setup (DATA-ONLY, idempotent, additive DML)
-- =====================================================================
-- AUTHORED ONLY — DO NOT auto-apply. Apply with `supabase db push` AFTER
-- owner review (the task rule requires stop-and-report before applying a
-- data mutation). The whole file runs in ONE transaction, so any failure —
-- including the final invariant assert (Section 4) — rolls the ENTIRE
-- migration back (safe-or-stop). Nothing partially applies.
--
-- WHAT THIS DOES (and ONLY this):
--   1. Promo codes    — clean slate + exactly 2 launch codes (WELCOME10, LINE50).
--   2. Packaging stock — seed launch quantities on the 3 active bag types.
--   3. Product stock   — set every active/draft finished product to 50 kg
--                        available, preserving any existing order reservations
--                        and keeping the FIFO lot ledger perfectly consistent.
--   4. Assert          — verify the Phase-5 lot/stock invariant per product.
--
-- WHAT THIS DOES NOT TOUCH:
--   product prices, checkout/order/payment/refund/return logic, delivery
--   pricing, COGS formulas, accounting, analytics, blog/reviews/CMS, RLS,
--   grants, schema, or any customer/order row. No service-role. No new table.
--
-- Discounts remain product-subtotal-only and never touch delivery — that is
-- enforced by the existing checkout engine (`_evaluate_promo_code`), which is
-- NOT modified here; this migration only inserts promo rows.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — Promo codes: clean slate + 2 launch codes
-- =====================================================================
-- Existing promo/QA codes are removed so ONLY the two launch codes remain
-- active. Codes that already have real redemptions cannot be deleted
-- (promo_redemptions.promo_code_id is ON DELETE RESTRICT) — those are
-- DISABLED (status='inactive') to preserve redemption history, everything
-- else is deleted. Re-run safe.

-- 1a. Disable any pre-existing code that carries redemption history.
update public.promo_codes pc
set status = 'inactive', updated_at = now()
where status <> 'inactive'
  and exists (
    select 1 from public.promo_redemptions r where r.promo_code_id = pc.id
  );

-- 1b. Delete every code with no redemptions (QA / prior launch-test codes).
--     `not exists` keeps redeemed codes (handled in 1a) and is NULL-safe.
delete from public.promo_codes pc
where not exists (
  select 1 from public.promo_redemptions r where r.promo_code_id = pc.id
);

-- 1c. Upsert the two launch codes as ACTIVE (idempotent on the unique code).
--     WELCOME10 — 10% off product subtotal, min 250 EGP, capped at 150 EGP.
--     LINE50    — 50 EGP off product subtotal, min 500 EGP.
--     usage_limit = 500 total, per_customer_limit = 1 (reasonable launch caps).
insert into public.promo_codes (
  code, status, discount_type, value,
  minimum_subtotal, max_discount,
  starts_at, ends_at, usage_limit, per_customer_limit, notes
) values
  ('WELCOME10', 'active', 'percentage', 10,
   250, 150,
   null, null, 500, 1,
   'Phase 20B launch: 10% off product subtotal (min 250 EGP, capped 150 EGP). Delivery never discounted.'),
  ('LINE50', 'active', 'fixed_amount', 50,
   500, null,
   null, null, 500, 1,
   'Phase 20B launch: 50 EGP off product subtotal (min 500 EGP). Delivery never discounted.')
on conflict (code) do update set
  status             = excluded.status,
  discount_type      = excluded.discount_type,
  value              = excluded.value,
  minimum_subtotal   = excluded.minimum_subtotal,
  max_discount       = excluded.max_discount,
  starts_at          = excluded.starts_at,
  ends_at            = excluded.ends_at,
  usage_limit        = excluded.usage_limit,
  per_customer_limit = excluded.per_customer_limit,
  notes              = excluded.notes,
  updated_at         = now();


-- =====================================================================
-- SECTION 2 — Packaging launch stock (count-based, non-blocking model)
-- =====================================================================
-- Mirrors a real `adjust_packaging_stock` restock exactly: for each active
-- bag type, top up to the launch target by inserting a FIFO packaging lot,
-- bumping available_quantity, and writing an 'adjustment_in' movement.
-- Only tops UP (delta > 0), so re-running never over-seeds. The inactive
-- jar/canister is intentionally left at 0 / inactive (no active product maps
-- to it yet).
do $$
declare
  v_targets jsonb := jsonb_build_array(
    jsonb_build_object('key', 'bag_250g', 'target', 1000),
    jsonb_build_object('key', 'bag_500g', 'target', 700),
    jsonb_build_object('key', 'bag_1kg',  'target', 500)
  );
  v_t     jsonb;
  v_item  public.packaging_items%rowtype;
  v_delta integer;
  v_cost  numeric(12,2);
  v_lot   uuid;
begin
  for v_t in select * from jsonb_array_elements(v_targets)
  loop
    select * into v_item
    from public.packaging_items
    where operational_key = (v_t->>'key');

    if not found then
      continue;
    end if;

    v_delta := (v_t->>'target')::integer - v_item.available_quantity;
    if v_delta <= 0 then
      continue;  -- already at/above the launch target
    end if;

    v_cost := round(coalesce(v_item.cost_per_unit, 0), 2);

    insert into public.packaging_lots (
      packaging_item_id, received_quantity, remaining_quantity,
      unit_cost, source, notes
    ) values (
      v_item.id, v_delta, v_delta, v_cost, 'adjustment',
      'Phase 20B launch stock seed'
    )
    returning id into v_lot;

    update public.packaging_items
    set available_quantity = available_quantity + v_delta
    where id = v_item.id;

    insert into public.packaging_movements (
      packaging_item_id, packaging_lot_id, movement_type,
      quantity_delta, unit_cost, note, changed_by
    ) values (
      v_item.id, v_lot, 'adjustment_in',
      v_delta, v_cost, 'Phase 20B launch stock seed', null
    );
  end loop;
end $$;


-- =====================================================================
-- SECTION 3 — Finished-product launch stock = 50 kg each
-- =====================================================================
-- Coffee stock is the kg-per-product model: inventory_stock (aggregate) kept
-- consistent with inventory_lots (FIFO). There is no admin RPC to "set stock
-- to X", so this rebuilds the lot ledger safely per product:
--   * preserve reserved_kg (open-order reservations are untouched);
--   * zero the AVAILABLE portion of every open lot (remaining := reserved),
--     closing lots that become empty — reservations stay intact;
--   * add ONE fresh 50 kg launch lot (source='adjustment', reserved 0);
--   * set inventory_stock.available_kg = 50 (reserved_kg unchanged);
--   * write an 'adjustment' movement.
-- Result per product: Σ(remaining−reserved)=50=available and Σ reserved=reserved_kg.
-- Idempotent: a second run re-zeros the prior launch lot and re-adds 50 kg.
do $$
declare
  p     record;
  v_lot uuid;
begin
  for p in
    select pr.id, round(coalesce(pr.purchase_cost_per_kg, 0), 2) as cost
    from public.products pr
    where pr.kind = 'standard'
      and pr.status <> 'archived'
  loop
    -- Ensure a stock row exists (products normally get one on insert).
    insert into public.inventory_stock (
      product_id, available_kg, reserved_kg, low_stock_threshold_kg
    ) values (p.id, 0, 0, 5)
    on conflict (product_id) do nothing;

    -- Zero the available portion of open lots; keep reservations.
    update public.inventory_lots
    set remaining_qty_kg = reserved_qty_kg,
        status = case when reserved_qty_kg = 0 then 'closed' else 'open' end
    where product_id = p.id
      and status = 'open';

    -- One fresh launch lot carrying exactly 50 kg available.
    insert into public.inventory_lots (
      product_id, received_qty_kg, remaining_qty_kg, reserved_qty_kg,
      unit_cost, received_date, status, source
    ) values (
      p.id, 50, 50, 0, p.cost, current_date, 'open', 'adjustment'
    )
    returning id into v_lot;

    -- Aggregate available := 50 kg; reserved_kg stays as-is.
    update public.inventory_stock
    set available_kg = 50
    where product_id = p.id;

    -- Ledger movement (positive magnitude; type carries the meaning).
    insert into public.inventory_movements (
      product_id, movement_type, quantity_kg, reason, metadata, lot_id
    ) values (
      p.id, 'adjustment', 50, 'Phase 20B launch stock set to 50kg',
      jsonb_build_object('phase', '20B', 'target_kg', 50), v_lot
    );
  end loop;
end $$;


-- =====================================================================
-- SECTION 4 — Invariant assert (safe-or-stop; rolls back on any mismatch)
-- =====================================================================
-- Phase-5 rule per product: Σ(lot.remaining−lot.reserved)=inventory_stock.available
-- AND Σ(lot.reserved)=inventory_stock.reserved. If any active/draft standard
-- product violates it, raise → the whole migration rolls back.
do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.inventory_stock s
  join public.products pr on pr.id = s.product_id
  where pr.kind = 'standard'
    and pr.status <> 'archived'
    and (
      s.available_kg <> coalesce((
        select sum(l.remaining_qty_kg - l.reserved_qty_kg)
        from public.inventory_lots l where l.product_id = s.product_id
      ), 0)
      or
      s.reserved_kg <> coalesce((
        select sum(l.reserved_qty_kg)
        from public.inventory_lots l where l.product_id = s.product_id
      ), 0)
    );

  if v_bad > 0 then
    raise exception
      'Phase 20B: lot/stock invariant violated for % product(s); rolling back.', v_bad;
  end if;
end $$;

-- =====================================================================
-- ROLLBACK NOTE (manual, if ever needed after apply):
--   * Promo: re-disable/delete WELCOME10 + LINE50 as desired.
--   * Packaging/stock: launch lots are tagged (source='adjustment',
--     note/reason 'Phase 20B launch...'); adjust down via the admin UI.
--   This migration performs no destructive schema change and can be
--   superseded by a normal follow-up data migration.
-- =====================================================================
