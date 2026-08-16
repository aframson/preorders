-- Order fulfilment receipt + public customer reviews.

alter table public.orders
  add column collected_at timestamptz,
  add column collected_by text
    check (collected_by is null or collected_by in ('vendor', 'customer'));

create table public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders on delete cascade,
  vendor_id uuid not null references public.vendors on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  -- First name only; denormalised so anon can read reviews without orders.
  customer_display_name text not null,
  created_at timestamptz not null default now()
);

create index order_reviews_vendor_idx
  on public.order_reviews (vendor_id, created_at desc);

alter table public.order_reviews enable row level security;

-- Public storefront can show ratings; writes go through the service role.
grant select on public.order_reviews to anon, authenticated;
grant all on public.order_reviews to service_role;

create policy order_reviews_public_read on public.order_reviews
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
    )
  );

create policy order_reviews_member_read on public.order_reviews
  for select to authenticated
  using (public.is_vendor_member(vendor_id));
