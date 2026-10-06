-- Nodly: the workshop's public page (nodly…/@name) and the requests clients leave on it.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.
--
-- The page and its requests belong to the workshop: only its owner reads and edits them.
-- Visitors never touch these tables directly; the site's server shows published pages and
-- saves requests for them.

create table if not exists public.shop_pages (
  shop_id    uuid primary key references public.shops (id) on delete cascade,
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  published  boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.page_requests (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  contact    text not null check (char_length(contact) between 1 and 120),
  message    text not null default '' check (char_length(message) <= 2000),
  files      text[] not null default '{}',
  status     text not null default 'new' check (status in ('new', 'done')),
  order_id   uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists page_requests_shop_idx on public.page_requests (shop_id, created_at desc);

alter table public.shop_pages enable row level security;
alter table public.page_requests enable row level security;

drop policy if exists "Pages: own shop" on public.shop_pages;
create policy "Pages: own shop" on public.shop_pages
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

-- Requests are created by the server only; the owner reads, updates and deletes them.
drop policy if exists "Requests: read own shop" on public.page_requests;
create policy "Requests: read own shop" on public.page_requests
  for select to authenticated using (public.owns_shop(shop_id::text));
drop policy if exists "Requests: update own shop" on public.page_requests;
create policy "Requests: update own shop" on public.page_requests
  for update to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));
drop policy if exists "Requests: delete own shop" on public.page_requests;
create policy "Requests: delete own shop" on public.page_requests
  for delete to authenticated using (public.owns_shop(shop_id::text));

-- Visits per day, for "In the last week" in the dashboard. Counted by the server.
create table if not exists public.page_views (
  shop_id uuid not null references public.shops (id) on delete cascade,
  day     date not null,
  count   integer not null default 0,
  primary key (shop_id, day)
);

alter table public.page_views enable row level security;
drop policy if exists "Views: read own shop" on public.page_views;
create policy "Views: read own shop" on public.page_views
  for select to authenticated using (public.owns_shop(shop_id::text));

create or replace function public.page_view_hit(p_shop uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into page_views (shop_id, day, count) values (p_shop, current_date, 1)
  on conflict (shop_id, day) do update set count = page_views.count + 1;
$$;

revoke all on function public.page_view_hit(uuid) from public, anon, authenticated;
grant execute on function public.page_view_hit(uuid) to service_role;

notify pgrst, 'reload schema';
