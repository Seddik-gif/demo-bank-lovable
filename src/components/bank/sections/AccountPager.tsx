import { currencyCode } from "@/lib/bank/data";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUpDown, BookOpen, Snowflake } from "lucide-react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { MoveSheet } from "./MoveSheet";
import { AccountGuide } from "./AccountGuide";
import { CRYPTO_HOLDINGS, INVEST_HOLDINGS, formatMoney, type Account, type AccountKind, type SectionId, type Transaction } from "@/lib/bank/data";
import { CRYPTO_ASSETS, heldOf } from "@/lib/bank/crypto";
import { SAVINGS_RATE, cryptoValue, inCurrency, investmentsValue } from "@/lib/bank/money";
import { ratePerEur, type Currency } from "@/lib/bank/fx";
import { fromTyped } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";
import { Money } from "../Money";
import { TransactionList } from "../TransactionList";
import { CryptoWalletSheet } from "./CryptoWalletSheet";
import { CoinIllustration, ReceiptIllustration } from "../Illustrations";

const KIND_LABEL: Record<AccountKind, string> = {
  current: "Current account",
  savings: "Savings account",
  currency: "Currency account",
  joint: "Joint account",
  crypto: "Crypto wallet",
  invest: "Investments",
  pockets: "Round-up account",
};

/** Crypto wallets hold their money as crypto and invest accounts add holdings; every other account shows its balance. */
function balanceOf(a: Account, s: { crypto: Record<string, number>; investments: Record<string, number> }): number {
  if (a.kind === "crypto") return cryptoValue(s.crypto);
  if (a.kind === "invest") return Math.round((a.balance + investmentsValue(s.investments)) * 100) / 100;
  return a.balance;
}

function activityOf(a: Account, transactions: Transaction[]): Transaction[] {
  if (a.kind === "crypto") return transactions.filter((t) => t.category === "Crypto");
  return transactions.filter((t) => t.accountId === a.id);
}

/** The account pages on Home. Swipe sideways to move from one account to the next. */
export function AccountPager({ onNavigate, actions }: { onNavigate: (id: SectionId) => void; actions?: ReactNode }) {
  const { accounts, transactions, crypto, investments } = useBank();
  const reduce = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  // The track's horizontal position, in pixels. Dragging moves it directly, and a spring settles it on a page.
  const x = useMotionValue(0);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  // The page a drag started on, so one swipe moves exactly one page.
  const startRef = useRef(0);
  // The main current account always comes first; the rest keep their opening order.
  const ordered = [...accounts].sort((a, b) => Number(a.id !== "main") - Number(b.id !== "main"));
  const count = ordered.length;
  const activeKind = ordered[active]?.kind ?? "current";

  // Keep the page lined up with its width, including on resize.
  useLayoutEffect(() => {
    const measure = () => {
      const w = viewport.current?.clientWidth ?? 0;
      setWidth(w);
      x.set(-activeRef.current * w);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [x]);

  // The dots follow the track while it moves, so they always show the page under the finger.
  useMotionValueEvent(x, "change", (v) => {
    if (!width) return;
    const i = Math.max(0, Math.min(count - 1, Math.round(-v / width)));
    if (i !== activeRef.current) {
      activeRef.current = i;
      setActive(i);
    }
  });

  // Spring to a page. A flick carries the track further, so a quick swipe goes on to the next page.
  const snapTo = (i: number, velocity = 0) => {
    const target = Math.max(0, Math.min(count - 1, i));
    activeRef.current = target;
    setActive(target);
    animate(x, -target * width, reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 36, mass: 0.9, velocity });
  };

  // The whole screen takes the colour of the account you are on, and fades to the next one as you swipe.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-section]");
    const theme = ACCOUNT_THEME[activeKind];
    if (!root) return;
    root.style.setProperty("--wash-a", theme.from);
    root.style.setProperty("--wash-b", theme.to);
  }, [activeKind]);

  // Back on another section, the screen returns to that section's colour.
  useEffect(
    () => () => {
      const root = document.querySelector<HTMLElement>("[data-section]");
      root?.style.removeProperty("--wash-a");
      root?.style.removeProperty("--wash-b");
    },
    [],
  );


  return (
    <section aria-label="Your accounts" className="space-y-3">
      <div ref={viewport} className="-mx-4 overflow-hidden" aria-label="Accounts">
        <motion.div
          className="flex touch-pan-y"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -(count - 1) * width, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => {
            startRef.current = activeRef.current;
          }}
          onDragEnd={(_, info) => {
            const w = width || 1;
            // A firm swipe moves one page in its direction. A slow drag settles on the nearest page.
            const firm = Math.abs(info.offset.x) > w * 0.2 || Math.abs(info.velocity.x) > 400;
            const target = firm ? startRef.current + (info.offset.x < 0 ? 1 : -1) : Math.round(-x.get() / w);
            snapTo(target, info.velocity.x);
          }}
        >
          {ordered.map((a, i) => (
            <PagerSlide key={a.id} x={x} index={i} width={width}>
              <AccountPage account={a} balance={balanceOf(a, { crypto, investments })} transactions={activityOf(a, transactions)} onNavigate={onNavigate} actions={actions} />
            </PagerSlide>
          ))}
        </motion.div>
      </div>
      {ordered.length > 1 && (
        <div className="flex justify-center gap-2" role="tablist" aria-label="Choose an account">
          {ordered.map((a, i) => (
            <button key={a.id} type="button" role="tab" aria-selected={i === active} aria-label={a.name} onClick={() => snapTo(i)} className="relative h-2 w-2 rounded-full bg-muted-foreground/40">
              {/* One pill slides between the dots on a spring, instead of each dot resizing on its own. */}
              {i === active && <motion.span layoutId="account-pill" className="absolute left-0 top-0 h-2 w-6 rounded-full bg-accent" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * One page of the pager. As the track moves, the page you are leaving shrinks and fades,
 * and the one you are reaching grows to full size. The values come straight from the track's position.
 */
function PagerSlide({ x, index, width, children }: { x: MotionValue<number>; index: number; width: number; children: ReactNode }) {
  const distance = (v: number) => Math.min(1, Math.abs((v + index * width) / (width || 1)));
  const scale = useTransform(x, (v) => 1 - 0.06 * distance(v));
  const opacity = useTransform(x, (v) => 1 - 0.4 * distance(v));
  return (
    <motion.div className="shrink-0 px-4" style={{ width, scale, opacity }}>
      {children}
    </motion.div>
  );
}

/** Each type of account has its own colours, so you know where you are as you swipe. */
const ACCOUNT_THEME: Record<AccountKind, { from: string; to: string; glow: string }> = {
  current: { from: "#5b21b6", to: "#1e1b4b", glow: "#a78bfa" },
  savings: { from: "#047857", to: "#052e2b", glow: "#6ee7b7" },
  currency: { from: "#0369a1", to: "#0c1a3a", glow: "#7dd3fc" },
  joint: { from: "#b45309", to: "#3b0d0d", glow: "#fcd34d" },
  crypto: { from: "#a16207", to: "#1c1917", glow: "#fde68a" },
  invest: { from: "#1d4ed8", to: "#0b1537", glow: "#67e8f9" },
  pockets: { from: "#be185d", to: "#3b0764", glow: "#f9a8d4" },
};

function AccountPage({ account: a, balance, transactions, onNavigate, actions }: { account: Account; balance: number; transactions: Transaction[]; onNavigate: (id: SectionId) => void; actions?: ReactNode }) {
  const kind = a.kind ?? "current";
  const theme = ACCOUNT_THEME[kind];
  const [moving, setMoving] = useState(false);
  const [guiding, setGuiding] = useState(false);
  // Crypto wallets hold no cash, so only the money accounts can be moved from.
  const canMove = kind !== "crypto";

  // Account on top, a compact Latest activity card below. The card grows row by row, up to three.
  return (
    <div className="reveal relative">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl" style={{ background: theme.glow }} aria-hidden />
      <article className="relative flex flex-col gap-3 md:grid md:grid-cols-2 md:items-start" aria-label={a.name}>
      <div className="flex min-w-0 flex-col gap-3">
      <section className="glass min-w-0 space-y-4 p-5" aria-label="Account details">
        <header className="space-y-1">
          <p className="text-xs text-white/70">{KIND_LABEL[kind]}</p>
          <h2 className="truncate text-lg font-semibold">{a.name}</h2>
          <p className="font-display text-3xl font-semibold tabular-nums"><Money value={balance} /></p>
          {kind === "currency" && a.currency && <p className="text-xs text-white/70">≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: a.currency }).format(inCurrency(balance, a.currency))}</p>}
        </header>
        <div className="grid grid-cols-2 gap-2">
          {canMove ? (
            <button type="button" className="btn btn-primary" onClick={() => setMoving(true)}>
              <ArrowUpDown className="h-4 w-4" aria-hidden /> Move money
            </button>
          ) : <span />}
          <button type="button" className="btn btn-ghost" onClick={() => setGuiding(true)}>
            <BookOpen className="h-4 w-4" aria-hidden /> How it works
          </button>
        </div>
        <Details account={a} />
      </section>
      {/* Quick actions sit right under the account card. */}
      {actions}
      </div>

      <section className="glass min-w-0 p-4" aria-label="Latest activity">
        <p className="mb-1 text-sm font-semibold">Latest activity</p>
        {transactions.length === 0 ? (
          <div className="grid place-items-center gap-1 py-2 text-center">
            <ReceiptIllustration className="h-14 w-14" />
            <p className="text-xs text-muted-foreground">No transactions</p>
          </div>
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
      {moving && <MoveSheet initialFrom={a.id} onClose={() => setMoving(false)} />}
      {guiding && <AccountGuide kind={kind} onClose={() => setGuiding(false)} />}
    </div>
  );
}

function Details({ account: a }: { account: Account }) {
  switch (a.kind ?? "current") {
    case "crypto":
      return <CryptoDetails />;
    case "invest":
      return <InvestDetails account={a} />;
    case "pockets":
      return <RoundUpDetails account={a} />;
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
        <p className="text-xs text-muted-foreground">Live rate: 1 EUR = {ratePerEur(a.currency as Currency).toFixed(4)} {a.currency}. Balances are kept in EUR.</p>
      )}
      {kind === "joint" && <p className="text-xs text-muted-foreground">Shared with {a.coHolder}. Both holders can see and use this account.</p>}
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
        <div className="grid place-items-center gap-2 text-center">
          <CoinIllustration className="h-14 w-14" />
          <p className="text-xs text-muted-foreground">You don't hold any crypto yet. Receive some from another wallet.</p>
        </div>
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
    const res = investBuy(account.id, symbol, fromTyped(Number(usd)));
    setMsg(res.ok ? { ok: true, text: `Bought ${symbol} for ${formatMoney(fromTyped(Number(usd)))}.` } : { ok: false, text: res.error });
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
          <span className="text-muted-foreground">{currencyCode()}</span>
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

function RoundUpDetails({ account: a }: { account: Account }) {
  const { setRoundUp } = useBank();
  const on = a.roundUp !== false;
  return (
    <div className="space-y-3 text-sm">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-secondary p-3">
        <span>
          <span className="block font-semibold">Round up my payments</span>
          <span className="block text-xs text-muted-foreground">Spare change up to the next dollar is saved here.</span>
        </span>
        <input type="checkbox" className="h-4 w-4 shrink-0 accent-[var(--accent)]" checked={on} onChange={(e) => setRoundUp(e.target.checked)} aria-label="Round up my payments" />
      </label>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Snowflake className="h-3 w-3" aria-hidden /> Round-ups come from payments you make, requests you pay and scheduled payments.</p>
    </div>
  );
}
