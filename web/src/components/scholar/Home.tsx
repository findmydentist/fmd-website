"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Notice } from "@/components/Page";
import { answerQotd, examCountdown, getTicks, istDay, mistakes, qotdAttempts, qotdToday, questionOfTheDay, setTick, suggestions, syncPlanDay, todayPlan, topicMastery, weekActivity, type QotdAttempt, type Task } from "@/sample/scholar/learning";
import { dueCards, makeMistakeQuiz, missedDays, reschedulePlan, type PlanData } from "@/sample/scholar/study";
import { topicById, TOPICS } from "@/sample/scholar/topics";
import { ask, getPrefs, listItems, listProjects, updateItem, type Item, type Project } from "@/sample/scholar/workspace";
import { read, write } from "@/sample/store";
import { daysTo, NewProject } from "./Project";
import { useScholar } from "./Shell";
import { ItemRows, QuestionImage, SectionLabel } from "./ui";

const istHour = () => Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
const greeting = (h: number) => (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
const todayLong = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const dayName = (date: string, weekday: "short" | "long") => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday, timeZone: "UTC" });

/** A study-mode section: a hairline and a label, no box (spec: "separation by space and hairlines, few cards"). */
function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <SectionLabel as="h2">{title}</SectionLabel>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const quietLink = "text-[13px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline";
const primaryBtn = "inline-flex h-10 items-center rounded-full bg-[var(--button-primary)] px-5 text-[14px] font-semibold text-[var(--button-primary-fg)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]";
const secondaryBtn = "inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-[14px] font-semibold text-ink transition-colors duration-150 hover:bg-[var(--surface-glass)]";

/** One-time intro: what Scholar is, and isn't. Quiet, under the greeting, so the student's day still comes first. */
function Intro({ userId }: { userId: string }) {
  const k = `fmd-demo:scholar-intro:${userId}`;
  // Scholar pages render only in the browser (the shell waits for the student), so storage can be read here
  const [seen, setSeen] = useState(() => !!read<boolean>(k));
  if (seen) return null;
  const close = () => (write(k, true), setSeen(true));
  return (
    <section aria-labelledby="sch-intro" className="relative rounded-2xl border border-line bg-[var(--surface)] py-4 pl-5 pr-12">
      <h2 id="sch-intro" className="sch-serif text-[17px] font-semibold text-ink">
        Welcome to FMD Scholar
      </h2>
      <ul className="mt-2 grid list-disc gap-1 pl-5 text-[14px] leading-relaxed text-ink-2 marker:text-ink-4">
        <li>It explains, quizzes and drafts. It isn&apos;t a textbook, an examiner or a supervisor.</li>
        <li>Check every answer and reference against your textbooks, guidelines or faculty. Scholar marks anything it isn&apos;t sure of.</li>
        <li>It never makes up results, data or references, and it&apos;s for study, not advice about a real patient.</li>
      </ul>
      <button type="button" onClick={close} className={`mt-3 ${quietLink}`}>
        Got it
      </button>
      <button type="button" onClick={close} aria-label="Close the welcome note" className="absolute right-2 top-2 grid size-10 place-items-center rounded-full text-ink-3 hover:bg-[var(--surface-glass)] hover:text-ink">
        <X className="size-4" strokeWidth={1.8} aria-hidden />
      </button>
    </section>
  );
}

const TASKS: { id: Task; label: string; mins: number; href: (topic: string) => string }[] = [
  { id: "summary", label: "Read the summary", mins: 5, href: (t) => `/scholar/study/summary?topic=${t}` },
  { id: "flashcards", label: "Flashcards", mins: 8, href: (t) => `/scholar/study/flashcards?topic=${t}` },
  { id: "quiz", label: "Quick quiz, 5 questions", mins: 6, href: (t) => `/scholar/study/quiz?topic=${t}` },
  { id: "viva", label: "One viva question", mins: 5, href: () => `/scholar/viva` },
];

/** /scholar: what to do today, how it's going, and a way into everything (dashboard design, 16 Nov 2026). */
export function ScholarHome() {
  const s = useScholar();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ticks, setTicks] = useState<Task[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false); // answered just now (not a saved answer shown on reload): the one moment that animates
  const [attempts, setAttempts] = useState<QotdAttempt[]>([]);
  const [busy, setBusy] = useState<"mistakes" | "catchup" | null>(null);
  const [now, setNow] = useState(0); // when the data was read, so every card agrees on "today"
  const userId = s?.me.id;
  const load = useCallback(() => {
    if (!userId) return;
    listItems(userId).then((x) => {
      const t = Date.now();
      setNow(t);
      setItems(x);
      setTicks(getTicks(userId, istDay(t)));
      setAttempts(qotdAttempts(userId));
      setPick(qotdToday(userId, istDay(t))?.pick ?? null);
    });
    listProjects(userId).then(setProjects);
  }, [userId]);
  useEffect(load, [load]);
  // shortcuts: "/" to ask, 1–4 to answer the question of the day (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("home-ask")?.focus();
      } else if (/^[1-9]$/.test(e.key)) {
        document.querySelector<HTMLButtonElement>(`[data-qotd-option="${Number(e.key) - 1}"]:not(:disabled)`)?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!s || items === null) return null;

  const today = istDay(now);
  const all = items;
  const exam = examCountdown(all, projects, now);
  const plan = todayPlan(all, now);
  const planTopic = plan ? (TOPICS.find((t) => plan.day.topics.includes(t.title)) ?? null) : null;
  const mastery = topicMastery(all);
  const next = suggestions(all, now)[0];
  const week = weekActivity(all, now);
  const qotd = questionOfTheDay(today);
  const qotdTopic = topicById(qotd.topic_id)!;
  const ring = exam ? Math.max(0.04, Math.min(1, 1 - exam.daysLeft / 30)) : 0;
  const tick = (t: Task, on: boolean) => {
    setTick(s.me.id, today, t, on);
    const now = getTicks(s.me.id, today);
    setTicks(now);
    syncPlanDay(s.me.id, now.length).then((changed) => changed && load());
  };
  const submit = async () => {
    if (!q.trim() || asking) return;
    setAsking(true);
    setErr(null);
    try {
      const it = await ask(s.me.id, { text: q, level: getPrefs(s.me.id).level });
      router.push(`/scholar/ask/${it.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setAsking(false);
    }
  };

  const due = dueCards(all, today);
  const open = mistakes(all, attempts);
  const examPlan = exam?.plan ? (all.find((i) => i.kind === "plan" && (i.data as PlanData).exam_date === exam.date) as Item<PlanData> | undefined) : undefined;
  const missed = examPlan ? missedDays(examPlan.data, today) : 0;
  const answerToday = (i: number) => {
    answerQotd(s.me.id, today, i);
    setPick(i);
    setFresh(true);
    setAttempts(qotdAttempts(s.me.id));
  };
  const practiseMistakes = async () => {
    setBusy("mistakes");
    try {
      const it = await makeMistakeQuiz(s.me.id, open);
      router.push(`/scholar/study/quiz?id=${it.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  };
  const catchUp = async () => {
    if (!examPlan) return;
    setBusy("catchup");
    await updateItem<PlanData>(s.me.id, examPlan.id, { data: reschedulePlan(examPlan.data, today) });
    setBusy(null);
    load();
  };

  const answered = pick !== null;
  const gotIt = pick === qotd.q.answer;
  const quiet = week.totals.studyDays === 0;

  return (
    <div className="mx-auto grid max-w-[1000px] gap-7">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="sch-serif text-[28px] font-semibold leading-[1.1] tracking-[-0.015em] text-ink [text-wrap:balance] sm:text-[34px]">
            {greeting(istHour())}, {s.me.full_name.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">{todayLong()}</p>
        </div>
        {exam && (
          <div className="flex items-center gap-3.5">
            <svg width="60" height="60" viewBox="0 0 36 36" className="text-ink" role="img" aria-label={`${exam.daysLeft} days to go`}>
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3.4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset={94.2 * (1 - ring)} transform="rotate(-90 18 18)" />
              <text x="18" y="20.6" textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor">
                {exam.daysLeft}d
              </text>
            </svg>
            <div>
              <p className="text-[14px] font-semibold text-ink">
                {exam.name} in {exam.daysLeft} {exam.daysLeft === 1 ? "day" : "days"}
              </p>
              <p className="text-[13px] text-ink-3">
                {exam.plan ? `Plan ${exam.plan.done} of ${exam.plan.total} days done · ${exam.plan.onTrack ? "on track" : "a little behind"}` : "No revision plan yet"}
                {missed > 0 && (
                  <>
                    {" · "}
                    <button type="button" onClick={catchUp} disabled={busy === "catchup"} className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline disabled:opacity-60">
                      {busy === "catchup" ? "Catching up…" : "Catch up"}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-[var(--surface)] p-2 pl-4 transition-colors focus-within:border-[color-mix(in_srgb,var(--accent)_55%,transparent)]"
        >
          <label htmlFor="home-ask" className="sr-only">
            Ask a doubt
          </label>
          <input id="home-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a doubt, at your level…" enterKeyHint="send" autoComplete="off" className="h-11 min-w-0 flex-1 bg-transparent text-[16px] text-ink caret-[var(--accent)] outline-none placeholder:text-ink-4" />
          {!q && (
            <kbd aria-hidden className="hidden rounded border border-line-strong px-1.5 font-sans text-[11.5px] text-ink-4 lg:inline">
              /
            </kbd>
          )}
          <button type="submit" disabled={!q.trim() || asking} aria-keyshortcuts="/" className="h-10 rounded-full bg-[var(--button-primary)] px-5 text-[14px] font-semibold text-[var(--button-primary-fg)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
            {asking ? "Asking…" : "Ask"}
          </button>
        </form>
        {err && <Notice kind="error">{err}</Notice>}
        <Intro userId={s.me.id} />
      </div>

      {/* phone: suggestion first, then the day, then progress. laptop: the day on the left, suggestion and progress in the margin */}
      <div className="grid items-start gap-x-12 gap-y-7 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] p-5 lg:col-start-2 lg:row-start-1">
          <SectionLabel as="h2">Suggested next</SectionLabel>
          {due.length ? (
            <>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink">
                <b className="font-semibold tabular-nums">{count(due.length, "flashcard is", "flashcards are")}</b> due today. Reviewing them on the day they&apos;re due is what makes them stick.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href="/scholar/study/flashcards?review=due" className={primaryBtn}>
                  Review {count(due.length, "card", "cards")}
                </Link>
                <Link href={next.action.href} className={quietLink}>
                  Or: {next.action.label.toLowerCase()}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{next.text}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href={next.action.href} className={primaryBtn}>
                  {next.action.label}
                </Link>
                {mastery.length > 0 && (
                  <Link href="/scholar/learning" className={quietLink}>
                    See all in My learning
                  </Link>
                )}
              </div>
            </>
          )}
        </section>

        {/* the day: what to do now */}
        <div className="grid gap-7 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Section
            title={plan ? `Today's plan · ${plan.day.topics.join(", ")}` : "Today's plan"}
            action={
              plan && planTopic ? (
                <span className={`shrink-0 text-[12.5px] tabular-nums ${ticks.length === TASKS.length ? "font-semibold text-[var(--accent)]" : "text-ink-4"}`}>
                  {ticks.length === TASKS.length ? "All done today" : `${ticks.length} of ${TASKS.length} done`}
                </span>
              ) : undefined
            }
          >
            {plan && planTopic ? (
              <ul>
                {TASKS.map((t) => {
                  const done = ticks.includes(t.id);
                  return (
                    <li key={t.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-1">
                      <input type="checkbox" checked={done} onChange={(e) => tick(t.id, e.target.checked)} className="size-[18px] shrink-0 accent-[var(--accent)]" aria-label={`Done: ${t.label}`} />
                      <Link href={t.href(planTopic.id)} className={`flex-1 text-[15px] underline-offset-4 transition-colors duration-150 hover:underline ${done ? "text-ink-4 line-through" : "text-ink"}`}>
                        {t.label}
                      </Link>
                      <span className="text-[12.5px] tabular-nums text-ink-4">{t.mins} min</span>
                    </li>
                  );
                })}
              </ul>
            ) : plan ? (
              <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">Today is for {plan.day.topics.join(", ").toLowerCase()}. Go through your saved work, or test yourself with a quiz on anything that feels shaky.</p>
            ) : (
              <div className="grid justify-items-start gap-4">
                <p className="sch-serif max-w-[52ch] text-[18px] leading-snug text-ink">Make a revision plan to your exam date and Scholar lays out each day&apos;s topic and tasks here.</p>
                <Link href="/scholar/study/plan" className={secondaryBtn}>
                  Make a revision plan
                </Link>
              </div>
            )}
          </Section>

          <Section title="Continue">
            {items.length ? (
              <div className="-mt-1 [&_li:first-child>a]:border-t-0">
                <ItemRows items={items.slice(0, 3)} />
              </div>
            ) : <p className="text-[14px] leading-relaxed text-ink-3">Nothing here yet. Your questions, quizzes, vivas and presentations will appear here.</p>}
          </Section>

          <Section title={`Question of the day · ${qotdTopic.subject}`}>
            {qotd.q.image && (
              <div className="mb-3">
                <QuestionImage image={qotd.q.image} />
              </div>
            )}
            <p className="sch-serif max-w-[60ch] text-[18px] leading-snug text-ink">{qotd.q.q}</p>
            <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Your answer">
              {qotd.q.options.map((o, i) => {
                const right = answered && i === qotd.q.answer;
                const wrong = pick === i && i !== qotd.q.answer;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={pick === i}
                    disabled={answered}
                    onClick={() => answerToday(i)}
                    data-qotd-option={i}
                    aria-keyshortcuts={String(i + 1)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2 text-left text-[14.5px] transition-colors duration-150 ${
                      right
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-ink"
                        : wrong
                          ? "border-[var(--sch-amber)] text-ink"
                          : answered
                            ? "border-line text-ink-4"
                            : "border-line text-ink-2 hover:border-line-strong hover:bg-[var(--surface-glass)] hover:text-ink"
                    }`}
                  >
                    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border text-[12px] font-semibold ${right ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--button-primary-fg)]" : wrong ? "border-[var(--sch-amber)] text-[var(--sch-amber-ink)]" : "border-line-strong text-ink-3"}`}>
                      {right ? <Check className={`size-3.5 ${fresh ? "sch-answer-mark" : ""}`} strokeWidth={2.4} /> : wrong ? <X className={`size-3.5 ${fresh ? "sch-answer-mark" : ""}`} strokeWidth={2.4} /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1">{o}</span>
                    {right && <span className="text-[12px] font-semibold text-[var(--accent)]">Answer</span>}
                    {wrong && <span className="text-[12px] font-semibold text-[var(--sch-amber-ink)]">Your pick</span>}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className={`mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-2 ${fresh ? "sch-answer-why" : ""}`} role="status">
                <span className={`font-semibold ${gotIt ? "text-[var(--accent)]" : "text-[var(--sch-amber-ink)]"}`}>{gotIt ? "Right. " : "Not quite. "}</span>
                {qotd.q.why}
              </p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-4">
              {answered ? (
                <>
                  <Link href={`/scholar/study/quiz?topic=${qotd.topic_id}`} className={quietLink}>
                    Try 5 more on {qotdTopic.title.toLowerCase()}
                  </Link>
                  <span>A new question tomorrow.</span>
                </>
              ) : (
                <span className="hidden sm:inline">
                  Press <kbd className="rounded border border-line-strong px-1 font-sans text-[11.5px]">1</kbd>–<kbd className="rounded border border-line-strong px-1 font-sans text-[11.5px]">{qotd.q.options.length}</kbd> to answer
                </span>
              )}
            </p>
          </Section>
        </div>

        {/* the margin: what to do next, and how it's going */}
        <aside aria-label="Your progress" className="grid gap-7 lg:col-start-2 lg:row-start-2">
          <Section title={open.length ? `Mistakes to fix · ${open.length}` : "Mistakes to fix"}>
            {open.length ? (
              <div className="grid gap-3">
                <ul className="grid gap-2.5">
                  {open.slice(0, 2).map((m) => (
                    <li key={m.q.q} className="grid gap-0.5">
                      <span className="sch-serif line-clamp-2 text-[15px] leading-snug text-ink">{m.q.q}</span>
                      <span className="text-[12.5px] text-ink-4">
                        {topicById(m.topic_id)?.title ?? "Mixed"}
                        {m.q.image ? " · picture question" : ""}
                        {m.times > 1 ? ` · missed ${m.times} times` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <div>
                  <button type="button" onClick={practiseMistakes} disabled={busy === "mistakes"} className={`${secondaryBtn} disabled:opacity-60`}>
                    {busy === "mistakes" ? "Making the quiz…" : `Quiz me on ${open.length === 1 ? "it" : open.length > 10 ? "10 of them" : `all ${open.length}`}`}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink-3">Questions you get wrong in quizzes and the question of the day wait here until you get them right.</p>
            )}
          </Section>

          <Section title="Where you're strong and weak">
            {mastery.length ? (
              <ul className="grid gap-2.5">
                {mastery.map((m) => (
                  <li key={m.topic_id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_40px] items-center gap-3 text-[13.5px]">
                    <span className="truncate text-ink-2">{m.title}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                      <i className={`block h-full rounded-full ${m.score < 50 ? "bg-[var(--sch-amber)]" : "bg-[var(--accent)]"}`} style={{ width: `${m.score}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-ink-3">{m.score}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink-3">Finish a quiz or rate yourself after a viva, and your strong and weak topics show here.</p>
            )}
          </Section>

          <Section title="This week">
            <ol className="grid grid-cols-7 gap-1.5">
              {week.days.map((d) => {
                const isToday = d.date === today;
                return (
                  <li key={d.date} className="grid gap-1.5 text-center">
                    <i className={`block h-8 rounded-lg ${d.active ? "bg-[var(--accent)]" : "bg-[var(--border)]"} ${isToday ? "ring-2 ring-inset ring-[var(--accent)]" : ""}`} />
                    <span aria-hidden className={`text-[11px] ${isToday ? "font-semibold text-ink" : "text-ink-4"}`}>
                      {dayName(d.date, "short").slice(0, 2)}
                    </span>
                    <span className="sr-only">{`${isToday ? "Today, " : ""}${dayName(d.date, "long")}: ${d.active ? "studied" : "nothing saved"}`}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
              {quiet
                ? "Nothing saved this week yet. Anything you ask, quiz or practise fills in the day."
                : [count(week.totals.studyDays, "study day", "study days"), count(week.totals.asks, "question", "questions"), count(week.totals.quizzes, "quiz", "quizzes"), count(week.totals.vivas, "viva", "vivas")].join(" · ")}
            </p>
          </Section>
        </aside>
      </div>

      <Section
        title="Projects"
        action={
          <button type="button" onClick={() => setAdding(true)} className={quietLink}>
            New project
          </button>
        }
      >
        {projects.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/scholar/projects/${p.id}`} className="block rounded-2xl border border-line bg-[var(--surface)] px-4 py-3 text-[14.5px] text-ink transition-colors hover:border-line-strong">
                  {p.name}
                  {p.exam_date && daysTo(p.exam_date) >= 0 && <span className="block text-[12.5px] tabular-nums text-ink-4">{daysTo(p.exam_date)} days to go</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">Group your work and files by subject, exam or seminar.</p>
        )}
        {adding && <NewProject onClose={() => setAdding(false)} />}
      </Section>
    </div>
  );
}
