-- =====================================================================
-- Phase 18B — Store-closed checkout enforcement + durable notification log
-- Migration: 20260704170000_phase18b_store_closed_and_notification_log
-- Runs after: 20260704160000_phase17a_site_settings_grants
-- =====================================================================
-- PURPOSE
--   1) Enforce the storefront "store closed" flag at the checkout RPC layer so a
--      new order cannot be created while the store is closed. Until now the
--      closed notice was UI-only and bypassable. The rule now lives inside the
--      SECURITY DEFINER checkout entrypoint, which the browser calls on the anon
--      key — the only place it can be enforced safely.
--   2) Give Telegram order notifications a durable, DB-backed "already sent"
--      record so a retry across serverless instances (where the previous
--      in-memory guard is per-instance) cannot double-send.
--
-- SAFETY / SCOPE
--   * ADDITIVE ONLY. No existing table/column/policy is dropped or edited. No
--     historical order, price, discount, delivery fee, inventory lot, allocation,
--     COGS, payment, refund, or return value is rewritten.
--   * Checkout pricing, delivery zones, promo evaluation, FIFO reservation, and
--     idempotency are UNCHANGED. The Phase 6-7 checkout body is kept byte-for-byte
--     (renamed once to an internal name) and called unchanged by the new thin
--     wrapper. The wrapper only adds a replay-aware store-open gate.
--   * The store-open gate runs ONLY for a genuinely new order. An idempotent
--     replay of an already-created order (same checkout_attempt_id) still returns
--     its stored receipt even after the store is closed, so idempotency holds.
--   * Fail-open: if the storefront setting row is missing or malformed, checkout
--     is allowed. A missing config row must never block the whole store.
--   * The notification log is admin-read-only; anon/authenticated get NO table
--     privilege. Its two RPCs return only booleans (no PII, no order contents).
--   * No service-role code. RLS stays enabled. No public git push here.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — Durable Telegram (order) notification log
-- =====================================================================
-- Minimal ledger: which order was notified on which channel, and when. It never
-- stores customer data or order contents — only the order id + channel. Admins
-- may read it; the public Data API roles get no direct table access. Writes go
-- exclusively through the SECURITY DEFINER RPCs below (the established anon-key +
-- validated-RPC pattern; the Next.js notification route has no service role).

create table if not exists public.order_notifications (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  channel     text not null check (channel in ('telegram')),
  status      text not null default 'sent' check (status in ('sent')),
  created_at  timestamptz not null default now(),
  constraint order_notifications_order_channel_key unique (order_id, channel)
);

create index if not exists order_notifications_order_idx
  on public.order_notifications (order_id);

alter table public.order_notifications enable row level security;

-- Admins may read the log. No insert/update/delete policy: all writes go through
-- the DEFINER RPCs, never a direct client write.
drop policy if exists order_notifications_admin_read on public.order_notifications;
create policy order_notifications_admin_read on public.order_notifications
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.order_notifications from anon, authenticated;
grant select on table public.order_notifications to authenticated;


-- Read: has this order already been notified on this channel? Safe boolean only.
create or replace function public.order_notification_was_sent(
  p_order_id uuid,
  p_channel  text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.order_notifications
    where order_id = p_order_id
      and channel = lower(btrim(coalesce(p_channel, '')))
  );
$$;

-- Write: record that an order was notified on a channel. Idempotent (unique key
-- + ON CONFLICT DO NOTHING). Returns true when this call created the row (i.e.
-- the caller "won" the record), false when it already existed. Only accepts a
-- real order id so a junk id cannot fill the table. Returns/leaks no order data.
create or replace function public.log_order_notification(
  p_order_id uuid,
  p_channel  text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel  text := lower(btrim(coalesce(p_channel, '')));
  v_rows     integer;
begin
  if p_order_id is null then
    raise exception 'Order id is required.' using errcode = '22023';
  end if;
  if v_channel not in ('telegram') then
    raise exception 'Unsupported notification channel.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  insert into public.order_notifications (order_id, channel, status)
  values (p_order_id, v_channel, 'sent')
  on conflict on constraint order_notifications_order_channel_key do nothing;

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.order_notification_was_sent(uuid, text)
  from public, anon, authenticated;
grant execute on function public.order_notification_was_sent(uuid, text)
  to anon, authenticated;

revoke all on function public.log_order_notification(uuid, text)
  from public, anon, authenticated;
grant execute on function public.log_order_notification(uuid, text)
  to anon, authenticated;


-- =====================================================================
-- SECTION 2 — Store-closed enforcement wrapper around checkout
-- =====================================================================
-- The current public create_checkout_order is the Phase 6-7 wrapper (promo +
-- packaging around the Phase-5 order/coffee-FIFO core). We keep it BYTE-FOR-BYTE
-- by renaming it once to an internal name, then add a thin new public wrapper
-- that gates only genuinely-new orders on the storefront open flag before
-- delegating. The inner function keeps its own authoritative idempotent replay,
-- pricing, delivery, promo, packaging, and inventory behavior unchanged.

do $phase18b_checkout_rename$
begin
  if to_regprocedure('public._create_checkout_order_phase67(jsonb)') is null then
    alter function public.create_checkout_order(jsonb)
      rename to _create_checkout_order_phase67;
  end if;
end
$phase18b_checkout_rename$;

revoke all on function public._create_checkout_order_phase67(jsonb)
  from public, anon, authenticated;

create or replace function public.create_checkout_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout_attempt_id text := nullif(btrim(coalesce(p_payload->>'checkout_attempt_id', '')), '');
  v_is_replay           boolean := false;
  v_store_open          text;
begin
  -- Is this an idempotent replay of an already-created order? Mirror the inner
  -- function's replay guard exactly (same length/charset check + attempt lookup)
  -- so a retry is never mistaken for a new order and blocked.
  if v_checkout_attempt_id is not null
     and length(v_checkout_attempt_id) <= 64
     and v_checkout_attempt_id ~ '^[A-Za-z0-9_-]+$' then
    select exists (
      select 1 from public.orders
      where checkout_attempt_id = v_checkout_attempt_id
    ) into v_is_replay;
  end if;

  -- Store-closed gate: block ONLY a genuinely new order. Fail-open when the
  -- storefront setting is missing/blank so a config gap never freezes the store.
  -- Delivery, pricing, promo, and idempotency are untouched by this gate.
  if not v_is_replay then
    select ss.value->>'storeOpen' into v_store_open
    from public.site_settings ss
    where ss.key = 'storefront';

    if v_store_open is not null and lower(v_store_open) = 'false' then
      raise exception 'Store is closed for new orders.' using errcode = 'P0001';
    end if;
  end if;

  return public._create_checkout_order_phase67(p_payload);
end;
$$;

revoke all on function public.create_checkout_order(jsonb)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb)
  to anon, authenticated;


-- =====================================================================
-- SECTION 3 — Post-apply verification notes
-- =====================================================================
-- 1) Store open (default) — a normal anon checkout still creates an order and
--    returns the same receipt shape as before.
-- 2) Store closed:
--      update public.site_settings
--      set value = jsonb_set(value, '{storeOpen}', 'false')
--      where key = 'storefront';
--    A NEW anon create_checkout_order now raises "Store is closed for new orders."
--    A replay with an existing checkout_attempt_id still returns its receipt.
--    Re-open by setting storeOpen back to true (or via Admin Settings).
-- 3) Notification log:
--      select public.order_notification_was_sent('<order-uuid>', 'telegram');   -- false first time
--      select public.log_order_notification('<order-uuid>', 'telegram');        -- true (created)
--      select public.log_order_notification('<order-uuid>', 'telegram');        -- false (duplicate)
--    Anon can execute both RPCs; the base table stays admin-read-only.
-- =====================================================================
