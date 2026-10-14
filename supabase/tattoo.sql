-- Nodly: tattoo studios as a niche of their own.
-- Run once in Supabase → SQL Editor → New query, after crm.sql. Safe to run again.

alter table public.shops drop constraint if exists shops_niche_check;
alter table public.shops
  add constraint shops_niche_check check (niche in ('smm', 'nails', 'barber', 'tattoo', 'cakes'));
