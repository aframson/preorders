import { getVendor, requireUser } from "@/lib/auth";
import { BusinessForm } from "./business-form";

export const metadata = { title: "Your business" };

export default async function BusinessStep() {
  await requireUser();
  const vendor = await getVendor();

  return (
    <BusinessForm
      defaultBusinessName={vendor?.businessName ?? ""}
      defaultSlug={vendor?.slug ?? ""}
      defaultWhatsapp={vendor?.whatsappNumber ?? ""}
    />
  );
}
