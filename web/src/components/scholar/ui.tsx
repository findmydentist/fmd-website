"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/analytics";
import type { QImage } from "@/sample/scholar/topics";
import { KIND_LABEL, type Item, type Kind } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";

/** Study-mode building blocks: serif for content, quiet sans for everything around it. */

export const AI_NOTE = "AI-generated study material. Check it against your textbooks, guidelines or faculty.";

export function PageHead({ meta, title, lede, children }: { meta?: ReactNode; title: ReactNode; lede?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 grid gap-2.5">
      {meta && <p className="text-[13px] font-medium text-ink-3">{meta}</p>}
      <h1 className="sch-serif text-[28px] font-semibold leading-[1.12] tracking-[-0.015em] text-ink [text-wrap:balance] sm:text-[36px]">{title}</h1>
      {lede && <p className="max-w-[62ch] text-[15.5px] leading-[1.6] text-ink-2">{lede}</p>}
      {children}
    </header>
  );
}

export function SectionLabel({ children, as: Tag = "p" }: { children: ReactNode; as?: "p" | "h2" | "h3" }) {
  // a section's own heading: sentence case and readable, not a tiny all-caps kicker
  return <Tag className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">{children}</Tag>;
}

/** "Uncertain" or "Evidence differs": an amber rule and italics, never hidden in the prose (SCH-11). */
export function UncertainNote({ kind, children }: { kind: "uncertain" | "differs"; children: ReactNode }) {
  return (
    <p className="sch-serif my-3 max-w-[62ch] border-l-[3px] border-[var(--sch-amber)] py-1 pl-3.5 text-[15.5px] italic leading-relaxed text-[var(--sch-amber-ink)]">
      <span className="not-italic font-semibold">{kind === "uncertain" ? "Uncertain:" : "Evidence differs:"}</span> {children}
    </p>
  );
}

export function AiNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12.5px] leading-relaxed text-ink-4 ${className}`}>
      {AI_NOTE} · <span className="font-semibold">Demo</span>
    </p>
  );
}

/** Shown in place of a create form when the membership has ended (read-only) — Review Focus 5. */
export function ReadOnly({ children }: { children: ReactNode }) {
  const s = useScholar();
  if (!s) return null;
  if (s.access.status === "active" || s.access.status === "grace") return <>{children}</>;
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-6">
      <p className="text-[15px] text-ink-2">Your membership has ended, so Scholar is read-only. Your work is all still here.</p>
      <Link href="/membership" className="mt-2 inline-block text-[14px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
        Renew to create new work
      </Link>
    </div>
  );
}

/** The photo of a picture question, with its credit and licence (required by CC BY-SA, polite for CC0). */
export function QuestionImage({ image, compact = false }: { image: QImage; compact?: boolean }) {
  return (
    <figure className={`grid gap-1.5 ${compact ? "max-w-[320px]" : "max-w-[560px]"}`}>
      <Image
        src={image.src}
        width={image.w}
        height={image.h}
        alt={image.alt}
        sizes={compact ? "320px" : "(min-width: 640px) 560px, 100vw"}
        className={`w-full rounded-xl border border-line bg-[var(--surface)] object-contain ${compact ? "max-h-[180px]" : "max-h-[360px]"}`}
      />
      <figcaption className="text-[11.5px] leading-snug text-ink-4">
        Photo: {image.credit} ·{" "}
        <a href={image.source} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-3">
          {image.licence}, Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}

/** Where a saved item opens. */
export function itemHref(i: { id: string; kind: Kind }) {
  if (i.kind === "ask") return `/scholar/ask/${i.id}`;
  if (i.kind === "viva") return `/scholar/viva/${i.id}`;
  if (i.kind === "deck") return `/scholar/decks/${i.id}`;
  if (i.kind === "research") return `/scholar/research/${i.id}`;
  return `/scholar/study/${i.kind}?id=${i.id}`;
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
};

/** A plain list of saved work: kind label, title, when. */
export function ItemRows({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((i) => (
        <li key={i.id}>
          <Link href={itemHref(i)} className="flex items-baseline justify-between gap-4 border-t border-line py-3 text-[14.5px] text-ink-2 hover:text-ink">
            <span className="min-w-0">
              <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">{KIND_LABEL[i.kind]}</span>
              {i.title}
            </span>
            <span className="shrink-0 text-[12.5px] text-ink-4">{ago(i.updated_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Saves a file to the device. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fileName = (title: string) => title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 60) || "scholar";

type Made = "ask" | "quiz" | "flashcards" | "summary" | "plan" | "viva" | "deck" | "research";
/** Analytics for a Scholar action: what was used, never what was asked. */
export function reportUse(feature: Made, unverified = 0) {
  track("scholar_feature_used", { feature });
  if (unverified) track("scholar_citation_flagged", { count: unverified });
}
export function reportFailure(feature: Made, e: unknown) {
  void e;
  track("scholar_generation_failed", { feature });
}
