import { env } from "@/lib/env";

export const SITE = {
  name: "Preorders",
  tagline: "Run your WhatsApp preorders without the chaos",
  supportWhatsApp: "233000000000",
} as const;

/**
 * A vendor slug becomes a top-level path (`/akosua/winter-shoes`), so it can
 * never collide with an application route. Anything routable lives here.
 */
export const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "api",
  "auth",
  "blog",
  "c",
  "checkout",
  "contact",
  "dashboard",
  "design",
  "docs",
  "earnings",
  "help",
  "legal",
  "login",
  "logout",
  "me",
  "o",
  "onboarding",
  "orders",
  "pricing",
  "privacy",
  "settings",
  "signup",
  "support",
  "terms",
  "www",
]);

/** Turn a business name into a candidate URL slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

/** `/akosua` */
export function vendorPath(vendorSlug: string): string {
  return `/${vendorSlug}`;
}

/** `/akosua/winter-shoes` */
export function dropPath(vendorSlug: string, dropSlug: string): string {
  return `/${vendorSlug}/${dropSlug}`;
}

/**
 * Takes the order's public token, not its human code. The code is sequential
 * and quotable; the token is what makes the page safe to open without a login.
 */
export function orderPath(token: string): string {
  return `/o/${token}`;
}

/** All of a customer's orders with one vendor — keyed by email via portal_token. */
export function customerPortalPath(portalToken: string): string {
  return `/c/${portalToken}`;
}

/** Find / recover orders for a vendor shop (`/[vendor]/orders`). */
export function vendorOrdersPath(vendorSlug: string): string {
  return `/${vendorSlug}/orders`;
}

/**
 * Defaults to the configured site origin. Server code that already knows the
 * request host should pass it, so preview deployments and custom domains
 * produce links back to themselves rather than to production.
 */
export function absoluteUrl(path: string, origin?: string): string {
  return new URL(path, origin ?? env.NEXT_PUBLIC_SITE_URL).toString();
}

/**
 * WhatsApp caches link previews hard. Bumping a query param when the batch
 * rolls is what stops a vendor sharing a "Batch 2" card for weeks after
 * Batch 3 opened.
 */
export function shareUrl(
  vendorSlug: string,
  dropSlug: string,
  batchNumber: number,
  origin?: string,
): string {
  return absoluteUrl(
    `${dropPath(vendorSlug, dropSlug)}?b=${batchNumber}`,
    origin,
  );
}

export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function whatsappChatLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
