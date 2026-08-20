import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSessionNav } from "@/lib/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionNav();

  return (
    <>
      <SiteHeader session={session} />
      <main className="flex-1">{children}</main>
      <SiteFooter session={session} />
    </>
  );
}
