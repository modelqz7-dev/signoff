-- Nodly: projects, a Notion-like page of posts.
-- Run once in Supabase → SQL Editor → New query (after update.sql). Safe to run again (needs Postgres 14+ for create or replace trigger).
--
-- A project is an order with kind = 'project'. Its posts are orders too (kind = 'post',
-- project_id = the project), so each post keeps everything a single order has: versions, pins,
-- threads, approval, certificate. Single orders made before projects stay kind = 'single'.

-- 1. What an order is, which project a post belongs to, and the post's own fields.
alter table public.orders
  add column if not exists kind       text not null default 'single',
  add column if not exists project_id uuid references public.orders(id) on delete cascade,
  add column if not exists caption    text not null default '',
  add column if not exists publish_on date,
  add column if not exists position   double precision not null default 0;

do $$
begin
  alter table public.orders add constraint orders_kind_check check (kind in ('single', 'project', 'post'));
exception when duplicate_object then null;
end $$;

do $$
begin
  -- a post always sits in a project; nothing else does
  alter table public.orders add constraint orders_post_project_check
    check ((kind = 'post') = (project_id is not null));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orders add constraint orders_caption_length check (char_length(caption) <= 2200);
exception when duplicate_object then null;
end $$;

create index if not exists orders_project_idx on public.orders (project_id, position) where project_id is not null;

-- 2. A post must belong to a project of the same shop.
create or replace function public.check_post_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'post' then
    if not exists (
      select 1 from orders p where p.id = new.project_id and p.kind = 'project' and p.shop_id = new.shop_id
    ) then
      raise exception 'post_project: a post must belong to a project of the same shop' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;

create or replace trigger check_post_project
  before insert or update of kind, project_id, shop_id on public.orders
  for each row execute function public.check_post_project();

-- 3. The plan limit counts projects and single orders, not the posts inside a project.
create or replace function public.enforce_order_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare shop_plan text; trial_end timestamptz; max_active int; active int;
begin
  if new.kind = 'post' then return new; end if;
  select lower(coalesce(plan, 'free')), trial_ends_at into shop_plan, trial_end
  from shops where id = new.shop_id;
  if not found or (trial_end is not null and trial_end > now()) then return new; end if;
  max_active := case shop_plan when 'free' then 3 when 'go' then 25 else null end;
  if max_active is null then return new; end if;
  select count(*) into active from orders
  where shop_id = new.shop_id and kind <> 'post' and status in ('await', 'changes');
  if active >= max_active then
    raise exception 'plan_limit: the % plan allows % active orders', shop_plan, max_active
      using errcode = 'P0001';
  end if;
  return new;
end; $$;

-- 4. A project's status follows its posts: any post with changes → changes; every post
--    approved (or in production) → approved; otherwise awaiting.
create or replace function public.roll_up_project_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare pid uuid; total int; done int; changing int; next_status text;
begin
  if coalesce(new.kind, old.kind) <> 'post' then return null; end if;
  -- a post moved between projects updates both
  foreach pid in array array_remove(array[new.project_id, old.project_id], null) loop
    select count(*),
           count(*) filter (where status in ('approved', 'prod')),
           count(*) filter (where status = 'changes')
      into total, done, changing
    from orders where project_id = pid;
    next_status := case
      when changing > 0 then 'changes'
      when total > 0 and done = total then 'approved'
      else 'await'
    end;
    update orders set status = next_status where id = pid and status is distinct from next_status;
  end loop;
  return null;
end; $$;

create or replace trigger roll_up_project_status
  after insert or delete or update of status, project_id on public.orders
  for each row execute function public.roll_up_project_status();

-- 5. The project's free canvas (blocks, posts, notes and the paths between them), saved as one
--    document: { nodes, edges }. Posts on it point at their post orders by id.
alter table public.orders add column if not exists board jsonb;
