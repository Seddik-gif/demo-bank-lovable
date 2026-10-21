import { useState, type PointerEvent } from "react";
import type { Candle, Interval } from "@/lib/bank/market";

export type ChartMode = "line" | "candles";

const W = 600;
const H = 260;
const PAD = 12;
const GRID_LINES = 4;

const priceFmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 6 : 2,
  }).format(n);

const pctFmt = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;

const timeFmt = (interval: Interval) =>
  new Intl.DateTimeFormat("en-US", interval === "1d"
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** Price chart with a summary, price gridlines, time labels, and an inspect tooltip. */
export function PriceChart({ candles, mode, interval }: { candles: Candle[]; mode: ChartMode; interval: Interval }) {
  const [hover, setHover] = useState<number | null>(null);

  if (candles.length < 2) return <div className="h-64 animate-pulse rounded-xl bg-secondary" aria-label="Loading chart" />;

  const n = candles.length;
  const first = candles[0]!;
  const last = candles[n - 1]!;
  const rangeHigh = Math.max(...candles.map((c) => c.high));
  const rangeLow = Math.min(...candles.map((c) => c.low));
  const min = mode === "candles" ? rangeLow : Math.min(...candles.map((c) => c.close));
  const max = mode === "candles" ? rangeHigh : Math.max(...candles.map((c) => c.close));
  const span = max - min || 1;
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - 2 * PAD);
  const yPct = (v: number) => (y(v) / H) * 100;

  // Horizontal position of candle i, as a fraction of the chart width.
  const xFrac = (i: number) => (mode === "candles" ? (i + 0.5) / n : i / (n - 1));

  const change = ((last.close - first.open) / first.open) * 100;
  const up = change >= 0;
  const color = up ? "var(--success)" : "var(--destructive)";

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const idx = mode === "candles" ? Math.floor(frac * n) : Math.round(frac * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  };

  const h = hover !== null ? candles[hover] : undefined;
  const hx = hover !== null ? xFrac(hover) * 100 : 0;
  const hy = h ? yPct(h.close) : 0;
  const tooltipLeft = hx > 62;

  const gridValues = Array.from({ length: GRID_LINES + 1 }, (_, i) => max - (i / GRID_LINES) * span);

  const linePts = candles.map((c, i) => `${(xFrac(i) * W).toFixed(1)},${y(c.close).toFixed(1)}`);
  const linePath = `M${linePts.join(" L")}`;
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const bodyW = Math.max(2, (W / n) * 0.6);

  const timeLabels = [first.time, candles[Math.floor(n / 2)]!.time, last.time];
  const time = timeFmt(interval);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-secondary p-3">
          <dt className="text-xs text-muted-foreground">Last price</dt>
          <dd className="font-semibold tabular-nums">{priceFmt(last.close)}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <dt className="text-xs text-muted-foreground">Change in range</dt>
          <dd className={`font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}>{pctFmt(change)}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <dt className="text-xs text-muted-foreground">High</dt>
          <dd className="font-semibold tabular-nums">{priceFmt(rangeHigh)}</dd>
        </div>
        <div className="rounded-xl bg-secondary p-3">
          <dt className="text-xs text-muted-foreground">Low</dt>
          <dd className="font-semibold tabular-nums">{priceFmt(rangeLow)}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">
        {mode === "candles"
          ? "Each candle is one period: green closed higher than it opened, red closed lower. Hover or touch to inspect."
          : "The line shows the closing price of each period. Hover or touch the chart to inspect a point."}
      </p>

      {/* Chart with price axis */}
      <div className="relative flex gap-2">
        <div className="relative min-w-0 flex-1 select-none touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {/* Gridlines */}
          {gridValues.map((v, i) => (
            <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-border" style={{ top: `${(i / GRID_LINES) * 100}%` }} aria-hidden />
          ))}

          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-64 w-full" role="img" aria-label={`${mode === "candles" ? "Candlestick" : "Line"} price chart. Low ${priceFmt(rangeLow)}, high ${priceFmt(rangeHigh)}.`}>
            <defs>
              <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {mode === "line" ? (
              <>
                <path d={areaPath} fill="url(#chart-fill)" />
                <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </>
            ) : (
              candles.map((c, i) => {
                const cx = xFrac(i) * W;
                const bull = c.close >= c.open;
                const col = bull ? "var(--success)" : "var(--destructive)";
                const top = y(Math.max(c.open, c.close));
                const bottom = y(Math.min(c.open, c.close));
                return (
                  <g key={c.time}>
                    <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={col} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <rect x={cx - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={col} />
                  </g>
                );
              })
            )}
          </svg>

          {h && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${hx}%` }} aria-hidden />
              <div className="pointer-events-none absolute h-px w-full bg-foreground/25" style={{ top: `${hy}%` }} aria-hidden />
              {mode === "line" && (
                <div className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-background" style={{ left: `${hx}%`, top: `${hy}%`, background: color }} aria-hidden />
              )}
              <div
                className="glass pointer-events-none absolute top-2 z-10 min-w-[10rem] p-3 text-xs"
                style={tooltipLeft ? { right: "0.5rem" } : { left: `calc(${hx}% + 0.75rem)` }}
                role="status"
              >
                <p className="text-muted-foreground">{time.format(new Date(h.time))}</p>
                {mode === "candles" ? (
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
                    <dt className="text-muted-foreground">Open</dt><dd className="text-right">{priceFmt(h.open)}</dd>
                    <dt className="text-muted-foreground">High</dt><dd className="text-right">{priceFmt(h.high)}</dd>
                    <dt className="text-muted-foreground">Low</dt><dd className="text-right">{priceFmt(h.low)}</dd>
                    <dt className="text-muted-foreground">Close</dt><dd className="text-right font-semibold">{priceFmt(h.close)}</dd>
                  </dl>
                ) : (
                  <p className="mt-1 text-base font-semibold tabular-nums">{priceFmt(h.close)}</p>
                )}
              </div>
              <div className="pointer-events-none absolute right-0 z-10 -translate-y-1/2 rounded-md bg-accent-gradient px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums" style={{ top: `${hy}%` }}>
                {priceFmt(h.close)}
              </div>
            </>
          )}
        </div>

        {/* Price axis */}
        <div className="relative w-20 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground" aria-hidden>
          {gridValues.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / GRID_LINES) * 100}%` }}>
              {priceFmt(v)}
            </span>
          ))}
        </div>
      </div>

      {/* Time axis */}
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums" style={{ paddingRight: "5.5rem" }}>
        {timeLabels.map((t) => (
          <span key={t}>{time.format(new Date(t))}</span>
        ))}
      </div>
    </div>
  );
}
