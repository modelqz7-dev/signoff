-- Nodly: daily takings (cash and card) and expenses, for any business.
-- Run once in Supabase → SQL Editor → New query. Safe to run again. Run crm.sql first.

create table if not exists public.crm_ledger_days (
  shop_id uuid not null references public.shops (id) on delete cascade,
  day     date not null,
  cash    numeric(12, 2) not null default 0 check (cash >= 0),
  card    numeric(12, 2) not null default 0 check (card >= 0),
  primary key (shop_id, day)
);

create table if not exists public.crm_expenses (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops (id) on delete cascade,
  day        date not null,
  amount     numeric(12, 2) not null check (amount > 0),
  category   text not null default '' check (char_length(category) <= 40),
  note       text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists crm_expenses_shop_day_idx on public.crm_expenses (shop_id, day);

alter table public.crm_ledger_days enable row level security;
alter table public.crm_expenses enable row level security;

drop policy if exists "Ledger days: own shop" on public.crm_ledger_days;
create policy "Ledger days: own shop" on public.crm_ledger_days
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));

drop policy if exists "Expenses: own shop" on public.crm_expenses;
create policy "Expenses: own shop" on public.crm_expenses
  for all to authenticated
  using (public.owns_shop(shop_id::text)) with check (public.owns_shop(shop_id::text));
