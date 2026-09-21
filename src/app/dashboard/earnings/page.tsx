import { redirect } from "next/navigation";

export const metadata = { title: "Money" };

export default function LegacyEarningsPage() {
  redirect("/dashboard/money");
}
