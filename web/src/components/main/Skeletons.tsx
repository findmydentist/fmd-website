/** Loading skeletons shaped like the pages they stand in for, so nothing jumps when the content arrives. */

const sk = "fmd-sk";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ---------------- Explore ---------------- */

/** one post, as Explore shows it: author row, the square-cornered 4:3 picture, the action buttons, then the caption */
export function PostSkeleton() {
  return (
    <div className="grid gap-3 py-5 first:pt-0">
      <div className="flex items-center gap-3">
        <span className={`${sk} size-10 shrink-0 rounded-[30%]`} />
        <span className="grid flex-1 gap-1.5">
          <span className={`${sk} h-3.5 w-36 rounded`} />
          <span className={`${sk} h-3 w-52 max-w-full rounded`} />
        </span>
        <span className={`${sk} h-8 w-20 rounded-lg`} />
        <span className={`${sk} size-8 rounded-lg`} />
      </div>
      <span className={`${sk} aspect-[4/3] rounded-lg`} />
      <div className="flex items-center gap-2">
        <span className={`${sk} h-9 w-28 rounded-xl`} />
        <span className={`${sk} h-9 w-14 rounded-xl`} />
        <span className={`${sk} h-9 w-20 rounded-xl`} />
        <span className={`${sk} ml-auto size-9 rounded-xl`} />
      </div>
      <span className="-mt-1 grid gap-2 py-1">
        <span className={`${sk} h-3.5 w-full rounded`} />
        <span className={`${sk} h-3.5 w-[80%] rounded`} />
        <span className={`${sk} h-3 w-10 rounded`} />
      </span>
      <span className={`${sk} h-2.5 w-16 rounded`} />
    </div>
  );
}

/** posts, split by thin lines like the feed */
export function PostsSkeleton() {
  return (
    <div className="grid grid-cols-1 divide-y divide-line" aria-busy aria-label="Loading posts">
      <PostSkeleton />
      <PostSkeleton />
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
        <PostsSkeleton />
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

/* ---------------- profiles (dentist and your own) ---------------- */

/** the posts grid on a profile: square tiles, 3 across */
export function ProfilePostsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy aria-label="Loading posts" className="grid grid-cols-3 gap-1">
      {range(count).map((i) => (
        <span key={i} className={`${sk} aspect-square`} />
      ))}
    </div>
  );
}

/**
 * A whole profile, shaped like its layout: back link, cover, the photo over it, name, role pill, headline, the actions,
 * counts, bio, highlights, the tab bar, then the side column and posts. `own`: your profile (4 tabs, 6 highlights, no
 * back link); otherwise a dentist's (5 tabs, 3 treatments).
 */
export function ProfileSkeleton({ own = false }: { own?: boolean }) {
  return (
    <div aria-busy aria-label="Loading profile" className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-4">
      {!own && <span className={`${sk} h-5 w-28 rounded`} />}
      <div className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-2xl sm:border sm:border-line">
        <span className={`${sk} block h-[128px] sm:h-[220px]`} />
        <div className="px-4 pb-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            {/* the photo in its ring, over the cover */}
            <span className="relative z-10 -mt-14 block w-fit rounded-full bg-[var(--surface)] p-[6px] sm:-mt-20">
              <span className={`${sk} block size-[112px] rounded-full sm:size-[144px]`} />
            </span>
            <div className="grid min-w-0 flex-1 gap-2.5 sm:pb-1">
              <span className="flex items-center gap-3">
                <span className={`${sk} h-8 w-[min(70%,280px)] rounded-lg`} />
                <span className={`${sk} h-6 w-14 rounded-full`} />
              </span>
              <span className="flex items-center gap-2">
                <span className={`${sk} h-8 w-24 rounded-full`} />
                <span className={`${sk} h-4 w-28 rounded`} />
              </span>
              <span className={`${sk} h-4 w-[min(85%,260px)] rounded`} />
            </div>
            <div className="flex gap-2 sm:pb-1">
              <span className={`${sk} h-11 flex-1 rounded-xl sm:w-44 sm:flex-none`} />
              {!own && <span className={`${sk} h-11 flex-1 rounded-xl sm:w-28 sm:flex-none`} />}
              <span className={`${sk} size-11 shrink-0 rounded-xl`} />
            </div>
          </div>
          <div className="mt-5 flex gap-6 overflow-hidden">
            {(own ? [60, 84, 60, 112] : [64, 80, 72]).map((w, i) => (
              <span key={i} className={`${sk} h-4 rounded`} style={{ width: w }} />
            ))}
          </div>
          {/* a dentist's bio (your own profile has none up here) */}
          {!own && (
            <div className="mt-4 grid max-w-[68ch] gap-2">
              <span className={`${sk} h-3.5 w-full rounded`} />
              <span className={`${sk} h-3.5 w-[92%] rounded`} />
              <span className={`${sk} h-3.5 w-[60%] rounded`} />
            </div>
          )}
          <div className={`${own ? "mt-6" : "mt-5"} flex gap-4 overflow-hidden`}>
            {range(own ? 6 : 3).map((i) => (
              <span key={i} className="grid w-[76px] shrink-0 justify-items-center gap-1.5">
                <span className={`${sk} size-[72px] rounded-full`} />
                <span className={`${sk} h-3 w-14 rounded`} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* the tab bar: equal tabs, icon over label on phones; a row from tablets up */}
      <div className="-mx-4 grid grid-flow-col auto-cols-fr border-b border-line px-1 sm:mx-0 sm:flex sm:h-12 sm:items-center sm:gap-6 sm:rounded-xl sm:border sm:bg-[var(--surface)] sm:px-6">
        {range(own ? 4 : 5).map((i) => (
          <span key={i} className="grid h-14 justify-items-center content-center gap-1.5 sm:flex sm:h-auto sm:items-center sm:gap-2">
            <span className={`${sk} size-5 rounded sm:size-4`} />
            <span className={`${sk} h-2.5 w-11 rounded sm:h-3.5 sm:w-14`} />
          </span>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* the side column, on wide screens */}
        <div className="hidden gap-3 rounded-2xl border border-line bg-[var(--surface)] p-5 lg:grid">
          <span className={`${sk} h-5 w-36 rounded`} />
          <span className={`${sk} h-3.5 w-24 rounded`} />
          <div className="flex flex-wrap gap-2">
            {range(6).map((i) => (
              <span key={i} className={`${sk} h-10 w-[88px] rounded-lg`} />
            ))}
          </div>
          <span className={`${sk} mt-2 h-3.5 w-[80%] rounded`} />
          <span className={`${sk} h-3.5 w-[65%] rounded`} />
        </div>
        <ProfilePostsSkeleton />
      </div>
    </div>
  );
}
