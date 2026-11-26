"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { WEBHOOK_MS } from "@/sample/billing";
import { demoMakeStudent, type ScholarAccess } from "@/sample/scholar/access";
import { PageHead } from "./ui";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "");

/** Why someone can't open Scholar yet, and the one thing that would fix it (Scholar plan part 1.1). */
export function Gate({ access, userId, onChange }: { access: ScholarAccess; userId: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const copy = {
    not_student: {
      title: "FMD Scholar is for dental students",
      lede: "It comes with the ₹400 a year student membership: doubts at your level, viva practice, seminars and research help. Dentist and company accounts don't include it.",
      cta: { href: "/plans", label: "See memberships" },
    },
    unpaid: {
      title: "Start your student membership",
      lede: "FMD Scholar is included in the ₹400 a year student membership (plus GST). Price, limits and renewal are shown before you pay.",
      cta: { href: "/checkout/student", label: "Get the student membership" },
    },
    id_needed: {
      title: "Add your student ID",
      lede: "Scholar opens once we have your student ID. Upload a photo or PDF of your college ID card; we check it before showing any badge.",
      cta: { href: "/onboarding?as=student&next=/scholar", label: "Add student ID" },
    },
  } as const;
  const c = copy[access.status as keyof typeof copy] ?? copy.not_student;
  return (
    <div className="mx-auto max-w-[640px] py-6">
      <PageHead meta="FMD Scholar" title={c.title} lede={c.lede} />
      <ButtonLink href={c.cta.href}>{c.cta.label}</ButtonLink>
      <section className="mt-10 grid gap-2 rounded-2xl border border-dashed border-line p-5">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-4">Demo</h2>
        <p className="text-[14px] text-ink-3">Trying FMD Scholar? Make this account a dental student with a sample ID and a paid student membership. Nothing real is charged.</p>
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await demoMakeStudent(userId);
              setTimeout(onChange, WEBHOOK_MS + 200); // the demo gateway confirms the payment a few seconds later
            }}
          >
            {busy ? "Setting up…" : "Demo: set me up as a paid student"}
          </Button>
        </div>
      </section>
    </div>
  );
}

/** A quiet line at the top while the membership is in grace or has ended. */
export function StatusBanner({ access }: { access: ScholarAccess }) {
  if (access.status !== "grace" && access.status !== "read_only") return null;
  return (
    <p role="status" className="mb-6 rounded-2xl border border-line px-4 py-3 text-[14px] text-ink-2">
      {access.status === "grace" ? (
        <>Your membership ended. Scholar stays open until {date(access.grace_until)}. </>
      ) : (
        <>Read-only: your membership has ended. Everything you made is still here. </>
      )}
      <Link href="/membership" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
        Renew
      </Link>
    </p>
  );
}
