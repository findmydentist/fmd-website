/** Loading skeletons shaped like the pages they stand in for, so nothing jumps when the content arrives. */

const sk = "fmd-sk";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ---------------- Explore ---------------- */

/** one post card: author row, a few lines of text, the 4:3 picture, the action buttons */
export function PostSkeleton() {
  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-[var(--surface)] p-4">
      <div className="flex items-center gap-3">
        <span className={`${sk} size-10 shrink-0 rounded-[30%]`} />
        <span className="grid flex-1 gap-1.5">
          <span className={`${sk} h-3.5 w-36 rounded`} />
          <span className={`${sk} h-3 w-52 max-w-full rounded`} />
        </span>
        <span className={`${sk} h-8 w-20 rounded-lg`} />
        <span className={`${sk} size-8 rounded-lg`} />
      </div>
      <span className="grid gap-2 py-1">
        <span className={`${sk} h-3.5 w-full rounded`} />
        <span className={`${sk} h-3.5 w-[92%] rounded`} />
        <span className={`${sk} h-3.5 w-[70%] rounded`} />
      </span>
      <span className={`${sk} aspect-[4/3] rounded-2xl`} />
      <div className="flex items-center gap-2">
        <span className={`${sk} h-9 w-28 rounded-xl`} />
        <span className={`${sk} h-9 w-14 rounded-xl`} />
        <span className={`${sk} h-9 w-20 rounded-xl`} />
        <span className={`${sk} ml-auto size-9 rounded-xl`} />
      </div>
    </div>
  );
}

/** the whole Explore page: rail, title, stories, posts, and the messages panel on wide screens */
export function ExploreSkeleton() {
  return (
    <div aria-busy aria-label="Loading Explore" className="mx-auto flex w-full max-w-[900px] items-start justify-center">
      {/* left rail */}
      <div className="fixed bottom-4 left-4 top-[92px] z-30 hidden w-[80px] flex-col items-center gap-4 rounded-3xl border border-line bg-[var(--surface)] py-4 xl:flex">
        <span className={`${sk} mb-2 size-9 rounded-xl`} />
        {range(6).map((i) => (
          <span key={i} className="grid justify-items-center gap-1.5">
            <span className={`${sk} h-8 w-12 rounded-xl`} />
            <span className={`${sk} h-2 w-9 rounded`} />
          </span>
        ))}
        <span className="mt-auto grid gap-4">
          {range(2).map((i) => (
            <span key={i} className="grid justify-items-center gap-1.5">
              <span className={`${sk} h-8 w-12 rounded-xl`} />
              <span className={`${sk} h-2 w-9 rounded`} />
            </span>
          ))}
        </span>
      </div>

      <div className="grid w-full max-w-[470px] grid-cols-1 gap-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className={`${sk} h-7 w-28 rounded-lg`} />
            <span className={`${sk} h-6 w-14 rounded-full`} />
          </span>
          <span className="flex gap-2">
            <span className={`${sk} h-9 w-24 rounded-full`} />
            <span className={`${sk} size-9 rounded-xl`} />
          </span>
        </div>
        {/* stories */}
        <div className="-mx-4 flex gap-3.5 overflow-hidden px-4 pb-1">
          {range(6).map((i) => (
            <span key={i} className="grid w-[74px] shrink-0 justify-items-center gap-2">
              <span className={`${sk} size-[72px] rounded-[30%]`} />
              <span className={`${sk} h-2.5 w-12 rounded`} />
            </span>
          ))}
        </div>
        <PostSkeleton />
        <PostSkeleton />
      </div>

      {/* messages panel, bottom right */}
      <div className="fixed bottom-6 right-6 z-30 hidden h-[calc(100dvh-140px)] max-h-[640px] w-[380px] flex-col gap-4 rounded-2xl border border-line bg-[var(--surface)] p-4 lg:flex">
        <div className="flex items-center justify-between">
          <span className="grid gap-1.5">
            <span className={`${sk} h-5 w-28 rounded`} />
            <span className={`${sk} h-3 w-36 rounded`} />
          </span>
          <span className="flex gap-2">
            {range(3).map((i) => (
              <span key={i} className={`${sk} size-7 rounded-lg`} />
            ))}
          </span>
        </div>
        <span className={`${sk} h-10 rounded-full`} />
        <span className="flex gap-2">
          <span className={`${sk} h-8 w-12 rounded-full`} />
          <span className={`${sk} h-8 w-20 rounded-full`} />
        </span>
        {range(3).map((i) => (
          <span key={i} className="flex items-center gap-3">
            <span className={`${sk} size-14 shrink-0 rounded-[30%]`} />
            <span className="grid flex-1 gap-1.5">
              <span className={`${sk} h-3.5 w-32 rounded`} />
              <span className={`${sk} h-3 w-full rounded`} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Find a dentist ---------------- */

/** one result card: the photo with its badges, name and verified pill, three lines, the services row */
export function DentistCardSkeleton() {
  return (
    <div className="grid gap-2.5 p-3">
      <div className={`${sk} relative aspect-[4/3] rounded-2xl`}>
        <span className="absolute left-2.5 top-2.5 h-5 w-11 rounded-md bg-white/[0.08]" />
        <span className="absolute bottom-2.5 left-2.5 h-6 w-48 max-w-[70%] rounded-md bg-white/[0.08]" />
        <span className="absolute bottom-2.5 right-2.5 h-6 w-11 rounded-md bg-white/[0.08]" />
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className={`${sk} h-5 w-40 rounded`} />
        <span className={`${sk} h-5 w-20 rounded-md`} />
      </div>
      <div className="flex justify-between gap-3">
        <span className={`${sk} h-3.5 w-44 rounded`} />
        <span className={`${sk} h-3.5 w-24 rounded`} />
      </div>
      <span className={`${sk} h-3.5 w-56 max-w-full rounded`} />
      <span className={`${sk} h-3.5 w-32 rounded`} />
      <div className="flex justify-between gap-3 border-t border-line pt-2.5">
        <span className={`${sk} h-3.5 w-48 rounded`} />
        <span className={`${sk} h-3.5 w-20 rounded`} />
      </div>
    </div>
  );
}

export function DentistCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-busy aria-label="Loading dentists">
      {range(count).map((i) => (
        <DentistCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** the whole Find a dentist page: treatments sidebar, title, search bar, tabs, filter chips, the results grid */
export function DentistSearchSkeleton() {
  return (
    <div aria-busy aria-label="Loading Find a dentist" className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-4">
        <span className="grid gap-2">
          <span className={`${sk} h-8 w-56 rounded-lg`} />
          <span className={`${sk} h-4 w-[min(100%,560px)] rounded`} />
        </span>
        <span className={`${sk} h-14 rounded-2xl`} />
      </div>
      <div className="flex gap-6 border-b border-line pb-3 sm:gap-10">
        {[112, 150, 110].map((w) => (
          <span key={w} className="flex items-center gap-3">
            <span className={`${sk} size-12 rounded-full sm:size-14`} />
            <span className={`${sk} hidden h-5 rounded sm:block`} style={{ width: w }} />
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 min-[115rem]:grid-cols-[minmax(0,1fr)]">
        {/* treatments: a row of circles on small screens, a list on the left on desktop */}
        <div className="grid gap-3 min-[115rem]:fixed min-[115rem]:left-5 min-[115rem]:top-[92px] min-[115rem]:w-[250px]">
          <span className={`${sk} h-6 w-44 rounded`} />
          <div className="flex gap-3 overflow-hidden lg:flex-col lg:gap-2.5">
            {range(9).map((i) => (
              <span key={i} className="grid shrink-0 justify-items-center gap-2 lg:flex lg:items-center lg:gap-3 lg:px-2">
                <span className={`${sk} size-[76px] rounded-full sm:size-36 lg:size-11`} />
                <span className={`${sk} h-3.5 w-16 rounded lg:w-32`} />
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <div className="flex gap-2 overflow-hidden">
            {[84, 96, 112, 120, 96, 100, 104, 96].map((w, i) => (
              <span key={i} className={`${sk} h-9 shrink-0 rounded-lg`} style={{ width: w }} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span className={`${sk} h-7 w-32 rounded-lg`} />
            <span className={`${sk} h-4 w-20 rounded`} />
          </div>
          <DentistCardsSkeleton />
        </div>
      </div>
    </div>
  );
}
