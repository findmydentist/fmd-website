"use client";

import {
  Bell,
  Bookmark,
  Briefcase,
  CircleHelp,
  Compass,
  House,
  LogIn,
  LogOut,
  Menu,
  Search,
  Send,
  Settings,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { fmtPhone, initials } from "@/lib/fmd";
import { logout, useMe } from "@/lib/me";

type Entry = [href: string, label: string, Icon: LucideIcon];
const GO: Entry[] = [
  ["/", "Home", House],
  ["/assistant", "Ask FMD AI", Sparkles],
  ["/dentists", "Find a dentist", Search],
  ["/explore", "Explore", Compass],
  ["/explore/messages", "Messages", Send],
  ["/jobs", "Jobs", Briefcase],
];
const YOU: Entry[] = [
  ["/account", "Your profile", UserRound],
  ["/notifications", "Notifications", Bell],
  ["/saved", "Saved", Bookmark],
  ["/concierge/enquiries", "FMD Edge requests", Sparkles],
  ["/account/settings", "Settings", Settings],
  ["/help", "Help", CircleHelp],
];

/**
 * Phones and tablets: the header's one button, ☰, opening a sidebar with everything (pages, your account, log out).
 * Desktop keeps the full header.
 */
export function MobileMenu() {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const close = () => setOpen(false);
  // the sidebar is drawn at the top of the page (a portal), above the header and the tab bar; only in the browser
  const browser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Esc closes it; while open, the page behind doesn't scroll
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const on = (href: string) => (href === "/" ? path === "/" : path === href || (path.startsWith(`${href}/`) && !GO.some(([h]) => h !== href && h.startsWith(href) && path.startsWith(h))));
  const signOut = async () => {
    setErr(null);
    try {
      await logout();
      close();
      router.push("/");
    } catch {
      setErr("Couldn't log out. Check your connection and try again.");
    }
  };
  const item = (href: string, label: string, Icon: LucideIcon) => (
    <Link
      key={href}
      href={href}
      onClick={close}
      aria-current={on(href) ? "page" : undefined}
      className={`flex items-center gap-3.5 rounded-xl px-3 py-3 text-[15px] transition-colors ${on(href) ? "bg-sky-500/15 font-semibold text-sky-300" : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"}`}
    >
      <Icon className="size-5" strokeWidth={1.75} /> {label}
    </Link>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        aria-expanded={open}
        className="grid size-11 place-items-center rounded-full border border-line bg-[var(--surface-glass)] text-ink hover:bg-white/[0.08]"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>

      {browser &&
        createPortal(
      <div aria-hidden={!open} inert={!open}>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu"
          onClick={close}
          className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-[2px] transition-opacity duration-500 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <nav
          aria-label="Menu"
          className={`fixed inset-y-0 right-0 z-[71] flex w-[86%] max-w-[340px] flex-col border-l border-line bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-[-20px_0_60px_rgba(0,0,0,0.5)] transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* who's signed in */}
          <div className="flex items-center gap-3 border-b border-line p-4">
            {me ? (
              <Link href="/account" onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[15px] font-semibold text-ink ring-2 ring-sky-500/60">{initials(me.full_name)}</span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[16px] font-semibold text-ink">{me.full_name}</span>
                  <span className="block text-[13px] text-ink-3">{fmtPhone(me.phone)}</span>
                </span>
              </Link>
            ) : (
              <span className="flex-1 text-[17px] font-semibold text-ink">Menu</span>
            )}
            <button type="button" onClick={close} aria-label="Close menu" className="grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-white/[0.06] hover:text-ink">
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <p className="px-3 pb-1.5 pt-1 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Go to</p>
            <div className="grid gap-0.5">{GO.map(([h, l, I]) => item(h, l, I))}</div>
            {me && (
              <>
                <p className="px-3 pb-1.5 pt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">You</p>
                <div className="grid gap-0.5">{YOU.map(([h, l, I]) => item(h, l, I))}</div>
              </>
            )}
          </div>

          <div className="border-t border-line p-3">
            {err && <p role="alert" className="px-3 pb-2 text-[12.5px] text-ink-2">{err}</p>}
            {me ? (
              <button type="button" onClick={signOut} className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-[15px] font-medium text-[var(--tone-bad)] hover:bg-white/[0.06]">
                <LogOut className="size-5" strokeWidth={1.75} /> Log out
              </button>
            ) : (
              <Link
                href={path === "/" ? "/login" : `/login?next=${encodeURIComponent(path)}`}
                onClick={close}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 text-[15px] font-semibold text-white hover:bg-sky-500"
              >
                <LogIn className="size-5" strokeWidth={1.75} /> Log in
              </Link>
            )}
          </div>
        </nav>
      </div>,
          document.body,
        )}
    </div>
  );
}
