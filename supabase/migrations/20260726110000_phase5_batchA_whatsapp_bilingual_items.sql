-- =============================================================================
-- Phase 5 (final system stabilization) — Batch A / Group 5 follow-up:
-- bilingual item names in the shared notification payload
-- =============================================================================
-- Found during independent review of the WhatsApp trust-boundary fix: the
-- WhatsApp handoff now reuses get_order_notification_payload (the same
-- DB-authored snapshot Telegram already used), but that function only ever
-- returned English item names/details (oi.name_en/oi.detail_en). The
-- PREVIOUS client-trusted WhatsApp code used t(item.name)/t(item.detail),
-- which showed the customer's own language — so an Arabic-speaking customer
-- would have seen a regression (English item names in their WhatsApp
-- message) had this not been caught before commit.
--
-- Fix: additive only. Adds 'name_ar'/'detail_ar' alongside the existing
-- 'name'/'detail' keys in the same items array. Telegram's route.ts (which
-- only reads .name/.detail) is completely unaffected — it simply ignores
-- the two new keys. No other part of this function changes: same trust
-- boundary (checkout_attempt_id proof), same cost-free shape, same customer/
-- address fields, same signature.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_order_notification_payload(p_order_id uuid, p_checkout_attempt_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
          'name_ar', oi.name_ar,
          'detail_ar', coalesce(oi.detail_ar, ''),
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
$function$;
