-- Customer accounts: a shopper signs in with their phone number and a code
-- texted to it, then sees every order placed with that number across every
-- shop. This table only holds the short-lived codes; the signed-in session
-- itself is a signed cookie, so there is nothing else to store.
--
-- Safe to run more than once.

create table if not exists public.customer_sign_in_codes (
  id uuid primary key default gen_random_uuid(),
  -- E.164, e.g. +233241234567
  phone text not null,
  -- HMAC of phone + code; the code itself is never stored.
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  -- Who asked, for rate limiting texts sent to many different numbers.
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists customer_sign_in_codes_phone_created
  on public.customer_sign_in_codes (phone, created_at desc);

create index if not exists customer_sign_in_codes_ip_created
  on public.customer_sign_in_codes (requested_ip, created_at desc);

-- Only the server (service role) touches this table.
alter table public.customer_sign_in_codes enable row level security;

-- The phone number is now what identifies a customer (it's what they sign in
-- with), so one email no longer has to mean one customer per shop. Keeping
-- this unique index would force checkout to either reuse a stranger's record
-- or drop the email whenever someone types an email already on file.
drop index if exists public.customers_vendor_email_uniq;
