-- Nodly: the free Studio trial for new workshops is 7 days (was 14).
-- Run once in Supabase → SQL Editor. Workshops that already signed up keep their end date.
alter table public.shops
  alter column trial_ends_at set default (now() + interval '7 days');
