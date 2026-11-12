"use client";

import { ArrowLeft, ChevronDown, Heart, Maximize2, Minimize2, Search, Send, Smile, SquarePen } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { initials, type Me } from "@/lib/fmd";
import { useMe } from "@/lib/me";
import { openThread, send, threads, type Thread } from "@/sample/messages";

/** "now", "42m", "3h", "2d" */
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};
/** "Today 10:42", "Mon 18:05", "3 Nov 09:10": shown between messages more than an hour apart */
const stamp = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (new Date().toDateString() === d.toDateString()) return `Today ${time}`;
  return `${days < 7 ? d.toLocaleDateString("en-IN", { weekday: "short" }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${time}`;
};

function Face({ name, size = "size-14 text-[15px]" }: { name: string; size?: string }) {
  return <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-semibold text-ink ring-1 ring-line`}>{initials(name)}</span>;
}

const iconBtn = "grid size-9 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]";

/* ---------------- data ---------------- */

function useInbox(me: Me | null | undefined) {
  const [list, setList] = useState<Thread[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const userId = me?.id;
  const load = useCallback(() => {
    if (userId) threads(userId).then(setList);
  }, [userId]);
  useEffect(load, [load]);
  return {
    list,
    open: list?.find((t) => t.id === openId) ?? null,
    pick: (id: string | null) => {
      setOpenId(id);
      if (id && userId) openThread(userId, id).then(load);
    },
    send: async (body: string) => {
      if (userId && openId) await send(userId, openId, body);
      load();
    },
  };
}
type Inbox = ReturnType<typeof useInbox>;

/* ---------------- pieces ---------------- */

/** The chat list: your name, search, then chats newest first. */
function ThreadList({ me, inbox, header }: { me: Me; inbox: Inbox; header?: ReactNode }) {
  const [q, setQ] = useState("");
  const shown = inbox.list?.filter((t) => t.with.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="fmd-from-left flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-5 pb-2 pt-4">
        <h2 className="min-w-0 flex-1 truncate text-[18px] font-bold text-ink">{me.full_name}</h2>
        {header}
        <span className={`${iconBtn} cursor-default text-ink-3`} title="New message (coming soon)">
          <SquarePen className="size-5" strokeWidth={1.75} />
        </span>
      </div>
      <label className="mx-5 my-2 flex h-9 items-center gap-2 rounded-lg bg-white/[0.07] px-3">
        <Search className="size-4 text-ink-3" strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search messages" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3" />
      </label>
      <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[15px]">
        <span className="font-bold text-ink">Messages</span>
        <span className="text-[13px] font-semibold text-ink-3">Demo</span>
      </div>
      {!shown ? (
        <div className="mx-5 my-3 h-16 animate-pulse rounded-xl bg-[var(--surface-glass)]" aria-busy />
      ) : shown.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-ink-3">No chats match “{q}”.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto pb-2">
          {shown.map((t) => {
            const last = t.messages.at(-1);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => inbox.pick(t.id)}
                  aria-current={inbox.open?.id === t.id}
                  className="flex w-full items-center gap-3 px-5 py-2 text-left hover:bg-[var(--surface-glass)] aria-[current=true]:bg-white/[0.07]"
                >
                  <Face name={t.with.name} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] text-ink ${t.unread ? "font-bold" : ""}`}>{t.with.name}</span>
                    <span className={`flex gap-1 text-[12.5px] ${t.unread ? "font-semibold text-ink" : "text-ink-3"}`}>
                      <span className="truncate">{last ? `${last.from === "me" ? "You: " : ""}${last.body}` : "Say hello"}</span>
                      {last && <span className="shrink-0">· {ago(last.at)}</span>}
                    </span>
                  </span>
                  {t.unread && <span className="size-2 shrink-0 rounded-full bg-sky-400" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** One chat: who it's with, their intro, the messages, and the composer. */
function Chat({ t, inbox, onBack, header }: { t: Thread; inbox: Inbox; onBack?: () => void; header?: ReactNode }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const count = t.messages.length;
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [t.id, count]);
  const go = async (body: string) => {
    setErr(null);
    try {
      await inbox.send(body);
      setText("");
    } catch (x) {
      setErr((x as Error).message);
    }
  };
  const submit = (e: FormEvent) => (e.preventDefault(), go(text));

  return (
    <div className="fmd-from-right flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to messages" className={iconBtn}>
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
        )}
        <Face name={t.with.name} size="size-9 text-[12px]" />
        <Link href={`/dentists/${t.with.id}`} className="min-w-0 flex-1 leading-tight hover:opacity-70">
          <span className="block truncate text-[15px] font-semibold text-ink">{t.with.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{t.with.specialty}</span>
        </Link>
        {header}
      </header>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        {/* Instagram opens a chat with who it's with */}
        <div className="mb-6 grid justify-items-center gap-1 text-center">
          <Face name={t.with.name} size="size-24 text-[26px]" />
          <p className="mt-2 text-[18px] font-semibold text-ink">{t.with.name}</p>
          <p className="text-[13px] text-ink-3">{t.with.specialty} · FMD demo dentist</p>
          <Link href={`/dentists/${t.with.id}`} className="mt-3 rounded-lg bg-white/[0.1] px-4 py-1.5 text-[13.5px] font-semibold text-ink hover:bg-white/[0.15]">
            View profile
          </Link>
          <p className="mt-4 max-w-[34ch] text-[12px] text-ink-3">General questions only. Don&apos;t share personal health details here.</p>
        </div>
        {t.messages.map((m, i) => {
          const prev = t.messages[i - 1];
          const next = t.messages[i + 1];
          const gap = !prev || Date.parse(m.at) - Date.parse(prev.at) > 3_600_000;
          const lastOfRun = !next || next.from !== m.from;
          const mine = m.from === "me";
          return (
            <div key={m.id} className="grid">
              {gap && <p className="my-3 text-center text-[11.5px] font-medium text-ink-3">{stamp(m.at)}</p>}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${lastOfRun ? "mb-2" : "mb-0.5"}`}>
                {!mine && (lastOfRun ? <Face name={t.with.name} size="size-7 text-[10px]" /> : <span className="w-7 shrink-0" />)}
                <p
                  title={new Date(m.at).toLocaleString("en-IN")}
                  className={`fmd-bubble max-w-[70%] whitespace-pre-line break-words rounded-[22px] px-3.5 py-2 text-[14.5px] leading-snug ${mine ? "origin-bottom-right" : "origin-bottom-left"} ${
                    m.body === "❤️" ? "bg-transparent px-0 text-[40px]" : mine ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white" : "bg-white/[0.1] text-ink"
                  }`}
                >
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="grid gap-1.5 p-3">
        {err && <p role="alert" className="px-2 text-[12.5px] text-[var(--tone-bad)]">{err}</p>}
        <div className="flex items-center gap-2 rounded-full border border-line-strong pl-3 pr-4">
          <Smile className="size-6 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Message…" aria-label="Message" className="h-11 min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3" />
          {text.trim() ? (
            <button type="submit" className="text-[14.5px] font-semibold text-sky-400 hover:text-sky-300">
              Send
            </button>
          ) : (
            <button type="button" aria-label="Send a heart" onClick={() => go("❤️")} className="text-ink hover:opacity-60">
              <Heart className="size-6" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid size-20 place-items-center rounded-full border-2 border-ink text-ink">
        <Send className="size-9" strokeWidth={1.25} />
      </span>
      <h2 className="text-[20px] font-semibold text-ink">Your messages</h2>
      <p className="text-[14px] text-ink-3">Ask dentists on FMD general questions.</p>
      <Link href={`/login?next=${encodeURIComponent("/explore")}`} className="rounded-lg bg-sky-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-sky-400">
        Log in to message
      </Link>
    </div>
  );
}

/* ---------------- single pane: the phone page ---------------- */

/** List or one chat, one at a time. The phone page at /explore/messages. */
export function Messages({ className = "" }: { className?: string }) {
  const me = useMe();
  const inbox = useInbox(me);
  const shell = `app-panel flex flex-col overflow-hidden ${className}`;
  if (me === undefined) return <div className={`${shell} animate-pulse`} aria-busy />;
  return (
    <section aria-label="Messages" className={shell}>
      {!me ? <SignedOut /> : inbox.open ? <Chat key={inbox.open.id} t={inbox.open} inbox={inbox} onBack={() => inbox.pick(null)} /> : <ThreadList me={me} inbox={inbox} />}
    </section>
  );
}

/* ---------------- desktop dock ---------------- */

export type DockMode = "min" | "open" | "full";
const DOCK_KEY = "fmd-dm-dock";
let dock: DockMode | null = null;
const dockListeners = new Set<() => void>();
const readDock = (): DockMode => {
  if (dock) return dock;
  try {
    const v = localStorage.getItem(DOCK_KEY);
    return (dock = v === "min" || v === "full" ? v : "open");
  } catch {
    return (dock = "open");
  }
};
/** Where the desktop messages sit, remembered in this browser; "open" during server render. */
export function useDock() {
  const mode = useSyncExternalStore(
    (cb) => (dockListeners.add(cb), () => void dockListeners.delete(cb)),
    readDock,
    () => "open" as DockMode,
  );
  const setMode = (m: DockMode) => {
    dock = m;
    try {
      localStorage.setItem(DOCK_KEY, m);
    } catch {
      // remembered for this visit only
    }
    // the pill, panel and full screen share one view-transition-name, so the browser morphs one into the next
    const apply = () => dockListeners.forEach((l) => l());
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) apply();
    else document.startViewTransition(() => flushSync(apply));
  };
  return [mode, setMode] as const;
}

/**
 * Desktop messages, the way Instagram docks them: a panel at the bottom right that minimises to a pill and expands to a
 * full-screen inbox with the list and the chat side by side. Esc leaves full screen.
 */
export function MessagesDock() {
  const me = useMe();
  const inbox = useInbox(me);
  const [mode, change] = useDock();
  useEffect(() => {
    if (mode !== "full") return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && change("open");
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", esc);
    };
  });

  const unread = inbox.list?.filter((t) => t.unread).length ?? 0;
  const minimise = (
    <button type="button" onClick={() => change("min")} aria-label="Minimise messages" title="Minimise" className={iconBtn}>
      <ChevronDown className="size-5" strokeWidth={1.75} />
    </button>
  );
  const expand = (
    <button type="button" onClick={() => change(mode === "full" ? "open" : "full")} aria-label={mode === "full" ? "Exit full screen" : "Full screen"} title={mode === "full" ? "Exit full screen" : "Full screen"} className={iconBtn}>
      {mode === "full" ? <Minimize2 className="size-[18px]" strokeWidth={1.75} /> : <Maximize2 className="size-[18px]" strokeWidth={1.75} />}
    </button>
  );
  const controls = (
    <>
      {expand}
      {minimise}
    </>
  );

  if (mode === "min")
    return (
      <button
        type="button"
        onClick={() => change("open")}
        style={{ viewTransitionName: "dm-dock" }}
        className="fixed bottom-6 right-6 z-40 hidden h-14 items-center gap-3 rounded-full border border-line-strong bg-[var(--surface-elevated)] pl-5 pr-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:bg-[var(--surface)] lg:flex"
      >
        <span className="relative">
          <Send className="size-6 text-ink" strokeWidth={1.75} />
          {unread > 0 && <span className="absolute -right-2 -top-2 grid size-[18px] place-items-center rounded-full bg-sky-500 text-[11px] font-semibold text-white">{unread}</span>}
        </span>
        <span className="text-[15px] font-semibold text-ink">Messages</span>
        <span className="flex -space-x-2.5">
          {inbox.list?.slice(0, 3).map((t) => (
            <span key={t.id} className="rounded-full ring-2 ring-[var(--surface-elevated)]">
              <Face name={t.with.name} size="size-8 text-[10.5px]" />
            </span>
          ))}
        </span>
      </button>
    );

  if (mode === "full")
    return (
      <div role="dialog" aria-modal aria-label="Messages" className="fixed inset-0 z-[60] hidden bg-[var(--background)] p-4 lg:flex">
        <div style={{ viewTransitionName: "dm-dock" }} className="mx-auto flex w-full max-w-[1200px] overflow-hidden rounded-2xl border border-line bg-[var(--surface)]">
          {!me ? (
            <div className="relative flex flex-1">
              <div className="absolute right-3 top-3 flex">{controls}</div>
              <SignedOut />
            </div>
          ) : (
            <>
              <aside className="flex w-[380px] shrink-0 flex-col border-r border-line">
                <ThreadList me={me} inbox={inbox} />
              </aside>
              <section className="flex min-w-0 flex-1 flex-col">
                {inbox.open ? (
                  <Chat key={inbox.open.id} t={inbox.open} inbox={inbox} header={controls} />
                ) : (
                  <>
                    <div className="flex justify-end p-3">{controls}</div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
                      <span className="grid size-24 place-items-center rounded-full border-2 border-ink text-ink">
                        <Send className="size-11" strokeWidth={1.25} />
                      </span>
                      <h2 className="text-[20px] font-semibold text-ink">Your messages</h2>
                      <p className="text-[14px] text-ink-3">Pick a chat to ask a dentist a general question.</p>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    );

  return (
    <section
      aria-label="Messages"
      style={{ viewTransitionName: "dm-dock" }}
      className="fixed bottom-6 right-6 z-40 hidden h-[min(640px,calc(100dvh-8.5rem))] w-[380px] flex-col overflow-hidden rounded-2xl border border-line-strong bg-[var(--surface)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] lg:flex">
      {me === undefined ? (
        <div className="flex-1 animate-pulse" aria-busy />
      ) : !me ? (
        <>
          <div className="flex justify-end p-2">{controls}</div>
          <SignedOut />
        </>
      ) : inbox.open ? (
        <Chat key={inbox.open.id} t={inbox.open} inbox={inbox} onBack={() => inbox.pick(null)} header={controls} />
      ) : (
        <ThreadList me={me} inbox={inbox} header={controls} />
      )}
    </section>
  );
}
