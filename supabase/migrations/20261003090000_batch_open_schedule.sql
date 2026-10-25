-- A batch could only ever be opened by a vendor clicking "Open for orders" —
-- there was no way to schedule a future start time the way closes_at already
-- lets a vendor schedule a cutoff. `open_run_id` tracks the pending
-- Trigger.dev run that will open the batch automatically, the same way
-- `cutoff_run_id` tracks the one that closes it: moving the start date has to
-- cancel and re-trigger rather than opening twice.

-- `if not exists`: this column was first added to production by hand through
-- the Table Editor, so a later `supabase db push` must not fail on it.
alter table public.batches
  add column if not exists open_run_id text;
