-- =============================================================================
-- Phase 5 (final system stabilization) — Batch A / Group 5: Telegram
-- concurrency-safe deduplication (closes the documented double-send race)
-- =============================================================================
-- Problem (documented in CLAUDE.md since Phase 18B/20E, confirmed by reading
-- the live route + RPCs before writing this): the existing dedup checks
-- "was this already sent?" (order_notification_was_sent) BEFORE sending, then
-- records "it was sent" (log_order_notification) AFTER sending. Two
-- concurrent requests for the same order (e.g. a client retry racing a slow
-- first attempt, or two warm serverless instances) can both pass the
-- pre-send check before either finishes, so both send a real Telegram
-- message — the unique (order_id, channel) constraint only stops the second
-- durable-log INSERT, by which point the duplicate message already went out.
--
-- Fix (additive, forward-only): a claim-before-send pattern. A new status
-- value 'claimed' plus a `claimed_at` timestamp let exactly one concurrent
-- caller atomically win the right to send (via `INSERT ... ON CONFLICT DO
-- UPDATE ... WHERE`, which Postgres resolves under a real row lock, not a
-- read-then-write race). Only the winner proceeds to call the Telegram API;
-- every other concurrent caller is told 'already_sent' or 'in_progress' and
-- must not send. A failed send explicitly releases its claim (immediate
-- retry, no stuck state); a claim that's abandoned outright (crash before
-- release) still self-heals after `p_claim_timeout_seconds` via the same
-- atomic WHERE clause, so no order can be permanently blocked from ever
-- notifying.
--
-- The existing 2-arg (already anon/authenticated-revoked, kept only for
-- historical compatibility) and 3-arg order_notification_was_sent /
-- log_order_notification functions are left untouched — this migration adds
-- three new proof-bound functions alongside them rather than replacing
-- anything, and the route (code-only change, not part of this migration)
-- switches to the new claim-based flow.
--
-- No pricing, order, payment, inventory, or business-rule change. No
-- service-role code. checkout_attempt_id remains the sole trust boundary
-- (same 8-64 char validated proof already used by every notification RPC).
-- =============================================================================

alter table public.order_notifications
  drop constraint if exists order_notifications_status_check;

alter table public.order_notifications
  add constraint order_notifications_status_check
  check (status in ('sent', 'claimed'));

alter table public.order_notifications
  add column if not exists claimed_at timestamptz;

comment on column public.order_notifications.claimed_at is
  'Set when status=claimed (an in-flight or abandoned send attempt). NULL once status=sent. Used only to detect a stale (crashed/abandoned) claim so a fresh attempt can safely re-claim after p_claim_timeout_seconds.';

-- =============================================================================
-- claim_order_notification — atomic "may I send?" check
-- =============================================================================
-- Returns exactly one of:
--   'claimed'      — this call won the right to send; proceed to the API call.
--   'already_sent' — a prior attempt already completed; do not send.
--   'in_progress'  — another concurrent attempt currently owns the claim
--                    (fresher than the timeout); do not send — it will
--                    either succeed or its claim will go stale and a later
--                    retry can win it.
create or replace function public.claim_order_notification(
  p_order_id uuid,
  p_channel text,
  p_checkout_attempt_id text,
  p_claim_timeout_seconds integer default 30
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_attempt text := btrim(coalesce(p_checkout_attempt_id, ''));
  v_timeout integer := greatest(coalesce(p_claim_timeout_seconds, 30), 5);
  v_claimed_id uuid;
  v_current_status text;
begin
  if p_order_id is null
     or length(v_attempt) < 8
     or length(v_attempt) > 64
     or v_attempt !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid notification proof.' using errcode = '22023';
  end if;
  if v_channel not in ('telegram') then
    raise exception 'Unsupported notification channel.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.orders
    where id = p_order_id and checkout_attempt_id = v_attempt
  ) then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  -- Atomic claim: a genuinely concurrent caller either creates the row (no
  -- conflict) or hits the conflict and is only allowed to re-claim when the
  -- existing row is a stale 'claimed' row past the timeout. A 'sent' row, or
  -- a fresh 'claimed' row, never matches the WHERE clause, so this INSERT
  -- affects at most one caller at a time for a given (order_id, channel).
  insert into public.order_notifications (order_id, channel, status, claimed_at)
  values (p_order_id, v_channel, 'claimed', now())
  on conflict on constraint order_notifications_order_channel_key
  do update set
    status = 'claimed',
    claimed_at = now()
  where public.order_notifications.status = 'claimed'
    and public.order_notifications.claimed_at < now() - make_interval(secs => v_timeout)
  returning id into v_claimed_id;

  if v_claimed_id is not null then
    return 'claimed';
  end if;

  -- This caller did not win the claim — report why, for the caller's own
  -- logging/short-circuit only (the exclusivity guarantee above already
  -- holds regardless of what this diagnostic read observes).
  select status into v_current_status
  from public.order_notifications
  where order_id = p_order_id and channel = v_channel;

  if v_current_status = 'sent' then
    return 'already_sent';
  end if;

  return 'in_progress';
end;
$$;

revoke all on function public.claim_order_notification(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_order_notification(uuid, text, text, integer)
  to anon, authenticated;

-- =============================================================================
-- mark_order_notification_sent — the claim owner reports a successful send
-- =============================================================================
create or replace function public.mark_order_notification_sent(
  p_order_id uuid,
  p_channel text,
  p_checkout_attempt_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_attempt text := btrim(coalesce(p_checkout_attempt_id, ''));
  v_rows integer;
begin
  if p_order_id is null
     or length(v_attempt) < 8
     or length(v_attempt) > 64
     or v_attempt !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid notification proof.' using errcode = '22023';
  end if;
  if v_channel not in ('telegram') then
    raise exception 'Unsupported notification channel.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.orders
    where id = p_order_id and checkout_attempt_id = v_attempt
  ) then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  update public.order_notifications
  set status = 'sent', claimed_at = null
  where order_id = p_order_id
    and channel = v_channel
    and status = 'claimed';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.mark_order_notification_sent(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_order_notification_sent(uuid, text, text)
  to anon, authenticated;

-- =============================================================================
-- release_order_notification_claim — the claim owner reports a failed send
-- =============================================================================
-- Deletes the claim outright (rather than resetting a flag) so a genuinely
-- failed attempt leaves nothing blocking an immediate retry. Only ever
-- touches a 'claimed' row — a 'sent' row is never affected by this function.
create or replace function public.release_order_notification_claim(
  p_order_id uuid,
  p_channel text,
  p_checkout_attempt_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel text := lower(btrim(coalesce(p_channel, '')));
  v_attempt text := btrim(coalesce(p_checkout_attempt_id, ''));
  v_rows integer;
begin
  if p_order_id is null
     or length(v_attempt) < 8
     or length(v_attempt) > 64
     or v_attempt !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'Invalid notification proof.' using errcode = '22023';
  end if;
  if v_channel not in ('telegram') then
    raise exception 'Unsupported notification channel.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.orders
    where id = p_order_id and checkout_attempt_id = v_attempt
  ) then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  delete from public.order_notifications
  where order_id = p_order_id
    and channel = v_channel
    and status = 'claimed';
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

revoke all on function public.release_order_notification_claim(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.release_order_notification_claim(uuid, text, text)
  to anon, authenticated;
