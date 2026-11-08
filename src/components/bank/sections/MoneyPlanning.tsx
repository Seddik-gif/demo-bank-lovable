import { fromTyped } from "@/lib/bank/data";
import { currencyCode } from "@/lib/bank/data";
import { useState, type FormEvent } from "react";
import { CalendarClock, Snowflake, Target, Trash2 } from "lucide-react";
import type { Card, Frequency, SectionId } from "@/lib/bank/data";
import { dailySpending, isDueSoon } from "@/lib/bank/money";
import { useBank } from "@/lib/bank/store";
import { useMoneyText, Money } from "../Money";

const FREQUENCY_LABEL: Record<Frequency, string> = { weekly: "Every week", monthly: "Every month" };
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const amountOf = (v: string) => (v.trim() === "" ? NaN : fromTyped(Number(v)));

function Alert({ message }: { message: string }) {
  return message ? <p role="alert" className="text-sm font-medium text-destructive">{message}</p> : null;
}

// ---- Savings goals -----------------------------------------------------------------

function GoalRow({ goalId }: { goalId: string }) {
  const { goals, accounts, contributeGoal, withdrawGoal, deleteGoal } = useBank();
  const goal = goals.find((g) => g.id === goalId);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!goal) return null;
  const pct = Math.min(100, (goal.saved / goal.target) * 100);

  const run = (fn: () => { ok: true } | { ok: false; error: string }) => {
    const res = fn();
    if (res.ok) {
      setAmount("");
      setError("");
    } else setError(res.error);
  };

  return (
    <li className="min-w-0 space-y-3 rounded-2xl bg-secondary p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-semibold">{goal.name}</h3>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          <Money value={goal.saved} /> of <Money value={goal.target} />
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background/40" role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className="grow-bar h-full rounded-full bg-accent-gradient transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto_auto] sm:items-end">
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">Account</span>
          <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.filter((a) => a.kind !== "crypto").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Amount ({currencyCode()})</span>
          <input className="field tabular-nums" type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => contributeGoal(goal.id, accountId, amountOf(amount)))}>Add</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => run(() => withdrawGoal(goal.id, accountId, amountOf(amount)))}>Take out</button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Alert message={error} />
        <button
          type="button"
          className={`btn btn-sm ml-auto ${confirmDelete ? "btn-danger" : "btn-ghost"}`}
          onClick={() => (confirmDelete ? deleteGoal(goal.id) : setConfirmDelete(true))}
          aria-label={`Delete ${goal.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden /> {confirmDelete ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </li>
  );
}

export function GoalsPanel() {
  const { goals, addGoal } = useBank();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const res = addGoal(name, amountOf(target));
    if (res.ok) {
      setName("");
      setTarget("");
      setError("");
    } else setError(res.error);
  };

  return (
    <section className="glass reveal space-y-4 p-5" aria-labelledby="goals-title">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="goals-title" className="text-lg font-semibold">Savings goals</h2>
      </div>
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No goals yet. Add one below.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => <GoalRow key={g.id} goalId={g.id} />)}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">New goal</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New laptop" maxLength={40} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Target ({currencyCode()})</span>
          <input className="field tabular-nums" type="number" min="0" step="1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
        </label>
        <button type="submit" className="btn btn-primary">Add goal</button>
      </form>
      <Alert message={error} />
    </section>
  );
}

// ---- Scheduled payments ------------------------------------------------------------

export function SchedulesPanel() {
  const { schedules, accounts, addSchedule, payScheduleNow, removeSchedule } = useBank();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const res = addSchedule(name, amountOf(amount), accountId, frequency);
    if (res.ok) {
      setName("");
      setAmount("");
      setError("");
      setNotice("Scheduled payment added.");
    } else {
      setError(res.error);
      setNotice("");
    }
  };

  const pay = (id: string) => {
    const res = payScheduleNow(id);
    setError(res.ok ? "" : res.error);
    setNotice(res.ok ? "Paid. The next date has moved on." : "");
  };

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";

  return (
    <section className="glass reveal space-y-4 p-5" aria-labelledby="schedules-title">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
        <h2 id="schedules-title" className="text-lg font-semibold">Scheduled payments</h2>
      </div>
      {schedules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-border">
          {schedules.map((s) => {
            const due = isDueSoon(s.nextDate);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.name}{" "}
                    {due && <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive">Due soon</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Next {dateLabel(s.nextDate)} · {FREQUENCY_LABEL[s.frequency]} · {accountName(s.accountId)}
                  </p>
                </div>
                <Money value={-s.amount} signed className="shrink-0 text-sm font-semibold tabular-nums" />
                <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={() => pay(s.id)}>Pay now</button>
                <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => removeSchedule(s.id)} aria-label={`Remove ${s.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">Payment name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gym" maxLength={40} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Amount ({currencyCode()})</span>
          <input className="field tabular-nums" type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </label>
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">From</span>
          <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.filter((a) => a.kind !== "crypto").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">How often</span>
          <select className="field" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option value="monthly">Every month</option>
            <option value="weekly">Every week</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary sm:col-span-2">Add scheduled payment</button>
      </form>
      <Alert message={error} />
      {notice && <p role="status" className="text-sm font-medium text-success">{notice}</p>}
    </section>
  );
}

/** On Home: bills due in the next few days, with a shortcut to the schedule. */
export function UpcomingBills({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { schedules } = useBank();
  const due = schedules.filter((s) => isDueSoon(s.nextDate));
  if (due.length === 0) return null;
  return (
    <section className="glass reveal flex flex-wrap items-center gap-3 p-4" aria-label="Bills due soon">
      <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{due.length === 1 ? "1 bill due soon" : `${due.length} bills due soon`}</p>
        <p className="truncate text-xs text-muted-foreground">
          {due.map((s) => `${s.name} on ${dateLabel(s.nextDate)}`).join(" · ")}
        </p>
      </div>
      <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => onNavigate("budgets")}>Review</button>
    </section>
  );
}

// ---- Spending chart ----------------------------------------------------------------

export function SpendingChart() {
  const { transactions } = useBank();
  const fmt = useMoneyText();
  const days = dailySpending(transactions, 14);
  const max = Math.max(1, ...days.map((d) => d.amount));
  const total = days.reduce((s, d) => s + d.amount, 0);
  return (
    <section className="glass reveal space-y-4 p-5" aria-labelledby="chart-spend-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="chart-spend-title" className="text-lg font-semibold">Last 14 days</h2>
        <p className="text-sm text-muted-foreground">Out: <Money value={total} /></p>
      </div>
      <div className="flex h-40 items-end gap-1" role="img" aria-label={`Money out over the last 14 days: ${fmt(total)} in total`}>
        {days.map((d) => (
          <div key={d.label} className="flex h-full min-w-0 flex-1 items-end" title={`${d.label}: ${fmt(d.amount)}`}>
            <div
              className="w-full rounded-t-md bg-accent-gradient transition-[height] duration-500 ease-out"
              style={{ height: `${(d.amount / max) * 100}%`, minHeight: d.amount > 0 ? 4 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.label}</span>
        <span>{days[Math.floor(days.length / 2)]?.label}</span>
        <span>{days[days.length - 1]?.label}</span>
      </div>
    </section>
  );
}

// ---- Card controls ---------------------------------------------------------------

/** Settings under each card. They are saved and shown; this demo does not block purchases. */
export function CardControls({ card }: { card: Card }) {
  const { setCardOnline, setCardLimit, reportCardLost } = useBank();
  const [limit, setLimit] = useState(String(card.spendLimit ?? 0));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmLost, setConfirmLost] = useState(false);
  const online = card.onlinePayments ?? true;

  const save = (e: FormEvent) => {
    e.preventDefault();
    const res = setCardLimit(card.id, limit.trim() === "" ? 0 : fromTyped(Number(limit)));
    setError(res.ok ? "" : res.error);
    setNotice(res.ok ? "Limit saved." : "");
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>Online payments</span>
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={online} onChange={(e) => setCardOnline(card.id, e.target.checked)} />
      </label>
      <form onSubmit={save} className="flex items-end gap-2">
        <label className="min-w-0 flex-1 space-y-1 text-xs">
          <span className="text-muted-foreground">Monthly limit ({currencyCode()}, 0 for none)</span>
          <input className="field tabular-nums" type="number" min="0" step="10" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-ghost btn-sm shrink-0">Save limit</button>
      </form>
      <Alert message={error} />
      {notice && <p role="status" className="text-xs font-medium text-success">{notice}</p>}
      <button
        type="button"
        className={`btn btn-sm w-full ${confirmLost ? "btn-danger" : "btn-ghost"}`}
        onClick={() => {
          if (confirmLost) reportCardLost(card.id);
          setConfirmLost(!confirmLost);
        }}
      >
        <Snowflake className="h-4 w-4" aria-hidden /> {confirmLost ? "Tap again to freeze it" : "Report lost or stolen"}
      </button>
    </div>
  );
}
