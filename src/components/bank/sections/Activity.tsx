import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { round2, type Transaction } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { SectionHeader } from "../Layout";
import { TransactionList } from "../TransactionList";
import { TransactionSheet } from "./TransactionSheet";

type TypeFilter = "all" | "in" | "out";

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

  return (
    <div className="space-y-6">
      <SectionHeader title="Transactions" subtitle="Search and filter your activity." />
      <div className="glass reveal grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="min-w-0">
          <span className="sr-only">Search transactions</span>
          <input className="field" type="search" placeholder="Search description or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Category</span>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Type</span>
          <select className="field" value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
            <option value="all">All</option>
            <option value="in">Money in</option>
            <option value="out">Money out</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} of {transactions.length} transactions · net <Money value={net} signed />
      </p>
      <section className="glass px-5 py-2">
        {filtered.length ? (
          <TransactionList items={filtered} onSelect={setSelected} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Nothing matches those filters</p>
            <p className="text-sm text-muted-foreground">Try a different search or reset the dropdowns.</p>
          </div>
        )}
      </section>
      {selected && <TransactionSheet txn={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
