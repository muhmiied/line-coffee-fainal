-- Phase 1 (Customer Correctness + Security Hardening) — contact form abuse
-- control. `create_contact_message` is anon-callable directly against
-- PostgREST (the public contact form calls it straight from the browser, not
-- through a Next.js route), and had no throttle at all — a script could call
-- it as fast as the network allows. Adds an optional, additive guest_id
-- parameter (defaulting to null so any existing caller keeps working
-- unchanged) and a durable per-device soft throttle. This is a deterrent, not
-- a robust anti-bot control: guest_id is a client-generated, unauthenticated
-- device id (the same identifier already used everywhere else in this app
-- for guest-scoped orders/wishlist/addresses), so a determined attacker can
-- bypass it by generating a fresh one per request. A real defense against a
-- determined/automated sender needs a CAPTCHA on the form (config.toml
-- already scaffolds Turnstile for Auth flows, but that config does not cover
-- this RPC) or platform/edge-level rate limiting in front of the Supabase
-- project — both are owner decisions outside this migration's scope.

alter table public.contact_messages
  add column if not exists guest_id text;

create index if not exists contact_messages_guest_id_created_at_idx
  on public.contact_messages (guest_id, created_at)
  where guest_id is not null;

create or replace function public.create_contact_message(
  p_message jsonb,
  p_guest_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_message ->> 'name', ''));
  v_phone text := nullif(trim(p_message ->> 'phone'), '');
  v_email text := nullif(lower(trim(p_message ->> 'email')), '');
  v_subject text := nullif(trim(p_message ->> 'subject'), '');
  v_body text := trim(coalesce(p_message ->> 'message', ''));
  v_source text := lower(coalesce(nullif(p_message ->> 'source', ''), 'contact_page'));
  v_guest_id text := nullif(btrim(coalesce(p_guest_id, '')), '');
  v_recent_count integer;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'A valid name is required';
  end if;

  if v_phone is null and v_email is null then
    raise exception 'A phone number or email is required';
  end if;

  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'A valid email is required';
  end if;

  if v_phone is not null and char_length(v_phone) > 40 then
    raise exception 'Phone number is too long';
  end if;

  if char_length(v_body) < 5 or char_length(v_body) > 5000 then
    raise exception 'Message must be between 5 and 5000 characters';
  end if;

  if v_subject is not null and char_length(v_subject) > 160 then
    raise exception 'Subject is too long';
  end if;

  if v_source not in ('contact_page', 'homepage') then
    v_source := 'contact_page';
  end if;

  if v_guest_id is not null
     and (length(v_guest_id) < 8 or length(v_guest_id) > 64 or v_guest_id !~ '^[A-Za-z0-9_-]+$') then
    v_guest_id := null;
  end if;

  if v_guest_id is not null then
    select count(*)
      into v_recent_count
    from public.contact_messages
    where guest_id = v_guest_id
      and created_at > now() - interval '15 minutes';

    if v_recent_count >= 3 then
      raise exception 'Too many messages sent recently. Please try again later.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.contact_messages (
    name, phone, whatsapp, email, source, subject, message, guest_id
  )
  values (
    v_name,
    v_phone,
    v_phone,
    v_email,
    v_source,
    v_subject,
    v_body,
    v_guest_id
  )
  returning id into v_id;

  return v_id;
end;
$$;
