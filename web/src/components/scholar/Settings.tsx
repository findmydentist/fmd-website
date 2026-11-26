"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { track } from "@/lib/analytics";
import { getStudent, type StudentProfile } from "@/sample/onboarding";
import { deleteDoc, listDocs } from "@/sample/scholar/docs";
import { exportAll } from "@/sample/scholar/export";
import { LEVELS, type Level } from "@/sample/scholar/topics";
import { deleteAll, getPrefs, setPrefs } from "@/sample/scholar/workspace";
import { MENU, useScholar } from "./Shell";
import { download, PageHead, SectionLabel } from "./ui";

export const RETENTION =
  "If your membership ends, your work stays readable through the grace period and is kept for 90 days after that before it's deleted. You can export or delete it any time. (Demo terms, to be confirmed.)";

/** /scholar/settings: depth, export, delete and what happens to your work (Scholar plan part 5.2). Also "Me" on phones. */
export function SettingsPage() {
  const s = useScholar();
  const [level, setLevel] = useState<Level>(() => (s ? getPrefs(s.me.id).level : "ug"));
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [confirm, setConfirm] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) getStudent(userId).then(setStudent);
  }, [userId]);
  if (!s) return null;

  return (
    <div className="mx-auto grid max-w-[720px] gap-10">
      <PageHead meta="Settings" title={s.me.full_name} lede={student ? `${student.course}, ${student.year} · ${student.college}` : undefined} />
      {note && <Notice kind="success">{note}</Notice>}

      <nav aria-label="Scholar" className="grid gap-1 lg:hidden">
        {MENU.filter((m) => !["/scholar", "/scholar/ask", "/scholar/library", "/scholar/settings"].includes(m.href)).map((m) => (
          <Link key={m.href} href={m.href} className="border-t border-line py-2.5 text-[15px] text-ink-2 hover:text-ink">
            {m.label}
          </Link>
        ))}
        <Link href="/assistant" className="border-t border-line py-2.5 text-[15px] text-ink-3 hover:text-ink">
          Back to FMD
        </Link>
      </nav>

      <section className="grid gap-2">
        <SectionLabel as="h2">Default depth for answers</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={level === l.id}
              onClick={() => (setLevel(l.id), setPrefs(s.me.id, { level: l.id }))}
              className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${level === l.id ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <SectionLabel as="h2">Student ID</SectionLabel>
        <p className="text-[14.5px] text-ink-2">{student?.id_doc ? `Uploaded (${student.id_doc.name}). Being checked by FMD (demo: no real check runs).` : "Not uploaded yet."}</p>
      </section>

      <section className="grid gap-3">
        <SectionLabel as="h2">Your work</SectionLabel>
        <p className="text-[14px] text-ink-3">{RETENTION}</p>
        <div>
          <Button
            variant="secondary"
            onClick={async () => {
              const files = await exportAll(s.me.id);
              files.forEach((f, i) => setTimeout(() => download(f.blob, f.name), i * 300)); // one at a time, so browsers don't block them
              track("scholar_export", { format: "markdown", ok: true });
              setNote(files.length ? `Downloading ${files.length} file${files.length === 1 ? "" : "s"}.` : "There's nothing to export yet.");
            }}
          >
            Export everything
          </Button>
        </div>
        <p className="text-[13px] text-ink-4">Each item downloads as a Markdown file, plus your original uploads. To delete one item or a project, use Library or the project page.</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-line p-5">
        <SectionLabel as="h2">Delete all Scholar data</SectionLabel>
        <p className="text-[14px] text-ink-2">Removes every conversation, study set, viva, presentation, research draft, project and uploaded file from Scholar. Your FMD account and membership stay. This can&apos;t be undone.</p>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            for (const d of await listDocs(s.me.id)) await deleteDoc(s.me.id, d.id);
            await deleteAll(s.me.id);
            setConfirm("");
            setNote("All your Scholar data was deleted.");
          }}
        >
          <label className="grid gap-1.5 text-[13.5px] text-ink-3">
            Type DELETE to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-10 w-40 rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink" />
          </label>
          <Button type="submit" variant="secondary" disabled={confirm !== "DELETE"}>
            Delete everything
          </Button>
        </form>
      </section>
    </div>
  );
}
