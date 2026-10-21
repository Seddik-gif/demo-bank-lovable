import { useMemo, useState, type FormEvent } from "react";
import { formatMoney, round2, spentInCategory, type Budget } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { SectionHeader } from "../Layout";
import { GoalsPanel, SchedulesPanel, SpendingChart } from "./MoneyPlanning";

function BudgetRow({ budget }: { budget: Budget }) {
  const { transactions, setLimit, deleteBudget } = useBank();
  const spent = spentInCategory(budget.category, transactions);
  const over = round2(spent - budget.limit);
  const pct = Math.min(100, (spent / budget.limit) * 100);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState(String(budget.limit));
  const [error, setError] = useState("");

  const save = (e: FormEvent) => {
    e.preventDefault();
    const res = setLimit(budget.id, draft.trim() === "" ? NaN : Number(draft));
    if (res.ok) {
      setEditing(false);
      setError("");
    } else setError(res.error);
  };

  return (
    <li className="glass reveal min-w-0 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate font-semibold">{budget.category}</h3>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          <Money value={spent} /> of <Money value={budget.limit} />
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={`${budget.category} budget used`}>
        <div className={`grow-bar h-full rounded-full ${over > 0 ? "bg-destructive" : "bg-accent-gradient"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-2 text-xs font-medium ${over > 0 ? "text-destructive" : "text-muted-foreground"}`}>
        {over > 0 ? <>Over budget by <Money value={over} /></> : <><Money value={round2(budget.limit - spent)} /> left</>}
      </p>

      {editing ? (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Monthly limit for {budget.category}</span>
            <input className="field" type="number" step="0.01" inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          </label>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setError(""); setDraft(String(budget.limit)); }}>Cancel</button>
          {error && <p role="alert" className="w-full text-xs font-medium text-destructive">{error}</p>}
        </form>
      ) : confirming ? (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm deleting ${budget.category}`}>
          <p className="text-sm">Delete this budget?</p>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep</button>
          <button className="btn btn-danger btn-sm" onClick={() => deleteBudget(budget.id)}>Delete budget</button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit limit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>Delete</button>
        </div>
      )}
    </li>
  );
}

export function BudgetsSection() {
  const { budgets, transactions, addBudget } = useBank();
  const [name, setName] = useState("");
  const [limit, setLimitValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const suggestions = useMemo(() => {
    const used = new Set(budgets.map((b) => b.category.toLowerCase()));
    return [...new Set(transactions.map((t) => t.category))].filter((c) => !used.has(c.toLowerCase()));
  }, [budgets, transactions]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = addBudget(name, limit.trim() === "" ? NaN : Number(limit));
    if (res.ok) {
      setMsg({ ok: true, text: `Added ${name.trim()}.` });
      setName("");
      setLimitValue("");
    } else setMsg({ ok: false, text: res.error });
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Budgets" subtitle="Monthly limits, tracked from your transactions." />
      {budgets.length === 0 ? (
        <p className="glass p-6 text-center text-sm text-muted-foreground">No budgets yet. Add one below.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {budgets.map((b) => <BudgetRow key={b.id} budget={b} />)}
        </ul>
      )}
      <SpendingChart />
      <GoalsPanel />
      <SchedulesPanel />

      <section className="glass reveal p-5 sm:p-6" aria-labelledby="add-budget">
        <h2 id="add-budget" className="text-lg font-semibold">Add a budget category</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-muted-foreground">Category name</span>
            <input className="field" list="category-suggestions" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shopping" />
            <datalist id="category-suggestions">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label className="min-w-0 space-y-1.5 text-sm">
            <span className="text-muted-foreground">Monthly limit (USD)</span>
            <input className="field" type="number" step="0.01" inputMode="decimal" value={limit} onChange={(e) => setLimitValue(e.target.value)} placeholder="0.00" />
          </label>
          <button type="submit" className="btn btn-primary">Add budget</button>
        </form>
        {msg && <p role="status" className={`mt-3 text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
      </section>
    </div>
  );
}
