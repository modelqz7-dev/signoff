-- Nodly: a short conversation inside each pin.
-- Run once in Supabase → SQL Editor → New query (after revisions.sql). Safe to run again.
--
-- Everything about one spot on the design lives in its pin: the client's comment, then
-- messages from both sides. The workshop can attach a file and mark the spot fixed; a client
-- message on a fixed pin opens it again.

create table if not exists public.pin_messages (
  id          uuid primary key default gen_random_uuid(),
  pin_id      uuid not null references public.order_pins(id) on delete cascade,
  order_id    uuid not null references public.orders(id) on delete cascade,
  author_role text not null check (author_role in ('client', 'workshop')),
  author_name text not null default '',
  body        text not null default '' check (char_length(body) <= 2000),
  file_url    text,
  marks_fixed boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists pin_messages_order_idx on public.pin_messages (order_id, created_at);

alter table public.pin_messages enable row level security;

-- The workshop reads and writes messages on its own orders; the portal goes through the server.
drop policy if exists "Shops manage messages on their orders" on public.pin_messages;
create policy "Shops manage messages on their orders" on public.pin_messages
  for all to authenticated
  using (exists (
    select 1 from public.orders o join public.shops s on s.id = o.shop_id
    where o.id = pin_messages.order_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.orders o join public.shops s on s.id = o.shop_id
    where o.id = pin_messages.order_id and s.user_id = auth.uid()
  ));

-- Live updates on the order page.
do $$
begin
  alter publication supabase_realtime add table public.pin_messages;
exception when others then null;
end $$;

-- Answers written before conversations become their first message.
insert into public.pin_messages (pin_id, order_id, author_role, author_name, body, file_url, marks_fixed, created_at)
select p.id, p.order_id, 'workshop', coalesce(s.name, ''), coalesce(p.reply, ''), p.reply_file_url,
       p.fix_status = 'fixed', now()
from public.order_pins p
join public.orders o on o.id = p.order_id
join public.shops s on s.id = o.shop_id
where (p.reply is not null or p.reply_file_url is not null)
  and not exists (select 1 from public.pin_messages m where m.pin_id = p.id);

notify pgrst, 'reload schema';
