-- Table privileges ------------------------------------------------------------
--
-- Newer local Supabase images no longer grant SELECT/INSERT/UPDATE/DELETE on
-- newly created public tables to `anon`, `authenticated`, or `service_role`.
-- RLS policies alone are not enough: without the GRANT, Postgres returns
-- "permission denied for table …" before any policy runs.
--
-- `service_role` needs full access (admin client / webhooks / seeding).
-- `authenticated` gets row-level write via RLS.
-- `anon` gets SELECT only; the column-level vendors grant below stays tighter.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;

-- Re-assert the intentional lockdowns from the RLS migration. GRANT ALL above
-- would otherwise reopen customers / orders / payments to the browser roles.

revoke all on public.vendors from anon;
grant select (
  id, slug, business_name, logo_path, whatsapp_number,
  support_email, payout_verified_at, created_at
) on public.vendors to anon;

revoke all on public.vendor_members from anon;

revoke all on public.customers from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.payments from anon, authenticated;

grant select on public.customers to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;
