-- =============================================================================
-- Phase 5 (final system stabilization) — Batch A / Group 4: Flavor COGS honesty
-- =============================================================================
-- Problem (confirmed via live schema read + full checkout-function trace):
-- every flavor_bases/flavor_items row has cost_per_kg = NULL (never seeded
-- with real cost data — Decision 4 accepted risk at launch). Checkout's
-- custom_flavor branch computes `coalesce(cost_per_kg, 0)` and always writes
-- a real (non-null) order_items.line_cogs — meaning every Make Your Flavor
-- order's COGS silently reads as a trustworthy 0 instead of "unknown". The
-- existing deliveredMissingCogs honesty flag only catches orders.cogs_total
-- IS NULL, which never happens for a flavor order (it always gets a computed,
-- if wrong, number) — so it cannot see this case.
--
-- Fix (additive, forward-only, no historical data to touch — DB is at zero):
-- track whether a checked-out flavor line's cost basis was fully configured
-- at the moment of checkout (a catalog property, knowable immediately,
-- unlike coffee/espresso whose real cost comes from FIFO lot allocation).
--
-- 1) `order_items.flavor_cost_known boolean not null default true` — true for
--    every kind except custom_flavor (their cost basis is never silently
--    defaulted); for custom_flavor it is true only when the selected base AND
--    every selected flavor add-on had a non-null cost_per_kg at checkout time.
-- 2) `_create_checkout_order_phase5` (CREATE OR REPLACE, additive-only diff):
--    computes and writes the above. Every other line of pricing, delivery,
--    FIFO reservation, idempotent-replay, and snapshot logic is byte-for-byte
--    unchanged from the live definition (verified via pg_get_functiondef
--    before writing this, and the full diff against that source is exactly:
--    +1 declared variable, +1 new temp-table column, +2 assignment lines with
--    an explanatory comment, +1 value per existing INSERT (true/true/computed),
--    +1 column in the final INSERT INTO order_items).
-- 3) `get_admin_accounting_report_v1` (CREATE OR REPLACE, additive-only diff):
--    adds one new CTE (`flavor_incomplete`) counting delivered orders that
--    contain at least one custom_flavor line with flavor_cost_known = false,
--    and exposes it as `deliveredIncompleteFlavorCogs` alongside the existing
--    `deliveredMissingCogs`. No existing computed value changed.
--
-- No selling price, builder pricing, delivery, promo, payment, refund, or
-- return-rule change. No cost value invented or estimated — unknown stays
-- unknown. No historical/master data mutated (DB is at zero; this is a
-- forward-only tracking column). No service-role code.
-- =============================================================================

-- =============================================================================
-- §1 — order_items.flavor_cost_known
-- =============================================================================

alter table public.order_items
  add column if not exists flavor_cost_known boolean not null default true;

comment on column public.order_items.flavor_cost_known is
  'For kind=custom_flavor lines only: true when both the selected base and every selected flavor add-on had a configured (non-null) cost_per_kg at checkout time. Always true for every other kind (their cost basis is tracked via real FIFO lot unit_cost, never silently defaulted to 0). Used to distinguish a genuinely-zero-cost flavor line from an unknown-cost line that would otherwise be reported as a trustworthy zero.';

-- =============================================================================
-- §2 — checkout: track cost-known per flavor line
-- =============================================================================

CREATE OR REPLACE FUNCTION public._create_checkout_order_phase5(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- ---- Phase 8/9 additions -------------------------------------------
  v_has_product       boolean := false;
  v_has_espresso      boolean := false;
  v_has_flavor        boolean := false;
  v_order_type        text;

  v_line_id           uuid;
  v_size_kg           numeric;
  v_total_required_kg numeric;
  v_price_per_kg      numeric;
  v_cost_per_kg       numeric;
  v_flavor_cost_known boolean;
  v_line_cogs         numeric(12,2);
  v_detail_en         text;
  v_detail_ar         text;
  v_custom_data       jsonb;

  -- espresso blend validation
  v_bean_count        integer;
  v_percent_sum       numeric;
  v_bean_item         jsonb;
  v_bean_key          text;
  v_percent           numeric;
  v_bean_row          public.espresso_beans%rowtype;
  v_bean_ids          uuid[];
  v_bean_percents     numeric[];
  v_bean_names_en     text[];
  v_bean_names_ar     text[];
  v_bean_keys_arr     text[];
  v_bean_sale_prices  numeric[];
  v_beans_snapshot    jsonb;
  v_running_kg        numeric;
  v_bean_req_kg       numeric;
  i                   integer;

  -- flavor mix validation
  v_base_key          text;
  v_base_row          public.flavor_bases%rowtype;
  v_flavor_key_raw    text;
  v_flavor_key        text;
  v_flavor_row        public.flavor_items%rowtype;
  v_flavor_ids        uuid[];
  v_flavors_snapshot  jsonb;
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
  -- Decision 12 / Phase 1: every method starts pending. Unchanged in Phase 8/9.
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

  -- ---- 2. Resolve + validate every line into temp tables -------------
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
    custom_data  jsonb,
    line_cogs    numeric(12,2),
    flavor_cost_known boolean
  ) on commit drop;

  create temp table pg_temp._checkout_espresso_reqs (
    line_id      uuid,
    bean_id      uuid,
    bean_key     text,
    required_kg  numeric
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
      v_has_product := true;

      insert into pg_temp._checkout_lines values (
        gen_random_uuid(), 'product', v_product.id, v_product.slug, v_variant.id, v_size,
        v_variant.sku, v_product.name_en, v_product.name_ar, v_size, v_size,
        v_unit_price, v_qty, v_line_total, v_req_kg, null, null, true
      );

    elsif v_kind in ('custom_espresso', 'espresso-blend') then
      -- ---- Make Your Espresso: real manufacturing (Phase 8) -----------
      v_line_id := gen_random_uuid();
      v_size := nullif(btrim(coalesce(v_item->>'size', '')), '');
      v_size_kg := public.variant_size_to_kg(v_size);
      if v_size_kg is null then
        raise exception 'A custom espresso blend line has an invalid package size.' using errcode = '22023';
      end if;
      v_total_required_kg := round(v_size_kg * v_qty, 3);

      if jsonb_typeof(v_item->'beans') <> 'array' or jsonb_array_length(v_item->'beans') = 0 then
        raise exception 'A custom espresso blend line is missing its bean selection.' using errcode = '22023';
      end if;
      v_bean_count := jsonb_array_length(v_item->'beans');
      if v_bean_count > 20 then
        raise exception 'A custom espresso blend cannot use more than 20 beans.' using errcode = '22023';
      end if;

      v_bean_ids := array[]::uuid[];
      v_bean_percents := array[]::numeric[];
      v_bean_names_en := array[]::text[];
      v_bean_names_ar := array[]::text[];
      v_bean_keys_arr := array[]::text[];
      v_bean_sale_prices := array[]::numeric[];
      v_percent_sum := 0;

      for v_bean_item in select * from jsonb_array_elements(v_item->'beans')
      loop
        v_bean_key := nullif(btrim(coalesce(v_bean_item->>'bean_key', '')), '');
        if v_bean_key is null or length(v_bean_key) > 64 then
          raise exception 'Invalid espresso blend component.' using errcode = '22023';
        end if;

        begin
          v_percent := (v_bean_item->>'percent')::numeric;
        exception when others then
          raise exception 'Invalid espresso blend ratio.' using errcode = '22023';
        end;
        if v_percent is null or v_percent <= 0 or v_percent > 100 then
          raise exception 'Invalid espresso blend ratio.' using errcode = '22023';
        end if;

        select * into v_bean_row
        from public.espresso_beans
        where bean_key = v_bean_key and active = true;
        if not found then
          raise exception 'Bean "%" is not available.', v_bean_key using errcode = '22023';
        end if;

        if v_bean_row.id = any(v_bean_ids) then
          raise exception 'Duplicate bean "%" in blend.', v_bean_key using errcode = '22023';
        end if;

        v_bean_ids := array_append(v_bean_ids, v_bean_row.id);
        v_bean_percents := array_append(v_bean_percents, v_percent);
        v_bean_names_en := array_append(v_bean_names_en, v_bean_row.name_en);
        v_bean_names_ar := array_append(v_bean_names_ar, v_bean_row.name_ar);
        v_bean_keys_arr := array_append(v_bean_keys_arr, v_bean_key);
        v_bean_sale_prices := array_append(v_bean_sale_prices, v_bean_row.sale_price_per_kg);
        v_percent_sum := v_percent_sum + v_percent;
      end loop;

      if v_percent_sum <> 100 then
        raise exception 'Espresso blend ratios must total 100%%.' using errcode = '22023';
      end if;

      v_price_per_kg := 0;
      for i in 1 .. array_length(v_bean_ids, 1) loop
        v_price_per_kg := v_price_per_kg + v_bean_sale_prices[i] * v_bean_percents[i] / 100;
      end loop;

      v_unit_price := round(v_price_per_kg * v_size_kg, 2);
      v_line_total := round(v_unit_price * v_qty, 2);

      v_subtotal := v_subtotal + v_line_total;
      v_item_count := v_item_count + v_qty;
      v_has_espresso := true;

      -- Per-bean required kg: proportional, with the last bean absorbing any
      -- rounding remainder so the sum always equals v_total_required_kg exactly
      -- (needed for the atomic aggregate oversell guard in Section 8c).
      v_beans_snapshot := '[]'::jsonb;
      v_running_kg := 0;
      for i in 1 .. array_length(v_bean_ids, 1) loop
        if i < array_length(v_bean_ids, 1) then
          v_bean_req_kg := round(v_total_required_kg * v_bean_percents[i] / 100, 3);
        else
          v_bean_req_kg := round(v_total_required_kg - v_running_kg, 3);
        end if;
        if v_bean_req_kg <= 0 then
          raise exception 'Invalid espresso blend ratio: each selected bean must allocate at least one gram.'
            using errcode = '22023';
        end if;
        v_running_kg := v_running_kg + v_bean_req_kg;

        insert into pg_temp._checkout_espresso_reqs (line_id, bean_id, bean_key, required_kg)
        values (v_line_id, v_bean_ids[i], v_bean_keys_arr[i], v_bean_req_kg);

        v_beans_snapshot := v_beans_snapshot || jsonb_build_array(jsonb_build_object(
          'beanKey', v_bean_keys_arr[i],
          'nameEn', v_bean_names_en[i],
          'nameAr', v_bean_names_ar[i],
          'percent', v_bean_percents[i],
          'requiredKg', v_bean_req_kg
        ));
      end loop;

      v_detail_en := v_size || ' · ' || array_to_string(v_bean_names_en, ' + ');
      v_detail_ar := v_size || ' · ' || array_to_string(v_bean_names_ar, ' + ');

      v_custom_data := jsonb_build_object(
        'builder', 'espresso',
        'packageSize', v_size,
        'totalWeightKg', v_total_required_kg,
        'beans', v_beans_snapshot
      );

      insert into pg_temp._checkout_lines values (
        v_line_id, 'custom_espresso', null, null, null, v_size, null,
        'Custom Espresso Blend', 'توليفة إسبريسو مخصصة', v_detail_en, v_detail_ar,
        v_unit_price, v_qty, v_line_total, v_total_required_kg, v_custom_data, null, true
      );

    elsif v_kind in ('custom_flavor', 'flavor-mix') then
      -- ---- Make Your Flavor: cost-only (Phase 9), no stock effect -----
      v_line_id := gen_random_uuid();
      v_size := nullif(btrim(coalesce(v_item->>'size', '')), '');
      v_size_kg := public.variant_size_to_kg(v_size);
      if v_size_kg is null then
        raise exception 'A custom flavor mix line has an invalid package size.' using errcode = '22023';
      end if;

      v_base_key := nullif(btrim(coalesce(v_item->>'base_key', '')), '');
      if v_base_key is null or length(v_base_key) > 64 then
        raise exception 'A custom flavor mix line is missing its base.' using errcode = '22023';
      end if;
      select * into v_base_row
      from public.flavor_bases
      where base_key = v_base_key and active = true;
      if not found then
        raise exception 'Flavor base "%" is not available.', v_base_key using errcode = '22023';
      end if;

      if jsonb_typeof(v_item->'flavor_keys') <> 'array' or jsonb_array_length(v_item->'flavor_keys') = 0 then
        raise exception 'A custom flavor mix line is missing its flavor selection.' using errcode = '22023';
      end if;
      if jsonb_array_length(v_item->'flavor_keys') > 4 then
        raise exception 'A custom flavor mix cannot use more than 4 flavors.' using errcode = '22023';
      end if;

      v_price_per_kg := v_base_row.price_per_kg;
      v_cost_per_kg := coalesce(v_base_row.cost_per_kg, 0);
      -- Group 4 (Flavor COGS honesty): track whether every cost component
      -- actually had a configured value, so a checked-out line with an
      -- unconfigured cost never masquerades as a real, trustworthy 0.
      v_flavor_cost_known := (v_base_row.cost_per_kg is not null);
      v_flavor_ids := array[]::uuid[];
      v_flavors_snapshot := '[]'::jsonb;

      for v_flavor_key_raw in select * from jsonb_array_elements_text(v_item->'flavor_keys')
      loop
        v_flavor_key := nullif(btrim(v_flavor_key_raw), '');
        if v_flavor_key is null or length(v_flavor_key) > 64 then
          raise exception 'Invalid flavor selection.' using errcode = '22023';
        end if;

        select * into v_flavor_row
        from public.flavor_items
        where flavor_key = v_flavor_key and active = true;
        if not found then
          raise exception 'Flavor "%" is not available.', v_flavor_key using errcode = '22023';
        end if;

        if v_flavor_row.id = any(v_flavor_ids) then
          raise exception 'Duplicate flavor "%" in mix.', v_flavor_key using errcode = '22023';
        end if;
        v_flavor_ids := array_append(v_flavor_ids, v_flavor_row.id);

        v_price_per_kg := v_price_per_kg + v_flavor_row.add_on_per_kg;
        v_cost_per_kg := v_cost_per_kg + coalesce(v_flavor_row.cost_per_kg, 0);
        v_flavor_cost_known := v_flavor_cost_known and (v_flavor_row.cost_per_kg is not null);

        v_flavors_snapshot := v_flavors_snapshot || jsonb_build_array(jsonb_build_object(
          'flavorKey', v_flavor_key,
          'nameEn', v_flavor_row.name_en,
          'nameAr', v_flavor_row.name_ar,
          'addOnPerKg', v_flavor_row.add_on_per_kg
        ));
      end loop;

      v_unit_price := round(v_price_per_kg * v_size_kg, 2);
      v_line_total := round(v_unit_price * v_qty, 2);
      v_line_cogs  := round(v_cost_per_kg * v_size_kg * v_qty, 2);

      v_subtotal := v_subtotal + v_line_total;
      v_item_count := v_item_count + v_qty;
      v_has_flavor := true;

      v_detail_en := v_size || ' · ' || v_base_row.name_en || ' · ' ||
        (select string_agg(x->>'nameEn', ' + ') from jsonb_array_elements(v_flavors_snapshot) x);
      v_detail_ar := v_size || ' · ' || v_base_row.name_ar || ' · ' ||
        (select string_agg(x->>'nameAr', ' + ') from jsonb_array_elements(v_flavors_snapshot) x);

      v_custom_data := jsonb_build_object(
        'builder', 'flavor',
        'packageSize', v_size,
        'totalWeightKg', round(v_size_kg * v_qty, 3),
        'base', jsonb_build_object('baseKey', v_base_key, 'nameEn', v_base_row.name_en, 'nameAr', v_base_row.name_ar),
        'flavors', v_flavors_snapshot
      );

      insert into pg_temp._checkout_lines values (
        v_line_id, 'custom_flavor', null, null, null, v_size, null,
        'Custom Flavor Mix', 'خلطة نكهات مخصصة', v_detail_en, v_detail_ar,
        v_unit_price, v_qty, v_line_total, 0, v_custom_data, v_line_cogs, v_flavor_cost_known
      );

    else
      raise exception 'Unknown item kind.' using errcode = '22023';
    end if;
  end loop;

  -- ---- Order type from item kinds present -----------------------------
  if v_has_espresso or v_has_flavor then
    if v_has_product or (v_has_espresso and v_has_flavor) then
      v_order_type := 'mixed';
    elsif v_has_espresso then
      v_order_type := 'custom_espresso';
    else
      v_order_type := 'custom_flavor';
    end if;
  else
    v_order_type := 'standard';
  end if;

  -- ---- 3. Server-side totals -----------------------------------------
  -- Phase 1 zone delivery (Decisions 10 + 11). Unchanged in Phase 8/9.
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
    'pending', v_order_type, 'website',
    v_subtotal, v_discount_total, v_delivery_fee, v_delivery_zone, v_delivery_note, v_total,
    v_payment_method, v_payment_status, v_pay_ref, v_pay_phone,
    v_guest_id, v_checkout_attempt_id, v_customer_note
  )
  on conflict (checkout_attempt_id) where checkout_attempt_id is not null
  do nothing
  returning id into v_order_id;

  -- Idempotent replay: a retry returns the original receipt and does NOT
  -- re-create items or re-reserve inventory/lots (unchanged from Phase 1/5).
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

  -- ---- 7. Order item snapshots (explicit line_id + optional line_cogs) --
  insert into public.order_items (
    id, order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data, line_cogs, flavor_cost_known
  )
  select
    line_id, v_order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data, line_cogs, flavor_cost_known
  from pg_temp._checkout_lines;

  -- ---- 8a. Oversell guard on inventory_stock (per product, atomic) ---
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

  -- ---- 8b. Coffee FIFO lot reservation (per line -> allocations) -----
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

  -- ---- 8c. Espresso bean oversell guard + FIFO reservation (Phase 8) -
  for r in
    select bean_id, sum(required_kg) as req_kg
    from pg_temp._checkout_espresso_reqs
    group by bean_id
    order by bean_id
  loop
    update public.espresso_bean_stock
      set available_kg = available_kg - r.req_kg,
          reserved_kg  = reserved_kg + r.req_kg
    where bean_id = r.bean_id
      and available_kg >= r.req_kg;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Insufficient stock for a bean in your custom espresso blend. Please adjust the blend or quantity.'
        using errcode = '22023';
    end if;
  end loop;

  for r in
    select line_id, bean_id, required_kg
    from pg_temp._checkout_espresso_reqs
    order by bean_id
  loop
    perform public._allocate_espresso_bean_lots_fifo(
      v_order_id, r.line_id, r.bean_id, r.required_kg, v_order_code, 'system', true
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
$function$;

-- =============================================================================
-- §3 — accounting report: expose the incomplete-flavor-COGS honesty flag
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_accounting_report_v1(p_as_of timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_as_of       timestamptz := coalesce(p_as_of, now());
  v_today_cairo date        := (v_as_of at time zone 'Africa/Cairo')::date;
  v_result      jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  with month_names(idx, label) as (
    values (1,'Jan'),(2,'Feb'),(3,'Mar'),(4,'Apr'),(5,'May'),(6,'Jun'),
           (7,'Jul'),(8,'Aug'),(9,'Sep'),(10,'Oct'),(11,'Nov'),(12,'Dec')
  ),
  orders_all as (
    select o.id, o.status, o.subtotal, o.discount_total, o.delivery_fee, o.total, o.cogs_total, o.placed_at
    from public.orders o
  ),
  revenue as (
    select
      round(coalesce(sum(total) filter (where status <> 'cancelled'), 0), 2) as sales_gross,
      round(coalesce(sum(subtotal) filter (where status <> 'cancelled'), 0), 2) as product_subtotal,
      round(coalesce(sum(discount_total) filter (where status <> 'cancelled'), 0), 2) as discounts_total,
      round(coalesce(sum(delivery_fee) filter (where status <> 'cancelled'), 0), 2) as delivery_fees_total,
      round(coalesce(sum(subtotal - discount_total) filter (where status = 'delivered'), 0), 2) as delivered_net_sales,
      round(coalesce(sum(coalesce(cogs_total, 0)) filter (where status = 'delivered'), 0), 2) as cogs_total,
      count(*) filter (where status = 'delivered' and cogs_total is null) as delivered_missing_cogs,
      count(*) as order_count,
      count(*) filter (where status = 'delivered') as delivered_count,
      count(*) filter (where status = 'cancelled') as cancelled_count
    from orders_all
  ),
  per_order_cash as (
    select
      o.id, o.total, o.status,
      coalesce(p.paid, 0) as paid,
      coalesce(r.refunded, 0) as refunded
    from orders_all o
    left join (select order_id, sum(amount) as paid from public.order_payments group by order_id) p on p.order_id = o.id
    left join (select order_id, sum(amount) as refunded from public.order_refunds group by order_id) r on r.order_id = o.id
  ),
  cash as (
    select
      round(coalesce((select sum(amount) from public.order_payments), 0), 2) as paid_total,
      round(coalesce((select sum(amount) from public.order_refunds), 0), 2) as refunded_total,
      round(coalesce(sum(greatest(total - (paid - refunded), 0)) filter (where status <> 'cancelled'), 0), 2) as receivable
    from per_order_cash
  ),
  method_breakdown as (
    select coalesce(jsonb_agg(jsonb_build_object('key', method, 'amount', round(amount, 2), 'count', cnt)
      order by case method when 'cash' then 1 when 'bank_transfer' then 2 when 'mobile_wallet' then 3 else 4 end), '[]'::jsonb) as data
    from (select method, sum(amount) as amount, count(*) as cnt from public.order_payments group by method) m
  ),
  expenses_agg as (
    select round(coalesce(sum(amount), 0), 2) as operating_expenses from public.expenses
  ),
  purchases_agg as (
    select
      round(coalesce(sum(total_amount) filter (where status <> 'cancelled'), 0), 2) as total_purchases,
      round(coalesce(sum(paid_amount) filter (where status <> 'cancelled'), 0), 2) as paid_to_suppliers,
      round(coalesce(sum(greatest(total_amount - paid_amount, 0)) filter (where status <> 'cancelled'), 0), 2) as supplier_payable
    from public.purchases
  ),
  supplier_balances as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'supplierId', supplier_id, 'name', name, 'purchaseCount', purchase_count,
      'purchaseTotal', round(purchase_total, 2), 'paid', round(paid, 2), 'payable', round(payable, 2)
    ) order by payable desc, purchase_total desc), '[]'::jsonb) as data
    from (
      select
        pu.supplier_id, max(s.name) as name, count(*) as purchase_count,
        sum(pu.total_amount) as purchase_total, sum(pu.paid_amount) as paid,
        sum(greatest(pu.total_amount - pu.paid_amount, 0)) as payable
      from public.purchases pu
      left join public.suppliers s on s.id = pu.supplier_id
      where pu.status <> 'cancelled'
      group by pu.supplier_id
    ) sb
  ),
  returns_agg as (
    select count(*) as returns_count, round(coalesce(sum(restocked_kg), 0), 2) as restocked_kg
    from public.order_returns
  ),
  -- Group 4 (Flavor COGS honesty): a delivered order's cogs_total is never
  -- NULL when it contains a custom_flavor line (checkout always writes a
  -- computed, if silently-zero, value), so delivered_missing_cogs above
  -- cannot see this case. Flag it separately: count delivered orders that
  -- contain at least one custom_flavor line whose cost basis was not fully
  -- configured at checkout time (order_items.flavor_cost_known = false).
  flavor_incomplete as (
    select count(distinct o.id) as delivered_incomplete_flavor_cogs
    from orders_all o
    join public.order_items oi on oi.order_id = o.id
    where o.status = 'delivered'
      and oi.kind = 'custom_flavor'
      and oi.flavor_cost_known = false
  ),
  month_buckets as (
    select (date_trunc('month', v_today_cairo::timestamp) - ((5 - g) || ' months')::interval)::date as month_start_day
    from generate_series(0, 5) as g
  ),
  monthly as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', mn.label || ' ' || to_char(mb.month_start_day, 'YY'),
      'revenue', round(coalesce(rev.v, 0), 2),
      'collections', round(coalesce(pay.v, 0) - coalesce(ref.v, 0), 2),
      'expenses', round(coalesce(exp.v, 0), 2),
      'grossProfit', round(coalesce(gp.v, 0), 2)
    ) order by mb.month_start_day), '[]'::jsonb) as data
    from month_buckets mb
    join month_names mn on mn.idx = extract(month from mb.month_start_day)::int
    left join lateral (
      select sum(total) as v from orders_all
      where status <> 'cancelled'
        and placed_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) rev on true
    left join lateral (
      select sum(amount) as v from public.order_payments
      where paid_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and paid_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) pay on true
    left join lateral (
      select sum(amount) as v from public.order_refunds
      where refunded_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and refunded_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) ref on true
    left join lateral (
      select sum(amount) as v from public.expenses
      where expense_date >= mb.month_start_day
        and expense_date <  (mb.month_start_day + interval '1 month')::date
    ) exp on true
    left join lateral (
      select sum(subtotal - discount_total - coalesce(cogs_total, 0)) as v
      from orders_all
      where status = 'delivered'
        and placed_at >= (mb.month_start_day::timestamp at time zone 'Africa/Cairo')
        and placed_at <  ((mb.month_start_day + interval '1 month')::date::timestamp at time zone 'Africa/Cairo')
    ) gp on true
  )
  select jsonb_build_object(
    'meta', jsonb_build_object('version', 1, 'calculatedAt', now(), 'asOf', v_as_of, 'timezone', 'Africa/Cairo'),
    'salesGross', revenue.sales_gross,
    'productSubtotal', revenue.product_subtotal,
    'discountsTotal', revenue.discounts_total,
    'deliveryFeesTotal', revenue.delivery_fees_total,
    'deliveredNetSales', revenue.delivered_net_sales,
    'cogsTotal', revenue.cogs_total,
    'deliveredMissingCogs', revenue.delivered_missing_cogs,
    'deliveredIncompleteFlavorCogs', flavor_incomplete.delivered_incomplete_flavor_cogs,
    'orderCount', revenue.order_count,
    'deliveredCount', revenue.delivered_count,
    'cancelledCount', revenue.cancelled_count,
    'paidTotal', cash.paid_total,
    'refundedTotal', cash.refunded_total,
    'receivable', cash.receivable,
    'methodBreakdown', method_breakdown.data,
    'operatingExpenses', expenses_agg.operating_expenses,
    'totalPurchases', purchases_agg.total_purchases,
    'paidToSuppliers', purchases_agg.paid_to_suppliers,
    'supplierPayable', purchases_agg.supplier_payable,
    'supplierBalances', supplier_balances.data,
    'returnsCount', returns_agg.returns_count,
    'restockedKg', returns_agg.restocked_kg,
    'monthly', monthly.data
  )
  into v_result
  from revenue, cash, method_breakdown, expenses_agg, purchases_agg, supplier_balances, returns_agg, flavor_incomplete, monthly;

  return v_result;
end;
$function$;
