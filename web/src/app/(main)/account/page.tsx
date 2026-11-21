import type { Metadata } from "next";
import { Fresh } from "@/components/app/Fresh";
import { AccountProfile } from "@/components/main/account/profile/AccountProfile";

export const metadata: Metadata = { title: "Account · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Fresh>
      <AccountProfile />
    </Fresh>
  );
}
