import { motion, useReducedMotion } from "framer-motion";
import { formatMoney, round2 } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { spendingSlices } from "@/lib/bank/spending";

/** Colours for the slices, in order. Same family as the card palette. "Other" is grey. */
const COLOURS = ["#a78bfa", "#67e8f9", "#6ee7b7", "#fcd34d", "#f9a8d4", "#fb923c", "#93c5fd", "#c4b5fd"];

/** The slices with their colours. */
function coloured(transactions: Parameters<typeof spendingSlices>[0], budgets: Parameters<typeof spendingSlices>[1]) {
  return spendingSlices(transactions, budgets).map((s, i) => ({
    ...s,
    colour: s.label === "Other" ? "#94a3b8" : COLOURS[i % COLOURS.length]!,
  }));
}

const CX = 100;
const CY = 100;
const R_OUT = 84;
const R_IN = 56;

/** The path of one ring segment between two angles (in radians, starting at the top). */
function segment(a0: number, a1: number): string {
  // A full circle cannot be one arc, so a near-full sweep is split in two.
  const sweep = Math.min(a1 - a0, Math.PI * 2 - 0.0001);
  const end = a0 + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const point = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
  const [x0, y0] = point(R_OUT, a0);
  const [x1, y1] = point(R_OUT, end);
  const [x2, y2] = point(R_IN, end);
  const [x3, y3] = point(R_IN, a0);
  return `M${x0} ${y0} A${R_OUT} ${R_OUT} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${R_IN} ${R_IN} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function SpendingPie() {
  const { transactions, budgets } = useBank();
  const reduce = useReducedMotion();
  const slices = coloured(transactions, budgets);
  const total = round2(slices.reduce((s, x) => s + x.value, 0));

  return (
    <section className="glass reveal p-5 sm:p-6" aria-labelledby="pie-title">
      <h2 id="pie-title" className="text-lg font-semibold">Where your money went</h2>
      <p className="mt-1 text-sm text-muted-foreground">Spending by category.</p>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No spending yet.</p>
      ) : (
        <div className="mt-5 grid items-center gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
          <div className="relative mx-auto w-52">
            <motion.svg
              viewBox="0 0 200 200"
              className="h-52 w-52"
              role="img"
              aria-label={`Spending pie chart, ${formatMoney(total)} in total`}
              initial={reduce ? false : { scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 180, damping: 20 }}
            >
              {(() => {
                let angle = -Math.PI / 2;
                return slices.map((s) => {
                  const a0 = angle;
                  angle += (s.value / total) * Math.PI * 2;
                  return <path key={s.label} d={segment(a0, angle)} fill={s.colour} stroke="var(--background)" strokeWidth="2" />;
                });
              })()}
            </motion.svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spent</p>
                <p className="font-display text-lg font-semibold tabular-nums">{formatMoney(total)}</p>
              </div>
            </div>
          </div>

          <ul className="min-w-0 space-y-2">
            {slices.map((s) => {
              const pct = Math.round((s.value / total) * 100);
              const over = s.budget ? round2(s.value - s.budget.limit) : 0;
              return (
                <li key={s.label} className="flex min-w-0 items-center gap-3 text-sm">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.colour }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{pct}%</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(s.value)}</span>
                  {s.budget && (
                    <span className={`hidden shrink-0 text-xs sm:inline ${over > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {over > 0 ? "over" : "in budget"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
