-- One-off import of the paper takings book, January and February 2026.
-- Cash = the big figure of the day, card = "терминал". Days off are not entered.
-- Goes into the shop of vampire1x3.cher@gmail.com; stops with an error if there is none.
-- Run ONCE in Supabase → SQL Editor. The days overwrite themselves, but the expenses
-- are added each time, so do not run it twice.

do $$
declare shop uuid;
begin
  select s.id into shop from public.shops s join auth.users u on u.id = s.user_id
    where u.email = 'vampire1x3.cher@gmail.com' order by s.created_at limit 1;
  if shop is null then raise exception 'no shop for this email'; end if;

  insert into public.crm_ledger_days (shop_id, day, cash, card)
  select shop, d.day::date, d.cash, d.card from (values
    ('2026-01-02',1500,380),('2026-01-03',2500,238),('2026-01-04',2500,0),('2026-01-06',2800,213),('2026-01-07',2900,133.20),
    ('2026-01-08',3000,0),('2026-01-09',5000,821),('2026-01-10',6000,120),('2026-01-11',3600,0),('2026-01-13',3500,0),
    ('2026-01-14',3100,0),('2026-01-15',2000,57.40),('2026-01-16',2200,0),('2026-01-17',3000,0),('2026-01-18',2300,0),
    ('2026-01-20',3000,52.30),('2026-01-21',3300,0),('2026-01-22',3600,0),('2026-01-23',6000,0),('2026-01-24',8000,0),
    ('2026-01-25',6000,913.30),('2026-01-27',3300,0),('2026-01-28',1800,0),('2026-01-29',3000,112.70),('2026-01-30',3800,0),
    ('2026-01-31',5000,139.80),
    ('2026-02-01',3000,462.10),('2026-02-03',3500,0),('2026-02-04',2800,314.40),('2026-02-05',2700,113),('2026-02-06',3500,464.50),
    ('2026-02-07',2700,545.50),('2026-02-08',5000,804.60),('2026-02-10',3000,0),('2026-02-11',3000,412.20),('2026-02-12',3500,0),
    ('2026-02-13',2500,591.50),('2026-02-14',3000,926),('2026-02-15',3500,917.20),('2026-02-17',5500,338.90),('2026-02-18',3000,65.50),
    ('2026-02-19',2000,0),('2026-02-20',2800,138),('2026-02-21',4000,429.50),('2026-02-22',3700,467.20),('2026-02-24',4000,120.30),
    ('2026-02-25',4500,0),('2026-02-26',4000,222.40),('2026-02-27',5500,329.30),('2026-02-28',3000,380)
  ) as d(day, cash, card)
  on conflict (shop_id, day) do update set cash = excluded.cash, card = excluded.card;

  insert into public.crm_expenses (shop_id, day, amount, category, note)
  select shop, e.day::date, e.amount, e.cat, e.note from (values
    ('2026-01-13',330,'Other','Списание'),('2026-01-14',93,'Other','Списание'),('2026-01-17',586,'Other','Списание'),
    ('2026-01-22',624,'Other','Списание'),('2026-01-23',180,'Other','Списание'),
    ('2026-01-31',5499.24,'Rent','Аренда + налог'),('2026-01-31',3000,'Other','Бензин'),('2026-01-31',1000,'Other','Бухгалтер'),
    ('2026-02-28',5501.24,'Rent','Аренда + налог'),('2026-02-28',2000,'Other','Бензин'),('2026-02-28',1000,'Other','Бухгалтер')
  ) as e(day, amount, cat, note);
end $$;
