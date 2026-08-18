-- Stable customer hub link (all of a buyer's orders with one vendor).
-- Email is the durable key; phone remains unique for MoMo / WhatsApp contact.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_portal_token()
returns text
language sql
volatile
as $$
  select translate(encode(extensions.gen_random_bytes(17), 'base64'), '+/=', '-_');
$$;

alter table public.customers
  add column if not exists portal_token text;

update public.customers
   set portal_token = public.generate_portal_token()
 where portal_token is null;

alter table public.customers
  alter column portal_token set default public.generate_portal_token(),
  alter column portal_token set not null;

create unique index if not exists customers_portal_token_uniq
  on public.customers (portal_token);

-- One portal identity per email at a vendor. Lower() so casing never forks accounts.
create unique index if not exists customers_vendor_email_uniq
  on public.customers (vendor_id, lower(email))
  where email is not null and length(trim(email)) > 0;

update public.customers
   set email = lower(trim(email))
 where email is not null;
