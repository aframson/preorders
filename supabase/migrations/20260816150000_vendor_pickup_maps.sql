-- Vendor pickup pin shown on checkout when "Pick up" is offered.
-- Absent / null means the storefront only offers delivery.

alter table public.vendors
  add column pickup_maps_url text;

-- Anon can read the pin (storefront) but never Paystack secrets.
revoke all on public.vendors from anon;
grant select (
  id, slug, business_name, logo_path, whatsapp_number,
  support_email, payout_verified_at, created_at, pickup_maps_url
) on public.vendors to anon;
