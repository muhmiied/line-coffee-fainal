-- =====================================================================
-- Phase 20C — Real Announcement Bar (schema + RLS + seed)
-- =====================================================================
-- AUTHORED ONLY — apply with `supabase db push` after owner review.
-- Purely ADDITIVE: one new table + policies + grants + trigger + an
-- idempotent seed. No change to any existing table, RLS, grant, function,
-- view, or business rule. No service-role. Admin-only write; public read of
-- ACTIVE rows only.
--
-- Backs the public top announcement bar with real, admin-managed rows so the
-- Admin -> Marketing "Announcement Bar" tab can create / edit / enable /
-- disable / delete the exact bilingual messages shown on the site (each with
-- a "Shop now" button + internal link). The public header falls back to the
-- built-in launch messages when the table is empty or unreachable, so the bar
-- is never blank before/after this migration is applied.
-- =====================================================================

create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  message_en    text not null
                  check (btrim(message_en) <> '' and length(message_en) <= 200),
  message_ar    text not null
                  check (btrim(message_ar) <> '' and length(message_ar) <= 200),
  cta_label_en  text not null default 'Shop now'
                  check (btrim(cta_label_en) <> '' and length(cta_label_en) <= 40),
  cta_label_ar  text not null default 'تسوق الآن'
                  check (btrim(cta_label_ar) <> '' and length(cta_label_ar) <= 40),
  -- Internal relative path only (must start with '/') — blocks external or
  -- javascript: URLs from ever reaching a public <Link href>.
  cta_href      text not null default '/products'
                  check (cta_href ~ '^/[A-Za-z0-9/_-]*$' and length(cta_href) <= 200),
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists announcements_active_order_idx
  on public.announcements (active, sort_order);

-- updated_at trigger (reuse the shared helper)
drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- RLS: anyone may read ACTIVE rows; admins manage all rows.
alter table public.announcements enable row level security;

drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (active = true);

drop policy if exists announcements_admin_all on public.announcements;
create policy announcements_admin_all on public.announcements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Grants (auto_expose is off, so grants are explicit). RLS still gates which
-- rows are visible and restricts every write to admins.
grant usage on schema public to anon, authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- Idempotent seed: only when the table is empty (first apply). Never
-- overwrites admin-edited rows on re-run. Mirrors the two launch messages
-- used as the public header fallback.
insert into public.announcements
  (message_en, message_ar, cta_label_en, cta_label_ar, cta_href, active, sort_order)
select v.* from (values
  ('Launch offers are live — shop your favorite coffee now',
   'عروض الافتتاح وصلت — اطلب قهوتك المفضلة الآن',
   'Shop now', 'تسوق الآن', '/products', true, 1),
  ('Limited-time special discount on Line Coffee products',
   'خصم خاص لفترة محدودة على منتجات لاين كوفي',
   'Shop now', 'تسوق الآن', '/products', true, 2)
) as v(message_en, message_ar, cta_label_en, cta_label_ar, cta_href, active, sort_order)
where not exists (select 1 from public.announcements);
