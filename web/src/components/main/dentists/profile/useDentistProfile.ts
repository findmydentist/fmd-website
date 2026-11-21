"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { useMe } from "@/lib/me";
import { getAvailability, getClaims, getProvider, type Availability, type Claim, type ProviderProfile } from "@/sample/providers";
import { getSaved, toggleSaved } from "@/sample/saved";
import { feed, following, toggleFollow, type FeedItem } from "@/sample/content";
import { dentistReviews } from "@/sample/reviews";
import type { ProfileTab } from "./parts";

/**
 * Everything /dentists/[id] shows, for both layouts: the dentist, their clinic and open times, their posts and
 * reviews, and what you can do (follow, save, book, claim). "loading" until it's here, "missing" for an unknown id.
 */
export function useDentistProfile() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const router = useRouter();
  const [p, setP] = useState<ProviderProfile | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [picked, setPicked] = useState<ProfileTab | null>(null);
  useEffect(() => {
    getProvider(id).then(setP);
    track("profile_viewed", { dentist_id: id });
    getAvailability(id).then(setAvail);
  }, [id]);
  const userId = me === undefined ? undefined : (me?.id ?? null);
  useEffect(() => {
    if (userId === undefined) return;
    feed(userId, "for_you").then((l) => setPosts(l.filter((x) => x.author.id === id)));
    dentistReviews(userId, id).then((r) => setReviewCount(r.count));
    if (!userId) return;
    getSaved(userId, "dentist").then((l) => setSaved(l.includes(id)));
    following(userId).then((l) => setFollowed(l.some((a) => a.id === id)));
    getClaims(userId).then((l) => setClaim(l.find((c) => c.provider_id === id) ?? null));
  }, [userId, id]);

  if (p === undefined || !avail) return "loading" as const;
  if (p === null) return "missing" as const;

  const signIn = () => router.push(`/login?next=${encodeURIComponent(`/dentists/${id}`)}`);
  const stats: [number | string, string][] = [
    [posts.length, posts.length === 1 ? "post" : "posts"],
    [reviewCount ?? "–", reviewCount === 1 ? "review" : "reviews"],
    ...(p.experienceYears ? [[p.experienceYears, "yrs exp."] as [number, string]] : []),
  ];
  return {
    me: me ?? null,
    p,
    avail,
    /** the dentist's clinic */
    c: p.clinicDetails,
    posts,
    /** again after a like or save on one of their posts */
    reload: () => userId !== undefined && feed(userId, "for_you").then((l) => setPosts(l.filter((x) => x.author.id === id))),
    /** posts · reviews · years of experience */
    stats,
    /** the open tab: Posts when they've posted, else Book & fees */
    tab: picked ?? (posts.length ? "posts" : "book"),
    pickTab: setPicked,
    saved,
    save: async () => (me ? setSaved(await toggleSaved(me.id, "dentist", id)) : signIn()),
    followed,
    follow: async () => (me ? setFollowed(await toggleFollow(me.id, id)) : signIn()),
    bookLabel: avail.mode === "live" ? "Book appointment" : "Request appointment",
    claim,
    // the claim sheet, drawn by DentistProfile
    claiming,
    startClaim: () => setClaiming(true),
    endClaim: (c?: Claim) => (c && setClaim(c), setClaiming(false)),
  };
}

export type DentistView = Exclude<ReturnType<typeof useDentistProfile>, "loading" | "missing">;
