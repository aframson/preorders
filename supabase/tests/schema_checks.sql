-- Verification for the constraints that protect money and freight.
-- Run against the local stack:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -f supabase/tests/schema_checks.sql

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_vendor uuid;
  v_drop uuid;
  v_batch uuid;
  v_code_a text;
  v_code_b text;
begin
  insert into public.vendors (slug, business_name)
  values ('akosua', 'Akosua Imports')
  returning id into v_vendor;

  insert into public.drops (vendor_id, slug, title, published)
  values (v_vendor, 'winter-shoes', 'Winter Shoes', true)
  returning id into v_drop;

  -- Fully measured.
  insert into public.products (drop_id, name, price, weight_grams, volume_cm3)
  values (v_drop, 'Sneakers', 36000, 900, 12000);

  -- Weight only: cannot be costed on a sea batch.
  insert into public.products (drop_id, name, price, weight_grams)
  values (v_drop, 'Cargo trousers', 12000, 400);

  -- 1. A sea batch must refuse to open while a product has no volume.
  begin
    insert into public.batches (drop_id, number, closes_at, freight_mode, status)
    values (v_drop, 1, now() + interval '7 days', 'sea_cbm', 'open');
    raise exception 'FAIL 1: sea batch opened with an unmeasured product';
  exception
    when check_violation then
      raise notice 'PASS 1: sea batch blocked (%)', sqlerrm;
  end;

  -- 2. The same batch as air freight is fine, because both have a weight.
  insert into public.batches (drop_id, number, closes_at, freight_mode, status)
  values (v_drop, 1, now() + interval '7 days', 'air_kg', 'open')
  returning id into v_batch;
  raise notice 'PASS 2: air batch opened';

  -- 3. Only one batch per drop may accept orders at a time.
  begin
    insert into public.batches (drop_id, number, closes_at, freight_mode, status)
    values (v_drop, 2, now() + interval '30 days', 'air_kg', 'open');
    raise exception 'FAIL 3: a second batch opened on the same drop';
  exception
    when unique_violation then
      raise notice 'PASS 3: one open batch per drop enforced';
  end;

  -- 4. A scheduled next batch is allowed alongside the open one.
  insert into public.batches (drop_id, number, closes_at, freight_mode, status)
  values (v_drop, 2, now() + interval '30 days', 'air_kg', 'scheduled');
  raise notice 'PASS 4: next batch can be scheduled while one is open';

  -- 5. Order codes are sequential, human and quotable in a WhatsApp message.
  v_code_a := public.next_order_code(v_batch);
  v_code_b := public.next_order_code(v_batch);

  if v_code_a <> 'AKO-B1-0001' or v_code_b <> 'AKO-B1-0002' then
    raise exception 'FAIL 5: unexpected order codes % and %', v_code_a, v_code_b;
  end if;
  raise notice 'PASS 5: order codes % then %', v_code_a, v_code_b;

  -- 6. Closing window must be sane.
  begin
    insert into public.batches (drop_id, number, opens_at, closes_at, freight_mode)
    values (v_drop, 3, now(), now() - interval '1 day', 'air_kg');
    raise exception 'FAIL 6: batch accepted a cutoff before it opened';
  exception
    when check_violation then
      raise notice 'PASS 6: cutoff must come after opening';
  end;
end $$;

rollback;

-- RLS: anonymous visitors must not be able to touch orders at all.
do $$
begin
  set local role anon;
  perform 1 from public.orders limit 1;
  reset role;
  raise exception 'FAIL 7: anon could read orders';
exception
  when insufficient_privilege then
    reset role;
    raise notice 'PASS 7: anon blocked from orders';
end $$;

do $$
begin
  set local role anon;
  perform 1 from public.payments limit 1;
  reset role;
  raise exception 'FAIL 8: anon could read payments';
exception
  when insufficient_privilege then
    reset role;
    raise notice 'PASS 8: anon blocked from payments';
end $$;

do $$
begin
  set local role anon;
  perform 1 from public.customers limit 1;
  reset role;
  raise exception 'FAIL 9: anon could read customers';
exception
  when insufficient_privilege then
    reset role;
    raise notice 'PASS 9: anon blocked from customers';
end $$;
