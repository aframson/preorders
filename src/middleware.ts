import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets, image files, and OG/Twitter image
     * routes. Social crawlers hit those often; skipping session refresh keeps
     * the PNG path fast and avoids middleware interfering with ImageResponse.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*(?:opengraph-image|twitter-image).*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
