-- Row level security.
--
-- Posture: anonymous visitors get read-only access to published catalogue data
-- and nothing else. Orders, customers and payments are never readable or
-- writable from the client under any role. Every mutation that touches money
-- goes through a server action using the service role, so goods pricing and
-- freight apportionment cannot be tampered with from the browser.
--
-- The order tracking page at /o/[code] is served the same way: the code is a
-- bearer token checked server-side, never an anon SELECT, so the orders table
-- cannot be enumerated.

-- Membership helpers --------------------------------------------------------
-- security definer so that checking membership does not itself re-enter RLS on
-- vendor_members, which would recurse.

create or replace function public.is_vendor_member(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.vendor_members m
     where m.vendor_id = p_vendor_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_drop_member(p_drop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.drops d
      join public.vendor_members m on m.vendor_id = d.vendor_id
     where d.id = p_drop_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_batch_member(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.batches b
      join public.drops d on d.id = b.drop_id
      join public.vendor_members m on m.vendor_id = d.vendor_id
     where b.id = p_batch_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_product_member(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.products p
      join public.drops d on d.id = p.drop_id
      join public.vendor_members m on m.vendor_id = d.vendor_id
     where p.id = p_product_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_order_member(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.orders o
      join public.batches b on b.id = o.batch_id
      join public.drops d on d.id = b.drop_id
      join public.vendor_members m on m.vendor_id = d.vendor_id
     where o.id = p_order_id
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.drop_is_public(p_drop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.drops d
     where d.id = p_drop_id
       and d.published
       and d.archived_at is null
  );
$$;

-- Enable RLS ----------------------------------------------------------------

alter table public.vendors enable row level security;
alter table public.vendor_members enable row level security;
alter table public.drops enable row level security;
alter table public.batches enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.batch_events enable row level security;

-- Vendors -------------------------------------------------------------------
-- The storefront profile is public, but the Paystack subaccount code is not
-- part of the public surface, so anon gets column-level access instead of the
-- whole row.

revoke all on public.vendors from anon;
grant select (
  id, slug, business_name, logo_path, whatsapp_number,
  support_email, payout_verified_at, created_at
) on public.vendors to anon;

create policy vendors_public_read on public.vendors
  for select using (true);

create policy vendors_member_update on public.vendors
  for update to authenticated
  using (public.is_vendor_member(id))
  with check (public.is_vendor_member(id));

-- Vendor creation pairs a vendor row with its first membership row, which has
-- to be atomic, so it happens in a server action under the service role.

-- Vendor members ------------------------------------------------------------

revoke all on public.vendor_members from anon;

create policy vendor_members_read on public.vendor_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_vendor_member(vendor_id));

-- Drops ---------------------------------------------------------------------

create policy drops_public_read on public.drops
  for select using (
    (published and archived_at is null) or public.is_vendor_member(vendor_id)
  );

create policy drops_member_write on public.drops
  for all to authenticated
  using (public.is_vendor_member(vendor_id))
  with check (public.is_vendor_member(vendor_id));

-- Batches -------------------------------------------------------------------
-- Past batches stay readable so a drop can show its delivery track record,
-- which is most of what convinces a stranger to pay a stranger.

create policy batches_public_read on public.batches
  for select using (
    public.drop_is_public(drop_id) or public.is_drop_member(drop_id)
  );

create policy batches_member_write on public.batches
  for all to authenticated
  using (public.is_drop_member(drop_id))
  with check (public.is_drop_member(drop_id));

-- Catalogue -----------------------------------------------------------------

create policy categories_public_read on public.categories
  for select using (
    public.drop_is_public(drop_id) or public.is_drop_member(drop_id)
  );

create policy categories_member_write on public.categories
  for all to authenticated
  using (public.is_drop_member(drop_id))
  with check (public.is_drop_member(drop_id));

create policy products_public_read on public.products
  for select using (
    (published and public.drop_is_public(drop_id))
    or public.is_drop_member(drop_id)
  );

create policy products_member_write on public.products
  for all to authenticated
  using (public.is_drop_member(drop_id))
  with check (public.is_drop_member(drop_id));

create policy product_variants_public_read on public.product_variants
  for select using (
    exists (
      select 1
        from public.products p
       where p.id = product_id
         and p.published
         and public.drop_is_public(p.drop_id)
    )
    or public.is_product_member(product_id)
  );

create policy product_variants_member_write on public.product_variants
  for all to authenticated
  using (public.is_product_member(product_id))
  with check (public.is_product_member(product_id));

create policy product_images_public_read on public.product_images
  for select using (
    exists (
      select 1
        from public.products p
       where p.id = product_id
         and p.published
         and public.drop_is_public(p.drop_id)
    )
    or public.is_product_member(product_id)
  );

create policy product_images_member_write on public.product_images
  for all to authenticated
  using (public.is_product_member(product_id))
  with check (public.is_product_member(product_id));

-- Batch events --------------------------------------------------------------

create policy batch_events_public_read on public.batch_events
  for select using (
    (is_public and public.drop_is_public(
      (select b.drop_id from public.batches b where b.id = batch_id)
    ))
    or public.is_batch_member(batch_id)
  );

create policy batch_events_member_write on public.batch_events
  for all to authenticated
  using (public.is_batch_member(batch_id))
  with check (public.is_batch_member(batch_id));

-- Customers, orders and payments --------------------------------------------
-- Read-only for the vendor who owns them. No client role may write: every
-- insert and status change happens server-side under the service role.

revoke all on public.customers from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.payments from anon, authenticated;

grant select on public.customers to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;

create policy customers_member_read on public.customers
  for select to authenticated
  using (public.is_vendor_member(vendor_id));

create policy orders_member_read on public.orders
  for select to authenticated
  using (public.is_batch_member(batch_id));

create policy order_items_member_read on public.order_items
  for select to authenticated
  using (public.is_order_member(order_id));

create policy payments_member_read on public.payments
  for select to authenticated
  using (public.is_order_member(order_id));
