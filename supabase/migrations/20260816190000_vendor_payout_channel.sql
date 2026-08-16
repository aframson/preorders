-- Remember how the vendor gets paid so the dashboard can show MoMo vs bank.
alter table public.vendors
  add column if not exists payout_channel text
    check (payout_channel is null or payout_channel in ('mobile_money', 'bank')),
  add column if not exists payout_bank_code text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_name text;
