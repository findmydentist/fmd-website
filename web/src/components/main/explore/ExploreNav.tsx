"use client";

import Link from "next/link";
import type { Viewer } from "@/lib/viewer";
import { canCreate } from "@/lib/viewer";
import { Chats, Clips, Create, Discover, HomeMark, Me } from "./icons";

export type ExploreTab = "home" | "search" | "create" | "reels" | "chats" | "profile";

/**
 * Explore's own navigation. Laptops: a slim labelled rail on the left. Phones: a row of pills under the top bar
 * (FMD Main already has a tab bar at the bottom, so Explore never adds a second one).
 */
export function ExploreNav({ active, viewer }: { active: ExploreTab; viewer: Viewer | null }) {
  const items: [ExploreTab, string, string, typeof HomeMark][] = [
    ["home", "Home", "/explore", HomeMark],
    ["search", "Discover", "/explore/search", Discover],
    ["reels", "Clips", "/explore/reels", Clips],
    ...(canCreate(viewer) ? ([["create", "Create", "/explore/new", Create]] as [ExploreTab, string, string, typeof HomeMark][]) : []),
    ["chats", "Chats", "/messages", Chats],
    ["profile", viewer ? "Me" : "Log in", viewer ? "/explore/u/me" : "/login?next=/explore", Me],
  ];
  return (
    <nav aria-label="Explore" className="min-w-0 lg:sticky lg:top-24">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible">
        {items.map(([id, label, href, Icon]) => {
          const on = id === active;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px] transition-colors lg:rounded-[16px] lg:px-3.5 lg:py-3 lg:text-[15px] ${
                  on ? "bg-[var(--surface)] font-bold text-ink shadow-[var(--shadow-card)]" : "font-medium text-ink-2 hover:bg-[var(--surface)] hover:text-ink"
                }`}
              >
                <Icon size={22} strokeWidth={on ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
