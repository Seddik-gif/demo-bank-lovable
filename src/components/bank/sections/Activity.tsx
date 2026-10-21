import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { formatMoney, round2, type Transaction } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { SectionHeader } from "../Layout";
import { TransactionList } from "../TransactionList";
import { ReceiptIllustration } from "../Illustrations";
import { TransactionSheet } from "./TransactionSheet";

type TypeFilter = "all" | "in" | "out";

const TYPE_LABEL: Record<TypeFilter, string> = { all: "All", in: "Money in", out: "Money out" };
const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

/** Groups transactions by day, newest day first. Transactions are already newest first. */
function byDay(items: Transaction[]): { day: string; items: Transaction[] }[] {
  const groups: { day: string; items: Transaction[] }[] = [];
  for (const t of items) {
    const day = dayFmt.format(new Date(t.date));
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(t);
    else groups.push({ day, items: [t] });
  }
  return groups;
}

export function ActivitySection() {
  const { transactions } = useBank();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))].sort(), [transactions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (!q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) &&
        (category === "all" || t.category === category) &&
        (type === "all" || (type === "in" ? t.amount > 0 : t.amount < 0)),
    );
  }, [transactions, query, category, type]);

  const net = round2(filtered.reduce((s, t) => s + t.amount, 0));
  const moneyIn = round2(filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0));
  const moneyOut = round2(filtered.filter((t) => t.amount < 0).reduce((s, t) => s + -t.amount, 0));
  const groups = useMemo(() => byDay(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Transactions" subtitle="Search and filter your activity." />

      {transactions.length === 0 ? (
        <div className="glass grid place-items-center gap-3 p-8 text-center">
          <ReceiptIllustration className="h-24 w-24" />
          <p className="font-medium">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Payments, transfers and trades show up here as you make them.</p>
        </div>
      ) : (
        <>
          {/* Summary: the net amount, with money in and money out beside it. */}
          <section className="glass reveal grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_1fr]" aria-label="Summary">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Net</p>
              <p className="font-display text-2xl font-semibold tabular-nums"><Money value={net} signed /></p>
              <p className="text-xs text-muted-foreground">{filtered.length} of {transactions.length} transactions</p>
            </div>
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Money in</p>
              <p className="font-semibold tabular-nums text-success">{formatMoney(moneyIn)}</p>
            </div>
            <div className="rounded-2xl bg-secondary p-3">
              <p className="text-xs text-muted-foreground">Money out</p>
              <p className="font-semibold tabular-nums">{formatMoney(moneyOut)}</p>
            </div>
          </section>

          {/* Filters: a row of type pills, then search and category. */}
          <section className="glass reveal space-y-3 p-4" aria-label="Filters">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
              {(["all", "in", "out"] as const).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`btn btn-sm rounded-full ${type === t ? "btn-primary" : "btn-ghost"}`}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <label className="min-w-0">
                <span className="sr-only">Search transactions</span>
                <input className="field rounded-full px-4" type="search" placeholder="Search description or category" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label className="min-w-0">
                <span className="sr-only">Category</span>
                <select className="field rounded-full px-4" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
          </section>

          {filtered.length === 0 ? (
            <div className="glass flex flex-col items-center gap-2 py-12 text-center">
              <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">Nothing matches those filters</p>
              <p className="text-sm text-muted-foreground">Try a different search or reset the filters.</p>
            </div>
          ) : (
            <div className="space-y-5" aria-live="polite">
              {groups.map((g) => (
                <section key={g.day} aria-label={g.day}>
                  <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</h2>
                  <div className="glass px-5 py-2">
                    <TransactionList items={g.items} onSelect={setSelected} />
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {selected && <TransactionSheet txn={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
