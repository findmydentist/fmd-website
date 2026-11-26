"use client";

import { Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useState, type ReactNode } from "react";

/**
 * The wide picture behind a profile's photo, as on Facebook and LinkedIn. `src` is a picture's URL (a dentist's, or
 * your own as a data URL); without one, a quiet default. Fills its parent, which sets the height.
 */
export function Cover({ src, children }: { src?: string | null; children?: ReactNode }) {
  return (
    <div className="relative size-full overflow-hidden">
      {src ? (
        src.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element -- your own picture, already sized in this browser
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Image src={src} alt="" fill sizes="(min-width: 1128px) 1128px, 100vw" className="object-cover" priority />
        )
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_140%_at_15%_0%,rgb(56_189_248/0.22),transparent_60%),radial-gradient(90%_120%_at_100%_100%,rgb(56_189_248/0.14),transparent_60%)]" />
      )}
      {children}
    </div>
  );
}

/** Add, change or remove your cover: a picture from this device, cropped to the cover's shape. */
export function CoverEdit({ has, onPick, onRemove }: { has: boolean; onPick: (f: File) => Promise<void>; onRemove: () => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const btn =
    "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-black/55 px-3 text-[14px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/70 has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]";
  return (
    <div className="absolute bottom-3 right-3 z-10 grid justify-items-end gap-1.5">
      {err && (
        <p role="alert" className="rounded-lg bg-black/75 px-3 py-1.5 text-[13px] text-white">
          {err}
        </p>
      )}
      <div className="flex gap-2">
        <label htmlFor={id} className={btn}>
          <Camera aria-hidden className="size-4" strokeWidth={2} />
          {busy ? "Saving…" : has ? "Change cover" : "Add cover photo"}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setErr(null);
              setBusy(true);
              try {
                await onPick(f);
              } catch (x) {
                setErr((x as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {has && (
          <button type="button" onClick={onRemove} aria-label="Remove cover photo" title="Remove cover photo" className={btn}>
            <Trash2 aria-hidden className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
