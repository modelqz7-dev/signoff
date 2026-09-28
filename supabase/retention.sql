-- Nodly: design versions, approval details and client reminders.
-- Run once in Supabase → SQL Editor → New query (after plans.sql). Safe to run again.

-- 1. Order fields: current version, who approved and when, reminder bookkeeping.
alter table public.orders
  add column if not exists version           int not null default 1,
  add column if not exists approved_at       timestamptz,
  add column if not exists approved_by       text,
  add column if not exists status_changed_at timestamptz default now(),
  add column if not exists reminders_sent    int not null default 0,
  add column if not exists last_reminder_at  timestamptz;

-- 2. Every comment belongs to the version it was left on.
alter table public.order_pins
  add column if not exists version int not null default 1;

-- 3. Earlier files of an order. The current file stays in orders.file_url.
create table if not exists public.order_versions (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  version    int  not null,
  file_url   text not null,
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

alter table public.order_versions enable row level security;

drop policy if exists "Shops manage versions of their orders" on public.order_versions;
create policy "Shops manage versions of their orders" on public.order_versions
  for all to authenticated
  using (exists (
    select 1 from public.orders o join public.shops s on s.id = o.shop_id
    where o.id = order_versions.order_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.orders o join public.shops s on s.id = o.shop_id
    where o.id = order_versions.order_id and s.user_id = auth.uid()
  ));

-- 4. Keep status timestamps right whoever changes the status (shop or client portal).
create or replace function public.track_order_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.reminders_sent := 0;
    new.last_reminder_at := null;
    if new.status = 'approved' then
      new.approved_at := now();
    elsif old.status = 'approved' and new.status <> 'prod' then
      new.approved_at := null;
      new.approved_by := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists track_order_status on public.orders;
create trigger track_order_status
  before update on public.orders
  for each row execute function public.track_order_status();

-- Orders approved before this script get their approval date from the creation date.
update public.orders set approved_at = created_at
where status in ('approved', 'prod') and approved_at is null;

notify pgrst, 'reload schema';
