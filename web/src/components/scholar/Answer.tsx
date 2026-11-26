"use client";

import type { ReactNode } from "react";
import type { Answer, Source } from "@/sample/scholar/ai";
import { getFile } from "@/sample/files";
import { AiNote, SectionLabel, UncertainNote } from "./ui";

/** Opens a student's uploaded file (kept in this browser) in a new tab. */
export async function openFile(fileId: string) {
  const blob = await getFile(fileId);
  if (blob) window.open(URL.createObjectURL(blob), "_blank", "noopener");
}

/** One source, in the words the spec fixes: "Your file · name, p. N" or "Unverified · check this source". */
export function SourceRef({ n, source }: { n: number; source: Source }) {
  return (
    <li className="grid grid-cols-[18px_1fr] gap-1 text-[13.5px] leading-snug">
      <span className={`font-bold ${source.kind === "file" ? "text-[var(--accent)]" : "text-[var(--sch-amber-ink)]"}`}>{n}</span>
      {source.kind === "file" ? (
        <button type="button" onClick={() => openFile(source.file_id)} className="text-left text-ink-2 underline-offset-4 hover:underline">
          Your file · {source.name}, p. {source.page}
        </button>
      ) : (
        <span className="text-ink-2">
          <span className="font-semibold text-[var(--sch-amber-ink)]">Unverified · check this source</span>
          <span className="block text-[12.5px] text-ink-4">{source.label}</span>
        </span>
      )}
    </li>
  );
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="grid gap-2">
      <SectionLabel as="h3">Sources</SectionLabel>
      <ol className="grid gap-2.5">
        {sources.map((s, i) => (
          <SourceRef key={i} n={i + 1} source={s} />
        ))}
      </ol>
    </div>
  );
}

/**
 * An answer as prose, never a chat bubble: serif paragraphs, citation numbers keyed to the margin, uncertainty as its
 * own note, and the AI note. `margin` is drawn beside it on laptops and below it on phones.
 */
export function AnswerView({ answer, margin }: { answer: Answer; margin?: ReactNode }) {
  const files = answer.sources.filter((s) => s.kind === "file").length;
  const unverified = answer.sources.findIndex((s) => s.kind === "unverified") + 1;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
      <div>
        <div className="sch-prose">
          {answer.paragraphs.map((p, i) => (
            <p key={i}>
              {p}
              {i === 0 && files > 0 && <sup className="ml-0.5 font-sans text-[11px] font-bold text-[var(--accent)]">1</sup>}
            </p>
          ))}
        </div>
        {answer.notes.map((n, i) => (
          <UncertainNote key={i} kind={n.kind}>
            {n.text}
            {unverified > 0 && <sup className="ml-0.5 font-sans text-[11px] font-bold not-italic">{unverified}</sup>}
          </UncertainNote>
        ))}
        <AiNote className="mt-4" />
      </div>
      <aside className="grid content-start gap-6 border-t border-line pt-5 lg:border-t-0 lg:pt-1">
        {margin}
        <SourceList sources={answer.sources} />
      </aside>
    </div>
  );
}
