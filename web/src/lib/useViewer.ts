"use client";

import { useMemo } from "react";
import { useMe } from "./me";
import { useDemoUser } from "./useDemoUser";
import { fromDemo, fromMe, type Viewer } from "./viewer";

/** The signed-in person: the real account when there is one, else the preview person. undefined while loading. */
export function useViewer(): Viewer | null | undefined {
  const me = useMe();
  const { user } = useDemoUser();
  return useMemo(() => {
    if (me) return fromMe(me);
    if (user) return fromDemo(user);
    if (me === undefined || user === undefined) return undefined;
    return null;
  }, [me, user]);
}
