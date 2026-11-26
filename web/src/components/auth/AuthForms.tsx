"use client";

import { ArrowLeft, ArrowRight, BadgeCheck, Check, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, MessageSquareText, ShieldCheck, Sparkles, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ButtonLink, Panel } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { DEMO_USERS, findDemoUser, homeOf, safeNext } from "@/lib/demo";
import { auth, fmtPhone, initials, passwordRules } from "@/lib/fmd";
import { DEMO_ACCOUNTS, DEMO_OTP, DEMO_PASSWORD, demoRole } from "@/lib/fmdDemo";
import { authChanged } from "@/lib/me";
import { useDemoUser } from "@/lib/useDemoUser";
import { track } from "@/lib/analytics";
import { DEMO_MODE } from "@/toggle";

/* ---------------- shared parts ---------------- */

const BENEFITS: [LucideIcon, string, string][] = [
  [BadgeCheck, "Find dentists you can check", "Profiles say what FMD verified, with fees and open times."],
  [Sparkles, "Ask FMD AI in plain words", "Understand a problem before you book. Guidance, not a diagnosis."],
  [ShieldCheck, "Your records, private", "Keep reports and X-rays in one place; you decide who sees them."],
];

/**
 * The frame for every sign-in page: a form card, with (when `brand`) a panel beside it on wide screens saying what FMD
 * is for. Onboarding uses it without the panel.
 */
export function AuthCard({ title, text, children, footer, wide = false, brand = false, legal = false }: { title: string; text?: string; children: ReactNode; footer?: ReactNode; wide?: boolean; brand?: boolean; legal?: boolean }) {
  // log in, sign up, reset password: a split screen, brand on the left (wide screens), the form on a quiet right side
  if (brand)
    return (
      <div className="grid min-h-dvh bg-[var(--background)] lg:grid-cols-2">
        <aside
          className="relative hidden overflow-hidden border-r border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:gap-8 lg:p-12 xl:p-16"
          style={{
            viewTransitionName: "auth-brand",
            background:
              "radial-gradient(110% 70% at 0% 0%, rgba(14,165,233,0.22), transparent 60%), radial-gradient(90% 60% at 100% 100%, rgba(99,102,241,0.22), transparent 60%), var(--surface)",
          }}
        >
          <Link href="/" aria-label="FindMyDentist home" className="w-fit">
            <Image src="/img/logo-fmd.webp" alt="FindMyDentist" width={337} height={180} priority className="h-11 w-auto" />
          </Link>
          <div className="grid max-w-[480px] gap-7">
            <div className="grid gap-4">
              <h2 className="text-[44px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink">
                Your dental care,{" "}
                <span className="bg-gradient-to-r from-[var(--headline-accent)] to-[var(--accent)] bg-clip-text text-transparent [--solid:#8fb0ff]">in one place.</span>
              </h2>
              <p className="text-[16px] leading-relaxed text-ink-3">Find dentists you can trust, ask questions in plain words and keep your records safe, with one account for FMD and FMD Clinic.</p>
            </div>
            <ul className="grid gap-4">
              {BENEFITS.map(([Icon, head, line]) => (
                <li key={head} className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[rgb(var(--accent-rgb)/0.2)] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-[15.5px] font-semibold text-ink">{head}</span>
                    <span className="mt-0.5 block text-[14px] text-ink-3">{line}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {/* what FMD looks like inside: a dentist as patients see them, and FMD AI */}
          <div aria-hidden className="relative hidden h-[236px] max-w-[540px] [@media(min-height:880px)]:block">
            <div className="absolute left-0 top-0 w-[290px] rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                  <Image src="/dentists-pics/aditi-sharma.jpg" alt="" fill sizes="48px" className="object-cover object-[center_20%]" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                    Dr. Aditi Sharma <BadgeCheck className="size-4 text-[var(--accent)]" strokeWidth={2} />
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-3">General Dentist · Koramangala</span>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-emerald-300">Verified by FMD</span>
                <span className="rounded-md bg-[rgb(var(--accent-rgb)/0.15)] px-2 py-1 text-[var(--accent)]">Next: today, 4:30 pm</span>
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-[280px] rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] p-3.5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--accent)]">
                <Image src="/img/hero/mascot-512.webp" alt="" width={24} height={24} className="size-6" /> FMD AI
              </p>
              <p className="mt-2 rounded-xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-[12.5px] leading-snug text-ink-2">
                Sensitive teeth? Here&apos;s what often causes it, what helps at home, and when it&apos;s worth seeing a dentist.
              </p>
            </div>
          </div>
          <p className="flex max-w-[360px] items-start gap-2 text-[13px] leading-relaxed text-ink-3">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} /> Your number is only used to sign you in and for messages you ask for.
          </p>
        </aside>

        <main className="flex min-h-dvh flex-col px-5 py-5 sm:px-10">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="FindMyDentist home" className="lg:invisible">
              <Image src="/img/logo-fmd.webp" alt="FindMyDentist" width={337} height={180} priority className="h-9 w-auto" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] text-ink-3 hover:bg-white/[0.05] hover:text-ink">
              <ArrowLeft className="size-4" strokeWidth={1.75} /> Back to home
            </Link>
          </div>
          <div className="mx-auto my-auto w-full max-w-[420px] py-10">
            <div key={title} className="fmd-rise">
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
              {text && <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{text}</p>}
            </div>
            <div className="mt-8">{children}</div>
            {footer && <p className="mt-8 border-t border-line pt-6 text-center text-[14.5px] text-ink-3">{footer}</p>}
          </div>
          {legal && (
          <p className="mx-auto max-w-[420px] text-center text-[12px] leading-relaxed text-ink-3">
            By continuing, you agree to FMD&apos;s{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy Policy
            </Link>
            .
          </p>
          )}
        </main>
      </div>
    );
  return (
    <div className="app-glow relative grid min-h-dvh place-items-center px-4 py-10">
      <Link href="/" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] text-ink-3 hover:bg-white/[0.05] hover:text-ink sm:left-6 sm:top-6">
        <ArrowLeft className="size-4" strokeWidth={1.75} /> Home
      </Link>
      <div className={`grid w-full items-center gap-12 ${wide ? "max-w-[640px]" : "max-w-[440px]"}`}>
        <div className="w-full">
          <Link href="/" aria-label="FindMyDentist home" className="mx-auto mb-6 block w-fit">
            <Image src="/img/logo-fmd.webp" alt="FindMyDentist" width={337} height={180} priority className="h-11 w-auto" />
          </Link>
          <Panel className="p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-8">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
            {text && <p className="mt-1.5 text-[14.5px] text-ink-3">{text}</p>}
            <div className="mt-6">{children}</div>
          </Panel>
          {footer && <p className="mt-5 text-center text-[14.5px] text-ink-3">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

/** eases its height to fit what's inside, so a step or a field appearing doesn't make the page jump */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number>();
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div style={{ height: h }} className="transition-[height] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] [overflow-clip-margin:96px] [overflow:clip] motion-reduce:transition-none">
      <div ref={inner}>{children}</div>
    </div>
  );
}

/** one step of a form, sliding in from the right (going on) or the left (going back) */
function Step({ id, dir, children }: { id: string; dir: number; children: ReactNode }) {
  return (
    <div key={id} className={dir < 0 ? "fmd-swap-l" : "fmd-swap-r"}>
      {children}
    </div>
  );
}

/** a part of a form that opens and closes smoothly; closed, it takes no room and can't be reached */
function Collapse({ open, children, gap = "-mt-5" }: { open: boolean; children: ReactNode; gap?: string }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity,margin] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : `${gap} grid-rows-[0fr] opacity-0`}`}
    >
      <div className="min-h-0 [overflow-clip-margin:8px] [overflow:clip]">{children}</div>
    </div>
  );
}

/** a spinner for the busy state of a button */
const Spin = () => <Loader2 className="size-[18px] animate-spin" strokeWidth={2} aria-hidden />;

/** mobile number (with +91 shown in front) or, once letters are typed, an email */
function IdField({ value, onChange, glow = false }: { value: string; onChange: (v: string) => void; glow?: boolean }) {
  const email = /[a-z@]/i.test(value);
  return (
    <label className="grid gap-1.5">
      <span className="text-[13.5px] font-medium text-ink-2">Mobile number or email</span>
      <span className={`relative block ${glow ? "fmd-glow" : ""}`}>
        {email ? (
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" strokeWidth={1.75} />
        ) : (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-2.5 pl-3.5 text-[15px] font-medium text-ink-2">
            +91 <span className="h-5 w-px bg-[var(--border-strong)]" />
          </span>
        )}
        <input
          className={`${fieldCls} ${glow ? "h-14 !rounded-[18px] !border-transparent !bg-[var(--background)] text-[17px]" : "h-12 text-[15.5px]"} ${email ? "pl-11" : "pl-[66px]"}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="username"
          inputMode={email ? "email" : "text"}
          placeholder="98765 43210"
          autoFocus
          required
        />
      </span>
    </label>
  );
}

const linkCls = "font-semibold text-[var(--accent)] underline-offset-4 hover:underline";
/** the one big action on each step */
const primary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--accent)_78%,black)] text-[15px] font-semibold text-white transition-[background-color,opacity] hover:bg-[color-mix(in_srgb,var(--accent)_90%,black)] disabled:cursor-not-allowed disabled:opacity-45";
const big = `${fieldCls} h-12 pl-11`;

/** an input with an icon inside it, on the left */
function WithIcon({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="relative block">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" strokeWidth={1.75} />
      {children}
    </span>
  );
}

/** busy flag + one error line for a form; every backend call goes through run() */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, setErr, run };
}

/** Where to go once signed in: ?next= if it stays on this site, else home. `via` is a stop on the way (sign-up →
 *  /onboarding), which gets this page's query (next, as) to carry on with. */
export function useFinish() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  return {
    next,
    finish: (via?: string) => {
      authChanged();
      router.replace(via ? via + location.search : safeNext(next));
    },
  };
}
const withNext = (href: string, next: string | null) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);

const submit = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  fn();
};

export function PasswordInput({ value, onChange, autoComplete, required = true }: { value: string; onChange: (v: string) => void; autoComplete: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" strokeWidth={1.75} />
      <input
        type={show ? "text" : "password"}
        className={`${fieldCls} h-12 pl-11 pr-12`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={128}
        required={required}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-1 grid w-11 place-items-center text-ink-3 hover:text-ink"
      >
        {show ? <EyeOff className="size-[18px]" strokeWidth={1.5} /> : <Eye className="size-[18px]" strokeWidth={1.5} />}
      </button>
    </span>
  );
}

export function PasswordRules({ password }: { password: string }) {
  return (
    <Collapse open={!!password} gap="">
    <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-white/[0.03] p-3 text-[12.5px]" aria-label="Password needs">
      {passwordRules(password).map((r) => (
        <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-[var(--tone-ok)]" : "text-ink-3"}`}>
          {r.ok ? <Check className="size-3.5 shrink-0" strokeWidth={2} /> : <X className="size-3.5 shrink-0" strokeWidth={2} />}
          <span>
            {r.label}
            <span className="sr-only">{r.ok ? " (done)" : " (missing)"}</span>
          </span>
        </li>
      ))}
    </ul>
    </Collapse>
  );
}

const RESEND_AFTER = 30; // the backend allows one OTP per number every 30s

/** Enter the 6-digit code sent to `to`, with resend after a cooldown. On dev backends the code is shown. */
export function OtpStep({
  to,
  busy,
  onCode,
  onBack,
  onResend,
  run,
  demoCode,
}: {
  to: string;
  busy: boolean;
  onCode: (code: string) => void;
  onBack: () => void;
  onResend: () => Promise<void>;
  run: (fn: () => Promise<void>) => Promise<void>;
  /** a flow with no backend yet shows its pretend code here instead of the dev backend's */
  demoCode?: string;
}) {
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(RESEND_AFTER);
  const [dev, setDev] = useState<string | null>(null);
  const [sent, setSent] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  useEffect(() => {
    if (!demoCode && (process.env.NODE_ENV !== "production" || DEMO_MODE)) auth.devOtp().then(setDev);
  }, [sent, demoCode]);

  const resend = () =>
    run(async () => {
      await onResend();
      setCode("");
      setWait(RESEND_AFTER);
      setSent((n) => n + 1);
    });

  return (
    <form onSubmit={submit(() => onCode(code))} className="grid gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-[var(--accent-soft)] p-3.5">
        <MessageSquareText className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />
        <p className="text-[14.5px] text-ink-2">
          Enter the 6-digit code sent to <span className="font-semibold text-ink">{to}</span>.
        </p>
      </div>
      <label className="grid gap-2">
        <span className="text-[13.5px] text-ink-3">Code</span>
        {/* six boxes to look at; one real input on top that takes typing, pasting and the phone's autofill */}
        <span className="relative grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={`grid h-14 place-items-center rounded-xl border text-[22px] font-semibold text-ink transition-colors ${
                i === code.length && code.length < 6 ? "border-[var(--accent)] bg-[var(--accent-soft)]" : code[i] ? "border-line-strong bg-white/[0.06]" : "border-line bg-[var(--surface-glass)]"
              }`}
            >
              {code[i] ?? ""}
            </span>
          ))}
          <input
            className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none [letter-spacing:2.5em] selection:bg-transparent"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            aria-label="6-digit code"
            autoFocus
            required
          />
        </span>
        {(demoCode || dev) && <span className="text-[12.5px] text-ink-3">{demoCode ? `Demo: the code is ${demoCode}` : `Development backend: the code is ${dev}`}</span>}
      </label>
      <button type="submit" className={primary} disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : "Continue"}
      </button>
      <div className="flex items-center justify-between text-[13.5px]">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" strokeWidth={1.5} /> Change
        </button>
        {wait > 0 ? (
          <span className="text-ink-3" aria-live="polite">
            Resend in {wait}s
          </span>
        ) : (
          <button type="button" onClick={resend} disabled={busy} className="font-semibold text-[var(--accent)] hover:underline">
            Resend code
          </button>
        )}
      </div>
    </form>
  );
}

/* ---------------- log in ---------------- */

export function LoginForm() {
  const { next, finish } = useFinish();
  const router = useRouter();
  const { signIn: chooseRole, signOut: clearRole } = useDemoUser();
  const [demoOpen, setDemoOpen] = useState(false);
  const { busy, err, setErr, run } = useRun();
  const [method, setMethod] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<"form" | "otp" | "mfa">("form");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState("");

  const pick = (m: typeof method) => (setMethod(m), setStep("form"), setErr(null));

  const sendLoginOtp = () =>
    run(async () => {
      await auth.sendOtp(id.trim(), "login");
      setDir(1);
      setStep("otp");
    });
  /** true when a second factor is needed (a fresh challenge is set) */
  const passwordStep = async () => {
    const r = await auth.loginPassword(id.trim(), password);
    if (!("mfa_required" in r)) return false;
    setChallenge(r.challenge_token);
    return true;
  };
  const withPassword = () => run(async () => ((await passwordStep()) ? (setDir(1), setStep("mfa")) : finish()));
  /** demo mode: one tap logs straight in to a demo account (see README) */
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const demoLogin = (phone: string) => {
    const login = fmtPhone(phone).replace("+91 ", "");
    setMethod("password");
    setStep("form");
    setId(login);
    setPassword(DEMO_PASSWORD);
    setDemoBusy(phone);
    run(async () => {
      const r = await auth.loginPassword(login, DEMO_PASSWORD);
      if ("mfa_required" in r) {
        setChallenge(r.challenge_token);
        setDir(1);
        setStep("mfa");
        return;
      }
      // the same person in the demo roles too, so FMD Clinic opens for its team (its own check reads the role)
      const role = findDemoUser(DEMO_ACCOUNTS.find((a) => a.phone === phone)?.id ?? null);
      if (role) chooseRole(role.id);
      else clearRole();
      setDemoOpen(false);
      if (!next && (role?.clinicId || role?.role === "student")) {
        authChanged();
        router.replace(homeOf(role));
      } else finish();
    }).finally(() => setDemoBusy(null));
  };
  // which way the next step slides: on to the code (right), back to the form (left)
  const [dir, setDir] = useState(1);
  const go = (to: typeof step, d: number) => (setDir(d), setStep(to), setErr(null));
  const pw = method === "password";

  const demoSheet = demoOpen && (
    <Sheet title="Try FMD with a demo account" onClose={() => setDemoOpen(false)}>
      <div className="grid gap-4">
        <p className="text-[14.5px] leading-relaxed text-ink-2">Everything is sample data, kept in this browser. Pick who you want to be; one tap logs you in.</p>
        <ul className="grid gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => demoLogin(a.phone)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-[var(--surface)] p-3 text-left transition-[border-color,background-color] duration-150 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[rgb(var(--accent-rgb)/0.06)] disabled:opacity-60"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-white">
                  {demoBusy === a.phone ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : initials(a.full_name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[15px] font-semibold text-ink">{a.full_name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-3">{demoRole(a)}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
              </button>
            </li>
          ))}
          {DEMO_USERS.filter((u) => !DEMO_ACCOUNTS.some((a) => a.id === u.id)).map((u) => (
            <li key={u.id}>
              {/* clinic team roles without an FMD Main account open FMD Clinic directly */}
              <button
                type="button"
                onClick={() => (chooseRole(u.id), router.push(homeOf(u)))}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-[var(--surface)] p-3 text-left transition-[border-color,background-color] duration-150 hover:border-[rgb(var(--accent-rgb)/0.5)] hover:bg-[rgb(var(--accent-rgb)/0.06)]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-semibold text-white">{u.initials}</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[15px] font-semibold text-ink">{u.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-ink-3">{u.title}, FMD Clinic</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-center text-[12.5px] text-ink-3">
          Or type it: password <span className="font-mono text-ink-2">{DEMO_PASSWORD}</span>, code <span className="font-mono text-ink-2">{DEMO_OTP}</span>
        </p>
      </div>
    </Sheet>
  );

  return (
    <AuthCard
      brand
      legal
      title={step === "form" ? "Log in to FMD" : step === "otp" ? "Check your messages" : "Two-step verification"}
      text={step === "form" ? "Welcome back. Use the mobile number or email on your account." : undefined}
      footer={
        <>
          New to FMD?{" "}
          <Link href={withNext("/register", next)} className={linkCls}>
            Create an account
          </Link>
        </>
      }
    >
      <AutoHeight>
        <div className="grid gap-5">
          {err && (
            <div key={err} className="fmd-rise">
              <Notice kind="error">{err}</Notice>
            </div>
          )}

          {step === "form" && (
            <Step id="form" dir={dir}>
              <div className="grid gap-5">
                {/* how to log in: a code by text, or a password; the highlight slides between them */}
                <div role="tablist" aria-label="How to log in" className="relative grid grid-cols-2 rounded-xl border border-line bg-white/[0.03] p-1">
                  <span
                    aria-hidden
                    className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[var(--surface-elevated)] shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${pw ? "translate-x-full" : ""}`}
                  />
                  {(["otp", "password"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={method === m}
                      onClick={() => pick(m)}
                      className={`relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors duration-300 ${method === m ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
                    >
                      {m === "otp" ? <MessageSquareText className="size-4" strokeWidth={1.75} /> : <KeyRound className="size-4" strokeWidth={1.75} />}
                      {m === "otp" ? "One-time code" : "Password"}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit(pw ? withPassword : sendLoginOtp)} className="grid gap-5">
                  <IdField value={id} onChange={setId} glow />
                  {/* the password field opens under the number; the number stays where it is */}
                  <Collapse open={pw}>
                    <div className="grid gap-1.5">
                      <label className="grid gap-1.5">
                        <span className="text-[13.5px] font-medium text-ink-2">Password</span>
                        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" required={pw} />
                      </label>
                      <Link href={withNext("/forgot-password", next)} className="w-fit justify-self-end text-[13.5px] font-medium text-[var(--accent)] hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </Collapse>
                  <button type="submit" className={primary} disabled={busy || !id.trim() || (pw && !password)}>
                    <span key={`${method}-${busy && !demoBusy}`} className="fmd-rise inline-flex items-center gap-2">
                      {busy && !demoBusy ? (
                        <>
                          <Spin /> {pw ? "Logging in…" : "Sending code…"}
                        </>
                      ) : pw ? (
                        "Log in"
                      ) : (
                        <>
                          Send me a code <ArrowRight className="size-[18px]" strokeWidth={2} />
                        </>
                      )}
                    </span>
                  </button>
                  <p key={method} className="fmd-rise -mt-2 flex items-center justify-center gap-1.5 text-center text-[13px] text-ink-3">
                    <ShieldCheck className="size-3.5" strokeWidth={2} />
                    {pw ? "Your password is never shared with dentists or clinics." : "We'll text you a 6-digit code. No password needed."}
                  </p>
                </form>

                {DEMO_MODE && (
                  <button
                    type="button"
                    onClick={() => setDemoOpen(true)}
                    aria-haspopup="dialog"
                    className="mx-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    <Sparkles className="size-4" strokeWidth={1.75} /> Try a demo?
                  </button>
                )}
              </div>
            </Step>
          )}

          {step === "otp" && (
            <Step id="otp" dir={dir}>
              <OtpStep
                to={/[a-z@]/i.test(id) ? id.trim() : `+91 ${id.trim()}`}
                busy={busy}
                run={run}
                onResend={() => auth.sendOtp(id.trim(), "login")}
                onBack={() => go("form", -1)}
                onCode={(code) => run(async () => (await auth.loginOtp(id.trim(), code), finish()))}
              />
            </Step>
          )}

          {step === "mfa" && (
            <Step id="mfa" dir={dir}>
              <div className="grid gap-4">
                <p className="text-[14.5px] text-ink-2">Your account has two-step verification on.</p>
                <OtpStep
                  to="your second-step method"
                  busy={busy}
                  run={run}
                  onResend={async () => void (await passwordStep())} // a new code comes with a new challenge
                  onBack={() => go("form", -1)}
                  onCode={(code) => run(async () => (await auth.verifyMfa(challenge, code), finish()))}
                />
              </div>
            </Step>
          )}
        </div>
      </AutoHeight>
      {demoSheet}
    </AuthCard>
  );
}

/* ---------------- sign up ---------------- */

export function RegisterForm() {
  const { next, finish } = useFinish();
  const { busy, err, setErr, run } = useRun();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [dir, setDir] = useState(1);
  const [f, setF] = useState({ name: "", phone: "", password: "", confirm: "", offers: false, adult: false, terms: false });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const start = () => {
    if (!passwordRules(f.password).every((r) => r.ok)) return setErr("Choose a password that meets every rule below it.");
    if (f.password !== f.confirm) return setErr("The two passwords don't match.");
    if (!f.adult || !f.terms) return setErr("Confirm you are 18 or older and agree to the Terms and Privacy Notice.");
    run(async () => {
      // the backend checks the password's rules again when the account is created
      await auth.sendOtp(f.phone.trim(), "signup");
      setDir(1);
      setStep("otp");
    });
  };

  return (
    <AuthCard
      brand
      title={step === "form" ? "Create your account" : "Verify your mobile"}
      text={step === "form" ? "For patients and dentists. It takes about a minute." : undefined}
      footer={
        <>
          Already have an account?{" "}
          <Link href={withNext("/login", next)} className={linkCls}>
            Log in
          </Link>
        </>
      }
    >
      <AutoHeight>
      <div className="grid gap-4">
        {/* where you are: your details, then the code */}
        <ol className="grid grid-cols-2 gap-2 text-[12.5px] font-semibold" aria-label="Steps">
          {["Your details", "Verify mobile"].map((label, i) => {
            const on = (step === "form" ? 0 : 1) >= i;
            return (
              <li key={label} className="grid gap-1.5">
                <span className="relative h-1 overflow-hidden rounded-full bg-white/[0.1]">
                  <span className={`absolute inset-0 origin-left rounded-full bg-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "scale-x-100" : "scale-x-0"}`} />
                </span>
                <span className={on ? "text-ink" : "text-ink-3"}>
                  {i + 1}. {label}
                </span>
              </li>
            );
          })}
        </ol>
        {err && (
          <div key={err} className="fmd-rise">
            <Notice kind="error">{err}</Notice>
          </div>
        )}

        {step === "form" ? (
          <Step id="form" dir={dir}>
          <form onSubmit={submit(start)} className="grid gap-4">
            <Field label="Full name">
              <WithIcon icon={UserRound}>
                <input className={big} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={200} placeholder="As on your ID" required />
              </WithIcon>
            </Field>
            <Field label="Mobile number" hint="Indian numbers only for now.">
              <span className="relative block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 border-r border-line-strong pr-2.5 text-[15px] font-medium text-ink-2">+91</span>
                <input
                  className={`${fieldCls} h-12 pl-[60px]`}
                  value={f.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  required
                />
              </span>
            </Field>
            <div>
              <Field label="Password">
                <PasswordInput value={f.password} onChange={(v) => set("password", v)} autoComplete="new-password" />
              </Field>
              <PasswordRules password={f.password} />
            </div>
            <div>
              <Field label="Confirm password">
                <PasswordInput value={f.confirm} onChange={(v) => set("confirm", v)} autoComplete="new-password" />
              </Field>
              {f.confirm && (
                <p className={`mt-1.5 flex items-center gap-1.5 text-[12.5px] ${f.confirm === f.password ? "text-[var(--tone-ok)]" : "text-ink-3"}`}>
                  {f.confirm === f.password ? <Check className="size-3.5" strokeWidth={2} /> : <X className="size-3.5" strokeWidth={2} />}
                  {f.confirm === f.password ? "Passwords match" : "Passwords don't match yet"}
                </p>
              )}
            </div>
            <fieldset className="grid gap-1 rounded-xl bg-white/[0.03] p-2 text-[14px] text-ink-2">
              <legend className="sr-only">Agreements</legend>
              <Check2 checked={f.adult} onChange={(v) => set("adult", v)}>
                I am 18 or older.
              </Check2>
              <Check2 checked={f.terms} onChange={(v) => set("terms", v)}>
                I agree to FMD&apos;s{" "}
                <Link href="/terms" target="_blank" className="font-medium text-ink underline underline-offset-4">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-4">
                  Privacy Notice
                </Link>
                .
              </Check2>
              <Check2 checked={f.offers} onChange={(v) => set("offers", v)}>
                Send me offers and dental tips (optional).
              </Check2>
            </fieldset>
            <button type="submit" className={primary} disabled={busy || !f.name.trim() || !f.phone.trim() || !f.password || !f.confirm}>
              {busy ? (
                <>
                  <Spin /> Sending code…
                </>
              ) : (
                <>
                  Continue <ArrowRight className="size-[18px]" strokeWidth={2} />
                </>
              )}
            </button>
          </form>
          </Step>
        ) : (
          <Step id="otp" dir={dir}>
          <OtpStep
            to={`+91 ${f.phone.trim()}`}
            busy={busy}
            run={run}
            onResend={() => auth.sendOtp(f.phone.trim(), "signup")}
            onBack={() => (setDir(-1), setStep("form"), setErr(null))}
            onCode={(otp) =>
              run(async () => {
                await auth.register({ full_name: f.name.trim(), phone: f.phone.trim(), password: f.password, otp, marketing_opt_in: f.offers });
                track("sign_up_completed");
                finish("/onboarding");
              })
            }
          />
          </Step>
        )}
      </div>
      </AutoHeight>
    </AuthCard>
  );
}

function Check2({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  );
}

/* ---------------- forgot password ---------------- */

export function ForgotPasswordForm() {
  const { next, finish } = useFinish();
  const { busy, err, setErr, run } = useRun();
  const [step, setStep] = useState<"id" | "otp" | "password" | "done">("id");
  const [dir, setDir] = useState(1);
  const go = (to: typeof step, d = 1) => (setDir(d), setStep(to));
  const [id, setId] = useState("");
  const [proof, setProof] = useState("");
  const [pw, setPw] = useState({ password: "", confirm: "" });

  const save = () => {
    if (!passwordRules(pw.password).every((r) => r.ok)) return setErr("Choose a password that meets every rule below it.");
    if (pw.password !== pw.confirm) return setErr("The two passwords don't match.");
    run(async () => {
      await auth.resetPassword(id.trim(), proof, pw.password);
      go("done");
    });
  };

  return (
    <AuthCard
      brand
      title={step === "done" ? "Password changed" : "Reset your password"}
      text={step === "done" ? undefined : "We'll send a code to the mobile number or email on your account."}
      footer={
        step !== "done" && (
          <>
            Remembered it?{" "}
            <Link href={withNext("/login", next)} className={linkCls}>
              Log in
            </Link>
          </>
        )
      }
    >
      <AutoHeight>
      <div className="grid gap-4">
        {err && (
          <div key={err} className="fmd-rise">
            <Notice kind="error">{err}</Notice>
          </div>
        )}

        {step === "id" && (
          <Step id="id" dir={dir}>
          <form
            onSubmit={submit(() =>
              run(async () => {
                await auth.sendOtp(id.trim(), "reset_password");
                go("otp");
              }),
            )}
            className="grid gap-4"
          >
            <IdField value={id} onChange={setId} />
            <button type="submit" className={primary} disabled={busy || !id.trim()}>
              {busy ? (
                <>
                  <Spin /> Sending code…
                </>
              ) : (
                <>
                  Send code <ArrowRight className="size-[18px]" strokeWidth={2} />
                </>
              )}
            </button>
          </form>
          </Step>
        )}

        {step === "otp" && (
          <Step id="otp" dir={dir}>
          <OtpStep
            to={id.trim()}
            busy={busy}
            run={run}
            onResend={() => auth.sendOtp(id.trim(), "reset_password")}
            onBack={() => (go("id", -1), setErr(null))}
            onCode={(code) =>
              run(async () => {
                setProof((await auth.verifyResetOtp(id.trim(), code)).proof_token);
                go("password");
              })
            }
          />
          </Step>
        )}

        {step === "password" && (
          <Step id="password" dir={dir}>
          <form onSubmit={submit(save)} className="grid gap-4">
            <div>
              <Field label="New password">
                <PasswordInput value={pw.password} onChange={(v) => setPw((p) => ({ ...p, password: v }))} autoComplete="new-password" />
              </Field>
              <PasswordRules password={pw.password} />
            </div>
            <Field label="Confirm new password">
              <PasswordInput value={pw.confirm} onChange={(v) => setPw((p) => ({ ...p, confirm: v }))} autoComplete="new-password" />
            </Field>
            <button type="submit" className={primary} disabled={busy || !pw.password || !pw.confirm}>
              {busy ? (
                <>
                  <Spin /> Saving…
                </>
              ) : (
                "Save new password"
              )}
            </button>
            {/* remembered it after all: the verified code is enough to log in */}
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await auth.loginWithProof(id.trim(), proof);
                  finish();
                })
              }
              className="text-[14px] font-medium text-ink-3 hover:text-ink"
            >
              Log in without changing it
            </button>
          </form>
          </Step>
        )}

        {step === "done" && (
          <Step id="done" dir={dir}>
            <div className="grid gap-4">
              <Notice kind="success">Your password was changed and you were signed out on every device.</Notice>
              <ButtonLink href={withNext("/login", next)}>Log in</ButtonLink>
            </div>
          </Step>
        )}
      </div>
      </AutoHeight>
    </AuthCard>
  );
}
