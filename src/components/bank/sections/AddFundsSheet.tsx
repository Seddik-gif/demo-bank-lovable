import { currencyCode } from "@/lib/bank/data";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Bitcoin, ChevronLeft, CreditCard, Landmark, Smartphone, X, type LucideIcon } from "lucide-react";
import { formatMoney, round2, type Card } from "@/lib/bank/data";
import { addedToday, CRYPTO_MIN_EUR, feeOn, FUNDING_LABEL, MAX_FUNDING, netOf, RULES, type BankSpeed, type FundingMethod } from "@/lib/bank/funding";
import { fromTyped } from "@/lib/bank/data";
import { heldOf } from "@/lib/bank/crypto";
import { FEE_RATE, fetchOrderBook, simulateSell, type Fill, type OrderBook } from "@/lib/bank/market";
import { track } from "@/lib/bank/monitor";
import { useBank } from "@/lib/bank/store";
import { useMoneyText } from "../Money";

// The bank's testing code for 3D Secure. A real bank sends a code to the customer's phone or app.
const VERIFY_CODE = "123456";

const METHODS: { id: FundingMethod; title: string; detail: string; icon: LucideIcon }[] = [
  { id: "apple", title: "Apple Pay", detail: "From a card in your Apple Wallet", icon: Smartphone },
  { id: "google", title: "Google Pay", detail: "From a card in your Google Wallet", icon: Smartphone },
  { id: "crypto", title: "Crypto wallet", detail: "Sell crypto at the live market price", icon: Bitcoin },
  { id: "card", title: "Credit or debit card", detail: "Approved by your bank with a code", icon: CreditCard },
  { id: "bank", title: "Bank transfer", detail: "Send from your own bank to your IBAN", icon: Landmark },
];

type Step = "pick" | "details" | "review" | "wallet" | "verify" | "result";
type Outcome = { tone: "done" | "pending" | "sold"; text: string };

const CHIPS = [25, 50, 100, 250];

/** Add funds, one way at a time. Each method follows the steps its real version uses. Everything is simulated. */
export function AddFundsSheet({ onClose }: { onClose: () => void }) {
  const { accounts, cards, crypto, transactions, addFunds, executeTrade } = useBank();
  const fmt = useMoneyText();
  const [method, setMethod] = useState<FundingMethod | null>(null);
  const [step, setStep] = useState<Step>("pick");
  const [amount, setAmount] = useState("50");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [speed, setSpeed] = useState<BankSpeed>("standard");
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [book, setBook] = useState<OrderBook | null>(null);
  const [bookError, setBookError] = useState("");
  const [busy, setBusy] = useState(false);

  const heldSymbols = Object.entries(crypto).filter(([, q]) => q > 0).map(([s]) => s);
  const value = amount.trim() === "" ? NaN : fromTyped(Number(amount));
  const account = accounts.find((a) => a.id === accountId);
  const card: Card | undefined = cards.find((c) => c.id === cardId);
  const rule = method && method !== "crypto" ? RULES[method] : null;
  const fee = rule && Number.isFinite(value) ? feeOn(method as Exclude<FundingMethod, "crypto">, value, speed) : 0;
  const net = rule && Number.isFinite(value) ? netOf(method as Exclude<FundingMethod, "crypto">, value, speed) : 0;
  const leftToday = rule ? round2(rule.dailyLimit - addedToday(transactions, method as Exclude<FundingMethod, "crypto">)) : 0;
  const isPending = method === "card" || (method === "bank" && speed === "standard");

  // Crypto: load the live order book when the sale screen opens, and refresh it every few seconds.
  useEffect(() => {
    if (method !== "crypto" || step !== "details" || !symbol) return;
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
  }, [method, step, symbol]);

  const quantity = Number(qty);
  const sale: Fill | null = useMemo(() => {
    if (method !== "crypto" || !book || !Number.isFinite(quantity) || quantity <= 0) return null;
    return simulateSell(book.bids, quantity);
  }, [method, book, quantity]);
  const saleFee = sale ? round2(sale.quote * FEE_RATE) : 0;
  const saleNet = sale ? round2(sale.quote - saleFee) : 0;

  const pick = (m: FundingMethod) => {
    setMethod(m);
    setError("");
    setOutcome(null);
    setBook(null);
    setBookError("");
    setCode("");
    if (m === "crypto") {
      setSymbol(heldSymbols[0] ?? "");
      setQty("");
    }
    setStep("details");
  };

  const back = () => {
    setError("");
    if (step === "details") {
      setMethod(null);
      setStep("pick");
    } else if (step === "review") setStep("details");
    else if (step === "wallet" || step === "verify") setStep("review");
  };

  const toReview = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (method === "crypto") {
      const held = heldOf(crypto, symbol);
      if (!(quantity > 0) || quantity > held + 1e-12) {
        setError(`You can't sell more than you hold: you have ${held} ${symbol}.`);
        return;
      }
      if (!sale || !sale.complete) {
        setError(bookError || "The market can't fill that amount right now. Try a smaller amount.");
        return;
      }
      if (saleNet < CRYPTO_MIN_EUR) {
        setError(`The minimum sale is ${formatMoney(CRYPTO_MIN_EUR)}.`);
        return;
      }
      setStep("review");
      return;
    }
    if (!rule) return;
    if (!Number.isFinite(value) || value <= 0) return setError("Enter an amount greater than zero.");
    if (value < rule.min) return setError(`The minimum with ${rule.label} is ${formatMoney(rule.min)}.`);
    if (value > MAX_FUNDING) return setError(`You can add at most ${formatMoney(MAX_FUNDING)} at a time.`);
    if (net > leftToday) return setError(`Daily limit reached: you can add ${formatMoney(Math.max(0, leftToday))} more with ${rule.label} today.`);
    if (method !== "bank" && !card) return setError("Choose a card.");
    setStep("review");
  };

  // Records a top-up through the store, which applies the same rules as the rest of the app.
  const submitFunding = () => {
    if (method === "crypto" || !method) return;
    setBusy(true);
    const res = addFunds({ method, accountId, amount: value, speed, ...(method === "bank" ? {} : { cardId }) });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setStep("details");
      return;
    }
    setOutcome(
      isPending
        ? { tone: "pending", text: `Pending. It becomes available after about 1 business day (about ${method === "card" ? "1 minute" : "2 minutes"} in this demo). You get ${fmt(net)}.` }
        : { tone: "done", text: `Done. ${fmt(net)} is available in ${account?.name ?? "your account"} now.` },
    );
    setStep("result");
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim() !== VERIFY_CODE) {
      setError("That code doesn't match. Check it and try again.");
      track("payment_rejected", `Add funds with ${FUNDING_LABEL[method ?? "card"]}: verification code did not match`);
      return;
    }
    submitFunding();
  };

  // Crypto: a market sell against the live order book. Proceeds go to the Main current account, like an exchange payout.
  const sellCrypto = async () => {
    if (!sale || !symbol) return;
    setBusy(true);
    try {
      const fresh = await fetchOrderBook(symbol);
      const fill = simulateSell(fresh.bids, quantity);
      if (!fill.complete) {
        setError("The price moved and the order can't fill in full. Review it again.");
        setStep("details");
        return;
      }
      const res = executeTrade({ base: symbol, side: "sell", qty: fill.qty, quote: fill.quote, feeRate: FEE_RATE });
      if (!res.ok) {
        setError(res.error);
        setStep("details");
        return;
      }
      setOutcome({
        tone: "sold",
        text: `Sold ${fill.qty} ${symbol} at an average ${formatMoney(fill.avgPrice)}. ${formatMoney(round2(fill.quote - round2(fill.quote * FEE_RATE)))} is in your Main current account.`,
      });
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The market is not available right now.");
    } finally {
      setBusy(false);
    }
  };

  let body: ReactNode;

  if (step === "pick") {
    body = (
      <ul className="space-y-2" aria-label="Ways to add funds">
        {METHODS.map(({ id, title, detail, icon: Icon }) => (
          <li key={id}>
            <button type="button" onClick={() => pick(id)} className="glass flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{detail}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else if (step === "details" && method === "crypto") {
    body = (
      <form onSubmit={toReview} className="space-y-4">
        <Back onClick={back} />
        <p className="text-sm font-semibold">Sell crypto to add funds</p>
        <p className="text-xs text-muted-foreground">A market order at the live price. The trade fee is {(FEE_RATE * 100).toFixed(1)}%. Proceeds go to your Main current account.</p>
        {heldSymbols.length === 0 ? (
          <p className="text-sm text-muted-foreground">You don't hold any crypto yet. Buy some in Crypto first.</p>
        ) : (
          <>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Asset</span>
              <select className="field" value={symbol} onChange={(e) => { setSymbol(e.target.value); setQty(""); setBook(null); }}>
                {heldSymbols.map((s) => <option key={s} value={s}>{s} · you hold {crypto[s]}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Quantity to sell ({symbol})</span>
              <input className="field tabular-nums" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={`Quantity of ${symbol} to sell`} />
            </label>
            <div className="glass space-y-1 p-3 text-sm">
              {!book && !bookError && <p className="text-muted-foreground">Loading the live order book…</p>}
              {bookError && <p className="text-destructive">{bookError}</p>}
              {book && sale && (
                <>
                  <p className="flex justify-between"><span className="text-muted-foreground">Average price</span><span className="tabular-nums">{formatMoney(sale.avgPrice)}</span></p>
                  <p className="flex justify-between"><span className="text-muted-foreground">Proceeds</span><span className="tabular-nums">{formatMoney(sale.quote)}</span></p>
                  <p className="flex justify-between"><span className="text-muted-foreground">Trade fee ({(FEE_RATE * 100).toFixed(1)}%)</span><span className="tabular-nums">−{formatMoney(saleFee)}</span></p>
                  <p className="flex justify-between font-semibold"><span>You receive</span><span className="tabular-nums">{formatMoney(saleNet)}</span></p>
                  {!sale.complete && <p className="text-destructive">The order book can't fill all of this quantity.</p>}
                </>
              )}
            </div>
          </>
        )}
        <button type="submit" disabled={!sale || !sale.complete} className="btn btn-primary w-full disabled:opacity-50">Review sale</button>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </form>
    );
  } else if (step === "details" && rule) {
    const isBank = method === "bank";
    body = (
      <form onSubmit={toReview} className="space-y-4">
        <Back onClick={back} />
        <p className="text-sm font-semibold">{METHODS.find((m) => m.id === method)?.title}</p>
        <p className="text-xs text-muted-foreground">{rule.note}</p>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Amount ({currencyCode()}). Min {formatMoney(rule.min)}, up to {formatMoney(MAX_FUNDING)}. Left today: {formatMoney(Math.max(0, leftToday))}.</p>
          <div className="flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button key={c} type="button" className={`btn btn-sm ${value === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setAmount(String(c))}>{formatMoney(fromTyped(c))}</button>
            ))}
          </div>
          <input className="field mt-2 tabular-nums" type="number" min="1" step="1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to add" />
        </div>

        {!isBank && (
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">{method === "card" ? "Card" : "Card in your wallet"}</span>
            <select className="field" value={cardId} onChange={(e) => setCardId(e.target.value)}>
              {cards.map((c) => <option key={c.id} value={c.id}>{c.label} ··{c.last4}{c.frozen ? " (frozen)" : ""}{c.onlinePayments === false ? " (online off)" : ""}</option>)}
            </select>
          </label>
        )}

        {isBank && (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-muted-foreground">Speed</legend>
            {(["instant", "standard"] as const).map((s) => (
              <label key={s} className={`glass flex cursor-pointer items-start gap-3 p-3 text-sm ${speed === s ? "ring-2 ring-accent" : ""}`}>
                <input type="radio" className="mt-1 accent-[var(--accent)]" name="speed" checked={speed === s} onChange={() => setSpeed(s)} />
                <span>
                  <span className="block font-semibold">{s === "instant" ? "Instant" : "Standard"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s === "instant" ? "About 10 seconds, any time. Free here. Needs a bank that supports instant transfers." : "About 1 business day. Free."}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {isBank && account && (
          <div className="rounded-xl bg-secondary p-3 text-xs">
            <p className="text-muted-foreground">Send from your bank to</p>
            <p className="mt-1 break-all font-mono">{account.iban}</p>
            <p className="mt-1 text-muted-foreground">Reference: DEMO-{account.id.toUpperCase()}</p>
          </div>
        )}

        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Add to</span>
          <select className="field" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.filter((a) => a.kind !== "crypto").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {Number.isFinite(value) && value > 0 && (
          <div className="glass space-y-1 p-3 text-sm">
            <p className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">{fmt(value)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="tabular-nums">{fee > 0 ? `−${fmt(fee)}` : "Free"}</span></p>
            <p className="flex justify-between font-semibold"><span>You get</span><span className="tabular-nums">{fmt(net)}</span></p>
            <p className="text-xs text-muted-foreground">{method === "bank" ? (speed === "instant" ? "Available in about 10 seconds" : "Pending, about 1 business day") : rule.arrival}</p>
          </div>
        )}

        <button type="submit" className="btn btn-primary w-full">Review</button>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </form>
    );
  } else if (step === "review" && method === "crypto" && sale) {
    body = (
      <div className="space-y-4">
        <Back onClick={back} />
        <p className="text-sm font-semibold">Review your sale</p>
        <div className="glass space-y-2 p-4 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Sell</span><span className="tabular-nums">{sale.qty} {symbol}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">At an average</span><span className="tabular-nums">{formatMoney(sale.avgPrice)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Trade fee</span><span className="tabular-nums">−{formatMoney(saleFee)}</span></p>
          <p className="flex justify-between font-semibold"><span>You receive</span><span className="tabular-nums">{formatMoney(saleNet)}</span></p>
          <p className="text-xs text-muted-foreground">Market order. The price can move before it fills; the figures above are from the order book just now.</p>
        </div>
        <button type="button" disabled={busy} className="btn btn-primary w-full disabled:opacity-50" onClick={sellCrypto}>{busy ? "Placing the order…" : "Place sell order"}</button>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    );
  } else if (step === "review" && rule) {
    const isBank = method === "bank";
    body = (
      <div className="space-y-4">
        <Back onClick={back} />
        <p className="text-sm font-semibold">Review</p>
        <div className="glass space-y-2 p-4 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{rule.label}</span></p>
          {!isBank && card && <p className="flex justify-between"><span className="text-muted-foreground">Card</span><span>{card.label} ··{card.last4}</span></p>}
          {isBank && <p className="flex justify-between"><span className="text-muted-foreground">Speed</span><span>{speed === "instant" ? "Instant" : "Standard"}</span></p>}
          <p className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="tabular-nums">{fmt(value)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="tabular-nums">{fee > 0 ? `−${fmt(fee)}` : "Free"}</span></p>
          <p className="flex justify-between font-semibold"><span>You get</span><span className="tabular-nums">{fmt(net)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Into</span><span>{account?.name}</span></p>
          <p className="text-xs text-muted-foreground">{isPending ? "Pending until it settles." : "Available straight away."}</p>
        </div>
        {method === "apple" || method === "google" ? (
          <button type="button" className="btn btn-primary w-full" onClick={() => setStep("wallet")}>Continue to {rule.label}</button>
        ) : method === "card" ? (
          <button type="button" className="btn btn-primary w-full" onClick={() => setStep("verify")}>Continue to verification</button>
        ) : (
          <button type="button" disabled={busy} className="btn btn-primary w-full" onClick={submitFunding}>Confirm transfer</button>
        )}
      </div>
    );
  } else if (step === "wallet" && rule && card) {
    const isGoogle = method === "google";
    body = (
      <div className="space-y-4">
        <Back onClick={back} />
        <div className="rounded-3xl bg-background/60 p-5 text-center shadow-2xl">
          <p className="text-xs text-muted-foreground">{isGoogle ? "Google Pay" : "Apple Pay"} · simulated sheet</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums">{fmt(value)}</p>
          <p className="mt-3 flex items-center justify-between rounded-xl bg-secondary p-3 text-left text-sm">
            <span>{card.label} ··{card.last4}</span>
            <span className="text-xs text-muted-foreground">Default</span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {isGoogle ? "Confirm with your fingerprint (simulated)." : "Confirm with Face ID or your passcode (simulated)."}
          </p>
        </div>
        <button type="button" disabled={busy} className="btn btn-primary w-full" onClick={submitFunding}>
          {isGoogle ? "Confirm with fingerprint" : "Confirm with Face ID"}
        </button>
        <p className="text-center text-xs text-muted-foreground">Your card's bank approves the payment. There is no {rule.label} balance.</p>
      </div>
    );
  } else if (step === "verify" && method === "card") {
    body = (
      <form onSubmit={verify} className="space-y-4">
        <Back onClick={back} />
        <p className="text-sm font-semibold">Verify with your bank</p>
        <p className="text-xs text-muted-foreground">
          Your bank sent a 6-digit code to your phone to approve this card payment. Testing code: {VERIFY_CODE}.
        </p>
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Verification code</span>
          <input className="field text-center text-xl tracking-[0.4em] tabular-nums" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="6-digit verification code" />
        </label>
        <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary w-full disabled:opacity-50">Verify and pay {fmt(value)}</button>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </form>
    );
  } else if (step === "result" && outcome) {
    body = (
      <div className="space-y-4 py-4 text-center">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-2xl ${outcome.tone === "pending" ? "text-muted-foreground" : "text-success"}`} aria-hidden>
          {outcome.tone === "pending" ? "…" : "✓"}
        </span>
        <p className="text-sm font-semibold">{outcome.tone === "pending" ? "Payment pending" : outcome.tone === "sold" ? "Sale complete" : "Funds added"}</p>
        <p className="text-sm text-muted-foreground">{outcome.text}</p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost flex-1" onClick={() => { setStep("pick"); setMethod(null); setOutcome(null); }}>Add more</button>
          <button type="button" className="btn btn-primary flex-1" onClick={onClose}>Done</button>
        </div>
      </div>
    );
  } else {
    body = null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Add funds">
      <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close add funds" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold">Add funds</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-5 pb-8">{body}</div>
      </div>
    </div>,
    document.body,
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onClick}>
      <ChevronLeft className="h-4 w-4" aria-hidden /> Back
    </button>
  );
}
