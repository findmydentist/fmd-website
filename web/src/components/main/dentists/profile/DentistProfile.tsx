"use client";

import { Back, NotFound } from "../common";
import { HybridLayout } from "./HybridLayout";
import { ClaimSheet } from "./parts";
import { useDentistProfile } from "./useDentistProfile";

/**
 * /dentists/[id]: a dentist's profile. The data comes from useDentistProfile; how it looks is HybridLayout.tsx.
 */
export function ProviderPage() {
  const v = useDentistProfile();
  if (v === "loading") return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (v === "missing") return <NotFound what="dentist" />;

  return (
    <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-4">
      <Back />
      <HybridLayout v={v} />
      {v.claiming && <ClaimSheet me={v.me} p={v.p} onClose={() => v.endClaim()} onDone={v.endClaim} />}
    </div>
  );
}
