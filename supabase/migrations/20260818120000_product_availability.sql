-- Product availability: ready-to-ship vs batch preorder.
create type public.product_availability as enum ('preorder', 'in_stock');

alter table public.products
  add column availability public.product_availability not null default 'preorder';

comment on column public.products.availability is
  'preorder = ships with the batch; in_stock = available now from local stock.';
