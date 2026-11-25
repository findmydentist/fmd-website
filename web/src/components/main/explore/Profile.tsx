"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "@/components/app/kit";
import { useViewer } from "@/lib/useViewer";
import { canCreate, type Viewer } from "@/lib/viewer";
import { creatorPosts, following, getPost, toggleFollow, type Author, type FeedItem } from "@/sample/content";
import { bookHref, creatorByHandle, creatorById, type Creator } from "@/sample/creators";
import { MessagesOff, openThread, partyOf } from "@/sample/messages";
import { getSaved } from "@/sample/saved";
import { storyById, storyRail, type StoryRing } from "@/sample/stories";
import { ExploreNav } from "./ExploreNav";
import { Appreciate, Clips, Keep, Talk, Verified } from "./icons";
import { MomentViewer } from "./Moments";
import { Monogram } from "./Monogram";

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n));

/** Square tiles, three across; hover shows appreciations and comments. Shared by profiles and Me. */
export function PostGrid({ items, empty }: { items: FeedItem[]; empty: string }) {
  if (!items.length) return <p className="card px-6 py-12 text-center text-[14.5px] text-ink-3">{empty}</p>;
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
      {items.map((p) => {
        const m = p.media[0];
        return (
          <Link key={p.id} href={`/explore/${p.id}`} aria-label={p.title} className="group relative aspect-square overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
            {m?.kind === "photo" ? (
              <Image src={m.src} alt="" fill sizes="(min-width: 1024px) 240px, 33vw" className="object-cover" />
            ) : (
              <span className="grid size-full place-items-center bg-[var(--accent)] p-3 text-center text-[12.5px] font-bold text-white">{p.title}</span>
            )}
            {p.kind === "video" && (
              <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-[10px] bg-black/45 text-white">
                <Clips size={15} />
              </span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center gap-4 bg-black/35 text-[13.5px] font-bold text-white group-hover:flex">
              <span className="flex items-center gap-1">
                <Appreciate size={18} filled /> {short(p.likes)}
              </span>
              <span className="flex items-center gap-1">
                <Talk size={17} /> {short(p.comments)}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span className="grid text-center sm:text-left">
      <span className="text-[17px] font-bold text-ink">{short(n)}</span>
      <span className="text-[12.5px] text-ink-3">{label}</span>
    </span>
  );
}

function CreatorProfile({ c, viewer }: { c: Creator; viewer: Viewer | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<"posts" | "reels" | "tagged">("posts");
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [counts, setCounts] = useState({ posts: 0 });
  const [follows, setFollows] = useState(false);
  const [ring, setRing] = useState<StoryRing | null>(null);
  const [viewing, setViewing] = useState<StoryRing | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const book = bookHref(c);
  const load = useCallback(() => {
    const uid = viewer?.id ?? null;
    creatorPosts(uid, c.id, tab).then(setItems);
    Promise.all([creatorPosts(uid, c.id, "posts"), creatorPosts(uid, c.id, "reels")]).then(([a, b]) => setCounts({ posts: a.length + b.length }));
    storyRail(uid).then((rs) => setRing(rs.find((r) => r.creator.id === c.id) ?? null));
    if (viewer) following(viewer.id).then((a) => setFollows(a.some((x: Author) => x.id === c.id)));
  }, [viewer, c.id, tab]);
  useEffect(load, [load]);

  const message = async () => {
    if (!viewer) return router.push(`/login?next=${encodeURIComponent(`/explore/u/${c.handle}`)}`);
    try {
      const t = await openThread(viewer, partyOf(c));
      router.push(`/messages/${t.id}`);
    } catch (e) {
      setNote(e instanceof MessagesOff ? e.message : "Couldn't open a chat. Try again.");
    }
  };

  return (
    <div className="grid gap-6">
      <section className="card grid gap-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-5 sm:gap-7">
          {ring ? (
            <button type="button" onClick={() => setViewing(ring)} aria-label={`${c.name}'s moments`}>
              <Monogram name={c.name} size={92} ring={ring.seen ? "seen" : "new"} />
            </button>
          ) : (
            <Monogram name={c.name} size={92} />
          )}
          <div className="grid min-w-0 flex-1 gap-1">
            <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-[-0.02em] text-ink">
              {c.name} {c.verified && <Verified size={20} />}
            </h1>
            <p className="text-[14px] text-ink-3">
              @{c.handle} · {c.specialty} · {c.city}
            </p>
          </div>
          <div className="flex gap-8">
            <Stat n={counts.posts} label={counts.posts === 1 ? "post" : "posts"} />
            <Stat n={c.followers + (follows ? 1 : 0)} label="followers" />
            <Stat n={c.following} label="following" />
          </div>
        </div>
        <p className="max-w-[560px] text-[15px] leading-relaxed text-ink-2">{c.bio}</p>
        {c.kind === "clinic" && c.clinicId && c.bookable && (
          <Link href={`/clinics/${c.clinicId}`} className="w-fit text-[14px] font-semibold">
            Clinic details, timings and address →
          </Link>
        )}
        {c.kind !== "fmd" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (viewer ? toggleFollow(viewer.id, c.id).then(load) : router.push(`/login?next=${encodeURIComponent(`/explore/u/${c.handle}`)}`))}
              aria-pressed={follows}
              className={`h-11 rounded-full px-6 text-[14px] font-bold ${follows ? "border border-line text-ink" : "bg-[var(--accent)] text-white"}`}
            >
              {follows ? "Following" : "Follow"}
            </button>
            <button type="button" onClick={message} className="h-11 rounded-full border border-line px-6 text-[14px] font-bold text-ink hover:border-line-strong">
              Message
            </button>
            {book && <ButtonLink href={book}>Book</ButtonLink>}
          </div>
        )}
        {note && (
          <p role="status" className="text-[13.5px] text-ink-2">
            {note} {book && <Link href={book}>Book instead</Link>}
          </p>
        )}
        {c.highlights.length > 0 && (
          <ul className="flex gap-4 overflow-x-auto pt-1 [scrollbar-width:none]" aria-label="Highlights">
            {c.highlights.map((h) => {
              const items = h.storyIds.map((id) => storyById(id)).filter((s): s is NonNullable<typeof s> => !!s);
              return (
                <li key={h.id} className="shrink-0">
                  <button type="button" onClick={() => items.length && setViewing({ creator: c, items, seen: false })} className="grid w-[72px] justify-items-center gap-1.5">
                    <span className="relative block size-[68px] overflow-hidden rounded-[22px] border-2 border-[var(--surface)] shadow-[var(--shadow-card)]">
                      {items[0] && <Image src={items[0].media.src} alt="" fill sizes="72px" className="object-cover" />}
                    </span>
                    <span className="w-full truncate text-center text-[12px] text-ink-2">{h.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div role="tablist" aria-label="Profile" className="flex w-fit gap-1 rounded-full bg-[var(--background-secondary)] p-1">
        {(
          [
            ["posts", "Posts"],
            ["reels", "Clips"],
            ["tagged", "Tagged"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setItems(null))} className={`h-9 rounded-full px-5 text-[13.5px] font-bold ${tab === id ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3"}`}>
            {label}
          </button>
        ))}
      </div>
      {items === null ? <div className="card h-48 animate-pulse" aria-busy /> : <PostGrid items={items} empty={tab === "tagged" ? "No one has tagged them yet." : tab === "reels" ? "No clips yet." : "No posts yet."} />}
      {viewing && <MomentViewer rings={[viewing]} start={0} viewer={viewer} onClose={() => (setViewing(null), load())} />}
    </div>
  );
}

/** Your own page in Explore: what you kept and who you follow (patients, staff and companies don't post). */
function MyPage({ viewer }: { viewer: Viewer }) {
  const [tab, setTab] = useState<"kept" | "following">("kept");
  const [kept, setKept] = useState<FeedItem[] | null>(null);
  const [follows, setFollows] = useState<Author[]>([]);
  useEffect(() => {
    getSaved(viewer.id, "post")
      .then((ids) => Promise.all(ids.map((id) => getPost(viewer.id, id))))
      .then((ps) => setKept(ps.filter((p): p is FeedItem => !!p)));
    following(viewer.id).then(setFollows);
  }, [viewer.id]);
  return (
    <div className="grid gap-6">
      <section className="card flex flex-wrap items-center gap-5 p-5 sm:p-7">
        <Monogram name={viewer.name} size={84} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink">{viewer.name}</h1>
          <p className="text-[14px] capitalize text-ink-3">{viewer.kind.replace("_", " ")}</p>
        </div>
        {canCreate(viewer) && <ButtonLink href="/explore/new">Create a post</ButtonLink>}
      </section>
      <div role="tablist" aria-label="Me" className="flex w-fit gap-1 rounded-full bg-[var(--background-secondary)] p-1">
        <button role="tab" aria-selected={tab === "kept"} onClick={() => setTab("kept")} className={`flex h-9 items-center gap-1.5 rounded-full px-5 text-[13.5px] font-bold ${tab === "kept" ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3"}`}>
          <Keep size={16} /> Kept
        </button>
        <button role="tab" aria-selected={tab === "following"} onClick={() => setTab("following")} className={`h-9 rounded-full px-5 text-[13.5px] font-bold ${tab === "following" ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3"}`}>
          Following {follows.length}
        </button>
      </div>
      {tab === "kept" ? (
        kept === null ? <div className="card h-48 animate-pulse" aria-busy /> : <PostGrid items={kept} empty="Posts you keep show up here. Tap the tooth on any post." />
      ) : follows.length ? (
        <ul className="card divide-y divide-[var(--border)] px-2">
          {follows.map((a) => (
            <li key={a.id}>
              <Link href={`/explore/u/${a.handle}`} className="flex items-center gap-3 rounded-[16px] px-3 py-3 hover:bg-[var(--background)]">
                <Monogram name={a.name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14.5px] font-bold text-ink">
                    {a.name} {a.verified && <Verified size={14} />}
                  </span>
                  <span className="block truncate text-[13px] text-ink-3">{a.specialty}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card px-6 py-12 text-center text-[14.5px] text-ink-3">You don&apos;t follow anyone yet.</p>
      )}
    </div>
  );
}

/** /explore/u/[handle] (a creator, by handle or id) and /explore/u/me. */
export function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const viewer = useViewer();
  const key = decodeURIComponent(handle);
  const creator = key === "me" ? undefined : (creatorByHandle(key) ?? creatorById(key));

  let body;
  if (key === "me") {
    if (viewer === undefined) body = <div className="card h-48 animate-pulse" aria-busy />;
    else if (viewer === null)
      body = (
        <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
          <p className="text-[17px] font-semibold text-ink">Log in to see what you kept and who you follow</p>
          <ButtonLink href="/login?next=/explore/u/me">Log in</ButtonLink>
        </div>
      );
    else body = <MyPage viewer={viewer} />;
  } else if (!creator) {
    body = (
      <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
        <p className="text-[17px] font-semibold text-ink">This profile isn&apos;t on FMD</p>
        <ButtonLink href="/explore/search" variant="secondary">
          Discover people
        </ButtonLink>
      </div>
    );
  } else body = viewer === undefined ? <div className="card h-48 animate-pulse" aria-busy /> : <CreatorProfile c={creator} viewer={viewer} />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,820px)] lg:justify-center lg:gap-10">
      <ExploreNav active="profile" viewer={viewer ?? null} />
      <div className="min-w-0">{body}</div>
    </div>
  );
}
