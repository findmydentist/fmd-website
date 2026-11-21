"use client";

import { ArrowLeft, ChevronDown, ChevronRight, CreditCard, KeyRound, Pencil, Lock, LogOut, Mail, Monitor, ShieldCheck, SlidersHorizontal, Smartphone, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { OtpStep, PasswordInput, PasswordRules, useRun } from "@/components/auth/AuthForms";
import { Notice } from "@/components/Page";
import { account, deviceName, fmtPhone, initials, passwordRules, type Me, type ProfileUpdate, type Session } from "@/lib/fmd";
import { authChanged, logout, useRequireMe } from "@/lib/me";
import { ACCOUNT_TYPES, getAccountType, type AccountType } from "@/sample/onboarding";
import { Ring } from "../explore/Explore";
import { STATUS } from "./Dentist";

/* ---------------- formatting ---------------- */

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
const METHOD: Record<string, string> = { signup: "signed up", password: "password", otp: "OTP", mfa: "password and code" };

const submit = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  fn();
};

/* ---------------- /account/settings: one simple, grouped list ---------------- */

type Open = "profile" | "password" | "email" | "email-verify" | "email-remove" | "mfa-on" | "mfa-off" | "logout-all" | null;
type Expand = "email" | "mfa" | "devices" | null;

/** a titled group of rows in one rounded box */
function Group({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={title} className="grid scroll-mt-24 gap-2">
      <h2 className="px-1 text-[13px] font-semibold text-ink-3">{title}</h2>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-line bg-[var(--surface)]">{children}</div>
    </section>
  );
}

const rowCls = "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]";
function RowBody({ icon: Icon, label, sub, tag, tone = "" }: { icon: LucideIcon; label: string; sub?: ReactNode; tag?: ReactNode; tone?: string }) {
  return (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] ${tone || "text-ink-2"}`}>
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${tone || "text-ink"}`}>{label}</span>
        {sub && <span className="block truncate text-[13px] text-ink-3">{sub}</span>}
      </span>
      {tag}
    </>
  );
}
function LinkRow({ href, ...body }: { href: string } & Parameters<typeof RowBody>[0]) {
  return (
    <Link href={href} className={rowCls}>
      <RowBody {...body} />
      <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
    </Link>
  );
}
function ExpandRow({ open, onToggle, children, ...body }: { open: boolean; onToggle: () => void; children: ReactNode } & Parameters<typeof RowBody>[0]) {
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={onToggle} className={rowCls}>
        <RowBody {...body} />
        <ChevronDown className={`size-5 shrink-0 text-ink-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>
      {open && <div className="fmd-enter border-t border-line bg-white/[0.02]">{children}</div>}
    </div>
  );
}

/** /account/settings: account type, dentist profile, email, two-step verification, devices, membership, personalisation and privacy (FastAPI /me/*). */
export function AccountSettings() {
  const me = useRequireMe();
  const [open, setOpen] = useState<Open>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // a link to #security or #devices (notifications, the privacy page) opens that row
  const [expand, setExpand] = useState<Expand>(() => {
    const h = typeof window === "undefined" ? "" : location.hash;
    return h === "#devices" ? "devices" : h === "#security" ? "email" : null;
  });
  const [type, setType] = useState<AccountType | null | undefined>(undefined);
  const userId = me?.id;
  useEffect(() => {
    if (userId) getAccountType(userId).then(setType);
  }, [userId]);
  if (!me) return <div className="app-panel h-40 animate-pulse" aria-busy />;

  const close = () => setOpen(null);
  const done = (msg: string) => {
    setOpen(null);
    setFlash(msg);
    authChanged();
  };
  const show = (o: Open) => (setFlash(null), setOpen(o));
  const toggle = (e: Expand) => setExpand((x) => (x === e ? null : e));
  const t = type ? ACCOUNT_TYPES[type] : null;
  const dp = me.dentist_profile;
  const emailTag = !me.email ? <Tag tone="muted">Not added</Tag> : me.email_verified ? <Tag tone="ok">Verified</Tag> : <Tag tone="warn">Not verified</Tag>;

  return (
    <div className="mx-auto grid w-full max-w-[640px] gap-6">
      <div className="flex items-center gap-2">
        <Link href="/account" aria-label="Back to your profile" title="Your profile" className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
      </div>

      {/* who's signed in */}
      <Link href="/account" className="flex items-center gap-4 rounded-2xl border border-line bg-[var(--surface)] p-4 transition-colors hover:bg-white/[0.04]">
        <Ring>
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[17px] font-semibold text-ink">{initials(me.full_name)}</span>
        </Ring>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-ink">{me.full_name}</span>
          <span className="block text-[14px] text-ink-3">{fmtPhone(me.phone)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
      </Link>

      {flash && <Notice kind="success">{flash}</Notice>}

      <Group id="profile" title="Your account">
        <button type="button" onClick={() => show("profile")} className={rowCls}>
          <RowBody
            icon={Pencil}
            label="Profile details"
            sub={[me.full_name, me.city, me.year_of_birth && `Born ${me.year_of_birth}`].filter(Boolean).join(" · ")}
          />
          <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
        </button>
        <LinkRow
          href="/onboarding?next=%2Faccount%2Fsettings"
          icon={UserRound}
          label="Account type"
          sub={
            type === undefined
              ? "…"
              : t
                ? `${t.label} · ${t.price}${t.yearly ? ". Works as a free account until the membership is paid." : ""}`
                : "Tell us how you use FMD, so we show you the right things."
          }
          tag={<Tag tone="muted">Demo</Tag>}
        />
        <LinkRow
          href="/account/dentist"
          icon={Stethoscope}
          label={dp ? "Edit dentist profile" : "Set up dentist profile"}
          sub={dp ? `${dp.council} · Registration no. ${dp.registration_no}` : "Are you a dentist? Add your registration so patients can find you on FMD."}
          tag={dp ? <Tag tone={STATUS[dp.verification_status].tone}>{STATUS[dp.verification_status].tag}</Tag> : type === "dentist" ? <Tag tone="bad">Not verified</Tag> : undefined}
        />
      </Group>

      <Group id="security" title="Login and security">
        <button type="button" onClick={() => show("password")} className={rowCls}>
          <RowBody icon={KeyRound} label="Password" sub="Change the password you log in with" />
          <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
        </button>
        <ExpandRow open={expand === "email"} onToggle={() => toggle("email")} icon={Mail} label="Email" sub={me.email ?? "Add an email to log in with it"} tag={emailTag}>
          <EmailCard me={me} show={show} flat />
        </ExpandRow>
        <ExpandRow
          open={expand === "mfa"}
          onToggle={() => toggle("mfa")}
          icon={ShieldCheck}
          label="Two-step verification"
          sub={me.mfa_enabled ? "A text code when you log in with your password" : "Add a second step when you log in"}
          tag={me.mfa_enabled ? <Tag tone="ok">On</Tag> : <Tag tone="muted">Off</Tag>}
        >
          <Card
            flat
            title="Two-step verification"
            text={
              me.mfa_enabled
                ? `Logging in with your password also needs a code we text to ${fmtPhone(me.phone)}.`
                : `Add a second step: when you log in with your password, we'll also text a code to ${fmtPhone(me.phone)}.`
            }
          >
            {me.mfa_enabled ? (
              <Button variant="secondary" size="sm" onClick={() => show("mfa-off")}>
                Turn off
              </Button>
            ) : (
              <Button size="sm" onClick={() => show("mfa-on")}>
                Turn on
              </Button>
            )}
          </Card>
        </ExpandRow>
        <div id="devices" className="scroll-mt-24">
          <ExpandRow open={expand === "devices"} onToggle={() => toggle("devices")} icon={Monitor} label="Where you're signed in" sub="Your devices, and signing out of them">
            <Devices onSignOutAll={() => show("logout-all")} flat />
          </ExpandRow>
        </div>
      </Group>

      <Group id="more" title="Membership and privacy">
        <LinkRow href="/membership" icon={CreditCard} label="Membership" sub="Your plan, renewal, usage, payments and receipts." />
        <LinkRow href="/account/personalisation" icon={SlidersHorizontal} label="Personalisation" sub="What Explore and suggestions use, and how to change or reset it." />
        <LinkRow href="/account/privacy" icon={Lock} label="Privacy and data" sub="Your consents, which messages you get, a copy of your data, or deleting your account." />
      </Group>

      <Group title="Login">
        <button type="button" onClick={() => logout().catch(() => setFlash(null))} className={rowCls}>
          <RowBody icon={LogOut} label="Log out" tone="text-[var(--tone-bad)]" />
        </button>
      </Group>

      {open === "profile" && <ProfileSheet me={me} onDone={() => done("Profile saved.")} onClose={close} />}
      {open === "password" && <ChangePasswordSheet onClose={close} />}
      {(open === "email" || open === "email-verify") && <EmailSheet me={me} verifyOnly={open === "email-verify"} onDone={done} onClose={close} />}
      {open === "email-remove" && <RemoveEmailSheet me={me} onDone={() => done("Email removed.")} onClose={close} />}
      {open === "mfa-on" && <MfaOnSheet me={me} onDone={() => done("Two-step verification is on.")} onClose={close} />}
      {open === "mfa-off" && (
        <PasswordSheet
          title="Turn off two-step verification"
          text="Logging in with your password will no longer ask for a code."
          action="Turn off"
          onConfirm={(pw) => account.disableMfa(pw)}
          onDone={() => done("Two-step verification is off.")}
          onClose={close}
        />
      )}
      {open === "logout-all" && <LogoutAllSheet onClose={close} />}
    </div>
  );
}

/** A settings card; `flat` drops the box and the title, for use inside an opened row. */
function Card({ title, tag, text, children, flat = false }: { title: string; tag?: ReactNode; text: ReactNode; children?: ReactNode; flat?: boolean }) {
  if (flat)
    return (
      <div className="grid gap-3 px-4 py-4 sm:pl-[70px]">
        <div className="text-[14px] text-ink-2">{text}</div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    );
  return (
    <Panel as="section" className="flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-medium text-ink">{title}</h2>
        {tag}
      </div>
      <div className="text-[14.5px] text-ink-2">{text}</div>
      {children && <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>}
    </Panel>
  );
}

/* ---------------- email ---------------- */

function EmailCard({ me, show, flat = false }: { me: Me; show: (o: Open) => void; flat?: boolean }) {
  if (!me.email)
    return (
      <Card flat={flat} title="Email" tag={<Tag tone="muted">Not added</Tag>} text="Add an email to log in with it and to get security alerts.">
        <Button size="sm" onClick={() => show("email")}>
          Add email
        </Button>
      </Card>
    );
  const remove = (
    <Button variant="secondary" size="sm" onClick={() => show("email-remove")}>
      Remove
    </Button>
  );
  if (!me.email_verified)
    return (
      <Card flat={flat}
        title="Email"
        tag={<Tag tone="warn">Not verified</Tag>}
        text={
          <>
            <span className="break-all font-medium text-ink">{me.email}</span>
            <br />
            Verify it before you can log in with it.
          </>
        }
      >
        <Button size="sm" onClick={() => show("email-verify")}>
          Verify
        </Button>
        {remove}
      </Card>
    );
  return (
    <Card flat={flat}
      title="Email"
      tag={<Tag tone="ok">Verified</Tag>}
      text={
        <>
          <span className="break-all font-medium text-ink">{me.email}</span>
          <br />
          You can log in with it, and we send security alerts here.
        </>
      }
    >
      <Button variant="secondary" size="sm" onClick={() => show("email")}>
        Change
      </Button>
      {remove}
    </Card>
  );
}

/**
 * Add, change or verify the email. Adding (or verifying) sends a code to the email. Replacing a verified email is first
 * confirmed with a code texted to the phone (POST /me/email/change-start), then the new email gets its own code.
 */
function EmailSheet({ me, verifyOnly, onDone, onClose }: { me: Me; verifyOnly: boolean; onDone: (msg: string) => void; onClose: () => void }) {
  const changing = me.email_verified && !verifyOnly;
  const { busy, err, run } = useRun();
  const [step, setStep] = useState<"form" | "phone" | "code">("form");
  const [email, setEmail] = useState(verifyOnly ? (me.email ?? "") : "");
  // once saved, the new email is unverified, so sending its code again needs no phone code
  const sendToEmail = () => account.addEmail(email.trim());

  return (
    <Sheet title={verifyOnly ? "Verify your email" : changing ? "Change email" : "Add email"} onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        {step === "form" && (
          <form
            onSubmit={submit(() =>
              run(async () => {
                if (changing) {
                  await account.startEmailChange();
                  setStep("phone");
                  return;
                }
                await sendToEmail();
                authChanged(); // the backend has saved the address as unverified
                setStep("code");
              }),
            )}
            className="grid gap-4"
          >
            {verifyOnly ? (
              <p className="text-[14.5px] text-ink-2">
                We&apos;ll send a 6-digit code to <span className="break-all font-medium text-ink">{email}</span>.
              </p>
            ) : (
              <Field label={changing ? "New email" : "Email"} hint={changing ? `First we'll text a code to ${fmtPhone(me.phone)} to confirm it's you.` : undefined}>
                <input className={fieldCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={320} required />
              </Field>
            )}
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}
        {step === "phone" && (
          <OtpStep
            to={fmtPhone(me.phone)}
            busy={busy}
            run={run}
            onResend={account.startEmailChange}
            onBack={() => setStep("form")}
            onCode={(code) =>
              run(async () => {
                await account.addEmail(email.trim(), code);
                authChanged(); // your old email is replaced by the new, unverified one
                setStep("code");
              })
            }
          />
        )}
        {step === "code" && (
          <OtpStep
            to={email.trim()}
            busy={busy}
            run={run}
            onResend={sendToEmail}
            onBack={() => setStep("form")}
            onCode={(code) =>
              run(async () => {
                await account.verifyEmail(code);
                onDone("Email verified.");
              })
            }
          />
        )}
      </div>
    </Sheet>
  );
}

/** Removing the email is confirmed with a code texted to the phone (POST /me/email/remove, then DELETE /me/email). */
function RemoveEmailSheet({ me, onDone, onClose }: { me: Me; onDone: () => void; onClose: () => void }) {
  const { busy, err, run } = useRun();
  const [step, setStep] = useState<"intro" | "code">("intro");
  return (
    <Sheet title="Remove email" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        {step === "intro" ? (
          <>
            <p className="text-[14.5px] text-ink-2">
              You won&apos;t be able to log in with <span className="break-all font-medium text-ink">{me.email}</span> or get security alerts there. To confirm, we&apos;ll
              text a code to <span className="font-medium text-ink">{fmtPhone(me.phone)}</span>.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={() => run(async () => (await account.startEmailRemove(), setStep("code")))}>
                {busy ? "Sending…" : "Send code"}
              </Button>
            </div>
          </>
        ) : (
          <OtpStep
            to={fmtPhone(me.phone)}
            busy={busy}
            run={run}
            onResend={account.startEmailRemove}
            onBack={() => setStep("intro")}
            onCode={(code) => run(async () => (await account.removeEmail(code), onDone()))}
          />
        )}
      </div>
    </Sheet>
  );
}

/* ---------------- profile details and password ---------------- */

const GENDERS: [NonNullable<ProfileUpdate["gender"]>, string][] = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["undisclosed", "Prefer not to say"],
];

/** Name, year of birth, gender and city (PATCH /me). */
function ProfileSheet({ me, onDone, onClose }: { me: Me; onDone: () => void; onClose: () => void }) {
  const { busy, err, setErr, run } = useRun();
  const [f, setF] = useState({ name: me.full_name, year: me.year_of_birth ? String(me.year_of_birth) : "", gender: me.gender ?? "", city: me.city ?? "" });
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((p) => ({ ...p, [k]: v }));
  const thisYear = new Date().getFullYear();
  const save = () => {
    const year = f.year.trim() ? Number(f.year) : null;
    if (year !== null && !(Number.isInteger(year) && year >= 1900 && year <= thisYear)) return setErr(`Enter a year between 1900 and ${thisYear}.`);
    run(async () => {
      await account.updateProfile({
        full_name: f.name.trim(),
        year_of_birth: year,
        gender: (f.gender || null) as ProfileUpdate["gender"],
        city: f.city.trim() || null,
      });
      onDone();
    });
  };
  return (
    <Sheet title="Profile details" onClose={onClose}>
      <form onSubmit={submit(save)} className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Full name">
          <input className={fieldCls} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={200} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Year of birth" hint="Optional">
            <input className={fieldCls} value={f.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="bday-year" placeholder="1990" />
          </Field>
          <Field label="Gender" hint="Optional">
            <select className={fieldCls} value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Not set</option>
              {GENDERS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="City" hint="Optional">
          <input className={fieldCls} value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" maxLength={100} />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !f.name.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** POST /me/password. The backend then signs out every device, this one included, so the sign-in guard opens /login. */
function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const { busy, err, setErr, run } = useRun();
  const [f, setF] = useState({ current: "", password: "", confirm: "" });
  const save = () => {
    if (!passwordRules(f.password).every((r) => r.ok)) return setErr("Choose a password that meets every rule below it.");
    if (f.password !== f.confirm) return setErr("The two new passwords don't match.");
    run(async () => {
      await account.changePassword(f.current, f.password);
      authChanged();
    });
  };
  return (
    <Sheet title="Change password" onClose={onClose}>
      <form onSubmit={submit(save)} className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <p className="text-[14.5px] text-ink-2">After the change you&apos;ll be signed out on every device, this one included, and log in again with the new password.</p>
        <Field label="Current password">
          <PasswordInput value={f.current} onChange={(v) => setF((p) => ({ ...p, current: v }))} autoComplete="current-password" />
        </Field>
        <div>
          <Field label="New password">
            <PasswordInput value={f.password} onChange={(v) => setF((p) => ({ ...p, password: v }))} autoComplete="new-password" />
          </Field>
          <PasswordRules password={f.password} />
        </div>
        <Field label="Confirm new password">
          <PasswordInput value={f.confirm} onChange={(v) => setF((p) => ({ ...p, confirm: v }))} autoComplete="new-password" />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !f.current || !f.password || !f.confirm}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------------- two-step verification ---------------- */

function MfaOnSheet({ me, onDone, onClose }: { me: Me; onDone: () => void; onClose: () => void }) {
  const { busy, err, run } = useRun();
  const [step, setStep] = useState<"intro" | "code">("intro");
  return (
    <Sheet title="Turn on two-step verification" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        {step === "intro" ? (
          <>
            <p className="text-[14.5px] text-ink-2">
              We&apos;ll text a code to <span className="font-medium text-ink">{fmtPhone(me.phone)}</span> to confirm it&apos;s yours. After that, logging in with
              your password will also ask for a code.
            </p>
            <Button disabled={busy} onClick={() => run(async () => (await account.startMfa(), setStep("code")))}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </>
        ) : (
          <OtpStep
            to={fmtPhone(me.phone)}
            busy={busy}
            run={run}
            onResend={account.startMfa}
            onBack={() => setStep("intro")}
            onCode={(code) => run(async () => (await account.enableMfa(code), onDone()))}
          />
        )}
      </div>
    </Sheet>
  );
}

/** A sensitive change confirmed with the current password. */
function PasswordSheet({
  title,
  text,
  action,
  onConfirm,
  onDone,
  onClose,
}: {
  title: string;
  text: string;
  action: string;
  onConfirm: (password: string) => Promise<void>;
  onDone: () => void;
  onClose: () => void;
}) {
  const { busy, err, run } = useRun();
  const [password, setPassword] = useState("");
  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit(() => run(async () => (await onConfirm(password), onDone())))} className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <p className="text-[14.5px] text-ink-2">{text}</p>
        <Field label="Current password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !password}>
            {busy ? "Checking…" : action}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------------- devices ---------------- */

function Devices({ onSignOutAll, flat = false }: { onSignOutAll: () => void; flat?: boolean }) {
  const [list, setList] = useState<Session[] | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    () =>
      account.sessions().then(
        (s) => (setList(s), setErr(null)),
        (e: Error) => setErr(e.message),
      ),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await account.revokeSession(id);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card flat={flat} title="Where you're signed in" text="Sign out of any device you don't recognise.">
      <div className="grid w-full gap-4">
        {err && (
          <Notice kind="error">
            {err}{" "}
            <button type="button" onClick={load} className="font-medium underline underline-offset-4">
              Try again
            </button>
          </Notice>
        )}
        {list === undefined && !err ? (
          <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-glass)]" aria-busy />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-line">
            {list?.map((s) => {
              const name = deviceName(s.user_agent);
              const Icon = /Android|iOS/.test(name) ? Smartphone : Monitor;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className="size-5 shrink-0 text-ink-3" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium text-ink">
                      {name}
                      {s.current && <Tag tone="accent">This device</Tag>}
                    </p>
                    <p className="text-[13px] text-ink-3">
                      {s.current ? "Active now" : `Active ${ago(s.last_seen_at)}`} · Signed in {day(s.created_at)} with {METHOD[s.auth_method] ?? s.auth_method}
                      {s.ip && ` · ${s.ip}`}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="secondary" size="sm" disabled={busyId === s.id} onClick={() => revoke(s.id)} aria-label={`Sign out ${name}`}>
                      {busyId === s.id ? "Signing out…" : "Sign out"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={onSignOutAll}>
        Sign out everywhere
      </Button>
    </Card>
  );
}

function LogoutAllSheet({ onClose }: { onClose: () => void }) {
  const { busy, err, run } = useRun();
  return (
    <Sheet title="Sign out everywhere?" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <p className="text-[14.5px] text-ink-2">This signs you out on every device, including this one. You&apos;ll need to log in again.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {/* once signed out, the page's sign-in guard takes over and opens /login */}
          <Button disabled={busy} onClick={() => run(() => logout(true))}>
            {busy ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
