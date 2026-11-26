"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/app/kit";
import { Sheet } from "@/components/app/Sheet";
import { deleteItem, KIND_LABEL, listItems, listProjects, updateItem, type Item, type Kind, type Project } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { itemHref, PageHead } from "./ui";

const inputCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-[13px] ${on ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`;

function EditItem({ item, projects, onClose }: { item: Item; projects: Project[]; onClose: (changed: boolean) => void }) {
  const s = useScholar()!;
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(item.tags.join(", "));
  const [project, setProject] = useState(item.project_id ?? "");
  const [sure, setSure] = useState(false);
  return (
    <Sheet title="Edit" onClose={() => onClose(false)}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await updateItem(s.me.id, item.id, { title, tags: [...new Set(tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))], project_id: project || null });
          onClose(true);
        }}
      >
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Tags, separated by commas
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. endo, finals" className={inputCls} />
        </label>
        <label className="grid gap-1.5 text-[14px] text-ink-2">
          Project
          <select value={project} onChange={(e) => setProject(e.target.value)} className={inputCls}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="submit">Save</Button>
          {sure ? (
            <Button variant="secondary" onClick={() => deleteItem(s.me.id, item.id).then(() => onClose(true))}>
              Yes, delete it
            </Button>
          ) : (
            <button type="button" onClick={() => setSure(true)} className="text-[13.5px] text-ink-3 hover:text-ink">
              Delete
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

/** /scholar/library: everything saved, searchable, with the student's own tags and projects (Scholar plan part 5.1). */
export function LibraryPage() {
  const s = useScholar();
  const [all, setAll] = useState<Item[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [project, setProject] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const userId = s?.me.id;
  const load = useCallback(() => {
    if (!userId) return;
    listItems(userId).then(setAll);
    listProjects(userId).then(setProjects);
  }, [userId]);
  useEffect(load, [load]);
  if (!s) return null;

  const tags = [...new Set((all ?? []).flatMap((i) => i.tags))].sort();
  const kinds = [...new Set((all ?? []).map((i) => i.kind))];
  const needle = q.trim().toLowerCase();
  const shown = (all ?? []).filter((i) => (!kind || i.kind === kind) && (!tag || i.tags.includes(tag)) && (!project || i.project_id === project) && (!needle || i.title.toLowerCase().includes(needle) || i.tags.some((t) => t.includes(needle))));
  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="mx-auto grid max-w-[900px] gap-5">
      <PageHead meta="Library" title="Everything you've made" lede="Questions, study sets, vivas, presentations and research drafts. Tag and file them your way." />
      <div className="grid gap-3">
        <label htmlFor="lib-q" className="sr-only">
          Search your library
        </label>
        <input id="lib-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and tags" className={inputCls} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
          <button type="button" aria-pressed={!kind} onClick={() => setKind(null)} className={chip(!kind)}>
            All
          </button>
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)} className={chip(kind === k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {(tags.length > 0 || projects.length > 0) && (
          <div className="flex flex-wrap items-center gap-3">
            {projects.length > 0 && (
              <select aria-label="Filter by project" value={project} onChange={(e) => setProject(e.target.value)} className="h-9 rounded-full border border-line-strong bg-transparent px-3 text-[13px] text-ink-2">
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {tags.map((t) => (
              <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)}>
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {all === null ? (
        <p className="text-[15px] text-ink-3">Loading…</p>
      ) : !all.length ? (
        <p className="text-[14.5px] text-ink-3">Nothing saved yet. Everything you make in Scholar lands here.</p>
      ) : !shown.length ? (
        <p className="text-[14.5px] text-ink-3">Nothing matches. Try another search or clear the filters.</p>
      ) : (
        <ul>
          {shown.map((i) => (
            <li key={i.id} className="flex items-baseline gap-3 border-t border-line py-3">
              <Link href={itemHref(i)} className="min-w-0 flex-1 text-[15px] text-ink-2 hover:text-ink">
                <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">{KIND_LABEL[i.kind]}</span>
                {i.title}
                <span className="block text-[12.5px] text-ink-4">
                  {[projectName(i.project_id), ...i.tags.map((t) => `#${t}`), new Date(i.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })].filter(Boolean).join(" · ")}
                </span>
              </Link>
              <button type="button" onClick={() => setEditing(i)} className="shrink-0 text-[13px] text-ink-3 hover:text-ink" aria-label={`Edit ${i.title}`}>
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && <EditItem item={editing} projects={projects} onClose={(changed) => (setEditing(null), changed && load())} />}
    </div>
  );
}
