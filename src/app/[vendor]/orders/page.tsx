import { redirect } from "next/navigation";

import { myOrdersPath } from "@/lib/site";

/** Old per-shop "My orders" links (bookmarks, earlier emails) land on the account page. */
export default function VendorOrdersRedirect() {
  redirect(myOrdersPath());
}
