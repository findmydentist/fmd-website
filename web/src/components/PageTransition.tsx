"use client";

import { usePathname } from "next/navigation";
import { useEffect, ViewTransition, type ReactNode } from "react";
import { SLOW_GPU } from "@/lib/device";

// software graphics: no view transitions at all, so a click changes the page straight away (React and the DM dock both
// check for the API and simply swap without it). An own property shadows the browser's method; nothing is deleted.
if (SLOW_GPU) Object.defineProperty(document, "startViewTransition", { value: undefined, configurable: true });

/** the sign-in pages, in order: going right slides forward, going left slides back */
const AUTH: Record<string, number> = { "/login": 0, "/register": 1, "/forgot-password": 1 };

/**
 * Every page opens like an app on an iPhone or a Mac: the new page zooms up from the spot you tapped, its rounded corners
 * opening out to the full screen, while the old one sinks back and fades (CSS in globals.css, "page open"). Only a change
 * of path animates; filters and tabs that only change the query string don't.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  // remember where the last tap was: the next page grows from there
  useEffect(() => {
    const at = (e: PointerEvent) => {
      const root = document.documentElement.style;
      root.setProperty("--vt-x", `${Math.round(e.clientX)}px`);
      root.setProperty("--vt-y", `${Math.round(e.clientY)}px`);
    };
    // between the sign-in pages, slide the form instead (globals.css, "sign-in pages"): forward to sign up or reset,
    // back to log in
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const to = new URL(a.href, location.href);
      const from = location.pathname;
      if (to.origin !== location.origin || !(from in AUTH) || !(to.pathname in AUTH) || to.pathname === from) return;
      const html = document.documentElement;
      html.dataset.vt = "auth";
      html.style.setProperty("--auth-dir", AUTH[to.pathname] >= AUTH[from] ? "1" : "-1");
      setTimeout(() => html.dataset.vt === "auth" && delete html.dataset.vt, 1200);
    };
    window.addEventListener("pointerdown", at, { capture: true, passive: true });
    window.addEventListener("click", click, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", at, { capture: true });
      window.removeEventListener("click", click, { capture: true });
    };
  }, []);
  return (
    <ViewTransition key={path} name="page" share="page" enter="page" default="none">
      {children}
    </ViewTransition>
  );
}
