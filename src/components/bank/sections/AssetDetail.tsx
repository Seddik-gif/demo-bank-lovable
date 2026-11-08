import { currencyCode } from "@/lib/bank/data";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { formatMoney, formatPrice, fromTyped, round2, toDisplayAmount, CASH_ACCOUNT_ID } from "@/lib/bank/data";
import {
  ASSET_NAMES,
  DEPTH_REFRESH_MS,
  FEE_RATE,
  fetchCandles,
  fetchOrderBook,
  simulateBuy,
  simulateSell,
  useMarket,
  type Candle,
  type Fill,
  type Interval,
  type OrderBook,
} from "@/lib/bank/market";
import { useBank } from "@/lib/bank/store";
import { useSettings } from "@/lib/bank/settings";
import { Money, useMoneyText } from "../Money";
import { PriceChart, type ChartMode } from "./PriceChart";

const priceFmt = formatPrice;

const qtyFmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });
const INTERVALS: { id: Interval; label: string }[] = [
  { id: "15m", label: "15 min" },
  { id: "1h", label: "1 hour" },
  { id: "1d", label: "1 day" },
];


function OrderBookTable({ book }: { book: OrderBook }) {
  const asks = book.asks.slice(0, 10).reverse(); // highest ask on top, near the spread
  const bids = book.bids.slice(0, 10);
  const spread = (book.asks[0]?.price ?? 0) - (book.bids[0]?.price ?? 0);
  const row = (price: number, qty: number, side: "ask" | "bid") => (
    <tr key={`${side}-${price}`} className="relative">
      <td className="py-1 pr-2 text-right tabular-nums" style={{ color: side === "ask" ? "var(--destructive)" : "var(--success)" }}>{priceFmt(price)}</td>
      <td className="py-1 pr-2 text-right tabular-nums">{qtyFmt(qty)}</td>
      <td className="py-1 text-right tabular-nums text-muted-foreground">{priceFmt(price * qty)}</td>
    </tr>
  );
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span>Level 2 order book</span>
        <span>Spread {priceFmt(spread)}</span>
      </div>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="pb-1 text-right font-medium">Price ({currencyCode()})</th>
            <th scope="col" className="pb-1 text-right font-medium">Amount</th>
            <th scope="col" className="pb-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {asks.map((l) => row(l.price, l.qty, "ask"))}
          <tr><td colSpan={3} className="py-1 text-center text-sm font-semibold">{priceFmt(book.bids[0]?.price ?? 0)}</td></tr>
          {bids.map((l) => row(l.price, l.qty, "bid"))}
        </tbody>
      </table>
    </div>
  );
}

export function AssetDetail({ base, onBack }: { base: string; onBack: () => void }) {
  const { accounts, crypto, executeTrade } = useBank();
  const { tickers, error: marketError } = useMarket();
  const ticker = tickers.find((t) => t.base === base);
  const name = ASSET_NAMES[base] ?? base;

  const [interval, setInterval_] = useState<Interval>("1h");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartError, setChartError] = useState("");
  const [chartMode, setChartMode] = useState<ChartMode>("line");

  const [book, setBook] = useState<OrderBook | null>(null);
  const [bookError, setBookError] = useState("");

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const settings = useSettings();
  const fmt = useMoneyText();
  const [amount, setAmount] = useState(() => (settings.defaultOrderUsd > 0 ? String(Math.round(toDisplayAmount(settings.defaultOrderUsd) * 100) / 100) : ""));
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Candles: refetched when the interval changes, and once a minute.
  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      fetchCandles(base, interval, controller.signal)
        .then((c) => { setCandles(c); setChartError(""); })
        .catch((e) => { if (!controller.signal.aborted) setChartError(e instanceof Error ? e.message : "Chart unavailable."); });
    load();
    const id = window.setInterval(load, 60_000);
    return () => { controller.abort(); window.clearInterval(id); };
  }, [base, interval]);

  // Level 2 order book, refreshed every few seconds while the tab is visible.
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (document.hidden) return;
      fetchOrderBook(base, controller.signal)
        .then((b) => { setBook(b); setBookError(""); })
        .catch((e) => { if (!controller.signal.aborted) setBookError(e instanceof Error ? e.message : "Order book unavailable."); });
    };
    load();
    const id = window.setInterval(load, DEPTH_REFRESH_MS);
    return () => { controller.abort(); window.clearInterval(id); };
  }, [base]);

  const cash = accounts.find((a) => a.id === CASH_ACCOUNT_ID)?.balance ?? 0;
  const held = crypto[base] ?? 0;
  const entered = side === "buy" ? fromTyped(Number(amount)) : Number(amount);
  const validAmount = amount.trim() !== "" && Number.isFinite(entered) && entered > 0;

  // Preview of the fill against the current order book.
  const preview: Fill | null = useMemo(() => {
    if (!book || !validAmount) return null;
    return side === "buy" ? simulateBuy(book.asks, entered) : simulateSell(book.bids, entered);
  }, [book, side, entered, validAmount]);

  const fee = preview ? round2(preview.quote * FEE_RATE) : 0;
  const total = preview ? (side === "buy" ? round2(preview.quote + fee) : round2(preview.quote - fee)) : 0;

  let blocker = "";
  if (!book) blocker = bookError || "Waiting for the order book…";
  else if (!validAmount) blocker = side === "buy" ? `Enter an amount in ${currencyCode()} to buy.` : `Enter how much ${base} to sell.`;
  else if (preview && !preview.complete)
    blocker = `Not enough liquidity: the order book can only fill part of this order at current prices.`;
  else if (side === "buy" && preview && preview.quote + fee > cash) blocker = `Not enough cash: you have ${fmt(cash)}.`;
  else if (side === "sell" && entered > held) blocker = `You hold ${qtyFmt(held)} ${base}.`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (blocker || busy) return;
    if (settings.confirmTrades && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy(true);
    setMsg(null);
    try {
      // Re-read the order book right before filling, so the order uses current liquidity.
      const fresh = await fetchOrderBook(base);
      setBook(fresh);
      const fill = side === "buy" ? simulateBuy(fresh.asks, entered) : simulateSell(fresh.bids, entered);
      if (!fill.complete) {
        setMsg({ ok: false, text: "Liquidity changed before your order filled. Check the preview and try again." });
        return;
      }
      const res = executeTrade({ base, side, qty: fill.qty, quote: fill.quote, feeRate: FEE_RATE });
      if (res.ok) {
        setMsg({ ok: true, text: `${side === "buy" ? "Bought" : "Sold"} ${qtyFmt(fill.qty)} ${base} at an average ${priceFmt(fill.avgPrice)}.` });
        setAmount("");
      } else setMsg({ ok: false, text: res.error });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not reach the market. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="btn btn-ghost btn-sm">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to market
      </button>

      <section className="glass reveal p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{name} · {base}/{currencyCode()}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{ticker ? priceFmt(ticker.price) : "—"}</p>
          </div>
          {ticker && (
            <div className="text-right text-sm tabular-nums">
              <p className={ticker.change24h >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                {ticker.change24h >= 0 ? "▲" : "▼"} {Math.abs(ticker.change24h).toFixed(2)}% (24h)
              </p>
              <p className="text-muted-foreground">24h range {priceFmt(ticker.low)} – {priceFmt(ticker.high)}</p>
            </div>
          )}
        </div>
        {marketError && <p className="mt-3 text-sm text-destructive">Live price unavailable: {marketError}</p>}
      </section>

      <section className="glass reveal p-5 sm:p-6" aria-labelledby="chart-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="chart-title" className="text-lg font-semibold">Chart</h2>
          <div className="flex gap-1" role="group" aria-label="Chart type">
            {(["line", "candles"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setChartMode(m)}
                aria-pressed={chartMode === m}
                className={`btn btn-sm ${chartMode === m ? "btn-primary" : "btn-ghost"}`}
              >
                {m === "line" ? "Line" : "Candles"}
              </button>
            ))}
          </div>
          <div className="flex gap-1" role="group" aria-label="Chart interval">
            {INTERVALS.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setInterval_(i.id)}
                aria-pressed={interval === i.id}
                className={`btn btn-sm ${interval === i.id ? "btn-primary" : "btn-ghost"}`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
        <PriceChart candles={candles} mode={chartMode} interval={interval} />
        {chartError && <p className="mt-2 text-xs text-destructive">{chartError}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass reveal p-5 sm:p-6">
          {book ? <OrderBookTable book={book} /> : <p className="text-sm text-muted-foreground">{bookError || "Loading order book…"}</p>}
        </section>

        <section className="glass reveal p-5 sm:p-6" aria-labelledby="trade-title">
          <h2 id="trade-title" className="text-lg font-semibold">Trade (simulated)</h2>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Order side">
            <button type="button" aria-pressed={side === "buy"} onClick={() => { setSide("buy"); setConfirming(false); }} className={`btn ${side === "buy" ? "btn-primary" : "btn-ghost"}`}>Buy</button>
            <button type="button" aria-pressed={side === "sell"} onClick={() => { setSide("sell"); setConfirming(false); }} className={`btn ${side === "sell" ? "btn-danger" : "btn-ghost"}`}>Sell</button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Available: {side === "buy" ? <><Money value={cash} /> cash</> : `${qtyFmt(held)} ${base}`}
          </p>

          <form onSubmit={submit} className="mt-3 space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">{side === "buy" ? `Amount to spend (${currencyCode()})` : `Amount to sell (${base})`}</span>
              <input className="field" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} placeholder="0.00" />
            </label>

            {preview && (
              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-3 text-sm">
                <dt className="text-muted-foreground">You {side === "buy" ? "get" : "sell"}</dt>
                <dd className="text-right tabular-nums">{qtyFmt(preview.qty)} {base}</dd>
                <dt className="text-muted-foreground">Average price</dt>
                <dd className="text-right tabular-nums">{priceFmt(preview.avgPrice)}</dd>
                <dt className="text-muted-foreground">Fee (0.1%)</dt>
                <dd className="text-right tabular-nums"><Money value={fee} /></dd>
                <dt className="text-muted-foreground">{side === "buy" ? "Total cost" : "You receive"}</dt>
                <dd className="text-right font-semibold tabular-nums"><Money value={total} /></dd>
              </dl>
            )}

            {blocker && <p className="text-xs text-muted-foreground" role="status">{blocker}</p>}

            <button type="submit" disabled={!!blocker || busy} className={`btn w-full ${side === "buy" ? "btn-primary" : "btn-danger"} disabled:opacity-50`}>
              {busy
                ? "Checking the order book…"
                : confirming
                  ? `Tap again to confirm ${side === "buy" ? "buy" : "sell"} ${base}`
                  : side === "buy" ? `Buy ${base}` : `Sell ${base}`}
            </button>
            {msg && <p role="status" className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Orders fill against the live order book using demo money. Nothing is sent to an exchange.
          </p>
        </section>
      </div>
    </div>
  );
}
