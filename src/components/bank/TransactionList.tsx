import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { type Transaction } from "@/lib/bank/data";
import { Money } from "./Money";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** A list of transactions. Pass onSelect to make each row clickable (it opens the details). */
export function TransactionList({ items, onSelect }: { items: Transaction[]; onSelect?: (t: Transaction) => void }) {
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => {
        const isIn = t.amount > 0;
        const body = (
          <>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary ${isIn ? "text-success" : "text-muted-foreground"}`}>
              {isIn ? <ArrowDownLeft className="h-4 w-4" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.description}</p>
              <p className="text-xs text-muted-foreground">
                {t.category} · {dateFmt.format(new Date(t.date))}
                {t.status === "pending" && <span className="ml-1 font-semibold text-accent">· Pending</span>}
              </p>
            </div>
            <Money value={t.amount} signed className={`shrink-0 text-sm font-semibold tabular-nums ${isIn ? "text-success" : ""}`} />
          </>
        );
        return (
          <li key={t.id} className="reveal py-3">
            {onSelect ? (
              <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => onSelect(t)}>
                {body}
              </button>
            ) : (
              <div className="flex items-center gap-3">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
