"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink, Panel } from "@/components/app/kit";

/** Bits the dentist profile and the clinic page share. */

export function Back() {
  return (
    <Link href="/dentists" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
      <ArrowLeft className="size-4" strokeWidth={1.5} /> Find a dentist
    </Link>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <Panel className="grid justify-items-start gap-3 p-6">
      <h1 className="text-[19px] font-medium text-ink">We couldn&apos;t find that {what}</h1>
      <p className="text-[14.5px] text-ink-3">The link may be old, or the profile was removed.</p>
      <ButtonLink href="/dentists" variant="secondary">
        Find a dentist
      </ButtonLink>
    </Panel>
  );
}

export function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Panel as="section" className={`grid gap-3 p-5 sm:p-6 ${className}`}>
      <h2 className="text-[17px] font-medium text-ink">{title}</h2>
      {children}
    </Panel>
  );
}
