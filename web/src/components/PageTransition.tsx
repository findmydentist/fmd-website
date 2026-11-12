"use client";

import { usePathname } from "next/navigation";
import { useEffect, ViewTransition, type ReactNode } from "react";

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
    window.addEventListener("pointerdown", at, { capture: true, passive: true });
    return () => window.removeEventListener("pointerdown", at, { capture: true });
  }, []);
  return (
    <ViewTransition key={path} name="page" share="page" enter="page" default="none">
      {children}
    </ViewTransition>
  );
}
