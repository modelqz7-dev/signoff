-- Nodly: everything the current site needs on top of the base tables, in one go.
-- Supabase → SQL Editor → New query → paste all of this → Run. Safe to run again.
--
-- It is plans.sql, retention.sql, branding.sql and revisions.sql in the right order:
--   • portal logo and trial date on the workshop (fixes "Could not find the 'logo_url' column");
--   • design versions, approval date and client reminders on orders;
--   • the portal's welcome message and contacts;
--   • the workshop's answers to the client's comments, with a file.
-- security.sql is separate on purpose: it rewrites access rules, run it on its own.

-- ════════════ supabase/plans.sql ════════════

-- Nodly: plans, the 14-day Pro trial and the active-order limit.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.

-- 1. Trial end and portal logo on the workshop.
--    Every workshop (new and existing) gets 14 days of Pro from the moment this runs / it is created.
alter table public.shops
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days'),
  add column if not exists logo_url      text;

-- 2. Refuse new orders over the plan's active-order limit (orders awaiting review or with
--    changes requested). Keep the numbers in sync with src/lib/plans.ts.
create or replace function public.enforce_order_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shop_plan text;
  trial_end timestamptz;
  max_active int;
  active int;
begin
  select lower(coalesce(plan, 'free')), trial_ends_at into shop_plan, trial_end
  from shops where id = new.shop_id;

  if not found or (trial_end is not null and trial_end > now()) then
    return new;
  end if;

  max_active := case shop_plan when 'free' then 3 when 'go' then 25 else null end;
  if max_active is null then
    return new;
  end if;

  select count(*) into active
  from orders
  where shop_id = new.shop_id and status in ('await', 'changes');

  if active >= max_active then
    raise exception 'plan_limit: the % plan allows % active orders', shop_plan, max_active
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_order_limit on public.orders;
create trigger enforce_order_limit
  before insert on public.orders
  for each row execute function public.enforce_order_limit();

notify pgrst, 'reload schema';

-- ════════════ supabase/retention.sql ════════════

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

-- ════════════ supabase/branding.sql ════════════

-- Nodly: brand kit for the client portal (Pro).
-- Run once in Supabase → SQL Editor → New query. Safe to run again.
--
-- Adds the workshop's portal settings: a welcome message and contact links.
-- (brand_color and portal_theme are no longer used by the app; they stay harmless.) The site works without these columns
-- (the portal simply uses Nodly's colours), but saving the brand kit needs them.

alter table public.shops add column if not exists brand_color text;          -- '#1e5b3a'
alter table public.shops add column if not exists portal_theme text;         -- 'dark' | 'light' | null (client's choice)
alter table public.shops add column if not exists portal_welcome text;       -- shown on the portal's sign-in screen
alter table public.shops add column if not exists portal_contacts jsonb;     -- { phone, telegram, instagram, website }

-- Keep values sane even if someone writes to the table directly.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_brand_color_hex') then
    alter table public.shops add constraint shops_brand_color_hex
      check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_portal_theme_valid') then
    alter table public.shops add constraint shops_portal_theme_valid
      check (portal_theme is null or portal_theme in ('dark', 'light'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_portal_welcome_len') then
    alter table public.shops add constraint shops_portal_welcome_len
      check (portal_welcome is null or char_length(portal_welcome) <= 500);
  end if;
end $$;

notify pgrst, 'reload schema';


-- ════════════ supabase/revisions.sql ════════════

-- Nodly: answers to the client's comments when a new version is uploaded.
-- Run once in Supabase → SQL Editor → New query (after retention.sql). Safe to run again.
--
-- For each comment the workshop says whether it was fixed, with an optional note and file
-- (a photo or render of the fix); the client opens it from the pin and can reopen it.

alter table public.order_pins
  add column if not exists fix_status       text,  -- 'fixed' | 'kept' | 'reopened' | null (no answer yet)
  add column if not exists reply            text,  -- the workshop's note to the client
  add column if not exists answered_version int;   -- the version the answer came with

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_pins_fix_status_valid') then
    alter table public.order_pins add constraint order_pins_fix_status_valid
      check (fix_status is null or fix_status in ('fixed', 'kept', 'reopened'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_pins_reply_len') then
    alter table public.order_pins add constraint order_pins_reply_len
      check (reply is null or char_length(reply) <= 1000);
  end if;
end $$;

notify pgrst, 'reload schema';

-- A file attached to the answer: a photo or render of the fix, opened from the pin.
alter table public.order_pins add column if not exists reply_file_url text;
notify pgrst, 'reload schema';
