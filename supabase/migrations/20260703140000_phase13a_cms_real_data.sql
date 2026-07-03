-- =====================================================================
-- Migration:  20260703140000_phase13a_cms_real_data
-- Project:    Line Coffee V3
-- Phase:      13A (Admin CMS / Blog / Reviews / Contact / Legal)
-- Runs after: 20260703130000_phase12a_admin_customers_read_grants
-- =====================================================================
--
-- PURPOSE
--   Replace the Admin CMS mock arrays with real Supabase-owned content.
--
-- SECURITY
--   * Every exposed table has RLS enabled.
--   * Draft blog/legal rows and pending/rejected reviews are admin-only.
--   * Public review rows contain no phone, email, proof, or internal-note PII.
--   * Contact messages have no public SELECT policy or table privilege.
--   * Browser writes use validated SECURITY DEFINER RPCs with an is_admin()
--     guard for CMS administration. No service-role code is introduced.
--
-- DATA
--   No fake blog/review/contact rows are seeded. Four empty legal-page shells
--   are inserted as drafts so the existing CMS module has the required,
--   stable privacy/terms/shipping/returns records to edit.
--
-- DESTRUCTIVE? NO. Four new tables, policies, triggers, and RPCs only.
-- =====================================================================


-- =====================================================================
-- SECTION 1 - Tables
-- =====================================================================

create table public.blog_posts (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null,
  title_en           text not null,
  title_ar           text not null default '',
  excerpt_en         text not null default '',
  excerpt_ar         text not null default '',
  content_en         text not null default '',
  content_ar         text not null default '',
  category_en        text not null default '',
  category_ar        text not null default '',
  author             text not null default '',
  status             text not null default 'draft'
                       check (status in ('draft', 'published', 'archived')),
  featured           boolean not null default false,
  views              integer not null default 0 check (views >= 0),
  published_at       timestamptz,
  read_time_en       text not null default '',
  read_time_ar       text not null default '',
  tags               jsonb not null default '[]'::jsonb
                       check (jsonb_typeof(tags) = 'array'),
  hero_image         text,
  card_image         text,
  featured_image     text,
  seo_title_en       text not null default '',
  seo_title_ar       text not null default '',
  seo_description_en text not null default '',
  seo_description_ar text not null default '',
  created_by         uuid references public.admin_users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (status <> 'published' or published_at is not null)
);

create unique index blog_posts_slug_key on public.blog_posts (slug);
create index blog_posts_public_idx
  on public.blog_posts (featured desc, published_at desc)
  where status = 'published';

create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text not null,
  product_name    text not null default '',
  product_slug    text,
  rating          smallint not null check (rating between 1 and 5),
  comment_en      text not null,
  comment_ar      text not null default '',
  source          text not null default 'manual'
                    check (source in ('manual', 'whatsapp', 'facebook', 'instagram', 'website')),
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  featured        boolean not null default false,
  hidden          boolean not null default false,
  show_on         text not null default 'product'
                    check (show_on in ('product', 'homepage', 'both')),
  published_at    timestamptz,
  created_by      uuid references public.admin_users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (status <> 'approved' or published_at is not null)
);

create index reviews_admin_idx on public.reviews (status, created_at desc);
create index reviews_public_idx
  on public.reviews (featured desc, published_at desc)
  where status = 'approved' and hidden = false;

create table public.legal_pages (
  id           uuid primary key default gen_random_uuid(),
  page_type    text not null unique
                 check (page_type in ('privacy', 'terms', 'shipping', 'returns')),
  title_en     text not null,
  title_ar     text not null default '',
  content_en   text not null default '',
  content_ar   text not null default '',
  status       text not null default 'draft'
                 check (status in ('draft', 'published')),
  version      text not null default '1.0',
  published_at timestamptz,
  updated_by   uuid references public.admin_users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.contact_messages (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  phone             text,
  whatsapp          text,
  email             text,
  source            text not null default 'contact_page'
                      check (source in ('contact_page', 'homepage', 'whatsapp', 'manual')),
  subject           text,
  message           text not null,
  status            text not null default 'new'
                      check (status in ('new', 'in_progress', 'replied', 'archived')),
  assigned_admin_id uuid references public.admin_users (id) on delete set null,
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (phone is not null or email is not null)
);

create index contact_messages_admin_idx
  on public.contact_messages (status, created_at desc);


-- =====================================================================
-- SECTION 2 - updated_at triggers
-- =====================================================================

create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create trigger trg_legal_pages_updated_at
  before update on public.legal_pages
  for each row execute function public.set_updated_at();

create trigger trg_contact_messages_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();


-- =====================================================================
-- SECTION 3 - RLS and explicit Data API privileges
-- =====================================================================

alter table public.blog_posts enable row level security;
alter table public.reviews enable row level security;
alter table public.legal_pages enable row level security;
alter table public.contact_messages enable row level security;

create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy blog_posts_admin_read on public.blog_posts
  for select to authenticated
  using ((select public.is_admin()));

create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (
    status = 'approved'
    and hidden = false
    and published_at is not null
    and published_at <= now()
  );

create policy reviews_admin_read on public.reviews
  for select to authenticated
  using ((select public.is_admin()));

create policy legal_pages_public_read on public.legal_pages
  for select to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  );

create policy legal_pages_admin_read on public.legal_pages
  for select to authenticated
  using ((select public.is_admin()));

create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.blog_posts from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.legal_pages from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;

grant select on table public.blog_posts to anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant select on table public.legal_pages to anon, authenticated;
grant select on table public.contact_messages to authenticated;


-- =====================================================================
-- SECTION 4 - Admin blog write RPC
-- =====================================================================

create or replace function public.save_admin_blog_post(p_post jsonb)
returns public.blog_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_id uuid;
  v_status text;
  v_slug text;
  v_published_at timestamptz;
  v_post public.blog_posts;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select a.id
    into v_admin_id
    from public.admin_users a
   where a.auth_user_id = auth.uid()
     and a.status = 'active'
   limit 1;

  v_id := coalesce(nullif(p_post ->> 'id', '')::uuid, gen_random_uuid());
  v_status := lower(coalesce(nullif(trim(p_post ->> 'status'), ''), 'draft'));
  v_slug := lower(trim(coalesce(p_post ->> 'slug', '')));

  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'A valid blog slug is required';
  end if;

  if nullif(trim(p_post ->> 'title_en'), '') is null then
    raise exception 'An English blog title is required';
  end if;

  if v_status not in ('draft', 'published', 'archived') then
    raise exception 'Invalid blog status';
  end if;

  if v_status = 'published' then
    v_published_at := coalesce(
      nullif(p_post ->> 'published_at', '')::timestamptz,
      now()
    );
  elsif v_status = 'archived' then
    v_published_at := nullif(p_post ->> 'published_at', '')::timestamptz;
  else
    v_published_at := null;
  end if;

  insert into public.blog_posts (
    id, slug, title_en, title_ar, excerpt_en, excerpt_ar,
    content_en, content_ar, category_en, category_ar, author,
    status, featured, views, published_at, read_time_en, read_time_ar,
    tags, hero_image, card_image, featured_image,
    seo_title_en, seo_title_ar, seo_description_en, seo_description_ar,
    created_by
  )
  values (
    v_id,
    v_slug,
    trim(p_post ->> 'title_en'),
    coalesce(p_post ->> 'title_ar', ''),
    coalesce(p_post ->> 'excerpt_en', ''),
    coalesce(p_post ->> 'excerpt_ar', ''),
    coalesce(p_post ->> 'content_en', ''),
    coalesce(p_post ->> 'content_ar', ''),
    coalesce(p_post ->> 'category_en', ''),
    coalesce(p_post ->> 'category_ar', ''),
    coalesce(p_post ->> 'author', ''),
    v_status,
    coalesce((p_post ->> 'featured')::boolean, false),
    greatest(coalesce((p_post ->> 'views')::integer, 0), 0),
    v_published_at,
    coalesce(p_post ->> 'read_time_en', ''),
    coalesce(p_post ->> 'read_time_ar', ''),
    coalesce(p_post -> 'tags', '[]'::jsonb),
    nullif(p_post ->> 'hero_image', ''),
    nullif(p_post ->> 'card_image', ''),
    nullif(p_post ->> 'featured_image', ''),
    coalesce(p_post ->> 'seo_title_en', ''),
    coalesce(p_post ->> 'seo_title_ar', ''),
    coalesce(p_post ->> 'seo_description_en', ''),
    coalesce(p_post ->> 'seo_description_ar', ''),
    v_admin_id
  )
  on conflict (id) do update set
    slug = excluded.slug,
    title_en = excluded.title_en,
    title_ar = excluded.title_ar,
    excerpt_en = excluded.excerpt_en,
    excerpt_ar = excluded.excerpt_ar,
    content_en = excluded.content_en,
    content_ar = excluded.content_ar,
    category_en = excluded.category_en,
    category_ar = excluded.category_ar,
    author = excluded.author,
    status = excluded.status,
    featured = excluded.featured,
    views = excluded.views,
    published_at = excluded.published_at,
    read_time_en = excluded.read_time_en,
    read_time_ar = excluded.read_time_ar,
    tags = excluded.tags,
    hero_image = excluded.hero_image,
    card_image = excluded.card_image,
    featured_image = excluded.featured_image,
    seo_title_en = excluded.seo_title_en,
    seo_title_ar = excluded.seo_title_ar,
    seo_description_en = excluded.seo_description_en,
    seo_description_ar = excluded.seo_description_ar
  returning * into v_post;

  return v_post;
end;
$$;


-- =====================================================================
-- SECTION 5 - Admin review write RPC
-- =====================================================================

create or replace function public.save_admin_review(p_review jsonb)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_id uuid;
  v_status text;
  v_published_at timestamptz;
  v_review public.reviews;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select a.id
    into v_admin_id
    from public.admin_users a
   where a.auth_user_id = auth.uid()
     and a.status = 'active'
   limit 1;

  v_id := coalesce(nullif(p_review ->> 'id', '')::uuid, gen_random_uuid());
  v_status := lower(coalesce(nullif(trim(p_review ->> 'status'), ''), 'pending'));

  if nullif(trim(p_review ->> 'customer_name'), '') is null then
    raise exception 'Customer name is required';
  end if;

  if nullif(trim(p_review ->> 'comment_en'), '') is null then
    raise exception 'Review comment is required';
  end if;

  if v_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  if v_status = 'approved' then
    v_published_at := coalesce(
      nullif(p_review ->> 'published_at', '')::timestamptz,
      now()
    );
  else
    v_published_at := null;
  end if;

  insert into public.reviews (
    id, customer_name, product_name, product_slug, rating,
    comment_en, comment_ar, source, status, featured, hidden,
    show_on, published_at, created_by
  )
  values (
    v_id,
    trim(p_review ->> 'customer_name'),
    coalesce(p_review ->> 'product_name', ''),
    nullif(p_review ->> 'product_slug', ''),
    coalesce((p_review ->> 'rating')::smallint, 5),
    trim(p_review ->> 'comment_en'),
    coalesce(p_review ->> 'comment_ar', ''),
    lower(coalesce(nullif(p_review ->> 'source', ''), 'manual')),
    v_status,
    coalesce((p_review ->> 'featured')::boolean, false),
    coalesce((p_review ->> 'hidden')::boolean, false),
    lower(coalesce(nullif(p_review ->> 'show_on', ''), 'product')),
    v_published_at,
    v_admin_id
  )
  on conflict (id) do update set
    customer_name = excluded.customer_name,
    product_name = excluded.product_name,
    product_slug = excluded.product_slug,
    rating = excluded.rating,
    comment_en = excluded.comment_en,
    comment_ar = excluded.comment_ar,
    source = excluded.source,
    status = excluded.status,
    featured = excluded.featured,
    hidden = excluded.hidden,
    show_on = excluded.show_on,
    published_at = excluded.published_at
  returning * into v_review;

  return v_review;
end;
$$;


-- =====================================================================
-- SECTION 6 - Admin legal/contact write RPCs
-- =====================================================================

create or replace function public.save_admin_legal_page(p_page jsonb)
returns public.legal_pages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_id uuid;
  v_status text;
  v_type text;
  v_published_at timestamptz;
  v_page public.legal_pages;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select a.id
    into v_admin_id
    from public.admin_users a
   where a.auth_user_id = auth.uid()
     and a.status = 'active'
   limit 1;

  v_id := nullif(p_page ->> 'id', '')::uuid;
  v_type := lower(coalesce(p_page ->> 'page_type', ''));
  v_status := lower(coalesce(nullif(p_page ->> 'status', ''), 'draft'));

  if v_id is null then
    raise exception 'Legal page id is required';
  end if;

  if v_type not in ('privacy', 'terms', 'shipping', 'returns') then
    raise exception 'Invalid legal page type';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'Invalid legal page status';
  end if;

  if v_status = 'published' then
    v_published_at := coalesce(
      nullif(p_page ->> 'published_at', '')::timestamptz,
      now()
    );
  else
    v_published_at := null;
  end if;

  insert into public.legal_pages (
    id, page_type, title_en, title_ar, content_en, content_ar,
    status, version, published_at, updated_by
  )
  values (
    v_id,
    v_type,
    trim(coalesce(p_page ->> 'title_en', '')),
    coalesce(p_page ->> 'title_ar', ''),
    coalesce(p_page ->> 'content_en', ''),
    coalesce(p_page ->> 'content_ar', ''),
    v_status,
    coalesce(nullif(p_page ->> 'version', ''), '1.0'),
    v_published_at,
    v_admin_id
  )
  on conflict (id) do update set
    page_type = excluded.page_type,
    title_en = excluded.title_en,
    title_ar = excluded.title_ar,
    content_en = excluded.content_en,
    content_ar = excluded.content_ar,
    status = excluded.status,
    version = excluded.version,
    published_at = excluded.published_at,
    updated_by = excluded.updated_by
  returning * into v_page;

  return v_page;
end;
$$;

create or replace function public.update_admin_contact_message(
  p_message_id uuid,
  p_status text,
  p_admin_note text default null
)
returns public.contact_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_status text;
  v_message public.contact_messages;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_status := lower(trim(coalesce(p_status, '')));
  if v_status not in ('new', 'in_progress', 'replied', 'archived') then
    raise exception 'Invalid contact message status';
  end if;

  select a.id
    into v_admin_id
    from public.admin_users a
   where a.auth_user_id = auth.uid()
     and a.status = 'active'
   limit 1;

  update public.contact_messages
     set status = v_status,
         admin_note = nullif(trim(p_admin_note), ''),
         assigned_admin_id = v_admin_id
   where id = p_message_id
  returning * into v_message;

  if v_message.id is null then
    raise exception 'Contact message not found';
  end if;

  return v_message;
end;
$$;


-- =====================================================================
-- SECTION 7 - Public contact submission RPC
-- =====================================================================

create or replace function public.create_contact_message(p_message jsonb)
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

  insert into public.contact_messages (
    name, phone, whatsapp, email, source, subject, message
  )
  values (
    v_name,
    v_phone,
    v_phone,
    v_email,
    v_source,
    v_subject,
    v_body
  )
  returning id into v_id;

  return v_id;
end;
$$;


-- =====================================================================
-- SECTION 8 - Function privileges
-- =====================================================================

revoke all on function public.save_admin_blog_post(jsonb) from public, anon, authenticated;
revoke all on function public.save_admin_review(jsonb) from public, anon, authenticated;
revoke all on function public.save_admin_legal_page(jsonb) from public, anon, authenticated;
revoke all on function public.update_admin_contact_message(uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_contact_message(jsonb) from public, anon, authenticated;

grant execute on function public.save_admin_blog_post(jsonb) to authenticated;
grant execute on function public.save_admin_review(jsonb) to authenticated;
grant execute on function public.save_admin_legal_page(jsonb) to authenticated;
grant execute on function public.update_admin_contact_message(uuid, text, text) to authenticated;
grant execute on function public.create_contact_message(jsonb) to anon, authenticated;


-- =====================================================================
-- SECTION 9 - Minimal legal page shells (not published)
-- =====================================================================

insert into public.legal_pages (
  page_type, title_en, title_ar, content_en, content_ar, status, version
)
values
  ('privacy',  'Privacy Policy',     'سياسة الخصوصية',   '', '', 'draft', '1.0'),
  ('terms',    'Terms & Conditions', 'الشروط والأحكام',  '', '', 'draft', '1.0'),
  ('shipping', 'Shipping Policy',    'سياسة الشحن',      '', '', 'draft', '1.0'),
  ('returns',  'Returns Policy',     'سياسة الاسترجاع',  '', '', 'draft', '1.0')
on conflict (page_type) do nothing;
