import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { PLAN_IDS, type PlanId } from "@/lib/bank/data";
import { track } from "@/lib/bank/monitor";
import { useBank } from "@/lib/bank/store";
import { setProfileName } from "@/lib/bank/profile";
import { updateSettings } from "@/lib/bank/settings";
import { PLANS, PLAN_NAMES, PlanCarousel } from "./sections/Plans";

// Testing build: no real SMS, email, camera or ID checks. These codes are fixed on purpose.
const DEMO_CODE = "123456";
const RESEND_SECONDS = 30;

const COUNTRIES = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "TN", name: "Tunisia", dial: "+216" },
];

// Two colours per plan for the page wash on the plan step. Each plan keeps its own mood.
// The first colour fills the whole page; the second is used for the buttons and highlights.
const PLAN_TINT: Record<PlanId, [string, string]> = {
  everyday: ["oklch(0.4 0.03 250)", "oklch(0.62 0.05 230)"],
  plus: ["oklch(0.44 0.18 262)", "oklch(0.72 0.14 215)"],
  pro: ["oklch(0.4 0.2 295)", "oklch(0.72 0.17 335)"],
  private: ["oklch(0.4 0.09 75)", "oklch(0.82 0.13 85)"],
};

const PURPOSES = ["Everyday spending", "Travel", "Savings", "Receiving salary", "Bills", "Investing"];
const OCCUPATIONS = ["Employed", "Self-employed", "Student", "Retired", "Other"];
const DOCUMENTS = [
  { id: "passport", label: "Passport" },
  { id: "id", label: "National ID card" },
  { id: "residence", label: "Residence permit" },
  { id: "licence", label: "Driving licence (UK, Switzerland, USA or Australia only)" },
] as const;

const ORDER = [
  "phone",
  "sms",
  "email",
  "emailCode",
  "name",
  "dob",
  "address",
  "passcode",
  "passcodeConfirm",
  "biometrics",
  "regulatory",
  "identity",
  "processing",
  "plan",
] as const;
type StepId = (typeof ORDER)[number];

interface Draft {
  dial: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
  street: string;
  city: string;
  postcode: string;
  country: string;
  passcode: string;
  biometrics: boolean;
  purposes: string[];
  occupation: string;
  taxCountry: string;
  tin: string;
  document: string;
  plan: PlanId;
}

const EMPTY: Draft = {
  dial: "+1",
  phone: "",
  email: "",
  firstName: "",
  lastName: "",
  dob: "",
  street: "",
  city: "",
  postcode: "",
  country: "US",
  passcode: "",
  biometrics: false,
  purposes: [],
  occupation: "",
  taxCountry: "US",
  tin: "",
  document: "",
  plan: "everyday",
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: string) => /^\d{7,12}$/.test(v);

/** Returns why a passcode is rejected, or null when it is fine. */
export function passcodeProblem(p: string): string | null {
  if (!/^\d{6}$/.test(p)) return "Enter all 6 digits.";
  if (/^(\d)\1{5}$/.test(p)) return "Too simple: avoid one repeated digit.";
  const d = p.split("").map(Number);
  const step = (d[1] ?? 0) - (d[0] ?? 0);
  if ((step === 1 || step === -1) && d.every((x, i) => i === 0 || x - (d[i - 1] ?? 0) === step)) {
    return "Too simple: avoid sequences like 123456.";
  }
  return null;
}

function ageOn(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function isoYearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function useCountdown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);
  return { left, restart: () => setLeft(start) };
}

/** Thin progress bar, a back button, a heading, the step body and a sticky footer. The whole step is one form, so Enter submits. */
function Frame({
  progress,
  onBack,
  title,
  subtitle,
  onSubmit,
  children,
  footer,
}: {
  progress: number;
  onBack?: (() => void) | undefined;
  title: string;
  subtitle?: string | undefined;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  // Seven segments fill up as you go; the step count sits beside them.
  const SEGMENTS = 7;
  const filled = Math.round(progress * SEGMENTS);
  return (
    <form onSubmit={onSubmit} className="glass mx-auto flex w-full max-w-sm flex-col gap-6 rounded-[1.75rem] p-6 sm:p-7" aria-live="polite">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-input" onClick={onBack} aria-label="Back">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden />
        )}
        <div
          className="flex flex-1 gap-1"
          role="progressbar"
          aria-label="Sign-up progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          {Array.from({ length: SEGMENTS }, (_, k) => (
            <span key={k} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${k < filled ? "bg-accent-gradient" : "bg-secondary"}`} />
          ))}
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {subtitle && <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      <div className="space-y-3 pt-1">{footer}</div>
    </form>
  );
}

const Primary = ({ disabled, children }: { disabled?: boolean; children: ReactNode }) => (
  <button type="submit" disabled={disabled} className="btn btn-primary w-full disabled:opacity-40">
    {children}
  </button>
);

/** Six boxes that advance on their own, accept pasted or auto-filled codes, and go back on Backspace. */
function CodeBoxes({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const cells = Array.from({ length: 6 }, (_, k) => value[k] ?? "");

  const set = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = digits.slice(0, 6);
      onChange(next);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const copy = [...cells];
    copy[i] = digits;
    onChange(copy.join(""));
    if (digits && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex justify-between gap-2">
        {cells.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`Digit ${i + 1} of 6`}
            className="field h-14 w-11 p-0 text-center text-xl font-semibold tabular-nums"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            value={c}
            autoFocus={i === 0}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !cells[i] && i > 0) {
                e.preventDefault();
                const copy = [...cells];
                copy[i - 1] = "";
                onChange(copy.join(""));
                refs.current[i - 1]?.focus();
              }
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function Register({ onDone, onCancel }: { onDone: (firstName: string) => void; onCancel: () => void }) {
  const { setPlan, startNewAccount } = useBank();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const resend = useCountdown(RESEND_SECONDS);
  const step: StepId = ORDER[index] ?? ORDER[0];

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const next = () => {
    setError("");
    setCode("");
    setIndex((i) => Math.min(i + 1, ORDER.length - 1));
  };
  const back = () => {
    setError("");
    setCode("");
    setIndex((i) => Math.max(i - 1, 0));
  };
  const progress = index / (ORDER.length - 1);

  // Processing finishes by itself after a short wait.
  useEffect(() => {
    if (step !== "processing") return;
    const id = window.setTimeout(() => next(), 2200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = (plan: PlanId) => {
    // A new account starts with nothing in it: zero balances and no history.
    startNewAccount();
    setPlan(plan);
    track("register", `Account created for ${draft.firstName.trim()} ${draft.lastName.trim()} (${PLAN_NAMES[plan]} plan, identity check skipped for testing)`);
    setProfileName(`${draft.firstName} ${draft.lastName}`);
    onDone(draft.firstName.trim());
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    switch (step) {
      case "phone":
        if (!isPhone(draft.phone)) return setError("Enter a phone number of 7 to 12 digits.");
        return next();
      case "sms":
        if (code !== DEMO_CODE) return setError("That code doesn't match. In this testing build the code is 123456.");
        return next();
      case "email":
        if (!isEmail(draft.email)) return setError("Enter a valid email address.");
        return next();
      case "emailCode":
        if (code !== DEMO_CODE) return setError("That code doesn't match. In this testing build the code is 123456.");
        return next();
      case "name":
        if (draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2) return setError("Enter your first and last name as on your ID.");
        return next();
      case "dob": {
        if (!draft.dob) return setError("Pick your date of birth.");
        const age = ageOn(draft.dob);
        if (age < 18) return setError("You must be 18 or older to open an account.");
        if (age > 120) return setError("Check the year of your date of birth.");
        return next();
      }
      case "address":
        if (!draft.street.trim() || !draft.city.trim() || !draft.postcode.trim()) return setError("Fill in your street, city and postcode.");
        return next();
      case "passcode": {
        const problem = passcodeProblem(draft.passcode);
        if (problem) return setError(problem);
        return next();
      }
      case "passcodeConfirm":
        if (code !== draft.passcode) {
          setCode("");
          return setError("The passcodes don't match. Start again.");
        }
        return next();
      case "biometrics":
        return next();
      case "regulatory":
        if (!draft.purposes.length || !draft.occupation) return setError("Choose at least one purpose and your occupation.");
        return next();
      case "identity":
        return next();
      case "plan":
        return finish(draft.plan);
      default:
        return undefined;
    }
  };

  // One input serves both passcode steps: it writes to the draft on the first and to `code` on the confirmation.
  const passcodeInput = (
    <input
      className="field text-center text-2xl font-semibold tracking-[0.5em] tabular-nums"
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      autoFocus
      aria-label={step === "passcode" ? "New 6-digit passcode" : "Confirm 6-digit passcode"}
      value={step === "passcode" ? draft.passcode : code}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 6);
        if (step === "passcode") patch({ passcode: v });
        else setCode(v);
        setError("");
      }}
    />
  );

  const submitDisabled = (() => {
    switch (step) {
      case "phone": return !isPhone(draft.phone);
      case "sms":
      case "emailCode": return code.length !== 6;
      case "email": return !isEmail(draft.email);
      case "name": return draft.firstName.trim().length < 2 || draft.lastName.trim().length < 2;
      case "dob": return !draft.dob;
      case "address": return !draft.street.trim() || !draft.city.trim() || !draft.postcode.trim();
      case "passcode": return draft.passcode.length !== 6;
      case "passcodeConfirm": return code.length !== 6;
      case "regulatory": return !draft.purposes.length || !draft.occupation;
      case "identity": return !draft.document;
      default: return false;
    }
  })();

  const errorLine = error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>;
  const cancelLink = (
    <button type="button" className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={onCancel}>
      Back to log in
    </button>
  );

  const screen = (() => {
    switch (step) {
    case "phone":
      return (
        <Frame progress={progress} onBack={index === 0 ? undefined : back} title="What's your number?" subtitle="This is how you sign in. Testing build: no SMS is sent." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}{cancelLink}</>}>
          <div className="flex gap-2">
            <select className="field w-28 shrink-0" aria-label="Country code" value={draft.dial} onChange={(e) => patch({ dial: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.dial}>{c.code} {c.dial}</option>)}
            </select>
            <input className="field tabular-nums" type="tel" inputMode="numeric" autoFocus autoComplete="tel-national" placeholder="Phone number" aria-label="Phone number" value={draft.phone} onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, "") })} />
          </div>
        </Frame>
      );

    case "sms":
      return (
        <Frame progress={progress} onBack={back} title="Enter the code" subtitle={`We sent a 6-digit code to ${draft.dial} ${draft.phone}. Testing code: 123456.`} onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}<ResendButton left={resend.left} onResend={resend.restart} /></>}>
          <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(""); }} label="SMS code" />
        </Frame>
      );

    case "email":
      return (
        <Frame progress={progress} onBack={back} title="What's your email?" subtitle="We'll send a code to check it." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          <input className="field" type="email" inputMode="email" autoFocus autoComplete="email" placeholder="you@example.com" aria-label="Email" value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
        </Frame>
      );

    case "emailCode":
      return (
        <Frame progress={progress} onBack={back} title="Check your inbox" subtitle={`Enter the code sent to ${draft.email}. Testing code: 123456.`} onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}<ResendButton left={resend.left} onResend={resend.restart} /></>}>
          <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(""); }} label="Email code" />
        </Frame>
      );

    case "name":
      return (
        <Frame progress={progress} onBack={back} title="What's your name?" subtitle="Exactly as it appears on your ID." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          <input className="field" autoFocus autoComplete="given-name" placeholder="First name" aria-label="First name" value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
          <input className="field" autoComplete="family-name" placeholder="Last name" aria-label="Last name" value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
        </Frame>
      );

    case "dob":
      return (
        <Frame progress={progress} onBack={back} title="When were you born?" subtitle="You must be 18 or older." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          <input className="field" type="date" autoFocus max={isoYearsAgo(18)} min={isoYearsAgo(120)} aria-label="Date of birth" value={draft.dob} onChange={(e) => patch({ dob: e.target.value })} />
        </Frame>
      );

    case "address":
      return (
        <Frame progress={progress} onBack={back} title="Where do you live?" subtitle="Type your home address. Testing build: no address lookup." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          <input className="field" autoFocus autoComplete="address-line1" placeholder="Street and number" aria-label="Street and number" value={draft.street} onChange={(e) => patch({ street: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" autoComplete="address-level2" placeholder="City" aria-label="City" value={draft.city} onChange={(e) => patch({ city: e.target.value })} />
            <input className="field" autoComplete="postal-code" placeholder="Postcode" aria-label="Postcode" value={draft.postcode} onChange={(e) => patch({ postcode: e.target.value })} />
          </div>
          <select className="field" aria-label="Country of residence" value={draft.country} onChange={(e) => patch({ country: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Frame>
      );

    case "passcode":
      return (
        <Frame progress={progress} onBack={back} title="Set a passcode" subtitle="6 digits. Avoid sequences like 123456." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          {passcodeInput}
          <Dots count={draft.passcode.length} />
        </Frame>
      );

    case "passcodeConfirm":
      return (
        <Frame progress={progress} onBack={back} title="Confirm your passcode" subtitle="Type the same 6 digits again." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Confirm</Primary>{errorLine}</>}>
          {passcodeInput}
          <Dots count={code.length} />
        </Frame>
      );

    case "biometrics":
      return (
        <Frame progress={progress} onBack={back} title="Unlock faster?" subtitle="Use your fingerprint or face to open the app. Optional, but it's the quickest way in." onSubmit={(e) => { e.preventDefault(); patch({ biometrics: true }); updateSettings({ biometricUnlock: true }); next(); }}
          footer={<><Primary>Turn on</Primary><button type="button" className="btn btn-ghost w-full" onClick={() => { patch({ biometrics: false }); updateSettings({ biometricUnlock: false }); next(); }}>Not now</button><p className="text-center text-xs text-muted-foreground">You can change this later in Security and privacy.</p></>}>
          <p className="glass p-4 text-sm text-muted-foreground">No fingerprint or face data is read in this demo.</p>
        </Frame>
      );

    case "regulatory":
      return (
        <Frame progress={progress} onBack={back} title="A few questions" subtitle="Required by banking rules to open an account." onSubmit={submit}
          footer={<><Primary disabled={submitDisabled}>Continue</Primary>{errorLine}</>}>
          <p className="text-sm font-medium">What will you use the account for?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Purpose of the account">
            {PURPOSES.map((p) => {
              const on = draft.purposes.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on} onClick={() => patch({ purposes: on ? draft.purposes.filter((x) => x !== p) : [...draft.purposes, p] })}
                  className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}>
                  {p}
                </button>
              );
            })}
          </div>
          <select className="field" aria-label="Occupation" value={draft.occupation} onChange={(e) => patch({ occupation: e.target.value })}>
            <option value="">Occupation</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="field" aria-label="Tax residency" value={draft.taxCountry} onChange={(e) => patch({ taxCountry: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>Tax residency: {c.name}</option>)}
          </select>
          <input className="field" aria-label="Tax ID (TIN)" placeholder="Tax ID (TIN), if your country requires one" value={draft.tin} onChange={(e) => patch({ tin: e.target.value })} />
        </Frame>
      );

    case "identity":
      return (
        <Frame progress={progress} onBack={back} title="Verify your identity" subtitle="Choose the document you'd use. Live camera checks are not part of this testing build." onSubmit={submit}
          footer={
            <>
              <Primary disabled={submitDisabled}>Skip verification (testing only)</Primary>
              {errorLine}
              <p className="text-center text-xs text-muted-foreground">The account is created without an ID or selfie check. Only use this in testing.</p>
            </>
          }>
          <div className="space-y-2" role="radiogroup" aria-label="Document type">
            {DOCUMENTS.map((d) => {
              const on = draft.document === d.id;
              return (
                <button key={d.id} type="button" role="radio" aria-checked={on} onClick={() => patch({ document: d.id })}
                  className={`glass flex w-full items-center justify-between gap-3 p-3 text-left text-sm ${on ? "ring-2 ring-accent" : "hover:bg-secondary"}`}>
                  <span>{d.label}</span>
                  {on && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Frame>
      );

    case "processing":
      return (
        <Frame progress={progress} title="Creating your account" subtitle="This usually takes a few seconds." onSubmit={(e) => e.preventDefault()}
          footer={<p className="text-center text-xs text-muted-foreground">Identity check skipped for testing.</p>}>
          <div className="grid place-items-center py-8">
            <span className="h-14 w-14 animate-spin rounded-full border-4 border-secondary border-t-accent" aria-label="Working" role="status" />
          </div>
        </Frame>
      );

    case "plan": {
      const index = Math.max(0, PLAN_IDS.indexOf(draft.plan));
      const active = PLANS[index] ?? PLANS[0]!;
      return (
        <Frame progress={1} title="Choose your plan" subtitle="Swipe between plans. You can change it later in the profile." onSubmit={submit}
          footer={
            <>
              <Primary>Choose {PLAN_NAMES[draft.plan]}</Primary>
              <button type="button" className="w-full text-center text-sm font-medium text-accent underline-offset-4 hover:underline" onClick={() => finish("everyday")}>
                Continue for free with {PLAN_NAMES.everyday}
              </button>
            </>
          }>
          <div className="-mx-7 py-2 text-white">
            <PlanCarousel index={index} onIndexChange={(i) => patch({ plan: PLAN_IDS[i] ?? "everyday" })} />
            <ul key={active.id} className="page-fade mt-3 space-y-2">
              {active.benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: active.accent }} aria-hidden />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </Frame>
      );
    }

    default:
      return null;
    }
  })();

  // A key per step remounts the wrapper, so every step, and the plan cards, fade in on arrival.
  // On the plan step the page takes the colours of the plan in view (see .plan-theme in styles.css).
  const tint = step === "plan" ? PLAN_TINT[draft.plan] : undefined;
  const themeStyle = tint ? ({ "--plan-a": tint[0], "--plan-b": tint[1] } as CSSProperties) : undefined;
  return (
    <div className={`relative w-full ${tint ? "plan-theme" : ""}`} style={themeStyle}>
      {tint && <PlanBackdrop />}
      {/* The same soft glow as the sign-in screen, so the two feel like one flow. */}
      {!tint && <div className="pointer-events-none absolute -top-8 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-gradient opacity-25 blur-3xl" aria-hidden />}
      <div key={step} className="page-fade relative z-10 w-full">
        {screen}
      </div>
    </div>
  );
}

/** One flat colour for the whole page on the plan step. It cross-fades to the next plan's colour as you swipe. */
function PlanBackdrop() {
  return <div aria-hidden className="fade-in pointer-events-none fixed inset-0 z-0" style={{ background: "var(--plan-a)" }} />;
}

function ResendButton({ left, onResend }: { left: number; onResend: () => void }) {
  return left > 0 ? (
    <p className="text-center text-sm text-muted-foreground">Resend code in 0:{String(left).padStart(2, "0")}</p>
  ) : (
    <button type="button" className="w-full text-center text-sm font-medium text-accent underline-offset-4 hover:underline" onClick={onResend}>
      Resend code
    </button>
  );
}

function Dots({ count }: { count: number }) {
  return (
    <div className="flex justify-center gap-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full border border-border ${i < count ? "bg-accent" : ""}`} />
      ))}
    </div>
  );
}
