import { useEffect, useState } from "react";
import { formatMoney, round2, CRYPTO_HOLDINGS, INVEST_HOLDINGS, type Holding } from "@/lib/bank/data";
import { ASSET_NAMES, acquireMarket, useMarket } from "@/lib/bank/market";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { SectionHeader } from "../Layout";
import { CoinIllustration } from "../Illustrations";
import { AssetDetail } from "./AssetDetail";
import { LiveMarket } from "./LiveMarket";
import { CryptoWalletSheet } from "./CryptoWalletSheet";

/** Colours for the allocation bar and the asset chips, in order. */
const COLOURS = ["#a78bfa", "#67e8f9", "#6ee7b7", "#fcd34d", "#f9a8d4", "#fb923c", "#93c5fd", "#c4b5fd"];

function HoldingsView({ title, subtitle, items, unitLabel, empty }: { title: string; subtitle: string; items: Holding[]; unitLabel: (h: Holding) => string; empty?: { title: string; text: string } }) {
  const values = items.map((h) => h.quantity * h.price);
  const total = round2(values.reduce((s, v) => s + v, 0));
  const change = round2(items.reduce((s, h) => s + (h.quantity * h.price * h.change24h) / (100 + h.change24h), 0));
  const changePct = total > 0 ? round2((change / (total - change)) * 100) : 0;
  const up = change >= 0;

  return (
    <div className="space-y-6">
      <SectionHeader title={title} subtitle={subtitle} />

      {/* Hero: the total, today's change, and how the holdings are split. */}
      <section className="glass reveal space-y-4 p-6" aria-label="Portfolio">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Portfolio value</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums"><Money value={total} className="text-gradient" /></p>
          </div>
          {items.length > 0 && (
            <span className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {up ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}% today
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="flex h-3 overflow-hidden rounded-full bg-secondary" role="img" aria-label={items.map((h, i) => `${h.symbol} ${Math.round((values[i]! / total) * 100)}%`).join(", ")}>
            {items.map((h, i) => (
              <span key={h.symbol} style={{ width: `${(values[i]! / total) * 100}%`, background: COLOURS[i % COLOURS.length] }} />
            ))}
          </div>
        )}
      </section>

      {items.length === 0 && empty ? (
        <div className="glass grid place-items-center gap-3 p-8 text-center">
          <CoinIllustration className="h-24 w-24" />
          <p className="font-medium">{empty.title}</p>
          <p className="text-sm text-muted-foreground">{empty.text}</p>
        </div>
      ) : (
        <ul className="glass divide-y divide-border overflow-hidden">
          {items.map((h, i) => {
            const rowUp = h.change24h >= 0;
            const colour = COLOURS[i % COLOURS.length];
            return (
              <li key={h.symbol} className="row-hover flex min-w-0 items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-bold text-neutral-900" style={{ background: colour }} aria-hidden>{h.symbol}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{h.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{unitLabel(h)} · {formatMoney(h.price)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums"><Money value={h.quantity * h.price} /></p>
                  <p className={`text-xs font-medium tabular-nums ${rowUp ? "text-success" : "text-destructive"}`}>{rowUp ? "▲" : "▼"} {Math.abs(h.change24h).toFixed(2)}%</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Prices are fictional demo values.</p>
    </div>
  );
}

export function CryptoSection() {
  const { crypto } = useBank();
  const { tickers } = useMarket();
  const [selected, setSelected] = useState<string | null>(null);
  const [wallet, setWallet] = useState<"receive" | "sell" | null>(null);

  useEffect(() => acquireMarket(), []);

  if (selected) return <AssetDetail base={selected} onBack={() => setSelected(null)} />;

  // Show BTC and ETH, plus any other asset the account holds. Values use live prices when loaded.
  const symbols = [...new Set(["BTC", "ETH", ...Object.keys(crypto).filter((s) => (crypto[s] ?? 0) > 0)])];
  const items: Holding[] = symbols.map((symbol) => {
    const live = tickers.find((t) => t.base === symbol);
    const fallback = CRYPTO_HOLDINGS.find((h) => h.symbol === symbol);
    return {
      symbol,
      name: ASSET_NAMES[symbol] ?? symbol,
      kind: "Crypto",
      quantity: crypto[symbol] ?? 0,
      price: live?.price ?? fallback?.price ?? 0,
      change24h: live?.change24h ?? fallback?.change24h ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <HoldingsView title="Crypto wallet" subtitle="Your holdings, with the live market below. Tap an asset to trade." items={items} unitLabel={(h) => `${qtyLabel(h.quantity)} ${h.symbol}`} />
      <section className="glass reveal flex flex-wrap items-center justify-between gap-3 p-5" aria-label="Wallet actions">
        <div className="min-w-0">
          <p className="font-semibold">Move crypto</p>
          <p className="text-xs text-muted-foreground">Receive crypto from another wallet address, or sell what you hold.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn btn-ghost rounded-full" onClick={() => setWallet("receive")}>Receive</button>
          <button type="button" className="btn btn-primary rounded-full" onClick={() => setWallet("sell")}>Sell</button>
        </div>
      </section>
      {wallet && <CryptoWalletSheet initial={wallet} onClose={() => setWallet(null)} />}
      <LiveMarket onSelect={setSelected} />
    </div>
  );
}

const qtyLabel = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 6 });

export function InvestSection() {
  const { investments } = useBank();
  const items = INVEST_HOLDINGS.map((h) => ({ ...h, quantity: investments[h.symbol] ?? 0 })).filter((h) => h.quantity > 0);
  return (
    <HoldingsView
      title="Investments"
      subtitle="Funds, bonds and stocks you hold."
      items={items}
      unitLabel={(h) => `${h.quantity} units`}
      empty={{ title: "No investments yet", text: "Open an Investments account and buy your first fund, bond or stock." }}
    />
  );
}
