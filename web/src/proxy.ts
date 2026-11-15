import { NextResponse, type NextRequest } from "next/server";
import { LIVE_HOSTS } from "@/toggle";

/** On the production site, only the home page is open; any other page redirects to it (toggle.ts, LIVE_HOSTS). */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (request.nextUrl.pathname !== "/" && LIVE_HOSTS.includes(host)) return NextResponse.redirect(new URL("/", request.url));
}

// pages only: not Next's own files, the API, or anything with a file extension (images, models, robots.txt, the sitemap)
export const config = { matcher: "/((?!_next/|api/|.*\\..*).*)" };
