"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { LEVELS, TOPICS, topicById, type Level } from "@/sample/scholar/topics";
import { answerViva, clock, endViva, followUpText, rateViva, skipViva, startViva, timings, type VivaConfig, type VivaState, type VivaStyle } from "@/sample/scholar/viva";
import { getItem, listItems, updateItem, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { AiNote, ItemRows, PageHead, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const STYLES: { id: VivaStyle; label: string }[] = [
  { id: "gentle", label: "Gentle" },
  { id: "standard", label: "Standard" },
  { id: "strict", label: "Strict" },
];
const selectCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";

/* the browser's own speech recognition, as FMD AI uses it (components/main/assistant/Chat.tsx); nothing goes to FMD */
type Recognition = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const speechApi = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** The browser's own text-to-speech for the examiner's voice: an Indian English voice when there is one. */
const canSpeakAloud = () => typeof window !== "undefined" && "speechSynthesis" in window;
function sayAloud(text: string, onEnd?: () => void) {
  if (!canSpeakAloud()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[“”]/g, ""));
  const voices = synth.getVoices();
  const voice = voices.find((x) => x.lang === "en-IN") ?? voices.find((x) => x.lang === "en-GB") ?? voices.find((x) => x.lang.startsWith("en"));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-IN";
  u.rate = 0.95;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

/** /scholar/viva: set up a practice viva, and past sessions. */
export function VivaSetup() {
  const s = useScholar();
  const router = useRouter();
  const [cfg, setCfg] = useState<VivaConfig>({ topic_id: TOPICS[0].id, level: "ug", count: 5, style: "standard", spoken: false });
  const [past, setPast] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) listItems(userId, { kind: "viva" }).then(setPast);
  }, [userId]);
  if (!s) return null;
  const start = async () => {
    setBusy(true);
    setErr(null);
    try {
      const it = await startViva(s.me.id, cfg);
      s.refresh();
      reportUse("viva");
      router.push(`/scholar/viva/${it.id}`);
    } catch (e) {
      reportFailure("viva", e);
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto grid max-w-[900px] gap-10">
      <PageHead meta="Viva practice" title="Practise a viva" lede="One examiner question at a time, a follow-up on your answer, then model answer outlines to compare with. Practice only: this isn't an assessment." />
      <ReadOnly>
        <form
          className="grid max-w-[520px] gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <label className="grid gap-1.5 text-[14px] text-ink-2">
            Topic
            <select value={cfg.topic_id} onChange={(e) => setCfg({ ...cfg, topic_id: e.target.value })} className={selectCls}>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · {t.subject}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Level
              <select value={cfg.level} onChange={(e) => setCfg({ ...cfg, level: e.target.value as Level })} className={selectCls}>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Questions
              <select value={cfg.count} onChange={(e) => setCfg({ ...cfg, count: Number(e.target.value) as 3 | 5 | 10 })} className={selectCls}>
                {[3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-[14px] text-ink-2">Examiner</legend>
            <div className="flex gap-1.5">
              {STYLES.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={cfg.style === x.id}
                  onClick={() => setCfg({ ...cfg, style: x.id })}
                  className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${cfg.style === x.id ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </fieldset>
          {canSpeakAloud() && (
            <label className="flex items-start gap-2.5 text-[15px] text-ink-2">
              <input type="checkbox" checked={!!cfg.spoken} onChange={(e) => setCfg({ ...cfg, spoken: e.target.checked })} className="mt-1 size-4" />
              <span>
                Spoken viva
                <span className="block text-[13px] leading-relaxed text-ink-3">
                  The examiner reads each question aloud{speechApi() ? " and the microphone listens for your answer" : ""}, and every answer is timed. Speech is handled by your browser
                  {speechApi() ? " (Chrome may use Google's speech service)" : ""}; FMD doesn&apos;t receive the audio.
                </span>
              </span>
            </label>
          )}
          <div className="grid gap-2">
            <div>
              <Button type="submit" disabled={busy}>
                {busy ? "Starting…" : cfg.spoken ? "Start spoken viva" : "Start viva"}
              </Button>
            </div>
          </div>
          {err && <Notice kind="error">{err}</Notice>}
        </form>
      </ReadOnly>
      {past.length > 0 && (
        <section className="grid gap-2">
          <SectionLabel as="h2">Past sessions</SectionLabel>
          <ItemRows items={past} />
        </section>
      )}
    </div>
  );
}

/** /scholar/viva/[id]: the session, then the review. Saved after every step, so leaving keeps your place. */
export function VivaSession() {
  const s = useScholar();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item<VivaState> | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const prompt = useRef<HTMLParagraphElement>(null);
  const [voiceOn, setVoiceOn] = useState<boolean | null>(null); // null: as chosen at set-up
  const [promptAt, setPromptAt] = useState(() => Date.now()); // when the current question or follow-up appeared
  const [secs, setSecs] = useState(0);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) getItem<VivaState>(userId, id).then(setItem);
  }, [userId, id]);

  const Speech = speechApi();
  const listen = useCallback(() => {
    if (!Speech || rec.current) return;
    const r = new Speech();
    r.lang = "en-IN";
    r.interimResults = false;
    r.onresult = (e) => setText((t) => `${t} ${Array.from(e.results).map((x) => x[0].transcript).join(" ")}`.trim());
    const done = () => {
      rec.current = null;
      setListening(false);
    };
    r.onend = done;
    r.onerror = done;
    rec.current = r;
    setListening(true);
    r.start();
  }, [Speech]);

  const v0 = item?.data;
  const live = !!v0 && v0.phase !== "review";
  const examinerSays = v0 && live ? (v0.phase === "asking" ? v0.questions[v0.index].q : followUpText(v0.questions[v0.index], v0.config.style)) : "";
  const voice = voiceOn ?? !!v0?.config.spoken;
  const promptKey = v0 && live ? `${v0.index}-${v0.phase}` : "";
  // each new question or follow-up, in a spoken viva: read it aloud, then listen
  useEffect(() => {
    if (!promptKey) return;
    if (voice) sayAloud(examinerSays, listen);
    return () => {
      if (canSpeakAloud()) window.speechSynthesis.cancel();
    };
    // examinerSays changes only with promptKey; re-read on a new prompt, or when the voice is switched on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptKey, voice]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSecs(Math.floor((Date.now() - promptAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [live, promptAt]);
  useEffect(() => () => rec.current?.stop(), []);
  if (!s) return null;
  if (item === undefined) return <p className="text-[15px] text-ink-3">Loading…</p>;
  if (item === null) return <Notice kind="error">That viva session no longer exists.</Notice>;

  const v = item.data;
  const topic = topicById(v.config.topic_id)!;
  const q = v.questions[v.index];
  const save = (next: VivaState) => {
    setText("");
    rec.current?.stop();
    setPromptAt(() => Date.now());
    setSecs(0);
    updateItem<VivaState>(s.me.id, item.id, { data: next }).then((x) => {
      setItem(x);
      requestAnimationFrame(() => prompt.current?.focus());
    });
  };
  const speak = () => (listening ? rec.current?.stop() : listen());
  const timing = timings(v);

  if (v.phase === "review")
    return (
      <div className="mx-auto grid max-w-[900px] gap-8">
        <PageHead meta={`Viva review · ${STYLES.find((x) => x.id === v.config.style)!.label} examiner${v.config.spoken ? " · spoken" : ""}`} title={topic.title} lede="Compare your answers with the model outlines, and rate how you did on each.">
          {timing && (
            <p className="text-[14px] tabular-nums text-ink-3">
              {timing.count} timed {timing.count === 1 ? "answer" : "answers"} · average {clock(timing.average)} · longest {clock(timing.longest)}
            </p>
          )}
        </PageHead>
        {v.questions.map((qq, i) => {
          const a = v.answers[i];
          return (
            <section key={i} className="grid gap-3 border-t border-line pt-5">
              <h2 className="sch-serif text-[19px] font-semibold leading-snug text-ink">
                {i + 1}. {qq.q}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <SectionLabel>Your answer</SectionLabel>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{a.answer ?? <i className="text-ink-4">Skipped</i>}</p>
                  {a.followAnswer && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">Follow-up: {a.followAnswer}</p>}
                  {(typeof a.secs === "number" || typeof a.followSecs === "number") && (
                    <p className="mt-2 text-[12.5px] tabular-nums text-ink-4">
                      {[typeof a.secs === "number" ? `Answered in ${clock(a.secs)}` : null, typeof a.followSecs === "number" ? `follow-up in ${clock(a.followSecs)}` : null].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div>
                  <SectionLabel>Model answer outline</SectionLabel>
                  <ul className="sch-serif mt-1 grid list-disc gap-1 pl-5 text-[16px] text-ink-2">
                    {qq.outline.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <fieldset className="flex flex-wrap items-center gap-1.5">
                <legend className="sr-only">How did you do on question {i + 1}?</legend>
                <span className="mr-1 text-[13px] text-ink-3">How did you do?</span>
                {(["Needs work", "Getting there", "Confident"] as const).map((label, r) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={a.rating === r + 1}
                    onClick={() => save(rateViva(v, i, (r + 1) as 1 | 2 | 3))}
                    className={`rounded-full border px-3 py-1 text-[13px] ${a.rating === r + 1 ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            </section>
          );
        })}
        <AiNote />
        <div>
          <Link href="/scholar/viva" className="text-[14px] font-semibold text-[var(--accent)] hover:underline">
            Start another viva
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="grid gap-10 lg:grid-cols-[1fr_230px]">
        <div>
          <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            {topic.title} · Question {v.index + 1} of {v.questions.length}
          </p>
          <p ref={prompt} tabIndex={-1} aria-live="polite" className="sch-serif mb-6 text-[21px] leading-snug text-ink outline-none sm:text-[24px]">
            <span className="mb-2 block font-sans text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--accent)]">Examiner</span>
            {v.phase === "asking" ? q.q : `“${followUpText(q, v.config.style)}”`}
          </p>
          {canSpeakAloud() && (
            <div className="-mt-3 mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
              <button type="button" onClick={() => sayAloud(examinerSays, voice ? listen : undefined)} className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                <Volume2 className="size-4" strokeWidth={1.8} aria-hidden /> {voice ? "Repeat the question" : "Read it aloud"}
              </button>
              <label className="inline-flex items-center gap-2 text-ink-3">
                <input type="checkbox" checked={voice} onChange={(e) => setVoiceOn(e.target.checked)} className="size-4" />
                Examiner&apos;s voice
              </label>
            </div>
          )}
          {v.phase === "follow_up" && v.answers[v.index].answer && (
            <div className="mb-5 rounded-2xl border border-line bg-[var(--surface)] px-4 py-3 text-[15px] leading-relaxed text-ink-3">
              <span className="mb-1 block text-[12px] font-semibold text-ink-4">You said</span>
              {v.answers[v.index].answer}
            </div>
          )}
          <ReadOnly>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) save(answerViva(v, text, (Date.now() - promptAt) / 1000));
              }}
              className="grid gap-3"
            >
              <label htmlFor="viva-answer" className="sr-only">
                Your answer
              </label>
              <div className="flex items-center justify-between gap-3 text-[13px] text-ink-4">
                <span aria-live="polite">{listening ? <span className="font-semibold text-[var(--accent)]">Listening… speak your answer</span> : voice && Speech ? "Press Speak answer if the microphone stopped." : ""}</span>
                <span role="timer" aria-label="Time on this answer" className="tabular-nums">
                  {clock(secs)}
                </span>
              </div>
              <textarea id="viva-answer" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Answer as you would to the examiner…" className="w-full rounded-2xl border border-line bg-[var(--surface)] p-4 text-[15.5px] leading-relaxed text-ink outline-none placeholder:text-ink-4 focus:border-line-strong" />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!text.trim()}>
                  Answer
                </Button>
                {Speech && (
                  <Button variant="secondary" onClick={speak} aria-pressed={listening}>
                    {listening ? "Stop listening" : "Speak answer"}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => save(skipViva(v))}>
                  Skip
                </Button>
                <Button variant="secondary" onClick={() => save(endViva(v))}>
                  End and review
                </Button>
              </div>
            </form>
          </ReadOnly>
        </div>
        <aside className="grid content-start gap-2">
          <SectionLabel as="h2">Session</SectionLabel>
          <ol className="grid gap-1.5">
            {v.questions.map((qq, i) => (
              <li key={i} aria-current={i === v.index ? "step" : undefined} className={`text-[13.5px] ${i === v.index ? "font-bold text-ink" : i < v.index ? "text-ink-3" : "text-ink-4"}`}>
                <span className={i < v.index ? "text-[var(--accent)]" : i === v.index ? "text-[var(--accent)]" : ""}>{i < v.index ? "✓ " : i === v.index ? "● " : "○ "}</span>
                {qq.q.length > 42 ? `${qq.q.slice(0, 40)}…` : qq.q}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-4">Model outlines and your self-rating come at the end. Practice only: this isn&apos;t an assessment.</p>
        </aside>
      </div>
    </div>
  );
}
