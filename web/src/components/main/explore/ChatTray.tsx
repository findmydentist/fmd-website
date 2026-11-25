"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Viewer } from "@/lib/viewer";
import { inbox, type Thread } from "@/sample/messages";
import { Chats, Verified } from "./icons";
import { Monogram } from "./Monogram";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

/**
 * Chats, minimised at the bottom right of Explore on laptops (owner, 16 Nov 2026): the feed stays in view, and recent
 * conversations are one click away. Phones keep chats behind the chat icon.
 */
export function ChatTray({ viewer }: { viewer: Viewer | null }) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => {
    if (viewer) inbox(viewer.id, viewer.kind).then(setThreads);
  }, [viewer]);
  if (!viewer) return null;
  const unread = threads?.filter((t) => t.unread > 0).length ?? 0;

  return (
    <div className="fixed bottom-0 right-6 z-30 hidden w-[340px] lg:block">
      <div className="overflow-hidden rounded-t-[20px] border border-b-0 border-line bg-[var(--surface)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
          <Chats size={20} className="text-ink" />
          <span className="flex-1 text-[14.5px] font-bold text-ink">Chats</span>
          {unread > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11.5px] font-bold text-white">{unread} new</span>}
          <span className={`text-[12px] text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
            ▴
          </span>
        </button>
        {open && (
          <div className="max-h-[360px] overflow-y-auto border-t border-line">
            {threads === null ? (
              <p className="px-4 py-6 text-[13.5px] text-ink-3">Loading…</p>
            ) : threads.length === 0 ? (
              <p className="px-4 py-6 text-[13.5px] text-ink-3">No chats yet. Message a dentist from their profile or a post.</p>
            ) : (
              <ul>
                {threads.slice(0, 6).map((t) => {
                  const last = t.messages.at(-1);
                  return (
                    <li key={t.id}>
                      <Link href={`/messages/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--background-secondary)]">
                        <Monogram name={t.with.name} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[13.5px] font-semibold text-ink">
                            <span className="truncate">{t.with.name}</span>
                            {t.with.verified && <Verified size={13} />}
                          </span>
                          <span className={`block truncate text-[12.5px] ${t.unread ? "font-semibold text-ink" : "text-ink-3"}`}>{last ? last.body || "Shared a post" : "Say hello"}</span>
                        </span>
                        <span className="text-[11.5px] text-ink-4">{ago(t.updated_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/messages" className="block border-t border-line px-4 py-2.5 text-center text-[13px] font-semibold text-[var(--accent)] hover:underline">
              Open all chats
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
