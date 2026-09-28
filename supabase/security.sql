-- Nodly: lock the database down.
-- Run once in Supabase → SQL Editor → New query, AFTER the matching site update is deployed
-- (the portal must already go through /api/portal/*). Safe to run again.
--
-- After this:
--   • signed-in workshops see and change only their own shop, orders, comments and files;
--   • portal visitors (anonymous) can't read or write any table or file directly — the site's
--     server does it for them after checking the order password;
--   • order files are private and opened through short-lived signed links;
--   • avatars and portal logos live in a separate public bucket.

-- 1. Hashed portal passwords (the plain column is emptied as clients log in / shops change it).
alter table public.orders add column if not exists password_hash text;

-- 2. Start from a clean slate: drop every existing policy on Nodly's tables and on storage.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where (schemaname = 'public' and tablename in
            ('shops', 'orders', 'order_pins', 'order_versions', 'pins', 'approvals', 'drawings'))
       or (schemaname = 'storage' and tablename = 'objects')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3. Row level security on every table (old unused tables stay fully closed).
do $$
declare t text;
begin
  foreach t in array array['shops', 'orders', 'order_pins', 'order_versions', 'pins', 'approvals', 'drawings'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- Is this shop / order the signed-in user's? (security definer: avoids recursive policy checks)
-- Ids are compared as text so this works whatever type the id columns have.
create or replace function public.owns_shop(shop text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shops where id::text = shop and user_id = auth.uid())
$$;

create or replace function public.owns_order(ord text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from orders o join shops s on s.id = o.shop_id
    where o.id::text = ord and s.user_id = auth.uid()
  )
$$;

-- shops: your own only
create policy "Shops: read own" on public.shops
  for select to authenticated using (user_id = auth.uid());
create policy "Shops: create own" on public.shops
  for insert to authenticated with check (user_id = auth.uid());
create policy "Shops: update own" on public.shops
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: all actions on your shop's orders
create policy "Orders: own shop" on public.orders
  for all to authenticated using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

-- comments: all actions on comments of your orders
create policy "Comments: own orders" on public.order_pins
  for all to authenticated using (public.owns_order(order_id::text)) with check (public.owns_order(order_id::text));

-- versions: all actions on versions of your orders
do $$
begin
  if to_regclass('public.order_versions') is not null then
    execute 'create policy "Versions: own orders" on public.order_versions
      for all to authenticated using (public.owns_order(order_id::text)) with check (public.owns_order(order_id::text))';
  end if;
end $$;

-- 4. Storage: private order files, public avatars / logos. Files sit in "<shop id>/…" folders.
update storage.buckets set public = false where id = 'order-files';
insert into storage.buckets (id, name, public) values ('public-assets', 'public-assets', true)
  on conflict (id) do update set public = true;

create policy "Files: read own shop" on storage.objects
  for select to authenticated
  using (bucket_id in ('order-files', 'public-assets') and public.owns_shop((storage.foldername(name))[1]));
create policy "Files: upload to own shop" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('order-files', 'public-assets') and public.owns_shop((storage.foldername(name))[1]));
create policy "Files: update own shop" on storage.objects
  for update to authenticated
  using (bucket_id in ('order-files', 'public-assets') and public.owns_shop((storage.foldername(name))[1]));
create policy "Files: delete own shop" on storage.objects
  for delete to authenticated
  using (bucket_id in ('order-files', 'public-assets') and public.owns_shop((storage.foldername(name))[1]));

notify pgrst, 'reload schema';
