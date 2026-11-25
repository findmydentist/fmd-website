/**
 * Moments (FMD's stories): short portrait updates that stay on the rail for a day, then live on in a creator's
 * highlights. Sample data until the backend has it. Proposed API:
 *   GET /moments/rail → StoryRing[] · POST /moments/{id}/seen · POST /moments {media_id, caption?} · GET /moments/{id}
 * Rules: only creators (dentists, clinics, students) post moments; seen state is per person.
 */
import { CREATORS, creatorById, type Creator } from "./creators.ts";
import { following } from "./content.ts";
import { media, type Media } from "./media.ts";
import { read, write } from "./store.ts";

export type StoryItem = { id: string; creatorId: string; media: Media; at: string; caption?: string; link?: { label: string; href: string } };
export type StoryRing = { creator: Creator; items: StoryItem[]; seen: boolean };

const hour = 3_600_000;
const DAY = 24 * hour;

type Seed = [id: string, creatorId: string, mediaKey: string, hoursAgo: number, caption?: string, link?: StoryItem["link"]];
const SEEDS: Seed[] = [
  ["s-rohan-1", "rohan-mehta", "moment-smile-1", 2, "Retainer check day. Nine months well spent.", { label: "Book Dr. Rohan", href: "/book/rohan-mehta" }],
  ["s-rohan-2", "rohan-mehta", "moment-teeth-closeup", 1, "The detail we look for at every check."],
  ["s-smile-1", "smile-studio", "moment-lab-desk", 4, "Same-day slots open this Saturday."],
  ["s-sneha-1", "sneha-iyer", "moment-implant-surgery", 5, "Implant day: planned in 3D before we begin."],
  ["s-farah-1", "farah-khan", "moment-kid-checkup", 7, "First visit done. Brave as anything.", { label: "Book Dr. Farah", href: "/book/farah-khan" }],
  ["s-rhea-1", "rhea-kapoor", "moment-students-group", 9, "Last day of postings!"],
  ["s-aditi-1", "aditi-sharma", "moment-teeth-closeup", 12, "Floss before you brush. Fight me."],
  ["s-kavya-1", "kavya-reddy", "moment-smile-2", 20, "Bonding, one visit, no drilling."],
  ["s-aditi-2", "aditi-sharma", "moment-kid-checkup", 30, "Little patients, big smiles."],
  ["s-pearl-1", "bjh", "moment-smile-3", 26, "Whitening week at Pearl Dental."],
];

function seeded(now: number): StoryItem[] {
  return SEEDS.map(([id, creatorId, key, h, caption, link]) => ({ id, creatorId, media: media(key), at: new Date(now - h * hour).toISOString(), ...(caption ? { caption } : {}), ...(link ? { link } : {}) }));
}

const seenKey = (v: string) => `fmd-demo:moments-seen:${v}`;
const addedKey = (v: string) => `fmd-demo:moments-added:${v}`;
const seenBy = (v: string | null) => (v ? (read<string[]>(seenKey(v)) ?? []) : []);
const added = (v: string | null) => (v ? (read<StoryItem[]>(addedKey(v)) ?? []) : []);

/** Any moment by id (for highlights, which outlive the rail). */
export function storyById(id: string, now = Date.now()): StoryItem | undefined {
  return seeded(now).find((s) => s.id === id);
}

/** Today's moments by creator: unseen rings first, then seen; within each, people you follow first, newest next. */
export async function storyRail(viewerId: string | null, now = Date.now()): Promise<StoryRing[]> {
  const seen = new Set(seenBy(viewerId));
  const follows = new Set(viewerId ? (await following(viewerId)).map((a) => a.id) : []);
  const live = [...seeded(now), ...added(viewerId)].filter((s) => now - Date.parse(s.at) < DAY);
  const rings: StoryRing[] = [];
  for (const creator of CREATORS) {
    const items = live.filter((s) => s.creatorId === creator.id).sort((a, b) => a.at.localeCompare(b.at));
    if (items.length) rings.push({ creator, items, seen: !!viewerId && items.every((s) => seen.has(s.id)) });
  }
  const latest = (r: StoryRing) => r.items[r.items.length - 1]!.at;
  return rings.sort((a, b) => Number(a.seen) - Number(b.seen) || Number(follows.has(b.creator.id)) - Number(follows.has(a.creator.id)) || latest(b).localeCompare(latest(a)));
}

export async function markStorySeen(viewerId: string, storyId: string): Promise<void> {
  if (!viewerId) throw new Error("Log in to keep track of moments you've seen.");
  const seen = seenBy(viewerId);
  if (!seen.includes(storyId)) write(seenKey(viewerId), [...seen, storyId]);
}

/** A creator shares a moment (sample: picked from the media library instead of uploaded). */
export async function addStory(viewerId: string, creatorId: string, mediaKey: string, caption?: string): Promise<StoryItem> {
  if (!creatorById(creatorId)) throw new Error("Only creators can share moments.");
  const s: StoryItem = { id: `s-${Math.random().toString(36).slice(2, 10)}`, creatorId, media: media(mediaKey), at: new Date().toISOString(), ...(caption?.trim() ? { caption: caption.trim() } : {}) };
  write(addedKey(viewerId), [...added(viewerId), s]);
  return s;
}
