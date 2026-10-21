import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDownLeft, ArrowUpRight, Circle, CreditCard, LogOut, MoreHorizontal, PlusCircle, QrCode, Receipt, Search, Send, X, type LucideIcon } from "lucide-react";
import { initials, round2, spentInCategory, type SectionId, type Transaction } from "@/lib/bank/data";
import { Money, useMoneyText } from "../Money";
import { useBank } from "@/lib/bank/store";
import { useSettings } from "@/lib/bank/settings";
import { getProfileName } from "@/lib/bank/profile";
import { ProfileSheet } from "./Profile";
import { PipAssistant } from "../PipAssistant";
import { UpcomingBills } from "./MoneyPlanning";
import { NotificationBell } from "../Notifications";
import { AddFundsSheet } from "./AddFundsSheet";
import { AccountPager } from "./AccountPager";

/** A simple bottom sheet for details. Closes with the X, the backdrop, or Escape. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Rendered into <body> so that no animated ancestor can change where the fixed sheet sits.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <div className="glass page-fade relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 flex-col items-center gap-2 text-xs font-medium">
      <span className="glass grid h-14 w-14 place-items-center rounded-full">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Testing aid: pretend a contact has paid you, so the balance, activity and notifications can be checked. */
function SimulateIncoming() {
  const { accounts, contacts, receiveMoney } = useBank();
  const [from, setFrom] = useState(contacts[0]?.name ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("25");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = receiveMoney(from, accountId, amount.trim() === "" ? NaN : Number(amount));
    setError(res.ok ? "" : res.error);
    setDone(res.ok ? `Received from ${from}.` : "");
  };

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl border border-dashed border-border p-4">
      <p className="text-sm font-semibold">Test: simulate a payment received</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="field" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
          {contacts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select className="field" aria-label="Into account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.filter((a) => a.kind !== "crypto" && a.kind !== "pockets").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input className="field tabular-nums" type="number" min="0" step="0.01" inputMode="decimal" aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="submit" className="btn btn-primary">Receive</button>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-success">{done}</p>}
    </form>
  );
}

function groupByDay(items: Transaction[]) {
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  const groups = new Map<string, Transaction[]>();
  for (const t of items) {
    const key = fmt.format(new Date(t.date));
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()];
}

export function HomeSection({ onNavigate, onSignOut }: { onNavigate: (id: SectionId) => void; onSignOut: () => void }) {
  const { accounts, transactions, cards, contacts, transfer, toggleCard } = useBank();
  const fmt = useMoneyText();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [sheet, setSheet] = useState<"receive" | "addfunds" | "more" | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Crypto wallets and round-up pockets hold their money elsewhere, so they are not transfer targets.
  const bankAccounts = accounts.filter((a) => a.kind !== "crypto" && a.kind !== "pockets");

  const { defaultAccountId } = useSettings();
  const [fromId, setFromId] = useState(bankAccounts.find((a) => a.id === defaultAccountId)?.id ?? bankAccounts[0]?.id ?? "");
  const [toId, setToId] = useState(bankAccounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = amount.trim() === "" ? NaN : Number(amount);
    const res = transfer(fromId, toId, value);
    if (res.ok) {
      setMsg({ ok: true, text: `Sent ${fmt(round2(value))}.` });
      setAmount("");
    } else setMsg({ ok: false, text: res.error });
  };

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";

  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? transactions.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      : transactions;
    return list.slice(0, 12);
  }, [transactions, query]);

  // Spending this period: money out, grouped by category.
  const spending = useMemo(() => {
    const cats = [...new Set(transactions.map((t) => t.category))];
    return cats
      .map((c) => ({ category: c, amount: spentInCategory(c, transactions) }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);
  const spendingMax = spending[0]?.amount ?? 1;

  return (
    <div className="space-y-6">
      {/* Top bar: profile, search, quick icons */}
      <div className="flex items-center gap-3">
        <button type="button" data-tour="profile" onClick={() => setProfileOpen(true)} className="bg-accent-gradient grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-primary-foreground" aria-label="Open profile">
          {initials(getProfileName())}
        </button>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search transactions</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input className="field pl-9" type="search" placeholder="Search transactions" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <NotificationBell />
        <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setSheet("receive")} aria-label="Receive money (QR)">
          <QrCode className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* One page per account; swipe sideways to move between them */}
      <div data-tour="balance">
        <AccountPager onNavigate={onNavigate} />
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Quick actions">
        <QuickAction icon={PlusCircle} label="Add funds" onClick={() => setSheet("addfunds")} />
        <QuickAction icon={Send} label="Send" onClick={() => document.getElementById("send-money")?.scrollIntoView({ behavior: "smooth" })} />
        <QuickAction icon={Receipt} label="Request" onClick={() => onNavigate("payments")} />
        <QuickAction icon={CreditCard} label="Cards" onClick={() => onNavigate("cards")} />
        <QuickAction icon={MoreHorizontal} label="More" onClick={() => setSheet("more")} />
      </div>

      <UpcomingBills onNavigate={onNavigate} />

      {/* Widgets */}
      <section className="reveal space-y-3" aria-label="Your cards">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your cards</h2>
          <button type="button" className="text-sm font-medium text-accent" onClick={() => onNavigate("cards")}>Manage</button>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCard(c.id)}
              className={`bank-card tone-${c.tone} ${c.frozen ? "frozen" : ""} aspect-[1.586] w-64 shrink-0 rounded-2xl p-4 text-left`}
              aria-label={`${c.label} ending ${c.last4}, ${c.frozen ? "frozen" : "active"}. Tap to ${c.frozen ? "unfreeze" : "freeze"}.`}
            >
              <div className="relative z-10 flex h-full flex-col justify-between">
                <p className="font-display text-sm font-semibold">{c.label}</p>
                <p className="font-mono text-sm tracking-widest">•••• {c.last4}{c.frozen ? " · Frozen" : ""}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass reveal p-5" aria-labelledby="spend-title">
          <h2 id="spend-title" className="text-lg font-semibold">Where your money went</h2>
          {spending.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No spending yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {spending.map((s) => (
                <li key={s.category}>
                  <div className="flex justify-between text-sm">
                    <span>{s.category}</span>
                    <Money value={s.amount} className="tabular-nums text-muted-foreground" />
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary" role="img" aria-label={`${s.category}: ${fmt(s.amount)}`}>
                    <div className="grow-bar h-full rounded-full bg-accent-gradient" style={{ width: `${(s.amount / spendingMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass reveal p-5" aria-labelledby="contacts-widget">
          <div className="flex items-center justify-between">
            <h2 id="contacts-widget" className="text-lg font-semibold">Frequent contacts</h2>
            <button type="button" className="text-sm font-medium text-accent" onClick={() => onNavigate("payments")}>Open</button>
          </div>
          <ul className="mt-4 flex flex-wrap gap-3">
            {contacts.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onNavigate("payments")} className="flex w-16 flex-col items-center gap-1 text-center text-xs" aria-label={`Message or pay ${c.name}`}>
                  <span className="bg-accent-gradient grid h-11 w-11 place-items-center rounded-full text-xs font-semibold text-primary-foreground">{initials(c.name)}</span>
                  <span className="w-full truncate">{c.name.split(" ")[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Transfer */}
      <section id="send-money" className="glass reveal scroll-mt-24 p-5 sm:p-6" aria-labelledby="transfer-title">
        <h2 id="transfer-title" className="text-lg font-semibold">Move money between your accounts</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-muted-foreground">From</span>
            <select className="field" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-muted-foreground">To</span>
            <select className="field" value={toId} onChange={(e) => setToId(e.target.value)}>
              {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-muted-foreground">Amount (USD)</span>
            <input className="field" inputMode="decimal" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">Transfer</button>
        </form>
        {msg && <p role="status" className={`mt-3 text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
      </section>

      {/* Transaction feed */}
      <section className="glass reveal p-5 sm:p-6" aria-labelledby="feed-title">
        <h2 id="feed-title" className="text-lg font-semibold">Activity</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing matches your search.</p>
        ) : (
          <div className="mt-2 space-y-4">
            {groupByDay(recent).map(([day, items]) => (
              <div key={day}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setDetail(t)} className="flex w-full items-center gap-3 py-3 text-left">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary ${t.amount > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {t.amount > 0 ? <ArrowDownLeft className="h-4 w-4" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{t.description}</span>
                          <span className="block text-xs text-muted-foreground">{t.category} · {accountName(t.accountId)}</span>
                        </span>
                        <Money value={t.amount} signed className={`shrink-0 text-sm font-semibold tabular-nums ${t.amount > 0 ? "text-success" : ""}`} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {profileOpen && (
        <ProfileSheet accounts={accounts} transactions={transactions} onClose={() => setProfileOpen(false)} onSignOut={onSignOut} />
      )}

      {detail && (
        <Sheet title="Transaction" onClose={() => setDetail(null)}>
          <p className={`font-display text-3xl font-semibold tabular-nums ${detail.amount > 0 ? "text-success" : ""}`}><Money value={detail.amount} signed /></p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Description</dt><dd className="text-right">{detail.description}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Category</dt><dd>{detail.category}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Account</dt><dd>{accountName(detail.accountId)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Date</dt><dd>{new Date(detail.date).toLocaleString("en-US")}</dd></div>
          </dl>
        </Sheet>
      )}

      {sheet === "receive" && (
        <Sheet title="Receive money" onClose={() => setSheet(null)}>
          <p className="text-sm text-muted-foreground">Share one of these account details. Demo data only.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-xl bg-secondary p-3">
                <p className="font-medium">{a.name}</p>
                <p className="break-all font-mono text-xs text-muted-foreground">{a.iban}</p>
              </li>
            ))}
          </ul>
          <SimulateIncoming />
        </Sheet>
      )}

      {sheet === "addfunds" && <AddFundsSheet onClose={() => setSheet(null)} />}

      {sheet === "more" && (
        <Sheet title="More" onClose={() => setSheet(null)}>
          <ul className="space-y-1">
            {([["Payments", "payments"], ["Budgets", "budgets"], ["Activity", "activity"], ["Monitor", "monitor"]] as const).map(([label, id]) => (
              <li key={id}>
                <button type="button" className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-secondary" onClick={() => { setSheet(null); onNavigate(id); }}>
                  <Circle className="h-4 w-4 text-accent" aria-hidden /> {label}
                </button>
              </li>
            ))}
            <li className="mt-2 border-t border-border pt-2">
              <button type="button" className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-destructive hover:bg-secondary" onClick={() => { setSheet(null); onSignOut(); }}>
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </li>
          </ul>
        </Sheet>
      )}
      <PipAssistant onNavigate={onNavigate} />
    </div>
  );
}
