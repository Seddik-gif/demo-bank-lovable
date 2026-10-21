import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Copy, X } from "lucide-react";
import { formatMoney, round2 } from "@/lib/bank/data";
import { CONFIRMATIONS, CRYPTO_ASSETS, heldOf, isValidSenderAddress, NETWORK, receiveAddress, validateSale } from "@/lib/bank/crypto";
import { FEE_RATE, fetchOrderBook, simulateSell, type Fill, type OrderBook } from "@/lib/bank/market";
import { useBank } from "@/lib/bank/store";

type Tab = "receive" | "sell";

/** The crypto wallet's two options: receive from another wallet address, or sell what you hold. */
export function CryptoWalletSheet({ initial, onClose }: { initial: Tab; onClose: () => void }) {
  const { crypto, receiveCrypto, executeTrade } = useBank();
  const [tab, setTab] = useState<Tab>(initial);
  const heldSymbols = Object.keys(crypto).filter((s) => heldOf(crypto, s) > 0);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Crypto wallet">
      <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close crypto wallet" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold">Crypto wallet</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-5 pb-8">
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1" role="tablist" aria-label="Wallet options">
            {(["receive", "sell"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-xl py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-accent-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                {t === "receive" ? "Receive from a wallet" : "Sell what I hold"}
              </button>
            ))}
          </div>
          {tab === "receive" ? <ReceivePanel onReceive={receiveCrypto} /> : <SellPanel symbols={heldSymbols} onSell={executeTrade} onDone={onClose} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReceivePanel({ onReceive }: { onReceive: (symbol: string, quantity: number, from: string) => { ok: true } | { ok: false; error: string } }) {
  const [symbol, setSymbol] = useState("BTC");
  const [from, setFrom] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [copied, setCopied] = useState(false);

  const quantity = Number(qty);
  const addressOk = from.trim() === "" ? null : isValidSenderAddress(symbol, from);
  const ready = addressOk === true && Number.isFinite(quantity) && quantity > 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiveAddress(symbol));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy. Select the address and copy it by hand.");
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = onReceive(symbol, quantity, from);
    setError(res.ok ? "" : res.error);
    setDone(res.ok ? `Deposit of ${quantity} ${symbol} sent. It shows in your wallet after ${CONFIRMATIONS[symbol] ?? 6} confirmations (about 90 seconds in this demo).` : "");
    if (res.ok) {
      setQty("");
      setFrom("");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Asset</span>
        <select className="field" value={symbol} onChange={(e) => { setSymbol(e.target.value); setError(""); setDone(""); }}>
          {CRYPTO_ASSETS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <div className="rounded-xl bg-secondary p-3 text-xs">
        <p className="text-muted-foreground">Your {symbol} address ({NETWORK[symbol]} network)</p>
        <p className="mt-1 break-all font-mono">{receiveAddress(symbol)}</p>
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm mt-2">
          <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied" : "Copy address"}
        </button>
        <p className="mt-2 text-destructive">Only send {symbol} on the {NETWORK[symbol]} network to this address. Other coins or networks can be lost.</p>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Sender's address (the wallet you send from)</span>
        <input
          className="field font-mono text-xs"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setError(""); setDone(""); }}
          placeholder={symbol === "BTC" ? "bc1… or 1… or 3…" : "0x…"}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={addressOk === false}
        />
        {addressOk === false && <span className="block text-xs text-destructive">That doesn't look like a {symbol} address on {NETWORK[symbol]}.</span>}
      </label>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Amount ({symbol})</span>
        <input className="field tabular-nums" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} aria-label={`Amount of ${symbol} to receive`} />
      </label>

      <p className="text-xs text-muted-foreground">Network fees are paid by the sender. The deposit is credited after the network confirms it.</p>

      <button type="submit" disabled={!ready} className="btn btn-primary w-full disabled:opacity-50">Receive {Number.isFinite(quantity) && quantity > 0 ? `${quantity} ${symbol}` : symbol}</button>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      {done && <p role="status" className="text-sm font-medium text-success">{done}</p>}
    </form>
  );
}

function SellPanel({
  symbols,
  onSell,
  onDone,
}: {
  symbols: string[];
  onSell: (t: { base: string; side: "sell"; qty: number; quote: number; feeRate: number }) => { ok: true } | { ok: false; error: string };
  onDone: () => void;
}) {
  const { crypto } = useBank();
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [qty, setQty] = useState("");
  const [book, setBook] = useState<OrderBook | null>(null);
  const [bookError, setBookError] = useState("");
  const [error, setError] = useState("");
  const [sold, setSold] = useState("");
  const [busy, setBusy] = useState(false);

  const held = heldOf(crypto, symbol);
  const quantity = Number(qty);
  const overHeld = Number.isFinite(quantity) && quantity > held + 1e-12;
  const valid = Number.isFinite(quantity) && quantity > 0 && !overHeld && held > 0;

  // Live order book for the estimate, refreshed every few seconds.
  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    const load = () =>
      fetchOrderBook(symbol, controller.signal)
        .then((b) => {
          setBook(b);
          setBookError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setBookError(e instanceof Error ? e.message : "The market is not available right now.");
        });
    load();
    const id = window.setInterval(load, 3000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [symbol]);

  const estimate: Fill | null = useMemo(() => (book && valid ? simulateSell(book.bids, quantity) : null), [book, valid, quantity]);
  const fee = estimate ? round2(estimate.quote * FEE_RATE) : 0;

  if (symbols.length === 0) return <p className="text-sm text-muted-foreground">You don't hold any crypto yet. Receive some, or buy in Crypto first.</p>;

  const place = async () => {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      // Re-check the order book right before selling, and never sell more than is held.
      const fresh = await fetchOrderBook(symbol);
      const check = validateSale(crypto, symbol, quantity);
      if (!check.ok) return setError(check.error);
      const fill = simulateSell(fresh.bids, quantity);
      if (!fill.complete) return setError("The order book can't fill all of this amount right now. Try a smaller amount.");
      const res = onSell({ base: symbol, side: "sell", qty: fill.qty, quote: fill.quote, feeRate: FEE_RATE });
      if (!res.ok) return setError(res.error);
      setSold(`Sold ${fill.qty} ${symbol} at an average ${formatMoney(fill.avgPrice)}. ${formatMoney(round2(fill.quote - round2(fill.quote * FEE_RATE)))} is in your Main current account.`);
      setQty("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The market is not available right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Asset you hold</span>
        <select className="field" value={symbol} onChange={(e) => { setSymbol(e.target.value); setQty(""); setBook(null); setError(""); setSold(""); }}>
          {symbols.map((s) => <option key={s} value={s}>{s} · you hold {crypto[s]}</option>)}
        </select>
      </label>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3 text-sm">
        <span>You hold <span className="font-semibold tabular-nums">{held}</span> {symbol}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQty(String(held))} disabled={held <= 0}>Sell all</button>
      </div>

      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Amount to sell ({symbol})</span>
        <input className="field tabular-nums" type="number" min="0" max={held} step="any" inputMode="decimal" value={qty} onChange={(e) => { setQty(e.target.value); setError(""); setSold(""); }} aria-label={`Amount of ${symbol} to sell`} aria-invalid={overHeld} />
        {overHeld && <span className="block text-xs text-destructive">You can't sell more than you hold ({held} {symbol}).</span>}
      </label>

      <div className="glass space-y-1 p-3 text-sm">
        {!book && !bookError && <p className="text-muted-foreground">Loading the live order book…</p>}
        {bookError && <p className="text-destructive">{bookError}</p>}
        {book && valid && estimate && (
          <>
            <p className="flex justify-between"><span className="text-muted-foreground">Average price</span><span className="tabular-nums">{formatMoney(estimate.avgPrice)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Proceeds</span><span className="tabular-nums">{formatMoney(estimate.quote)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Trade fee ({(FEE_RATE * 100).toFixed(1)}%)</span><span className="tabular-nums">−{formatMoney(fee)}</span></p>
            <p className="flex justify-between font-semibold"><span>You receive</span><span className="tabular-nums">{formatMoney(round2(estimate.quote - fee))}</span></p>
            {!estimate.complete && <p className="text-destructive">The order book can't fill all of this amount.</p>}
          </>
        )}
        <p className="pt-1 text-xs text-muted-foreground">Market order. Proceeds go to your Main current account.</p>
      </div>

      <button type="button" disabled={!valid || busy || (estimate !== null && !estimate.complete)} className="btn btn-danger w-full disabled:opacity-50" onClick={place}>
        {busy ? "Placing the order…" : `Sell ${valid ? quantity : ""} ${symbol}`.trim()}
      </button>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      {sold && (
        <div className="space-y-3">
          <p role="status" className="text-sm font-medium text-success">{sold}</p>
          <button type="button" className="btn btn-ghost w-full" onClick={onDone}>Done</button>
        </div>
      )}
    </div>
  );
}
