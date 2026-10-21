import { round2, spentInCategory, type Budget, type Transaction } from "./data";

/** How many categories get their own slice. The rest are grouped as "Other". */
export const SLICE_LIMIT = 6;

/** Moves between your own accounts are not spending, so they are left out of the pie. */
const NOT_SPENDING = new Set(["Transfer"]);

export interface SpendingSlice {
  label: string;
  value: number;
  budget?: Budget;
}

/**
 * Money spent by category, biggest first. Categories beyond SLICE_LIMIT are grouped as "Other".
 * Each slice carries its budget when the category has one.
 */
export function spendingSlices(transactions: Transaction[], budgets: Budget[]): SpendingSlice[] {
  const categories = [...new Set(transactions.map((t) => t.category))].filter((c) => !NOT_SPENDING.has(c));
  const spent = categories
    .map((c) => ({ label: c, value: spentInCategory(c, transactions) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const top = spent.slice(0, SLICE_LIMIT);
  const rest = spent.slice(SLICE_LIMIT).reduce((s, x) => s + x.value, 0);
  const slices: SpendingSlice[] = top.map((x) => {
    const budget = budgets.find((b) => b.category.toLowerCase() === x.label.toLowerCase());
    return { label: x.label, value: round2(x.value), ...(budget ? { budget } : {}) };
  });
  if (rest > 0) slices.push({ label: "Other", value: round2(rest) });
  return slices;
}
