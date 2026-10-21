import { useState } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { CATEGORIES, type Transaction } from "@/lib/bank/data";
import { payeeOf, spentOn } from "@/lib/bank/money";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";

type Scope = "month" | "all";

function ScopeToggle({ value, onChange, label }: { value: Scope; onChange: (v: Scope) => void; label: string }) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-0.5" role="group" aria-label={label}>
      {(["month", "all"] as const).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${value === s ? "bg-accent-gradient text-primary-foreground" : "text-muted-foreground"}`}
        >
          {s === "month" ? "This month" : "All"}
        </button>
      ))}
    </div>
  );
}

/** Details for one transaction: amount, category (changeable), totals, and blocking the next payment. */
export function TransactionSheet({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const { transactions, accounts, schedules, blockedNext, setTransactionCategory, blockNextPayment, unblockNextPayment } = useBank();
  // Read the latest copy, so a category change shows straight away.
  const current = transactions.find((t) => t.id === txn.id) ?? txn;
  const [categoryScope, setCategoryScope] = useState<Scope>("month");
  const [payeeScope, setPayeeScope] = useState<Scope>("month");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const now = new Date();
  const isOut = current.amount < 0;
  const accountName = accounts.find((a) => a.id === current.accountId)?.name ?? "";
  const categoryTotal = spentOn(transactions, { category: current.category }, categoryScope === "month" ? now : null);
  const payeeTotal = spentOn(transactions, { description: current.description }, payeeScope === "month" ? now : null);
  // Blocks are kept by payee name, the same name a contact or a bill is paid under.
  const payee = payeeOf(current.description);
  const blocked = blockedNext.includes(payee);
  const hasSchedule = schedules.some((s) => s.name === payee);
  const categoryOptions = CATEGORIES.includes(current.category as (typeof CATEGORIES)[number])
    ? [...CATEGORIES]
    : [current.category, ...CATEGORIES];

  const changeCategory = (value: string) => {
    const res = setTransactionCategory(current.id, value);
    setError(res.ok ? "" : res.error);
    setNotice(res.ok ? `Moved to ${value}. Budgets and totals are updated.` : "");
  };

  const toggleBlock = () => {
    if (blocked) {
      unblockNextPayment(payee);
      setNotice("Block removed.");
    } else {
      blockNextPayment(payee);
      setNotice(`The next payment to ${payee} will be stopped.`);
    }
    setError("");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Transaction details">
      <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close details" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="min-w-0 truncate text-lg font-semibold">{current.description}</h2>
          <button className="btn btn-ghost btn-sm shrink-0" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        <div className="space-y-5 overflow-y-auto overscroll-contain p-5 pb-8">
          <div>
            <p className="text-xs text-muted-foreground">
              {new Date(current.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {accountName}
            </p>
            <p className={`mt-1 font-display text-3xl font-semibold tabular-nums ${isOut ? "" : "text-success"}`}>
              <Money value={current.amount} signed />
            </p>
            <p className="text-xs text-muted-foreground">{isOut ? "Money spent" : "Money received"}</p>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Category</span>
            <select className="field" value={current.category} onChange={(e) => changeCategory(e.target.value)}>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          <div className="glass space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Spent on {current.category}</p>
              <ScopeToggle value={categoryScope} onChange={setCategoryScope} label="Category total period" />
            </div>
            <p className="text-2xl font-semibold tabular-nums"><Money value={categoryTotal} /></p>
            <p className="text-xs text-muted-foreground">{categoryScope === "month" ? "This calendar month" : "Since the account was opened"}</p>
          </div>

          <div className="glass space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Spent with {current.description}</p>
              <ScopeToggle value={payeeScope} onChange={setPayeeScope} label="Payee total period" />
            </div>
            <p className="text-2xl font-semibold tabular-nums"><Money value={payeeTotal} /></p>
            <p className="text-xs text-muted-foreground">{payeeScope === "month" ? "This calendar month" : "Since the account was opened"}</p>
          </div>

          {isOut ? (
            <div className="glass space-y-3 p-4">
              <p className="text-sm font-medium">Block the next payment</p>
              <p className="text-xs text-muted-foreground">
                {blocked
                  ? `The next payment to ${payee} will be stopped. The block is used once.`
                  : `Stops the next payment to ${payee}: a contact payment, a request you pay, or a scheduled bill with that name.`}
              </p>
              <button type="button" className={`btn w-full ${blocked ? "btn-ghost" : "btn-danger"}`} onClick={toggleBlock}>
                <Ban className="h-4 w-4" aria-hidden /> {blocked ? "Remove the block" : "Block the next payment"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Money received cannot be blocked.</p>
          )}

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm font-medium text-success">{notice}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
