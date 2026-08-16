import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { Tabs } from "@/components/dashboard/tabs";
import { ButtonLink } from "@/components/ui/button";
import { requireVendor } from "@/lib/auth";
import { dropPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export default async function DropLayout({
  children,
  params,
}: LayoutProps<"/dashboard/drops/[dropId]">) {
  const { dropId } = await params;
  const vendor = await requireVendor();

  const supabase = await createClient();
  const { data: drop } = await supabase
    .from("drops")
    .select("id, slug, title")
    .eq("id", dropId)
    .maybeSingle();

  if (!drop) notFound();

  const publicPath = dropPath(vendor.slug, drop.slug);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ink">
            {drop.title}
          </h1>
          <p className="mt-1 truncate text-sm text-ink-muted">{publicPath}</p>
        </div>

        <ButtonLink
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          variant="secondary"
          size="sm"
        >
          View link
          <ExternalLink className="size-3.5" aria-hidden />
        </ButtonLink>
      </div>

      <Tabs
        items={[
          { href: `/dashboard/drops/${dropId}`, label: "Products", exact: true },
          { href: `/dashboard/drops/${dropId}/batches`, label: "Batches" },
          { href: `/dashboard/drops/${dropId}/settings`, label: "Settings" },
        ]}
      />

      {children}
    </>
  );
}
