"use client";

import { ChatTray } from "./ChatTray";
import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ButtonLink, Panel } from "@/components/app/kit";
import { useViewer } from "@/lib/useViewer";
import type { Viewer } from "@/lib/viewer";
import { feed, following, getPost, toggleFollow, type FeedItem, type Tab } from "@/sample/content";
import { CREATORS } from "@/sample/creators";
import { ExploreNav } from "./ExploreNav";
import { Verified } from "./icons";
import { MomentsRail } from "./Moments";
import { Monogram } from "./Monogram";
import { PostCard } from "./PostCard";
import { CommentsPanel } from "./Comments";
import { ReportSheet } from "./ReportSheet";

export { PostCard };

/* used by the profile pages (dentists/profile, account/profile) */

/** A post's square cover: one of a few soft gradients, picked by topic so a topic always looks the same. */
const COVERS = [
  "from-sky-500/35 via-indigo-500/20",
  "from-emerald-500/30 via-teal-500/15",
  "from-amber-500/30 via-rose-500/15",
  "from-fuchsia-500/30 via-violet-500/15",
  "from-cyan-500/30 via-blue-500/15",
];
export const coverOf = (topic: string) => COVERS[[...topic].reduce((a, c) => a + c.charCodeAt(0), 0) % COVERS.length];

/** The story-style ring, in the site's blue, around any avatar; it squares off whatever it holds. */
export function Ring({ children, className = "", round = false }: { children: ReactNode; className?: string; round?: boolean }) {
  return (
    <span className={`block w-fit bg-[linear-gradient(135deg,#93c5fd,#3b82f6,#67e8f9)] p-[2px] ${round ? "rounded-full" : "rounded-[34%]"} ${className}`}>
      <span className={`block bg-[var(--surface)] p-[2px] ${round ? "rounded-full [&>*]:!rounded-full" : "rounded-[32%] [&>*]:!rounded-[30%]"}`}>{children}</span>
    </span>
  );
}

/** A list of full posts, as on a profile's feed tab. */
export function PostFeed({ posts, onChange }: { posts: FeedItem[]; userId?: string | null; onChange: () => void }) {
  const viewer = useViewer() ?? null;
  return (
    <ul className="grid grid-cols-1 divide-y divide-line">
      {posts.map((p) => (
        <li key={p.id} className="py-5 first:pt-0">
          <PostCard p={p} viewer={viewer} onChange={onChange} />
        </li>
      ))}
    </ul>
  );
}

const TABS: [Exclude<Tab, "reels">, string][] = [
  ["for_you", "For you"],
  ["following", "Following"],
];

function Skeleton() {
  return (
    <div className="grid gap-6" aria-busy aria-label="Loading">
      {[0, 1].map((i) => (
        <div key={i} className="card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <span className="size-[42px] animate-pulse rounded-[14px] bg-[var(--background)]" />
            <span className="h-4 w-40 animate-pulse rounded-full bg-[var(--background)]" />
          </div>
          <div className="aspect-[4/5] animate-pulse bg-[var(--background)]" />
        </div>
      ))}
    </div>
  );
}

/** People to follow: creators you don't follow yet. */
function Suggestions({ viewer, follows, onChange }: { viewer: Viewer | null; follows: string[]; onChange: () => void }) {
  const list = CREATORS.filter((c) => c.kind !== "fmd" && !follows.includes(c.id)).slice(0, 5);
  if (!list.length) return null;
  return (
    <section aria-label="Suggested for you" className="card grid gap-4 p-5">
      <h2 className="text-[15px] font-bold text-ink">Suggested for you</h2>
      <ul className="grid gap-3.5">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <Link href={`/explore/u/${c.handle}`}>
              <Monogram name={c.name} size={40} />
            </Link>
            <span className="min-w-0 flex-1">
              <Link href={`/explore/u/${c.handle}`} className="flex items-center gap-1 text-[13.5px] font-bold text-ink">
                <span className="truncate">{c.name}</span>
                {c.verified && <Verified size={13} />}
              </Link>
              <span className="block truncate text-[12.5px] text-ink-3">{c.specialty} · {c.city.split(",").pop()?.trim()}</span>
            </span>
            {viewer ? (
              <button type="button" onClick={() => toggleFollow(viewer.id, c.id).then(onChange)} className="h-8 rounded-full bg-[var(--button-primary)] px-3.5 text-[12.5px] font-bold text-[var(--button-primary-fg)]">
                Follow
              </button>
            ) : (
              <Link href="/login?next=/explore" className="h-8 rounded-full border border-line px-3.5 text-[12.5px] font-bold leading-8 text-ink">
                Follow
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** /explore: Moments, then the feed (For you / Following), with Explore's own navigation and suggestions. */
export function ExplorePage() {
  const viewer = useViewer();
  const [tab, setTab] = useState<Exclude<Tab, "reels">>("for_you");
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [follows, setFollows] = useState<string[]>([]);
  const ready = viewer !== undefined;
  const load = useCallback(() => {
    if (!ready) return;
    feed(viewer?.id ?? null, tab).then(setItems);
    if (viewer) following(viewer.id).then((a) => setFollows(a.map((x) => x.id)));
  }, [ready, viewer, tab]);
  useEffect(load, [load]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,620px)_300px] lg:justify-center lg:gap-8">
      <ExploreNav active="home" viewer={viewer ?? null} />
      <h1 className="sr-only">Explore</h1>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        {ready ? <MomentsRail viewer={viewer ?? null} /> : <div className="card h-[156px] animate-pulse" aria-busy />}
        <div role="tablist" aria-label="Feed" className="flex w-fit gap-1 rounded-full bg-[var(--background-secondary)] p-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => (setTab(id), setItems(null))}
              className={`h-9 rounded-full px-5 text-[13.5px] font-bold transition-colors ${tab === id ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {items === null ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
            <p className="text-[17px] font-semibold text-ink">{tab === "following" ? "Follow dentists to see their posts here" : "Nothing here yet"}</p>
            <p className="max-w-[340px] text-[14px] text-ink-3">Pick a few from Suggested for you, or look around in Discover.</p>
            <ButtonLink href="/explore/search" variant="secondary">
              Discover
            </ButtonLink>
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((p) => (
              <PostCard key={p.id} p={p} viewer={viewer ?? null} onChange={load} />
            ))}
          </div>
        )}
      </div>
      <aside className="hidden content-start gap-5 lg:grid lg:sticky lg:top-24">
        {viewer && (
          <div className="flex items-center gap-3 px-1">
            <Monogram name={viewer.name} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-ink">{viewer.name}</span>
              <span className="block text-[12.5px] capitalize text-ink-3">{viewer.kind.replace("_", " ")}</span>
            </span>
          </div>
        )}
        <Suggestions viewer={viewer ?? null} follows={follows} onChange={load} />
        <p className="px-1 text-[12px] leading-relaxed text-ink-3">Dental education from verified dentists, clinics and students. Not a diagnosis: book a consultation for anything clinical.</p>
      </aside>
      <ChatTray viewer={viewer ?? null} />
    </div>
  );
}

/* ---------------- /explore/[postId] ---------------- */

export function PostPage() {
  const { postId } = useParams<{ postId: string }>();
  const v = useViewer();
  const viewer = v ?? null;
  const [p, setP] = useState<FeedItem | null | undefined>(undefined);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const load = useCallback(() => {
    if (v === undefined) return;
    getPost(v?.id ?? null, postId).then(setP);
  }, [v, postId]);
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
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-5">
      <h1 className="sr-only">{p.title}</h1>
      <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> Explore
      </Link>
      <PostCard p={p} viewer={viewer} onChange={load} full />
      <section className="card grid gap-4 p-5 sm:p-6" aria-labelledby="talk">
        <h2 id="talk" className="scroll-mt-28 text-[16px] font-bold text-ink">
          Talk ({p.comments})
        </h2>
        <CommentsPanel postId={p.id} viewer={viewer} onCount={load} />
      </section>
      <div>
        {reported ? (
          <p className="text-[13.5px] text-ink-2">Thanks, FMD&apos;s team will review this post.</p>
        ) : (
          <button type="button" onClick={() => setReporting(true)} className="inline-flex items-center gap-1.5 text-[13.5px] text-ink-3 hover:text-ink">
            <Flag className="size-4" strokeWidth={1.75} /> Report this post
          </button>
        )}
      </div>
      {reporting && <ReportSheet userId={viewer?.id ?? null} postId={p.id} onClose={() => setReporting(false)} onDone={() => (setReporting(false), setReported(true))} />}
    </div>
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
