-- Nodly: limits for the client portal that hold across every server instance.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.
--
-- Used for:
--   • password guessing: 10 wrong passwords per visitor and order, then a 15-minute pause;
--   • spam: how fast a portal visitor can add pins and write messages.
-- Until this is run the site falls back to a per-instance memory counter (weaker, still works).

create table if not exists public.portal_limits (
  key text primary key,
  count integer not null default 0,
  until timestamptz not null
);

-- Closed to visitors and workshops: only the site's server (service role) touches it.
alter table public.portal_limits enable row level security;
revoke all on public.portal_limits from anon, authenticated;

-- Counts one hit for `p_key` in a window of `p_window_seconds` and returns the count so far.
create or replace function public.portal_limit_hit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  hits integer;
begin
  insert into portal_limits as l (key, count, until)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when l.until < now() then 1 else l.count + 1 end,
    until = case when l.until < now() then excluded.until else l.until end
  returning l.count into hits;

  -- Tidy up old counters now and then.
  if random() < 0.02 then
    delete from portal_limits where until < now() - interval '1 day';
  end if;
  return hits;
end;
$$;

revoke all on function public.portal_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.portal_limit_hit(text, integer) to service_role;

notify pgrst, 'reload schema';
