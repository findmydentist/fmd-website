"use client";

import { useState } from "react";
import { Button } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { report, REPORT_REASONS, type ReportReason } from "@/sample/content";

export function ReportSheet({ userId, postId, onClose, onDone }: { userId: string | null; postId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    try {
      await report(userId, postId, reason, note);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Sheet title="Report this post" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[14px] text-ink-2">What&apos;s wrong with it?</legend>
          {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([k, v]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14.5px] text-ink hover:bg-[var(--surface-glass)]">
              <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="size-4 accent-[var(--accent)]" />
              {v}
            </label>
          ))}
        </fieldset>
        <Field label={reason === "other" ? "Tell us what's wrong" : "Anything to add? (optional)"}>
          <textarea className={`${fieldCls} h-20 resize-y py-2.5`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send}>Send report</Button>
        </div>
      </div>
    </Sheet>
  );
}
