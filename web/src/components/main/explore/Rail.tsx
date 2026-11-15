"use client";

import { Bell, Bookmark, CircleHelp, Ellipsis, FilePen, LogOut, MessagesSquare, Newspaper, Search, Settings, Sparkles, SquarePen, SquarePlay, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/components/clinic/dismiss";
import { initials, type Me } from "@/lib/fmd";
import { logout } from "@/lib/me";
import { useDock } from "./Messages";

/**
 * Explore's left rail on wide screens: the mascot, then Feed, Dentists, Videos, Chats, Alerts, Write and You, with
 * FMD AI and More at the bottom. Each icon has its short label under it; the open one sits in a blue pill.
 */
export function ExploreRail({ me, unread, canPost, tab }: { me: Me | null | undefined; unread: number; canPost: boolean; tab: string }) {
  const [dock, setDock] = useDock();
  const [more, setMore] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  useDismiss(more, () => setMore(false), menu, moreBtn);

  return (
    <nav aria-label="Explore" className="fixed bottom-4 left-4 top-[92px] z-30 hidden w-[80px] flex-col items-center overflow-y-auto rounded-3xl [scrollbar-width:none] border border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] py-4 backdrop-blur xl:flex">
      <Link href="/explore" aria-label="FMD Explore" title="Explore" className="mb-4 grid size-11 shrink-0 place-items-center rounded-xl hover:bg-white/[0.06]">
        <Image src="/img/hero/mascot-512.webp" alt="" width={30} height={30} className="size-[30px]" />
      </Link>

      <div className="flex flex-1 flex-col items-center gap-1">
        <Item href="/explore" icon={Newspaper} label="Feed" on={tab === "for_you"} />
        <Item href="/dentists" icon={Search} label="Dentists" />
        <Item href="/explore?tab=reels" icon={SquarePlay} label="Videos" on={tab === "reels"} />
        <Item
          icon={MessagesSquare}
          label="Chats"
          on={dock === "open" || dock === "full"}
          badge={unread || undefined}
          onClick={() => setDock(dock === "open" ? "min" : "open")}
        />
        <Item href="/notifications" icon={Bell} label="Alerts" />
        {canPost && <Item href="/explore/new" icon={SquarePen} label="Write" />}
        {me && (
          <Item
            href="/account"
            label="You"
            face={<span className="grid size-7 place-items-center rounded-[30%] bg-sky-600 text-[10.5px] font-semibold text-white ring-2 ring-[var(--surface)]">{initials(me.full_name)}</span>}
          />
        )}
      </div>

      <div className="relative mt-3 flex flex-col items-center gap-1">
        <Item href="/assistant" icon={Sparkles} label="FMD AI" />
        <Item icon={Ellipsis} label="More" on={more} onClick={() => setMore((v) => !v)} btnRef={moreBtn} />
        {more && (
          <div ref={menu} role="menu" className="fmd-enter fixed bottom-4 left-[108px] grid w-[240px] gap-0.5 rounded-2xl border border-line bg-[var(--surface-elevated)] p-2 shadow-[0_16px_50px_rgba(0,0,0,0.55)]">
            <MenuLink href="/account/settings" icon={Settings} label="Settings" />
            <MenuLink href="/saved" icon={Bookmark} label="Saved" />
            {me?.dentist_profile && <MenuLink href="/explore/mine" icon={FilePen} label="Your posts" />}
            <MenuLink href="/help" icon={CircleHelp} label="Help" />
            {me && (
              <>
                <span className="my-1 h-px bg-[var(--border)]" />
                <button type="button" role="menuitem" onClick={() => logout().catch(() => undefined)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-[var(--tone-bad)] hover:bg-white/[0.06]">
                  <LogOut className="size-5" strokeWidth={1.75} /> Log out
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

/** One rail button: an icon (or face), a label that slides out on hover, an optional count. */
function Item({
  href,
  onClick,
  icon: Icon,
  face,
  label,
  on = false,
  badge,
  btnRef,
}: {
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  face?: ReactNode;
  label: string;
  on?: boolean;
  badge?: number;
  btnRef?: React.Ref<HTMLButtonElement>;
}) {
  const inner = (
    <>
      <span className={`relative grid h-8 w-12 place-items-center rounded-xl transition-colors ${on ? "bg-sky-500/20 text-sky-300" : "group-hover:bg-white/[0.07]"}`}>
        {face ?? (Icon && <Icon className="size-[22px]" strokeWidth={on ? 2.1 : 1.75} />)}
        {badge !== undefined && <span className="absolute -right-1 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-md bg-sky-500 px-1 text-[10.5px] font-bold text-white">{badge}</span>}
      </span>
      <span className={`text-[11px] leading-none ${on ? "font-semibold text-ink" : "font-medium"}`}>{label}</span>
    </>
  );
  const cls = `group grid w-[72px] shrink-0 justify-items-center gap-1 rounded-xl py-1.5 transition-colors ${on ? "text-ink" : "text-ink-3 hover:text-ink"}`;
  return href ? (
    <Link href={href} aria-label={label} aria-current={on ? "page" : undefined} className={cls}>
      {inner}
    </Link>
  ) : (
    <button ref={btnRef} type="button" aria-label={badge ? `${label}, ${badge} unread` : label} aria-pressed={on} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function MenuLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-ink hover:bg-white/[0.06]">
      <Icon className="size-5" strokeWidth={1.75} /> {label}
    </Link>
  );
}
