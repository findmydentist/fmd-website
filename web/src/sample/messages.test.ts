import assert from "node:assert/strict";
import { test } from "node:test";
import { toggleFollow } from "./content.ts";
import { bookFor, getThread, inbox, markRead, MessagesOff, openThread, sendMessage, setAcceptsStrangers, unreadCount, type Party } from "./messages.ts";
import type { Viewer } from "../lib/viewer.ts";

const patient = (id: string): Viewer => ({ id, name: "Priya Sharma", initials: "PS", kind: "patient", verifiedDentist: false, clinicId: null });
const dentistViewer = (id: string): Viewer => ({ id, name: "Dr. Karthik Iyer", initials: "KI", kind: "dentist", verifiedDentist: true, clinicId: null });
const dr: Party = { id: "rohan-mehta", name: "Dr. Rohan Mehta", avatar: null, kind: "dentist", verified: true };

test("opening the same chat twice reuses it", async () => {
  const v = patient("m1");
  const a = await openThread(v, dr);
  const b = await openThread(v, dr);
  assert.equal(a.id, b.id);
  const job = await openThread(v, dr, { jobId: "j1" });
  assert.notEqual(job.id, a.id);
  assert.equal(job.context, "job");
  assert.equal(job.jobId, "j1");
  assert.equal((await openThread(v, dr, { jobId: "j1" })).id, job.id);
});

test("patient to dentist chats carry the clinical note", async () => {
  assert.equal((await openThread(patient("m2"), dr)).clinicalNote, true);
  assert.equal((await openThread(dentistViewer("m3"), dr)).clinicalNote, false);
  const clinic: Party = { id: "smile-studio", name: "Smile Studio", avatar: null, kind: "clinic", verified: true };
  assert.equal((await openThread(patient("m2"), clinic)).clinicalNote, true);
});

test("messages off for strangers", async () => {
  const quiet: Party = { id: "farah-khan", name: "Dr. Farah Khan", avatar: null, kind: "dentist", verified: true };
  await setAcceptsStrangers(quiet.id, false);
  await assert.rejects(openThread(patient("m4"), quiet), MessagesOff);
  await toggleFollow("m5", quiet.id); // people they follow back aren't strangers: here the viewer follows them
  await assert.rejects(openThread(patient("m5"), quiet), MessagesOff, "following them isn't enough");
  await setAcceptsStrangers(quiet.id, true);
  assert.ok((await openThread(patient("m4"), quiet)).id);
});

test("sending and unread", async () => {
  const v = patient("m6");
  const t = await openThread(v, dr);
  const msg = await sendMessage(v.id, t.id, "  hi  ");
  assert.equal(msg.body, "hi");
  await assert.rejects(sendMessage(v.id, t.id, "   "), /Write a message/);
  await assert.rejects(sendMessage(v.id, t.id, "x".repeat(2001)), /2000/);
  assert.ok(await sendMessage(v.id, t.id, "", { type: "post", postId: "p1" }));
  const other = await openThread(v, { id: "aditi-sharma", name: "Dr. Aditi Sharma", avatar: null, kind: "dentist", verified: true });
  await sendMessage(v.id, other.id, "newer");
  const box = await inbox(v.id);
  assert.equal(box[0].id, other.id, "newest first");
  assert.ok(unreadCount(box) >= 1, "the seeded demo chats arrive unread");
  for (const th of box) await markRead(v.id, th.id);
  assert.equal(unreadCount(await inbox(v.id)), 0);
});

test("a patient always sees the clinical note on clinician chats, however they first opened the inbox", async () => {
  await inbox("m9"); // first contact without knowing who they are (e.g. the Pass on sheet)
  const box = await inbox("m9", "patient");
  assert.equal(box.find((t) => t.with.id === "smile-studio")!.clinicalNote, true);
  assert.equal((await getThread("m9", "t-rohan-mehta", "patient"))!.clinicalNote, true);
  assert.equal((await inbox("m9", "dentist")).find((t) => t.with.id === "smile-studio")!.clinicalNote, false);
});

test("Book from a chat only goes where booking exists", () => {
  assert.equal(bookFor({ id: "rohan-mehta", name: "Dr. Rohan Mehta", avatar: null, kind: "dentist", verified: true }), "/book/rohan-mehta");
  assert.equal(bookFor({ id: "bjh", name: "Demo Pearl Dental", avatar: null, kind: "clinic", verified: true }), "/clinics/bjh");
  assert.equal(bookFor({ id: "smile-studio", name: "Smile Studio Dental", avatar: null, kind: "clinic", verified: true }), null);
  assert.equal(bookFor({ id: "fmd", name: "FMD", avatar: null, kind: "clinic", verified: true }), null);
  assert.equal(bookFor({ id: "cand-meera", name: "Dr. Meera Nair", avatar: null, kind: "dentist", verified: false }), null);
});
