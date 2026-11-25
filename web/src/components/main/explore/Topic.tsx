"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useViewer } from "@/lib/useViewer";
import { topicPage } from "@/sample/exploreTopics";
import { Grid } from "./Discover";
import { ExploreNav } from "./ExploreNav";
import { Verified } from "./icons";
import { Monogram } from "./Monogram";

type Page = Awaited<ReturnType<typeof topicPage>>;

/**
 * /explore/topic/[slug]: everything about one treatment or problem, and nothing else (owner, 16 Nov 2026): a plain
 * explainer, posts about it from verified dentists, and a quiet strip of three dentists who treat it.
 */
export function TopicPage() {
  const viewer = useViewer();
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | undefined>(undefined);
  const ready = viewer !== undefined;
  useEffect(() => {
    if (ready) topicPage(slug, viewer?.id ?? null).then(setPage);
  }, [ready, slug, viewer]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[200px_minmax(0,760px)] lg:justify-center lg:gap-10">
      <ExploreNav active="search" viewer={viewer ?? null} />
      <div className="grid min-w-0 content-start gap-7">
        <Link href="/explore/search" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← All topics
        </Link>
        {page === undefined ? (
          <div className="card h-56 animate-pulse" aria-busy />
        ) : page === null ? (
          <p className="card px-6 py-10 text-center text-[14.5px] text-ink-3">We couldn&apos;t find that topic.</p>
        ) : (
          <>
            <header className="grid gap-3">
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[36px]">{page.topic.title}</h1>
              <div className="grid max-w-[62ch] gap-3 text-[15.5px] leading-relaxed text-ink-2">
                {page.topic.explainer.map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </div>
              <p className="text-[12.5px] text-ink-3">General information from FMD, not a diagnosis. A dentist needs to examine you to know what you need.</p>
            </header>

            <section aria-labelledby="t-posts" className="grid gap-3">
              <h2 id="t-posts" className="text-[17px] font-bold text-ink">
                From dentists on FMD
              </h2>
              {page.posts.length ? <Grid items={page.posts} /> : <p className="card px-6 py-8 text-center text-[14px] text-ink-3">No posts about {page.topic.title.toLowerCase()} yet.</p>}
            </section>

            <section aria-labelledby="t-dentists" className="grid gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="t-dentists" className="text-[17px] font-bold text-ink">
                  Dentists who treat this
                </h2>
                <Link href={`/dentists?specialty=${encodeURIComponent(page.topic.specialty)}`} className="text-[13.5px] font-semibold text-[var(--accent)] hover:underline">
                  See all
                </Link>
              </div>
              {page.dentists.length ? (
                <ul className="grid gap-2.5 sm:grid-cols-3">
                  {page.dentists.map((d) => (
                    <li key={d.id} className="card flex flex-col gap-3 p-4">
                      <Link href={`/dentists/${d.id}`} className="flex items-center gap-3">
                        {d.photo ? (
                          <span className="relative size-12 shrink-0 overflow-hidden rounded-[16px] bg-[var(--background-secondary)]">
                            <Image src={d.photo} alt="" fill sizes="48px" className="object-cover" />
                          </span>
                        ) : (
                          <Monogram name={d.name} size={48} />
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-[14px] font-bold text-ink">
                            <span className="truncate">{d.name}</span>
                            {d.verification.status === "verified" && <Verified size={13} />}
                          </span>
                          <span className="block truncate text-[12.5px] text-ink-3">
                            {d.clinic.name} · {d.clinic.area}
                          </span>
                        </span>
                      </Link>
                      <Link href={`/book/${d.id}`} className="mt-auto rounded-full bg-[var(--button-primary)] px-4 py-2 text-center text-[13px] font-semibold text-[var(--button-primary-fg)]">
                        Book
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="card px-6 py-8 text-center text-[14px] text-ink-3">No dentists listed for this yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
