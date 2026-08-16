-- payout_verified_at previously meant "subaccount created". It now means
-- Paystack has verified the subaccount (is_verified) on their dashboard.
-- Clear stale timestamps so vendors re-sync from Paystack.
update public.vendors
   set payout_verified_at = null
 where paystack_subaccount_code is not null
   and payout_verified_at is not null;
