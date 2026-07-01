-- =====================================================================
-- Migration:  20260701120000_phase8_9_espresso_flavor_builders
-- Project:    Line Coffee V3
-- Phase:      8-9 (Make Your Espresso real manufacturing + Make Your Flavor cost-only)
-- Runs after: 20260701104031_phase6_7_packaging_promos_pricing
-- =====================================================================
--
-- PURPOSE
--   Make the two custom builders launch-real enough for checkout:
--     * Make Your Espresso becomes real manufacturing: a raw-bean catalog +
--       kg-based FIFO bean inventory (separate from finished-product lots),
--       reserved at Place Order and deducted at Delivered, exactly mirroring
--       the coffee product FIFO lifecycle already proven in Phase 5.
--     * Make Your Flavor stays cost-only at launch (Decision 4): a base/flavor
--       price+cost catalog for server-side pricing, no stock movement at all.
--   `create_checkout_order` accepts both builder item kinds, validates and
--   prices them server-side (never trusting client price/ratios/flavors), and
--   writes clear order_item snapshots. `update_admin_order_status` deducts the
--   same reserved bean lots at delivered (+ COGS snapshot) and releases them on
--   cancel, and rolls the (optional) flavor cost snapshot into orders.cogs_total
--   at delivered. Coffee FIFO, packaging, and promo pricing are untouched.
--
-- DEPENDENCY
--   20260625120000 (products/orders/order_items/is_admin()/set_updated_at(),
--     order_items.kind already allows 'custom_espresso'/'custom_flavor',
--     orders.type already allows 'custom_espresso'/'custom_flavor'/'mixed'),
--   20260627100000 (variant_size_to_kg, inventory_stock/movements pattern),
--   20260629120000 (Phase 1 create_checkout_order + update_admin_order_status),
--   20260630130000 (Phase 5 FIFO lot pattern this migration mirrors for beans:
--     inventory_lots.reserved_qty_kg / _allocate_lots_fifo / order_lot_allocations),
--   20260701104031 (Phase 6-7 checkout wrapper: preserves this migration's
--     _create_checkout_order_phase5 body under the same internal name and calls
--     it unchanged before applying promo + packaging).
--
-- DESTRUCTIVE?  NO. Purely additive: new catalog/stock/lot/allocation tables,
--   new admin RPCs, and CREATE OR REPLACE of the two checkout-lifecycle
--   functions (signatures/return shapes unchanged). No existing table, column,
--   or row is dropped or rewritten. A one-time seed inserts the existing static
--   bean/base/flavor catalog (mirroring the current `espressoBeans.ts` /
--   `flavorData.ts` builder data) plus a placeholder opening stock per bean so
--   checkout has real (small) reservable stock once applied.
--
-- IDEMPOTENCY  YES (best-effort). `create table if not exists`,
--   `create index if not exists`, `create or replace function/view`,
--   `drop policy/trigger if exists` + recreate, `on conflict do nothing` for
--   every seed insert. Re-running is safe.
--
-- STATUS  APPLIED 2026-07-01 after Codex review, validation, and an
--   owner-authorized `supabase db push`.
--
-- ROLLBACK / REPAIR  forward-fix preferred. Before any Phase-8/9 order exists:
--   restore `create_checkout_order`'s internal body and `update_admin_order_status`
--   to the Phase-6/7 versions (re-run migration 20260701104031's relevant
--   CREATE OR REPLACE blocks), then drop the new tables/functions listed in the
--   footer. After a real builder order exists, preserve ledgers and repair
--   forward instead.
--
-- SECURITY
--   * espresso_beans / flavor_bases / flavor_items: admin-only base tables
--     (RLS: admin SELECT; writes via SECURITY DEFINER upsert RPCs only). Each
--     has a cost-free security-invoker view (public_espresso_beans /
--     public_flavor_bases / public_flavor_items). The views are not granted to
--     client roles in this phase because the public builder pages keep reading
--     their existing static TS files (no public redesign).
--   * espresso_bean_stock / espresso_bean_lots / espresso_bean_movements /
--     order_espresso_bean_allocations: admin READ-ONLY (mirrors
--     inventory_lots / order_lot_allocations). All writes are SECURITY DEFINER
--     RPCs. Costs are never exposed to anon/customers; the public checkout
--     result stays cost-free.
--   * No service-role code anywhere in this migration.
--
-- NON-GOALS (explicitly NOT in this bundle — master plan stop conditions):
--   * NO Phase 10 order editing / payment events. NO Phase 11 returns/refunds.
--     NO Phase 14 accounting dashboard. NO broad admin UI rebuild — Espresso
--     Manager / Flavor Manager stay mock UI; this migration only adds the
--     backend + a typed data-layer foundation (admin-espresso.ts /
--     admin-flavor.ts), not wired into the existing mock pages.
--   * NO packaging for builder lines. `_apply_order_packaging` (Phase 6-7)
--     only counts `order_items.kind = 'product'`; custom_espresso/custom_flavor
--     lines are deliberately excluded so the existing packaging ledger is not
--     destabilized. Packaging for builders is deferred to a future phase.
--   * NO public builder-page rewiring to Supabase reads — the visual builders
--     keep reading their static TS catalogs (locked UX, no redesign); the DB
--     catalog exists purely as the checkout-time authority.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — espresso_beans (Phase 8 raw-bean catalog)
-- =====================================================================
-- Mirrors the existing static `src/features/website/make-your-espresso/data/
-- espressoBeans.ts` catalog so checkout has one authoritative, server-side
-- source for bean existence, price, and cost. The public builder UI is not
-- rewired to read this table (no visual/UX change); it is the validation and
-- pricing authority only.

create table if not exists public.espresso_beans (
  id                   uuid primary key default gen_random_uuid(),
  bean_key             text not null unique check (bean_key ~ '^[a-z0-9_-]{2,64}$'),
  name_en              text not null check (btrim(name_en) <> ''),
  name_ar              text not null check (btrim(name_ar) <> ''),
  family               text not null check (family in ('arabica', 'robusta')),
  origin_en            text,
  origin_ar            text,
  taste_hint_en        text,
  taste_hint_ar        text,
  -- Free-form taste metrics (body/crema/acidity/chocolate/sweetness/strength,
  -- 0-5 scale) mirroring EspressoMetrics in espressoBeans.ts. Display only.
  metrics              jsonb not null default '{}'::jsonb,
  sale_price_per_kg    numeric(12,2) not null check (sale_price_per_kg >= 0),
  -- PRIVATE cost basis used for opening/adjustment lots. Never expose to
  -- anon/customers. Null is not expected here (seed always sets it) but the
  -- column stays nullable to match the opening-lot "cost unknown -> 0" pattern
  -- used elsewhere (Phase 5 opening lots).
  purchase_cost_per_kg numeric(12,2) check (purchase_cost_per_kg is null or purchase_cost_per_kg >= 0),
  active               boolean not null default true,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz
);

comment on column public.espresso_beans.purchase_cost_per_kg is
  'PRIVATE cost basis for opening/adjustment bean lots. Never expose to anon/customers.';

create index if not exists espresso_beans_active_family_idx
  on public.espresso_beans (active, family, sort_order);

alter table public.espresso_beans enable row level security;

drop policy if exists espresso_beans_admin_read on public.espresso_beans;
create policy espresso_beans_admin_read on public.espresso_beans
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.espresso_beans from anon, authenticated;
grant select on table public.espresso_beans to authenticated;

drop trigger if exists trg_espresso_beans_updated_at on public.espresso_beans;
create trigger trg_espresso_beans_updated_at
  before update on public.espresso_beans
  for each row execute function public.set_updated_at();

create or replace view public.public_espresso_beans
with (security_invoker = true) as
  select
    id, bean_key, name_en, name_ar, family, origin_en, origin_ar,
    taste_hint_en, taste_hint_ar, metrics, sale_price_per_kg, sort_order
  from public.espresso_beans
  where active = true;

revoke all on public.public_espresso_beans from public, anon, authenticated;


-- =====================================================================
-- SECTION 2 — espresso bean stock + FIFO lots + movements + allocations
-- =====================================================================
-- Separate kg-based raw-material inventory dimension, independent of finished-
-- product `inventory_stock` / `inventory_lots`. Same proven shape as Phase 5:
-- an aggregate stock row (oversell guard) + FIFO lots (cost basis, reserved
-- portion) + a movement ledger + an order<->lot allocation ledger.

create table if not exists public.espresso_bean_stock (
  id                     uuid primary key default gen_random_uuid(),
  bean_id                uuid not null unique references public.espresso_beans (id) on delete cascade,
  available_kg           numeric(12,3) not null default 0 check (available_kg >= 0),
  reserved_kg            numeric(12,3) not null default 0 check (reserved_kg >= 0),
  low_stock_threshold_kg numeric(12,3) not null default 3 check (low_stock_threshold_kg >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz
);

create index if not exists espresso_bean_stock_low_idx
  on public.espresso_bean_stock (bean_id)
  where available_kg <= low_stock_threshold_kg;

create table if not exists public.espresso_bean_lots (
  id                uuid primary key default gen_random_uuid(),
  bean_id           uuid not null references public.espresso_beans (id) on delete restrict,
  received_qty_kg   numeric(12,3) not null check (received_qty_kg > 0),
  remaining_qty_kg  numeric(12,3) not null check (remaining_qty_kg >= 0),
  -- Portion of remaining_qty_kg reserved by open orders. available-in-lot =
  -- remaining_qty_kg - reserved_qty_kg (same convention as inventory_lots).
  reserved_qty_kg   numeric(12,3) not null default 0 check (reserved_qty_kg >= 0),
  unit_cost         numeric(12,2) not null check (unit_cost >= 0),
  received_date     date not null default current_date,
  status            text not null default 'open' check (status in ('open', 'closed')),
  source            text not null default 'adjustment' check (source in ('purchase', 'opening', 'adjustment')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  constraint espresso_bean_lots_remaining_lte_received_chk check (remaining_qty_kg <= received_qty_kg),
  constraint espresso_bean_lots_reserved_lte_remaining_chk check (reserved_qty_kg <= remaining_qty_kg)
);

create index if not exists espresso_bean_lots_fifo_idx
  on public.espresso_bean_lots (bean_id, received_date, created_at, id)
  where status = 'open';

comment on column public.espresso_bean_lots.reserved_qty_kg is
  'Portion of remaining_qty_kg reserved by open orders. Bumped on reserve, lowered on deduct (with remaining) or release. Mirrors inventory_lots.reserved_qty_kg (Phase 5).';

create table if not exists public.espresso_bean_movements (
  id            uuid primary key default gen_random_uuid(),
  bean_id       uuid not null references public.espresso_beans (id) on delete restrict,
  lot_id        uuid references public.espresso_bean_lots (id) on delete set null,
  order_id      uuid references public.orders (id) on delete set null,
  movement_type text not null check (movement_type in ('opening', 'reserve', 'deduct', 'release', 'adjustment')),
  -- Positive magnitude for reserve/deduct/release (movement_type carries the
  -- direction/meaning, matching inventory_movements). 'adjustment' rows may be
  -- signed (+ received, - manually removed), matching packaging_movements'
  -- quantity_delta convention.
  quantity_kg   numeric(12,3) not null,
  reason        text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists espresso_bean_movements_bean_idx on public.espresso_bean_movements (bean_id, created_at desc);
create index if not exists espresso_bean_movements_order_idx on public.espresso_bean_movements (order_id) where order_id is not null;
create index if not exists espresso_bean_movements_lot_idx on public.espresso_bean_movements (lot_id) where lot_id is not null;

create table if not exists public.order_espresso_bean_allocations (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  order_item_id    uuid references public.order_items (id) on delete set null,
  bean_id          uuid not null references public.espresso_beans (id) on delete restrict,
  lot_id           uuid not null references public.espresso_bean_lots (id) on delete restrict,
  reserved_qty_kg  numeric(12,3) not null check (reserved_qty_kg >= 0),
  deducted_qty_kg  numeric(12,3) not null default 0 check (deducted_qty_kg >= 0),
  -- Per-kg cost basis snapshot from the lot at allocation time (private).
  unit_cost        numeric(12,2) not null check (unit_cost >= 0),
  status           text not null default 'reserved' check (status in ('reserved', 'deducted', 'released')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  constraint order_espresso_bean_allocations_deducted_lte_reserved_chk check (deducted_qty_kg <= reserved_qty_kg)
);

create index if not exists order_espresso_bean_allocations_order_idx on public.order_espresso_bean_allocations (order_id);
create index if not exists order_espresso_bean_allocations_lot_idx on public.order_espresso_bean_allocations (lot_id);
create index if not exists order_espresso_bean_allocations_bean_idx on public.order_espresso_bean_allocations (bean_id);
create index if not exists order_espresso_bean_allocations_status_idx on public.order_espresso_bean_allocations (status);

alter table public.espresso_bean_stock enable row level security;
alter table public.espresso_bean_lots enable row level security;
alter table public.espresso_bean_movements enable row level security;
alter table public.order_espresso_bean_allocations enable row level security;

drop policy if exists espresso_bean_stock_admin_read on public.espresso_bean_stock;
create policy espresso_bean_stock_admin_read on public.espresso_bean_stock
  for select to authenticated using ((select public.is_admin()));

drop policy if exists espresso_bean_lots_admin_read on public.espresso_bean_lots;
create policy espresso_bean_lots_admin_read on public.espresso_bean_lots
  for select to authenticated using ((select public.is_admin()));

drop policy if exists espresso_bean_movements_admin_read on public.espresso_bean_movements;
create policy espresso_bean_movements_admin_read on public.espresso_bean_movements
  for select to authenticated using ((select public.is_admin()));

drop policy if exists order_espresso_bean_allocations_admin_read on public.order_espresso_bean_allocations;
create policy order_espresso_bean_allocations_admin_read on public.order_espresso_bean_allocations
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.espresso_bean_stock from anon, authenticated;
revoke all on table public.espresso_bean_lots from anon, authenticated;
revoke all on table public.espresso_bean_movements from anon, authenticated;
revoke all on table public.order_espresso_bean_allocations from anon, authenticated;

grant select on table public.espresso_bean_stock to authenticated;
grant select on table public.espresso_bean_lots to authenticated;
grant select on table public.espresso_bean_movements to authenticated;
grant select on table public.order_espresso_bean_allocations to authenticated;

drop trigger if exists trg_espresso_bean_stock_updated_at on public.espresso_bean_stock;
create trigger trg_espresso_bean_stock_updated_at
  before update on public.espresso_bean_stock
  for each row execute function public.set_updated_at();

drop trigger if exists trg_espresso_bean_lots_updated_at on public.espresso_bean_lots;
create trigger trg_espresso_bean_lots_updated_at
  before update on public.espresso_bean_lots
  for each row execute function public.set_updated_at();

drop trigger if exists trg_order_espresso_bean_allocations_updated_at on public.order_espresso_bean_allocations;
create trigger trg_order_espresso_bean_allocations_updated_at
  before update on public.order_espresso_bean_allocations
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECTION 3 — flavor_bases / flavor_items (Phase 9 cost-only catalog)
-- =====================================================================
-- Mirrors the existing static `src/features/website/make-your-flavor/data/
-- flavorData.ts` catalog (4 bases + flavors). Cost-only at launch (Decision 4):
-- no stock table, no movements, no lots — these two tables exist purely so
-- checkout can price a flavor-mix line server-side and snapshot a private cost
-- basis (accepted-risk: real per-item cost data does not exist yet, so
-- cost_per_kg defaults to null/0, matching the Phase-5 opening-lot precedent
-- of "cost basis = known cost, or 0 when unknown").

create table if not exists public.flavor_bases (
  id           uuid primary key default gen_random_uuid(),
  base_key     text not null unique check (base_key ~ '^[a-z0-9_-]{2,64}$'),
  name_en      text not null check (btrim(name_en) <> ''),
  name_ar      text not null check (btrim(name_ar) <> ''),
  hint_en      text,
  hint_ar      text,
  price_per_kg numeric(12,2) not null check (price_per_kg >= 0),
  -- PRIVATE cost basis. No real cost data exists yet (Decision 4 accepted
  -- risk) — defaults to null (unknown, treated as 0 in COGS snapshots).
  cost_per_kg  numeric(12,2) check (cost_per_kg is null or cost_per_kg >= 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create table if not exists public.flavor_items (
  id            uuid primary key default gen_random_uuid(),
  flavor_key    text not null unique check (flavor_key ~ '^[a-z0-9_-]{2,64}$'),
  name_en       text not null check (btrim(name_en) <> ''),
  name_ar       text not null check (btrim(name_ar) <> ''),
  hint_en       text,
  hint_ar       text,
  category      text not null check (category in ('chocolate', 'fruits', 'nuts', 'desserts', 'coffee-shisha')),
  add_on_per_kg numeric(12,2) not null check (add_on_per_kg >= 0),
  -- PRIVATE cost basis. Same accepted-risk default as flavor_bases.cost_per_kg.
  cost_per_kg   numeric(12,2) check (cost_per_kg is null or cost_per_kg >= 0),
  metrics       jsonb not null default '{}'::jsonb,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

comment on column public.flavor_bases.cost_per_kg is
  'PRIVATE cost basis. Null/unknown at launch (Decision 4 accepted risk) — treated as 0 in cost snapshots.';
comment on column public.flavor_items.cost_per_kg is
  'PRIVATE cost basis. Null/unknown at launch (Decision 4 accepted risk) — treated as 0 in cost snapshots.';

create index if not exists flavor_bases_active_idx on public.flavor_bases (active, sort_order);
create index if not exists flavor_items_active_category_idx on public.flavor_items (active, category, sort_order);

alter table public.flavor_bases enable row level security;
alter table public.flavor_items enable row level security;

drop policy if exists flavor_bases_admin_read on public.flavor_bases;
create policy flavor_bases_admin_read on public.flavor_bases
  for select to authenticated using ((select public.is_admin()));

drop policy if exists flavor_items_admin_read on public.flavor_items;
create policy flavor_items_admin_read on public.flavor_items
  for select to authenticated using ((select public.is_admin()));

revoke all on table public.flavor_bases from anon, authenticated;
revoke all on table public.flavor_items from anon, authenticated;

grant select on table public.flavor_bases to authenticated;
grant select on table public.flavor_items to authenticated;

drop trigger if exists trg_flavor_bases_updated_at on public.flavor_bases;
create trigger trg_flavor_bases_updated_at
  before update on public.flavor_bases
  for each row execute function public.set_updated_at();

drop trigger if exists trg_flavor_items_updated_at on public.flavor_items;
create trigger trg_flavor_items_updated_at
  before update on public.flavor_items
  for each row execute function public.set_updated_at();

create or replace view public.public_flavor_bases
with (security_invoker = true) as
  select id, base_key, name_en, name_ar, hint_en, hint_ar, price_per_kg, sort_order
  from public.flavor_bases
  where active = true;

create or replace view public.public_flavor_items
with (security_invoker = true) as
  select id, flavor_key, name_en, name_ar, hint_en, hint_ar, category, add_on_per_kg, metrics, sort_order
  from public.flavor_items
  where active = true;

revoke all on public.public_flavor_bases from public, anon, authenticated;
revoke all on public.public_flavor_items from public, anon, authenticated;


-- =====================================================================
-- SECTION 4 — Seed: espresso bean catalog (27 beans, mirrors espressoBeans.ts)
-- =====================================================================

insert into public.espresso_beans (
  bean_key, name_en, name_ar, family, origin_en, origin_ar,
  taste_hint_en, taste_hint_ar, metrics, sale_price_per_kg, purchase_cost_per_kg, sort_order
) values
  ('indian-arabica', 'Indian Arabica', 'أرابيكا هندية', 'arabica', 'India', 'الهند',
   'Nutty base with steady body.', 'قاعدة مكسرات بقوام ثابت.',
   '{"body":4.0,"crema":3.1,"acidity":2.6,"chocolate":3.4,"sweetness":3.2,"strength":3.0}'::jsonb, 720, 599, 10),
  ('brazilian-arabica', 'Brazilian Arabica', 'أرابيكا برازيلية', 'arabica', 'Brazil', 'البرازيل',
   'Soft chocolate and low acidity.', 'شوكولاتة ناعمة وحموضة منخفضة.',
   '{"body":4.1,"crema":3.3,"acidity":2.1,"chocolate":4.4,"sweetness":3.8,"strength":2.8}'::jsonb, 580, 482, 20),
  ('colombian-arabica', 'Colombian Arabica', 'أرابيكا كولومبية', 'arabica', 'Colombia', 'كولومبيا',
   'Caramel balance with gentle fruit.', 'توازن كراميل مع فاكهة هادئة.',
   '{"body":3.7,"crema":3.0,"acidity":3.2,"chocolate":3.5,"sweetness":4.0,"strength":3.0}'::jsonb, 850, 705, 30),
  ('ethiopian-arabica', 'Ethiopian Arabica', 'أرابيكا إثيوبية', 'arabica', 'Ethiopia', 'إثيوبيا',
   'Floral aroma and bright fruit.', 'عطر زهري وفاكهة مشرقة.',
   '{"body":2.8,"crema":2.4,"acidity":4.6,"chocolate":2.2,"sweetness":3.9,"strength":2.7}'::jsonb, 585, 487, 40),
  ('indian-plantation', 'Indian Plantation', 'مزارع هندية', 'arabica', 'India', 'الهند',
   'Polished body with warm depth.', 'قوام مصقول بعمق دافئ.',
   '{"body":4.2,"crema":3.4,"acidity":2.4,"chocolate":3.6,"sweetness":3.3,"strength":3.3}'::jsonb, 820, 682, 50),
  ('guatemala', 'Guatemala', 'غواتيمالا', 'arabica', 'Guatemala', 'غواتيمالا',
   'Dark chocolate with warm sweetness.', 'شوكولاتة داكنة بحلاوة دافئة.',
   '{"body":3.9,"crema":3.2,"acidity":3.1,"chocolate":4.2,"sweetness":3.7,"strength":3.2}'::jsonb, 1000, 835, 60),
  ('yemeni', 'Yemeni', 'يمنية', 'arabica', 'Yemen', 'اليمن',
   'Spiced depth and complex cocoa.', 'عمق متبل وكاكاو معقد.',
   '{"body":4.3,"crema":3.1,"acidity":3.4,"chocolate":4.5,"sweetness":4.0,"strength":3.7}'::jsonb, 1425, 1187, 70),
  ('peru', 'Peru', 'بيرو', 'arabica', 'Peru', 'بيرو',
   'Clean cup with soft sweetness.', 'كوب نظيف بحلاوة ناعمة.',
   '{"body":3.5,"crema":2.8,"acidity":3.0,"chocolate":3.3,"sweetness":3.9,"strength":2.8}'::jsonb, 1000, 835, 80),
  ('costa-rica', 'Costa Rica', 'كوستاريكا', 'arabica', 'Costa Rica', 'كوستاريكا',
   'Lively sweetness and elegant acidity.', 'حلاوة حيوية وحموضة أنيقة.',
   '{"body":3.4,"crema":2.8,"acidity":3.8,"chocolate":3.0,"sweetness":4.1,"strength":2.9}'::jsonb, 1000, 835, 90),
  ('tanzanian-arabica', 'Tanzanian Arabica', 'أرابيكا تنزانية', 'arabica', 'Tanzania', 'تنزانيا',
   'Bright fruit with a lighter body.', 'فاكهة مشرقة بقوام أخف.',
   '{"body":2.9,"crema":2.3,"acidity":4.4,"chocolate":2.3,"sweetness":3.5,"strength":2.8}'::jsonb, 435, 360, 100),
  ('kenyan-arabica', 'Kenyan Arabica', 'أرابيكا كينية', 'arabica', 'Kenya', 'كينيا',
   'Sharp brightness and red fruit.', 'إشراق واضح ولمسة فاكهة حمراء.',
   '{"body":3.0,"crema":2.2,"acidity":4.7,"chocolate":2.1,"sweetness":3.7,"strength":3.0}'::jsonb, 420, 350, 110),
  ('nicaragua-arabica', 'Nicaragua Arabica', 'أرابيكا نيكاراغوية', 'arabica', 'Nicaragua', 'نيكاراغوا',
   'Brown sugar, nuts, and balance.', 'سكر بني ومكسرات وتوازن.',
   '{"body":3.6,"crema":3.0,"acidity":3.2,"chocolate":3.7,"sweetness":4.0,"strength":3.0}'::jsonb, 760, 630, 120),
  ('indian-washed-arabica', 'Indian Washed Arabica', 'أرابيكا هندية مغسولة', 'arabica', 'India', 'الهند',
   'Clean nutty cup with low bitterness.', 'كوب نظيف بمكسرات ومرارة منخفضة.',
   '{"body":3.7,"crema":3.0,"acidity":2.7,"chocolate":3.3,"sweetness":3.4,"strength":3.0}'::jsonb, 615, 510, 130),
  ('brazil-17-18', 'Brazil 17-18', 'البرازيل 17-18', 'arabica', 'Brazil', 'البرازيل',
   'Daily chocolate body with calm acidity.', 'قوام شوكولاتة يومي بحموضة هادئة.',
   '{"body":4.0,"crema":3.3,"acidity":2.0,"chocolate":4.2,"sweetness":3.6,"strength":2.8}'::jsonb, 460, 385, 140),
  ('ethiopia-lekempti', 'Ethiopia Lekempti', 'إثيوبيا ليكمبتي', 'arabica', 'Ethiopia', 'إثيوبيا',
   'Floral brightness with a clean finish.', 'إشراق زهري ونهاية نظيفة.',
   '{"body":2.9,"crema":2.3,"acidity":4.5,"chocolate":2.3,"sweetness":3.8,"strength":2.8}'::jsonb, 470, 390, 150),
  ('santos-fine-cup', 'Santos Fine Cup', 'سانتوس فاين كب', 'arabica', 'Brazil', 'البرازيل',
   'Chocolate, nuts, and a rounded base.', 'شوكولاتة ومكسرات وقاعدة مستديرة.',
   '{"body":4.2,"crema":3.5,"acidity":2.0,"chocolate":4.3,"sweetness":3.7,"strength":2.9}'::jsonb, 600, 500, 160),
  ('colombian-18', 'Colombian 18', 'كولومبية 18', 'arabica', 'Colombia', 'كولومبيا',
   'Caramel sweetness with elegant body.', 'حلاوة كراميل بقوام أنيق.',
   '{"body":3.8,"crema":3.1,"acidity":3.1,"chocolate":3.6,"sweetness":4.0,"strength":3.1}'::jsonb, 670, 560, 170),
  ('indonesian', 'Indonesian', 'إندونيسي', 'robusta', 'Indonesia', 'إندونيسيا',
   'Heavy crema and earthy body.', 'كريما ثقيلة وقوام أرضي.',
   '{"body":4.7,"crema":4.5,"acidity":1.5,"chocolate":3.4,"sweetness":2.5,"strength":4.5}'::jsonb, 410, 340, 180),
  ('indonesian-xl', 'Indonesian XL', 'إندونيسي XL', 'robusta', 'Indonesia', 'إندونيسيا',
   'Extra body, crema, and strength.', 'قوام وكريما وقوة أعلى.',
   '{"body":4.9,"crema":4.7,"acidity":1.3,"chocolate":3.3,"sweetness":2.3,"strength":4.8}'::jsonb, 415, 346, 190),
  ('indian-robusta', 'Indian Robusta', 'هندي', 'robusta', 'India', 'الهند',
   'Classic robusta crema support.', 'دعم كلاسيكي للكريما من الروبوستا.',
   '{"body":4.5,"crema":4.5,"acidity":1.7,"chocolate":3.5,"sweetness":2.7,"strength":4.4}'::jsonb, 450, 376, 200),
  ('vietnamese', 'Vietnamese', 'فيتنامي', 'robusta', 'Vietnam', 'فيتنام',
   'High caffeine and strong crema.', 'كافيين عال وكريما قوية.',
   '{"body":4.6,"crema":4.8,"acidity":1.2,"chocolate":3.0,"sweetness":2.0,"strength":5.0}'::jsonb, 415, 346, 210),
  ('vietnamese-washed', 'Vietnamese Washed', 'فيتنامي مغسول', 'robusta', 'Vietnam', 'فيتنام',
   'Cleaner robusta strength.', 'قوة روبوستا أنظف.',
   '{"body":4.4,"crema":4.6,"acidity":1.5,"chocolate":3.1,"sweetness":2.3,"strength":4.7}'::jsonb, 450, 376, 220),
  ('indonesian-large', 'Indonesian Large', 'إندونيسي كبير', 'robusta', 'Indonesia', 'إندونيسيا',
   'Broad body with a budget edge.', 'قوام عريض بسعر هادئ.',
   '{"body":4.7,"crema":4.6,"acidity":1.4,"chocolate":3.2,"sweetness":2.2,"strength":4.6}'::jsonb, 325, 270, 230),
  ('indonesian-medium', 'Indonesian Medium', 'إندونيسي وسط', 'robusta', 'Indonesia', 'إندونيسيا',
   'Affordable crema with steady body.', 'كريما اقتصادية وقوام ثابت.',
   '{"body":4.3,"crema":4.3,"acidity":1.6,"chocolate":3.1,"sweetness":2.4,"strength":4.2}'::jsonb, 315, 260, 240),
  ('ugandan-18', 'Ugandan 18', 'أوغندي 18', 'robusta', 'Uganda', 'أوغندا',
   'Dark cocoa with clean strength.', 'كاكاو داكن وقوة نظيفة.',
   '{"body":4.4,"crema":4.4,"acidity":1.8,"chocolate":3.6,"sweetness":2.7,"strength":4.4}'::jsonb, 340, 280, 250),
  ('indian-robusta-aa', 'Indian Robusta AA', 'روبوستا هندي AA', 'robusta', 'India', 'الهند',
   'Bold crema with cocoa support.', 'كريما جريئة بدعم كاكاو.',
   '{"body":4.6,"crema":4.7,"acidity":1.6,"chocolate":3.7,"sweetness":2.7,"strength":4.6}'::jsonb, 350, 290, 260),
  ('vietnamese-clean', 'Vietnamese Clean', 'فيتنامي Clean', 'robusta', 'Vietnam', 'فيتنام',
   'Clean strength and thick crema.', 'قوة نظيفة وكريما كثيفة.',
   '{"body":4.3,"crema":4.5,"acidity":1.4,"chocolate":3.0,"sweetness":2.2,"strength":4.5}'::jsonb, 320, 265, 270)
on conflict (bean_key) do nothing;


-- =====================================================================
-- SECTION 5 — Seed: espresso bean opening stock (placeholder, documented)
-- =====================================================================
-- 20kg opening stock per bean so checkout has real reservable stock once
-- applied. This is a launch PLACEHOLDER, not a real purchasing figure — an
-- admin restocks via `adjust_espresso_bean_stock` (Section 7) once real
-- purchasing volumes are known. Mirrors the Phase-1 "seed 100kg per product"
-- precedent and the Phase-5 opening-lot pattern (cost = purchase_cost_per_kg,
-- sentinel received_date so opening stock is consumed first by FIFO).

with seeded as (
  insert into public.espresso_bean_stock (bean_id, available_kg, reserved_kg, low_stock_threshold_kg)
  select id, 20, 0, 3
  from public.espresso_beans
  on conflict (bean_id) do nothing
  returning bean_id
),
opening_lots as (
  insert into public.espresso_bean_lots (
    bean_id, received_qty_kg, remaining_qty_kg, reserved_qty_kg,
    unit_cost, received_date, status, source
  )
  select b.id, 20, 20, 0, coalesce(b.purchase_cost_per_kg, 0), date '2020-01-01', 'open', 'opening'
  from public.espresso_beans b
  join seeded s on s.bean_id = b.id
  returning bean_id, id
)
insert into public.espresso_bean_movements (bean_id, lot_id, movement_type, quantity_kg, reason, metadata)
select bean_id, id, 'opening', 20,
       'Launch opening stock (20kg placeholder)',
       jsonb_build_object('seeded_by', 'migration_20260701120000')
from opening_lots;


-- =====================================================================
-- SECTION 6 — Seed: flavor bases (4) + flavor items (29), mirrors flavorData.ts
-- =====================================================================

insert into public.flavor_bases (base_key, name_en, name_ar, hint_en, hint_ar, price_per_kg, sort_order) values
  ('turkish', 'Turkish Coffee', 'قهوة تركي', 'Bold, dark roast tradition', 'تحميص غامق، أصيل وقوي', 400, 10),
  ('cappuccino', 'Cappuccino', 'كابتشينو', 'Creamy, smooth, premium', 'كريمي، ناعم، فاخر', 500, 20),
  ('coffee-mix', 'Coffee Mix', 'كوفي ميكس', 'Balanced, versatile blend', 'متوازن، متعدد الاستخدامات', 450, 30),
  ('hot-chocolate', 'Hot Chocolate', 'هوت شوكليت', 'Rich cocoa, velvety base', 'كاكاو غني، قاعدة مخملية', 450, 40)
on conflict (base_key) do nothing;

insert into public.flavor_items (
  flavor_key, name_en, name_ar, hint_en, hint_ar, category, add_on_per_kg, metrics, sort_order
) values
  ('chocolate-pieces', 'Chocolate Pieces', 'شيكولاتة قطع',
   'Dark cocoa with a rich, slightly bitter depth', 'كاكاو غامق بعمق غني وخفيف المرارة', 'chocolate', 85,
   '{"sweetness":3,"creaminess":2,"chocolate":5,"fruitiness":0,"nutty":1,"intensity":3}'::jsonb, 10),
  ('chocolate', 'Chocolate', 'شيكولاتة',
   'Classic cocoa warmth, smooth and full', 'دفء الكاكاو الكلاسيكي، ناعم وكامل', 'chocolate', 70,
   '{"sweetness":3,"creaminess":2,"chocolate":5,"fruitiness":0,"nutty":0,"intensity":3}'::jsonb, 20),
  ('nutella', 'Nutella', 'نوتيلا',
   'Hazelnut chocolate, creamy and indulgent', 'شوكولاتة بالبندق، كريمية ومدللة', 'chocolate', 70,
   '{"sweetness":4,"creaminess":4,"chocolate":4,"fruitiness":0,"nutty":3,"intensity":3}'::jsonb, 30),
  ('strawberry', 'Strawberry', 'فراولة',
   'Fresh berry sweetness, lightly tart', 'حلاوة الفراولة الطازجة، خفيفة الحموضة', 'fruits', 70,
   '{"sweetness":4,"creaminess":1,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":3}'::jsonb, 40),
  ('banana', 'Banana', 'موز',
   'Soft tropical sweetness, smooth finish', 'حلاوة استوائية ناعمة، نهاية سلسة', 'fruits', 70,
   '{"sweetness":4,"creaminess":2,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":2}'::jsonb, 50),
  ('mango', 'Mango', 'مانجو',
   'Vibrant tropical fruit, rich and juicy', 'فاكهة استوائية حيوية، غنية وعصيرية', 'fruits', 70,
   '{"sweetness":4,"creaminess":1,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":3}'::jsonb, 60),
  ('peach', 'Peach', 'خوخ',
   'Delicate stone fruit, mild and fragrant', 'فاكهة حجرية رقيقة، خفيفة وعطرية', 'fruits', 70,
   '{"sweetness":3,"creaminess":1,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":2}'::jsonb, 70),
  ('blueberry', 'Blueberry', 'توت أزرق',
   'Wild berries, deep colour with gentle tartness', 'توت بري، لون عميق وحموضة خفيفة', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":3}'::jsonb, 80),
  ('cherry', 'Cherry', 'كرز',
   'Dark cherry, sweet with a subtle tang', 'كرز داكن، حلو بلمسة حامضة خفيفة', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":3}'::jsonb, 90),
  ('apple', 'Apple', 'تفاح',
   'Crisp orchard apple, clean and refreshing', 'تفاح منعش، نظيف ومنتعش', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":2}'::jsonb, 100),
  ('grape', 'Grape', 'عنب',
   'Ripe vineyard grape, round and fruity', 'عنب ناضج، دائري وفواكهي', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":2}'::jsonb, 110),
  ('watermelon', 'Watermelon', 'بطيخ',
   'Summer freshness, light and juicy', 'انتعاش صيفي، خفيف وعصيري', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":2}'::jsonb, 120),
  ('guava', 'Guava', 'جوافة',
   'Tropical guava, fragrant and exotic', 'جوافة استوائية، عطرية وغريبة', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":2}'::jsonb, 130),
  ('pineapple', 'Pineapple', 'أناناس',
   'Bright citrus tropics, sharp and sweet', 'حمضيات استوائية حادة وحلوة', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":5,"nutty":0,"intensity":3}'::jsonb, 140),
  ('orange', 'Orange', 'برتقال',
   'Citrus zest, bright and lightly tangy', 'نكهة حمضيات مشرقة وخفيفة', 'fruits', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":4,"nutty":0,"intensity":3}'::jsonb, 150),
  ('hazelnut-pieces', 'Hazelnut Pieces', 'بندق قطع',
   'Roasted hazelnut with warm toasty depth', 'بندق محمص بعمق دافئ', 'nuts', 85,
   '{"sweetness":2,"creaminess":2,"chocolate":1,"fruitiness":0,"nutty":5,"intensity":3}'::jsonb, 160),
  ('almond', 'Almond', 'لوز',
   'Mild roasted almond, clean and dry', 'لوز محمص خفيف، نظيف وجاف', 'nuts', 70,
   '{"sweetness":2,"creaminess":1,"chocolate":0,"fruitiness":0,"nutty":5,"intensity":2}'::jsonb, 170),
  ('pistachio', 'Pistachio', 'فستق',
   'Lightly sweet nut with subtle earthy depth', 'مكسر خفيف الحلاوة بعمق ترابي', 'nuts', 70,
   '{"sweetness":2,"creaminess":2,"chocolate":0,"fruitiness":0,"nutty":5,"intensity":2}'::jsonb, 180),
  ('hazelnut', 'Hazelnut', 'بندق',
   'Smooth roasted hazelnut, rich and nutty', 'بندق محمص ناعم، غني بنكهة المكسرات', 'nuts', 70,
   '{"sweetness":2,"creaminess":2,"chocolate":1,"fruitiness":0,"nutty":5,"intensity":2}'::jsonb, 190),
  ('coconut', 'Coconut', 'جوز الهند',
   'Creamy tropical nut, sweet and velvety', 'مكسر استوائي كريمي، حلو ومخملي', 'nuts', 70,
   '{"sweetness":3,"creaminess":4,"chocolate":0,"fruitiness":2,"nutty":3,"intensity":2}'::jsonb, 200),
  ('oreo', 'Oreo', 'أوريو',
   'Dark cocoa cookie with a creamy centre', 'بسكويت كاكاو غامق بمركز كريمي', 'desserts', 70,
   '{"sweetness":4,"creaminess":3,"chocolate":3,"fruitiness":0,"nutty":0,"intensity":2}'::jsonb, 210),
  ('lotus', 'Lotus', 'لوتس',
   'Caramelised biscuit, warm and lightly spiced', 'بسكويت كراميل، دافئ ومتبل بخفة', 'desserts', 70,
   '{"sweetness":5,"creaminess":4,"chocolate":1,"fruitiness":0,"nutty":2,"intensity":3}'::jsonb, 220),
  ('cinnabon', 'Cinnabon', 'سينابون',
   'Warm cinnamon roll, sweet with spiced intensity', 'لفة قرفة دافئة، حلوة وذات كثافة متبلة', 'desserts', 70,
   '{"sweetness":5,"creaminess":3,"chocolate":0,"fruitiness":0,"nutty":0,"intensity":4}'::jsonb, 230),
  ('caramel', 'Caramel', 'كراميل',
   'Buttery caramel, golden and silky smooth', 'كراميل زبداني ذهبي وحريري', 'desserts', 70,
   '{"sweetness":5,"creaminess":4,"chocolate":1,"fruitiness":0,"nutty":1,"intensity":3}'::jsonb, 240),
  ('vanilla', 'Vanilla', 'فانيلا',
   'Soft vanilla cream, delicate and pure', 'كريمة فانيلا ناعمة، رقيقة ونقية', 'desserts', 70,
   '{"sweetness":3,"creaminess":5,"chocolate":0,"fruitiness":1,"nutty":0,"intensity":2}'::jsonb, 250),
  ('mocha', 'Mocha', 'موكا',
   'Espresso meets chocolate, bold and deep', 'إسبريسو وشوكولاتة، جريء وعميق', 'coffee-shisha', 70,
   '{"sweetness":2,"creaminess":2,"chocolate":3,"fruitiness":0,"nutty":0,"intensity":4}'::jsonb, 260),
  ('apple-shisha', 'Apple Shisha', 'شيشة تفاح',
   'Sweet apple smoke, aromatic and intense', 'دخان تفاح حلو، عطري ومكثف', 'coffee-shisha', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":3,"nutty":0,"intensity":5}'::jsonb, 270),
  ('grape-shisha', 'Grape Shisha', 'شيشة عنب',
   'Dark grape smoke, rich and full-bodied', 'دخان عنب داكن، غني وممتلئ القوام', 'coffee-shisha', 70,
   '{"sweetness":3,"creaminess":0,"chocolate":0,"fruitiness":3,"nutty":0,"intensity":5}'::jsonb, 280),
  ('hot-cider', 'Hot Cider', 'هوت سيدر',
   'Spiced apple cider, warm and aromatic', 'عصير تفاح متبل، دافئ وعطري', 'coffee-shisha', 70,
   '{"sweetness":3,"creaminess":1,"chocolate":0,"fruitiness":2,"nutty":0,"intensity":4}'::jsonb, 290)
on conflict (flavor_key) do nothing;


-- =====================================================================
-- SECTION 7 — Admin RPCs: espresso bean catalog + stock adjustment
-- =====================================================================
-- Backend/data-layer foundation only (no admin UI wiring in this bundle —
-- Espresso Manager stays mock). Mirrors upsert_packaging_item /
-- adjust_packaging_stock (Phase 6-7) exactly.

create or replace function public.upsert_espresso_bean(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id             uuid;
  v_bean_key       text := lower(btrim(coalesce(p_payload->>'bean_key', '')));
  v_name_en        text := btrim(coalesce(p_payload->>'name_en', ''));
  v_name_ar        text := btrim(coalesce(p_payload->>'name_ar', ''));
  v_family         text := lower(btrim(coalesce(p_payload->>'family', '')));
  v_origin_en      text := nullif(btrim(coalesce(p_payload->>'origin_en', '')), '');
  v_origin_ar      text := nullif(btrim(coalesce(p_payload->>'origin_ar', '')), '');
  v_taste_en       text := nullif(btrim(coalesce(p_payload->>'taste_hint_en', '')), '');
  v_taste_ar       text := nullif(btrim(coalesce(p_payload->>'taste_hint_ar', '')), '');
  v_metrics        jsonb := coalesce(p_payload->'metrics', '{}'::jsonb);
  v_sale_price     numeric(12,2);
  v_purchase_cost  numeric(12,2);
  v_active         boolean;
  v_sort_order     integer;
  v_row            public.espresso_beans%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid espresso bean payload.' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_payload->>'id', '')::uuid;
    v_sale_price := nullif(p_payload->>'sale_price_per_kg', '')::numeric(12,2);
    v_purchase_cost := nullif(p_payload->>'purchase_cost_per_kg', '')::numeric(12,2);
    v_active := coalesce(nullif(p_payload->>'active', '')::boolean, true);
    v_sort_order := coalesce(nullif(p_payload->>'sort_order', '')::integer, 0);
  exception when others then
    raise exception 'Invalid espresso bean values.' using errcode = '22023';
  end;

  if v_bean_key !~ '^[a-z0-9_-]{2,64}$'
     or v_name_en = '' or v_name_ar = ''
     or v_family not in ('arabica', 'robusta')
     or v_sale_price is null or v_sale_price < 0
     or (v_purchase_cost is not null and v_purchase_cost < 0)
     or length(v_name_en) > 160 or length(v_name_ar) > 160 then
    raise exception 'Invalid espresso bean values.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.espresso_beans (
      bean_key, name_en, name_ar, family, origin_en, origin_ar,
      taste_hint_en, taste_hint_ar, metrics, sale_price_per_kg,
      purchase_cost_per_kg, active, sort_order
    ) values (
      v_bean_key, v_name_en, v_name_ar, v_family, v_origin_en, v_origin_ar,
      v_taste_en, v_taste_ar, v_metrics, v_sale_price,
      v_purchase_cost, v_active, v_sort_order
    )
    returning * into v_row;
  else
    update public.espresso_beans set
      bean_key = v_bean_key,
      name_en = v_name_en,
      name_ar = v_name_ar,
      family = v_family,
      origin_en = v_origin_en,
      origin_ar = v_origin_ar,
      taste_hint_en = v_taste_en,
      taste_hint_ar = v_taste_ar,
      metrics = v_metrics,
      sale_price_per_kg = v_sale_price,
      purchase_cost_per_kg = v_purchase_cost,
      active = v_active,
      sort_order = v_sort_order
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Espresso bean not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
exception
  when unique_violation then
    raise exception 'Bean key is already in use.' using errcode = '23505';
end;
$$;

revoke all on function public.upsert_espresso_bean(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_espresso_bean(jsonb) to authenticated;

create or replace function public.adjust_espresso_bean_stock(
  p_bean_id uuid,
  p_quantity_delta_kg numeric,
  p_unit_cost numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bean   public.espresso_beans%rowtype;
  v_stock  public.espresso_bean_stock%rowtype;
  v_cost   numeric(12,2);
  v_lot_id uuid;
  v_actor  text := auth.uid()::text;
  v_left   numeric(12,3);
  v_take   numeric(12,3);
  r        record;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_quantity_delta_kg is null or p_quantity_delta_kg = 0 then
    raise exception 'Stock adjustment must be a non-zero quantity.' using errcode = '22023';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Adjustment note is too long.' using errcode = '22023';
  end if;

  select * into v_bean from public.espresso_beans where id = p_bean_id for update;
  if not found then
    raise exception 'Espresso bean not found.' using errcode = 'P0002';
  end if;

  insert into public.espresso_bean_stock (bean_id, available_kg, reserved_kg)
  values (p_bean_id, 0, 0)
  on conflict (bean_id) do nothing;

  select * into v_stock from public.espresso_bean_stock where bean_id = p_bean_id for update;

  if p_quantity_delta_kg > 0 then
    v_cost := round(coalesce(p_unit_cost, v_bean.purchase_cost_per_kg, 0), 2);
    if v_cost < 0 then
      raise exception 'Unit cost cannot be negative.' using errcode = '22023';
    end if;

    insert into public.espresso_bean_lots (
      bean_id, received_qty_kg, remaining_qty_kg, reserved_qty_kg,
      unit_cost, received_date, status, source, notes
    ) values (
      p_bean_id, p_quantity_delta_kg, p_quantity_delta_kg, 0,
      v_cost, current_date, 'open', 'adjustment', nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_lot_id;

    update public.espresso_bean_stock
      set available_kg = available_kg + p_quantity_delta_kg
    where bean_id = p_bean_id;

    insert into public.espresso_bean_movements (
      bean_id, lot_id, movement_type, quantity_kg, reason, metadata
    ) values (
      p_bean_id, v_lot_id, 'adjustment', p_quantity_delta_kg,
      nullif(btrim(coalesce(p_note, '')), ''),
      jsonb_build_object('changed_by', v_actor, 'unit_cost', v_cost)
    );
  else
    v_left := round(abs(p_quantity_delta_kg), 3);
    if v_stock.available_kg < v_left then
      raise exception 'Adjustment exceeds available bean stock.' using errcode = '22023';
    end if;

    for r in
      select id, remaining_qty_kg, reserved_qty_kg, unit_cost
      from public.espresso_bean_lots
      where bean_id = p_bean_id
        and status = 'open'
        and (remaining_qty_kg - reserved_qty_kg) > 0
      order by received_date asc, created_at asc, id asc
      for update
    loop
      exit when v_left <= 0;
      v_take := least(r.remaining_qty_kg - r.reserved_qty_kg, v_left);
      if v_take <= 0 then
        continue;
      end if;

      update public.espresso_bean_lots
        set remaining_qty_kg = remaining_qty_kg - v_take,
            status = case when remaining_qty_kg - v_take <= 0 then 'closed' else status end
      where id = r.id;

      insert into public.espresso_bean_movements (
        bean_id, lot_id, movement_type, quantity_kg, reason, metadata
      ) values (
        p_bean_id, r.id, 'adjustment', -v_take,
        nullif(btrim(coalesce(p_note, '')), ''),
        jsonb_build_object('changed_by', v_actor, 'unit_cost', r.unit_cost)
      );

      v_left := round(v_left - v_take, 3);
    end loop;

    if v_left > 0.0005 then
      raise exception 'Bean lot balance is inconsistent.' using errcode = '23514';
    end if;

    update public.espresso_bean_stock
      set available_kg = available_kg - abs(p_quantity_delta_kg)
    where bean_id = p_bean_id;
  end if;

  select * into v_stock from public.espresso_bean_stock where bean_id = p_bean_id;

  return jsonb_build_object(
    'bean_id', p_bean_id,
    'available_kg', v_stock.available_kg,
    'reserved_kg', v_stock.reserved_kg,
    'quantity_delta_kg', p_quantity_delta_kg
  );
end;
$$;

revoke all on function public.adjust_espresso_bean_stock(uuid, numeric, numeric, text)
  from public, anon, authenticated;
grant execute on function public.adjust_espresso_bean_stock(uuid, numeric, numeric, text) to authenticated;


-- =====================================================================
-- SECTION 8 — Admin RPCs: flavor base/item catalog
-- =====================================================================

create or replace function public.upsert_flavor_base(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id           uuid;
  v_base_key     text := lower(btrim(coalesce(p_payload->>'base_key', '')));
  v_name_en      text := btrim(coalesce(p_payload->>'name_en', ''));
  v_name_ar      text := btrim(coalesce(p_payload->>'name_ar', ''));
  v_hint_en      text := nullif(btrim(coalesce(p_payload->>'hint_en', '')), '');
  v_hint_ar      text := nullif(btrim(coalesce(p_payload->>'hint_ar', '')), '');
  v_price        numeric(12,2);
  v_cost         numeric(12,2);
  v_active       boolean;
  v_sort_order   integer;
  v_row          public.flavor_bases%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid flavor base payload.' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_payload->>'id', '')::uuid;
    v_price := nullif(p_payload->>'price_per_kg', '')::numeric(12,2);
    v_cost := nullif(p_payload->>'cost_per_kg', '')::numeric(12,2);
    v_active := coalesce(nullif(p_payload->>'active', '')::boolean, true);
    v_sort_order := coalesce(nullif(p_payload->>'sort_order', '')::integer, 0);
  exception when others then
    raise exception 'Invalid flavor base values.' using errcode = '22023';
  end;

  if v_base_key !~ '^[a-z0-9_-]{2,64}$'
     or v_name_en = '' or v_name_ar = ''
     or v_price is null or v_price < 0
     or (v_cost is not null and v_cost < 0)
     or length(v_name_en) > 160 or length(v_name_ar) > 160 then
    raise exception 'Invalid flavor base values.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.flavor_bases (
      base_key, name_en, name_ar, hint_en, hint_ar, price_per_kg, cost_per_kg, active, sort_order
    ) values (
      v_base_key, v_name_en, v_name_ar, v_hint_en, v_hint_ar, v_price, v_cost, v_active, v_sort_order
    )
    returning * into v_row;
  else
    update public.flavor_bases set
      base_key = v_base_key, name_en = v_name_en, name_ar = v_name_ar,
      hint_en = v_hint_en, hint_ar = v_hint_ar, price_per_kg = v_price,
      cost_per_kg = v_cost, active = v_active, sort_order = v_sort_order
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Flavor base not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
exception
  when unique_violation then
    raise exception 'Base key is already in use.' using errcode = '23505';
end;
$$;

create or replace function public.upsert_flavor_item(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id           uuid;
  v_flavor_key   text := lower(btrim(coalesce(p_payload->>'flavor_key', '')));
  v_name_en      text := btrim(coalesce(p_payload->>'name_en', ''));
  v_name_ar      text := btrim(coalesce(p_payload->>'name_ar', ''));
  v_hint_en      text := nullif(btrim(coalesce(p_payload->>'hint_en', '')), '');
  v_hint_ar      text := nullif(btrim(coalesce(p_payload->>'hint_ar', '')), '');
  v_category     text := lower(btrim(coalesce(p_payload->>'category', '')));
  v_add_on       numeric(12,2);
  v_cost         numeric(12,2);
  v_metrics      jsonb := coalesce(p_payload->'metrics', '{}'::jsonb);
  v_active       boolean;
  v_sort_order   integer;
  v_row          public.flavor_items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid flavor item payload.' using errcode = '22023';
  end if;

  begin
    v_id := nullif(p_payload->>'id', '')::uuid;
    v_add_on := nullif(p_payload->>'add_on_per_kg', '')::numeric(12,2);
    v_cost := nullif(p_payload->>'cost_per_kg', '')::numeric(12,2);
    v_active := coalesce(nullif(p_payload->>'active', '')::boolean, true);
    v_sort_order := coalesce(nullif(p_payload->>'sort_order', '')::integer, 0);
  exception when others then
    raise exception 'Invalid flavor item values.' using errcode = '22023';
  end;

  if v_flavor_key !~ '^[a-z0-9_-]{2,64}$'
     or v_name_en = '' or v_name_ar = ''
     or v_category not in ('chocolate', 'fruits', 'nuts', 'desserts', 'coffee-shisha')
     or v_add_on is null or v_add_on < 0
     or (v_cost is not null and v_cost < 0)
     or length(v_name_en) > 160 or length(v_name_ar) > 160 then
    raise exception 'Invalid flavor item values.' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.flavor_items (
      flavor_key, name_en, name_ar, hint_en, hint_ar, category,
      add_on_per_kg, cost_per_kg, metrics, active, sort_order
    ) values (
      v_flavor_key, v_name_en, v_name_ar, v_hint_en, v_hint_ar, v_category,
      v_add_on, v_cost, v_metrics, v_active, v_sort_order
    )
    returning * into v_row;
  else
    update public.flavor_items set
      flavor_key = v_flavor_key, name_en = v_name_en, name_ar = v_name_ar,
      hint_en = v_hint_en, hint_ar = v_hint_ar, category = v_category,
      add_on_per_kg = v_add_on, cost_per_kg = v_cost, metrics = v_metrics,
      active = v_active, sort_order = v_sort_order
    where id = v_id
    returning * into v_row;

    if not found then
      raise exception 'Flavor item not found.' using errcode = 'P0002';
    end if;
  end if;

  return to_jsonb(v_row);
exception
  when unique_violation then
    raise exception 'Flavor key is already in use.' using errcode = '23505';
end;
$$;

revoke all on function public.upsert_flavor_base(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_flavor_base(jsonb) to authenticated;
revoke all on function public.upsert_flavor_item(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_flavor_item(jsonb) to authenticated;


-- =====================================================================
-- SECTION 9 — _allocate_espresso_bean_lots_fifo (internal FIFO helper)
-- =====================================================================
-- Exact mirror of Phase 5's `_allocate_lots_fifo`, applied to the espresso
-- bean resource dimension instead of finished-product lots.

create or replace function public._allocate_espresso_bean_lots_fifo(
  p_order_id       uuid,
  p_order_item_id  uuid,
  p_bean_id        uuid,
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
    from public.espresso_bean_lots
    where bean_id = p_bean_id
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

    update public.espresso_bean_lots
      set reserved_qty_kg = reserved_qty_kg + v_take
    where id = r.id;

    insert into public.order_espresso_bean_allocations (
      order_id, order_item_id, bean_id, lot_id,
      reserved_qty_kg, deducted_qty_kg, unit_cost, status
    ) values (
      p_order_id, p_order_item_id, p_bean_id, r.id,
      v_take, 0, r.unit_cost, 'reserved'
    );

    if p_write_movement then
      insert into public.espresso_bean_movements (
        bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
      ) values (
        p_bean_id, p_order_id, r.id, 'reserve', v_take,
        'Checkout reservation (FIFO bean lot)',
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
    raise exception 'Insufficient bean lot stock to reserve % kg for bean %.',
      p_qty_kg, p_bean_id using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public._allocate_espresso_bean_lots_fifo(uuid, uuid, uuid, numeric, text, text, boolean)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 10 — create_checkout_order: accept builder items (extends the
-- internal Phase-5 engine the Phase 6-7 wrapper calls)
-- =====================================================================
-- Full replacement of `_create_checkout_order_phase5` (the Phase-6/7 wrapper
-- keeps calling this exact internal name — see migration 20260701104031
-- Section 9 — so no change is needed to the public `create_checkout_order`
-- wrapper itself). Everything from Phase 1 + Phase 5 is preserved verbatim
-- (payload validation, DB-authoritative catalog pricing, payment-method
-- mapping, all-methods-pending, zone delivery, idempotent replay, customer
-- upsert, frozen snapshots, the atomic per-product inventory_stock oversell
-- guard, coffee FIFO lot reservation). New behavior:
--   * item kind 'custom_espresso' / 'espresso-blend' — validates 1-20 beans
--     each existing + active, ratios summing to exactly 100%, computes price/kg from
--     validated bean sale prices (never the client's), reserves the exact
--     required grams per bean via FIFO across espresso_bean_lots (same atomic
--     oversell-guard + FIFO pattern as coffee), and writes a cost-free
--     order_items.custom_data snapshot (bean names/percent/requiredKg only).
--   * item kind 'custom_flavor' / 'flavor-mix' — validates a base + 1-4
--     flavors each existing + active, computes price/kg from validated
--     base+flavor prices, snapshots a PRIVATE per-line cost basis into
--     order_items.line_cogs at insert time (no stock effect at all — Decision
--     4, cost-only, cost defaults to 0 when unknown), and writes a cost-free
--     custom_data snapshot (base/flavor names only).
--   * orders.type is now computed from the item kinds present (standard /
--     custom_espresso / custom_flavor / mixed) instead of being hardcoded
--     'standard'.
-- Packaging is deliberately NOT computed for builder lines in this phase
-- (Phase 6-7's `_apply_order_packaging` only counts kind = 'product'; builder
-- lines use kind = 'custom_espresso' / 'custom_flavor' and are excluded,
-- exactly as intended — see the migration header).

create or replace function public._create_checkout_order_phase5(p_payload jsonb)
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
    line_cogs    numeric(12,2)
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
        v_unit_price, v_qty, v_line_total, v_req_kg, null, null
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
        v_unit_price, v_qty, v_line_total, v_total_required_kg, v_custom_data, null
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
        v_unit_price, v_qty, v_line_total, 0, v_custom_data, v_line_cogs
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
    unit_price, quantity, line_total, custom_data, line_cogs
  )
  select
    line_id, v_order_id, kind, product_id, product_slug, variant_id, variant_size,
    name_en, name_ar, detail_en, detail_ar, sku,
    unit_price, quantity, line_total, custom_data, line_cogs
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
$$;

revoke all on function public._create_checkout_order_phase5(jsonb)
  from public, anon, authenticated;


-- =====================================================================
-- SECTION 11 — update_admin_order_status: deduct/release bean lots +
-- roll the flavor cost snapshot into orders.cogs_total at delivered
-- =====================================================================
-- Full replacement, preserving every Phase-1/5 behavior verbatim
-- (authorization, transition map, actor resolution, idempotent no-op,
-- coffee lot deduct/release + COGS, the fail-closed legacy guard for
-- kind='product' lines, shipped/returned no-op). New behavior, gated the
-- same way (`v_next_status in ('cancelled','delivered')`):
--   * an INDEPENDENT block deducts/releases `order_espresso_bean_allocations`
--     for the order's 'custom_espresso' lines (mirrors the coffee block
--     exactly, against the separate bean-lot resource), adding its own
--     fail-closed consistency check so a custom_espresso order can never be
--     silently skipped.
--   * at delivered, the (optional) per-line cost snapshot already stored on
--     'custom_flavor' order_items.line_cogs (set once at checkout — Make Your
--     Flavor has no stock/lot event to gate it on) is rolled into
--     orders.cogs_total alongside the coffee/bean lot COGS.
--   * the single combined `orders.cogs_total` update now runs once, after all
--     three resource blocks, instead of only inside the coffee block.

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
  v_flavor_cogs numeric(12,2);
  a record;
  b record;
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

    -- ===== COFFEE / FINISHED-PRODUCT LOTS (Phase 5, unchanged) =========
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
    else
      -- ---------- FAIL-CLOSED LEGACY GUARD ------------------------------
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

    -- ===== ESPRESSO BEAN LOTS (Phase 8) — independent resource ==========
    if exists (
      select 1 from public.order_items oi
      where oi.order_id = v_order.id and oi.kind = 'custom_espresso'
    ) then
      if exists (
        with expected as (
          select oi.id as order_item_id,
                 round(public.variant_size_to_kg(oi.variant_size) * oi.quantity, 3) as required_kg
          from public.order_items oi
          where oi.order_id = v_order.id
            and oi.kind = 'custom_espresso'
        ),
        allocated as (
          select al.order_item_id,
                 round(sum(al.reserved_qty_kg), 3) as allocated_kg
          from public.order_espresso_bean_allocations al
          where al.order_id = v_order.id
            and al.status = 'reserved'
          group by al.order_item_id
        )
        select 1
        from expected e
        full join allocated al on al.order_item_id = e.order_item_id
        where e.order_item_id is null
           or al.order_item_id is null
           or coalesce(e.required_kg, 0) <> coalesce(al.allocated_kg, 0)
      ) then
        raise exception 'Espresso bean lot allocations are incomplete or inconsistent; inventory was not changed.'
          using errcode = 'P0001';
      end if;

      -- Same lock order as checkout (inventory_stock/products first, then
      -- espresso_bean_stock) so a status change cannot deadlock a concurrent
      -- checkout that reserves both resources.
      perform s.bean_id
      from public.espresso_bean_stock s
      where s.bean_id in (
        select distinct al.bean_id
        from public.order_espresso_bean_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
      )
      order by s.bean_id
      for update;

      for b in
        select al.id, al.order_item_id, al.bean_id, al.lot_id, al.reserved_qty_kg, al.unit_cost
        from public.order_espresso_bean_allocations al
        where al.order_id = v_order.id
          and al.status = 'reserved'
        order by al.bean_id, al.created_at, al.id
        for update
      loop
        if v_effect_type = 'deduct' then
          update public.espresso_bean_lots
            set remaining_qty_kg = remaining_qty_kg - b.reserved_qty_kg,
                reserved_qty_kg  = reserved_qty_kg  - b.reserved_qty_kg,
                status = case
                  when remaining_qty_kg - b.reserved_qty_kg <= 0 then 'closed'
                  else status
                end
          where id = b.lot_id
            and reserved_qty_kg  >= b.reserved_qty_kg
            and remaining_qty_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean lot reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          update public.order_espresso_bean_allocations
            set deducted_qty_kg = reserved_qty_kg, status = 'deducted'
          where id = b.id;

          update public.espresso_bean_stock
            set reserved_kg = reserved_kg - b.reserved_qty_kg
          where bean_id = b.bean_id
            and reserved_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean stock reservation is inconsistent (deduct).' using errcode = 'P0001';
          end if;

          v_line_cogs := round(b.reserved_qty_kg * b.unit_cost, 2);
          v_cogs_total := v_cogs_total + v_line_cogs;

          if b.order_item_id is not null then
            update public.order_items
              set line_cogs = round(coalesce(line_cogs, 0) + v_line_cogs, 2)
            where id = b.order_item_id;
          end if;

          insert into public.espresso_bean_movements (
            bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            b.bean_id, v_order.id, b.lot_id, 'deduct', b.reserved_qty_kg,
            'Order delivered; bean lot deducted',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', b.lot_id,
              'unit_cost', b.unit_cost, 'line_cogs', v_line_cogs,
              'order_item_id', b.order_item_id, 'changed_by', v_actor
            )
          );
        else
          update public.espresso_bean_lots
            set reserved_qty_kg = reserved_qty_kg - b.reserved_qty_kg
          where id = b.lot_id
            and reserved_qty_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean lot reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          update public.order_espresso_bean_allocations
            set status = 'released'
          where id = b.id;

          update public.espresso_bean_stock
            set available_kg = available_kg + b.reserved_qty_kg,
                reserved_kg  = reserved_kg  - b.reserved_qty_kg
          where bean_id = b.bean_id
            and reserved_kg >= b.reserved_qty_kg;
          get diagnostics v_updated = row_count;
          if v_updated <> 1 then
            raise exception 'Bean stock reservation is inconsistent (release).' using errcode = 'P0001';
          end if;

          insert into public.espresso_bean_movements (
            bean_id, order_id, lot_id, movement_type, quantity_kg, reason, metadata
          ) values (
            b.bean_id, v_order.id, b.lot_id, 'release', b.reserved_qty_kg,
            'Order cancelled; bean lot reservation released',
            jsonb_build_object(
              'order_code', v_order.code, 'lot_id', b.lot_id,
              'order_item_id', b.order_item_id, 'changed_by', v_actor
            )
          );
        end if;
      end loop;
    end if;

    -- ===== FLAVOR COST-ONLY SNAPSHOT (Phase 9) — no stock movement ======
    -- Make Your Flavor never touches inventory. Its (optional) per-line cost
    -- snapshot was frozen once at checkout on order_items.line_cogs; roll it
    -- into the order-level COGS rollup at delivered only (matching revenue
    -- recognition timing), alongside coffee + bean lot COGS above.
    if v_effect_type = 'deduct' then
      select coalesce(sum(line_cogs), 0)
        into v_flavor_cogs
      from public.order_items
      where order_id = v_order.id
        and kind = 'custom_flavor';
      v_cogs_total := v_cogs_total + coalesce(v_flavor_cogs, 0);
    end if;

    -- Combined COGS rollup across coffee lots + espresso bean lots + the
    -- flavor cost-only snapshot (moved out of the coffee-only branch above so
    -- espresso/flavor-only orders also get a correct orders.cogs_total).
    if v_effect_type = 'deduct' then
      update public.orders set cogs_total = round(v_cogs_total, 2) where id = v_order.id;
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
-- FOOTER — Rollback notes (forward-fix preferred; before any Phase-8/9 order)
-- =====================================================================
--   -- 1. Restore create_checkout_order's internal body and
--   --    update_admin_order_status from migration 20260701104031 / 20260630130000
--   --    (re-run their CREATE OR REPLACE blocks for
--   --    _create_checkout_order_phase5 and update_admin_order_status).
--   -- 2. Drop the Phase-8/9 objects:
--   drop function if exists public._allocate_espresso_bean_lots_fifo(uuid,uuid,uuid,numeric,text,text,boolean);
--   drop function if exists public.adjust_espresso_bean_stock(uuid,numeric,numeric,text);
--   drop function if exists public.upsert_espresso_bean(jsonb);
--   drop function if exists public.upsert_flavor_base(jsonb);
--   drop function if exists public.upsert_flavor_item(jsonb);
--   drop view if exists public.public_espresso_beans;
--   drop view if exists public.public_flavor_bases;
--   drop view if exists public.public_flavor_items;
--   drop table if exists public.order_espresso_bean_allocations;
--   drop table if exists public.espresso_bean_movements;
--   drop table if exists public.espresso_bean_lots;
--   drop table if exists public.espresso_bean_stock;
--   drop table if exists public.espresso_beans;
--   drop table if exists public.flavor_items;
--   drop table if exists public.flavor_bases;
-- (Only safe before any NEW order has reserved/deducted bean lots or a flavor
--  cost snapshot under this engine; after that, dropping these tables loses
--  live reservation/cost state — repair forward instead.)
-- =====================================================================
