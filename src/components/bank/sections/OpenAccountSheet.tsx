import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Bitcoin, ChevronLeft, Coins, PiggyBank, TrendingUp, Users, Globe2, X } from "lucide-react";
import { CURRENCY_PER_USD, SAVINGS_RATE, type NewAccountConfig } from "@/lib/bank/money";
import { useBank } from "@/lib/bank/store";

type Choice = "savings" | "currency" | "joint" | "crypto" | "invest" | "pockets";

const OPTIONS: { id: Choice; title: string; detail: string; icon: typeof PiggyBank }[] = [
  { id: "savings", title: "Savings account", detail: `Keep cash apart. Interest is shown at ${(SAVINGS_RATE * 100).toFixed(2)}% a year. You can take money out at any time.`, icon: PiggyBank },
  { id: "currency", title: "Currency account", detail: "Hold GBP, CHF or EUR next to your USD money. Balances are shown in that currency.", icon: Globe2 },
  { id: "joint", title: "Joint account", detail: "Share an account with one other person, with its own IBAN. You can have one.", icon: Users },
  { id: "crypto", title: "Crypto wallet", detail: "Receive and sell crypto from one account page. Sales go to your main account.", icon: Bitcoin },
  { id: "invest", title: "Investments", detail: "Buy and sell funds, bonds and stocks with cash you move in from another account.", icon: TrendingUp },
  { id: "pockets", title: "Round-up pockets", detail: "Spare change from your payments is put aside in pockets you choose.", icon: Coins },
];

/** Opens another kind of account next to the main current account. */
export function OpenAccountSheet({ onClose }: { onClose: () => void }) {
  const { openAccount, accounts } = useBank();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [currency, setCurrency] = useState("GBP");
  const [coHolder, setCoHolder] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const existing = (kind: Choice) => accounts.some((a) => a.kind === kind);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!choice) return;
    const cfg: NewAccountConfig =
      choice === "savings"
        ? { kind: "savings" }
        : choice === "currency"
          ? { kind: "currency", currency }
          : choice === "joint"
            ? { kind: "joint", coHolder }
            : { kind: choice };
    const res = openAccount(cfg);
    setError(res.ok ? "" : res.error);
    setDone(res.ok ? "Account opened. Find it under Profile → Accounts and on Home." : "");
    if (res.ok) setChoice(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Open an account">
      <button className="fade-in absolute inset-0 bg-background/70 backdrop-blur-md" aria-label="Close" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold">Open an account</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <div className="space-y-4 overflow-y-auto overscroll-contain p-5 pb-8">
          {!choice ? (
            <ul className="space-y-2">
              {OPTIONS.map(({ id, title, detail, icon: Icon }) => (
                <li key={id}>
                  <button type="button" onClick={() => { setChoice(id); setError(""); setDone(""); }} className="glass flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-accent"><Icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="block text-xs text-muted-foreground">{detail}</span>
                      {existing(id) && <span className="block text-xs text-accent">You already have one. Open another to add more.</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChoice(null)}><ChevronLeft className="h-4 w-4" aria-hidden /> All accounts</button>
              <p className="text-sm font-semibold">{OPTIONS.find((o) => o.id === choice)?.title}</p>
              <p className="text-xs text-muted-foreground">{OPTIONS.find((o) => o.id === choice)?.detail}</p>

              {choice === "currency" && (
                <label className="block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Currency</span>
                  <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {Object.keys(CURRENCY_PER_USD).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="block text-xs text-muted-foreground">Demo rate: 1 USD = {CURRENCY_PER_USD[currency]} {currency}.</span>
                </label>
              )}

              {choice === "joint" && (
                <label className="block space-y-1.5 text-sm">
                  <span className="text-muted-foreground">Second holder's name</span>
                  <input className="field" value={coHolder} onChange={(e) => setCoHolder(e.target.value)} placeholder="e.g. Alex Morgan" maxLength={40} />
                </label>
              )}

              {choice === "savings" && (
                <p className="glass p-3 text-xs text-muted-foreground">Interest is shown as an estimate in this demo. It is not paid into the account.</p>
              )}

              <button type="submit" className="btn btn-primary w-full">Open {OPTIONS.find((o) => o.id === choice)?.title.toLowerCase()}</button>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            </form>
          )}
          {done && <p role="status" className="text-sm font-medium text-success">{done}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
