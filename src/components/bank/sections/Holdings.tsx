import { useEffect, useState } from "react";
import { formatMoney, round2, CRYPTO_HOLDINGS, INVEST_HOLDINGS, type Holding } from "@/lib/bank/data";
import { ASSET_NAMES, acquireMarket, useMarket } from "@/lib/bank/market";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { SectionHeader } from "../Layout";
import { AssetDetail } from "./AssetDetail";
import { LiveMarket } from "./LiveMarket";
import { CryptoWalletSheet } from "./CryptoWalletSheet";

function HoldingsView({ title, subtitle, items, unitLabel }: { title: string; subtitle: string; items: Holding[]; unitLabel: (h: Holding) => string }) {
  const total = round2(items.reduce((s, h) => s + h.quantity * h.price, 0));
  const change = round2(items.reduce((s, h) => s + (h.quantity * h.price * h.change24h) / (100 + h.change24h), 0));
  return (
    <div className="space-y-6">
      <SectionHeader title={title} subtitle={subtitle} />
      <section className="glass reveal p-6">
        <p className="text-sm text-muted-foreground">Portfolio value</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums"><Money value={total} className="text-gradient" /></p>
        <p className={`mt-1 text-sm font-medium ${change >= 0 ? "text-success" : "text-destructive"}`}>
          <Money value={change} signed /> today
        </p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h) => {
          const up = h.change24h >= 0;
          return (
            <li key={h.symbol} className="glass reveal min-w-0 p-5">
              <div className="flex items-center gap-3">
                <span className="bg-accent-gradient grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-primary-foreground">{h.symbol}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{h.name}</p>
                  <p className="text-xs text-muted-foreground">{h.kind} · {unitLabel(h)}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">Price</dt><dd className="tabular-nums">{formatMoney(h.price)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Value</dt><dd className="tabular-nums font-semibold"><Money value={h.quantity * h.price} /></dd></div>
                <div><dt className="text-xs text-muted-foreground">24h</dt><dd className={`tabular-nums font-semibold ${up ? "text-success" : "text-destructive"}`}>{up ? "▲" : "▼"} {Math.abs(h.change24h).toFixed(2)}%</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
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
          <button type="button" className="btn btn-ghost" onClick={() => setWallet("receive")}>Receive</button>
          <button type="button" className="btn btn-primary" onClick={() => setWallet("sell")}>Sell</button>
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
  return <HoldingsView title="Investments" subtitle="Funds, bonds and stocks you hold." items={items} unitLabel={(h) => `${h.quantity} units`} />;
}
