import Image from "next/image";
import Link from "next/link";
import { Verified } from "@/components/main/explore/icons";
import { MEDIA } from "@/sample/media";
import { ROLES, TYPES, type Employer, type Job } from "@/sample/jobs";

export const rupees = (n: number) => `₹${n >= 100000 ? `${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : `${Math.round(n / 1000)}k`}`;
export const pay = (j: Pick<Job, "salary" | "role">) =>
  j.salary ? `${rupees(j.salary.min)}–${rupees(j.salary.max)}${j.role === "locum" ? " a day" : " a month"}` : "Pay discussed at interview";
export const postedAgo = (iso: string) => {
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
};

/** The employer's mark: initials on a tile (dentist space: ink; team: accent). */
export function EmployerLogo({ e, size = 52, dark = false }: { e: Pick<Employer, "logo" | "name">; size?: number; dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-extrabold tracking-[-0.02em] ${dark ? "bg-[#1d1d1f] text-white" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.34) }}
    >
      {e.logo}
    </span>
  );
}

/** A listing on the board: a photo strip from the employer, the facts that decide a click, nothing else. */
export function JobCard({ j }: { j: Job }) {
  const photos = j.employer.photos.slice(0, 3).map((k) => MEDIA[k]).filter(Boolean);
  const dentist = j.space === "dentist";
  return (
    <Link href={`/jobs/${j.id}`} className="card group flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
      {photos.length > 0 && (
        <span className="grid h-36 grid-cols-[2fr_1fr] gap-1 overflow-hidden">
          <span className="relative">
            <Image src={photos[0]!.src} alt="" fill sizes="(min-width: 1024px) 260px, 60vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          </span>
          <span className="grid gap-1">
            {photos.slice(1).map((m) => (
              <span key={m!.key} className="relative">
                <Image src={m!.src} alt="" fill sizes="140px" className="object-cover" />
              </span>
            ))}
          </span>
        </span>
      )}
      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="flex items-center gap-3">
          <EmployerLogo e={j.employer} size={44} dark={dentist} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-2">
              <span className="truncate">{j.employer.name}</span>
              {j.employer.verified && <Verified size={14} />}
            </span>
            <span className="block truncate text-[12.5px] text-ink-3">
              {j.area}, {j.city}
            </span>
          </span>
        </span>
        <span className="text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">{j.title}</span>
        <span className="flex flex-wrap gap-1.5 text-[12px] font-semibold">
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-ink-2">{ROLES[j.role]}</span>
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-ink-2">{TYPES[j.type]}</span>
          {dentist && <span className="rounded-full bg-[#1d1d1f] px-2.5 py-1 text-white">{j.specialization ?? j.qualification}</span>}
          <span className="rounded-full bg-[var(--background)] px-2.5 py-1 text-ink-2">{j.min_years ? `${j.min_years}+ years` : "Freshers welcome"}</span>
        </span>
        <span className="mt-auto flex items-end justify-between gap-3 pt-1">
          <span className="text-[15px] font-bold text-ink">{pay(j)}</span>
          <span className="text-[12px] text-ink-3">{postedAgo(j.posted_at)}</span>
        </span>
      </span>
    </Link>
  );
}
