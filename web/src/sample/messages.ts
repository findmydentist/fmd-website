/**
 * Explore direct messages: sample data until the backend has it. Each signed-in person starts with a few demo chats with
 * the demo dentists; what they send is kept in this browser (store.ts). Replies are canned, never clinical advice.
 * Proposed API: GET /me/threads · GET /threads/{id} · POST /threads/{id}/messages {body}
 */
import { read, write } from "./store.ts";

export type Message = { id: string; from: "me" | "them"; body: string; at: string };
export type Thread = { id: string; with: { id: string; name: string; specialty: string }; messages: Message[]; unread: boolean };

const min = 60_000;
const key = (userId: string) => `fmd-demo:messages:${userId}`;

function seed(now: number): Thread[] {
  const at = (m: number) => new Date(now - m * min).toISOString();
  const t = (id: string, name: string, specialty: string, unread: boolean, msgs: [Message["from"], string, number][]): Thread => ({
    id,
    with: { id, name, specialty },
    unread,
    messages: msgs.map(([from, body, ago], i) => ({ id: `${id}-${i}`, from, body, at: at(ago) })),
  });
  return [
    t("aditi-sharma", "Dr. Aditi Sharma", "General Dentist", true, [
      ["me", "Hi doctor, saw your flossing post. Are interdental brushes better than floss?", 190],
      ["them", "Both work well. Brushes are easier if your gaps are a bit wider; floss suits tight contacts. I can show you the right size at a visit.", 42],
    ]),
    t("rohan-mehta", "Dr. Rohan Mehta", "Orthodontist", false, [
      ["them", "Thanks for following! I post about braces and aligners every week.", 60 * 26],
      ["me", "Thank you, really helpful posts.", 60 * 25],
    ]),
    t("farah-khan", "Dr. Farah Khan", "Pediatric Dentist", false, [["them", "Happy to answer general questions about kids' teeth here.", 60 * 24 * 3]]),
  ];
}

export async function threads(userId: string, now = Date.now()): Promise<Thread[]> {
  const list = read<Thread[]>(key(userId)) ?? seed(now);
  return [...list].sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
}

export async function openThread(userId: string, id: string) {
  const list = await threads(userId);
  write(key(userId), list.map((t) => (t.id === id ? { ...t, unread: false } : t)));
}

/** Sends a message; the demo dentist answers once with a canned, non-clinical reply. */
export async function send(userId: string, id: string, body: string, now = Date.now()): Promise<Thread> {
  const text = body.trim();
  if (!text) throw new Error("Write a message first.");
  if (text.length > 1000) throw new Error("Keep it under 1,000 characters.");
  const list = await threads(userId, now);
  const t = list.find((x) => x.id === id);
  if (!t) throw new Error("This chat isn't available.");
  const iso = (ms: number) => new Date(ms).toISOString();
  const replied = t.messages.some((m) => m.from === "them" && m.id.endsWith("-auto"));
  const next: Thread = {
    ...t,
    unread: false,
    messages: [
      ...t.messages,
      { id: `${id}-${now}`, from: "me", body: text, at: iso(now) },
      ...(replied ? [] : [{ id: `${id}-${now}-auto`, from: "them" as const, body: "Thanks for your message! I'll reply soon. For anything about your own teeth, please book a visit so I can examine you. (Demo reply)", at: iso(now + 1000) }]),
    ],
  };
  write(key(userId), list.map((x) => (x.id === id ? next : x)));
  return next;
}
