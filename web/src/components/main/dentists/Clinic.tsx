"use client";

import { CalendarClock, Clock3, ExternalLink, MapPin } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Panel, Tag } from "@/components/app/kit";
import { getClinicPage, type ClinicPage } from "@/sample/providers";
import { Back, Card, NotFound } from "./common";
import { DentistCard } from "./Search";

/* ---------------- /clinics/[id] ---------------- */

export function ClinicView() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<ClinicPage | null | undefined>(undefined);
  useEffect(() => {
    getClinicPage(id).then(setC);
  }, [id]);
  if (c === undefined) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (c === null) return <NotFound what="clinic" />;
  return (
    <div className="grid gap-5">
      <Back />
      <Panel className="grid gap-3 p-5 sm:p-6">
        <h1 className="flex flex-wrap items-center gap-3 text-[22px] font-medium text-ink">
          {c.name} <Tag tone="muted">Demo</Tag>
        </h1>
        <div className="grid gap-1.5 text-[14px] text-ink-2">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.75} /> {c.address}, {c.city}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 text-ink-3" strokeWidth={1.75} /> {c.hours}
          </p>
          <p className="flex items-center gap-2">
            <CalendarClock className="size-4 text-ink-3" strokeWidth={1.75} />
            {c.live ? "Book online: this clinic's calendar is connected." : "This clinic confirms a time after you ask."}
          </p>
        </div>
        {c.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.facilities.map((x) => (
              <Tag key={x} tone="muted">
                {x}
              </Tag>
            ))}
          </div>
        )}
        <a href={c.mapUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-ink hover:underline">
          Open in Google Maps <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
      </Panel>
      <section className="grid gap-3">
        <h2 className="text-[17px] font-medium text-ink">Dentists at this clinic</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {c.dentists.map((d) => (
            <DentistCard key={d.id} p={d} />
          ))}
        </div>
      </section>
      <Card title="Treatments offered">
        <div className="flex flex-wrap gap-1.5">
          {c.services.map((s) => (
            <Tag key={s} tone="muted">
              {s}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  );
}
