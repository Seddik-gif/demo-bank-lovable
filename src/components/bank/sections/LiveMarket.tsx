import { useEffect } from "react";
import { ChevronRight, Radio } from "lucide-react";
import { acquireMarket, REFRESH_MS, useMarket } from "@/lib/bank/market";

const priceFmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: n < 1 ? 4 : 2,
    maximumFractionDigits: n < 1 ? 6 : 2,
  }).format(n);

const volumeFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function LiveMarket({ onSelect }: { onSelect: (base: string) => void }) {
  const { tickers, error, updatedAt } = useMarket();

  useEffect(() => acquireMarket(), []);

  const live = !error && updatedAt !== null;

  return (
    <section className="glass reveal p-5 sm:p-6" aria-labelledby="live-market-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="live-market-title" className="text-lg font-semibold">Live market</h2>
          <p className="text-xs text-muted-foreground">Public prices from Binance, refreshed every {REFRESH_MS / 1000} seconds. Tap an asset to trade.</p>
        </div>
        <p className={`flex items-center gap-2 text-xs font-semibold ${live ? "text-success" : "text-destructive"}`} role="status">
          <span className={`inline-block h-2 w-2 rounded-full ${live ? "animate-pulse bg-success" : "bg-destructive"}`} aria-hidden />
          {live ? `Live · ${timeFmt.format(updatedAt)}` : error ? "Offline" : "Connecting…"}
        </p>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm">
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>Live prices are unavailable right now ({error}). We will keep trying every {REFRESH_MS / 1000} seconds.</p>
        </div>
      )}

      {!error && tickers.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Loading live prices…</p>
      )}

      {tickers.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 font-medium">Asset</th>
                <th scope="col" className="py-2 text-right font-medium">Price</th>
                <th scope="col" className="py-2 text-right font-medium">24h</th>
                <th scope="col" className="py-2 text-right font-medium">24h range</th>
                <th scope="col" className="py-2 text-right font-medium">Volume</th>
                <th scope="col" className="py-2"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickers.map((t) => {
                const up = t.change24h >= 0;
                return (
                  <tr
                    key={t.symbol}
                    className="reveal cursor-pointer transition-colors hover:bg-secondary"
                    onClick={() => onSelect(t.base)}
                  >
                    <td className="py-3 font-semibold">
                      <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); onSelect(t.base); }}>
                        {t.base}<span className="ml-1 text-xs font-normal text-muted-foreground">/USD</span>
                      </button>
                    </td>
                    <td className="py-3 text-right tabular-nums">{priceFmt(t.price)}</td>
                    <td className={`py-3 text-right font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}>
                      {up ? "▲" : "▼"} {Math.abs(t.change24h).toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {priceFmt(t.low)} – {priceFmt(t.high)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">{volumeFmt.format(t.volumeUsd)}</td>
                    <td className="py-3 pl-2 text-muted-foreground"><ChevronRight className="h-4 w-4" aria-hidden /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Market information only, not financial advice. Trades in this demo are simulated with demo money.
      </p>
    </section>
  );
}
