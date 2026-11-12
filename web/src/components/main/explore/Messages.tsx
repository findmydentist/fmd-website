"use client";

import { ArrowLeft, CheckCheck, ChevronDown, Heart, Info, Maximize2, MessageCircle, Minimize2, Search, Send, ShieldCheck, Smile, SquarePen, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { initials, type Me } from "@/lib/fmd";
import { useMe } from "@/lib/me";
import { openThread, send, threads, type Thread } from "@/sample/messages";
import { photoOf } from "@/sample/providers";

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

/** a dentist's photo (demo directory), else their initials */
function Face({ name, id, size = "size-14 text-[15px]" }: { name: string; id?: string; size?: string }) {
  const photo = id ? photoOf(id) : null;
  if (photo)
    return (
      <span className={`relative block ${size} shrink-0 overflow-hidden rounded-full bg-[var(--surface-elevated)] ring-1 ring-line`}>
        <Image src={photo} alt="" fill sizes="96px" className="object-cover object-[center_20%]" />
      </span>
    );
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
    /** sends, refreshes the list, and hands back the chat as it is now (with any reply) */
    send: async (body: string) => {
      const after = userId && openId ? await send(userId, openId, body) : null;
      load();
      return after;
    },
  };
}
type Inbox = ReturnType<typeof useInbox>;

/* ---------------- pieces ---------------- */

const EMOJIS = ["😊", "😁", "🙏", "👍", "😅", "🤔", "😬", "🦷", "🪥", "✨", "❤️", "🎉"] as const;
/** how long the dentist "types" before a reply shows */
const TYPING_MS = 1600;

/** The chat list: search, All / Unread, then chats newest first. */
function ThreadList({ me, inbox, header }: { me: Me; inbox: Inbox; header?: ReactNode }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "unread">("all");
  const unread = inbox.list?.filter((t) => t.unread).length ?? 0;
  const shown = inbox.list?.filter((t) => t.with.name.toLowerCase().includes(q.trim().toLowerCase()) && (only === "all" || t.unread));
  return (
    <div className="fmd-from-left flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-4 pb-1 pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-bold text-ink">Messages</h2>
          <p className="truncate text-[12.5px] text-ink-3">{me.full_name} · Demo</p>
        </div>
        {header}
        <span className={`${iconBtn} cursor-default text-ink-3`} title="New message (coming soon)" aria-label="New message (coming soon)">
          <SquarePen className="size-5" strokeWidth={1.75} />
        </span>
      </div>
      <label className="mx-4 mt-2 flex h-10 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 focus-within:bg-white/[0.1]">
        <Search className="size-4 text-ink-3" strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search messages" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3" />
        {q && (
          <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="text-ink-3 hover:text-ink">
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </label>
      <div role="tablist" aria-label="Show" className="flex gap-2 px-4 pb-2 pt-3">
        {(["all", "unread"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={only === k}
            onClick={() => setOnly(k)}
            className={`h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${only === k ? "bg-sky-500/20 text-sky-300" : "bg-white/[0.06] text-ink-2 hover:bg-white/[0.1]"}`}
          >
            {k === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
          </button>
        ))}
      </div>
      {!shown ? (
        <div className="mx-4 my-3 h-16 animate-pulse rounded-xl bg-[var(--surface-glass)]" aria-busy />
      ) : shown.length === 0 ? (
        <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
          <MessageCircle className="size-8 text-ink-3" strokeWidth={1.5} />
          <p className="text-[14px] text-ink-3">{q ? `No chats match “${q}”.` : "You're all caught up."}</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {shown.map((t) => {
            const last = t.messages.at(-1);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => inbox.pick(t.id)}
                  aria-current={inbox.open?.id === t.id}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.05] aria-[current=true]:bg-white/[0.08]"
                >
                  <Face name={t.with.name} id={t.with.id} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[15px] text-ink ${t.unread ? "font-bold" : "font-medium"}`}>{t.with.name}</span>
                      {last && <span className={`shrink-0 text-[12px] ${t.unread ? "font-semibold text-sky-400" : "text-ink-3"}`}>{ago(last.at)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`flex min-w-0 flex-1 items-center gap-1 text-[13px] ${t.unread ? "font-semibold text-ink" : "text-ink-3"}`}>
                        {last?.from === "me" && <CheckCheck className="size-4 shrink-0 text-sky-400" strokeWidth={2} aria-label="Delivered" />}
                        <span className="truncate">{last ? `${last.from === "me" ? "You: " : ""}${last.body}` : "Say hello"}</span>
                      </span>
                      {t.unread && <span className="size-2.5 shrink-0 rounded-full bg-sky-400" aria-label="Unread" />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** One chat: who it's with, their intro, the messages (grouped, with day breaks), and the composer. */
function Chat({ t, inbox, onBack, header }: { t: Thread; inbox: Inbox; onBack?: () => void; header?: ReactNode }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [emojis, setEmojis] = useState(false);
  /** the dentist's reply that is still being "typed": hidden behind a typing bubble for a moment */
  const [typing, setTyping] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const msgs = t.messages.filter((m) => m.id !== typing);
  const count = msgs.length;
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [t.id, count, typing]);
  const go = async (body: string) => {
    setErr(null);
    try {
      const after = await inbox.send(body);
      setText("");
      setEmojis(false);
      const reply = after?.messages.at(-1);
      if (reply?.from === "them") {
        setTyping(reply.id);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setTyping(null), TYPING_MS);
      }
    } catch (x) {
      setErr((x as Error).message);
    }
  };
  const submit = (e: FormEvent) => (e.preventDefault(), go(text));
  const lastMine = [...msgs].reverse().find((m) => m.from === "me");
  const lastIsMine = msgs.at(-1)?.from === "me";

  return (
    <div className="fmd-from-right flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        {onBack && (
          <button type="button" onClick={onBack} aria-label="Back to messages" className={iconBtn}>
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
        )}
        <Face name={t.with.name} id={t.with.id} size="size-10 text-[12px]" />
        <Link href={`/dentists/${t.with.id}`} className="min-w-0 flex-1 leading-tight hover:opacity-80">
          <span className="block truncate text-[15px] font-semibold text-ink">{t.with.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{typing ? <span className="text-sky-400">typing…</span> : t.with.specialty}</span>
        </Link>
        <Link href={`/dentists/${t.with.id}`} aria-label={`About ${t.with.name}`} title="View profile" className={iconBtn}>
          <Info className="size-5" strokeWidth={1.75} />
        </Link>
        {header}
      </header>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4">
        {/* a chat opens with who it's with */}
        <div className="mb-6 grid justify-items-center gap-1 text-center">
          <Face name={t.with.name} id={t.with.id} size="size-24 text-[26px]" />
          <p className="mt-2 text-[18px] font-semibold text-ink">{t.with.name}</p>
          <p className="text-[13px] text-ink-3">{t.with.specialty} · FMD demo dentist</p>
          <Link href={`/dentists/${t.with.id}`} className="mt-3 rounded-lg bg-white/[0.1] px-4 py-1.5 text-[13.5px] font-semibold text-ink hover:bg-white/[0.15]">
            View profile
          </Link>
          <p className="mt-4 flex max-w-[36ch] items-start gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-left text-[12px] text-ink-3">
            <ShieldCheck className="mt-px size-3.5 shrink-0" strokeWidth={1.75} /> General questions only. Don&apos;t share personal health details here.
          </p>
        </div>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const next = msgs[i + 1];
          const gap = !prev || Date.parse(m.at) - Date.parse(prev.at) > 3_600_000;
          const firstOfRun = gap || !prev || prev.from !== m.from;
          const lastOfRun = !next || next.from !== m.from || Date.parse(next.at) - Date.parse(m.at) > 3_600_000;
          const mine = m.from === "me";
          const heart = m.body === "❤️";
          // grouped bubbles, Messenger style: the corners facing the rest of the run are tighter
          const corners = mine
            ? `${firstOfRun ? "" : "rounded-tr-md"} ${lastOfRun ? "" : "rounded-br-md"}`
            : `${firstOfRun ? "" : "rounded-tl-md"} ${lastOfRun ? "" : "rounded-bl-md"}`;
          return (
            <div key={m.id} className="grid">
              {gap && <p className="my-4 text-center text-[11.5px] font-medium text-ink-3">{stamp(m.at)}</p>}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${lastOfRun ? "mb-2.5" : "mb-[3px]"}`}>
                {!mine && (lastOfRun ? <Face name={t.with.name} id={t.with.id} size="size-7 text-[10px]" /> : <span className="w-7 shrink-0" />)}
                <p
                  title={new Date(m.at).toLocaleString("en-IN")}
                  className={`fmd-bubble max-w-[75%] whitespace-pre-line break-words rounded-[20px] px-3.5 py-2 text-[14.5px] leading-snug ${mine ? "origin-bottom-right" : "origin-bottom-left"} ${
                    heart ? "bg-transparent px-0 text-[40px]" : `${corners} ${mine ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white" : "bg-white/[0.1] text-ink"}`
                  }`}
                >
                  {m.body}
                </p>
              </div>
              {/* a receipt under your latest message, while it's the last word */}
              {m === lastMine && lastIsMine && !typing && (
                <p className="-mt-1.5 mb-2 flex items-center justify-end gap-1 pr-1 text-[11.5px] text-ink-3">
                  <CheckCheck className="size-3.5 text-sky-400" strokeWidth={2} /> Sent · {new Date(m.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="fmd-bubble flex origin-bottom-left items-end gap-2" role="status" aria-label={`${t.with.name} is typing`}>
            <Face name={t.with.name} id={t.with.id} size="size-7 text-[10px]" />
            <span className="flex items-center gap-1 rounded-[20px] bg-white/[0.1] px-4 py-3">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="relative grid gap-1.5 border-t border-line p-3">
        {err && <p role="alert" className="px-2 text-[12.5px] text-[var(--tone-bad)]">{err}</p>}
        {emojis && (
          <div className="fmd-enter absolute bottom-[calc(100%-4px)] left-3 grid grid-cols-6 gap-1 rounded-2xl border border-line bg-[var(--surface-elevated)] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => (setText((x) => x + e), field.current?.focus())} aria-label={`Add ${e}`} className="grid size-9 place-items-center rounded-lg text-[20px] hover:bg-white/[0.08]">
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full bg-white/[0.07] pl-1.5 pr-3 focus-within:bg-white/[0.1]">
            <button type="button" onClick={() => setEmojis((v) => !v)} aria-label="Emoji" aria-expanded={emojis} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 hover:text-ink">
              <Smile className="size-[22px]" strokeWidth={1.5} />
            </button>
            <input
              ref={field}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="Message…"
              aria-label="Message"
              className="h-11 min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          {text.trim() ? (
            <button type="submit" aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white transition-transform active:scale-90">
              <Send className="size-5 -translate-x-px translate-y-px" strokeWidth={2} />
            </button>
          ) : (
            <button type="button" aria-label="Send a heart" onClick={() => go("❤️")} className="grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-white/[0.06]">
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
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    // only the dock morphs: the rest of the page stays live (no crossfade), so the feed's slide aside shows smoothly
    const html = document.documentElement;
    html.dataset.vt = "dock";
    document.startViewTransition(() => flushSync(apply)).finished.finally(() => delete html.dataset.vt);
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
              <Face name={t.with.name} id={t.with.id} size="size-8 text-[10.5px]" />
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
