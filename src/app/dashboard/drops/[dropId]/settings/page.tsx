import { notFound } from "next/navigation";

import { requireVendor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DropSettingsForm } from "./settings-form";

export const metadata = { title: "Drop settings" };

export default async function DropSettingsPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/settings">) {
  const { dropId } = await params;
  await requireVendor();

  const supabase = await createClient();

  const [{ data: drop }, { data: categories }] = await Promise.all([
    supabase
      .from("drops")
      .select("id, title, description, default_freight_mode, published")
      .eq("id", dropId)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .eq("drop_id", dropId)
      .order("position"),
  ]);

  if (!drop) notFound();

  return (
    <DropSettingsForm
      drop={{
        id: drop.id,
        title: drop.title,
        description: drop.description ?? "",
        defaultFreightMode: drop.default_freight_mode,
        published: drop.published,
      }}
      categories={categories ?? []}
    />
  );
}
