-- Local development fixtures, applied automatically by `supabase db reset`.
--
-- Creates a signed-up vendor with an open batch and a small catalogue, so the
-- public link, checkout and freight settlement can all be exercised without
-- walking onboarding again after every reset.
--
-- Sign in at /login with akosua@example.com and read the one-time code out of
-- Mailpit on http://127.0.0.1:54324.

do $$
declare
  v_user_id uuid := '11111111-1111-4111-8111-111111111111';
  v_vendor_id uuid := '22222222-2222-4222-8222-222222222222';
  v_drop_id uuid := '33333333-3333-4333-8333-333333333333';
  v_batch_id uuid := '44444444-4444-4444-8444-444444444444';
  v_shoes uuid;
  v_bags uuid;
  v_hair uuid;
  v_product uuid;
begin
  -- Token columns must be empty strings, not null. GoTrue looks them up with
  -- `= ''` and returns "Database error finding user" when they are null.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated',
    'authenticated', 'akosua@example.com', '', now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    '', '', '', '', ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at,
    created_at, updated_at
  )
  values (
    v_user_id, v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'akosua@example.com'),
    'email', now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  insert into public.vendors (
    id, slug, business_name, whatsapp_number, support_email,
    paystack_subaccount_code, payout_verified_at
  )
  values (
    v_vendor_id, 'akosua', 'Akosua Imports', '0241234567',
    'akosua@example.com', 'ACCT_demo_subaccount', now()
  )
  on conflict (id) do nothing;

  insert into public.vendor_members (vendor_id, user_id, role)
  values (v_vendor_id, v_user_id, 'owner')
  on conflict do nothing;

  insert into public.drops (
    id, vendor_id, slug, title, description, default_freight_mode, published
  )
  values (
    v_drop_id, v_vendor_id, 'china-run', 'September China run',
    'Shoes, bags and hair. New batch every two weeks.', 'sea_cbm', true
  )
  on conflict (id) do nothing;

  insert into public.categories (drop_id, name, position)
  values (v_drop_id, 'Shoes', 0) returning id into v_shoes;
  insert into public.categories (drop_id, name, position)
  values (v_drop_id, 'Bags', 1) returning id into v_bags;
  insert into public.categories (drop_id, name, position)
  values (v_drop_id, 'Hair', 2) returning id into v_hair;

  insert into public.products
    (drop_id, category_id, name, description, price, weight_grams, volume_cm3, position)
  values (
    v_drop_id, v_shoes, 'Chunky platform sneakers',
    'Runs small, take one size up. White and black available.',
    18000, 900, 9000, 0
  ) returning id into v_product;

  insert into public.product_variants (product_id, name, value, price_delta, position)
  values
    (v_product, 'Size', '38', 0, 0),
    (v_product, 'Size', '39', 0, 1),
    (v_product, 'Size', '40', 0, 2),
    (v_product, 'Size', '41', 500, 3);

  insert into public.products
    (drop_id, category_id, name, description, price, weight_grams, volume_cm3, position)
  values (
    v_drop_id, v_shoes, 'Leather loafers',
    'Soft leather, cushioned sole.', 22000, 800, 8000, 1
  ) returning id into v_product;

  insert into public.product_variants (product_id, name, value, price_delta, position)
  values
    (v_product, 'Size', '40', 0, 0),
    (v_product, 'Size', '42', 0, 1);

  insert into public.products
    (drop_id, category_id, name, description, price, weight_grams, volume_cm3, position)
  values
    (v_drop_id, v_bags, 'Quilted crossbody bag',
     'Gold chain strap. Fits a phone and a small purse.', 9500, 800, 12000, 2),
    (v_drop_id, v_bags, 'Canvas tote',
     'Big enough for a laptop.', 6000, 600, 15000, 3),
    (v_drop_id, v_hair, 'Body wave bundle 20"',
     'Double drawn, minimal shedding.', 31000, 250, 3500, 4),
    (v_drop_id, v_hair, 'Closure 4x4',
     'HD lace, pre-plucked.', 24000, 120, 1200, 5);

  -- Inserted open so the public link is immediately live. The freight
  -- readiness trigger runs here too, which makes this a real check that every
  -- seeded product carries the measurement its mode needs.
  insert into public.batches (
    id, drop_id, number, status, opens_at, closes_at, expected_delivery_at,
    freight_mode, freight_rate_estimate, auto_open_next
  )
  values (
    v_batch_id, v_drop_id, 3, 'open', now() - interval '2 days',
    now() + interval '36 hours', now() + interval '45 days',
    'sea_cbm', 280000, true
  )
  on conflict (id) do nothing;

  insert into public.batch_events (batch_id, type, message)
  values (v_batch_id, 'opened', 'Batch 3 is open for orders.');

  raise notice 'Seeded vendor akosua with open batch 3';
end $$;

-- Paid orders, so the manifest, the freight split and the dashboard have
-- something truthful to render. Paystack is not configured locally, so these
-- stand in for the webhook having already reconciled them.
do $$
declare
  v_vendor_id uuid := '22222222-2222-4222-8222-222222222222';
  v_batch_id uuid := '44444444-4444-4444-8444-444444444444';
  v_customer uuid;
  v_order uuid;
  v_code text;
  v_product record;
  v_qty integer;
  v_units bigint;
  v_rate integer;
  v_buyer record;
begin
  select freight_rate_estimate into v_rate from public.batches where id = v_batch_id;

  for v_buyer in
    select * from (values
      ('Ama Mensah',      '+233244000001', 'ama@example.com',    'Chunky platform sneakers', 1),
      ('Kwame Boateng',   '+233244000002', 'kwame@example.com',  'Body wave bundle 20"',     2),
      ('Efua Danso',      '+233244000003', 'efua@example.com',   'Quilted crossbody bag',    1),
      ('Yaw Osei',        '+233244000004', 'yaw@example.com',    'Canvas tote',              3),
      ('Adwoa Sarpong',   '+233244000005', 'adwoa@example.com',  'Leather loafers',          1)
    ) as t(name, phone, email, product_name, qty)
  loop
    insert into public.customers (vendor_id, name, phone, email)
    values (v_vendor_id, v_buyer.name, v_buyer.phone, v_buyer.email)
    on conflict (vendor_id, phone) do update set name = excluded.name
    returning id into v_customer;

    select id, name, price, weight_grams, volume_cm3
      into v_product
      from public.products
     where name = v_buyer.product_name
     limit 1;

    v_qty := v_buyer.qty;
    v_units := v_product.volume_cm3::bigint * v_qty;

    v_code := public.next_order_code(v_batch_id);

    insert into public.orders (
      batch_id, customer_id, code, status, goods_total,
      goods_paid_at, freight_units, freight_estimate, fulfilment
    )
    values (
      v_batch_id, v_customer, v_code, 'paid', v_product.price * v_qty,
      now() - interval '1 day', v_units,
      -- Mirrors estimateFreight: units are cm3, the rate is per CBM.
      round(v_units::numeric / 1000000 * v_rate), 'pickup'
    )
    returning id into v_order;

    insert into public.order_items (
      order_id, product_id, qty, unit_price, weight_grams, volume_cm3, snapshot
    )
    values (
      v_order, v_product.id, v_qty, v_product.price,
      v_product.weight_grams, v_product.volume_cm3,
      jsonb_build_object('productName', v_product.name)
    );

    insert into public.payments (
      order_id, type, provider, provider_ref, amount, status, paid_at
    )
    values (
      v_order, 'goods', 'paystack', 'seed_' || v_order::text,
      v_product.price * v_qty, 'success', now() - interval '1 day'
    );
  end loop;

  raise notice 'Seeded 5 paid orders on batch 3';
end $$;
