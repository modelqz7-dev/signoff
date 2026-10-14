-- Clients' own accounts: they sign in with Telegram (through the Nodly bot), see their
-- bookings and leave reviews for visits they really had. Run once in the Supabase SQL Editor.
-- Only the server (service key) reads and writes these tables.

create table if not exists public.client_accounts (
  id         uuid primary key default gen_random_uuid(),
  tg_id      bigint not null unique,
  name       text not null default '' check (char_length(name) <= 120),
  username   text not null default '' check (char_length(username) <= 64),
  -- the chat with the bot: booking confirmations go there
  chat_id    text,
  created_at timestamptz not null default now()
);
alter table public.client_accounts enable row level security;

-- one sign-in attempt: the site makes a token, the bot fills in who confirmed it
create table if not exists public.client_logins (
  token      text primary key,
  account_id uuid references public.client_accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.client_logins enable row level security;

-- a review written by a signed-in client after a visit
alter table public.page_reviews add column if not exists client_account_id uuid references public.client_accounts (id) on delete set null;
alter table public.page_reviews add column if not exists verified boolean not null default false;
create unique index if not exists page_reviews_one_per_client on public.page_reviews (shop_id, client_account_id) where client_account_id is not null;

-- a client's bookings are found by the account id kept in the booking's details
create index if not exists crm_bookings_account_idx on public.crm_bookings ((details->>'account'));

notify pgrst, 'reload schema';
