-- Vendor device push subscriptions for the installed PWA.
-- Endpoint is unique globally; a user can have multiple devices.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index push_subscriptions_vendor_idx
  on public.push_subscriptions (vendor_id);

create index push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;

-- Members manage their own device rows; sends go through the service role.
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_vendor_member(vendor_id)
  );

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_vendor_member(vendor_id)
  );

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_vendor_member(vendor_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.is_vendor_member(vendor_id)
  );

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_vendor_member(vendor_id)
  );

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
