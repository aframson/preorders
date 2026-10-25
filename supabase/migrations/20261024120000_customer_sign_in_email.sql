-- Customer sign-in switches from phone+SMS to email+code: SMS costs money per
-- text and wasn't wired to a real provider yet, while email already works
-- (Resend, used for every order notification already). The phone number
-- collected at checkout is unaffected — vendors still need it to reach
-- customers about their parcel; it's just no longer the sign-in identity.
--
-- Safe to run more than once.

alter table public.customer_sign_in_codes rename column phone to email;

alter index if exists public.customer_sign_in_codes_phone_created
  rename to customer_sign_in_codes_email_created;
