"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Viewer } from "@/lib/viewer";
import { creatorById, bookHref } from "@/sample/creators";
import { FMD_FILM, FMD_FILM_CAPTIONS, toggleFollow, toggleLike, vote, type FeedItem, type Slide } from "@/sample/content";
import { toggleSaved } from "@/sample/saved";
import { Appreciate, Ask, Keep, More, PassOn, Talk, Verified } from "./icons";
import { Monogram } from "./Monogram";
import { CommentsSheet } from "./Comments";
import { ReportSheet } from "./ReportSheet";
import { ShareSheet } from "./ShareSheet";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  if (m < 10080) return `${Math.round(m / 1440)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const count = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : n.toLocaleString("en-IN"));
const captionsUrl = (vtt: string) => `data:text/vtt;charset=utf-8,${encodeURIComponent(vtt)}`;

/* ---------------- media ---------------- */

const TONE: Record<Slide["tone"], string> = {
  accent: "bg-[var(--accent)] text-white",
  ink: "bg-[#1d1d1f] text-white",
  paper: "bg-[#f3f5fb] text-[#1d1d1f]",
};

function SlideFace({ s, cover, first }: { s: Slide; cover?: string; first: boolean }) {
  return (
    <div className={`relative flex size-full flex-col justify-end gap-3 p-8 sm:p-12 ${first && cover ? "text-white" : TONE[s.tone]}`}>
      {first && cover && (
        <>
          <Image src={cover} alt="" fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover" />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.1),rgb(10_20_50/0.78))]" />
        </>
      )}
      {s.kicker && <span className="relative text-[12px] font-bold uppercase tracking-[0.22em] opacity-75">{s.kicker}</span>}
      <span className="relative text-[clamp(26px,4.4vw,36px)] font-extrabold leading-[1.1] tracking-[-0.03em]">{s.text}</span>
    </div>
  );
}

/** Swipeable media: photos, a slides post, or a clip. Scroll-snap does the swiping; arrows and dots follow it. */
function Media({ p, onDouble }: { p: FeedItem; onDouble: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const pages = p.kind === "slides" ? (p.slides ?? []).length : p.media.length;
  const go = (n: number) => track.current?.scrollTo({ left: n * track.current.clientWidth, behavior: "smooth" });

  // clips play muted while in view, and pause when scrolled away
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e!.isIntersecting ? v.play().catch(() => undefined) : v.pause()), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const tall = p.kind === "video" && p.media[0]?.kind !== "video";
  const ratio = tall || (p.media[0] && p.media[0].h > p.media[0].w) ? "aspect-[4/5]" : p.kind === "video" ? "aspect-video" : "aspect-[4/5]";
  return (
    <div className={`relative ${ratio} select-none overflow-hidden bg-[var(--background-secondary)]`} onDoubleClick={onDouble}>
      {p.kind === "video" && p.media[0]?.kind === "video" ? (
        <video ref={video} muted loop playsInline controls preload="metadata" poster={p.media[0].poster} className="size-full bg-black object-contain" aria-label={p.media[0].alt}>
          <source src={p.media[0].src} type="video/mp4" />
          {p.media[0].src === FMD_FILM.src && <track kind="captions" srcLang="en" label="English" src={captionsUrl(FMD_FILM_CAPTIONS)} default />}
          {p.media[0].captions && <track kind="captions" srcLang="en" label="English" src={p.media[0].captions} default />}
        </video>
      ) : (
        <div
          ref={track}
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="flex size-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {p.kind === "slides"
            ? (p.slides ?? []).map((s, n) => (
                <div key={n} className="size-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${n + 1} of ${pages}`}>
                  <SlideFace s={s} cover={p.media[0]?.src} first={n === 0} />
                </div>
              ))
            : p.media.map((m, n) => (
                <div key={m.key + n} className={`relative size-full shrink-0 snap-center ${tall ? "fmd-slow-pan" : ""}`} aria-roledescription="slide" aria-label={`${n + 1} of ${pages}`}>
                  <Image src={m.src} alt={m.alt} fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover" priority={false} />
                </div>
              ))}
        </div>
      )}
      {p.treatment && (
        <span className="absolute left-3.5 top-3.5 rounded-full bg-white/92 px-3 py-1.5 text-[12px] font-bold text-[var(--accent)] shadow-sm">
          {p.treatment.name}
          {p.treatment.duration && ` · ${p.treatment.duration}`}
        </span>
      )}
      {tall && <span className="absolute left-3.5 top-3.5 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white">Clip</span>}
      {pages > 1 && (
        <>
          <span className="absolute right-3.5 top-3.5 rounded-full bg-black/50 px-2.5 py-1 text-[11.5px] font-semibold text-white">
            {i + 1} / {pages}
          </span>
          {i > 0 && (
            <button type="button" onClick={() => go(i - 1)} aria-label="Previous" className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[18px] text-[#1d1d1f] shadow sm:grid">
              ‹
            </button>
          )}
          {i < pages - 1 && (
            <button type="button" onClick={() => go(i + 1)} aria-label="Next" className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[18px] text-[#1d1d1f] shadow sm:grid">
              ›
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Poll({ p, viewer, onChange, act }: { p: FeedItem; viewer: Viewer | null; onChange: () => void; act: (fn: () => Promise<unknown>) => void }) {
  const total = p.votes?.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <div className="grid gap-2 px-5 pt-1">
      {(p.poll ?? []).map((o, n) =>
        p.votes ? (
          <div key={o} className="relative overflow-hidden rounded-[14px] bg-[var(--background)] px-4 py-3 text-[14px]">
            <span aria-hidden className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]" style={{ width: `${Math.round((p.votes[n]! / total) * 100)}%` }} />
            <span className={`relative flex justify-between ${p.myVote === n ? "font-bold text-ink" : "text-ink-2"}`}>
              <span>{o}</span>
              <span>{Math.round((p.votes[n]! / total) * 100)}%</span>
            </span>
          </div>
        ) : (
          <button key={o} type="button" onClick={() => act(() => vote(viewer?.id ?? null, p.id, n).then(onChange))} className="rounded-[14px] border border-line px-4 py-3 text-left text-[14px] font-semibold text-ink transition-colors hover:border-[var(--accent)]">
            {o}
          </button>
        ),
      )}
      <p className="text-[12.5px] text-ink-3">{p.votes ? `${total.toLocaleString("en-IN")} answers` : "Answer to see the results"}</p>
    </div>
  );
}

/* ---------------- the card ---------------- */

export function PostCard({ p, viewer, onChange, full = false, onTalk }: { p: FeedItem; viewer: Viewer | null; onChange: () => void; full?: boolean; onTalk?: () => void }) {
  const router = useRouter();
  const [more, setMore] = useState(full);
  const [menu, setMenu] = useState(false);
  const [why, setWhy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [talking, setTalking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pop, setPop] = useState(0);
  const [bounce, setBounce] = useState(false);
  const here = full ? `/explore/${p.id}` : "/explore";
  const creator = creatorById(p.author.id);
  const book = creator ? bookHref(creator) : null;
  const mine = p.author.id === viewer?.id || p.author.id === `me-${viewer?.id}`;

  const act = (fn: () => Promise<unknown>) => {
    if (!viewer) return router.push(`/login?next=${encodeURIComponent(here)}`);
    fn()
      .then(onChange)
      .catch((e: Error) => setNote(e.message));
  };
  const appreciate = () => {
    setBounce(true);
    act(() => toggleLike(viewer!.id, p.id));
  };
  const doubleTap = () => {
    if (!viewer) return router.push(`/login?next=${encodeURIComponent(here)}`);
    setPop((n) => n + 1);
    if (!p.liked) act(() => toggleLike(viewer.id, p.id)); // a double tap only ever appreciates
  };

  return (
    <article className="card overflow-hidden" aria-labelledby={`t-${p.id}`}>
      <header className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <Link href={`/explore/u/${p.author.handle}`} className="shrink-0">
          <Monogram name={p.author.name} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/explore/u/${p.author.handle}`} className="truncate text-[14.5px] font-bold text-ink hover:underline">
              {p.author.name}
            </Link>
            {p.author.verified && <Verified size={15} />}
            <span className="shrink-0 text-[13px] text-ink-3">· {ago(p.published_at)}</span>
          </div>
          <p className="truncate text-[12.5px] text-ink-3">
            {p.sponsored_by ? `Sponsored by ${p.sponsored_by}` : [p.author.specialty, p.author.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!mine && !p.following && p.author.kind !== "fmd" && (
          <button type="button" onClick={() => act(() => toggleFollow(viewer!.id, p.author.id))} className="hidden h-9 rounded-full px-3.5 text-[13px] font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] sm:block">
            Follow
          </button>
        )}
        {book && (
          <Link href={book} className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--button-primary)] px-4 text-[13px] font-semibold text-[var(--button-primary-fg)] hover:opacity-90">
            Book
          </Link>
        )}
        <div className="relative">
          <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="More" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-[var(--background)]">
            <More size={20} />
          </button>
          {menu && (
            <div role="menu" className="card absolute right-0 top-10 z-20 w-[230px] p-1.5" onMouseLeave={() => setMenu(false)}>
              {[
                ["Why you're seeing this", () => setWhy(true)],
                ["Copy link", () => navigator.clipboard?.writeText(location.origin + `/explore/${p.id}`).then(() => setNote("Link copied."))],
                ...(p.following ? [[`Unfollow ${p.author.name}`, () => act(() => toggleFollow(viewer!.id, p.author.id))] as const] : []),
                ["Report", () => (viewer ? setReporting(true) : router.push(`/login?next=${encodeURIComponent(here)}`))],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    (fn as () => void)();
                  }}
                  className="block w-full rounded-[12px] px-3 py-2.5 text-left text-[14px] text-ink hover:bg-[var(--background)]"
                >
                  {label as string}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {p.kind === "poll" ? (
        <Poll p={p} viewer={viewer} onChange={onChange} act={act} />
      ) : (
        <div className="relative">
          <Media p={p} onDouble={doubleTap} />
          {pop > 0 && (
            <span key={pop} aria-hidden className="fmd-appreciate-pop pointer-events-none absolute inset-0 grid place-items-center text-white" onAnimationEnd={() => setPop(0)}>
              <Appreciate size={104} filled className="drop-shadow-[0_8px_24px_rgb(0_0_0/0.3)]" />
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-0.5 px-2.5 pt-2 sm:px-3.5">
        <button
          type="button"
          onClick={appreciate}
          onAnimationEnd={() => setBounce(false)}
          aria-pressed={p.liked}
          aria-label={p.liked ? "Appreciated" : "Appreciate"}
          className={`grid size-11 place-items-center rounded-full hover:bg-[var(--background)] ${p.liked ? "text-[var(--accent)]" : "text-ink"} ${bounce ? "fmd-bounce" : ""}`}
        >
          <Appreciate size={26} filled={p.liked} />
        </button>
        <button type="button" onClick={() => (onTalk ? onTalk() : setTalking(true))} aria-label={`Talk: ${p.comments} comments`} className="grid size-11 place-items-center rounded-full text-ink hover:bg-[var(--background)]">
          <Talk size={25} />
        </button>
        <button type="button" onClick={() => setSharing(true)} aria-label="Pass on" className="grid size-11 place-items-center rounded-full text-ink hover:bg-[var(--background)]">
          <PassOn size={25} />
        </button>
        <Link href={`/assistant?about=${encodeURIComponent(`post:${p.id}`)}`} className="ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--accent-soft)] px-3 text-[12.5px] font-semibold text-[var(--accent)]">
          <Ask size={16} /> Ask FMD AI
        </Link>
        <button
          type="button"
          onClick={() => act(() => toggleSaved(viewer!.id, "post", p.id))}
          aria-pressed={p.saved}
          aria-label={p.saved ? "Kept" : "Keep"}
          className={`ml-auto grid size-11 place-items-center rounded-full hover:bg-[var(--background)] ${p.saved ? "text-[var(--accent)]" : "text-ink"}`}
        >
          <Keep size={24} filled={p.saved} />
        </button>
      </div>

      <div className="grid gap-1.5 px-5 pb-5 pt-1">
        <p className="text-[14px] font-bold text-ink">{count(p.likes)} appreciations</p>
        <h3 id={`t-${p.id}`} className="sr-only">
          {p.title}
        </h3>
        <p className={`text-[14.5px] leading-[1.55] text-ink ${more ? "" : "line-clamp-2"}`}>
          <Link href={`/explore/u/${p.author.handle}`} className="font-bold text-ink">
            {p.author.handle}
          </Link>{" "}
          {p.caption}
        </p>
        {!more && p.caption.length > 110 && (
          <button type="button" onClick={() => setMore(true)} className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
            more
          </button>
        )}
        {p.tags.length > 0 && (
          <p className="flex flex-wrap gap-x-2 text-[13.5px]">
            {p.tags.map((t) => (
              <Link key={t} href={`/explore/search?q=${encodeURIComponent(`#${t}`)}`} className="font-medium text-[var(--accent)] hover:underline">
                #{t}
              </Link>
            ))}
          </p>
        )}
        {p.comments > 0 && (
          <button type="button" onClick={() => (onTalk ? onTalk() : setTalking(true))} className="w-fit text-[13.5px] text-ink-3 hover:text-ink">
            View all {p.comments} comments
          </button>
        )}
        {why && p.reason && (
          <p className="mt-1 rounded-[14px] bg-[var(--background)] px-3.5 py-2.5 text-[13px] text-ink-2">
            {p.reason}{" "}
            {!p.sponsored_by && viewer && (
              <Link href="/account/personalisation" className="font-semibold">
                Change what you see
              </Link>
            )}
          </p>
        )}
        {note && (
          <p role="status" className="text-[13px] text-ink-2">
            {note}
          </p>
        )}
      </div>
      {talking && <CommentsSheet postId={p.id} viewer={viewer} onClose={() => setTalking(false)} onCount={onChange} />}
      {sharing && <ShareSheet post={p} viewer={viewer} onClose={() => setSharing(false)} />}
      {reporting && <ReportSheet userId={viewer?.id ?? null} postId={p.id} onClose={() => setReporting(false)} onDone={() => (setReporting(false), setNote("Thanks, FMD's team will review this post."))} />}
    </article>
  );
}
