import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, ChevronDown, ChevronRight, Copy, CreditCard, Download, Gift, HelpCircle, History, Info, Landmark, Link2, LogOut, Palette, Shield, SlidersHorizontal, Star, Trash2, User, X, type LucideIcon } from "lucide-react";
import { applyPalette, PALETTES, storedPalette, type PaletteId } from "@/lib/bank/theme";
import { initials, type Account, type Transaction } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { OpenAccountSheet } from "./OpenAccountSheet";
import { inCurrency } from "@/lib/bank/money";

const formatInCurrency = (usd: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(inCurrency(usd, currency));
import { clearLog, EVENT_LABELS, useMonitorEvents } from "@/lib/bank/monitor";
import { resetSettings, updateSettings, useSettings, type Settings } from "@/lib/bank/settings";
import { getProfileName, handleFor } from "@/lib/bank/profile";
import { REPLAY_TOUR_EVENT } from "../Welcome";
import { PLAN_NAMES, PlansSheet } from "./Plans";
import { SheetPanel } from "../motion";

const PROFILE = {
  name: "Demo User",
  handle: "@demo-user",
  plan: "Everyday",
  email: "demo@example.com",
  phone: "+1 555 0100",
  inviteLink: "https://demo-bank.example/invite/demo-user",
  points: 1240,
};

type SectionKey =
  | "plans"
  | "theme"
  | "settings"
  | "accounts"
  | "statements"
  | "invite"
  | "personal"
  | "security"
  | "notifications"
  | "activity"
  | "linked"
  | "help"
  | "about";

const MENU: { key: SectionKey; title: string; detail: string; icon: LucideIcon }[] = [
  { key: "plans", title: "Plans and subscriptions", detail: "Compare and choose a plan", icon: CreditCard },
  { key: "theme", title: "Theme", detail: "Colours and look", icon: Palette },
  { key: "settings", title: "Settings", detail: "Display, payments, trading and data", icon: SlidersHorizontal },
  { key: "accounts", title: "Accounts", detail: "IBAN and balances", icon: Landmark },
  { key: "statements", title: "Statements and rewards", detail: "CSV download and points", icon: Download },
  { key: "invite", title: "Invite friends", detail: "Share your invite link", icon: Gift },
  { key: "personal", title: "Personal details", detail: "Name, email and phone", icon: User },
  { key: "security", title: "Security and privacy", detail: "Auto-lock and biometric unlock", icon: Shield },
  { key: "notifications", title: "Notifications", detail: "Payments, requests, trades and news", icon: Bell },
  { key: "activity", title: "Activity log", detail: "Sign-ins and changes on this device", icon: History },
  { key: "linked", title: "Linked accounts", detail: "Other banks", icon: Link2 },
  { key: "help", title: "Help", detail: "Common questions", icon: HelpCircle },
  { key: "about", title: "About", detail: "Version and demo notes", icon: Info },
];

/** The menu, grouped the way people look for things. */
const GROUPS: { title: string; keys: SectionKey[] }[] = [
  { title: "Your money", keys: ["accounts", "statements", "plans"] },
  { title: "Preferences", keys: ["theme", "settings", "notifications"] },
  { title: "Security and details", keys: ["personal", "security", "linked", "activity"] },
  { title: "Help and more", keys: ["invite", "help", "about"] },
];

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/25 p-3 text-center ring-1 ring-white/10 backdrop-blur-md">
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-white/70">{label}</p>
    </div>
  );
}

function canTilt() {
  return (
    document.documentElement.getAttribute("data-motion") !== "reduce" &&
    window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
  );
}

/** Same effect as the virtual cards: the surface tilts toward the mouse, with a light sweep on hover. */
function Tilt({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el || !canTilt()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={`tilt sheen ${className}`}>
      {children}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {value && <p className="break-all text-xs text-muted-foreground">{value}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="flex w-full items-center justify-between p-4 text-left text-sm font-medium" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(transactions: Transaction[], accounts: Account[]) {
  const name = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["date", "description", "category", "account", "amount_usd"].join(","),
    ...transactions.map((t) => [esc(t.date), esc(t.description), esc(t.category), esc(name(t.accountId)), t.amount].join(",")),
  ];
  downloadFile("demo-bank-statement.csv", lines.join("\n"), "text/csv;charset=utf-8");
}

function Select<T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <select
        className="field w-auto shrink-0"
        value={String(value)}
        onChange={(e) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="glass divide-y divide-border">{children}</div>
    </section>
  );
}

/** All app settings. Saved on this device; each one is applied where it is used. */
/** The theme choice, the same one as Profile > Theme. The whole app takes the chosen colours at once. */
function ThemeGroup() {
  const [current, setCurrent] = useState<PaletteId>(storedPalette);
  return (
    <SettingsGroup title="Theme">
      <div className="grid gap-2" role="radiogroup" aria-label="Theme">
        {PALETTES.map((p) => {
          const on = p.id === current;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                applyPalette(p.id);
                setCurrent(p.id);
              }}
              className={`glass flex items-center gap-3 p-3 text-left ${on ? "ring-2 ring-accent" : "hover:bg-secondary"}`}
            >
              <span className="flex shrink-0 -space-x-2" aria-hidden>
                {p.swatches.map((c) => (
                  <span key={c} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.description}</span>
              </span>
              {on && <Check className="h-4 w-4 shrink-0 text-accent" aria-label="Selected" />}
            </button>
          );
        })}
      </div>
    </SettingsGroup>
  );
}

function SettingsPanel() {
  const s = useSettings();
  const bank = useBank();
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState("");
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  const exportData = () => {
    const { accounts, cards, budgets, transactions, contacts, messages, plan } = bank;
    const payload = { exportedAt: new Date().toISOString(), plan, accounts, cards, budgets, transactions, contacts, messages, settings: s };
    downloadFile("demo-bank-data.json", JSON.stringify(payload, null, 2), "application/json");
    setNote("Exported demo-bank-data.json");
  };

  const reset = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    bank.resetDemo();
    resetSettings();
    setArmed(false);
    setNote("Demo data and settings are back to the defaults.");
  };

  return (
    <div className="space-y-6">
      <ThemeGroup />
      <SettingsGroup title="Display">
        <Select
          label="Language"
          description="Sets the page language. Screens are still in English in this demo."
          value={s.language}
          options={[{ value: "en", label: "English" }, { value: "fr", label: "Français" }]}
          onChange={(v) => set({ language: v })}
        />
        <Select
          label="Number format"
          description="Used for amounts across the app"
          value={s.numberFormat}
          options={[{ value: "us", label: "1,234.56" }, { value: "eu", label: "1.234,56" }]}
          onChange={(v) => set({ numberFormat: v })}
        />
        <Toggle label="Hide balances" description="Show ********** instead of amounts. Click any amount to toggle." checked={s.hideBalances} onChange={(v) => set({ hideBalances: v })} />
        <Toggle label="Reduce motion" description="Turns off the sheen, tilt and fade effects" checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        <Toggle label="Sounds" description="Short tones for payments, notifications and Pip" checked={s.sounds} onChange={(v) => set({ sounds: v })} />
        <Toggle label="Haptics" description="A light vibration on phones that support it" checked={s.haptics} onChange={(v) => set({ haptics: v })} />
      </SettingsGroup>

      <SettingsGroup title="Payments">
        <Select
          label="Default account"
          description="Pre-selected in transfers and listed first in payments"
          value={s.defaultAccountId}
          options={bank.accounts.map((a) => ({ value: a.id, label: a.name }))}
          onChange={(v) => set({ defaultAccountId: v })}
        />
        <Toggle label="Confirm payments" description="Ask once more before a payment is sent" checked={s.confirmPayments} onChange={(v) => set({ confirmPayments: v })} />
        <Select
          label="Who can request money"
          description="Demo: every request here comes from a saved contact, so this has no visible effect."
          value={s.requestsFrom}
          options={[{ value: "everyone", label: "Everyone" }, { value: "contacts", label: "Contacts only" }]}
          onChange={(v) => set({ requestsFrom: v })}
        />
      </SettingsGroup>

      <SettingsGroup title="Trading (simulated)">
        <Toggle label="Confirm trades" description="Review each order before it fills" checked={s.confirmTrades} onChange={(v) => set({ confirmTrades: v })} />
        <Select
          label="Default order size"
          description="Pre-fills the trade amount on the asset screen"
          value={s.defaultOrderUsd}
          options={[
            { value: 0, label: "Start empty" },
            { value: 50, label: "$50" },
            { value: 100, label: "$100" },
            { value: 250, label: "$250" },
            { value: 500, label: "$500" },
          ]}
          onChange={(v) => set({ defaultOrderUsd: v })}
        />
      </SettingsGroup>

      <SettingsGroup title="Data">
        <Row label="Export all data" value="Accounts, cards, budgets, transactions, contacts, messages and settings as JSON">
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={exportData}>
            <Download className="h-4 w-4" aria-hidden /> JSON
          </button>
        </Row>
        <Row label="Reset demo data" value={armed ? "Tap again to reset everything" : "Restores the mock accounts and all settings"}>
          <button type="button" className={`btn btn-sm shrink-0 ${armed ? "btn-danger" : "btn-ghost"}`} onClick={reset}>
            <Trash2 className="h-4 w-4" aria-hidden /> {armed ? "Confirm" : "Reset"}
          </button>
        </Row>
        {note && <p role="status" className="p-4 text-xs font-medium text-success">{note}</p>}
      </SettingsGroup>
    </div>
  );
}

function ActivityPanel() {
  const events = useMonitorEvents();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{events.length} events recorded on this device.</p>
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={clearLog} disabled={events.length === 0}>
          Clear log
        </button>
      </div>
      {events.length === 0 ? (
        <p className="glass p-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <ul className="glass divide-y divide-border">
          {events.slice(0, 100).map((e) => (
            <li key={e.id} className="flex gap-3 p-3">
              <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{new Date(e.time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-accent">{EVENT_LABELS[e.type]}</span>
                <span className="block break-words text-sm">{e.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Profile sheet. The main view lists sections; each one opens in its own window. Settings are saved on this device. */
/** The two colours of the page the profile opened from, read from its section wash. Falls back to the Home purple. */
function sectionWash(): { from: string; to: string } {
  const root = document.querySelector<HTMLElement>("[data-section]");
  if (!root) return { from: "#5b21b6", to: "#1e1b4b" };
  const style = getComputedStyle(root);
  return {
    from: style.getPropertyValue("--wash-a").trim() || "#5b21b6",
    to: style.getPropertyValue("--wash-b").trim() || "#1e1b4b",
  };
}

export function ProfileSheet({
  accounts,
  transactions,
  onClose,
  onSignOut,
}: {
  accounts: Account[];
  transactions: Transaction[];
  onClose: () => void;
  onSignOut: () => void;
}) {
  const { plan, setPlan, cards } = useBank();
  const settings = useSettings();
  const [open, setOpen] = useState<SectionKey | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [copied, setCopied] = useState("");
  // Read on every render so a name saved at sign-up shows up here straight away.
  const name = getProfileName();
  const handle = handleFor(name);
  const [palette, setPalette] = useState<PaletteId>(storedPalette);

  const choosePalette = (id: PaletteId) => {
    applyPalette(id);
    setPalette(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || plansOpen) return; // the plans screen handles its own Escape
      if (open) setOpen(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind the sheet from scrolling while it is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open, plansOpen]);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied(`Could not copy ${label}`);
    }
    window.setTimeout(() => setCopied(""), 2000);
  };

  const current = MENU.find((m) => m.key === open);

  const detail = (key: SectionKey): ReactNode => {
    switch (key) {
      case "plans":
        return null; // opens its own full-screen view
      case "theme":
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick a palette. It applies straight away and is remembered on this device.</p>
            <ul className="space-y-2">
              {PALETTES.map((p) => {
                const selected = p.id === palette;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => choosePalette(p.id)}
                      aria-pressed={selected}
                      className={`glass flex w-full items-center gap-3 p-3 text-left transition-colors ${selected ? "ring-2 ring-accent" : "hover:bg-secondary"}`}
                    >
                      <span className="flex shrink-0 -space-x-2" aria-hidden>
                        {p.swatches.map((c) => (
                          <span key={c} className="h-7 w-7 rounded-full border border-white/20" style={{ background: c }} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{p.description}</span>
                      </span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-accent" aria-label="Selected" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      case "accounts":
        return (
          <div className="space-y-4">
          <div className="glass divide-y divide-border">
            {accounts.map((a) => (
              <Row key={a.id} label={a.name} value={`${a.iban}${a.kind === "currency" && a.currency ? ` · ≈ ${formatInCurrency(a.balance, a.currency)}` : ""}${a.kind === "savings" && a.rate ? ` · ${(a.rate * 100).toFixed(2)}% a year` : ""}`}>
                <span className="flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums">
                  <Money value={a.balance} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => copy(a.name, a.iban)} aria-label={`Copy IBAN for ${a.name}`}>
                    <Copy className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              </Row>
            ))}
            {copied && <p role="status" className="p-4 text-xs font-medium text-success">{copied}</p>}
          </div>
          <button type="button" className="btn btn-primary w-full" onClick={() => setOpening(true)}>Open an account</button>
          </div>
        );
      case "statements":
        return (
          <div className="glass divide-y divide-border">
            <Row label="Download transactions" value={`${transactions.length} transactions as CSV`}>
              <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => downloadCsv(transactions, accounts)}>
                <Download className="h-4 w-4" aria-hidden /> CSV
              </button>
            </Row>
            <Row label="Rewards points" value="Catalogue is not part of this demo">
              <span className="flex items-center gap-1 text-sm font-semibold tabular-nums"><Star className="h-4 w-4 text-accent" aria-hidden /> {PROFILE.points.toLocaleString("en-US")}</span>
            </Row>
          </div>
        );
      case "invite":
        return (
          <div className="glass divide-y divide-border">
            <Row label="Your invite link" value={PROFILE.inviteLink}>
              <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => copy("invite link", PROFILE.inviteLink)} aria-label="Copy invite link">
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </Row>
            {copied && <p role="status" className="p-4 text-xs font-medium text-success">{copied}</p>}
          </div>
        );
      case "personal":
        return (
          <div className="glass divide-y divide-border">
            <Row label="Name" value={name} />
            <Row label="Email" value={PROFILE.email} />
            <Row label="Phone" value={PROFILE.phone} />
          </div>
        );
      case "security":
        return (
          <div className="space-y-6">
            <SettingsGroup title="Lock">
              <Select
                label="Auto-lock"
                description="Sign out after no activity"
                value={settings.autoLockMinutes}
                options={[
                  { value: 0, label: "Off" },
                  { value: 1, label: "1 minute" },
                  { value: 5, label: "5 minutes" },
                  { value: 15, label: "15 minutes" },
                ]}
                onChange={(v) => updateSettings({ autoLockMinutes: v })}
              />
              <Toggle label="Biometric unlock" description="Use fingerprint or face to open the app" checked={settings.biometricUnlock} onChange={(v) => updateSettings({ biometricUnlock: v })} />
            </SettingsGroup>
            <p className="px-1 text-sm text-muted-foreground">Passcode and trusted devices are managed by the bank in production.</p>
          </div>
        );
      case "notifications": {
        const n = settings.notify;
        const save = (patch: Partial<typeof n>) => updateSettings({ notify: { ...n, ...patch } });
        return (
          <div className="glass divide-y divide-border">
            <Toggle label="Payments" description="When money leaves or arrives" checked={n.payments} onChange={(v) => save({ payments: v })} />
            <Toggle label="Requests" description="When someone asks you for money" checked={n.requests} onChange={(v) => save({ requests: v })} />
            <Toggle label="Trades" description="When a simulated order fills" checked={n.trades} onChange={(v) => save({ trades: v })} />
            <Toggle label="Product news" description="Updates about new features" checked={n.news} onChange={(v) => save({ news: v })} />
          </div>
        );
      }
      case "settings":
        return <SettingsPanel />;
      case "activity":
        return <ActivityPanel />;
      case "about":
        return (
          <div className="glass divide-y divide-border">
            <Row label="Version" value="1.0.0 (demo build)" />
            <Row label="Data" value="Mock data, saved on this device only" />
            <Row label="Money" value="No real money moves. Trades and payments are simulated." />
            <p className="p-4 text-sm text-muted-foreground">Terms, privacy notice and licences are not part of this demo.</p>
          </div>
        );
      case "linked":
        return (
          <div className="glass">
            <p className="p-4 text-sm text-muted-foreground">Open banking connections to other banks are not part of this demo.</p>
          </div>
        );
      case "help":
        return (
          <div className="glass divide-y divide-border">
            <Collapsible title="How do I send money?">Open Pay, choose a contact, then tap Pay and split the amount across your accounts.</Collapsible>
            <Collapsible title="What is a money request?">A request asks a contact to pay you. You can cancel your own requests at any time.</Collapsible>
            <Collapsible title="Is this real money?">No. This is a demo with mock data. Trades and payments are simulated.</Collapsible>
            <div className="p-4">
              <button
                type="button"
                className="btn btn-ghost w-full"
                onClick={() => {
                  // Close the profile first, so the guide starts on the home screen with nothing covering it.
                  onClose();
                  window.setTimeout(() => window.dispatchEvent(new Event(REPLAY_TOUR_EVENT)), 60);
                }}
              >
                <Info className="h-4 w-4" aria-hidden /> Show the guide again
              </button>
            </div>
          </div>
        );
    }
  };

  // Full screen, in the colours of the page it opened from, so it reads as the same page with the profile on top.
  const wash = sectionWash();
  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
      style={{ background: `linear-gradient(165deg, ${wash.from} 0%, ${wash.to} 85%)` }}
    >
      <SheetPanel className="relative flex h-full w-full flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="font-display text-xl font-semibold">Profile</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        {/* Main view: the person, a short summary, then the menu in groups */}
        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 pb-10">
          <div className="relative overflow-hidden rounded-3xl bg-background/25 p-5 ring-1 ring-white/15 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/20 text-xl font-semibold ring-2 ring-white/30">{initials(name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xl font-semibold">{name}</p>
                <p className="truncate text-sm text-white/70">{handle}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{PLAN_NAMES[plan]} plan</span>
              <button type="button" className="text-sm font-semibold text-white underline-offset-4 hover:underline" onClick={() => setOpen("personal")}>Edit details</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3" aria-label="Your summary">
            <ProfileStat label="Accounts" value={String(accounts.length)} />
            <ProfileStat label="Cards" value={String(cards.length)} />
            <ProfileStat label="Points" value={PROFILE.points.toLocaleString("en-US")} />
          </div>

          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-2" aria-label={group.title}>
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-white/60">{group.title}</h3>
              <ul className="glass divide-y divide-border overflow-hidden">
                {group.keys.map((key) => {
                  const item = MENU.find((m) => m.key === key);
                  if (!item) return null;
                  const Icon = item.icon;
                  return (
                    <li key={key}>
                      <button type="button" onClick={() => (key === "plans" ? setPlansOpen(true) : setOpen(key))} className="row-hover flex w-full items-center gap-3 p-4 text-left">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-accent">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="space-y-3">
            <button type="button" className="btn btn-ghost w-full" onClick={() => { onClose(); onSignOut(); }}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out
            </button>
            <p className="text-center text-xs text-muted-foreground">Closing the account is not available in this demo.</p>
          </div>
        </div>

        {/* Sub-section window */}
        {open && current && (
          // The same colours as the Profile, so the sub-windows feel part of it.
          <div className="page-fade absolute inset-0 z-10 flex flex-col" style={{ background: "linear-gradient(165deg, #4c1d95 0%, #1e1b4b 55%, #0b0a1f 100%)" }} role="dialog" aria-modal="true" aria-label={current.title}>
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" onClick={() => setOpen(null)} aria-label="Back to profile">
                <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              </button>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-accent" aria-hidden>
                <current.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg font-semibold">{current.title}</h3>
                <p className="truncate text-xs text-white/70">{current.detail}</p>
              </div>
              <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-2">
              <div className="mx-auto max-w-xl">{detail(open)}</div>
            </div>
          </div>
        )}
      </SheetPanel>
      {plansOpen && <PlansSheet current={plan} onClose={() => setPlansOpen(false)} onChoose={setPlan} />}
      {opening && <OpenAccountSheet onClose={() => setOpening(false)} />}
    </div>,
    document.body,
  );
}
