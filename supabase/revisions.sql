-- Nodly: answers to the client's comments when a new version is uploaded.
-- Run once in Supabase → SQL Editor → New query (after retention.sql). Safe to run again.
--
-- For each comment on the previous version the workshop says whether it was fixed, with an
-- optional reply; the client sees this next to a before / after view and can reopen it.

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
