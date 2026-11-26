"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { addDoc, addSampleNotes, deleteDoc, listDocs, UNREADABLE, type Doc } from "@/sample/scholar/docs";
import { createProject, deleteProject, listItems, listProjects, updateProject, type Item, type Project } from "@/sample/scholar/workspace";
import { openFile } from "./Answer";
import { useScholar } from "./Shell";
import { ItemRows, PageHead, SectionLabel } from "./ui";

export const PROJECT_KINDS: { id: Project["kind"]; label: string }[] = [
  { id: "exam", label: "Exam preparation" },
  { id: "subject", label: "Subject" },
  { id: "seminar", label: "Seminar" },
  { id: "research", label: "Research project" },
];
const inputCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const daysTo = (date: string) => Math.ceil((Date.parse(`${date}T00:00:00+05:30`) - Date.now()) / 86_400_000);

export function NewProject({ onClose }: { onClose: () => void }) {
  const s = useScholar()!;
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Project["kind"]>("exam");
  const [exam, setExam] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet title="New project" onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const p = await createProject(s.me.id, name, kind, exam || null);
            router.push(`/scholar/projects/${p.id}`);
          } catch (x) {
            setErr(x instanceof Error ? x.message : "Couldn't create it.");
          }
        }}
      >
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Endodontics finals" className={inputCls} />
        </label>
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value as Project["kind"])} className={inputCls}>
            {PROJECT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Exam or presentation date (optional)
          <input type="date" value={exam} onChange={(e) => setExam(e.target.value)} className={inputCls} />
        </label>
        {err && <Notice kind="error">{err}</Notice>}
        <div>
          <Button type="submit">Create project</Button>
        </div>
      </form>
    </Sheet>
  );
}

/** /scholar/projects/[id]: a project's files and work (Scholar plan parts 2.4, 5.1). */
export function ProjectPage() {
  const s = useScholar();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Project | null | undefined>(undefined);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [sure, setSure] = useState<null | "project" | Doc>(null);
  const userId = s?.me.id;
  const load = useCallback(() => {
    if (!userId) return;
    listProjects(userId).then((ps) => setP(ps.find((x) => x.id === id) ?? null));
    listDocs(userId, id).then(setDocs);
    listItems(userId, { project: id }).then(setItems);
  }, [userId, id]);
  useEffect(load, [load]);
  if (!s) return null;
  if (p === undefined) return <p className="text-[15px] text-ink-3">Loading…</p>;
  if (p === null) return <Notice kind="error">That project no longer exists.</Notice>;

  const upload = async (files: FileList | null) => {
    setErr(null);
    for (const f of Array.from(files ?? []))
      try {
        await addDoc(s.me.id, p.id, f);
      } catch (e) {
        setErr(`${f.name}: ${e instanceof Error ? e.message : "couldn't upload it."}`);
      }
    load();
  };
  const save = (patch: Partial<Project>) => updateProject(s.me.id, p.id, patch).then(load);

  return (
    <div className="mx-auto grid max-w-[900px] gap-10">
      <PageHead
        meta={`${PROJECT_KINDS.find((k) => k.id === p.kind)?.label}${p.exam_date ? ` · ${daysTo(p.exam_date) >= 0 ? `${daysTo(p.exam_date)} days to go` : "date passed"}` : ""}`}
        title={
          <input aria-label="Project name" defaultValue={p.name} onBlur={(e) => e.target.value.trim() && e.target.value !== p.name && save({ name: e.target.value.trim() })} className="w-full bg-transparent outline-none focus:underline" />
        }
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <ButtonLink href={`/scholar/ask?project=${p.id}`} size="sm">
            Ask about this project
          </ButtonLink>
          <ButtonLink href={`/scholar/decks/new?project=${p.id}`} size="sm" variant="secondary">
            New presentation
          </ButtonLink>
        </div>
      </PageHead>

      <section className="grid gap-3" aria-labelledby="files">
        <SectionLabel as="h2">
          <span id="files">Files</span>
        </SectionLabel>
        <p className="text-[14px] text-ink-3">Notes, lecture slides or papers. Answers in this project can quote them with page numbers. Files stay in this browser in the demo.</p>
        {docs.length > 0 && (
          <ul>
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line py-3">
                <span className="min-w-0">
                  <button type="button" onClick={() => openFile(d.id)} className="text-left text-[15px] text-ink hover:underline">
                    {d.name}
                  </button>
                  <span className="block text-[12.5px] text-ink-4">
                    {kb(d.size)} · {d.status === "ready" ? `${d.pages?.length} page${d.pages?.length === 1 ? "" : "s"}, ready to search` : UNREADABLE}
                  </span>
                </span>
                <button type="button" onClick={() => setSure(d)} className="text-[13px] text-ink-3 hover:text-ink">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-[var(--button-secondary)] px-4 text-[13px] font-semibold text-ink hover:border-line-strong">
            Upload files
            <input type="file" multiple accept=".pdf,.txt,.md,image/jpeg,image/png" className="sr-only" onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
          </label>
          <Button size="sm" variant="secondary" onClick={() => addSampleNotes(s.me.id, p.id).then(load)}>
            Add sample lecture notes
          </Button>
          <span className="text-[12.5px] text-ink-4">PDF, text or image, up to 10 MB</span>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
      </section>

      <section className="grid gap-2">
        <SectionLabel as="h2">Work in this project</SectionLabel>
        {items.length ? <ItemRows items={items} /> : <p className="text-[14px] text-ink-3">Nothing yet. Questions you ask from this project are saved here.</p>}
      </section>

      <section className="grid gap-3 border-t border-line pt-6">
        <label className="grid max-w-[260px] gap-1.5 text-[14px] text-ink-2">
          Exam or presentation date
          <input type="date" value={p.exam_date ?? ""} onChange={(e) => save({ exam_date: e.target.value || null })} className={inputCls} />
        </label>
        <div>
          <button type="button" onClick={() => setSure("project")} className="text-[13.5px] text-ink-3 hover:text-ink">
            Delete project
          </button>
        </div>
      </section>

      {sure && (
        <Sheet title={sure === "project" ? "Delete this project?" : `Delete ${sure.name}?`} onClose={() => setSure(null)}>
          <p className="mb-4 text-[14.5px] text-ink-2">
            {sure === "project" ? "You can keep its work in your library, or delete everything in it. Its files are deleted either way." : "It's removed from this browser and from any answer that cites it."}
          </p>
          <div className="flex flex-wrap gap-2">
            {sure === "project" ? (
              <>
                <Button
                  onClick={async () => {
                    for (const d of docs) await deleteDoc(s.me.id, d.id);
                    await deleteProject(s.me.id, p.id, false);
                    router.push("/scholar");
                  }}
                >
                  Delete, keep the work
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    for (const d of docs) await deleteDoc(s.me.id, d.id);
                    await deleteProject(s.me.id, p.id, true);
                    router.push("/scholar");
                  }}
                >
                  Delete everything
                </Button>
              </>
            ) : (
              <Button onClick={() => deleteDoc(s.me.id, sure.id).then(() => (setSure(null), load()))}>Delete file</Button>
            )}
          </div>
        </Sheet>
      )}
      <p className="text-[12.5px] text-ink-4">
        <Link href="/scholar" className="hover:text-ink">
          ← Scholar home
        </Link>
      </p>
    </div>
  );
}
