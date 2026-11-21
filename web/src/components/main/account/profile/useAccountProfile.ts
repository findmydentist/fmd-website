"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireMe } from "@/lib/me";
import { getAccountType, type AccountType } from "@/sample/onboarding";
import { getDocument } from "@/sample/dentist";
import { feed, following, getPost, type Author, type FeedItem } from "@/sample/content";
import { getSaved } from "@/sample/saved";
import { useSeen, type Story } from "../../explore/Stories";
import { HIGHLIGHTS } from "./parts";

/**
 * Everything /account shows, for both layouts: who you are, your posts and saves, who you follow, and the two overlays
 * every layout opens (a highlight in the story viewer, the Following list). Null until the session is known.
 */
export function useAccountProfile() {
  const me = useRequireMe();
  // your own published posts (the videos are among them) and the posts you saved
  const [mine, setMine] = useState<FeedItem[] | null>(null);
  const [savedPosts, setSavedPosts] = useState<FeedItem[] | null>(null);
  const [savedDentists, setSavedDentists] = useState(0);
  // for the "Get verified" card: did they say they're a dentist, and have they sent their certificate?
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [certificate, setCertificate] = useState(false);
  const [follows, setFollows] = useState<Author[]>([]);
  const [showFollowing, setShowFollowing] = useState(false);
  const [watching, setWatching] = useState<{ list: Story[]; start: number } | null>(null);
  const [seen, markSeen] = useSeen();

  const userId = me?.id;
  // again after a like or save on one of them
  const loadPosts = useCallback(() => {
    if (!userId) return;
    getSaved(userId, "post")
      .then((ids) => Promise.all(ids.map((id) => getPost(userId, id))))
      .then((l) => setSavedPosts(l.filter((x): x is FeedItem => !!x)));
    feed(userId, "for_you").then((l) => setMine(l.filter((x) => x.author.id === `me-${userId}`)));
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    loadPosts();
    getSaved(userId, "dentist").then((l) => setSavedDentists(l.length));
    getAccountType(userId).then(setAccountType);
    getDocument(userId).then((d) => setCertificate(!!d));
    following(userId).then(setFollows);
  }, [userId, loadPosts]);

  if (!me) return null;
  const roleWords = [me.workspaces.some((w) => w.role === "owner") && "Clinic owner", (me.dentist_profile || accountType === "dentist") && "Dentist"].filter(Boolean);
  return {
    me,
    mine,
    savedPosts,
    savedDentists,
    accountType,
    certificate,
    follows,
    seen,
    loadPosts,
    /** "Endodontics · Clinic owner · Dentist", or what a patient is */
    headline: [me.dentist_profile?.specialisation, ...roleWords].filter(Boolean).join(" · ") || "Patient on FindMyDentist",
    clinic: me.workspaces[0],
    /** verified dentists can post */
    canPost: me.dentist_profile?.verification_status === "verified",
    openHighlight: (i: number) => setWatching({ list: HIGHLIGHTS.map((x) => ({ ...x, name: `${me.full_name} · ${x.name}` })), start: i }),
    openFollowing: () => setShowFollowing(true),
    // the overlays, drawn by AccountProfile
    watching,
    closeStory: () => setWatching(null),
    markSeen,
    showFollowing,
    closeFollowing: () => setShowFollowing(false),
  };
}

export type AccountView = NonNullable<ReturnType<typeof useAccountProfile>>;
/** which posts a layout shows */
export type Grid = "posts" | "reels" | "saved";
