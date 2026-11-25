"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useViewer } from "@/lib/useViewer";
import type { Viewer } from "@/lib/viewer";
import { bookHref, creatorById } from "@/sample/creators";
import { feed, toggleFollow, toggleLike, type FeedItem } from "@/sample/content";
import { toggleSaved } from "@/sample/saved";
import { CommentsSheet } from "./Comments";
import { ExploreNav } from "./ExploreNav";
import { Appreciate, Ask, Keep, PassOn, Talk, Verified } from "./icons";
import { Monogram } from "./Monogram";
import { ShareSheet } from "./ShareSheet";

const PHOTO_CLIP_MS = 8000;
const REDUCE = "(prefers-reduced-motion: reduce)";
const useReduced = () =>
  useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCE);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
const count = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function Clip({ p, active, viewer, muted, setMuted, onChange }: { p: FeedItem; active: boolean; viewer: Viewer | null; muted: boolean; setMuted: (m: boolean) => void; onChange: () => void }) {
  const router = useRouter();
  const reduced = useReduced();
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [more, setMore] = useState(false);
  const [talking, setTalking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const m = p.media[0]!;
  const isVideo = m.kind === "video";
  const creator = creatorById(p.author.id);
  const book = creator ? bookHref(creator) : null;
  const playing = active && !paused && !reduced;

  // exactly one clip plays: the one on screen
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing) v.play().catch(() => undefined);
    else v.pause();
  }, [playing]);
  useEffect(() => {
    if (!playing || isVideo) return;
    const t0 = performance.now() - progress * PHOTO_CLIP_MS;
    let raf = 0;
    const tick = (t: number) => {
      setProgress(((t - t0) % PHOTO_CLIP_MS) / PHOTO_CLIP_MS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progress is the resume point
  }, [playing, isVideo]);

  const act = (fn: () => Promise<unknown>) => (viewer ? fn().then(onChange) : router.push("/login?next=/explore/reels"));
  const rail = "grid justify-items-center gap-1 text-[12px] font-semibold text-white";
  const railBtn = "grid size-12 place-items-center rounded-full bg-white/12 backdrop-blur-sm transition-colors hover:bg-white/22";

  return (
    <section aria-label={`${p.title}, by ${p.author.name}`} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black sm:rounded-[28px]">
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPaused((x) => !x)} className="absolute inset-0 z-0 block size-full cursor-pointer">
        {isVideo ? (
          <video ref={video} muted={muted} loop playsInline preload="metadata" poster={m.poster} onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} className="size-full object-contain">
            <source src={m.src} type="video/mp4" />
          </video>
        ) : (
          <span className={`relative block size-full ${playing ? "fmd-slow-pan" : ""}`}>
            <Image src={m.src} alt={m.alt} fill sizes="(min-width: 640px) 480px, 100vw" className="object-cover" priority={active} />
          </span>
        )}
      </button>
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.35),transparent_20%,transparent_55%,rgb(0_0_0/0.75))]" />

      {!playing && !reduced && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[26px] bg-white/85 text-[30px] text-[#1d1d1f]">
          ▶
        </span>
      )}
      {reduced && (
        <button type="button" onClick={() => video.current?.play()} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 px-5 py-2.5 text-[14px] font-semibold text-[#1d1d1f]">
          {isVideo ? "Play clip" : "Still photo clip"}
        </button>
      )}

      {isVideo && (
        <button type="button" onClick={() => setMuted(!muted)} aria-pressed={!muted} className="absolute right-4 top-4 z-10 rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-semibold text-white">
          {muted ? "Sound off" : "Sound on"}
        </button>
      )}

      <div className="absolute bottom-24 right-3 z-10 grid gap-4">
        <div className={rail}>
          <button type="button" aria-pressed={p.liked} aria-label="Appreciate" onClick={() => act(() => toggleLike(viewer!.id, p.id))} className={`${railBtn} ${p.liked ? "text-[#9fb7ff]" : ""}`}>
            <Appreciate size={26} filled={p.liked} />
          </button>
          {count(p.likes)}
        </div>
        <div className={rail}>
          <button type="button" aria-label="Talk" onClick={() => setTalking(true)} className={railBtn}>
            <Talk size={24} />
          </button>
          {count(p.comments)}
        </div>
        <div className={rail}>
          <button type="button" aria-label="Pass on" onClick={() => setSharing(true)} className={railBtn}>
            <PassOn size={24} />
          </button>
          Pass on
        </div>
        <div className={rail}>
          <button type="button" aria-pressed={p.saved} aria-label="Keep" onClick={() => act(() => toggleSaved(viewer!.id, "post", p.id))} className={railBtn}>
            <Keep size={23} filled={p.saved} />
          </button>
          Keep
        </div>
        <div className={rail}>
          <Link href={`/assistant?about=${encodeURIComponent(`post:${p.id}`)}`} aria-label="Ask FMD AI about this clip" className={`${railBtn} bg-[var(--accent)] hover:bg-[var(--accent)]`}>
            <Ask size={22} />
          </Link>
          Ask
        </div>
      </div>

      <div className="absolute bottom-6 left-4 right-20 z-10 grid gap-2 text-white">
        <div className="flex items-center gap-2.5">
          <Link href={`/explore/u/${p.author.handle}`}>
            <Monogram name={p.author.name} size={36} />
          </Link>
          <Link href={`/explore/u/${p.author.handle}`} className="truncate text-[14.5px] font-bold text-white">
            {p.author.name}
          </Link>
          {p.author.verified && <Verified size={14} />}
          {!p.following && p.author.kind !== "fmd" && (
            <button type="button" onClick={() => act(() => toggleFollow(viewer!.id, p.author.id))} className="rounded-full border border-white/70 px-3 py-1 text-[12px] font-bold text-white">
              Follow
            </button>
          )}
        </div>
        <p className={`text-[14px] leading-snug text-white/95 ${more ? "" : "line-clamp-2"}`} onClick={() => setMore(true)}>
          <span className="font-bold">{p.title}.</span> {p.caption}
        </p>
        {book && (
          <Link href={book} className="inline-flex h-10 w-fit items-center rounded-full bg-white px-4 text-[13.5px] font-bold text-[#1d1d1f]">
            Book {p.author.kind === "clinic" ? "a visit" : p.author.name.split(" ").slice(0, 2).join(" ")}
          </Link>
        )}
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/20">
        <span className="block h-full bg-white" style={{ width: `${progress * 100}%` }} />
      </span>
      {talking && <CommentsSheet postId={p.id} viewer={viewer} onClose={() => setTalking(false)} onCount={onChange} />}
      {sharing && <ShareSheet post={p} viewer={viewer} onClose={() => setSharing(false)} />}
    </section>
  );
}

/** /explore/reels: Clips, one at a time, swiped (or arrowed) vertically. */
export function ClipsPage() {
  const viewer = useViewer();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const ready = viewer !== undefined;
  const load = useCallback(() => {
    if (ready) feed(viewer?.id ?? null, "reels").then(setItems);
  }, [ready, viewer]);
  useEffect(load, [load]);

  useEffect(() => {
    const root = scroller.current;
    if (!root || !items) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))),
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const go = (d: number) => {
    const root = scroller.current;
    if (root) root.scrollTo({ top: Math.max(0, active + d) * root.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,480px)] lg:justify-center lg:gap-10">
      <ExploreNav active="reels" viewer={viewer ?? null} />
      <div
        ref={scroller}
        tabIndex={0}
        aria-label="Clips. Use the up and down arrow keys to move between clips, space to pause."
        onKeyDown={(e) => {
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          e.preventDefault();
          go(e.key === "ArrowDown" ? 1 : -1);
        }}
        className="h-[calc(100dvh-200px)] min-h-[520px] snap-y snap-mandatory overflow-y-auto rounded-[28px] outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:aspect-[9/16] sm:h-[min(820px,calc(100dvh-140px))]"
      >
        {items === null ? (
          <div className="size-full animate-pulse rounded-[28px] bg-[var(--background-secondary)]" aria-busy />
        ) : (
          items.map((p, i) => (
            <div key={p.id} data-i={i} className="h-full">
              <Clip p={p} active={i === active} viewer={viewer ?? null} muted={muted} setMuted={setMuted} onChange={load} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
