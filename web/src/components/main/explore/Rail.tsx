"use client";

import { Bookmark, CircleHelp, Clapperboard, FilePen, Heart, House, LogOut, Menu, PlusSquare, Search, Send, Settings, Sparkles, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/components/clinic/dismiss";
import { initials, type Me } from "@/lib/fmd";
import { logout } from "@/lib/me";
import { useDock } from "./Messages";

/**
 * Explore's left rail on wide screens, like Instagram's: the logo, then Home, Search, Reels, Messages, Notifications,
 * Create and your profile, with FMD AI and a More menu at the bottom. Icons only; each label slides out on hover.
 */
export function ExploreRail({ me, unread, canPost, tab }: { me: Me | null | undefined; unread: number; canPost: boolean; tab: string }) {
  const [dock, setDock] = useDock();
  const [more, setMore] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  useDismiss(more, () => setMore(false), menu, moreBtn);

  return (
    <nav aria-label="Explore" className="fixed bottom-4 left-4 top-[92px] z-30 hidden w-[68px] flex-col items-center rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] py-4 backdrop-blur xl:flex">
      <Link href="/explore" aria-label="FMD Explore" title="Explore" className="mb-6 grid size-11 place-items-center rounded-xl hover:bg-white/[0.06]">
        <Image src="/img/hero/mascot-512.webp" alt="" width={30} height={30} className="size-[30px]" />
      </Link>

      <div className="flex flex-1 flex-col items-center gap-1.5">
        <Item href="/explore" icon={House} label="Home" on={tab === "for_you"} />
        <Item href="/dentists" icon={Search} label="Search dentists" />
        <Item href="/explore?tab=reels" icon={Clapperboard} label="Reels" on={tab === "reels"} />
        <Item
          icon={Send}
          label="Messages"
          on={dock === "open" || dock === "full"}
          badge={unread || undefined}
          onClick={() => setDock(dock === "open" ? "min" : "open")}
        />
        <Item href="/notifications" icon={Heart} label="Notifications" />
        {canPost && <Item href="/explore/new" icon={PlusSquare} label="Create a post" />}
        {me && (
          <Item
            href="/account"
            label="Profile"
            face={<span className="grid size-7 place-items-center rounded-full bg-sky-600 text-[10.5px] font-semibold text-white ring-2 ring-[var(--surface)]">{initials(me.full_name)}</span>}
          />
        )}
      </div>

      <div className="relative flex flex-col items-center gap-1.5">
        <Item href="/assistant" icon={Sparkles} label="Ask FMD AI" />
        <Item icon={Menu} label="More" on={more} onClick={() => setMore((v) => !v)} btnRef={moreBtn} />
        {more && (
          <div ref={menu} role="menu" className="fmd-enter absolute bottom-0 left-[calc(100%+12px)] grid w-[240px] gap-0.5 rounded-2xl border border-line bg-[var(--surface-elevated)] p-2 shadow-[0_16px_50px_rgba(0,0,0,0.55)]">
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
      <span className="relative grid size-6 place-items-center">
        {face ?? (Icon && <Icon className="size-6" strokeWidth={on ? 2.25 : 1.75} />)}
        {badge !== undefined && <span className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--tone-bad)] px-1 text-[10.5px] font-bold text-white">{badge}</span>}
      </span>
      {/* the label, Instagram's collapsed-sidebar tooltip */}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg border border-line bg-[var(--surface-elevated)] px-2.5 py-1 text-[13px] font-medium text-ink opacity-0 shadow-lg transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
        {label}
      </span>
    </>
  );
  const cls = `group relative grid size-12 place-items-center rounded-xl transition-colors ${on ? "bg-white/[0.08] text-ink" : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"}`;
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
