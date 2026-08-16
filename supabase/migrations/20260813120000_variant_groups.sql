-- Multiple option groups per product ----------------------------------------
--
-- `product_variants` already stored one row per (name, value), so a product
-- carrying both "Size 39" and "Colour Black" needs no change here: a group is
-- simply the set of rows sharing a name. What follows is the part that could
-- not be expressed before.
--
-- Customers now pick one value from every group, so an order line points at a
-- set of variants rather than a single one, and a stock cap can belong to a
-- combination ("size 39 in black") rather than to one value.

-- Per-combination stock caps -------------------------------------------------
--
-- Deliberately sparse. Vendors list only the pairs they need to limit; any
-- combination without a row here falls back to the per-value cap and then to
-- the product's own. Enumerating the full cross product would put twenty-four
-- rows in front of someone editing a product on a phone to express one limit.

create table public.product_variant_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  -- One variant per group, sorted. There is no foreign key on an array, so
  -- the trigger below prunes rows when a variant they name is deleted.
  variant_ids uuid[] not null check (array_length(variant_ids, 1) >= 2),
  stock_limit integer not null check (stock_limit >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, variant_ids)
);

create index product_variant_stock_product_idx
  on public.product_variant_stock (product_id);

-- Array equality is order sensitive, so the unique constraint above only means
-- anything if every row is stored in the same order. Normalising here rather
-- than trusting callers keeps that true no matter who writes the row.
create or replace function public.normalise_variant_combination()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select coalesce(array_agg(distinct id order by id), '{}'::uuid[])
    into new.variant_ids
    from unnest(new.variant_ids) as id;
  return new;
end;
$$;

create trigger product_variant_stock_normalise
  before insert or update on public.product_variant_stock
  for each row execute function public.normalise_variant_combination();

-- A cap naming a variant that no longer exists would silently apply to a
-- combination nobody can choose, so it goes when the variant does.
create or replace function public.prune_variant_combinations()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.product_variant_stock
   where product_id = old.product_id
     and old.id = any (variant_ids);
  return old;
end;
$$;

create trigger product_variants_prune_combinations
  after delete on public.product_variants
  for each row execute function public.prune_variant_combinations();

alter table public.product_variant_stock enable row level security;

create policy product_variant_stock_public_read on public.product_variant_stock
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

create policy product_variant_stock_member_write on public.product_variant_stock
  for all to authenticated
  using (public.is_product_member(product_id))
  with check (public.is_product_member(product_id));

-- Order lines carry a set of options ------------------------------------------
--
-- Nothing read `variant_id` for business logic: the manifest groups on the
-- labels in `snapshot`, freight uses the weight and volume copied onto the row,
-- and prices are re-derived from the catalogue at checkout. It is replaced
-- rather than kept alongside so there is one answer to what was ordered.

alter table public.order_items
  add column variant_ids uuid[] not null default '{}'::uuid[];

update public.order_items
   set variant_ids = array[variant_id]
 where variant_id is not null;

alter table public.order_items drop column variant_id;
