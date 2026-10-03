-- Nodly: billing through Paddle.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.

-- 1. The workshop's Paddle customer and subscription, written by /api/paddle/webhook.
alter table public.shops
  add column if not exists paddle_customer_id     text,
  add column if not exists paddle_subscription_id text,
  add column if not exists subscription_status    text,
  add column if not exists current_period_end     timestamptz;

create index if not exists shops_paddle_subscription_idx on public.shops (paddle_subscription_id);

-- 2. Only the server (after Paddle confirms a payment) may change the plan, the trial and the
--    billing fields. Requests from the browser run as "authenticated"; the SQL editor and the
--    service role are not affected.
create or replace function public.protect_shop_billing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.plan := 'free';
    new.trial_ends_at := now() + interval '7 days';
    new.paddle_customer_id := null;
    new.paddle_subscription_id := null;
    new.subscription_status := null;
    new.current_period_end := null;
    return new;
  end if;
  if new.plan is distinct from old.plan
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.paddle_customer_id is distinct from old.paddle_customer_id
     or new.paddle_subscription_id is distinct from old.paddle_subscription_id
     or new.subscription_status is distinct from old.subscription_status
     or new.current_period_end is distinct from old.current_period_end then
    raise exception 'plan_locked: the plan changes only through billing' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_shop_billing on public.shops;
create trigger protect_shop_billing
  before insert or update on public.shops
  for each row execute function public.protect_shop_billing();

notify pgrst, 'reload schema';
