"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useViewer } from "@/lib/useViewer";
import { searchExplore, type ExploreResults, type FeedItem } from "@/sample/content";
import { EXPLORE_TOPICS, matchTopic } from "@/sample/exploreTopics";
import { ExploreNav } from "./ExploreNav";
import { Appreciate, Clips, Discover as DiscoverIcon, Talk, Verified } from "./icons";
import { Monogram } from "./Monogram";

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** One square (or tall, for clips) tile: the post's first photo; hover shows its appreciations and comments. */
function Tile({ p, tall }: { p: FeedItem; tall: boolean }) {
  const m = p.media[0];
  return (
    <Link href={`/explore/${p.id}`} aria-label={p.title} className={`group relative block overflow-hidden rounded-[18px] bg-[var(--background-secondary)] ${tall ? "row-span-2" : ""}`}>
      {m && m.kind === "photo" ? (
        <Image src={m.src} alt="" fill sizes="(min-width: 1024px) 220px, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      ) : (
        <span className="grid size-full place-items-center bg-[var(--accent)] p-3 text-center text-[13px] font-bold text-white">{p.title}</span>
      )}
      {p.kind === "slides" && (
        <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgb(10_20_50/0.85))] p-3 pt-8 text-[12.5px] font-bold leading-tight text-white">{p.title}</span>
      )}
      {p.kind === "video" && (
        <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-[10px] bg-black/45 text-white">
          <Clips size={16} />
        </span>
      )}
      {p.kind === "carousel" && <span className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-bold text-white">{p.media.length}</span>}
      <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/35 text-[14px] font-bold text-white group-hover:flex">
        <span className="flex items-center gap-1.5">
          <Appreciate size={20} filled /> {short(p.likes)}
        </span>
        <span className="flex items-center gap-1.5">
          <Talk size={19} /> {short(p.comments)}
        </span>
      </span>
    </Link>
  );
}

export function Grid({ items }: { items: FeedItem[] }) {
  return (
    <div className="grid grid-flow-dense auto-rows-[clamp(110px,22vw,220px)] grid-cols-3 gap-1.5 sm:gap-2.5">
      {items.map((p) => (
        <Tile key={p.id} p={p} tall={p.kind === "video"} />
      ))}
    </div>
  );
}

/** /explore/search: search people, posts and tags; with no search, browse by topic. */
export function DiscoverPage() {
  const viewer = useViewer();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [text, setText] = useState(q);
  const [res, setRes] = useState<ExploreResults | null>(null);
  const [tab, setTab] = useState<"accounts" | "posts" | "tags">("accounts");
  const ready = viewer !== undefined;

  // typing updates the address (shareable, Back works); the address drives the results
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q) router.replace(text.trim() ? `/explore/search?q=${encodeURIComponent(text.trim())}` : "/explore/search", { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [text, q, router]);
  useEffect(() => {
    if (!ready) return;
    if (q) searchExplore(q, viewer?.id ?? null).then((r) => (setRes(r), setTab(q.startsWith("#") || !r.creators.length ? "posts" : "accounts")));
  }, [q, ready, viewer]);
  const asTopic = q ? matchTopic(q) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,760px)] lg:justify-center lg:gap-10">
      <ExploreNav active="search" viewer={viewer ?? null} />
      <h1 className="sr-only">Discover</h1>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <label className="card flex h-14 items-center gap-3 px-5">
          <DiscoverIcon size={22} className="text-ink-3" />
          <span className="sr-only">Search Explore</span>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search a treatment, a problem or a dentist"
            className="h-full flex-1 bg-transparent text-[15.5px] text-ink outline-none placeholder:text-ink-3"
          />
          {text && (
            <button type="button" onClick={() => setText("")} className="text-[13px] font-semibold text-ink-3 hover:text-ink">
              Clear
            </button>
          )}
        </label>

        {q ? (
          <>
            {asTopic && (
              <Link href={`/explore/topic/${asTopic.slug}`} className="card flex items-center gap-3 px-5 py-4 hover:shadow-[var(--shadow-card)]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-bold text-ink">Everything about {asTopic.title.toLowerCase()}</span>
                  <span className="block text-[13px] text-ink-3">What it is, posts from verified dentists, and dentists who treat it</span>
                </span>
                <span className="text-[18px] text-ink-3" aria-hidden>→</span>
              </Link>
            )}
            <div role="tablist" aria-label="Results" className="flex w-fit gap-1 rounded-full bg-[var(--background-secondary)] p-1">
              {(["accounts", "posts", "tags"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`h-9 rounded-full px-4 text-[13.5px] font-bold capitalize ${tab === t ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3"}`}
                >
                  {t} {res && <span className="font-medium text-ink-3">{t === "accounts" ? res.creators.length : t === "posts" ? res.posts.length : res.tags.length}</span>}
                </button>
              ))}
            </div>
            {!res ? (
              <div className="card h-40 animate-pulse" aria-busy />
            ) : tab === "accounts" ? (
              res.creators.length ? (
                <ul className="card divide-y divide-[var(--border)] px-2">
                  {res.creators.map((c) => (
                    <li key={c.id}>
                      <Link href={`/explore/u/${c.handle}`} className="flex items-center gap-3 rounded-[16px] px-3 py-3 hover:bg-[var(--background)]">
                        <Monogram name={c.name} size={48} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[14.5px] font-bold text-ink">
                            {c.name} {c.verified && <Verified size={14} />}
                          </span>
                          <span className="block truncate text-[13px] text-ink-3">
                            @{c.handle} · {c.specialty} · {c.city}
                          </span>
                        </span>
                        <span className="text-[12.5px] text-ink-3">{short(c.followers)} followers</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="card px-6 py-10 text-center text-[14.5px] text-ink-3">No people match “{q}”.</p>
              )
            ) : tab === "posts" ? (
              res.posts.length ? <Grid items={res.posts} /> : <p className="card px-6 py-10 text-center text-[14.5px] text-ink-3">No posts match “{q}”.</p>
            ) : res.tags.length ? (
              <ul className="flex flex-wrap gap-2">
                {res.tags.map((t) => (
                  <li key={t.tag}>
                    <Link href={`/explore/search?q=${encodeURIComponent(`#${t.tag}`)}`} onClick={() => setText(`#${t.tag}`)} className="card inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-bold text-ink">
                      #{t.tag} <span className="font-medium text-ink-3">{t.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card px-6 py-10 text-center text-[14.5px] text-ink-3">No tags match “{q}”.</p>
            )}
          </>
        ) : (
          <section aria-labelledby="topics-h" className="grid gap-3">
            <h2 id="topics-h" className="px-1 text-[15px] font-bold text-ink">What would you like to know about?</h2>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {EXPLORE_TOPICS.map((t) => (
                <li key={t.slug}>
                  <Link href={`/explore/topic/${t.slug}`} className="card group flex h-full flex-col gap-1 px-5 py-4 transition-shadow hover:shadow-[var(--shadow-card)]">
                    <span className="text-[15.5px] font-bold text-ink">{t.title}</span>
                    <span className="text-[13px] leading-snug text-ink-3">{t.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-1 text-[12.5px] text-ink-3">Or search above for anything else: a treatment, a problem or a dentist&apos;s name.</p>
          </section>
        )}
      </div>
    </div>
  );
}
