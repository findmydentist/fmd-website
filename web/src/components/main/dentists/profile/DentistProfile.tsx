"use client";

import { LayoutPicker, useProfileLayout } from "../../ProfileLayout";
import { Back, NotFound } from "../common";
import { FbInstaLayout } from "./FbInstaLayout";
import { InstaLayout } from "./InstaLayout";
import { ClaimSheet } from "./parts";
import { useDentistProfile } from "./useDentistProfile";

/**
 * /dentists/[id]: a dentist's profile. The data comes from useDentistProfile; how it looks is one of two layouts,
 * picked from the dropdown (layout 1 InstaLayout.tsx, layout 2 FbInstaLayout.tsx).
 */
export function ProviderPage() {
  const v = useDentistProfile();
  const [layout, pickLayout] = useProfileLayout();
  if (v === "loading") return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (v === "missing") return <NotFound what="dentist" />;

  return (
    <div className={`mx-auto grid w-full grid-cols-1 gap-4 ${layout === "fbinsta" ? "max-w-[1128px]" : "max-w-[935px]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Back />
        <LayoutPicker value={layout} onChange={pickLayout} />
      </div>
      <div key={layout} className="fmd-enter">
        {layout === "insta" ? <InstaLayout v={v} /> : <FbInstaLayout v={v} />}
      </div>
      {v.claiming && <ClaimSheet me={v.me} p={v.p} onClose={() => v.endClaim()} onDone={v.endClaim} />}
    </div>
  );
}
