"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Sheet } from "@/components/app/Sheet";
import type { Viewer } from "@/lib/viewer";
import { addComment, comments as listComments, deleteComment, toggleCommentLike, type Comment, type CommentThread } from "@/sample/content";
import { Appreciate, Send } from "./icons";
import { Monogram } from "./Monogram";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};

function Line({ c, viewer, onReply, onChange, small = false }: { c: Comment; viewer: Viewer | null; onReply: (c: Comment) => void; onChange: () => void; small?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const name = c.mine ? "You" : c.author;
  return (
    <div className="flex gap-3">
      <Monogram name={c.mine ? (viewer?.name ?? "You") : c.author} size={small ? 30 : 36} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-[1.5] text-ink">
          <span className="font-bold">{name}</span> {c.body}
        </p>
        <div className="mt-1 flex items-center gap-4 text-[12.5px] text-ink-3">
          <span>{ago(c.at)}</span>
          {(c.likes ?? 0) > 0 && <span>{c.likes} appreciated</span>}
          {viewer && (
            <button type="button" onClick={() => onReply(c)} className="font-semibold hover:text-ink">
              Reply
            </button>
          )}
          {c.mine && viewer && (
            <button type="button" onClick={() => deleteComment(viewer.id, c.id).then(onChange)} className="hover:text-ink">
              Delete
            </button>
          )}
        </div>
        {err && <p className="text-[12.5px] text-ink-3">{err}</p>}
      </div>
      <button
        type="button"
        aria-pressed={!!c.liked}
        aria-label={c.liked ? "Appreciated" : "Appreciate comment"}
        onClick={() => (viewer ? toggleCommentLike(viewer.id, c.id).then(onChange, (e: Error) => setErr(e.message)) : setErr("Log in to appreciate comments."))}
        className={`grid size-8 shrink-0 place-items-center self-start rounded-full hover:bg-[var(--background)] ${c.liked ? "text-[var(--accent)]" : "text-ink-3"}`}
      >
        <Appreciate size={16} filled={c.liked} />
      </button>
    </div>
  );
}

/** A post's comments with replies, and the box to add one. Used inline on the post page and inside the Talk sheet. */
export function CommentsPanel({ postId, viewer, onCount }: { postId: string; viewer: Viewer | null; onCount?: () => void }) {
  const [list, setList] = useState<CommentThread[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(() => listComments(viewer?.id ?? null, postId).then(setList), [viewer?.id, postId]);
  useEffect(() => {
    load();
  }, [load]);
  const changed = () => {
    load();
    onCount?.();
  };

  const post = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await addComment(viewer?.id ?? null, viewer?.name ?? "", postId, text, replyTo?.id);
      setText("");
      setReplyTo(null);
      changed();
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <div className="grid gap-4">
      {list === null ? (
        <div className="h-24 animate-pulse rounded-[18px] bg-[var(--background)]" aria-busy />
      ) : list.length === 0 ? (
        <p className="py-4 text-center text-[14px] text-ink-3">No comments yet. Start the conversation.</p>
      ) : (
        <ul className="grid gap-5">
          {list.map((c) => (
            <li key={c.id} className="grid gap-3">
              <Line
                c={c}
                viewer={viewer}
                onChange={changed}
                onReply={(x) => {
                  setReplyTo(x);
                  input.current?.focus();
                }}
              />
              {c.replies.length > 0 && (
                <ul className="ml-12 grid gap-3 border-l-2 border-line pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <Line
                        c={r}
                        viewer={viewer}
                        small
                        onChange={changed}
                        onReply={(x) => {
                          setReplyTo(x);
                          input.current?.focus();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewer ? (
        <form onSubmit={post} className="grid gap-2 border-t border-line pt-4">
          {replyTo && (
            <p className="flex items-center justify-between rounded-[12px] bg-[var(--background)] px-3 py-2 text-[12.5px] text-ink-2">
              Replying to {replyTo.mine ? "yourself" : replyTo.author}
              <button type="button" onClick={() => setReplyTo(null)} className="font-semibold text-ink-3 hover:text-ink">
                Cancel
              </button>
            </p>
          )}
          {err && (
            <p role="alert" className="text-[13px] text-[var(--tone-bad,#c0392b)]">
              {err}
            </p>
          )}
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">{replyTo ? "Your reply" : "Your comment"}</span>
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Add a comment. Please don't share personal health details."
                className="h-11 w-full rounded-full bg-[var(--background)] px-4 text-[14px] text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              />
            </label>
            <button type="submit" disabled={!text.trim()} aria-label="Post comment" className="grid size-11 place-items-center rounded-full bg-[var(--accent)] text-white disabled:opacity-40">
              <Send size={19} />
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-line pt-4 text-[14px] text-ink-3">
          <Link href={`/login?next=${encodeURIComponent(`/explore/${postId}`)}`} className="font-semibold">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}
    </div>
  );
}

/** The Talk sheet over the feed: slides up on phones, sits at the side on laptops (the shared Sheet). */
export function CommentsSheet({ postId, viewer, onClose, onCount }: { postId: string; viewer: Viewer | null; onClose: () => void; onCount?: () => void }) {
  return (
    <Sheet title="Talk" onClose={onClose}>
      <CommentsPanel postId={postId} viewer={viewer} onCount={onCount} />
    </Sheet>
  );
}
