import { Layers, Plus } from "lucide-react";

import { SearchableDrops } from "@/components/dashboard/searchable-drops";
import { PageHeader } from "@/components/dashboard/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireVendor } from "@/lib/auth";
import type { BatchStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Drops" };

export default async function DropsPage() {
  const vendor = await requireVendor();
  const supabase = await createClient();

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, slug, title, published, archived_at, batches(id, number, status, closes_at)",
    )
    .eq("vendor_id", vendor.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const cards = (drops ?? []).map((drop) => {
    const batches = [...(drop.batches ?? [])].sort(
      (a, b) => b.number - a.number,
    );
    const live = batches.find((batch) => batch.status === "open");
    const latest = live ?? batches[0];
    return {
      id: drop.id,
      slug: drop.slug,
      title: drop.title,
      published: drop.published,
      latest: latest
        ? {
            number: latest.number,
            status: latest.status as BatchStatus,
          }
        : null,
    };
  });

  return (
    <>
      <PageHeader
        title="Drops"
        description="Each drop is a permanent link with batches running inside it."
        action={
          <ButtonLink href="/dashboard/drops/new" size="sm">
            <Plus className="size-4" aria-hidden />
            New drop
          </ButtonLink>
        }
      />

      {!drops?.length ? (
        <EmptyState
          icon={Layers}
          title="No drops yet"
          description="A drop holds your products and runs your batches. Most vendors only ever need one."
          action={
            <ButtonLink href="/dashboard/drops/new">
              Create your first drop
            </ButtonLink>
          }
        />
      ) : (
        <SearchableDrops vendorSlug={vendor.slug} drops={cards} />
      )}
    </>
  );
}
