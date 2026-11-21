"use client";

import { BarChart3, Film, ThumbsUp, MessageSquare, SquarePlay } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { FeedItem } from "@/sample/content";
import { coverOf } from "./explore/Explore";

/** Post covers as rounded tiles, 2 across on phones and 3 on wider screens; hover shows the counts. Also the account page's tabs. */
export function PostGrid({ posts, square = false }: { posts: FeedItem[]; square?: boolean }) {
  // the profile page's Instagram-style layout: 3 across, square, edge to edge
  if (square)
    return (
      <ul className="grid grid-cols-3 gap-1">
        {posts.map((x) => (
          <li key={x.id}>
            <Link href={`/explore/${x.id}`} className={`group relative grid aspect-square content-center justify-items-center gap-2 overflow-hidden bg-gradient-to-br ${coverOf(x.topic)} to-transparent p-2 text-center sm:p-4`}>
              {x.media && x.kind === "image" && (
                <span className="relative block h-10 w-14 overflow-hidden rounded-md sm:h-16 sm:w-20">
                  <Image src={x.media.src} alt="" fill sizes="80px" className="object-cover" />
                </span>
              )}
              <span className="line-clamp-3 text-[11.5px] font-semibold leading-tight text-ink sm:text-[15px]">{x.title}</span>
              {x.kind === "video" && <Film aria-label="Video" className="absolute right-2 top-2 size-4 text-ink" strokeWidth={1.75} />}
              {x.kind === "poll" && <BarChart3 aria-label="Poll" className="absolute right-2 top-2 size-4 text-ink" strokeWidth={1.75} />}
              <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/55 text-[15px] font-semibold text-white group-hover:flex">
                <span className="flex items-center gap-1.5">
                  <ThumbsUp className="size-5 fill-white" strokeWidth={0} /> {x.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="size-5 fill-white" strokeWidth={0} /> {x.comments}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {posts.map((x) => (
        <li key={x.id}>
          <Link href={`/explore/${x.id}`} className={`group relative grid aspect-[4/5] content-end gap-2 overflow-hidden rounded-2xl border border-line bg-gradient-to-tr ${coverOf(x.topic)} to-transparent p-3 sm:p-4`}>
            {x.media && x.kind === "image" && (
              <span className="relative block h-12 w-16 overflow-hidden rounded-lg sm:h-16 sm:w-20">
                <Image src={x.media.src} alt="" fill sizes="80px" className="object-cover" />
              </span>
            )}
            <span className="line-clamp-3 text-[13px] font-semibold leading-tight text-ink sm:text-[15px]">{x.title}</span>
            {x.kind === "video" && <SquarePlay aria-label="Video" className="absolute left-3 top-3 size-[18px] text-ink" strokeWidth={1.75} />}
            {x.kind === "poll" && <BarChart3 aria-label="Poll" className="absolute left-3 top-3 size-[18px] text-ink" strokeWidth={1.75} />}
            <span className="absolute inset-x-2 top-2 hidden justify-end gap-1.5 text-[12.5px] font-semibold text-white group-hover:flex">
              <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur">
                <ThumbsUp className="size-3.5" strokeWidth={2} /> {x.likes}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur">
                <MessageSquare className="size-3.5" strokeWidth={2} /> {x.comments}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Videos as tall 9 : 16 tiles, 3 across, as Instagram shows reels; hover shows the counts. */
export function ReelGrid({ posts }: { posts: FeedItem[] }) {
  return (
    <ul className="grid grid-cols-3 gap-1">
      {posts.map((x) => (
        <li key={x.id}>
          <Link href={`/explore/${x.id}`} className={`group relative grid aspect-[9/16] content-end overflow-hidden bg-gradient-to-b ${coverOf(x.topic)} to-black/60 p-2.5 sm:p-3.5`}>
            {x.media?.poster && <Image src={x.media.poster} alt="" fill sizes="(min-width: 640px) 240px, 33vw" className="object-cover" />}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            <SquarePlay aria-hidden className="absolute right-2.5 top-2.5 size-5 text-white drop-shadow" strokeWidth={1.75} />
            <span className="relative line-clamp-3 text-[12px] font-semibold leading-tight text-white sm:text-[14.5px]">{x.title}</span>
            <span className="relative mt-1.5 flex items-center gap-1 text-[12px] text-white/85">
              <ThumbsUp aria-hidden className="size-3.5" strokeWidth={2} /> {x.likes}
            </span>
            <span className="absolute inset-0 hidden bg-black/25 group-hover:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
