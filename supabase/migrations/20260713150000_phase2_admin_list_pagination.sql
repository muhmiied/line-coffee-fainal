-- =====================================================================
-- Line Coffee V3 — Phase 2: Reporting Correctness + Performance
-- Admin list pagination RPCs (Orders, Customers)
-- =====================================================================
-- GOAL
--   Admin Orders was capped at the newest 250 orders (`getAdminOrders()`)
--   with search/status-filter/KPI-counts all computed client-side over that
--   same capped, in-memory array — so once past 250 orders, search/filters/
--   counts all silently missed older data. Admin Customers had the same
--   shape at a 1,000-row cap (`getAdminCustomers()`) plus a 5,000-row orders
--   scan just to attach each customer's order count/spend.
--
--   These two RPCs replace both with real, admin-only, SQL-side pagination:
--   filtering and status/segment counts run over the COMPLETE table, only the
--   current page's rows are returned to the browser.
--
-- WHY AN RPC (not a plain PostgREST `.range()` read) FOR THESE TWO:
--   Both need either a multi-column OR-search across a mix of real columns
--   AND jsonb fields (Orders: code/customer_name/customer_whatsapp plus
--   customer_snapshot->>email/phone), or a per-row computed classification
--   that must be evaluated before pagination/filtering (Customers: VIP/
--   repeat/new/inactive/at-risk segments, which depend on aggregated order
--   history). A hand-built PostgREST `.or()` filter string with raw user
--   search text embedded is fragile (commas/parentheses in the search string
--   are meaningful in PostgREST's filter DSL and could corrupt or fork the
--   query). A `p_search text` bound PL/pgSQL parameter has no such risk — it
--   is used only inside `ilike('%' || v_search || '%')`, a plain bound value,
--   never concatenated into query text.
--
--   CMS Blog/Reviews/Contact, Purchases, Expenses, and Inventory/Packaging
--   movements do NOT need this — they paginate/search on real columns only,
--   so they use plain `.range()` + `count:'exact'` reads directly from the
--   TypeScript layer (see the accompanying TS changes in this phase).
--
-- SECURITY: same model as the reporting RPCs in 20260713140000 — SECURITY
-- INVOKER, explicit `is_admin()` check first (clear error, not a silent empty
-- page), `search_path=''`, fully schema-qualified, EXECUTE revoked from
-- PUBLIC/anon and granted only to authenticated. RLS on `orders` /
-- `order_items` / `customers` stays the authoritative backstop.
--
-- IDEMPOTENCY: `create or replace function`. Additive only.
-- =====================================================================


-- =====================================================================
-- SECTION 1 — list_admin_orders_v1
-- =====================================================================
-- Real pagination + full-dataset search + full-dataset status counts for
-- Admin Orders. `statusCounts` respects the search filter but NOT the status
-- filter itself (unchanged UX: the status count chips always show what a
-- click would reveal for the current search).

create or replace function public.list_admin_orders_v1(
  p_search text default null,
  p_status text default null,
  p_page int default 1,
  p_page_size int default 30
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_search    text := nullif(btrim(coalesce(p_search, '')), '');
  v_status    text := nullif(btrim(coalesce(p_status, '')), '');
  v_page      int  := greatest(1, coalesce(p_page, 1));
  v_page_size int  := least(200, greatest(1, coalesce(p_page_size, 30)));
  v_offset    int  := (v_page - 1) * v_page_size;
  v_result    jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('pending', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned') then
    raise exception 'Unsupported order status filter.' using errcode = '22023';
  end if;
  if length(coalesce(v_search, '')) > 200 then
    raise exception 'Search query is too long.' using errcode = '22023';
  end if;

  with matched as (
    select o.*
    from public.orders o
    where
      v_search is null or (
        o.code ilike '%' || v_search || '%'
        or o.customer_name ilike '%' || v_search || '%'
        or coalesce(o.customer_whatsapp, '') ilike '%' || v_search || '%'
        or coalesce(o.customer_snapshot ->> 'email', '') ilike '%' || v_search || '%'
        or coalesce(o.customer_snapshot ->> 'phone', '') ilike '%' || v_search || '%'
      )
  ),
  status_filtered as (
    select * from matched m where v_status is null or m.status = v_status
  ),
  total as (
    select count(*) as cnt from status_filtered
  ),
  status_counts as (
    select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) as data
    from (select status, count(*) as cnt from matched group by status) s
  ),
  page_rows as (
    select
      sf.id, sf.code, sf.customer_id, sf.customer_snapshot, sf.address_snapshot,
      sf.customer_name, sf.customer_whatsapp, sf.status, sf.type, sf.channel,
      sf.subtotal, sf.discount_total, sf.delivery_fee, sf.delivery_zone,
      sf.delivery_note, sf.delivery_fee_overridden, sf.total, sf.promo_code,
      sf.payment_method, sf.payment_status, sf.payment_reference, sf.payment_phone,
      sf.placed_at, sf.updated_at, sf.admin_note, sf.customer_note,
      (select count(*) from public.order_items oi where oi.order_id = sf.id) as item_count
    from status_filtered sf
    order by sf.placed_at desc, sf.id desc
    limit v_page_size offset v_offset
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows.*) order by placed_at desc, id desc) from page_rows), '[]'::jsonb),
    'totalCount', (select cnt from total),
    'statusCounts', (select data from status_counts),
    'page', v_page,
    'pageSize', v_page_size
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.list_admin_orders_v1(text, text, int, int) from public, anon;
grant execute on function public.list_admin_orders_v1(text, text, int, int) to authenticated;


-- =====================================================================
-- SECTION 2 — list_admin_customers_v1
-- =====================================================================
-- Real pagination + full-dataset search/type/segment filtering + full-
-- dataset KPI counts for Admin Customers. Segment classification (VIP /
-- Repeat / New / Inactive / At-Risk / Wholesale Potential) mirrors
-- `getCustomerSegments()` in src/lib/admin/admin-customers.ts exactly and is
-- evaluated in SQL over the complete customers+orders join so a segment
-- filter never silently misses customers outside a scan cap.

create or replace function public.list_admin_customers_v1(
  p_search text default null,
  p_type text default null,
  p_segment text default null,
  p_page int default 1,
  p_page_size int default 30,
  p_as_of timestamptz default now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_search    text        := nullif(btrim(coalesce(p_search, '')), '');
  v_type      text        := nullif(btrim(coalesce(p_type, '')), '');
  v_segment   text        := nullif(btrim(coalesce(p_segment, '')), '');
  v_page      int         := greatest(1, coalesce(p_page, 1));
  v_page_size int         := least(200, greatest(1, coalesce(p_page_size, 30)));
  v_offset    int         := (v_page - 1) * v_page_size;
  v_as_of     timestamptz := coalesce(p_as_of, now());
  v_result    jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if v_type is not null and v_type not in ('registered', 'guest') then
    raise exception 'Unsupported customer type filter.' using errcode = '22023';
  end if;
  if v_segment is not null and v_segment not in ('vip', 'repeat', 'new', 'inactive', 'at-risk', 'wholesale-potential') then
    raise exception 'Unsupported segment filter.' using errcode = '22023';
  end if;
  if length(coalesce(v_search, '')) > 200 then
    raise exception 'Search query is too long.' using errcode = '22023';
  end if;

  with base as (
    select c.*
    from public.customers c
    where
      (v_type is null or c.type = v_type)
      and (
        v_search is null or (
          c.name ilike '%' || v_search || '%'
          or coalesce(c.phone, '') ilike '%' || v_search || '%'
          or coalesce(c.email, '') ilike '%' || v_search || '%'
          or c.whatsapp ilike '%' || v_search || '%'
        )
      )
  ),
  agg as (
    select
      b.*,
      coalesce(o.orders_count, 0) as orders_count,
      coalesce(o.total_spent, 0) as total_spent,
      o.last_order_date, o.last_order_status, o.last_order_code,
      greatest(0, floor(extract(epoch from (v_as_of - (b.joined_at::timestamptz))) / 86400))::int as days_since_joined,
      case when o.last_order_date is not null
        then greatest(0, floor(extract(epoch from (v_as_of - o.last_order_date)) / 86400))::int
        else null
      end as days_since_last_order
    from base b
    left join lateral (
      select
        count(*) as orders_count,
        sum(ord.total) filter (where ord.status <> 'cancelled') as total_spent,
        max(ord.placed_at) as last_order_date,
        (array_agg(ord.status order by ord.placed_at desc))[1] as last_order_status,
        (array_agg(ord.code order by ord.placed_at desc))[1] as last_order_code
      from public.orders ord
      where ord.customer_id = b.id
    ) o on true
  ),
  segmented as (
    select
      a.*,
      (a.total_spent >= 5000 or a.orders_count >= 8) as is_vip,
      (a.orders_count >= 2) as is_repeat_raw,
      (a.orders_count <= 1 and a.days_since_joined <= 30) as is_new,
      (a.last_order_date is not null and a.days_since_last_order > 90) as is_inactive,
      (a.orders_count >= 2 and a.days_since_last_order between 60 and 90) as is_at_risk,
      ('Wholesale Potential' = any(a.tags)) as is_wholesale
    from agg a
  ),
  filtered as (
    select s.* from segmented s
    where v_segment is null
      or (v_segment = 'vip' and s.is_vip)
      or (v_segment = 'repeat' and s.is_repeat_raw and not s.is_vip)
      or (v_segment = 'new' and s.is_new)
      or (v_segment = 'inactive' and s.is_inactive)
      or (v_segment = 'at-risk' and s.is_at_risk)
      or (v_segment = 'wholesale-potential' and s.is_wholesale)
  ),
  total as (
    select count(*) as cnt from filtered
  ),
  kpis as (
    select
      count(*) as total,
      count(*) filter (where type = 'registered') as registered,
      count(*) filter (where type <> 'registered') as guest,
      count(*) filter (where is_repeat_raw and not is_vip) as repeat_count,
      count(*) filter (where is_vip) as vip_count,
      count(*) filter (where is_inactive) as inactive_count
    from segmented
  ),
  page_rows as (
    select * from filtered
    order by joined_at desc, id desc
    limit v_page_size offset v_offset
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'authUserId', auth_user_id, 'type', type, 'status', status,
      'name', name, 'email', email, 'phone', phone, 'whatsapp', whatsapp,
      'marketingOptIn', marketing_opt_in, 'tags', tags, 'joinedAt', joined_at, 'createdAt', created_at,
      'ordersCount', orders_count, 'totalSpent', round(total_spent::numeric, 2),
      'lastOrderDate', last_order_date, 'lastOrderStatus', last_order_status, 'lastOrderCode', last_order_code,
      'daysSinceJoined', days_since_joined, 'daysSinceLastOrder', days_since_last_order
    ) order by joined_at desc, id desc) from page_rows), '[]'::jsonb),
    'totalCount', (select cnt from total),
    'kpis', (select jsonb_build_object(
      'total', total, 'registered', registered, 'guest', guest,
      'repeat', repeat_count, 'vip', vip_count, 'inactive', inactive_count
    ) from kpis),
    'page', v_page,
    'pageSize', v_page_size
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.list_admin_customers_v1(text, text, text, int, int, timestamptz) from public, anon;
grant execute on function public.list_admin_customers_v1(text, text, text, int, int, timestamptz) to authenticated;
