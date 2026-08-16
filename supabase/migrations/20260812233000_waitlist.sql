-- Demand capture for a closed batch.
--
-- A visitor who lands on a closed link is the most qualified traffic a vendor
-- ever gets: they arrived intending to buy. Bouncing them loses that, so the
-- closed state collects an email for the next opening instead.

create table public.drop_waitlist (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops on delete cascade,
  email citext not null,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (drop_id, email)
);

create index drop_waitlist_drop_idx on public.drop_waitlist (drop_id);

alter table public.drop_waitlist enable row level security;

-- Anonymous visitors may add themselves to a public drop's list, and nothing
-- else: the list of who else is waiting is the vendor's, not a competitor's.
create policy drop_waitlist_public_insert on public.drop_waitlist
  for insert to anon, authenticated
  with check (public.drop_is_public(drop_id));

create policy drop_waitlist_member_read on public.drop_waitlist
  for select to authenticated
  using (public.is_drop_member(drop_id));

create policy drop_waitlist_member_write on public.drop_waitlist
  for delete to authenticated
  using (public.is_drop_member(drop_id));
