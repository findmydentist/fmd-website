"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ButtonLink } from "@/components/app/kit";
import { Chats, Send, Verified } from "@/components/main/explore/icons";
import { Monogram } from "@/components/main/explore/Monogram";
import { useViewer } from "@/lib/useViewer";
import type { Viewer } from "@/lib/viewer";
import { acceptsStrangers, bookFor, CLINICAL_NOTE, getThread, inbox, markRead, MAX_MESSAGE, sendMessage, setAcceptsStrangers, type Message, type Thread } from "@/sample/messages";

/* ---------------- helpers ---------------- */

/** "now", "42m", "3h", "2d", then a date */
function ago(iso: string, now = Date.now()) {
  const m = Math.round((now - Date.parse(iso)) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h`;
  if (m < 7 * 24 * 60) return `${Math.round(m / 1440)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** A divider between messages more than an hour apart: "Today 10:42", "Mon 18:05", "3 Nov 09:10" */
function divider(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Date().toDateString() === d.toDateString();
  const week = Date.now() - d.getTime() < 6 * 86_400_000;
  return today ? `Today ${time}` : week ? `${d.toLocaleDateString("en-IN", { weekday: "short" })} ${time}` : `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${time}`;
}

const profileHref = (t: Thread) => `/explore/u/${t.with.id}`;
const lastLine = (t: Thread, me: string) => {
  const m = t.messages[t.messages.length - 1];
  if (!m) return "Say hello";
  const who = m.from === me ? "You: " : "";
  return who + (m.body || (m.attachment?.type === "post" ? "Passed on a post" : m.attachment?.type === "job" ? "Shared a job" : "Replied to a moment"));
};

/* ---------------- signed out ---------------- */

function SignedOut() {
  return (
    <div className="card mx-auto grid max-w-[520px] place-items-center gap-4 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent)]">
        <Chats size={28} />
      </span>
      <h1 className="text-[22px] font-semibold text-ink">Your chats live here</h1>
      <p className="max-w-[340px] text-[15px] text-ink-3">Talk to dentists, clinics and students, and follow up on jobs you applied for.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/login?next=/messages">Log in</ButtonLink>
        <ButtonLink href="/demo?next=/messages" variant="secondary">
          Use a demo account
        </ButtonLink>
      </div>
    </div>
  );
}

/** Preview only: /messages?look=glass shows chats on frosted surfaces, to compare with the plain look before deciding. */
const noSubscribe = () => () => {};
function useGlassPreview() {
  return useSyncExternalStore(noSubscribe, () => new URLSearchParams(location.search).get("look") === "glass", () => false);
}

/* ---------------- list ---------------- */

/** Clinics (and, later, dentists with an Explore profile) choose whether new people can start a chat. */
function NewPeopleSwitch({ me }: { me: Viewer }) {
  const id = me.kind === "clinic_owner" ? me.clinicId : null;
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    if (id) acceptsStrangers(id).then(setOn);
  }, [id]);
  if (!id || on === null) return null;
  return (
    <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 text-[13px] text-ink-2">
      <span>Messages from new people</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => setAcceptsStrangers(id, e.target.checked).then(() => setOn(e.target.checked))} className="size-4 accent-[var(--accent)]" />
    </label>
  );
}

function ThreadList({ me, threads, active }: { me: Viewer; threads: Thread[]; active: string | null }) {
  const look = useGlassPreview() ? "?look=glass" : "";
  const [q, setQ] = useState("");
  const shown = useMemo(() => threads.filter((t) => t.with.name.toLowerCase().includes(q.trim().toLowerCase())), [threads, q]);
  return (
    <section aria-label="Chats" className="flex min-h-0 flex-col">
      <div className="px-5 pb-3 pt-5">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.028em] text-ink">Chats</h1>
        <NewPeopleSwitch me={me} />
        <label className={`mt-3 flex h-11 items-center gap-2 rounded-[14px] px-3.5 text-ink-3 ${look ? "frost" : "bg-[var(--background)]"}`}>
          <span className="sr-only">Search chats</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-8 text-center text-[14px] text-ink-3">{q ? "No chats match that name." : "No chats yet."}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto px-2 pb-3">
          {shown.map((t) => {
            const on = t.id === active;
            return (
              <li key={t.id}>
                <Link
                  href={`/messages/${t.id}${look}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-[18px] px-3 py-3 transition-colors ${on ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--background)]"}`}
                >
                  <Monogram name={t.with.name} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15.5px] font-semibold tracking-[-0.012em] text-ink">{t.with.name}</span>
                      {t.with.verified && <Verified size={14} />}
                    </span>
                    {t.context === "job" && <span className="block truncate text-[12.5px] font-medium text-[var(--accent)]">About a job</span>}
                    <span className={`mt-0.5 block truncate text-[14px] leading-snug ${t.unread ? "font-medium text-ink" : "text-ink-3"}`}>{lastLine(t, me.id)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`text-[12.5px] tabular-nums ${t.unread ? "font-medium text-[var(--accent)]" : "text-ink-3"}`}>{ago(t.updated_at)}</span>
                    {t.unread > 0 && (
                      <span className="grid size-5 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
                        {t.unread}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------- one chat ---------------- */

function Attachment({ m }: { m: Message }) {
  const a = m.attachment;
  if (!a) return null;
  const [href, label] = a.type === "post" ? [`/explore/${a.postId}`, "Passed on a post"] : a.type === "job" ? [`/jobs/${a.jobId}`, "Shared a job"] : [null, "Replied to a moment"];
  const box = "mb-1 block rounded-[14px] border border-line bg-[var(--surface)] px-3 py-2 text-[12.5px] font-semibold text-ink";
  return href ? (
    <Link href={href} className={box}>
      {label} →
    </Link>
  ) : (
    <span className={box}>{label}</span>
  );
}

function Chat({ me, threadId, onSent }: { me: Viewer; threadId: string; onSent: () => void }) {
  const glass = useGlassPreview();
  const [t, setT] = useState<Thread | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(() => getThread(me.id, threadId, me.kind).then(setT), [me.id, me.kind, threadId]);
  useEffect(() => {
    markRead(me.id, threadId).then(load).then(onSent);
  }, [me.id, threadId, load, onSent]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" }); // braces: newer browsers return a Promise from scroll methods
  }, [t?.messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await sendMessage(me.id, threadId, text);
      setText("");
      await load();
      onSent();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't send that. Try again.");
    }
  };

  if (t === undefined) return <div className="flex-1 animate-pulse" aria-busy />;
  if (t === null)
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-[15px] text-ink-3">
        This chat doesn&apos;t exist any more.{" "}
        <Link href="/messages" className="font-semibold">
          Back to chats
        </Link>
      </div>
    );

  return (
    <section aria-label={`Chat with ${t.with.name}`} className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <Link href="/messages" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-[var(--background)] lg:hidden" aria-label="Back to chats">
          ←
        </Link>
        <Monogram name={t.with.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[16.5px] font-semibold tracking-[-0.015em] text-ink">{t.with.name}</span>
            {t.with.verified && <Verified size={14} />}
          </div>
          <Link href={profileHref(t)} className="text-[13px] text-ink-3 hover:text-ink">
            View profile
          </Link>
        </div>
        {bookFor(t.with) && (
          <ButtonLink href={bookFor(t.with)!} size="sm">
            Book
          </ButtonLink>
        )}
      </header>

      {t.clinicalNote && (
        <p role="note" className="mx-4 mt-3 rounded-[14px] bg-[var(--accent-soft)] px-4 py-2.5 text-[13px] text-ink-2 sm:mx-5">
          {CLINICAL_NOTE}{" "}
          <Link href={bookFor(t.with) ?? "/dentists"} className="font-semibold">
            {bookFor(t.with) ? "Book a consultation" : "Find a dentist"}
          </Link>
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5" aria-live="polite">
        {t.messages.length === 0 && <p className="py-10 text-center text-[14px] text-ink-3">Say hello to {t.with.name.split(" ").slice(0, 2).join(" ")}.</p>}
        <ol className="flex flex-col gap-1.5">
          {t.messages.map((m, i) => {
            const mine = m.from === me.id;
            const prev = t.messages[i - 1];
            const gap = !prev || Date.parse(m.at) - Date.parse(prev.at) > 3_600_000;
            return (
              <li key={m.id} className="flex flex-col">
                {gap && <span className="my-4 self-center text-[12px] font-medium tabular-nums tracking-[0.01em] text-ink-3">{divider(m.at)}</span>}
                <div className={`max-w-[78%] ${mine ? "self-end" : "self-start"}`}>
                  <Attachment m={m} />
                  {m.body && (
                    <p
                      className={`whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-[1.42] ${
                        mine ? `rounded-br-[6px] text-white ${glass ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_92%,white),var(--accent))] shadow-[0_8px_20px_-12px_rgb(var(--accent-rgb)/0.9)]" : "bg-[var(--accent)]"}` : `rounded-bl-[6px] text-ink ${glass ? "frost" : "bg-[var(--background)]"}`
                      }`}
                    >
                      {m.body}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={end} />
      </div>

      <form onSubmit={send} className="border-t border-line px-3 py-3 sm:px-4">
        {err && (
          <p role="alert" className="px-2 pb-2 text-[13px] text-[var(--tone-bad,#c0392b)]">
            {err}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Message {t.with.name}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={MAX_MESSAGE}
              placeholder="Write a message…"
              className={`max-h-32 min-h-11 w-full resize-none rounded-[22px] px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${glass ? "frost" : "bg-[var(--background)]"}`}
            />
          </label>
          <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white transition-opacity disabled:opacity-40">
            <Send size={20} />
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------------- page ---------------- */

/** /messages (list; on laptops with an empty chat area) and /messages/[threadId] (list + chat; chat alone on phones). */
export function MessagesPage() {
  const params = useParams<{ threadId?: string }>();
  const threadId = params.threadId ? decodeURIComponent(params.threadId) : null;
  const viewer = useViewer();
  const router = useRouter();
  const glass = useGlassPreview();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const refresh = useCallback(() => {
    if (viewer) inbox(viewer.id, viewer.kind).then(setThreads);
  }, [viewer]);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    // a link to a chat that isn't in this person's inbox goes back to the list
    if (threadId && threads && !threads.some((t) => t.id === threadId)) router.replace("/messages");
  }, [threadId, threads, router]);

  if (viewer === undefined) return <div className="card h-[70vh] animate-pulse" aria-busy />;
  if (viewer === null) return <SignedOut />;
  if (!threads) return <div className="card h-[70vh] animate-pulse" aria-busy />;

  const box = (
    <div className={`type-read flex h-[calc(100dvh-180px)] min-h-[520px] overflow-hidden ${glass ? "frost rounded-[28px]" : "card"}`}>
      <div className={`w-full flex-col border-line lg:flex lg:w-[360px] lg:shrink-0 lg:border-r ${threadId ? "hidden" : "flex"}`}>
        <ThreadList me={viewer} threads={threads} active={threadId} />
      </div>
      <div className={`min-w-0 flex-1 flex-col ${threadId ? "flex" : "hidden lg:flex"}`}>
        {threadId ? (
          <Chat key={threadId} me={viewer} threadId={threadId} onSent={refresh} />
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div className="grid justify-items-center gap-3">
              <span className="grid size-16 place-items-center rounded-[20px] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Chats size={30} />
              </span>
              <p className="text-[17px] font-semibold text-ink">Pick a chat</p>
              <p className="max-w-[280px] text-[14px] text-ink-3">Or message a dentist from their profile.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  return glass ? <div className="frost-stage">{box}</div> : box;
}

/** For the top bar: how many chats have something new. */
export function useUnreadChats() {
  const viewer = useViewer();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (viewer) inbox(viewer.id).then((ts) => setN(ts.filter((t) => t.unread > 0).length));
  }, [viewer]);
  return viewer ? n : 0;
}
