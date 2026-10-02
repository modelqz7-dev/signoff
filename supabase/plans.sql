-- Nodly: plans, the 7-day Pro trial and the active-order limit.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.

-- 1. Trial end and portal logo on the workshop.
--    Every workshop (new and existing) gets 7 days of Pro from the moment this runs / it is created.
alter table public.shops
  add column if not exists trial_ends_at timestamptz default (now() + interval '7 days'),
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
