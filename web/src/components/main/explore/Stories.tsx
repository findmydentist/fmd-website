"use client";

import { ChevronLeft, ChevronRight, Pause, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { initials } from "@/lib/fmd";

/**
 * Instagram-style stories: a full-screen viewer with progress bars that steps through each person's slides (5 s each),
 * tap the right side for next and the left for back, hold to pause, Esc or X to close. Used by Explore's stories row
 * and the profile page's highlights.
 */

export type StorySlide = {
  /** a picture: `cover` fills the frame (photos), `inset` sits in the middle of a coloured card (small artwork) */
  image?: string;
  fit?: "cover" | "inset";
  /** the card's colour when there is no full-frame photo (a Tailwind gradient "from-… via-…") */
  tone?: string;
  eyebrow?: string;
  title?: string;
  text?: string;
  link?: { href: string; label: string };
};
export type Story = { id: string; name: string; photo?: string | null; meta?: string; slides: StorySlide[] };

const SLIDE_MS = 5000;
const SEEN_KEY = "fmd-demo:stories-seen";

/** Stories already watched in this browser (a convenience; it's fine to lose). */
export function useSeen() {
  const [seen, setSeen] = useState<string[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mounting
      setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
    } catch {
      // storage blocked: nothing remembered
    }
  }, []);
  const mark = useCallback((id: string) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const next = [...s, id];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        // remembered for this visit only
      }
      return next;
    });
  }, []);
  return [seen, mark] as const;
}

/** A round picture with the story ring: blue while unwatched, grey once seen. */
export function StoryAvatar({ name, photo, size, seen = false, ring = true }: { name: string; photo?: string | null; size: string; seen?: boolean; ring?: boolean }) {
  const face = photo ? (
    <span className={`relative block ${size} shrink-0 overflow-hidden rounded-full bg-[var(--surface-elevated)]`}>
      <Image src={photo} alt="" fill sizes="96px" className="object-cover object-[center_20%]" />
    </span>
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-semibold text-ink`}>{initials(name)}</span>
  );
  if (!ring) return face;
  return (
    <span className={`block w-fit rounded-full p-[2.5px] ${seen ? "bg-[var(--border-strong)]" : "bg-[linear-gradient(135deg,#93c5fd,#3b82f6,#67e8f9)]"}`}>
      <span className="block rounded-full bg-[var(--background)] p-[2.5px]">{face}</span>
    </span>
  );
}

export function StoryViewer({ stories, start, onClose, onSeen }: { stories: Story[]; start: number; onClose: () => void; onSeen?: (id: string) => void }) {
  const [si, setSi] = useState(start);
  const [k, setK] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const story = stories[si];
  const slide = story?.slides[k];

  const next = useCallback(() => {
    if (!story) return;
    if (k < story.slides.length - 1) return setK(k + 1);
    if (si === stories.length - 1) return onClose();
    setSi(si + 1);
    setK(0);
  }, [k, si, story, stories.length, onClose]);
  const prev = useCallback(() => {
    if (k > 0) return setK(k - 1);
    if (si === 0) return;
    setSi(si - 1);
    setK(0);
  }, [k, si]);

  useEffect(() => {
    if (story) onSeen?.(story.id);
  }, [story, onSeen]);

  // the slide's clock: runs while not held down, restarts on every slide
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    setProgress(0);
  }, [si, k]);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      const p = Math.min(1, elapsed.current / SLIDE_MS);
      setProgress(p);
      if (p >= 1) next();
      else id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [paused, next, si, k]);

  // keyboard, and no page scroll behind
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === "Escape" ? onClose() : e.key === "ArrowRight" ? next() : e.key === "ArrowLeft" ? prev() : null);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
    };
  }, [onClose, next, prev]);

  if (!story || !slide) return null;
  const full = slide.image && slide.fit !== "inset";

  return (
    <div role="dialog" aria-modal aria-label={`Story: ${story.name}`} className="fixed inset-0 z-[80] grid place-items-center bg-black/95 backdrop-blur-sm">
      {/* desktop: step between people */}
      <button type="button" onClick={() => si > 0 && (setSi(si - 1), setK(0))} disabled={si === 0} aria-label="Previous story" className="absolute left-[calc(50%-min(46dvh,260px)-64px)] top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black disabled:opacity-0 sm:grid">
        <ChevronLeft className="size-6" strokeWidth={2} />
      </button>
      <button type="button" onClick={() => (si < stories.length - 1 ? (setSi(si + 1), setK(0)) : onClose())} aria-label="Next story" className="absolute right-[calc(50%-min(46dvh,260px)-64px)] top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black sm:grid">
        <ChevronRight className="size-6" strokeWidth={2} />
      </button>

      <div className="relative h-dvh w-full overflow-hidden bg-neutral-950 sm:h-[min(92dvh,920px)] sm:w-auto sm:aspect-[9/16] sm:rounded-2xl">
        {/* the slide */}
        <div key={`${si}-${k}`} className="fmd-enter absolute inset-0">
          {full ? (
            <Image src={slide.image!} alt="" fill sizes="520px" className="object-cover object-[center_25%]" priority />
          ) : (
            <div className={`grid size-full content-center justify-items-center gap-6 bg-gradient-to-br ${slide.tone ?? "from-sky-500/40 via-indigo-500/25"} to-neutral-950 p-8 text-center`}>
              {slide.image && (
                <span className="relative block aspect-[4/3] w-[62%] overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <Image src={slide.image} alt="" fill sizes="320px" className="object-cover" />
                </span>
              )}
              {slide.eyebrow && <p className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white/70">{slide.eyebrow}</p>}
              {slide.title && <p className="max-w-[16ch] text-balance text-[28px] font-semibold leading-tight text-white">{slide.title}</p>}
              {slide.text && <p className="max-w-[30ch] text-[15px] leading-relaxed text-white/80">{slide.text}</p>}
            </div>
          )}
          {full && (slide.title || slide.text) && (
            <div className="absolute inset-x-0 bottom-0 grid gap-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-24 pt-24 text-white">
              {slide.eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/70">{slide.eyebrow}</p>}
              {slide.title && <p className="text-[24px] font-semibold leading-tight">{slide.title}</p>}
              {slide.text && <p className="text-[14.5px] leading-relaxed text-white/85">{slide.text}</p>}
            </div>
          )}
        </div>

        {/* top: progress, who, close */}
        <div className="absolute inset-x-0 top-0 z-20 grid gap-3 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1">
            {story.slides.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span className="block h-full bg-white" style={{ width: `${i < k ? 100 : i === k ? progress * 100 : 0}%` }} />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5 text-white">
            <StoryAvatar name={story.name} photo={story.photo} size="size-8 text-[11px]" ring={false} />
            <span className="truncate text-[14px] font-semibold">{story.name}</span>
            {story.meta && <span className="shrink-0 text-[13px] text-white/70">{story.meta}</span>}
            {paused && <Pause className="size-4 text-white/80" strokeWidth={2} aria-label="Paused" />}
            <button type="button" onClick={onClose} aria-label="Close" className="ml-auto grid size-9 place-items-center rounded-full hover:bg-white/10">
              <X className="size-6" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* tap left for back, right for next; hold anywhere to pause */}
        <div
          className="absolute inset-0 z-10 grid grid-cols-[1fr_2fr]"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
        >
          <button type="button" aria-label="Back" onClick={prev} className="cursor-w-resize" />
          <button type="button" aria-label="Next" onClick={next} className="cursor-e-resize" />
        </div>

        {slide.link && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Link href={slide.link.href} onClick={onClose} className="rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black shadow-lg hover:bg-white/90">
              {slide.link.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
