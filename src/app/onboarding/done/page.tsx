import { CheckCircle2, PackagePlus, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { CopyButton } from "@/components/share/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { requireVendor } from "@/lib/auth";
import { env } from "@/lib/env";
import { absoluteUrl, dropPath, whatsappShareLink } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "You are live" };

export default async function DonePage({
  searchParams,
}: PageProps<"/onboarding/done">) {
  const vendor = await requireVendor();
  const params = await searchParams;
  const dropSlug = typeof params.drop === "string" ? params.drop : null;

  const supabase = await createClient();
  const { data: drop } = await supabase
    .from("drops")
    .select("id, slug, title")
    .eq("vendor_id", vendor.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!drop) redirect("/onboarding/drop");

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("drop_id", drop.id);

  const hasProducts = (productCount ?? 0) > 0;
  const slug = dropSlug ?? drop.slug;
  const path = dropPath(vendor.slug, slug);
  const url = absoluteUrl(path, env.NEXT_PUBLIC_SITE_URL);

  const shareText = hasProducts
    ? `${vendor.businessName} preorders are open. Pick what you want and pay here: ${url}`
    : `${vendor.businessName} preorders — link coming soon: ${url}`;

  return (
    <div className="w-full max-w-md">
      <div className="flex size-12 items-center justify-center rounded-full bg-open-tint">
        <CheckCircle2 className="size-6 text-open" aria-hidden />
      </div>

      <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
        Your link is live
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Put this in your WhatsApp bio. It never changes, and it always shows
        whichever batch is open.
      </p>

      <div className="mt-6 rounded-card border border-border bg-surface p-4">
        <p className="text-xs text-ink-muted">Your link</p>
        <p className="mt-1 break-all font-medium text-ink">{url}</p>
      </div>

      <div className="mt-4 space-y-2">
        <CopyButton value={url} size="lg" block />
        <ButtonLink
          href={whatsappShareLink(shareText)}
          target="_blank"
          rel="noreferrer"
          variant="secondary"
          size="lg"
          block
        >
          Share to WhatsApp
        </ButtonLink>
      </div>

      {hasProducts ? (
        <div className="mt-8 rounded-card border border-open/30 bg-open-tint p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-open" aria-hidden />
            <div>
              <p className="font-medium text-ink">
                {productCount}{" "}
                {productCount === 1 ? "product is" : "products are"} ready
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Open the batch from your dashboard when you want customers to
                order.
              </p>
              <ButtonLink
                href={`/dashboard/drops/${drop.id}`}
                size="sm"
                className="mt-3"
              >
                Go to products
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-card border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
          <div className="flex items-start gap-3">
            <PackagePlus
              className="mt-0.5 size-5 shrink-0 text-brand-700"
              aria-hidden
            />
            <div>
              <p className="font-medium text-ink">Add your first product</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Your batch cannot open until there is something in it. Three
                products is enough to start.
              </p>
              <ButtonLink
                href={`/dashboard/drops/${drop.id}/products/new`}
                size="sm"
                className="mt-3"
              >
                Add a product
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      <ButtonLink href="/dashboard" variant="ghost" block className="mt-4">
        Go to my dashboard
      </ButtonLink>
    </div>
  );
}
