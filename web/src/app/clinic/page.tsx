"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChooseDemo } from "@/components/clinic/Shell";
import { useMe } from "@/lib/me";
import { useDemoUser } from "@/lib/useDemoUser";

/** FMD Clinic's entry: clinic people (by demo role, or by their account's own clinic) go straight to their clinic;
 *  anyone else picks a demo account first. */
export default function ClinicEntry() {
  const { user } = useDemoUser();
  const me = useMe();
  const router = useRouter();
  const clinicId = user?.clinicId ?? me?.workspaces[0]?.clinic_id;
  useEffect(() => {
    if (clinicId) router.replace(`/clinic/${clinicId}`);
  }, [clinicId, router]);
  if (user === undefined || me === undefined || clinicId) return <div className="min-h-dvh" aria-busy />;
  return <ChooseDemo next="/clinic" />;
}
