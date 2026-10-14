-- Nodly CRM: the niche a business works in, its services, its clients and their bookings.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.
--
-- A booking is either an appointment at a time (nails, barbershop) or an order for a date
-- (cakes). Everything here belongs to the shop: only its owner reads and changes it.

-- Is this shop the signed-in user's? Same as in security.sql, repeated so this file runs on its own.
create or replace function public.owns_shop(shop text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from shops where id::text = shop and user_id = auth.uid())
$$;

-- What the business does; picks its dashboard. Empty until chosen; 'smm' for the approvals side.
alter table public.shops
  add column if not exists niche text check (niche in ('smm', 'nails', 'barber', 'tattoo', 'cakes'));
-- Online booking: working days and hours, slot step, how far ahead clients can book (lib/booking.ts).
-- Clients book on the shop's public page (/@name); the site's server checks the time and saves it.
alter table public.shops
  add column if not exists booking jsonb not null default '{}'::jsonb;

create table if not exists public.crm_services (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 120),
  -- 'appointment': booked for a time; 'order': made for a date
  kind         text not null default 'appointment' check (kind in ('appointment', 'order')),
  duration_min integer check (duration_min is null or duration_min between 5 and 1440),
  price        numeric(12, 2) check (price is null or price >= 0),
  -- "from 600 / kg": the price is a starting point
  price_from   boolean not null default false,
  unit         text not null default '' check (char_length(unit) <= 20),
  position     integer not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists crm_services_shop_idx on public.crm_services (shop_id, position);

create table if not exists public.crm_clients (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  phone      text not null default '' check (char_length(phone) <= 40),
  telegram   text not null default '' check (char_length(telegram) <= 64),
  instagram  text not null default '' check (char_length(instagram) <= 64),
  notes      text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists crm_clients_shop_idx on public.crm_clients (shop_id, name);

create table if not exists public.crm_bookings (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  client_id    uuid references public.crm_clients (id) on delete set null,
  service_id   uuid references public.crm_services (id) on delete set null,
  kind         text not null default 'appointment' check (kind in ('appointment', 'order')),
  -- the service's name when booked, so renaming a service keeps the history readable
  title        text not null default '' check (char_length(title) <= 160),
  -- appointments: when it starts and how long it takes
  starts_at    timestamptz,
  duration_min integer check (duration_min is null or duration_min between 5 and 1440),
  -- orders: the day (and optional time) it's picked up or delivered
  due_on       date,
  due_time     text not null default '' check (char_length(due_time) <= 5),
  status       text not null default 'booked' check (status in (
                 'booked', 'done', 'no_show',                       -- appointments
                 'new', 'confirmed', 'in_progress', 'ready', 'delivered', -- orders
                 'cancelled')),
  price        numeric(12, 2) check (price is null or price >= 0),
  prepaid      numeric(12, 2) check (prepaid is null or prepaid >= 0),
  -- the order's form: weight, filling, inscription, delivery and so on
  details      jsonb not null default '{}'::jsonb,
  staff        text not null default '' check (char_length(staff) <= 80),
  notes        text not null default '' check (char_length(notes) <= 2000),
  created_at   timestamptz not null default now(),
  check (kind <> 'appointment' or starts_at is not null),
  check (kind <> 'order' or due_on is not null)
);
create index if not exists crm_bookings_shop_start_idx on public.crm_bookings (shop_id, starts_at);
create index if not exists crm_bookings_shop_due_idx on public.crm_bookings (shop_id, due_on);
create index if not exists crm_bookings_client_idx on public.crm_bookings (client_id);

alter table public.crm_services enable row level security;
alter table public.crm_clients enable row level security;
alter table public.crm_bookings enable row level security;

drop policy if exists "CRM services: own shop" on public.crm_services;
create policy "CRM services: own shop" on public.crm_services
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

drop policy if exists "CRM clients: own shop" on public.crm_clients;
create policy "CRM clients: own shop" on public.crm_clients
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

drop policy if exists "CRM bookings: own shop" on public.crm_bookings;
create policy "CRM bookings: own shop" on public.crm_bookings
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

-- A booking may only point at a client and a service of the same shop.
create or replace function public.crm_booking_same_shop()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is not null and not exists (
    select 1 from crm_clients where id = new.client_id and shop_id = new.shop_id) then
    raise exception 'client belongs to another shop';
  end if;
  if new.service_id is not null and not exists (
    select 1 from crm_services where id = new.service_id and shop_id = new.shop_id) then
    raise exception 'service belongs to another shop';
  end if;
  return new;
end $$;

drop trigger if exists crm_booking_same_shop on public.crm_bookings;
create trigger crm_booking_same_shop
  before insert or update on public.crm_bookings
  for each row execute function public.crm_booking_same_shop();
