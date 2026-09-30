-- Nodly: brand kit for the client portal (Pro).
-- Run once in Supabase → SQL Editor → New query. Safe to run again.
--
-- Adds the workshop's portal settings: brand colour, the theme clients see first,
-- a welcome message and contact links. The site works without these columns
-- (the portal simply uses Nodly's colours), but saving the brand kit needs them.

alter table public.shops add column if not exists brand_color text;          -- '#1e5b3a'
alter table public.shops add column if not exists portal_theme text;         -- 'dark' | 'light' | null (client's choice)
alter table public.shops add column if not exists portal_welcome text;       -- shown on the portal's sign-in screen
alter table public.shops add column if not exists portal_contacts jsonb;     -- { phone, telegram, instagram, website }

-- Keep values sane even if someone writes to the table directly.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'shops_brand_color_hex') then
    alter table public.shops add constraint shops_brand_color_hex
      check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_portal_theme_valid') then
    alter table public.shops add constraint shops_portal_theme_valid
      check (portal_theme is null or portal_theme in ('dark', 'light'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'shops_portal_welcome_len') then
    alter table public.shops add constraint shops_portal_welcome_len
      check (portal_welcome is null or char_length(portal_welcome) <= 500);
  end if;
end $$;

notify pgrst, 'reload schema';
