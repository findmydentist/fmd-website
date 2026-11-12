"use client";

import { ArrowLeft, BadgeCheck, Bookmark, Flag, Heart, Link2, MessageCircle, MoreHorizontal, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, ButtonLink, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { SponsoredBadge } from "@/components/ui";
import { when } from "@/lib/format";
import { initials } from "@/lib/fmd";
import { useMe } from "@/lib/me";
import {
  addComment,
  comments as listComments,
  deleteComment,
  feed,
  getPost,
  report,
  REPORT_REASONS,
  toggleFollow,
  toggleLike,
  vote,
  type Author,
  type Comment,
  type FeedItem,
  type ReportReason,
  type Tab,
} from "@/sample/content";
import { toggleSaved } from "@/sample/saved";
import { track } from "@/lib/analytics";
import { threads } from "@/sample/messages";
import { MessagesDock, useDock } from "./Messages";
import { StoryAvatar, StoryViewer, useSeen, type Story } from "./Stories";
import { photoOf } from "@/sample/providers";

const TABS: [Tab, string][] = [
  ["for_you", "For you"],
  ["following", "Following"],
  ["learn", "Learn"],
  ["reels", "Reels"],
];

/** Captions for a video, from text, as a data URL the <track> can load. */
const captionsUrl = (vtt: string | undefined) => (vtt ? `data:text/vtt;charset=utf-8,${encodeURIComponent(vtt)}` : null);

/** A post's square cover: one of a few soft gradients, picked by topic so a topic always looks the same. */
const COVERS = [
  "from-sky-500/35 via-indigo-500/20",
  "from-emerald-500/30 via-teal-500/15",
  "from-amber-500/30 via-rose-500/15",
  "from-fuchsia-500/30 via-violet-500/15",
  "from-cyan-500/30 via-blue-500/15",
];
export const coverOf = (topic: string) => COVERS[[...topic].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length];

/** The story-style ring, in the site's blue, around any round avatar. */
export function Ring({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`block w-fit rounded-full bg-[linear-gradient(135deg,#93c5fd,#3b82f6,#67e8f9)] p-[2px] ${className}`}>
      <span className="block rounded-full bg-[var(--surface)] p-[2px]">{children}</span>
    </span>
  );
}

/** Round avatar: the dentist's photo when there is one, else initials; `ring` adds the story-style ring. */
function Avatar({ name, size, ring = false, photo = null }: { name: string; size: string; ring?: boolean; photo?: string | null }) {
  const face = photo ? (
    <span className={`relative block ${size} shrink-0 overflow-hidden rounded-full bg-[var(--surface-elevated)]`}>
      <Image src={photo} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />
    </span>
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-semibold text-ink`}>{initials(name)}</span>
  );
  return ring ? <Ring>{face}</Ring> : face;
}

/** "3h", "2d": how long ago, for story headers */
const short = (iso: string) => {
  const h = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

const isDentist = (a: Author) => a.kind === "dentist" && !a.name.startsWith("You");

/* ---------------- /explore ---------------- */

export function ExplorePage() {
  const me = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.find(([t]) => t === params.get("tab"))?.[0] ?? "for_you") as Tab;
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const userId = me === undefined ? undefined : (me?.id ?? null);
  const load = useCallback(() => {
    if (userId !== undefined) feed(userId, tab).then(setItems);
  }, [userId, tab]);
  useEffect(load, [load]);
  const canPost = me?.dentist_profile?.verification_status === "verified";
  const [unread, setUnread] = useState(0);
  const [dock] = useDock();
  useEffect(() => {
    if (me) threads(me.id).then((l) => setUnread(l.filter((t) => t.unread).length));
  }, [me]);
  const people = [...new Map((items ?? []).filter((p) => isDentist(p.author)).map((p) => [p.author.id, p.author])).values()];
  // each dentist's story: a hello with their photo, then their posts, one slide each
  const [seen, markSeen] = useSeen();
  // the list is frozen while watching: marking a story seen re-sorts the row, which mustn't move the viewer
  const [watching, setWatching] = useState<{ list: Story[]; start: number } | null>(null);
  const stories: Story[] = people
    .map((a) => {
      const theirs = (items ?? []).filter((p) => p.author.id === a.id);
      const photo = photoOf(a.id);
      return {
        id: a.id,
        name: a.name,
        photo,
        meta: theirs[0] ? short(theirs[0].published_at) : undefined,
        slides: [
          {
            image: photo ?? undefined,
            tone: coverOf(a.specialty),
            eyebrow: a.specialty,
            title: `Hi, I'm ${a.name}`,
            text: "I share dental tips on FMD. Tap through for my latest posts. (Demo)",
            link: { href: `/dentists/${a.id}`, label: "View profile" },
          },
          ...theirs.map((p) => ({
            image: p.media && p.kind === "image" ? p.media.src : undefined,
            fit: "inset" as const,
            tone: coverOf(p.topic),
            eyebrow: p.topic,
            title: p.title,
            text: p.body.length > 140 ? `${p.body.slice(0, 140).trimEnd()}…` : p.body,
            link: { href: `/explore/${p.id}`, label: "See post" },
          })),
        ],
      };
    })
    // unwatched first, as on Instagram
    .sort((a, b) => Number(seen.includes(a.id)) - Number(seen.includes(b.id)));

  return (
    <div className="mx-auto flex w-full max-w-[900px] items-start justify-center gap-10">
      <div className="grid w-full max-w-[470px] gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2.5 text-[22px] font-medium text-ink">
            Explore <Tag tone="muted">Demo</Tag>
          </h1>
          <div className="flex items-center gap-2">
            {me?.dentist_profile && (
              <ButtonLink href="/explore/mine" variant="secondary" size="sm">
                Your posts
              </ButtonLink>
            )}
            {canPost && (
              <Link href="/explore/new" aria-label="Create a post" className="grid size-9 place-items-center rounded-full border border-line text-ink hover:bg-[var(--surface-glass)]">
                <Plus className="size-5" strokeWidth={1.75} />
              </Link>
            )}
            {/* phones: messages are their own page; desktop has them beside the feed */}
            <Link href="/explore/messages" aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className="relative grid size-9 place-items-center rounded-full border border-line text-ink hover:bg-[var(--surface-glass)] lg:hidden">
              <Send className="size-[18px]" strokeWidth={1.75} />
              {unread > 0 && <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full bg-sky-500 text-[11px] font-semibold text-white">{unread}</span>}
            </Link>
          </div>
        </div>

        {stories.length > 0 && (
          <ul aria-label="Stories" className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {canPost && me && (
              <li className="shrink-0">
                <Link href="/explore/new" className="grid w-[74px] justify-items-center gap-1.5 text-center" aria-label="Your story: create a post">
                  <span className="relative">
                    <StoryAvatar name={me.full_name} size="size-16 text-[16px]" ring={false} />
                    <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-[var(--background)] bg-sky-500 text-white">
                      <Plus className="size-3.5" strokeWidth={3} />
                    </span>
                  </span>
                  <span className="w-full truncate text-[11.5px] text-ink-3">Your story</span>
                </Link>
              </li>
            )}
            {stories.map((st, i) => (
              <li key={st.id} className="shrink-0">
                <button type="button" onClick={() => setWatching({ list: stories, start: i })} className="grid w-[74px] justify-items-center gap-1.5 text-center" aria-label={`${st.name}'s story${seen.includes(st.id) ? ", seen" : ""}`}>
                  <StoryAvatar name={st.name} photo={st.photo} size="size-16 text-[16px]" seen={seen.includes(st.id)} />
                  <span className={`w-full truncate text-[11.5px] ${seen.includes(st.id) ? "text-ink-3" : "text-ink-2"}`}>{st.name.replace(/^Dr\.?\s*/, "").split(" ")[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {watching && <StoryViewer stories={watching.list} start={watching.start} onClose={() => setWatching(null)} onSeen={markSeen} />}

        <div role="tablist" aria-label="Feed" className="grid grid-cols-4 border-b border-line">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => router.replace(t === "for_you" ? "/explore" : `/explore?tab=${t}`, { scroll: false })}
              className={`-mb-px h-11 border-b-2 text-[13.5px] font-medium ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-[12.5px] text-ink-3">Dental know-how from dentists on FMD. Education, not a diagnosis.</p>

        {!items ? (
          <div className="aspect-square animate-pulse rounded-lg bg-[var(--surface-glass)]" aria-busy />
        ) : items.length === 0 ? (
          <Panel className="grid justify-items-start gap-2 p-6">
            <p className="text-[15px] text-ink">{tab === "following" ? "You don't follow anyone yet." : "Nothing here yet."}</p>
            {tab === "following" && <p className="text-[14px] text-ink-3">Follow dentists from their posts to see what they share here.</p>}
          </Panel>
        ) : (
          <ul key={tab} className="fmd-enter grid">
            {items.map((p) => (
              <li key={p.id} className="border-b border-line pb-5 pt-1 [&+li]:pt-4">
                <PostCard p={p} userId={me?.id ?? null} onChange={load} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* room for the open messages panel, which is fixed to the bottom right */}
      {dock === "open" && <div aria-hidden className="hidden w-[380px] shrink-0 lg:block" />}
      <MessagesDock />
    </div>
  );
}

/* ---------------- a post ---------------- */

export function PostCard({ p, userId, onChange, full = false }: { p: FeedItem; userId: string | null; onChange: () => void; full?: boolean }) {
  const router = useRouter();
  const [why, setWhy] = useState(false);
  const [more, setMore] = useState(full);
  const [pop, setPop] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const captions = captionsUrl(p.media?.captions);
  const act = async (fn: () => Promise<unknown>) => {
    if (!userId) return router.push(`/login?next=${encodeURIComponent(full ? `/explore/${p.id}` : "/explore")}`);
    setNote(null);
    try {
      await fn();
      onChange();
    } catch (e) {
      setNote((e as Error).message);
    }
  };
  const like = () => (p.liked || track("post_liked", { kind: p.kind }), act(() => toggleLike(userId, p.id)));
  /** Double-tap only ever likes, the way people expect; the heart button below toggles. */
  const doubleTap = () => {
    setPop((n) => n + 1);
    if (!p.liked) like();
  };
  const share = async () => {
    const url = `${location.origin}/explore/${p.id}`;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNote("Link copied.");
      }
    } catch {
      // closed the share sheet: nothing to do
    }
  };
  const total = p.votes?.reduce((a, b) => a + b, 0) ?? 0;
  const Title = full ? "h1" : "h2";
  const icon = "size-6";

  return (
    <article className="grid gap-3">
      <header className="flex items-center gap-3">
        <Avatar name={p.author.name} size="size-9 text-[12px]" ring={isDentist(p.author)} photo={photoOf(p.author.id)} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex flex-wrap items-center gap-1 text-[14px] font-semibold text-ink">
            {isDentist(p.author) ? (
              <Link href={`/dentists/${p.author.id}`} className="hover:opacity-70">
                {p.author.name}
              </Link>
            ) : (
              p.author.name
            )}
            {p.author.verified && <BadgeCheck className="size-4 text-sky-400" strokeWidth={2} aria-label={p.author.kind === "fmd" ? "FMD" : "Verified dentist"} />}
            {isDentist(p.author) && (
              <>
                <span aria-hidden className="text-ink-3">·</span>
                <button type="button" aria-pressed={p.following} onClick={() => act(() => toggleFollow(userId, p.author.id))} className={p.following ? "text-ink-3 hover:text-ink" : "text-sky-400 hover:text-sky-300"}>
                  {p.following ? "Following" : "Follow"}
                </button>
              </>
            )}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-3">{p.sponsored_by ? `Sponsored · ${p.sponsored_by}` : [p.author.specialty, p.topic].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" aria-expanded={why} aria-label="Why am I seeing this?" onClick={() => setWhy((w) => !w)} className="grid size-8 place-items-center rounded-full text-ink-2 hover:text-ink">
          <MoreHorizontal className="size-5" strokeWidth={1.75} />
        </button>
      </header>
      {why && p.reason && (
        <p className="rounded-xl bg-[var(--surface-glass)] px-3.5 py-2.5 text-[13px] text-ink-2">
          <span className="font-medium text-ink">Why you&apos;re seeing this: </span>
          {p.reason}{" "}
          {!p.sponsored_by && userId && (
            <Link href="/account/personalisation" className="font-medium text-ink underline underline-offset-4">
              Change what you see
            </Link>
          )}
        </p>
      )}

      {/* the square: video as is, everything else as a cover with its title, double-tap to like */}
      <div className="relative -mx-4 overflow-hidden bg-[var(--surface-glass)] sm:mx-0 sm:rounded-lg sm:border sm:border-line" onDoubleClick={p.kind === "video" ? undefined : doubleTap}>
        {p.media && p.kind === "video" ? (
          <video controls preload="metadata" playsInline className="aspect-[4/5] w-full bg-black object-contain" aria-label={p.media.alt}>
            <source src={p.media.src} type="video/mp4" />
            {captions && <track kind="captions" srcLang="en" label="English" src={captions} default />}
          </video>
        ) : (
          <div className={`grid aspect-square select-none content-center justify-items-center gap-6 bg-gradient-to-br ${coverOf(p.topic)} to-transparent p-8 text-center`}>
            {p.media && (
              <span className="relative block h-24 w-32 overflow-hidden rounded-xl">
                <Image src={p.media.src} alt={p.media.alt} fill sizes="128px" className="object-contain" />
              </span>
            )}
            <span className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-3">{p.kind === "poll" ? "Poll" : p.topic}</span>
            <Title className="max-w-[18ch] text-balance text-[26px] font-semibold leading-tight text-ink">{p.title}</Title>
          </div>
        )}
        {pop > 0 && (
          <Heart key={pop} aria-hidden className="fmd-heart-pop pointer-events-none absolute inset-0 m-auto size-24 fill-white text-white drop-shadow-lg" strokeWidth={0} />
        )}
        {(p.is_case || p.sponsored_by) && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {p.sponsored_by && <SponsoredBadge />}
            {p.is_case && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] text-white backdrop-blur">
                <ShieldCheck className="size-3.5" strokeWidth={1.75} /> Shared with consent
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-ink">
        <button type="button" aria-pressed={p.liked} aria-label={p.liked ? "Unlike" : "Like"} onClick={like} className="hover:opacity-60">
          <Heart key={String(p.liked)} className={`${icon} ${p.liked ? "fmd-like fill-[var(--tone-bad)] text-[var(--tone-bad)]" : ""}`} strokeWidth={1.75} />
        </button>
        <Link href={`/explore/${p.id}#comments`} aria-label="Comments" className="hover:opacity-60">
          <MessageCircle className={`${icon} -scale-x-100`} strokeWidth={1.75} />
        </Link>
        <button type="button" aria-label="Share" onClick={share} className="hover:opacity-60">
          <Send className={icon} strokeWidth={1.75} />
        </button>
        <button type="button" aria-pressed={p.saved} aria-label={p.saved ? "Saved" : "Save"} onClick={() => act(() => toggleSaved(userId!, "post", p.id))} className="ml-auto hover:opacity-60">
          <Bookmark className={`${icon} ${p.saved ? "fill-current" : ""}`} strokeWidth={1.75} />
        </button>
      </div>

      <div className="grid gap-1.5 text-[14px] text-ink">
        <p className="font-semibold">{p.likes.toLocaleString("en-IN")} {p.likes === 1 ? "like" : "likes"}</p>

        {p.poll && (
          <div role="group" aria-label="Poll answers" className="my-1 grid gap-2">
            {p.poll.map((o, i) =>
              p.votes ? (
                <div key={o} className="relative overflow-hidden rounded-xl border border-line px-3.5 py-2.5 text-[14px]">
                  <span aria-hidden className="absolute inset-y-0 left-0 bg-[var(--accent-soft)]" style={{ width: `${Math.round((p.votes[i] / total) * 100)}%` }} />
                  <span className="relative flex justify-between gap-2 text-ink">
                    <span>
                      {o}
                      {p.myVote === i && " · your answer"}
                    </span>
                    <span>{Math.round((p.votes[i] / total) * 100)}%</span>
                  </span>
                </div>
              ) : (
                <button key={o} type="button" onClick={() => act(() => vote(userId, p.id, i))} className="rounded-xl border border-line px-3.5 py-2.5 text-left text-[14px] text-ink hover:border-[var(--accent)]">
                  {o}
                </button>
              ),
            )}
            {p.votes && <p className="text-[12.5px] text-ink-3">{total} answers. A poll, not medical advice.</p>}
          </div>
        )}

        <p className={`whitespace-pre-line leading-snug text-ink-2 ${more ? "" : "line-clamp-2"}`}>
          <span className="mr-1.5 font-semibold text-ink">{p.author.name}</span>
          {p.body}
        </p>
        {!more && p.body.length > 110 && (
          <button type="button" onClick={() => setMore(true)} className="w-fit text-ink-3 hover:text-ink">
            more
          </button>
        )}
        {p.source && (
          <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
            <Link2 className="size-3.5" strokeWidth={1.75} /> From {p.source.platform}, by {p.source.credit}:{" "}
            <a href={p.source.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
              view the original
            </a>
          </p>
        )}
        {!full && (
          <Link href={`/explore/${p.id}#comments`} className="w-fit text-ink-3 hover:text-ink">
            {p.comments > 0 ? `View ${p.comments === 1 ? "1 comment" : `all ${p.comments} comments`}` : "Add a comment…"}
          </Link>
        )}
        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-3">{when(Date.parse(p.published_at))} · Demo</p>
      </div>
      {note && <p role="status" className="text-[13px] text-ink-2">{note}</p>}
    </article>
  );
}

/* ---------------- /explore/[postId] ---------------- */

export function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const me = useMe();
  const [p, setP] = useState<FeedItem | null | undefined>(undefined);
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const userId = me === undefined ? undefined : (me?.id ?? null);
  const load = useCallback(() => {
    if (userId === undefined) return;
    getPost(userId, postId).then(setP);
    listComments(userId, postId).then(setList);
  }, [userId, postId]);
  useEffect(load, [load]);
  if (p === undefined) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (p === null)
    return (
      <Panel className="grid justify-items-start gap-3 p-6">
        <h1 className="text-[19px] font-medium text-ink">This post isn&apos;t available</h1>
        <ButtonLink href="/explore" variant="secondary">
          Explore
        </ButtonLink>
      </Panel>
    );
  const post = async () => {
    setErr(null);
    try {
      await addComment(userId ?? null, me?.full_name ?? "", p.id, text);
      setText("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-5">
      <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> Explore
      </Link>
      <PostCard p={p} userId={me?.id ?? null} onChange={load} full />
      <Panel as="section" className="grid gap-4 p-5" >
        <h2 id="comments" className="scroll-mt-28 text-[16px] font-medium text-ink">
          Comments ({list.length})
        </h2>
        {list.length === 0 && <p className="text-[14px] text-ink-3">No comments yet.</p>}
        <ul className="grid gap-3">
          {list.map((c) => (
            <li key={c.id} className="grid gap-0.5">
              <p className="flex flex-wrap items-center gap-2 text-[13.5px]">
                <span className="font-medium text-ink">{c.mine ? "You" : c.author}</span>
                <span className="text-ink-3">{when(Date.parse(c.at))}</span>
                {c.mine && (
                  <button type="button" onClick={() => deleteComment(me?.id ?? null, c.id).then(load)} className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-ink-3 hover:text-ink">
                    <Trash2 className="size-3.5" strokeWidth={1.75} /> Delete
                  </button>
                )}
              </p>
              <p className="text-[14.5px] text-ink-2">{c.body}</p>
            </li>
          ))}
        </ul>
        {me ? (
          <div className="grid gap-2">
            {err && <Notice kind="error">{err}</Notice>}
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Add a comment. Please don't share personal health details." aria-label="Your comment" className={`${fieldCls} h-20 resize-y py-2.5`} />
            <div>
              <Button size="sm" onClick={post}>
                Post comment
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-ink-3">
            <Link href={`/login?next=${encodeURIComponent(`/explore/${p.id}`)}`} className="font-medium text-ink underline underline-offset-4">
              Log in
            </Link>{" "}
            to comment.
          </p>
        )}
      </Panel>
      <div>
        {reported ? (
          <p className="text-[13.5px] text-ink-2">Thanks, FMD&apos;s team will review this post.</p>
        ) : (
          <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 hover:text-ink">
            <Flag className="size-4" strokeWidth={1.75} /> Report this post
          </button>
        )}
      </div>
      {reporting && <ReportSheet userId={me?.id ?? null} postId={p.id} onClose={() => setReporting(false)} onDone={() => (setReporting(false), setReported(true))} />}
    </div>
  );
}

function ReportSheet({ userId, postId, onClose, onDone }: { userId: string | null; postId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    try {
      await report(userId, postId, reason, note);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Sheet title="Report this post" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[14px] text-ink-2">What&apos;s wrong with it?</legend>
          {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([k, v]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14.5px] text-ink hover:bg-[var(--surface-glass)]">
              <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="size-4 accent-[var(--accent)]" />
              {v}
            </label>
          ))}
        </fieldset>
        <Field label={reason === "other" ? "Tell us what's wrong" : "Anything to add? (optional)"}>
          <textarea className={`${fieldCls} h-20 resize-y py-2.5`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send}>Send report</Button>
        </div>
      </div>
    </Sheet>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel as="section" className="grid gap-3 p-5 sm:p-6">
      <h2 className="text-[16px] font-medium text-ink">{title}</h2>
      {children}
    </Panel>
  );
}
