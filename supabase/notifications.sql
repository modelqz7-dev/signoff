-- Nodly: sign-up and notifications setup.
-- Run once in Supabase → SQL Editor → New query. Safe to run again.

-- 1. Notification settings on the workshop.
alter table public.shops
  add column if not exists notify_email      boolean not null default true,
  add column if not exists notify_telegram   boolean not null default true,
  add column if not exists telegram_chat_id  text,
  add column if not exists telegram_link_code text,
  add column if not exists notify_lang       text not null default 'en';

-- 2. Create a workshop for every new account (name comes from the sign-up form).
--    Errors are swallowed so a problem here never blocks sign-up; the app creates the
--    workshop itself on first visit if it is missing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.shops (user_id, name, plan)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'shop_name'), ''), split_part(new.email, '@', 1)),
      'free'
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Let signed-in users create and update their own workshop
--    (fallback creation and the Notifications panel).
drop policy if exists "Users create their own shop" on public.shops;
create policy "Users create their own shop" on public.shops
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users update their own shop" on public.shops;
create policy "Users update their own shop" on public.shops
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 4. Database webhooks (set up in the dashboard, not SQL):
--    Supabase → Database → Webhooks → Create a new hook, twice:
--      a) Name: notify_comment · Table: order_pins · Events: Insert
--      b) Name: notify_status  · Table: orders     · Events: Update
--    For both: Type = HTTP Request, Method = POST,
--      URL = https://<your-site>/api/notify
--      HTTP header: x-webhook-secret = <the same value as NOTIFY_WEBHOOK_SECRET in Vercel>
