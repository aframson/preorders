-- Platform vendor review, independent of Paystack's read-only is_verified flag.
-- Approval records and payout destinations are server-only data.
-- Deploy the matching application code before applying this migration: it
-- contains a compatibility fallback for the missing table, while this
-- migration tightens grants expected by the new getVendor implementation.

create type vendor_approval_status as enum ('pending', 'approved', 'rejected');

create table public.vendor_approvals (
  vendor_id uuid primary key references public.vendors on delete cascade,
  status vendor_approval_status not null default 'pending',
  note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users on delete set null,
  approved_subaccount_code text,
  approved_bank_code text,
  approved_account_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_approvals_reviewed check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  ),
  constraint vendor_approvals_snapshot check (
    status <> 'approved'
    or (
      approved_subaccount_code is not null
      and approved_bank_code is not null
      and approved_account_number is not null
    )
  )
);

create trigger vendor_approvals_updated_at
  before update on public.vendor_approvals
  for each row execute function public.set_updated_at();

alter table public.vendor_approvals enable row level security;

-- Default privileges grant browser roles access to new public tables. This
-- table is deliberately service-role only; admin routes authorize a human
-- before creating the service-role client.
revoke all on public.vendor_approvals from anon, authenticated;
grant all on public.vendor_approvals to service_role;

-- Existing connected shops must not be disabled by this deployment. Vendors
-- without a complete payout remain blocked by the application guard and will
-- become pending when they connect one.
insert into public.vendor_approvals (
  vendor_id,
  status,
  reviewed_at,
  approved_subaccount_code,
  approved_bank_code,
  approved_account_number
)
select
  id,
  'approved'::vendor_approval_status,
  now(),
  paystack_subaccount_code,
  payout_bank_code,
  payout_account_number
from public.vendors
where paystack_subaccount_code is not null
  and payout_bank_code is not null
  and payout_account_number is not null;

insert into public.vendor_approvals (vendor_id, status)
select id, 'pending'::vendor_approval_status
from public.vendors
where not exists (
  select 1
  from public.vendor_approvals approval
  where approval.vendor_id = vendors.id
);

-- Authenticated users previously inherited full-column SELECT/UPDATE on
-- vendors. Combined with the public read policy, that exposed every payout
-- destination and allowed payout verification fields to be modified directly.
revoke select on public.vendors from authenticated;
grant select (
  id,
  slug,
  business_name,
  logo_path,
  whatsapp_number,
  support_email,
  pickup_maps_url,
  payout_verified_at,
  created_at,
  updated_at
) on public.vendors to authenticated;

revoke update on public.vendors from authenticated;
grant update (
  slug,
  business_name,
  logo_path,
  whatsapp_number,
  support_email,
  pickup_maps_url
) on public.vendors to authenticated;
