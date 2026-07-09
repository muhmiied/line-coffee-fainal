-- Persist the optional checkout Google Maps URL inside the existing
-- orders.address_snapshot JSONB. The Phase 18B wrapper continues to delegate
-- all pricing, promo, delivery, inventory, payment, and idempotency behavior to
-- _create_checkout_order_phase67 unchanged.

create or replace function public.create_checkout_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout_attempt_id text := nullif(btrim(coalesce(p_payload->>'checkout_attempt_id', '')), '');
  v_google_maps_url     text := nullif(btrim(coalesce(p_payload->'address'->>'googleMapsUrl', '')), '');
  v_is_replay           boolean := false;
  v_store_open          text;
  v_result              jsonb;
begin
  if v_google_maps_url is not null
     and (
       length(v_google_maps_url) > 2048
       or v_google_maps_url !~* '^https?://[^[:space:]]+$'
     ) then
    raise exception 'Invalid Google Maps URL.' using errcode = '22023';
  end if;

  -- Preserve the existing idempotent replay/store-closed behavior exactly.
  if v_checkout_attempt_id is not null
     and length(v_checkout_attempt_id) <= 64
     and v_checkout_attempt_id ~ '^[A-Za-z0-9_-]+$' then
    select exists (
      select 1 from public.orders
      where checkout_attempt_id = v_checkout_attempt_id
    ) into v_is_replay;
  end if;

  if not v_is_replay then
    select ss.value->>'storeOpen' into v_store_open
    from public.site_settings ss
    where ss.key = 'storefront';

    if v_store_open is not null and lower(v_store_open) = 'false' then
      raise exception 'Store is closed for new orders.' using errcode = 'P0001';
    end if;
  end if;

  v_result := public._create_checkout_order_phase67(p_payload);

  if v_google_maps_url is not null then
    update public.orders
    set address_snapshot = jsonb_set(
      address_snapshot,
      '{googleMapsUrl}',
      to_jsonb(v_google_maps_url),
      true
    )
    where id = (v_result->>'order_id')::uuid;
  end if;

  return v_result;
end;
$$;

revoke all on function public.create_checkout_order(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb)
  to anon, authenticated;
