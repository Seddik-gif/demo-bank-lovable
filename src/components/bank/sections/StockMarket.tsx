import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatMoney, round2, type Account } from "@/lib/bank/data";
import { acquireStocks, feedSource, STOCKS, useStockQuotes, type StockQuote } from "@/lib/bank/stocks";
import { useBank } from "@/lib/bank/store";
import { SheetBackdrop, SheetPanel } from "../motion";

/** The stock list on the Invest page: live prices, a badge for the source, and a trade sheet for each stock. */
export function StockMarket() {
  const quotes = useStockQuotes();
  const [trading, setTrading] = useState<string | null>(null);
  useEffect(() => acquireStocks(), []);
  const source = feedSource();

  return (
    <section className="glass reveal space-y-4 p-5 sm:p-6" aria-labelledby="stocks-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="stocks-title" className="text-lg font-semibold">Stocks</h2>
          <p className="text-sm text-muted-foreground">US stocks. Trades are simulated at the price shown.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${source === "live" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
          <span className={`h-2 w-2 rounded-full ${source === "live" ? "animate-pulse bg-success" : "bg-muted-foreground"}`} aria-hidden />
          {source === "live" ? "Live quotes" : "Simulated prices"}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {STOCKS.map((s) => {
          const q = quotes[s.symbol];
          const up = (q?.changePct ?? 0) >= 0;
          return (
            <li key={s.symbol} className="flex min-w-0 items-center gap-3 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-bold" aria-hidden>{s.symbol.slice(0, 4)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.symbol} <span className="font-normal text-muted-foreground">{s.name}</span></p>
                <p className={`text-xs font-medium tabular-nums ${up ? "text-success" : "text-destructive"}`}>{up ? "▲" : "▼"} {Math.abs(q?.changePct ?? 0).toFixed(2)}% today</p>
              </div>
              <FlashPrice price={q?.price ?? s.basePrice} />
              <button type="button" className="btn btn-ghost btn-sm shrink-0 rounded-full" onClick={() => setTrading(s.symbol)}>
                Trade<span className="sr-only"> {s.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {trading && <TradeStockSheet symbol={trading} onClose={() => setTrading(null)} />}
    </section>
  );
}

/** A price that briefly turns green or red when it moves, so changes are easy to see. */
function FlashPrice({ price }: { price: number }) {
  const last = useRef(price);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (price === last.current) return;
    setDir(price > last.current ? "up" : "down");
    last.current = price;
    const t = window.setTimeout(() => setDir(null), 600);
    return () => window.clearTimeout(t);
  }, [price]);
  const colour = dir === "up" ? "text-success" : dir === "down" ? "text-destructive" : "";
  return <span className={`shrink-0 font-semibold tabular-nums transition-colors duration-500 ${colour}`} aria-label={`Price ${formatMoney(price)}`}>{formatMoney(price)}</span>;
}

/** Buy or sell one stock at its current price, from an investment account. */
export function TradeStockSheet({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const { accounts, investments, investBuy, investSell } = useBank();
  const quote: StockQuote | undefined = useStockQuotes()[symbol];
  const stock = STOCKS.find((s) => s.symbol === symbol)!;
  const price = quote?.price ?? stock.basePrice;
  const invest: Account | undefined = accounts.find((a) => a.kind === "invest");
  const held = investments[symbol] ?? 0;
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const value = Number(amount);
  const units = round2(value / price);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!invest) return;
    const res = side === "buy" ? investBuy(invest.id, symbol, value, price) : investSell(invest.id, symbol, value, price);
    if (!res.ok) {
      setMsg({ ok: false, text: res.error });
      return;
    }
    setMsg({
      ok: true,
      text: side === "buy" ? `Bought ${units} ${symbol} at ${formatMoney(price)}.` : `Sold ${value} ${symbol} at ${formatMoney(price)}.`,
    });
    setAmount("");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Trade ${symbol}`}>
      <SheetBackdrop onClick={onClose} label="Close" />
      <SheetPanel onClose={onClose} className="glass flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-b-none p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold">{symbol} · {stock.name}</p>
            <p className="text-sm tabular-nums text-muted-foreground">{formatMoney(price)} per share · you hold {held}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        {!invest ? (
          <p className="mt-5 text-sm text-muted-foreground">Open an Investments account first, then you can trade here.</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Buy or sell">
              {(["buy", "sell"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={side === s} onClick={() => { setSide(s); setMsg(null); }} className={`btn rounded-full ${side === s ? "btn-primary" : "btn-ghost"}`}>
                  {s === "buy" ? "Buy" : "Sell"}
                </button>
              ))}
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">{side === "buy" ? `Amount in USD, from ${invest.name} (${formatMoney(invest.balance)} available)` : `Shares to sell (you hold ${held})`}</span>
              <input className="field tabular-nums" type="number" min="0" step={side === "buy" ? "1" : "any"} inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setMsg(null); }} required />
            </label>
            {Number.isFinite(value) && value > 0 && (
              <p className="text-sm tabular-nums text-muted-foreground">
                {side === "buy" ? `About ${units} shares` : `About ${formatMoney(round2(value * price))}`}
              </p>
            )}
            <button type="submit" className="btn btn-primary w-full rounded-full">
              {side === "buy" ? `Buy ${symbol}` : `Sell ${symbol}`}
            </button>
            {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
          </form>
        )}
      </SheetPanel>
    </div>,
    document.body,
  );
}
