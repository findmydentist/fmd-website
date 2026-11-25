"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { Viewer } from "@/lib/viewer";
import { canCreate } from "@/lib/viewer";
import { openThread, partyOf, sendMessage, MessagesOff } from "@/sample/messages";
import { markStorySeen, storyRail, type StoryRing } from "@/sample/stories";
import { Appreciate, Create, Send, Verified } from "./icons";
import { Monogram } from "./Monogram";

const PHOTO_MS = 5000;

const REDUCE = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
}

function hoursAgo(iso: string) {
  const h = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  return `${h}h`;
}

/* ---------------- the rail ---------------- */

/** Today's Moments as soft squares (owner's pick, 16 Nov 2026): the moment's own photo, a small blue spark in the
 *  corner while there's something new, faded once watched. */
export function MomentsRail({ viewer }: { viewer: Viewer | null }) {
  const [rings, setRings] = useState<StoryRing[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(() => storyRail(viewer?.id ?? null).then(setRings), [viewer?.id]);
  useEffect(() => {
    load();
  }, [load]);

  if (!rings) return <div className="card h-[132px] animate-pulse" aria-busy />;
  return (
    <section aria-label="Moments" className="card px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">Moments</h2>
        <span className="text-[12.5px] text-ink-3">From the last 24 hours</span>
      </div>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {canCreate(viewer) && (
          <li className="shrink-0">
            <Link href="/explore/new?type=moment" className="group flex w-[68px] flex-col items-center gap-2 text-center">
              <span className="grid size-[66px] place-items-center rounded-[22px] border-2 border-dashed border-line-strong text-ink-3 transition-colors group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
                <Create size={26} />
              </span>
              <span className="w-full truncate text-[12px] text-ink-2">Your moment</span>
            </Link>
          </li>
        )}
        {rings.map((r, i) => {
          const cover = r.items[0]!;
          return (
            <li key={r.creator.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`${r.creator.name}: ${r.items.length} moment${r.items.length > 1 ? "s" : ""}${r.seen ? ", seen" : ", new"}`}
                className="group flex w-[68px] flex-col items-center gap-2 text-center"
              >
                <span className="relative block size-[66px] transition-transform duration-200 group-hover:-translate-y-0.5">
                  <span className={`relative block size-full overflow-hidden rounded-[22px] bg-[var(--background-secondary)] ${r.seen ? "opacity-55" : ""}`}>
                    <Image src={cover.media.src} alt="" fill sizes="70px" className="object-cover" />
                  </span>
                  {!r.seen && (
                    <span className="absolute -right-1.5 -top-1.5 grid size-[22px] place-items-center rounded-full bg-[var(--surface)]" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="var(--accent)" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className={`w-full truncate text-[12px] ${r.seen ? "text-ink-3" : "text-ink"}`}>{r.creator.handle}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && (
        <MomentViewer
          rings={rings}
          start={open}
          viewer={viewer}
          onClose={() => {
            setOpen(null);
            load();
          }}
        />
      )}
    </section>
  );
}

/* ---------------- the viewer ---------------- */

export function MomentViewer({ rings, start, viewer, onClose }: { rings: StoryRing[]; start: number; viewer: Viewer | null; onClose: () => void }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [ri, setRi] = useState(start);
  const [si, setSi] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prog, setProg] = useState({ id: "", p: 0 });
  const [reply, setReply] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const ring = rings[ri]!;
  const item = ring.items[si]!;
  const progress = prog.id === item.id ? prog.p : 0;

  const next = useCallback(() => {
    if (si < ring.items.length - 1) return setSi(si + 1);
    if (ri < rings.length - 1) {
      setRi(ri + 1);
      return setSi(0);
    }
    onClose();
  }, [si, ri, ring.items.length, rings.length, onClose]);
  const prev = useCallback(() => {
    if (si > 0) return setSi(si - 1);
    if (ri > 0) {
      setRi(ri - 1);
      setSi(0);
    }
  }, [si, ri]);

  // seen, and the timer for this moment
  useEffect(() => {
    if (viewer) markStorySeen(viewer.id, item.id);
  }, [item.id, viewer]);
  useEffect(() => {
    if (reduced || paused) return;
    const t0 = performance.now() - progress * PHOTO_MS;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / PHOTO_MS);
      setProg({ id: item.id, p });
      if (p >= 1) next();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progress is the resume point, not a trigger
  }, [item.id, paused, reduced, next]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      prevFocus?.focus();
    };
  }, []);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!viewer) return router.push(`/login?next=${encodeURIComponent("/explore")}`);
    if (!reply.trim()) return;
    try {
      const t = await openThread(viewer, partyOf(ring.creator));
      await sendMessage(viewer.id, t.id, reply, { type: "story", storyId: item.id });
      setReply("");
      setNote("Sent. You'll find it in Chats.");
    } catch (x) {
      setNote(x instanceof MessagesOff ? x.message : "Couldn't send that. Try again.");
    }
  };

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={`${ring.creator.name}'s moments`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
        if (e.key === " ") {
          e.preventDefault();
          setPaused((p) => !p);
        }
        if (e.key === "Tab") {
          // keep focus inside the dialog
          const f = box.current?.querySelectorAll<HTMLElement>("button, a, input");
          if (!f?.length) return;
          const first = f[0]!, last = f[f.length - 1]!;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
      className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(8_9_12/0.94)] p-0 outline-none sm:p-6"
    >
      <button type="button" onClick={onClose} aria-label="Close moments" className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-[22px] text-white hover:bg-white/20">
        ×
      </button>
      <button type="button" onClick={prev} aria-label="Previous moment" className="absolute left-6 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[20px] text-[#1d1d1f] sm:grid">
        ‹
      </button>
      <button type="button" onClick={next} aria-label="Next moment" className="absolute right-6 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[20px] text-[#1d1d1f] sm:grid">
        ›
      </button>

      <div
        className="relative h-full w-full overflow-hidden bg-black sm:aspect-[9/16] sm:h-[min(860px,calc(100dvh-48px))] sm:w-auto sm:rounded-[28px]"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onTouchStart={(e) => (touch.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          if (!s) return;
          const dx = e.changedTouches[0]!.clientX - s.x, dy = e.changedTouches[0]!.clientY - s.y;
          if (dy > 90 && Math.abs(dx) < 60) onClose();
          else if (Math.abs(dx) > 70) {
            setRi(dx < 0 ? Math.min(rings.length - 1, ri + 1) : Math.max(0, ri - 1));
            setSi(0);
          }
        }}
      >
        <Image key={item.id} src={item.media.src} alt={item.media.alt} fill sizes="(min-width: 640px) 480px, 100vw" className="object-cover" priority />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.45),transparent_22%,transparent_55%,rgb(0_0_0/0.7))]" />

        {/* tap zones */}
        <button type="button" tabIndex={-1} aria-hidden onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
        <button type="button" tabIndex={-1} aria-hidden onClick={next} className="absolute inset-y-0 right-0 w-1/3" />

        <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
          {ring.items.map((s, i) => (
            <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
              <span className="block h-full rounded-full bg-white" style={{ width: `${i < si ? 100 : i === si ? (reduced ? 100 : progress * 100) : 0}%` }} />
            </span>
          ))}
        </div>
        <div className="absolute inset-x-4 top-7 flex items-center gap-2.5 text-white">
          <Monogram name={ring.creator.name} size={34} />
          <Link href={`/explore/u/${ring.creator.handle}`} className="text-[14px] font-semibold text-white hover:underline">
            {ring.creator.name}
          </Link>
          {ring.creator.verified && <Verified size={14} />}
          <span className="text-[13px] text-white/75">{hoursAgo(item.at)}</span>
          {paused && <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">Paused</span>}
        </div>

        <div className="absolute inset-x-5 bottom-24 text-white">
          {item.caption && <p className="text-[22px] font-bold leading-tight tracking-[-0.02em]">{item.caption}</p>}
          {item.link && (
            <Link href={item.link.href} className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 text-[13.5px] font-semibold text-[#1d1d1f]">
              {item.link.label}
            </Link>
          )}
          {reduced && <p className="mt-3 text-[12.5px] text-white/75">Tap the sides or use the arrow keys to move between moments.</p>}
        </div>

        <form onSubmit={send} className="absolute inset-x-3 bottom-4 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <label className="flex-1">
            <span className="sr-only">Reply to {ring.creator.name}</span>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              maxLength={500}
              placeholder={`Reply to ${ring.creator.name.split(" ").slice(0, 2).join(" ")}…`}
              className="h-11 w-full rounded-full border border-white/45 bg-black/20 px-4 text-[14px] text-white outline-none placeholder:text-white/70 focus-visible:border-white"
            />
          </label>
          {reply.trim() ? (
            <button type="submit" aria-label="Send reply" className="grid size-11 place-items-center rounded-full bg-white text-[#1d1d1f]">
              <Send size={20} />
            </button>
          ) : (
            <span className="grid size-11 place-items-center text-white" aria-hidden>
              <Appreciate size={24} />
            </span>
          )}
        </form>
        {note && (
          <p role="status" className="absolute inset-x-6 bottom-[72px] rounded-full bg-black/60 px-4 py-2 text-center text-[13px] text-white">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
