"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/app/Sheet";
import type { Viewer } from "@/lib/viewer";
import type { FeedItem } from "@/sample/content";
import { inbox, sendMessage, type Thread } from "@/sample/messages";
import { Monogram } from "./Monogram";

/** Pass on: send a post into one of your chats, copy its link, or hand it to the phone's share menu. */
export function ShareSheet({ post, viewer, onClose }: { post: FeedItem; viewer: Viewer | null; onClose: () => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const url = typeof location === "undefined" ? `/explore/${post.id}` : `${location.origin}/explore/${post.id}`;
  useEffect(() => {
    if (viewer) inbox(viewer.id).then((ts) => setThreads(ts.slice(0, 8)));
  }, [viewer]);

  const sendTo = async (t: Thread) => {
    await sendMessage(viewer!.id, t.id, "", { type: "post", postId: post.id });
    setSent((s) => [...s, t.id]);
  };

  return (
    <Sheet title="Pass on" onClose={onClose}>
      <div className="grid gap-5">
        {viewer ? (
          <div>
            <p className="pb-3 text-[13.5px] text-ink-3">Send to a chat</p>
            {threads === null ? (
              <div className="h-24 animate-pulse rounded-[18px] bg-[var(--background)]" aria-busy />
            ) : threads.length === 0 ? (
              <p className="text-[14px] text-ink-3">No chats yet. Message a dentist from their profile.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {threads.map((t) => {
                  const done = sent.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button type="button" disabled={done} onClick={() => sendTo(t)} className="flex w-full flex-col items-center gap-1.5 text-center disabled:opacity-60">
                        <Monogram name={t.with.name} size={52} />
                        <span className="line-clamp-2 text-[12px] leading-tight text-ink">{t.with.name}</span>
                        <span className={`text-[11.5px] font-semibold ${done ? "text-ink-3" : "text-[var(--accent)]"}`}>{done ? "Sent" : "Send"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-[14px] text-ink-3">
            <Link href={`/login?next=${encodeURIComponent(`/explore/${post.id}`)}`} className="font-semibold">
              Log in
            </Link>{" "}
            to send posts to your chats.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(url).then(() => setNote("Link copied."), () => setNote(url))}
            className="h-11 rounded-full border border-line px-5 text-[14px] font-semibold text-ink hover:border-line-strong"
          >
            Copy link
          </button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button type="button" onClick={() => navigator.share({ title: post.title, url }).catch(() => undefined)} className="h-11 rounded-full border border-line px-5 text-[14px] font-semibold text-ink hover:border-line-strong">
              More options
            </button>
          )}
        </div>
        {note && (
          <p role="status" className="text-[13px] text-ink-2">
            {note}
          </p>
        )}
      </div>
    </Sheet>
  );
}
