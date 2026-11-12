"use client";

import { ArrowLeft, BadgeCheck, Check, ChevronRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MessageSquareText, ShieldCheck, Smartphone, Sparkles, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ButtonLink, Panel } from "@/components/app/kit";
import { Field, fieldCls } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { safeNext } from "@/lib/demo";
import { auth, fmtPhone, initials, passwordRules } from "@/lib/fmd";
import { DEMO_ACCOUNTS, DEMO_OTP, DEMO_PASSWORD, demoRole } from "@/lib/fmdDemo";
import { authChanged } from "@/lib/me";
import { track } from "@/lib/analytics";

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
export function AuthCard({ title, text, children, footer, wide = false, brand = false }: { title: string; text?: string; children: ReactNode; footer?: ReactNode; wide?: boolean; brand?: boolean }) {
  return (
    <div className="app-glow relative grid min-h-dvh place-items-center px-4 py-10">
      <Link href="/" className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] text-ink-3 hover:bg-white/[0.05] hover:text-ink sm:left-6 sm:top-6">
        <ArrowLeft className="size-4" strokeWidth={1.75} /> Home
      </Link>
      <div className={`grid w-full items-center gap-12 ${brand ? "max-w-[1040px] lg:grid-cols-[1fr_440px]" : wide ? "max-w-[640px]" : "max-w-[440px]"}`}>
        {brand && (
          <aside className="hidden lg:grid lg:gap-8">
            <Image src="/img/logo-fmd.webp" alt="FindMyDentist" width={337} height={180} priority className="h-12 w-auto justify-self-start" />
            <div className="grid gap-3">
              <h2 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
                Your dental care,
                <br />
                <span className="bg-gradient-to-r from-sky-300 to-blue-500 bg-clip-text text-transparent">in one place.</span>
              </h2>
              <p className="max-w-[44ch] text-[15.5px] text-ink-3">Search dentists, ask questions and keep your records, with one account for FMD and FMD Clinic.</p>
            </div>
            <ul className="grid gap-4">
              {BENEFITS.map(([Icon, head, line]) => (
                <li key={head} className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{head}</span>
                    <span className="block text-[13.5px] text-ink-3">{line}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Image src="/img/hero/mascot-512.webp" alt="" width={120} height={120} className="size-28 opacity-90" />
          </aside>
        )}
        <div className="w-full">
          <Link href="/" aria-label="FindMyDentist home" className={`mx-auto mb-6 block w-fit ${brand ? "lg:hidden" : ""}`}>
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

const linkCls = "font-semibold text-sky-400 underline-offset-4 hover:underline";
/** the one big action on each step */
const primary = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 text-[15px] font-semibold text-white transition-[background-color,opacity] hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-45";
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

export function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
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
        required
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

function PasswordRules({ password }: { password: string }) {
  if (!password) return null;
  return (
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
  );
}

/** the frontend-only demo (README): shows the demo accounts on the login page */
const DEMO_MODE = process.env.NEXT_PUBLIC_FMD_DEMO === "1";

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
    if (!demoCode && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_FMD_DEMO === "1")) auth.devOtp().then(setDev);
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
      <div className="flex items-start gap-3 rounded-xl bg-sky-500/10 p-3.5">
        <MessageSquareText className="mt-0.5 size-5 shrink-0 text-sky-400" strokeWidth={1.75} />
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
                i === code.length && code.length < 6 ? "border-sky-400 bg-sky-500/10" : code[i] ? "border-line-strong bg-white/[0.06]" : "border-line bg-[var(--surface-glass)]"
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
          <button type="button" onClick={resend} disabled={busy} className="font-semibold text-sky-400 hover:underline">
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
      setStep("otp");
    });
  /** true when a second factor is needed (a fresh challenge is set) */
  const passwordStep = async () => {
    const r = await auth.loginPassword(id.trim(), password);
    if (!("mfa_required" in r)) return false;
    setChallenge(r.challenge_token);
    return true;
  };
  const withPassword = () => run(async () => ((await passwordStep()) ? setStep("mfa") : finish()));
  /** demo mode: one tap fills a demo account (see README) */
  const fillDemo = (phone: string) => (setMethod("password"), setStep("form"), setErr(null), setId(fmtPhone(phone).replace("+91 ", "")), setPassword(DEMO_PASSWORD));

  return (
    <AuthCard
      brand
      title="Welcome back"
      text="Log in to FMD. One account for FMD and FMD Clinic."
      footer={
        <>
          New to FMD?{" "}
          <Link href={withNext("/register", next)} className={linkCls}>
            Create an account
          </Link>
        </>
      }
    >
      {step === "form" && (
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.05] p-1" role="group" aria-label="Log in with">
          {(["otp", "password"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={method === m}
              onClick={() => pick(m)}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors ${method === m ? "bg-[var(--surface-elevated)] text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}
            >
              {m === "otp" ? <MessageSquareText className="size-4" strokeWidth={1.75} /> : <KeyRound className="size-4" strokeWidth={1.75} />}
              {m === "otp" ? "One-time code" : "Password"}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}

        {step === "form" && method === "otp" && (
          <form onSubmit={submit(sendLoginOtp)} className="grid gap-4">
            <Field label="Mobile number or email">
              <WithIcon icon={/@/.test(id) ? Mail : Smartphone}>
                <input className={big} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="98765 43210" required />
              </WithIcon>
            </Field>
            <p className="-mt-1 text-[12.5px] text-ink-3">We&apos;ll send a 6-digit code. No password needed.</p>
            <button type="submit" className={primary} disabled={busy || !id.trim()}>
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </form>
        )}

        {step === "form" && method === "password" && (
          <form onSubmit={submit(withPassword)} className="grid gap-4">
            <Field label="Mobile number or email">
              <WithIcon icon={/@/.test(id) ? Mail : Smartphone}>
                <input className={big} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="98765 43210" required />
              </WithIcon>
            </Field>
            <Field label="Password">
              <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
            </Field>
            <Link href={withNext("/forgot-password", next)} className="-mt-1 w-fit justify-self-end text-[13.5px] font-medium text-sky-400 hover:underline">
              Forgot password?
            </Link>
            <button type="submit" className={primary} disabled={busy || !id.trim() || !password}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <OtpStep
            to={id.trim()}
            busy={busy}
            run={run}
            onResend={() => auth.sendOtp(id.trim(), "login")}
            onBack={() => (setStep("form"), setErr(null))}
            onCode={(code) => run(async () => (await auth.loginOtp(id.trim(), code), finish()))}
          />
        )}

        {step === "form" && DEMO_MODE && (
          <div className="grid gap-2.5 rounded-xl border border-dashed border-line-strong p-3.5">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">Demo accounts · tap to fill</p>
            <div className="grid gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button key={a.id} type="button" onClick={() => fillDemo(a.phone)} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-white/[0.05]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-600 text-[11px] font-semibold text-white">{initials(a.full_name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{a.full_name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {demoRole(a)} · {fmtPhone(a.phone)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-ink-3" strokeWidth={1.75} />
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-3">
              Password <span className="font-mono text-ink-2">{DEMO_PASSWORD}</span> · one-time code <span className="font-mono text-ink-2">{DEMO_OTP}</span>
            </p>
          </div>
        )}

        {step === "mfa" && (
          <>
            <p className="text-[14.5px] text-ink-2">Your account has two-step verification on.</p>
            <OtpStep
              to="your second-step method"
              busy={busy}
              run={run}
              onResend={async () => void (await passwordStep())} // a new code comes with a new challenge
              onBack={() => (setStep("form"), setErr(null))}
              onCode={(code) => run(async () => (await auth.verifyMfa(challenge, code), finish()))}
            />
          </>
        )}
      </div>
    </AuthCard>
  );
}

/* ---------------- sign up ---------------- */

export function RegisterForm() {
  const { next, finish } = useFinish();
  const { busy, err, setErr, run } = useRun();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [f, setF] = useState({ name: "", phone: "", password: "", confirm: "", offers: false, adult: false, terms: false });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const start = () => {
    if (!passwordRules(f.password).every((r) => r.ok)) return setErr("Choose a password that meets every rule below it.");
    if (f.password !== f.confirm) return setErr("The two passwords don't match.");
    if (!f.adult || !f.terms) return setErr("Confirm you are 18 or older and agree to the Terms and Privacy Notice.");
    run(async () => {
      await auth.checkPassword(f.password); // breached passwords fail here, before an OTP is spent
      await auth.sendOtp(f.phone.trim(), "signup");
      setStep("otp");
    });
  };

  return (
    <AuthCard
      brand
      title="Create your account"
      text="For patients and dentists. You'll confirm your mobile number with an OTP."
      footer={
        <>
          Already have an account?{" "}
          <Link href={withNext("/login", next)} className={linkCls}>
            Log in
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        {/* where you are: your details, then the code */}
        <ol className="grid grid-cols-2 gap-2 text-[12.5px] font-semibold" aria-label="Steps">
          {["Your details", "Verify mobile"].map((label, i) => {
            const on = (step === "form" ? 0 : 1) >= i;
            return (
              <li key={label} className="grid gap-1.5">
                <span className={`h-1 rounded-full transition-colors ${on ? "bg-sky-500" : "bg-white/[0.1]"}`} />
                <span className={on ? "text-ink" : "text-ink-3"}>
                  {i + 1}. {label}
                </span>
              </li>
            );
          })}
        </ol>
        {err && <Notice kind="error">{err}</Notice>}

        {step === "form" ? (
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
              {busy ? "Sending OTP…" : "Continue"}
            </button>
          </form>
        ) : (
          <OtpStep
            to={f.phone.trim()}
            busy={busy}
            run={run}
            onResend={() => auth.sendOtp(f.phone.trim(), "signup")}
            onBack={() => (setStep("form"), setErr(null))}
            onCode={(otp) =>
              run(async () => {
                await auth.register({ full_name: f.name.trim(), phone: f.phone.trim(), password: f.password, otp, marketing_opt_in: f.offers });
                track("sign_up_completed");
                finish("/onboarding");
              })
            }
          />
        )}
      </div>
    </AuthCard>
  );
}

function Check2({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-sky-500" />
      <span>{children}</span>
    </label>
  );
}

/* ---------------- forgot password ---------------- */

export function ForgotPasswordForm() {
  const { next } = useFinish();
  const { busy, err, setErr, run } = useRun();
  const [step, setStep] = useState<"id" | "otp" | "password" | "done">("id");
  const [id, setId] = useState("");
  const [proof, setProof] = useState("");
  const [pw, setPw] = useState({ password: "", confirm: "" });

  const save = () => {
    if (!passwordRules(pw.password).every((r) => r.ok)) return setErr("Choose a password that meets every rule below it.");
    if (pw.password !== pw.confirm) return setErr("The two passwords don't match.");
    run(async () => {
      await auth.resetPassword(id.trim(), proof, pw.password);
      setStep("done");
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
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}

        {step === "id" && (
          <form
            onSubmit={submit(() =>
              run(async () => {
                await auth.sendOtp(id.trim(), "reset_password");
                setStep("otp");
              }),
            )}
            className="grid gap-4"
          >
            <Field label="Mobile number or email">
              <WithIcon icon={/@/.test(id) ? Mail : Smartphone}>
                <input className={big} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="98765 43210" required />
              </WithIcon>
            </Field>
            <button type="submit" className={primary} disabled={busy || !id.trim()}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <OtpStep
            to={id.trim()}
            busy={busy}
            run={run}
            onResend={() => auth.sendOtp(id.trim(), "reset_password")}
            onBack={() => (setStep("id"), setErr(null))}
            onCode={(code) =>
              run(async () => {
                setProof((await auth.verifyResetOtp(id.trim(), code)).proof_token);
                setStep("password");
              })
            }
          />
        )}

        {step === "password" && (
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
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <>
            <Notice kind="success">Your password was changed and you were signed out on every device.</Notice>
            <ButtonLink href={withNext("/login", next)}>Log in</ButtonLink>
          </>
        )}
      </div>
    </AuthCard>
  );
}
