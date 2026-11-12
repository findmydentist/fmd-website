"use client";

import { ArrowLeft, BadgeCheck, Bookmark, Briefcase, Lock, Plus, Stethoscope, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, ButtonLink, Chips, IconButton, Panel, Tag, type Tone } from "@/components/app/kit";
import { Field, fieldCls } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { SPECIALTIES, TOPICS } from "@/lib/catalog";
import { when } from "@/lib/format";
import { useRequireMe } from "@/lib/me";
import { following as listFollowing, myPosts, saveDraft, DEID_CHECKS, deleteDraft, importPreview, newDraft, toggleFollow, feed, type Author, type Draft, type DraftStatus, type FeedItem, type Kind } from "@/sample/content";
import { getSaved } from "@/sample/saved";
import { cardsFor, photoOf, type ProviderCard } from "@/sample/providers";
import { initials } from "@/lib/fmd";
import { cardsForJobs, type Job } from "@/sample/jobs";
import { JobCard } from "../jobs/Jobs";
import { coverOf, PostCard, Ring, Section } from "./Explore";
import { PostGrid } from "../dentists/Profile";

const KINDS: [Kind, string][] = [
  ["article", "Article"],
  ["image", "Image"],
  ["video", "Video"],
  ["poll", "Poll"],
];
export const POST_STATUS: Record<DraftStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "muted" },
  in_review: { label: "In review", tone: "accent" },
  scheduled: { label: "Scheduled", tone: "accent" },
  published: { label: "Published", tone: "ok" },
  rejected: { label: "Not approved", tone: "bad" },
};

function Back() {
  return (
    <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
      <ArrowLeft className="size-4" strokeWidth={1.5} /> Explore
    </Link>
  );
}

/* ---------------- /explore/new ---------------- */

export function NewPostPage() {
  const me = useRequireMe();
  const router = useRouter();
  const [d, setD] = useState<Draft>(newDraft);
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (me.dentist_profile?.verification_status !== "verified")
    return (
      <div className="mx-auto grid w-full max-w-[720px] gap-5">
        <Back />
        <Panel className="grid justify-items-start gap-3 p-6">
          <h1 className="text-[19px] font-medium text-ink">Posting is for verified dentists</h1>
          <p className="text-[14.5px] text-ink-2">Once FMD has checked your registration, you can share posts in Explore. Company posts open once FMD verifies the company.</p>
          <ButtonLink href="/account/dentist">Your dentist profile</ButtonLink>
        </Panel>
      </div>
    );

  const edit = (patch: Partial<Draft>) => (setErr(null), setD((x) => ({ ...x, ...patch })));
  const doImport = () => {
    const r = importPreview(link);
    if ("error" in r) return setErr(r.error);
    edit({ source: { platform: r.platform, url: r.url, credit: "" }, media: null });
  };
  const go = async (submit: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await saveDraft(me.id, d, submit);
      router.push("/explore/mine");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const previewItem: FeedItem = {
    id: d.id,
    kind: d.kind,
    topic: d.topic,
    title: d.title || "Your title",
    body: d.body || "Your text",
    author: { id: me.id, name: "You (preview)", specialty: me.dentist_profile.specialisation ?? "", verified: true, kind: "dentist" },
    published_at: new Date(0).toISOString(),
    ...(d.kind === "poll" ? { poll: d.poll.filter((o) => o.trim()) } : {}),
    ...(d.source ? { source: d.source } : {}),
    is_case: d.is_case,
    likes: 0,
    demo: true,
    reason: "",
    liked: false,
    saved: false,
    following: false,
    votes: null,
    myVote: null,
    comments: 0,
  };

  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-5">
      <Back />
      <div>
        <h1 className="text-[24px] font-medium text-ink">Create a post</h1>
        <p className="mt-1 text-[14.5px] text-ink-3">FMD&apos;s team reviews every post before it&apos;s published. Keep it educational: no guarantees, no prices that pressure people.</p>
      </div>

      <Section title="1. What kind of post?">
        <div role="radiogroup" aria-label="Post type" className="flex flex-wrap gap-2">
          {KINDS.map(([k, label]) => (
            <label
              key={k}
              className={`cursor-pointer rounded-full border px-4 py-2 text-[14px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--accent)] ${d.kind === k ? "border-[var(--accent)] bg-[var(--accent-soft)] text-ink" : "border-line text-ink-2"}`}
            >
              <input type="radio" name="kind" className="sr-only" checked={d.kind === k} onChange={() => edit({ kind: k })} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {(d.kind === "image" || d.kind === "video") && (
        <Section title="2. The image or video">
          <label className="w-fit cursor-pointer rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-line-strong has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--accent)]">
            {d.media ? `Replace ${d.media.name}` : `Upload ${d.kind === "image" ? "an image" : "a video"}`}
            <input
              type="file"
              accept={d.kind === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/webm"}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) edit({ media: { name: f.name, type: f.type, alt: "", captions: null }, source: null });
              }}
            />
          </label>
          {d.media && d.kind === "image" && (
            <Field label="Describe the image (alt text)" hint="For people who use screen readers. Required.">
              <input className={fieldCls} value={d.media.alt} onChange={(e) => edit({ media: { ...d.media!, alt: e.target.value } })} maxLength={200} />
            </Field>
          )}
          {d.media && d.kind === "video" && (
            <label className="w-fit cursor-pointer rounded-full border border-line px-4 py-2 text-[13.5px] text-ink-2 hover:border-line-strong">
              {d.media.captions ? `Captions: ${d.media.captions}` : "Add captions (.vtt or .srt), recommended"}
              <input type="file" accept=".vtt,.srt" className="sr-only" onChange={(e) => e.target.files?.[0] && edit({ media: { ...d.media!, captions: e.target.files[0].name } })} />
            </label>
          )}
          <p className="text-[13.5px] text-ink-3">Or link to your post on YouTube, Instagram or LinkedIn. FMD links to it and credits the creator; it doesn&apos;t copy it.</p>
          <div className="flex flex-wrap gap-2">
            <input className={`${fieldCls} min-w-0 flex-1`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/…" aria-label="Link to the original post" />
            <Button variant="secondary" onClick={doImport}>
              Link it
            </Button>
          </div>
          {d.source && (
            <div className="grid gap-2 rounded-2xl border border-line p-3">
              <p className="text-[13.5px] text-ink-2">
                Linking to {d.source.platform}: <span className="break-all">{d.source.url}</span>
              </p>
              <Field label="Creator to credit">
                <input className={fieldCls} value={d.source.credit} onChange={(e) => edit({ source: { ...d.source!, credit: e.target.value } })} maxLength={80} placeholder="e.g. Dr. Aditi Sharma" />
              </Field>
            </div>
          )}
        </Section>
      )}

      <Section title={`${d.kind === "image" || d.kind === "video" ? 3 : 2}. Words and tags`}>
        <Field label="Title">
          <input className={fieldCls} value={d.title} onChange={(e) => edit({ title: e.target.value })} maxLength={120} />
        </Field>
        <Field label="Text" hint={`${d.body.length}/2000`}>
          <textarea className={`${fieldCls} h-32 resize-y py-2.5`} value={d.body} onChange={(e) => edit({ body: e.target.value })} maxLength={2000} />
        </Field>
        {d.kind === "poll" && (
          <div className="grid gap-2">
            <p className="text-[13.5px] text-ink-3">Answers (2 to 4)</p>
            {d.poll.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input className={fieldCls} value={o} onChange={(e) => edit({ poll: d.poll.map((x, j) => (j === i ? e.target.value : x)) })} maxLength={60} aria-label={`Answer ${i + 1}`} />
                {d.poll.length > 2 && (
                  <IconButton label={`Remove answer ${i + 1}`} onClick={() => edit({ poll: d.poll.filter((_, j) => j !== i) })}>
                    <X className="size-4" strokeWidth={1.75} />
                  </IconButton>
                )}
              </div>
            ))}
            {d.poll.length < 4 && (
              <div>
                <Button variant="secondary" size="sm" onClick={() => edit({ poll: [...d.poll, ""] })}>
                  <Plus className="size-4" strokeWidth={1.75} /> Add an answer
                </Button>
              </div>
            )}
          </div>
        )}
        <Field label="Topic">
          <select className={fieldCls} value={d.topic} onChange={(e) => edit({ topic: e.target.value })}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Chips label="Specialties it's about (optional)" options={SPECIALTIES} value={d.tags} onChange={(tags) => edit({ tags })} />
      </Section>

      <Section title="Patient privacy">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-[14.5px] text-ink">Does this show a patient, or describe a real case?</legend>
          {[false, true].map((v) => (
            <label key={String(v)} className={`cursor-pointer rounded-full border px-4 py-2 text-[14px] ${d.is_case === v ? "border-[var(--accent)] bg-[var(--accent-soft)] text-ink" : "border-line text-ink-2"}`}>
              <input type="radio" name="case" className="sr-only" checked={d.is_case === v} onChange={() => edit({ is_case: v, ...(v ? {} : { consent: null, deidentified: [] }) })} />
              {v ? "Yes" : "No"}
            </label>
          ))}
        </fieldset>
        {d.is_case && (
          <div className="grid gap-3 rounded-2xl border border-line p-4">
            <p className="text-[14px] text-ink-2">A patient case needs the patient&apos;s written consent, and nothing that could identify them.</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-line-strong">
                {d.consent?.kind === "upload" ? `Consent form: ${d.consent.ref}` : "Upload the consent form"}
                <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => e.target.files?.[0] && edit({ consent: { kind: "upload", ref: e.target.files[0].name } })} />
              </label>
              <span className="text-[13px] text-ink-3">or</span>
              <input
                className={`${fieldCls} max-w-[260px]`}
                placeholder="Clinic consent record number"
                aria-label="Clinic consent record number"
                value={d.consent?.kind === "clinic_record" ? d.consent.ref : ""}
                onChange={(e) => edit({ consent: e.target.value.trim() ? { kind: "clinic_record", ref: e.target.value } : null })}
              />
            </div>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1 text-[13.5px] text-ink-3">Check each one</legend>
              {DEID_CHECKS.map((c) => (
                <label key={c} className="flex cursor-pointer items-start gap-2.5 text-[14px] text-ink">
                  <input type="checkbox" checked={d.deidentified.includes(c)} onChange={(e) => edit({ deidentified: e.target.checked ? [...d.deidentified, c] : d.deidentified.filter((x) => x !== c) })} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />
                  {c}
                </label>
              ))}
            </fieldset>
          </div>
        )}
        <label className="flex cursor-pointer items-start gap-2.5 text-[14px] text-ink">
          <input type="checkbox" checked={d.owns} onChange={(e) => edit({ owns: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />I made this, or have permission to share it, and it makes no promises about results.
        </label>
      </Section>

      <Section title="When">
        <Field label="Publish after review" hint="Leave empty to publish as soon as it's approved.">
          <input type="datetime-local" className={`${fieldCls} sm:max-w-[280px]`} value={d.publish_at?.slice(0, 16) ?? ""} onChange={(e) => edit({ publish_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </Field>
      </Section>

      {preview && <PostCard p={previewItem} userId={null} onChange={() => undefined} full />}
      {err && <Notice kind="error">{err}</Notice>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => go(true)} disabled={busy}>
          Send for review
        </Button>
        <Button variant="secondary" onClick={() => go(false)} disabled={busy}>
          Save draft
        </Button>
        <Button variant="secondary" onClick={() => setPreview((v) => !v)}>
          {preview ? "Hide preview" : "Preview"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- /explore/mine ---------------- */

export function MyPostsPage() {
  const me = useRequireMe();
  const [list, setList] = useState<Draft[] | null>(null);
  const userId = me?.id;
  useEffect(() => {
    if (!userId) return;
    const load = () => myPosts(userId).then(setList);
    load();
    const t = setInterval(load, 5000); // review finishes in the demo after a short wait
    return () => clearInterval(t);
  }, [userId]);
  if (!me || !list) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  return (
    <div className="mx-auto grid w-full max-w-[760px] gap-5">
      <Back />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[24px] font-medium text-ink">Your posts</h1>
        <ButtonLink href="/explore/new" size="sm">
          Create a post
        </ButtonLink>
      </div>
      <ul className="grid gap-3">
        {list.map((d) => (
          <li key={d.id}>
            <Panel className="grid gap-1.5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15.5px] font-medium text-ink">{d.title || "Untitled draft"}</p>
                <Tag tone={POST_STATUS[d.status].tone}>{POST_STATUS[d.status].label}</Tag>
              </div>
              <p className="text-[13px] text-ink-3">
                {d.kind} · {d.topic}
                {d.submitted_at && ` · sent ${when(Date.parse(d.submitted_at))}`}
                {d.status === "scheduled" && d.publish_at && ` · goes live ${when(Date.parse(d.publish_at))}`}
              </p>
              {d.reason && <p className="text-[14px] text-ink-2">Reason: {d.reason}</p>}
              {d.status === "in_review" && <p className="text-[13.5px] text-ink-3">FMD&apos;s team is checking it. (Demo: about 20 seconds.)</p>}
              {d.status === "published" && (
                <Link href={`/explore/${d.id}`} className="w-fit text-[14px] font-medium text-ink underline-offset-4 hover:underline">
                  View it in Explore
                </Link>
              )}
              {d.status === "draft" && (
                <button type="button" onClick={() => deleteDraft(me.id, d.id).then(() => myPosts(me.id).then(setList))} className="w-fit text-[13.5px] text-ink-3 hover:text-ink">
                  Delete draft
                </button>
              )}
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- /saved: Instagram's Saved, collections first ---------------- */

type SavedTab = "posts" | "dentists" | "jobs" | "following";

/** one square of a collection's 2×2 cover */
function Thumb({ photo, cover, children }: { photo?: string | null; cover?: string; children?: ReactNode }) {
  return (
    <span className={`relative grid place-items-center overflow-hidden bg-gradient-to-br ${cover ?? "from-white/[0.06] via-white/[0.03]"} to-[var(--surface-elevated)] text-ink-3`}>
      {photo ? <Image src={photo} alt="" fill sizes="120px" className="object-cover object-[center_20%]" /> : children}
    </span>
  );
}

export function SavedPage() {
  const me = useRequireMe();
  const [tab, setTab] = useState<SavedTab>("posts");
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [dentists, setDentists] = useState<ProviderCard[]>([]);
  const [follows, setFollows] = useState<Author[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const userId = me?.id;
  const load = useCallback(() => {
    if (!userId) return;
    Promise.all([getSaved(userId, "post"), getSaved(userId, "dentist").then((ids) => cardsFor(ids)), feed(userId, "for_you"), listFollowing(userId)]).then(([ps, ds, all, fs]) => {
      setPosts(all.filter((p) => ps.includes(p.id)));
      setDentists(ds);
      setFollows(fs);
    });
    getSaved(userId, "job").then((ids) => cardsForJobs(userId, ids)).then(setJobs);
  }, [userId]);
  useEffect(load, [load]);
  if (!me) return <div className="app-panel h-48 animate-pulse" aria-busy />;

  // each collection: its name, count and four squares for its cover
  const empty = (n: number) => Array.from({ length: Math.max(0, 4 - n) }, (_, i) => <Thumb key={`e${i}`} />);
  const collections: [SavedTab, string, number, ReactNode[]][] = [
    [
      "posts",
      "Posts",
      posts.length,
      [
        ...posts.slice(0, 4).map((p) => (
          <Thumb key={p.id} cover={coverOf(p.topic)}>
            <span className="line-clamp-3 px-1.5 text-center text-[9.5px] font-semibold leading-tight text-ink">{p.title}</span>
          </Thumb>
        )),
        ...empty(posts.length),
      ],
    ],
    ["dentists", "Dentists", dentists.length, [...dentists.slice(0, 4).map((d) => <Thumb key={d.id} photo={d.photo || null} />), ...empty(dentists.length)]],
    [
      "jobs",
      "Jobs",
      jobs.length,
      [
        ...jobs.slice(0, 4).map((j) => (
          <Thumb key={j.id} cover={coverOf(j.title)}>
            <Briefcase className="size-5 text-ink-2" strokeWidth={1.5} />
          </Thumb>
        )),
        ...empty(jobs.length),
      ],
    ],
    ["following", "Following", follows.length, [...follows.slice(0, 4).map((a) => <Thumb key={a.id} photo={photoOf(a.id)} />), ...empty(follows.length)]],
  ];

  return (
    <div className="mx-auto grid w-full max-w-[935px] gap-6">
      <div className="flex items-center gap-2">
        <Link href="/account" aria-label="Back to your profile" title="Your profile" className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="flex items-center gap-3 text-[22px] font-semibold text-ink">
          Saved <Tag tone="muted">Demo</Tag>
        </h1>
      </div>
      <p className="-mt-3 flex items-center gap-1.5 text-[13.5px] text-ink-3">
        <Lock className="size-3.5" strokeWidth={1.75} /> Only you can see what you&apos;ve saved.
      </p>

      {/* collections, each a 2×2 cover */}
      <div role="tablist" aria-label="Saved" className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {collections.map(([t, label, n, squares]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="group grid gap-2 text-left">
            <span
              className={`grid aspect-square grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-xl bg-[var(--border)] transition-[box-shadow,transform] duration-300 group-hover:-translate-y-0.5 ${
                tab === t ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-[var(--background)]" : ""
              }`}
            >
              {squares}
            </span>
            <span className="flex items-baseline justify-between gap-2 px-0.5">
              <span className={`text-[15px] font-semibold ${tab === t ? "text-ink" : "text-ink-2"}`}>{label}</span>
              <span className="text-[13px] text-ink-3">{n}</span>
            </span>
          </button>
        ))}
      </div>

      <div key={tab} role="tabpanel" className="fmd-enter grid gap-4 border-t border-line pt-5">
        {tab === "posts" &&
          (posts.length ? (
            <PostGrid posts={posts} />
          ) : (
            <Empty icon={Bookmark} title="Save posts" text="Posts you save in Explore appear here." href="/explore" cta="Go to Explore" />
          ))}

        {tab === "dentists" &&
          (dentists.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {dentists.map((d) => (
                <li key={d.id}>
                  <Link href={`/dentists/${d.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-[var(--surface-elevated)]">
                    {d.photo ? (
                      <Image src={d.photo} alt={`${d.name} (demo profile)`} fill sizes="(min-width: 640px) 300px, 50vw" className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <span className="grid size-full place-items-center text-[32px] font-light text-ink-3">{d.name.replace(/^Dr\.?\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 grid gap-0.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-10 text-white">
                      <span className="flex items-center gap-1 truncate text-[14.5px] font-semibold">
                        {d.name}
                        {d.verification.status === "verified" && <BadgeCheck className="size-4 shrink-0 text-sky-400" strokeWidth={2} aria-label="Verified" />}
                      </span>
                      <span className="truncate text-[12.5px] text-white/80">
                        {d.specialty} · {d.clinic.area}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Stethoscope} title="Save dentists" text="Dentists you save from their profiles appear here." href="/dentists" cta="Find a dentist" />
          ))}

        {tab === "jobs" &&
          (jobs.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {jobs.map((j) => (
                <li key={j.id}>
                  <JobCard j={j} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Briefcase} title="Save jobs" text="Jobs you save appear here." href="/jobs" cta="Dental jobs" />
          ))}

        {tab === "following" &&
          (follows.length ? (
            <ul className="mx-auto grid w-full max-w-[560px] gap-1">
              {follows.map((a) => {
                const photo = photoOf(a.id);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--surface-glass)]">
                    <Link href={`/dentists/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Ring>
                        {photo ? (
                          <span className="relative block size-11 overflow-hidden rounded-full">
                            <Image src={photo} alt="" fill sizes="44px" className="object-cover object-[center_20%]" />
                          </span>
                        ) : (
                          <span className="grid size-11 place-items-center rounded-full bg-[var(--surface-elevated)] text-[13px] font-semibold text-ink">{initials(a.name)}</span>
                        )}
                      </Ring>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[14.5px] font-semibold text-ink">{a.name}</span>
                        <span className="block truncate text-[13px] text-ink-3">{a.specialty}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFollow(me.id, a.id).then(load)}
                      aria-label={`Unfollow ${a.name}`}
                      className="group/btn h-9 rounded-lg bg-white/[0.08] px-4 text-[13.5px] font-semibold text-ink hover:bg-white/[0.12]"
                    >
                      <span className="group-hover/btn:hidden">Following</span>
                      <span className="hidden group-hover/btn:inline">Unfollow</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={UserRound} title="Follow dentists" text="Follow dentists from their posts in Explore." href="/explore" cta="Go to Explore" />
          ))}
      </div>
    </div>
  );
}

/** an empty collection, Instagram style: a big outlined icon, a heading, a line, a link */
function Empty({ icon: Icon, title, text, href, cta }: { icon: LucideIcon; title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="grid justify-items-center gap-3 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-full border-2 border-ink text-ink">
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
      <p className="text-[20px] font-semibold text-ink">{title}</p>
      <p className="max-w-[36ch] text-[14px] text-ink-3">{text}</p>
      {href && cta && (
        <Link href={href} className="text-[14px] font-semibold text-sky-400 hover:text-sky-300">
          {cta}
        </Link>
      )}
    </div>
  );
}
