# Trigger.dev

Background jobs (batch cutoff, hold expiry, vendor push) run on [Trigger.dev](https://trigger.dev).

## Local

```bash
# Loads .env / .env.local automatically
pnpm trigger:dev
```

Needs `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF` in `.env.local` so the Next app can enqueue runs.

## Push env vars to Trigger (prod)

Trigger tasks need the same secrets as the app (Supabase service role, VAPID, mail, site URL). This project syncs them on deploy via `syncEnvVars` in `trigger.config.ts`.

**Required in `.env.local`:** a real Trigger project ref (Dashboard → Project → **Project ref**, looks like `proj_…`):

```bash
TRIGGER_PROJECT_REF="proj_xxxxxxxx"
TRIGGER_SECRET_KEY="tr_dev_…"   # or tr_prod_ for production API from the app
```

Then:

```bash
# Login once
pnpm exec trigger login

# Deploy tasks AND sync env from .env / .env.local (and the current shell)
pnpm trigger:deploy

# Explicit env file (recommended)
pnpm exec trigger deploy --env-file .env.local

# Staging
pnpm exec trigger deploy --env staging --env-file .env.local
```

What gets synced (when present):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` (secret)
- `EMAIL_FROM`
- `EMAIL_SMTP_HOST` / `EMAIL_SMTP_PORT`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` (secret)
- `VAPID_SUBJECT`

Skip sync for one deploy:

```bash
pnpm exec trigger deploy --skip-sync-env-vars
```

List what Trigger currently has:

```bash
pnpm exec trigger env list --env prod
pnpm exec trigger env list --env prod --show-values
```

Pull Trigger env back to a file:

```bash
pnpm exec trigger env pull --env prod -o .env.trigger --force
```

## Web push (vendor PWA)

1. Generate VAPID keys:

```bash
pnpm exec web-push generate-vapid-keys
```

2. Put them in `.env.local` (and Vercel):

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@yourdomain.com"
```

3. Apply the `push_subscriptions` migration, then sync Trigger:

```bash
pnpm exec supabase db push   # or your usual migration path
pnpm trigger:deploy --env-file .env.local
```

4. In the dashboard → **More → Push alerts**, enable notifications (install the PWA / allow permission).
