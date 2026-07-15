-- =====================================================================
-- Line Coffee V3 — Phase 2: Reporting Correctness + Performance
-- Admin Customers RPC — count every filter-tab segment, not just the 6 KPI cards
-- =====================================================================
-- The Customers page renders 9 filter-tab chips (All/Registered/Guest/VIP/
-- Repeat/New/Inactive/At-Risk/Wholesale), each showing a live count. The
-- previous version of `list_admin_customers_v1` only counted the 6 values
-- shown on the KPI cards above the tabs (total/registered/guest/repeat/vip/
-- inactive) — New/At-Risk/Wholesale tabs would have had no accurate count to
-- bind to. This adds those 3 (all computed over the same already-built
-- `segmented` CTE, no extra table scan), superseding the function again.
-- Same security model as before: unchanged.
-- =====================================================================

drop function if exists public.list_admin_customers_v1(text, text, text, int, int, timestamptz, text);

create or replace function public.list_admin_customers_v1(
  p_search text default null,
  p_type text default null,
  p_segment text default null,
  p_page int default 1,
  p_page_size int default 30,
  p_as_of timestamptz default now(),
  p_sort text default null
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
  v_sort      text        := nullif(btrim(coalesce(p_sort, '')), '');
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
  if v_sort is not null and v_sort not in ('most-spent', 'most-orders', 'recently-active', 'oldest-inactive') then
    raise exception 'Unsupported sort option.' using errcode = '22023';
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
      count(*) filter (where is_inactive) as inactive_count,
      count(*) filter (where is_new) as new_count,
      count(*) filter (where is_at_risk) as at_risk_count,
      count(*) filter (where is_wholesale) as wholesale_count
    from segmented
  ),
  lifetime as (
    select round(coalesce(sum(total) filter (where status <> 'cancelled'), 0)::numeric, 2) as total_spend
    from public.orders
    where customer_id is not null
  ),
  ranked as (
    select *, row_number() over (
      order by
        case when v_sort = 'most-spent' then total_spent end desc nulls last,
        case when v_sort = 'most-orders' then orders_count end desc nulls last,
        case when v_sort = 'recently-active' then last_order_date end desc nulls last,
        case when v_sort = 'oldest-inactive' then last_order_date end asc nulls first,
        joined_at desc, id desc
    ) as rn
    from filtered
  ),
  page_rows as (
    select * from ranked where rn > v_offset and rn <= v_offset + v_page_size
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'authUserId', auth_user_id, 'type', type, 'status', status,
      'name', name, 'email', email, 'phone', phone, 'whatsapp', whatsapp,
      'marketingOptIn', marketing_opt_in, 'tags', tags, 'joinedAt', joined_at, 'createdAt', created_at,
      'ordersCount', orders_count, 'totalSpent', round(total_spent::numeric, 2),
      'lastOrderDate', last_order_date, 'lastOrderStatus', last_order_status, 'lastOrderCode', last_order_code,
      'daysSinceJoined', days_since_joined, 'daysSinceLastOrder', days_since_last_order
    ) order by rn) from page_rows), '[]'::jsonb),
    'totalCount', (select cnt from total),
    'kpis', (select jsonb_build_object(
      'total', total, 'registered', registered, 'guest', guest,
      'repeat', repeat_count, 'vip', vip_count, 'inactive', inactive_count,
      'new', new_count, 'atRisk', at_risk_count, 'wholesale', wholesale_count
    ) from kpis),
    'totalSpend', (select total_spend from lifetime),
    'page', v_page,
    'pageSize', v_page_size
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.list_admin_customers_v1(text, text, text, int, int, timestamptz, text) from public, anon;
grant execute on function public.list_admin_customers_v1(text, text, text, int, int, timestamptz, text) to authenticated;
