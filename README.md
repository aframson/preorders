# Preorders

Next.js app for WhatsApp preorder ops (Ghana). Stack: Supabase, Paystack, Trigger.dev, Resend.

## Develop

```bash
pnpm install
pnpm dev
```

Optional Trigger worker (cutoffs, vendor push):

```bash
pnpm trigger:dev
```

## Trigger.dev env sync

Push local env into Trigger so cloud tasks can reach Supabase / VAPID / mail:

```bash
pnpm trigger:deploy
# same as:
pnpm exec trigger deploy --env-file .env.local
```

Full notes: [docs/trigger.md](docs/trigger.md).

## Vendor push (PWA)

1. Set VAPID keys (see `.env.example`).
2. Run migrations including `push_subscriptions`.
3. Deploy Trigger with env sync.
4. Dashboard → More → Enable push alerts (install to home screen for best results).

Vendors get notified when a buyer **pays** or **adds to bag**.
