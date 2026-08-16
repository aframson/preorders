import { notFound } from "next/navigation";

import { CartProvider } from "@/components/public/cart";
import { getPublicDrop } from "@/lib/queries/public-drop";

/**
 * The cart provider has to wrap the drop page, the product pages and checkout
 * together, because a customer moves between all three while building an
 * order. Each is a real route rather than a modal, so the WhatsApp webview's
 * back gesture behaves.
 */
export default async function PublicDropLayout({
  children,
  params,
}: LayoutProps<"/[vendor]/[drop]">) {
  const { vendor, drop } = await params;
  const data = await getPublicDrop(vendor, drop);

  if (!data) notFound();

  return (
    <CartProvider batchId={data.openBatch?.id ?? null}>
      <a
        href="#products"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to products
      </a>
      {children}
    </CartProvider>
  );
}
