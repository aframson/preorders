-- Preorder batch platform: core schema.
--
-- Money is always an integer number of pesewas. Freight units are stored in
-- the smallest sensible unit (grams for air, cubic centimetres for sea) so
-- repeated summing never accumulates floating point drift; conversion to kg or
-- CBM happens only at the point of display or pricing.

create extension if not exists citext;

-- Enums ---------------------------------------------------------------------

create type freight_mode as enum ('air_kg', 'sea_cbm');

create type batch_status as enum (
  'scheduled',
  'open',
  'closed',
  'purchasing',
  'in_transit',
  'arrived',
  'freight_invoiced',
  'settled'
);

create type order_status as enum (
  'pending_payment',
  'paid',
  'purchased',
  'in_transit',
  'awaiting_freight',
  'freight_paid',
  'collected',
  'cancelled'
);

create type payment_type as enum ('goods', 'freight');

create type payment_status as enum (
  'pending',
  'success',
  'failed',
  'abandoned',
  'refunded'
);

create type vendor_role as enum ('owner', 'staff');

create type fulfilment_method as enum ('pickup', 'delivery');

-- Shared triggers -----------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Vendors -------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  business_name text not null,
  logo_path text,
  whatsapp_number text,
  support_email text,
  -- Paystack subaccount, so goods payments settle straight to the vendor.
  paystack_subaccount_code text,
  payout_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);

create trigger vendors_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

create table public.vendor_members (
  vendor_id uuid not null references public.vendors on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role vendor_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (vendor_id, user_id)
);

create index vendor_members_user_idx on public.vendor_members (user_id);

-- Drops ---------------------------------------------------------------------
-- The permanent shareable link. A vendor pastes this into a WhatsApp bio once
-- and it keeps resolving to whichever batch is currently open, so the slug is
-- effectively immutable in practice.

create table public.drops (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  slug citext not null,
  title text not null,
  description text,
  cover_path text,
  default_freight_mode freight_mode not null default 'sea_cbm',
  published boolean not null default false,
  archived_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, slug),
  constraint drops_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$')
);

create trigger drops_updated_at
  before update on public.drops
  for each row execute function public.set_updated_at();

-- Batches -------------------------------------------------------------------

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops on delete cascade,
  number integer not null check (number > 0),
  status batch_status not null default 'scheduled',

  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  expected_delivery_at timestamptz,
  closed_at timestamptz,
  auto_open_next boolean not null default true,

  freight_mode freight_mode not null,
  -- Pesewas per kg (air) or per CBM (sea). Quoted to customers as an estimate
  -- at checkout, before the real freight bill exists.
  freight_rate_estimate integer not null default 0
    check (freight_rate_estimate >= 0),
  -- What the vendor actually charges the batch, entered on arrival. May carry
  -- a margin over the forwarder invoice; that is the vendor's call.
  freight_total_actual integer check (freight_total_actual >= 0),
  freight_units_total bigint check (freight_units_total >= 0),
  freight_finalised_at timestamptz,

  -- Trigger.dev run that will close this batch, so moving the cutoff can
  -- cancel and re-trigger rather than double-closing.
  cutoff_run_id text,
  -- Per-batch counter behind the human order code.
  order_seq integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (drop_id, number),
  constraint batches_window check (closes_at > opens_at)
);

-- Exactly one batch per drop may be accepting orders at a time.
create unique index one_open_batch_per_drop
  on public.batches (drop_id)
  where status = 'open';

create index batches_drop_idx on public.batches (drop_id, number desc);
create index batches_closes_at_idx on public.batches (closes_at)
  where status = 'open';

create trigger batches_updated_at
  before update on public.batches
  for each row execute function public.set_updated_at();

-- Catalogue -----------------------------------------------------------------
-- Products belong to the drop, not to a batch, so the catalogue survives
-- across cycles and a returning customer sees a familiar shop.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index categories_drop_idx on public.categories (drop_id, position);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops on delete cascade,
  category_id uuid references public.categories on delete set null,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  -- Nullable while drafting, but a batch cannot open until every published
  -- product carries the dimension its freight mode needs. See
  -- assert_batch_freightable below.
  weight_grams integer check (weight_grams >= 0),
  volume_cm3 integer check (volume_cm3 >= 0),
  stock_limit integer check (stock_limit >= 0),
  moq integer not null default 1 check (moq > 0),
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_drop_idx on public.products (drop_id, position);
create index products_category_idx on public.products (category_id);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  name text not null,
  value text not null,
  price_delta integer not null default 0,
  weight_grams integer check (weight_grams >= 0),
  volume_cm3 integer check (volume_cm3 >= 0),
  stock_limit integer check (stock_limit >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name, value)
);

create index product_variants_product_idx
  on public.product_variants (product_id, position);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  -- Low quality placeholder, so a 40-image grid on metered data does not
  -- render as a wall of empty boxes.
  blurhash text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx
  on public.product_images (product_id, position);

-- Customers and orders ------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, phone)
);

create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches on delete restrict,
  customer_id uuid not null references public.customers on delete restrict,
  -- Human, quotable in a WhatsApp message: AKO-B3-0142
  code text not null unique,
  status order_status not null default 'pending_payment',

  goods_total integer not null default 0 check (goods_total >= 0),
  goods_paid_at timestamptz,

  freight_units bigint not null default 0 check (freight_units >= 0),
  freight_estimate integer not null default 0 check (freight_estimate >= 0),
  freight_amount integer check (freight_amount >= 0),
  freight_invoiced_at timestamptz,
  freight_paid_at timestamptz,

  fulfilment fulfilment_method not null default 'pickup',
  delivery_note text,
  -- Releases a squatted slot when the goods payment never lands.
  hold_expires_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_batch_idx on public.orders (batch_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id);
create index orders_hold_idx on public.orders (hold_expires_at)
  where status = 'pending_payment';

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  -- Products may be edited or removed later; the order must stay readable.
  product_id uuid references public.products on delete set null,
  variant_id uuid references public.product_variants on delete set null,
  qty integer not null check (qty > 0),
  unit_price integer not null check (unit_price >= 0),
  weight_grams integer not null default 0 check (weight_grams >= 0),
  volume_cm3 integer not null default 0 check (volume_cm3 >= 0),
  -- Name, image and variant labels as they were at order time. Prices and
  -- dimensions both change between batches.
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  type payment_type not null,
  provider text not null default 'paystack',
  provider_ref text not null,
  amount integer not null check (amount >= 0),
  status payment_status not null default 'pending',
  raw jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Paystack retries webhooks, so reconciliation must be idempotent.
create unique index payments_provider_ref_uniq
  on public.payments (provider, provider_ref);

create index payments_order_idx on public.payments (order_id);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Public timeline shown to customers on the order tracking page.
create table public.batch_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches on delete cascade,
  type text not null,
  message text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index batch_events_batch_idx
  on public.batch_events (batch_id, created_at desc);

-- Order codes ---------------------------------------------------------------

-- UPDATE ... RETURNING takes a row lock, so concurrent checkouts on the same
-- batch cannot be handed the same sequence number.
create or replace function public.next_order_code(p_batch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
  v_number integer;
  v_prefix text;
begin
  update public.batches
     set order_seq = order_seq + 1
   where id = p_batch_id
  returning order_seq, number into v_seq, v_number;

  if v_seq is null then
    raise exception 'Batch % not found', p_batch_id;
  end if;

  select upper(left(regexp_replace(v.slug::text, '[^a-zA-Z0-9]', '', 'g'), 3))
    into v_prefix
    from public.batches b
    join public.drops d on d.id = b.drop_id
    join public.vendors v on v.id = d.vendor_id
   where b.id = p_batch_id;

  return format(
    '%s-B%s-%s',
    coalesce(nullif(v_prefix, ''), 'PRE'),
    v_number,
    lpad(v_seq::text, 4, '0')
  );
end;
$$;

-- Freight readiness ---------------------------------------------------------

-- A batch that opens with un-costable products cannot be freighted at cutoff,
-- by which point customers have already paid. Block it at the door instead.
create or replace function public.assert_batch_freightable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_missing integer;
begin
  if new.status <> 'open' or (tg_op = 'UPDATE' and old.status = 'open') then
    return new;
  end if;

  select count(*)
    into v_missing
    from public.products p
   where p.drop_id = new.drop_id
     and p.published
     and case new.freight_mode
           when 'air_kg' then p.weight_grams is null
           when 'sea_cbm' then p.volume_cm3 is null
         end;

  if v_missing > 0 then
    raise exception
      'Cannot open batch: % published product(s) are missing the % measurement',
      v_missing,
      case new.freight_mode when 'air_kg' then 'weight' else 'volume' end
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger batches_assert_freightable
  before insert or update of status on public.batches
  for each row execute function public.assert_batch_freightable();
