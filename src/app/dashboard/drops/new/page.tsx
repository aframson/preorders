import { requireVendor } from "@/lib/auth";
import { NewDropForm } from "./new-drop-form";

export const metadata = { title: "New drop" };

export default async function NewDropPage() {
  await requireVendor();
  return <NewDropForm />;
}
