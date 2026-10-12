-- Nodly: what kind of post a post is (a single image, a carousel, a Reel or a Story).
-- Run once in Supabase → SQL Editor → New query (after projects.sql). Safe to run again.

alter table public.orders
  add column if not exists format text not null default 'post';

do $$
begin
  alter table public.orders add constraint orders_format_check
    check (format in ('post', 'carousel', 'reels', 'stories'));
exception when duplicate_object then null;
end $$;
