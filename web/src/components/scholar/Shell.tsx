"use client";

import { ArrowLeft, BookOpen, ChartNoAxesColumnIncreasing, FlaskConical, House, Layers, Library, ListChecks, MessageCircleQuestion, Mic, Plus, Presentation, Settings, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Sheet } from "@/components/app/Sheet";
import { track } from "@/lib/analytics";
import { useMe } from "@/lib/me";
import { useDemoUser } from "@/lib/useDemoUser";
import { WEBHOOK_MS } from "@/sample/billing";
import { canCreate, canRead, demoMakeStudent, getScholarAccess, scholarPerson, type ScholarAccess, type ScholarPerson } from "@/sample/scholar/access";
import { read, write } from "@/sample/store";
import { Gate, StatusBanner } from "./Gate";

type Scholar = { me: ScholarPerson; access: ScholarAccess; refresh: () => void };
const Ctx = createContext<Scholar | undefined>(undefined);

/** The student and their access. undefined while loading. */
export const useScholar = () => useContext(Ctx);

export const MENU: { href: string; label: string; Icon: LucideIcon; match?: string }[] = [
  { href: "/scholar", label: "Home", Icon: House },
  { href: "/scholar/ask", label: "Ask", Icon: MessageCircleQuestion },
  { href: "/scholar/study/quiz", label: "Study", Icon: BookOpen, match: "/scholar/study" },
  { href: "/scholar/viva", label: "Viva practice", Icon: Mic },
  { href: "/scholar/decks", label: "Presentations", Icon: Presentation },
  { href: "/scholar/research", label: "Research", Icon: FlaskConical },
  { href: "/scholar/library", label: "Library", Icon: Library },
  { href: "/scholar/learning", label: "My learning", Icon: ChartNoAxesColumnIncreasing },
  { href: "/scholar/syllabus", label: "Syllabus", Icon: ListChecks },
  { href: "/scholar/settings", label: "Settings", Icon: Settings },
];
export const CREATE: { href: string; label: string; hint: string }[] = [
  { href: "/scholar/study/quiz", label: "Quiz", hint: "Questions with explanations" },
  { href: "/scholar/study/flashcards", label: "Flashcards", hint: "Flip, rate, repeat" },
  { href: "/scholar/viva", label: "Viva practice", hint: "Examiner-style questions" },
  { href: "/scholar/decks/new", label: "Presentation", hint: "Outline to slides" },
  { href: "/scholar/research", label: "Research", hint: "Question to manuscript" },
];
const TABS: { href: string | null; label: string; Icon: LucideIcon }[] = [
  { href: "/scholar", label: "Home", Icon: House },
  { href: "/scholar/ask", label: "Ask", Icon: MessageCircleQuestion },
  { href: null, label: "Create", Icon: Plus },
  { href: "/scholar/library", label: "Library", Icon: Layers },
  { href: "/scholar/settings", label: "Me", Icon: UserRound },
];
const isOn = (path: string, href: string) => (href === "/scholar" ? path === href : path === href || path.startsWith(`${href}/`));

function Logo() {
  return (
    <Link href="/scholar" className="shrink-0 text-[16px] font-extrabold tracking-tight text-ink">
      FMD <span className="text-[var(--accent)]">Scholar</span>
    </Link>
  );
}

export function ScholarShell({ children }: { children: ReactNode }) {
  const { user: demo } = useDemoUser();
  const account = useMe();
  const me = useMemo(() => scholarPerson(demo, account), [demo, account]);
  const router = useRouter();
  const path = usePathname();
  const [access, setAccess] = useState<ScholarAccess>();
  const [sheet, setSheet] = useState<"create" | null>(null);
  const userId = me?.id;
  const demoStudent = demo?.role === "student";
  const [settled, setSettled] = useState(0); // bumped once the demo payment has gone through
  const nobody = me === null;
  useEffect(() => {
    if (nobody) router.replace(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [nobody, router]);
  const refresh = useCallback(() => {
    if (!userId) return;
    getScholarAccess(userId).then(async (x) => {
      // the demo student (Rhea Kapoor) is a paid student from the start: no checkout or ID upload to click through
      if (demoStudent && !canCreate(x) && x.status !== "read_only") {
        await demoMakeStudent(userId);
        setTimeout(() => setSettled((n) => n + 1), WEBHOOK_MS + 200);
        return;
      }
      setAccess(x);
      const k = `fmd-demo:scholar-activated:${userId}`;
      if (canCreate(x) && !read<boolean>(k)) {
        write(k, true);
        track("scholar_activated");
      }
    });
  }, [userId, demoStudent]);
  useEffect(refresh, [refresh, settled]);

  const value = me && access ? { me, access, refresh } : undefined;

  const body = !value ? (
    <div className="grid gap-4" aria-busy>
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-[var(--surface-glass)]" />
      <div className="h-40 animate-pulse rounded-2xl bg-[var(--surface-glass)]" />
    </div>
  ) : !canRead(value.access) ? (
    <Gate access={value.access} userId={value.me.id} onChange={refresh} />
  ) : (
    <Ctx.Provider value={value}>
      <StatusBanner access={value.access} />
      {children}
    </Ctx.Provider>
  );

  return (
    <div className="scholar min-h-dvh bg-[var(--background)] pb-[calc(72px+env(safe-area-inset-bottom))] text-ink lg:pb-0">
      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* laptop: the whole menu, always on the left (as in FMD Clinic) */}
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-[var(--surface)] px-3 py-5 lg:flex">
          <div className="px-3 pb-6">
            <Logo />
          </div>
          <nav aria-label="FMD Scholar" className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
            {MENU.map(({ href, label, Icon, match }) => {
              const on = isOn(path, match ?? href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors ${on ? "bg-[var(--accent-soft)] font-semibold text-ink" : "text-ink-2 hover:bg-[var(--surface-glass)] hover:text-ink"}`}
                >
                  <Icon className={`size-[18px] shrink-0 ${on ? "text-[var(--accent)]" : ""}`} strokeWidth={1.6} aria-hidden />
                  {label}
                </Link>
              );
            })}
            <Link href="/assistant" className="mt-3 flex items-center gap-3 border-t border-line px-3 pt-4 text-[13.5px] text-ink-3 hover:text-ink">
              <ArrowLeft className="size-[17px]" strokeWidth={1.6} aria-hidden /> Back to FMD
            </Link>
          </nav>
          <div className="mt-4 grid gap-3 border-t border-line px-2 pt-4">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{me?.full_name ?? ""}</span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {/* phone: a slim top bar; the menu is the tab bar at the bottom */}
          <header className="sticky top-0 z-40 border-b border-line bg-[var(--background)] lg:hidden">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <Logo />
              <div className="ml-auto flex items-center gap-2">
              </div>
            </div>
          </header>
          <main id="scholar-main" className="mx-auto w-full max-w-[1080px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
            {body}
          </main>
        </div>
      </div>

      <nav aria-label="FMD Scholar" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-[var(--background)] pb-[env(safe-area-inset-bottom)] lg:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const on = href ? isOn(path, href) : false;
          const cls = `flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] ${on ? "font-bold text-[var(--accent)]" : "text-ink-3 hover:text-ink"}`;
          const inner = (
            <>
              <Icon className="size-5" strokeWidth={on ? 2 : 1.5} aria-hidden />
              {label}
            </>
          );
          return href ? (
            <Link key={label} href={href} aria-current={on ? "page" : undefined} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={label} type="button" onClick={() => setSheet("create")} className={cls}>
              {inner}
            </button>
          );
        })}
      </nav>

      {sheet === "create" && (
        <Sheet title="Create" onClose={() => setSheet(null)}>
          <div className="grid gap-1">
            {CREATE.map((c) => (
              <Link key={c.href} href={c.href} onClick={() => setSheet(null)} className="rounded-xl px-3 py-3 hover:bg-[var(--surface-glass)]">
                <span className="block text-[15px] font-semibold text-ink">{c.label}</span>
                <span className="block text-[13px] text-ink-3">{c.hint}</span>
              </Link>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
