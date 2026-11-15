"use client";

import { LayoutGrid } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Six looks for the profile pages (your own and a dentist's), to show people side by side and see which they like.
 * The pick is shared by both pages, kept in this browser, and written into the link (?layout=) so each can be sent.
 */
export type Layout = "insta" | "cards" | "linkedin" | "facebook" | "insta2" | "explore";
export const LAYOUTS: [Layout, string][] = [
  ["insta", "Layout 1 · Instagram style"],
  ["cards", "Layout 2 · Cards"],
  ["linkedin", "Layout 3 · LinkedIn style"],
  ["facebook", "Layout 4 · Facebook style"],
  ["insta2", "Layout 5 · Instagram style (variant)"],
  ["explore", "Layout 6 · Explore style"],
];
const KEY = "fmd-demo:profile-layout";

export function useProfileLayout() {
  const [layout, setLayout] = useState<Layout>("linkedin");
  useEffect(() => {
    // a shared link's ?layout= wins, then this browser's last pick
    let asked = new URLSearchParams(location.search).get("layout");
    try {
      asked ??= localStorage.getItem(KEY);
    } catch {
      // storage blocked: the default
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL and browser storage are only readable after mounting
    if (LAYOUTS.some(([l]) => l === asked)) setLayout(asked as Layout);
  }, []);
  const pick = (l: Layout) => {
    setLayout(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      // kept for this visit only
    }
    const url = new URL(location.href);
    url.searchParams.set("layout", l);
    history.replaceState(history.state, "", url);
  };
  return [layout, pick] as const;
}

export function LayoutPicker({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-ink-3">
      <LayoutGrid className="size-4" strokeWidth={1.75} />
      <span className="hidden sm:inline">Profile layout</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Layout)}
        aria-label="Profile layout"
        className="h-9 max-w-[62vw] cursor-pointer rounded-full border border-line bg-[var(--surface)] px-3.5 text-[13.5px] font-medium text-ink hover:border-line-strong focus:border-[var(--accent)] focus:outline-none"
      >
        {LAYOUTS.map(([l, label]) => (
          <option key={l} value={l}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
