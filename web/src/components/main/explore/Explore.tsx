"use client";

import { ArrowLeft, BadgeCheck, Bookmark, Flag, Info, Link2, MessageSquare, MessagesSquare, Plus, Share2, ShieldCheck, SquarePen, ThumbsUp, Trash2 } from "lucide-react";
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
import { ExploreRail } from "./Rail";
import { StoryAvatar, StoryViewer, useSeen, type Story } from "./Stories";
import { photoOf } from "@/sample/providers";
import { PostSkeleton } from "../Skeletons";

const TABS: [Tab, string][] = [
  ["for_you", "For you"],
  ["following", "Following"],
  ["learn", "Learn"],
  ["reels", "Videos"],
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

/** FMD's avatar shape: a rounded square (not a circle), so profiles read as FMD's own. */
const SQ = "rounded-[30%]";

/** The story-style ring, in the site's blue, around any avatar; it squares off whatever it holds. */
export function Ring({ children, className = "", round = false }: { children: ReactNode; className?: string; round?: boolean }) {
  return (
    <span className={`block w-fit bg-[linear-gradient(135deg,#93c5fd,#3b82f6,#67e8f9)] p-[2px] ${round ? "rounded-full" : "rounded-[34%]"} ${className}`}>
      <span className={`block bg-[var(--surface)] p-[2px] ${round ? "rounded-full [&>*]:!rounded-full" : "rounded-[32%] [&>*]:!rounded-[30%]"}`}>{children}</span>
    </span>
  );
}

/** Round avatar: the dentist's photo when there is one, else initials; `ring` adds the story-style ring. */
function Avatar({ name, size, ring = false, photo = null }: { name: string; size: string; ring?: boolean; photo?: string | null }) {
  const face = photo ? (
    <span className={`relative block ${size} shrink-0 overflow-hidden ${SQ} bg-[var(--surface-elevated)]`}>
      <Image src={photo} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />
    </span>
  ) : (
    <span className={`grid ${size} shrink-0 place-items-center ${SQ} bg-[var(--surface-elevated)] font-semibold text-ink`}>{initials(name)}</span>
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
    // unwatched first
    .sort((a, b) => Number(seen.includes(a.id)) - Number(seen.includes(b.id)));

  return (
    <div className="mx-auto flex w-full max-w-[900px] items-start justify-center">
      <div className="grid w-full max-w-[470px] grid-cols-1 gap-4">
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
              <Link href="/explore/new" aria-label="Create a post" className="grid size-9 place-items-center rounded-xl border border-line text-ink hover:bg-[var(--surface-glass)]">
                <SquarePen className="size-[18px]" strokeWidth={1.75} />
              </Link>
            )}
            {/* phones: messages are their own page; desktop has them beside the feed */}
            <Link href="/explore/messages" aria-label={unread ? `Messages, ${unread} unread` : "Messages"} className="relative grid size-9 place-items-center rounded-xl border border-line text-ink hover:bg-[var(--surface-glass)] lg:hidden">
              <MessagesSquare className="size-[18px]" strokeWidth={1.75} />
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
                    <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-lg border-2 border-[var(--background)] bg-sky-500 text-white">
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

        {!items ? (
          <div className="grid gap-4" aria-busy aria-label="Loading posts">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : items.length === 0 ? (
          <Panel className="grid justify-items-start gap-2 p-6">
            <p className="text-[15px] text-ink">{tab === "following" ? "You don't follow anyone yet." : "Nothing here yet."}</p>
            {tab === "following" && <p className="text-[14px] text-ink-3">Follow dentists from their posts to see what they share here.</p>}
          </Panel>
        ) : (
          <ul key={tab} className="fmd-enter grid grid-cols-1 gap-4">
            {items.map((p) => (
              <li key={p.id} className="rounded-3xl border border-line bg-[var(--surface)] p-4">
                <PostCard p={p} userId={me?.id ?? null} onChange={load} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* room for the open messages panel, which is fixed to the bottom right */}
      {/* room for the open messages panel (380px + a 40px gap); it grows and shrinks so the feed glides aside */}
      <div
        aria-hidden
        className={`hidden shrink-0 transition-[width] duration-[560ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:block ${dock === "open" ? "w-[420px]" : "w-0"}`}
      />
      <MessagesDock />
      <ExploreRail me={me} unread={unread} canPost={canPost} tab={tab} />
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
  const chip = "inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors";
  const idle = `${chip} bg-white/[0.05] text-ink-2 hover:bg-white/[0.09] hover:text-ink`;

  return (
    <article className="grid grid-cols-1 gap-3">
      <header className="flex items-center gap-3">
        <Avatar name={p.author.name} size="size-10 text-[12px]" ring={isDentist(p.author)} photo={photoOf(p.author.id)} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="flex items-center gap-1 text-[14.5px] font-semibold text-ink">
            {isDentist(p.author) ? (
              <Link href={`/dentists/${p.author.id}`} className="truncate hover:text-sky-300">
                {p.author.name}
              </Link>
            ) : (
              <span className="truncate">{p.author.name}</span>
            )}
            {p.author.verified && <BadgeCheck className="size-4 shrink-0 text-sky-400" strokeWidth={2} aria-label={p.author.kind === "fmd" ? "FMD" : "Verified dentist"} />}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-3">
            {p.sponsored_by ? `Sponsored · ${p.sponsored_by}` : [p.author.specialty, p.topic].filter(Boolean).join(" · ")} · {when(Date.parse(p.published_at))}
          </p>
        </div>
        {isDentist(p.author) && (
          <button
            type="button"
            aria-pressed={p.following}
            onClick={() => act(() => toggleFollow(userId, p.author.id))}
            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold ${p.following ? "border border-line text-ink-2 hover:text-ink" : "bg-sky-600 text-white hover:bg-sky-500"}`}
          >
            {p.following ? "Following" : <><Plus className="size-3.5" strokeWidth={2.5} /> Follow</>}
          </button>
        )}
        <button type="button" aria-expanded={why} aria-label="Why am I seeing this?" title="Why am I seeing this?" onClick={() => setWhy((w) => !w)} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink">
          <Info className="size-[18px]" strokeWidth={1.75} />
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

      {/* the text comes first, then the picture */}
      <div className="grid gap-1 text-[14px]">
        <p className={`whitespace-pre-line leading-relaxed text-ink-2 ${more ? "" : "line-clamp-3"}`}>{p.body}</p>
        {!more && p.body.length > 160 && (
          <button type="button" onClick={() => setMore(true)} className="w-fit font-medium text-sky-400 hover:text-sky-300">
            Read more
          </button>
        )}
      </div>

      {/* the picture: video as is, everything else as a cover with its title; double-click marks it helpful */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-[var(--surface-glass)]" onDoubleClick={p.kind === "video" ? undefined : doubleTap}>
        {p.media && p.kind === "video" ? (
          <video controls preload="metadata" playsInline className="aspect-video w-full bg-black object-contain" aria-label={p.media.alt}>
            <source src={p.media.src} type="video/mp4" />
            {captions && <track kind="captions" srcLang="en" label="English" src={captions} default />}
          </video>
        ) : (
          <div className={`grid aspect-[4/3] select-none content-center justify-items-start gap-4 bg-gradient-to-tr ${coverOf(p.topic)} to-transparent p-6 text-left sm:p-8`}>
            {p.media && (
              <span className="relative block h-20 w-28 overflow-hidden rounded-xl sm:h-24 sm:w-32">
                <Image src={p.media.src} alt={p.media.alt} fill sizes="128px" className="object-contain" />
              </span>
            )}
            <span className="rounded-md bg-black/25 px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-2">{p.kind === "poll" ? "Poll" : p.topic}</span>
            <Title className="max-w-[20ch] text-balance text-[21px] font-semibold leading-tight text-ink sm:text-[25px]">{p.title}</Title>
          </div>
        )}
        {pop > 0 && (
          <ThumbsUp key={pop} aria-hidden className="fmd-heart-pop pointer-events-none absolute inset-0 m-auto size-20 fill-sky-400 text-white drop-shadow-lg" strokeWidth={1} />
        )}
        {(p.is_case || p.sponsored_by) && (
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
            {p.sponsored_by && <SponsoredBadge />}
            {p.is_case && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2.5 py-1 text-[11.5px] text-white backdrop-blur">
                <ShieldCheck className="size-3.5" strokeWidth={1.75} /> Shared with consent
              </span>
            )}
          </div>
        )}
      </div>

      {p.poll && (
        <div role="group" aria-label="Poll answers" className="grid gap-2">
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

      {p.source && (
        <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <Link2 className="size-3.5" strokeWidth={1.75} /> From {p.source.platform}, by {p.source.credit}:{" "}
          <a href={p.source.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
            view the original
          </a>
        </p>
      )}

      {/* actions, each with its count */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={p.liked} aria-label={`${p.liked ? "Marked helpful" : "Helpful"}, ${p.likes}`} onClick={like} className={p.liked ? `${chip} bg-sky-500/20 text-sky-200` : idle}>
          <ThumbsUp key={String(p.liked)} className={`size-4 ${p.liked ? "fmd-like fill-current" : ""}`} strokeWidth={1.75} />
          Helpful · {p.likes.toLocaleString("en-IN")}
        </button>
        <Link href={`/explore/${p.id}#comments`} aria-label={`Comments, ${p.comments}`} className={idle}>
          <MessageSquare className="size-4" strokeWidth={1.75} /> {p.comments}
        </Link>
        <button type="button" aria-label="Share" onClick={share} className={idle}>
          <Share2 className="size-4" strokeWidth={1.75} /> Share
        </button>
        <button type="button" aria-pressed={p.saved} aria-label={p.saved ? "Saved" : "Save"} title={p.saved ? "Saved" : "Save"} onClick={() => act(() => toggleSaved(userId!, "post", p.id))} className={`ml-auto ${p.saved ? `${chip} bg-sky-500/20 text-sky-200` : idle}`}>
          <Bookmark className={`size-4 ${p.saved ? "fill-current" : ""}`} strokeWidth={1.75} />
        </button>
      </div>
      <p className="text-[11.5px] text-ink-3">Demo post</p>
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
