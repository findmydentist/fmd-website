/**
 * Messages: one inbox for Explore and Jobs (direct chats, and chats about a job). Sample data until the backend has
 * it. Proposed API:
 *   GET  /me/threads → Thread[] (newest first) · GET /threads/{id}
 *   POST /threads {party_id, job_id?} → Thread (reuses an existing one) · POST /threads/{id}/messages {body, attachment?}
 *   POST /threads/{id}/read · PUT /me/messaging {accepts_strangers}
 * Rules: a patient talking to a dentist or clinic always sees "Not medical advice. Book a consultation for anything
 * clinical." A dentist or clinic can turn off messages from people they aren't already talking to.
 */
import type { Viewer, ViewerKind } from "../lib/viewer.ts";
import { bookHref, creatorById } from "./creators.ts";
import { read, write } from "./store.ts";

export type Party = { id: string; name: string; avatar: string | null; kind: "patient" | "dentist" | "clinic" | "student" | "company"; verified: boolean };
export type Attachment = { type: "post"; postId: string } | { type: "story"; storyId: string } | { type: "job"; jobId: string };
export type Message = { id: string; from: string; body: string; attachment?: Attachment; at: string; reaction?: string };
export type Thread = { id: string; with: Party; context: "direct" | "job"; jobId?: string; messages: Message[]; unread: number; clinicalNote: boolean; updated_at: string };

export class MessagesOff extends Error {
  constructor(name: string) {
    super(`${name} isn't taking messages from new people right now. You can book an appointment instead.`);
    this.name = "MessagesOff";
  }
}

export const CLINICAL_NOTE = "Not medical advice. Book a consultation for anything clinical.";
export const MAX_MESSAGE = 2000;

const hour = 3_600_000;
let last = 0;
/** Strictly increasing timestamps, so "newest first" holds even within one millisecond. */
const stamp = () => {
  last = Math.max(Date.now(), last + 1);
  return new Date(last).toISOString();
};
const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const key = (viewerId: string) => `fmd-demo:messages:${viewerId}`;
const threadId = (partyId: string, jobId?: string) => `t-${partyId}${jobId ? `--${jobId}` : ""}`;

const clinician = (p: Party) => p.kind === "dentist" || p.kind === "clinic";

/** Every viewer starts with a few chats so the inbox isn't empty in the demo. */
function seed(viewerId: string, patient: boolean): Thread[] {
  const now = Date.now();
  const at = (h: number) => new Date(now - h * hour).toISOString();
  const t = (party: Party, lines: [from: "them" | "me", body: string, h: number][], extra: Partial<Thread> = {}): Thread => {
    const messages = lines.map(([from, body, h], i) => ({ id: `${party.id}-seed-${i}`, from: from === "me" ? viewerId : party.id, body, at: at(h) }));
    const unread = messages.length && messages[messages.length - 1]!.from !== viewerId ? 1 : 0;
    return { id: threadId(party.id, extra.jobId), with: party, context: "direct", messages, unread, clinicalNote: patient && clinician(party), updated_at: messages[messages.length - 1]!.at, ...extra };
  };
  return [
    t({ id: "smile-studio", name: "Smile Studio Dental", avatar: null, kind: "clinic", verified: true }, [
      ["me", "Hi, do you have a Saturday slot for a cleaning?", 30],
      ["them", "Yes! 11:30 or 4:00 this Saturday. Shall we hold one for you?", 3],
    ]),
    t({ id: "rohan-mehta", name: "Dr. Rohan Mehta", avatar: null, kind: "dentist", verified: true }, [
      ["them", "Thanks for following! Ask me anything about aligners.", 26],
    ]),
    t({ id: "rhea-kapoor", name: "Rhea Kapoor", avatar: null, kind: "student", verified: false }, [
      ["me", "Loved your notes on root canals.", 50],
      ["them", "Thank you! More coming next week.", 48],
    ]),
    t({ id: "skt", name: "Demo Capital Dental", avatar: null, kind: "clinic", verified: true }, [
      ["them", "Thanks for your interest in the associate role. Are you free for a call on Monday?", 6],
    ], { context: "job", jobId: "job-locum-skt" }),
  ].filter((x) => !(viewerId === "demo-student" && x.with.id === "rhea-kapoor")); // the demo student is Rhea herself
}

function load(viewerId: string, patient = false): Thread[] {
  return read<Thread[]>(key(viewerId)) ?? seed(viewerId, patient);
}
const save = (viewerId: string, ts: Thread[]) => write(key(viewerId), ts);
const newestFirst = (ts: Thread[]) => [...ts].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

/** The note is worked out for whoever is looking, not stored: a patient sees it however they first opened chats. */
const withNote = (t: Thread, kind?: ViewerKind): Thread => (kind ? { ...t, clinicalNote: kind === "patient" && clinician(t.with) } : t);

export async function inbox(viewerId: string, kind?: ViewerKind): Promise<Thread[]> {
  return newestFirst(load(viewerId)).map((t) => withNote(t, kind));
}

export async function getThread(viewerId: string, id: string, kind?: ViewerKind): Promise<Thread | null> {
  const t = load(viewerId).find((x) => x.id === id);
  return t ? withNote(t, kind) : null;
}

/** Where "Book" goes from a chat: only to people and clinics that take bookings on FMD Main. */
export function bookFor(p: Party): string | null {
  const c = creatorById(p.id);
  return c ? bookHref(c) : null;
}

export async function acceptsStrangers(partyId: string): Promise<boolean> {
  return read<boolean>(`fmd-demo:accepts:${partyId}`) ?? true;
}

export async function setAcceptsStrangers(partyId: string, on: boolean): Promise<void> {
  write(`fmd-demo:accepts:${partyId}`, on);
}

/** The chat with this person (about this job, if given): the existing one, else a new empty one. */
export async function openThread(viewer: Viewer, withParty: Party, ctx: { jobId?: string } = {}): Promise<Thread> {
  const patient = viewer.kind === "patient";
  const ts = load(viewer.id, patient);
  const id = threadId(withParty.id, ctx.jobId);
  const found = ts.find((t) => t.id === id);
  if (found) return found;
  // "strangers" are people they aren't already talking to; an ongoing chat carries on
  if (!(await acceptsStrangers(withParty.id))) throw new MessagesOff(withParty.name);
  const t: Thread = {
    id,
    with: withParty,
    context: ctx.jobId ? "job" : "direct",
    ...(ctx.jobId ? { jobId: ctx.jobId } : {}),
    messages: [],
    unread: 0,
    clinicalNote: patient && clinician(withParty),
    updated_at: stamp(),
  };
  save(viewer.id, [...ts, t]);
  return t;
}

export async function sendMessage(viewerId: string, threadId: string, body: string, attachment?: Attachment): Promise<Message> {
  const text = body.trim();
  if (!text && !attachment) throw new Error("Write a message first.");
  if (text.length > MAX_MESSAGE) throw new Error(`Keep a message under ${MAX_MESSAGE} characters.`);
  const ts = load(viewerId);
  const t = ts.find((x) => x.id === threadId);
  if (!t) throw new Error("This chat doesn't exist any more.");
  const msg: Message = { id: newId("msg"), from: viewerId, body: text, ...(attachment ? { attachment } : {}), at: stamp() };
  save(viewerId, ts.map((x) => (x.id === threadId ? { ...x, messages: [...x.messages, msg], updated_at: msg.at } : x)));
  return msg;
}

export async function markRead(viewerId: string, threadId: string): Promise<void> {
  save(viewerId, load(viewerId).map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)));
}

export const unreadCount = (threads: Thread[]) => threads.reduce((n, t) => n + t.unread, 0);

/** A creator (sample/creators.ts) as someone you can chat with. FMD itself answers as a clinic would. */
export function partyOf(c: { id: string; name: string; kind: "dentist" | "clinic" | "student" | "fmd"; verified: boolean }): Party {
  return { id: c.id, name: c.name, avatar: null, kind: c.kind === "fmd" ? "clinic" : c.kind, verified: c.verified };
}
