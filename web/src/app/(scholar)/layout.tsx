import type { ReactNode } from "react";
import { ScholarShell } from "@/components/scholar/Shell";

/** FMD Scholar: its own app frame (study mode), sharing sign-in and membership with FMD Main. */
export default function ScholarLayout({ children }: { children: ReactNode }) {
  return <ScholarShell>{children}</ScholarShell>;
}
