"use client";

import { LayoutGrid, Rows3 } from "lucide-react";

/** The posts: a grid of covers (Instagram) or full posts one under another (Facebook). */
export type PostView = "grid" | "list";
export function ViewToggle({ value, onChange }: { value: PostView; onChange: (v: PostView) => void }) {
  return (
    <div role="group" aria-label="Show posts as" className="flex rounded-lg bg-white/[0.06] p-0.5">
      {(
        [
          ["grid", "Grid", LayoutGrid],
          ["list", "List", Rows3],
        ] as const
      ).map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          aria-label={label}
          title={label}
          onClick={() => onChange(v)}
          className={`grid size-8 place-items-center rounded-md transition-colors ${value === v ? "bg-white/[0.14] text-ink" : "text-ink-3 hover:text-ink"}`}
        >
          <Icon className="size-4" strokeWidth={1.9} />
        </button>
      ))}
    </div>
  );
}
