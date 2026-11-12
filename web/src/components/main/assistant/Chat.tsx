"use client";

import { AnimatePresence, motion, type Variants } from "motion/react";
import { AlertTriangle, ArrowUp, Bell, Check, ChevronDown, Copy, FileClock, Globe, Lightbulb, Menu, Mic, MicOff, PanelLeftClose, PanelLeftOpen, Paperclip, Plus, Search, ShieldCheck, SquarePen, ThumbsDown, ThumbsUp, Trash2, Wallet, Wrench, X, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ButtonLink, Tag } from "@/components/app/kit";
import Contain from "@/components/Contain";
import { typeMs } from "@/components/hero/Assistant";
import type { Mood } from "@/components/hero/AssistantMascot";
import { Notice } from "@/components/Page";
import { when } from "@/lib/format";
import { initials } from "@/lib/fmd";
import { useMe } from "@/lib/me";
import {
  checkAttachment,
  deleteAllConversations,
  deleteConversation,
  LANGUAGES,
  listConversations,
  rate,
  send,
  type Attachment,
  type Conversation,
  type Lang,
  type Message,
} from "@/sample/assistant";
import { getConsents } from "@/sample/privacy";
import { track } from "@/lib/analytics";

const SUGGESTIONS = ["My tooth hurts when I drink something cold", "Braces or clear aligners: what's the difference?", "How do I prepare for my first dental visit?", "How much might a root canal cost?"];

export const TOOLS: [href: string, label: string][] = [
  ["/assistant/tools/budget", "Treatment budget"],
  ["/assistant/tools/insurance", "Insurance explainer"],
  ["/assistant/tools/reminders", "Reminders"],
  ["/assistant/tools/history", "My dental history"],
];
/** the homepage's FMD AI mascot (3D, one pose per mood); loaded in the browser only */
const AssistantMascot = dynamic(() => import("@/components/hero/AssistantMascot"), { ssr: false });
/** it thinks at least this long before an answer shows, so its thinking pose reads */
const MIN_THINK = 1800;
/** a question is typed into the box this fast (ms a letter), then sent after a beat */
const TYPE_IN = 28;
const EASE = [0.22, 1, 0.36, 1] as const;
// an answer builds in piece by piece, each rising out of a blur (as on the homepage)
const answer: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const piece: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: EASE } },
};

const TOOL_ICONS: Partial<Record<string, LucideIcon>> = {
  "/assistant/tools/budget": Wallet,
  "/assistant/tools/insurance": ShieldCheck,
  "/assistant/tools/reminders": Bell,
  "/assistant/tools/history": FileClock,
};

/* the browser's own speech recognition (no FMD server involved); typed here because TypeScript's DOM types lack it */
type Recognition = {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const speechApi = () => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/**
 * /assistant: FMD AI with history, files, voice and languages, laid out like the familiar chat apps: a collapsible sidebar of
 * chats and tools, a big centred message box on a new chat, then the conversation with the box docked below. Works signed
 * out; keeps nothing unless allowed to.
 */
export function AssistantPage() {
  const me = useMe();
  const [lang, setLang] = useState<Lang>("en");
  const [list, setList] = useState<Conversation[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [historyOn, setHistoryOn] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [find, setFind] = useState("");
  /** the question on its way (shown at once, before the answer comes back) */
  const [pending, setPending] = useState<{ text: string; attachments: Attachment[] } | null>(null);
  /** the answer being typed out right now */
  const [live, setLive] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [tip, setTip] = useState(0);
  const typer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const box = useRef<HTMLTextAreaElement>(null);
  const rec = useRef<Recognition | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const userId = me?.id ?? null;

  const loadList = useCallback(() => {
    if (!userId) return;
    listConversations(userId).then(setList);
    getConsents(userId, new Date().toISOString()).then((c) => setHistoryOn(c.some((x) => x.purpose === "ai_history" && x.granted)));
  }, [userId]);
  useEffect(loadList, [loadList]);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [conv?.messages.length, pending, live]);
  useEffect(() => () => (rec.current?.stop(), clearTimeout(typer.current)), []);

  const ask = async (q: string) => {
    setErr(null);
    setBusy(true);
    setLive(null); // an answer still typing out shows in full
    const atts: Attachment[] = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));
    if (q.trim() || atts.length) setPending({ text: q.trim(), attachments: atts });
    try {
      const [r] = await Promise.all([send(userId, conv, q, lang, atts), new Promise((done) => setTimeout(done, MIN_THINK))]);
      track("ai_message_sent", { language: lang, has_attachment: atts.length > 0 });
      setConv(r.conversation);
      setText("");
      setFiles([]);
      loadList();
      const reply = r.conversation.messages.at(-1);
      if (reply?.role === "assistant") {
        setLive(reply.id);
        setTimeout(() => setLive((l) => (l === reply.id ? null : l)), typeMs(reply.text) + 200);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(null);
      setBusy(false);
    }
  };
  /** types a question into the box letter by letter, then (with `andSend`) sends it, as the homepage does */
  const typeIn = (q: string, andSend: boolean) => {
    clearTimeout(typer.current);
    box.current?.focus({ preventScroll: true });
    let n = 0;
    const step = () => {
      n += 1;
      setText(q.slice(0, n));
      if (n < q.length) typer.current = setTimeout(step, TYPE_IN);
      else if (andSend) typer.current = setTimeout(() => ask(q), 450);
    };
    step();
  };
  const suggest = () => {
    typeIn(SUGGESTIONS[tip % SUGGESTIONS.length], false);
    setTip(tip + 1);
  };
  // the mascot beside the box: thinks while the answer comes, explains while it types out, listens while you type or speak
  const mood: Mood = busy ? "thinking" : live ? "explaining" : listening || (focused && text.trim()) ? "listening" : "idle";
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) ask(text);
  };
  const attach = (picked: FileList | null) => {
    const all = [...files, ...(picked ?? [])].slice(0, 3);
    const bad = all.map(checkAttachment).find(Boolean);
    setErr(bad ?? null);
    setFiles(all.filter((f) => !checkAttachment(f)));
  };
  const voice = () => {
    if (listening) return rec.current?.stop();
    const Api = speechApi();
    if (!Api) return setErr("Voice input isn't available in this browser. Type your question instead.");
    const r = new Api();
    r.lang = LANGUAGES.find((l) => l.code === lang)!.speech;
    r.interimResults = false;
    r.onresult = (e) => setText((t) => `${t ? `${t} ` : ""}${Array.from(e.results, (x) => x[0].transcript).join(" ")}`);
    r.onerror = (e) => setErr(e.error === "not-allowed" ? "Allow the microphone to talk to FMD AI, or type instead." : "Didn't catch that. Try again, or type instead.");
    r.onend = () => setListening(false);
    rec.current = r;
    setErr(null);
    setListening(true);
    r.start();
  };
  const remove = async (id: string) => {
    if (!userId) return;
    await deleteConversation(userId, id);
    if (conv?.id === id) setConv(null);
    loadList();
  };
  const feedback = async (m: Message, helpful: boolean) => {
    if (!conv) return;
    track("ai_feedback", { helpful });
    setConv(await rate(userId, conv, m.id, helpful));
  };

  const newChat = () => (setConv(null), setErr(null), setLive(null), setListOpen(false));
  const shown = list.filter((c) => c.title.toLowerCase().includes(find.trim().toLowerCase()));
  const disclaimer = `${!userId ? "Not saved: log in to keep chats." : historyOn ? "Saved to your chats. You can delete them any time." : "Not saved: turn on chat history in Privacy and data."} FMD AI never books, messages or pays for you.`;
  const row = "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[14px] text-ink hover:bg-white/[0.06]";

  /* the sidebar, full width: chats, tools, you */
  const side = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <Image src="/img/hero/mascot-512.webp" alt="" width={28} height={28} className="size-7" />
        <span className="mr-auto text-[15px] font-semibold text-ink">FMD AI</span>
        <button type="button" onClick={() => setCollapsed(true)} aria-label="Close sidebar" title="Close sidebar" className="hidden size-9 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink lg:grid">
          <PanelLeftClose className="size-5" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={() => setListOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink lg:hidden">
          <X className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <button type="button" onClick={newChat} className={row}>
        <SquarePen className="size-[18px]" strokeWidth={1.75} /> New chat
      </button>
      <label className={`${row} focus-within:bg-white/[0.06]`}>
        <Search className="size-[18px] shrink-0" strokeWidth={1.75} />
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search chats" aria-label="Search chats" className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink" />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        <section className="grid gap-0.5">
          <h2 className="px-2.5 pb-1 text-[12.5px] font-medium text-ink-3">Tools</h2>
          {TOOLS.map(([href, label]) => {
            const Icon = TOOL_ICONS[href] ?? Wrench;
            return (
              <Link key={href} href={href} className={`${row} text-ink-2 hover:text-ink`}>
                <Icon className="size-[18px]" strokeWidth={1.75} /> {label}
              </Link>
            );
          })}
        </section>

        <section className="mt-5 grid gap-0.5">
          <h2 className="px-2.5 pb-1 text-[12.5px] font-medium text-ink-3">Your chats</h2>
          {!userId ? (
            <p className="px-2.5 text-[13.5px] text-ink-3">
              <Link href="/login?next=%2Fassistant" className="font-medium text-ink underline underline-offset-4">
                Log in
              </Link>{" "}
              to keep your chats.
            </p>
          ) : !historyOn ? (
            <p className="px-2.5 text-[13.5px] text-ink-3">
              Chats aren&apos;t saved. Turn on “Save my FMD AI conversations” in{" "}
              <Link href="/account/privacy" className="font-medium text-ink underline underline-offset-4">
                Privacy and data
              </Link>
              .
            </p>
          ) : list.length === 0 ? (
            <p className="px-2.5 text-[13.5px] text-ink-3">No saved chats yet.</p>
          ) : shown.length === 0 ? (
            <p className="px-2.5 text-[13.5px] text-ink-3">No chats match “{find}”.</p>
          ) : (
            <ul className="grid gap-0.5">
              {shown.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => (setConv(c), setListOpen(false))}
                    aria-current={conv?.id === c.id ? "true" : undefined}
                    title={when(Date.parse(c.updated_at))}
                    className={`w-full rounded-lg py-2 pl-2.5 pr-10 text-left ${conv?.id === c.id ? "bg-white/[0.09]" : "hover:bg-white/[0.06]"}`}
                  >
                    <span className="block truncate text-[14px] text-ink">{c.title}</span>
                    <span className="block text-[11.5px] text-ink-3">{when(Date.parse(c.updated_at))}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete chat: ${c.title}`}
                    onClick={() => remove(c.id)}
                    className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-3 opacity-100 hover:bg-white/[0.08] hover:text-ink focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {userId && list.length > 1 && (
            <button type="button" onClick={() => deleteAllConversations(userId).then(() => (setConv(null), loadList()))} className="mt-1 px-2.5 text-left text-[13px] text-ink-3 hover:text-ink">
              Delete all chats
            </button>
          )}
        </section>
      </div>

      <div className="mt-2 border-t border-line pt-2">
        {me ? (
          <Link href="/account" className={row}>
            <span className="grid size-8 place-items-center rounded-full bg-sky-600 text-[12px] font-semibold text-white">{initials(me.full_name)}</span>
            <span className="min-w-0 truncate">{me.full_name}</span>
          </Link>
        ) : (
          <Link href="/login?next=%2Fassistant" className="flex h-10 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-black hover:bg-white/90">
            Log in
          </Link>
        )}
      </div>
    </div>
  );

  /* the collapsed sidebar: icons only */
  const rail = (
    <div className="flex h-full flex-col items-center gap-1 py-1">
      <button type="button" onClick={() => setCollapsed(false)} aria-label="Open sidebar" title="Open sidebar" className="grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink">
        <PanelLeftOpen className="size-5" strokeWidth={1.75} />
      </button>
      <button type="button" onClick={newChat} aria-label="New chat" title="New chat" className="grid size-10 place-items-center rounded-lg text-ink hover:bg-white/[0.06]">
        <SquarePen className="size-5" strokeWidth={1.75} />
      </button>
      <button type="button" onClick={() => setCollapsed(false)} aria-label="Search chats" title="Search chats" className="grid size-10 place-items-center rounded-lg text-ink hover:bg-white/[0.06]">
        <Search className="size-5" strokeWidth={1.75} />
      </button>
      <span className="my-1 h-px w-6 bg-[var(--border)]" />
      {TOOLS.map(([href, label]) => {
        const Icon = TOOL_ICONS[href] ?? Wrench;
        return (
          <Link key={href} href={href} aria-label={label} title={label} className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-white/[0.06] hover:text-ink">
            <Icon className="size-5" strokeWidth={1.75} />
          </Link>
        );
      })}
      {me && (
        <Link href="/account" aria-label="Your account" title={me.full_name} className="mt-auto grid size-8 place-items-center rounded-full bg-sky-600 text-[12px] font-semibold text-white">
          {initials(me.full_name)}
        </Link>
      )}
    </div>
  );

  /* the message box: centred on a new chat, docked at the bottom once there are messages */
  const composer = (
    <div className="grid w-full gap-2">
      {err && (
        <Notice kind="error">
          {err}{" "}
          <Link href="/help/contact?topic=ai" className="font-medium underline underline-offset-4">
            Get help
          </Link>
        </Notice>
      )}
      {listening && (
        <p role="status" className="flex items-center gap-2 px-2 text-[13px] text-[var(--tone-bad)]">
          <span className="size-2 animate-pulse rounded-full bg-[var(--tone-bad)]" /> Listening… tap the microphone to stop. Your browser&apos;s speech service turns your voice into text.
        </p>
      )}
      <div className="flex items-end gap-2 sm:gap-3">
      {/* FMD AI's mascot, beside the box (as on the homepage); its still stands in if the model can't load */}
      <div aria-hidden className="pointer-events-none relative h-[92px] w-[68px] shrink-0 translate-y-2 sm:h-32 sm:w-24 sm:translate-y-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- the fallback is a versioned still, cached forever */}
        <Contain fallback={<img src="/models/stills/guide.webp?v=3" alt="" decoding="async" className="size-full object-contain object-bottom" />}>
          <AssistantMascot mood={mood} active />
        </Contain>
      </div>
      <form onSubmit={submit} className="min-w-0 flex-1 rounded-[28px] border border-line-strong bg-[var(--surface-elevated)] p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] duration-300 focus-within:border-sky-500/50 focus-within:shadow-[0_0_40px_-12px_rgba(56,189,248,0.6)]">
        {files.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-1.5 pb-1.5 pt-0.5">
            {files.map((f, i) => (
              <li key={i} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] py-1.5 pl-2 pr-1.5 text-[13px] text-ink-2">
                <span className="grid size-7 place-items-center rounded-lg bg-sky-600 text-white">
                  <Paperclip className="size-3.5" strokeWidth={2} />
                </span>
                <span className="max-w-[180px] truncate">{f.name}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="grid size-6 place-items-center rounded-full hover:bg-white/[0.08]">
                  <X className="size-3.5" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={box}
          value={text}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy) ask(text);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={conv ? "Ask anything about your teeth…" : "Describe what you're noticing…"}
          aria-label="Your question"
          className="block max-h-52 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-[14.5px] leading-relaxed sm:text-[16px] text-ink outline-none [field-sizing:content] placeholder:text-ink-3"
        />
        <div className="flex items-center gap-1.5">
          <label title="Attach a photo or document" className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line text-ink-2 hover:bg-white/[0.06] hover:text-ink has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--accent)]">
            <Plus className="size-5" strokeWidth={1.75} />
            <span className="sr-only">Attach a photo or document</span>
            <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => (attach(e.target.files), (e.target.value = ""))} />
          </label>
          <button type="button" onClick={suggest} aria-label="Suggest a question" title="Suggest a question" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-white/[0.06] hover:text-ink">
            <Lightbulb className="size-5" strokeWidth={1.5} />
          </button>
          <label className="relative hidden h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] text-ink-2 hover:bg-white/[0.06] hover:text-ink sm:inline-flex">
            <Globe className="size-4" strokeWidth={1.75} />
            {LANGUAGES.find((l) => l.code === lang)?.label}
            <span className="sr-only">Reply language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-[var(--surface)]">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              aria-label={listening ? "Stop listening" : "Speak your question"}
              aria-pressed={listening}
              title={listening ? "Stop listening" : "Speak your question"}
              onClick={voice}
              className={`grid size-9 place-items-center rounded-full hover:bg-white/[0.06] ${listening ? "bg-[color-mix(in_srgb,var(--tone-bad)_18%,transparent)] text-[var(--tone-bad)]" : "text-ink-2 hover:text-ink"}`}
            >
              {listening ? <MicOff className="size-5" strokeWidth={1.75} /> : <Mic className="size-5" strokeWidth={1.75} />}
            </button>
            <button type="submit" disabled={busy || (!text.trim() && !files.length)} aria-label="Send" className="grid size-9 place-items-center rounded-full bg-white text-black transition-[opacity,scale] duration-200 hover:bg-white/90 active:scale-90 disabled:opacity-30">
              <ArrowUp className="size-5" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </form>
      </div>
      <p className="px-2 text-center text-[12px] text-ink-3">{disclaimer}</p>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-12.5rem-env(safe-area-inset-bottom))] min-h-[460px] overflow-hidden rounded-2xl border border-line bg-[var(--surface)] lg:h-[calc(100dvh-8.75rem)]">
      {/* desktop sidebar */}
      <aside aria-label="Chats and tools" className={`hidden shrink-0 border-r border-line bg-black/20 p-2 transition-[width] duration-300 lg:block ${collapsed ? "w-[60px]" : "w-[272px]"}`}>
        {collapsed ? rail : side}
      </aside>

      {/* phone drawer */}
      {listOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="Chats and tools" onKeyDown={(e) => e.key === "Escape" && setListOpen(false)}>
          <button type="button" aria-label="Close" onClick={() => setListOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="fmd-from-left absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-line bg-[var(--surface)] p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">{side}</aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 px-2 sm:px-3">
          <button type="button" onClick={() => setListOpen(true)} aria-label="Chats and tools" className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-white/[0.06] hover:text-ink lg:hidden">
            <Menu className="size-5" strokeWidth={1.75} />
          </button>
          {/* the model-picker spot: FMD AI and the reply language */}
          <h1 className="sr-only">FMD AI</h1>
          <label className="relative inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[17px] font-semibold text-ink hover:bg-white/[0.06]">
            FMD AI <span className="font-normal text-ink-3">{LANGUAGES.find((l) => l.code === lang)?.label}</span>
            <ChevronDown className="size-4 text-ink-3" strokeWidth={2} />
            <span className="sr-only">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-[var(--surface)] [&>option]:text-[14px]">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <Tag tone="muted">Demo</Tag>
          <button type="button" onClick={newChat} aria-label="New chat" title="New chat" className={`ml-auto grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-white/[0.06] hover:text-ink ${collapsed ? "" : "lg:hidden"}`}>
            <SquarePen className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        {!conv && !pending ? (
          <div key="new" className="fmd-enter flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6">
            {/* my-auto centres it, and unlike justify-center it never cuts off the top when the screen is short */}
            <div className="my-auto grid w-full max-w-[720px] justify-items-center gap-6">
              <div className="grid justify-items-center gap-3 text-center">
                <p className="text-[26px] font-semibold text-ink sm:text-[30px]">Ask about your teeth, in your own words</p>
                <p className="max-w-[52ch] text-[14px] text-ink-3">FMD AI explains and points you to the right care. It doesn&apos;t diagnose, prescribe, or book anything for you.</p>
              </div>
              {composer}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    type="button"
                    onClick={() => typeIn(s, true)}
                    disabled={busy}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: EASE }}
                    className="rounded-full border border-line px-3.5 py-2 text-[13.5px] text-ink-2 transition-[translate,color,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-white/[0.06] hover:text-ink"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={thread} className="min-h-0 flex-1 overflow-y-auto px-4" aria-live="polite">
              <ol className="mx-auto grid max-w-[760px] gap-8 py-6">
                {conv?.messages.map((m) => (
                  <li key={m.id} className="fmd-enter">
                    {m.role === "user" ? <UserBubble m={m} /> : <Reply m={m} live={live === m.id} onRate={(h) => feedback(m, h)} />}
                  </li>
                ))}
                {pending && (
                  <li className="fmd-enter">
                    <UserBubble m={{ id: "pending", role: "user", text: pending.text, attachments: pending.attachments } as Message} />
                  </li>
                )}
                <AnimatePresence>
                  {busy && (
                    <motion.li
                      key="thinking"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      role="status"
                      className="flex items-center gap-3 text-[13.5px] text-ink-3"
                    >
                      <span className="flex gap-1.5" aria-hidden>
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="size-2 rounded-full bg-sky-400"
                            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                          />
                        ))}
                      </span>
                      FMD AI is thinking…
                    </motion.li>
                  )}
                </AnimatePresence>
              </ol>
            </div>
            <div className="mx-auto w-full max-w-[792px] px-4 pb-3">{composer}</div>
          </>
        )}
      </section>
    </div>
  );
}

function UserBubble({ m }: { m: Message }) {
  return (
    <div className="ml-auto grid max-w-[80%] justify-items-end gap-1.5">
      {m.attachments?.map((a) => (
        <p key={a.name} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.04] px-3 py-2 text-[13px] text-ink-2">
          <Paperclip className="size-3.5" strokeWidth={1.75} /> {a.name}
        </p>
      ))}
      {m.text && <p className="whitespace-pre-line rounded-3xl bg-white/[0.09] px-4 py-2.5 text-[14px] leading-relaxed text-ink sm:text-[15.5px]">{m.text}</p>}
    </div>
  );
}

/** An answer's text; while `live`, typed out letter by letter (over typeMs) behind a caret, as on the homepage. */
function Typed({ text, live }: { text: string; live: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!live) return;
    const start = performance.now();
    const ms = typeMs(text);
    let id = requestAnimationFrame(function tick(now) {
      const k = Math.min(text.length, Math.ceil(((now - start) / ms) * text.length));
      setN(k);
      if (k < text.length) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [live, text]);
  return (
    <motion.p variants={piece} className="whitespace-pre-line text-[14.5px] leading-[1.7] text-ink sm:text-[16px] sm:leading-[1.75]">
      {live ? text.slice(0, n) : text}
      {live && <span aria-hidden className="type-caret" />}
    </motion.p>
  );
}

function Reply({ m, live, onRate }: { m: Message; live: boolean; onRate: (helpful: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };
  const act = "grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink";
  return (
    <motion.div variants={answer} initial="hidden" animate="show" className="grid gap-3" aria-busy={live}>
      <motion.p variants={piece} className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Image src="/img/hero/mascot-512.webp" alt="" width={24} height={24} className="size-6" /> FMD AI
      </motion.p>
      {m.urgent ? (
        <motion.div variants={piece} role="alert" className="grid gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--tone-bad)_55%,transparent)] bg-[color-mix(in_srgb,var(--tone-bad)_8%,transparent)] p-4">
          <p className="flex items-center gap-2 text-[15.5px] font-medium text-ink">
            <AlertTriangle className="size-5 text-[var(--tone-bad)]" strokeWidth={1.75} /> This may need urgent care
          </p>
          <p className="text-[14.5px] text-ink">{m.text}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="tel:112">Call 112</ButtonLink>
            {m.actions?.map((a) => (
              <ButtonLink key={a.href} href={a.href} variant="secondary">
                {a.label}
              </ButtonLink>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          <Typed text={m.text} live={live} />
          {/* the rest once it has finished typing */}
          {!live && m.note && <motion.p variants={piece} initial="hidden" animate="show" className="text-[13.5px] text-ink-3">{m.note}</motion.p>}
          {!live && (
            <motion.div variants={piece} initial="hidden" animate="show">
              <Tag tone="muted">Educational guidance, not a diagnosis</Tag>
            </motion.div>
          )}
          {!live && m.actions && m.actions.length > 0 && (
            <motion.div variants={piece} initial="hidden" animate="show" className="flex flex-wrap gap-2">
              {m.actions.map((a) => (
                <ButtonLink key={a.href} href={a.href} variant="secondary" size="sm">
                  {a.label}
                </ButtonLink>
              ))}
            </motion.div>
          )}
        </>
      )}
      {!live && (
      <motion.div variants={piece} initial="hidden" animate="show" className="-ml-1.5 flex items-center gap-0.5">
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy"} title={copied ? "Copied" : "Copy"} className={act}>
          {copied ? <Check className="size-4" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.75} />}
        </button>
        {[true, false].map((h) => (
          <button key={String(h)} type="button" aria-label={h ? "Helpful" : "Not helpful"} title={h ? "Helpful" : "Not helpful"} aria-pressed={m.helpful === h} onClick={() => onRate(h)} className={`${act} ${m.helpful === h ? "!text-sky-400" : ""}`}>
            {h ? <ThumbsUp className={`size-4 ${m.helpful === h ? "fill-current" : ""}`} strokeWidth={1.75} /> : <ThumbsDown className={`size-4 ${m.helpful === h ? "fill-current" : ""}`} strokeWidth={1.75} />}
          </button>
        ))}
        <span className="ml-1.5 text-[12.5px] text-ink-3">Was this helpful?</span>
      </motion.div>
      )}
    </motion.div>
  );
}
