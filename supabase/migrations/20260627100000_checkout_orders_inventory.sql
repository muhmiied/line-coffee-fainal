-- =====================================================================
-- Migration:  20260627100000_checkout_orders_inventory
-- Project:    Line Coffee V3
-- Phase:      Checkout Real Order Creation + Initial Inventory Reservation
-- Runs after: 20260627090000_admin_catalog_create
-- =====================================================================
--
-- PURPOSE
--   Turn the public checkout from a fake "generate a number, write nothing"
--   flow into a REAL order intake that:
--     * creates a customer (guest or registered) + an order + order_items
--       (price/name/variant SNAPSHOTS) in ONE atomic transaction,
--     * reserves finished-product inventory in KILOGRAMS immediately so stock
--       cannot be oversold,
--     * records an append-only order_status_events 'pending' event,
--     * never trusts client prices for catalog products (prices are read from
--       product_variants inside the DB),
--     * only allows ordering products that are active + public + show_on_website
--       with a valid variant and sufficient stock.
--
-- WHY A SECURITY DEFINER RPC CALLABLE BY anon
--   The public website runs entirely in the browser with the anon/publishable
--   key (src/lib/supabase/client.ts). There is no service-role server action in
--   this codebase. The trust boundary is therefore the DATABASE: a single
--   SECURITY DEFINER function (create_checkout_order) does ALL validation,
--   pricing, and inventory math server-side. Because it is DEFINER (owned by the
--   migration role, which owns these tables and is not subject to their RLS), it
--   can write orders / order_items / customers / inventory even though those base
--   tables have no anon policy. A hostile caller cannot forge prices or oversell
--   because every authoritative number is recomputed inside the function. This
--   mirrors the existing create_admin_product() pattern already in this project.
--
-- SCOPE / NON-GOALS (this migration)
--   * No promo-code validation yet (discount_total is always 0 here).
--   * Custom builder lines (Make-Your-Espresso / Make-Your-Flavor) are rejected
--     until their ingredient catalogs and authoritative server-side pricing
--     exist. Accepting a client-provided builder price would be unsafe.
--   * No customer_addresses row is written; the frozen address_snapshot on the
--     order is the order's source of truth. Saving to the address book is a
--     later customer-account task.
--   * Admin Orders UI stays on its mock source in this phase.
--
-- IDEMPOTENT: DDL uses IF EXISTS / IF NOT EXISTS / CREATE OR REPLACE where
--   applicable; the inventory seed uses ON CONFLICT so re-running is safe.
--
-- THIS FILE IS AUTHORED ONLY. Apply it with your normal migration workflow
-- (e.g. `supabase db push`) before testing the real checkout flow.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — EXTEND orders + customers FOR PAYMENTS + GUEST LINKING
-- =====================================================================
-- The checkout UI uses payment methods "cash" / "instapay" / "e-wallet" and the
-- owner wants payment_status saved as pending / pending_review. The Migration-1
-- CHECK constraints don't include those values, so widen them (additively — the
-- existing allowed values are kept, so existing rows stay valid).

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in (
    'cash_on_delivery', 'vodafone_cash', 'instapay', 'bank_transfer',
    'card', 'wallet', 'unknown'
  ));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in (
    'unpaid', 'partially_paid', 'paid', 'refunded', 'failed',
    'pending', 'pending_review'
  ));

-- Optional payment capture (no gateway yet) + stable guest identifier so a guest
-- order can later be linked to a registered account.
alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists payment_phone     text,
  add column if not exists guest_id          text,
  add column if not exists checkout_attempt_id text;

create index if not exists orders_guest_id_idx
  on public.orders (guest_id) where guest_id is not null;

create unique index if not exists orders_checkout_attempt_id_key
  on public.orders (checkout_attempt_id)
  where checkout_attempt_id is not null;

comment on column public.orders.guest_id is
  'Stable client-generated device id (localStorage). Lets a later account-creation flow link old guest orders by same-device id, phone, or email. Set, not yet acted on.';

-- Same stable guest id on the customer ledger, so repeat guest checkouts from the
-- same device reuse one guest customer instead of creating duplicates.
alter table public.customers
  add column if not exists guest_id text;

create unique index if not exists customers_guest_id_key
  on public.customers (guest_id)
  where type = 'guest' and guest_id is not null;


-- =====================================================================
-- SECTION 2 — INVENTORY TABLES (kg per product)
-- =====================================================================
-- Owner model: inventory is tracked in KILOGRAMS per PRODUCT (not per variant).
-- A cart variant converts to kg: 250g=0.25, 500g=0.5, 1kg=1.0. On checkout we
-- move kg from available -> reserved (no physical deduction until shipped, per
-- the ORDER_STATUS_EFFECTS contract in src/lib/types/order.ts).

create table if not exists public.inventory_stock (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null unique references public.products (id) on delete cascade,
  available_kg           numeric(12,3) not null default 0 check (available_kg >= 0),
  reserved_kg            numeric(12,3) not null default 0 check (reserved_kg >= 0),
  low_stock_threshold_kg numeric(12,3) not null default 5 check (low_stock_threshold_kg >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz
);

create index if not exists inventory_stock_low_idx
  on public.inventory_stock (product_id)
  where available_kg <= low_stock_threshold_kg;

create table if not exists public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  -- Nullable: initial_stock / manual adjustments have no order. SET NULL keeps the
  -- ledger row if an order is ever deleted.
  order_id      uuid references public.orders (id) on delete set null,
  movement_type text not null
                  check (movement_type in (
                    'initial_stock', 'reserve', 'release', 'deduct', 'adjustment'
                  )),
  -- Always a positive magnitude; movement_type carries the direction/meaning.
  quantity_kg   numeric(12,3) not null check (quantity_kg >= 0),
  reason        text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id);
create index if not exists inventory_movements_order_idx   on public.inventory_movements (order_id);
create index if not exists inventory_movements_type_idx    on public.inventory_movements (movement_type);

alter table public.inventory_stock     enable row level security;
alter table public.inventory_movements enable row level security;

-- Admin-only direct access (for the future real Admin Inventory). The checkout
-- RPC writes through SECURITY DEFINER, so it does not need a public policy.
-- No anon access to raw inventory.
drop policy if exists inventory_stock_admin_all on public.inventory_stock;
create policy inventory_stock_admin_all on public.inventory_stock
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists inventory_movements_admin_all on public.inventory_movements;
create policy inventory_movements_admin_all on public.inventory_movements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- RLS policies do not grant table privileges by themselves.
grant select, insert, update, delete on table public.inventory_stock to authenticated;
grant select, insert, update, delete on table public.inventory_movements to authenticated;

drop trigger if exists trg_inventory_stock_updated_at on public.inventory_stock;
create trigger trg_inventory_stock_updated_at
  before update on public.inventory_stock
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECTION 3 — SEED 100kg PER PRODUCT + INITIALIZE FUTURE PRODUCTS
-- =====================================================================
-- Seed every existing product, including archived rows, so restoring a product
-- cannot publish it without an inventory row. The movement is written only for
-- stock rows inserted by this statement, keeping the ledger consistent on rerun.
with seeded as (
  insert into public.inventory_stock (
    product_id, available_kg, reserved_kg, low_stock_threshold_kg
  )
  select p.id, 100, 0, 5
  from public.products p
  on conflict (product_id) do nothing
  returning product_id
)
insert into public.inventory_movements (
  product_id, movement_type, quantity_kg, reason, metadata
)
select
  s.product_id,
  'initial_stock',
  100,
  'Launch initial stock (100kg)',
  jsonb_build_object('seeded_by', 'migration_20260627100000')
from seeded s;

-- Products created after this migration receive the same 100kg baseline.
create or replace function public.initialize_product_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory_stock (
    product_id, available_kg, reserved_kg, low_stock_threshold_kg
  )
  values (new.id, 100, 0, 5)
  on conflict (product_id) do nothing;

  if found then
    insert into public.inventory_movements (
      product_id, movement_type, quantity_kg, reason, metadata
    )
    values (
      new.id,
      'initial_stock',
      100,
      'Product initial stock (100kg)',
      jsonb_build_object('seeded_by', 'product_insert_trigger')
    );
  end if;

  return new;
end;
$$;

revoke all on function public.initialize_product_inventory() from public, anon, authenticated;

drop trigger if exists trg_products_initialize_inventory on public.products;
create trigger trg_products_initialize_inventory
  after insert on public.products
  for each row execute function public.initialize_product_inventory();


-- =====================================================================
-- SECTION 4 — variant size -> kg HELPER
-- =====================================================================
create or replace function public.variant_size_to_kg(p_size text)
returns numeric
language sql
immutable
as $$
  select case p_size
    when '250g' then 0.25
    when '500g' then 0.5
    when '1kg'  then 1.0
    else null
  end;
$$;


-- =====================================================================
-- SECTION 5 — create_checkout_order(jsonb)  (the keystone)
-- =====================================================================
-- One atomic transaction. All-or-nothing: any invalid line, unavailable product,
-- or insufficient stock raises and rolls back everything (no partial order, no
-- negative stock). Catalog prices are read from the DB. Custom-builder lines are
-- rejected until they can also be priced authoritatively on the server.
--
-- payload shape:
--   {
--     "guest_id": "<device uuid>",
--     "checkout_attempt_id": "<submission uuid>",
--     "customer": { "name", "phone", "whatsapp", "email" },
--     "address":  { "governorate", "area", "city", "street", "building",
--                   "floor", "apartment", "landmark", "recipient_name" },
--     "payment":  { "method": "cash"|"instapay"|"e-wallet",
--                   "reference"?, "phone"? },
--     "customer_note"?: "...",
--     "items": [
--       { "kind": "product", "slug": "...", "size": "250g", "quantity": 2 },
--     ]
--   }
-- returns: { order_id, code, subtotal, discount_total, delivery_fee, total,
--            payment_method, payment_status, item_count }

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
  if v_pm_in in ('cash', 'cash_on_delivery', 'cod') then
    v_payment_method := 'cash_on_delivery';
    v_payment_status := 'pending';
  elsif v_pm_in = 'instapay' then
    v_payment_method := 'instapay';
    v_payment_status := 'pending_review';
  elsif v_pm_in in ('e-wallet', 'ewallet', 'wallet', 'vodafone_cash') then
    v_payment_method := 'wallet';
    v_payment_status := 'pending_review';
  else
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;

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
  -- Delivery rule mirrors the website (free at >= 500 EGP subtotal, else 50).
  -- TODO(launch): move to site_settings so the owner can change it.
  v_delivery_fee := case when v_subtotal >= 500 then 0 else 50 end;
  v_total        := v_subtotal - v_discount_total + v_delivery_fee;

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
    subtotal, discount_total, delivery_fee, total,
    payment_method, payment_status, payment_reference, payment_phone,
    guest_id, checkout_attempt_id, customer_note
  ) values (
    v_order_code, v_customer_id, v_customer_snapshot, v_address_snapshot,
    v_name, v_whatsapp, v_governorate,
    'pending', 'standard', 'website',
    v_subtotal, v_discount_total, v_delivery_fee, v_total,
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

-- The checkout RPC is the public order-intake surface: anon (guest) + signed-in
-- customers may call it. It is SECURITY DEFINER and self-validating; no other
-- table grant is given to anon. Revoke the default PUBLIC execute first.
revoke all on function public.create_checkout_order(jsonb) from public;
revoke all on function public.create_checkout_order(jsonb) from anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to anon, authenticated;

-- Internal helper only; callers do not need direct access.
revoke all on function public.variant_size_to_kg(text) from public, anon, authenticated;
