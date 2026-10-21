import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Snowflake } from "lucide-react";
import { CRYPTO_HOLDINGS, INVEST_HOLDINGS, formatMoney, type Account, type AccountKind, type SectionId, type Transaction } from "@/lib/bank/data";
import { CRYPTO_ASSETS, heldOf } from "@/lib/bank/crypto";
import { CURRENCY_PER_USD, SAVINGS_RATE, cryptoValue, inCurrency, investmentsValue } from "@/lib/bank/money";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { TransactionList } from "../TransactionList";
import { CryptoWalletSheet } from "./CryptoWalletSheet";

const KIND_LABEL: Record<AccountKind, string> = {
  current: "Current account",
  savings: "Savings account",
  currency: "Currency account",
  joint: "Joint account",
  crypto: "Crypto wallet",
  invest: "Investments",
  pockets: "Round-up pockets",
};

/** Accounts that hold their money somewhere else: their balance comes from holdings or pockets, not the cash balance. */
function balanceOf(a: Account, s: { crypto: Record<string, number>; investments: Record<string, number>; goals: { saved: number }[] }): number {
  if (a.kind === "crypto") return cryptoValue(s.crypto);
  if (a.kind === "invest") return Math.round((a.balance + investmentsValue(s.investments)) * 100) / 100;
  if (a.kind === "pockets") return Math.round(s.goals.reduce((t, g) => t + g.saved, 0) * 100) / 100;
  return a.balance;
}

function activityOf(a: Account, transactions: Transaction[]): Transaction[] {
  if (a.kind === "crypto") return transactions.filter((t) => t.category === "Crypto");
  if (a.kind === "pockets") return transactions.filter((t) => t.category === "Savings" && t.description.startsWith("Round-up"));
  return transactions.filter((t) => t.accountId === a.id);
}

/** The account pages on Home. Swipe sideways to move from one account to the next. */
export function AccountPager({ onNavigate }: { onNavigate: (id: SectionId) => void }) {
  const { accounts, transactions, crypto, goals, investments } = useBank();
  const [pos, setPos] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  // The main current account always comes first; the rest keep their opening order.
  const ordered = [...accounts].sort((a, b) => Number(a.id !== "main") - Number(b.id !== "main"));
  const active = Math.min(ordered.length - 1, Math.round(pos));

  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setPos(Math.max(0, Math.min(ordered.length - 1, el.scrollLeft / el.clientWidth)));
  };
  const goTo = (i: number) => track.current?.scrollTo({ left: i * (track.current?.clientWidth ?? 0), behavior: "smooth" });

  return (
    <section aria-label="Your accounts" className="space-y-3">
      <div ref={track} onScroll={onScroll} className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth" aria-label="Accounts">
        {ordered.map((a) => (
          <div key={a.id} className="w-full shrink-0 snap-center px-4">
            <AccountPage account={a} balance={balanceOf(a, { crypto, investments, goals })} transactions={activityOf(a, transactions)} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
      {ordered.length > 1 && (
        <div className="flex justify-center gap-2" role="tablist" aria-label="Choose an account">
          {ordered.map((a, i) => (
            <button key={a.id} type="button" role="tab" aria-selected={i === active} aria-label={a.name} onClick={() => goTo(i)} className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-accent" : "w-2 bg-muted-foreground/40"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

function AccountPage({ account: a, balance, transactions, onNavigate }: { account: Account; balance: number; transactions: Transaction[]; onNavigate: (id: SectionId) => void }) {
  const kind = a.kind ?? "current";

  // Account on top, a compact Latest activity card below. The card grows row by row, up to three.
  return (
    <article className="reveal flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start" aria-label={a.name}>
      <section className="glass min-w-0 space-y-4 p-5" aria-label="Account details">
        <header className="space-y-1">
          <p className="text-xs text-muted-foreground">{KIND_LABEL[kind]}</p>
          <h2 className="truncate text-lg font-semibold">{a.name}</h2>
          <p className="font-display text-3xl font-semibold tabular-nums"><Money value={balance} /></p>
          {kind === "currency" && a.currency && <p className="text-xs text-muted-foreground">≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: a.currency }).format(inCurrency(balance, a.currency))}</p>}
        </header>
        <Details account={a} />
      </section>

      <section className="glass min-w-0 p-4" aria-label="Latest activity">
        <p className="mb-1 text-sm font-semibold">Latest activity</p>
        {transactions.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">No transactions</p>
        ) : (
          <TransactionList items={transactions.slice(0, 3)} />
        )}
        {transactions.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm mt-2 w-full" onClick={() => onNavigate("activity")}>
            See more <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </section>
    </article>
  );
}

function Details({ account: a }: { account: Account }) {
  switch (a.kind ?? "current") {
    case "crypto":
      return <CryptoDetails />;
    case "invest":
      return <InvestDetails account={a} />;
    case "pockets":
      return <PocketsDetails />;
    default:
      return <BankDetails account={a} />;
  }
}

function BankDetails({ account: a }: { account: Account }) {
  const kind = a.kind ?? "current";
  return (
    <div className="space-y-3 text-sm">
      {kind === "savings" && (
        <p className="text-xs text-muted-foreground">
          Earning {((a.rate ?? SAVINGS_RATE) * 100).toFixed(2)}% a year. About <span className="font-semibold text-foreground tabular-nums">{formatMoney(Math.round(a.balance * (a.rate ?? SAVINGS_RATE) * 100) / 100)}</span> a year at this balance (estimate, not paid in this demo).
        </p>
      )}
      {kind === "currency" && a.currency && (
        <p className="text-xs text-muted-foreground">Demo rate: 1 USD = {CURRENCY_PER_USD[a.currency]} {a.currency}. Balances are kept in USD.</p>
      )}
      {kind === "joint" && <p className="text-xs text-muted-foreground">Shared with {a.coHolder}. Both holders can see and use this account.</p>}
      <button type="button" className="btn btn-ghost w-full" onClick={() => document.getElementById("send-money")?.scrollIntoView({ behavior: "smooth" })}>
        Move money
      </button>
    </div>
  );
}

function CryptoDetails() {
  const { crypto } = useBank();
  const [sheet, setSheet] = useState<"receive" | "sell" | null>(null);
  const held = CRYPTO_HOLDINGS.map((h) => ({ ...h, units: heldOf(crypto, h.symbol) })).filter((h) => h.units > 0);
  return (
    <div className="space-y-3 text-sm">
      {held.length === 0 ? (
        <p className="text-xs text-muted-foreground">You don't hold any crypto yet. Receive some from another wallet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl bg-secondary">
          {held.map((h) => (
            <li key={h.symbol} className="flex items-center justify-between gap-3 p-3">
              <span><span className="font-semibold">{h.symbol}</span> <span className="text-xs text-muted-foreground">{h.name}</span></span>
              <span className="text-right tabular-nums">
                <span className="block">{h.units} {h.symbol}</span>
                <span className="block text-xs text-muted-foreground">{formatMoney(Math.round(h.units * h.price * 100) / 100)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setSheet("receive")}>Receive</button>
        <button type="button" className="btn btn-primary" onClick={() => setSheet("sell")}>Sell</button>
      </div>
      <p className="text-xs text-muted-foreground">Assets: {CRYPTO_ASSETS.join(", ")}. Prices are demo values.</p>
      {sheet && <CryptoWalletSheet initial={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

function InvestDetails({ account }: { account: Account }) {
  const { investments, investBuy, investSell } = useBank();
  const [symbol, setSymbol] = useState(INVEST_HOLDINGS[0]?.symbol ?? "");
  const [usd, setUsd] = useState("50");
  const [units, setUnits] = useState("");
  const [sellSymbol, setSellSymbol] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const held = INVEST_HOLDINGS.filter((h) => (investments[h.symbol] ?? 0) > 0);

  const buy = (e: FormEvent) => {
    e.preventDefault();
    const res = investBuy(account.id, symbol, Number(usd));
    setMsg(res.ok ? { ok: true, text: `Bought ${symbol} for ${formatMoney(Number(usd))}.` } : { ok: false, text: res.error });
  };
  const sell = (e: FormEvent) => {
    e.preventDefault();
    const sym = sellSymbol || held[0]?.symbol || "";
    const res = investSell(account.id, sym, Number(units));
    setMsg(res.ok ? { ok: true, text: `Sold ${units} ${sym}. The money is in ${account.name}.` } : { ok: false, text: res.error });
    if (res.ok) setUnits("");
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-secondary p-3 text-xs">
        <p className="text-muted-foreground">Cash to invest: <span className="font-semibold text-foreground tabular-nums">{formatMoney(account.balance)}</span></p>
        {held.length > 0 && <p className="mt-1 text-muted-foreground">Holdings: {held.map((h) => `${investments[h.symbol]} ${h.symbol}`).join(" · ")}</p>}
      </div>

      <form onSubmit={buy} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">Buy</span>
          <select className="field" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {INVEST_HOLDINGS.map((h) => <option key={h.symbol} value={h.symbol}>{h.name} · {formatMoney(h.price)}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">USD</span>
          <input className="field tabular-nums" type="number" min="1" step="1" value={usd} onChange={(e) => setUsd(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary">Buy</button>
      </form>

      {held.length > 0 && (
        <form onSubmit={sell} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
          <label className="min-w-0 space-y-1 text-xs">
            <span className="text-muted-foreground">Sell</span>
            <select className="field" value={sellSymbol || held[0]?.symbol} onChange={(e) => setSellSymbol(e.target.value)}>
              {held.map((h) => <option key={h.symbol} value={h.symbol}>{h.name} · {investments[h.symbol]} held</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Units</span>
            <input className="field tabular-nums" type="number" min="0" step="any" value={units} onChange={(e) => setUnits(e.target.value)} />
          </label>
          <button type="submit" className="btn btn-ghost">Sell</button>
        </form>
      )}

      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>}
      <p className="text-xs text-muted-foreground">Simulated. Prices are fixed demo values, and there are no fees in this demo.</p>
    </div>
  );
}

function PocketsDetails() {
  const { goals, setRoundUp, addGoal } = useBank();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    const res = addGoal(name, target.trim() === "" ? NaN : Number(target));
    if (res.ok) {
      setName("");
      setTarget("");
      setError("");
    } else setError(res.error);
  };

  return (
    <div className="space-y-3 text-sm">
      {goals.length === 0 ? (
        <p className="text-xs text-muted-foreground">No pockets yet. Add one below.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => {
            const pct = Math.min(100, (g.saved / g.target) * 100);
            return (
              <li key={g.id} className="space-y-2 rounded-xl bg-secondary p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{g.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground"><Money value={g.saved} /> of <Money value={g.target} /></span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background/40" role="progressbar" aria-label={`${g.name} progress`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-accent-gradient" style={{ width: `${pct}%` }} />
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                  <span>Round-ups from payments</span>
                  <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!!g.roundUp} onChange={(e) => setRoundUp(g.id, e.target.checked)} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
        <label className="min-w-0 space-y-1 text-xs">
          <span className="text-muted-foreground">New pocket</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" maxLength={40} />
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Target</span>
          <input className="field tabular-nums" type="number" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Snowflake className="h-3 w-3" aria-hidden /> When a payment is made, the spare change up to the next dollar goes to the first pocket with round-ups on that has room.</p>
    </div>
  );
}
