-- Order codes are deliberately short, sequential and human-readable
-- (AKO-B3-0007) because vendors and customers say them out loud and search for
-- them. That makes them trivially enumerable, so they must not also be the
-- credential for the no-login tracking page: walking -0001 upward would expose
-- every customer's name, phone, email and delivery address.
--
-- The tracking URL therefore carries its own high-entropy token, while the
-- code stays as the label everyone quotes.

create extension if not exists pgcrypto;

create or replace function public.generate_order_token()
returns text
language sql
volatile
as $$
  -- ~132 bits, URL-safe, no padding.
  select translate(encode(gen_random_bytes(17), 'base64'), '+/=', '-_');
$$;

alter table public.orders
  add column public_token text not null default public.generate_order_token();

create unique index orders_public_token_uniq on public.orders (public_token);
