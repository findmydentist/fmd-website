import type { Metadata } from "next";
import { Fresh } from "@/components/app/Fresh";
import { AccountSettings } from "@/components/main/account/Account";

export const metadata: Metadata = { title: "Settings · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Fresh>
      <AccountSettings />
    </Fresh>
  );
}
