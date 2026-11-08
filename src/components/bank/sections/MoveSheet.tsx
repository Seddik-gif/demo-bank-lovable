import { fromTyped, toDisplayAmount } from "@/lib/bank/data";
import { currencyCode } from "@/lib/bank/data";
import { useMemo, useRef, useState } from "react";
import { mouseDragHandlers } from "@/lib/bank/dragScroll";
import { SheetBackdrop, SheetPanel } from "../motion";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import { formatMoney, round2, type Account } from "@/lib/bank/data";
import { useBank } from "@/lib/bank/store";

const QUICK = [10, 50, 100] as const;

/** Move money between your accounts. Opens from any account page, or from Home. */
export function MoveSheet({ onClose, initialFrom, initialTo }: { onClose: () => void; initialFrom?: string; initialTo?: string }) {
  const { accounts, transfer } = useBank();
  // Crypto wallets hold no cash, so they can't take part in a transfer.
  const movable = useMemo(() => accounts.filter((a) => a.kind !== "crypto"), [accounts]);
  const [fromId, setFromId] = useState(initialFrom ?? movable[0]?.id ?? "");
  const [toId, setToId] = useState(() => initialTo ?? movable.find((a) => a.id !== (initialFrom ?? movable[0]?.id))?.id ?? "");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const from = movable.find((a) => a.id === fromId);
  const to = movable.find((a) => a.id === toId);
  const value = amount.trim() === "" ? NaN : fromTyped(Number(amount));
  const valid = Number.isFinite(value) && value > 0 && !!from && !!to && from.id !== to.id && value <= (from?.balance ?? 0);

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setMsg(null);
  };

  const submit = () => {
    const res = transfer(fromId, toId, value);
    if (res.ok) {
      setMsg({ ok: true, text: `Moved ${formatMoney(round2(value))} from ${from?.name} to ${to?.name}.` });
      setAmount("");
    } else setMsg({ ok: false, text: res.error });
  };

  const after = (a: Account | undefined, delta: number) => (a ? formatMoney(round2(a.balance + delta)) : "");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Move money">
      <SheetBackdrop onClick={onClose} label="Close" />
      <SheetPanel onClose={onClose} className="glass flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold">Move money</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        <div className="space-y-5 overflow-y-auto overscroll-contain p-5 pb-8">
          <AccountChooser label="From" accounts={movable} selected={fromId} disabledId={toId} onPick={(id) => { setFromId(id); setMsg(null); }} />

          <div className="flex justify-center">
            <button type="button" onClick={swap} className="btn btn-ghost btn-sm" aria-label="Swap from and to">
              <ArrowUpDown className="h-4 w-4" aria-hidden /> Swap
            </button>
          </div>

          <AccountChooser label="To" accounts={movable} selected={toId} disabledId={fromId} onPick={(id) => { setToId(id); setMsg(null); }} />

          <div className="glass space-y-3 p-4">
            <label className="block text-center">
              <span className="text-xs text-muted-foreground">Amount ({currencyCode()})</span>
              <input
                className="mt-1 block w-full bg-transparent text-center font-display text-4xl font-semibold tabular-nums outline-none"
                inputMode="decimal"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setMsg(null); }}
                aria-label="Amount to move"
              />
            </label>
            <p className="text-center text-xs text-muted-foreground">Available in {from?.name ?? "this account"}: {from ? formatMoney(from.balance) : "$0.00"}</p>
            <div className="flex justify-center gap-2" role="group" aria-label="Quick amounts">
              {QUICK.map((q) => (
                <button key={q} type="button" className="btn btn-ghost btn-sm" onClick={() => { setAmount(String(q)); setMsg(null); }}>{formatMoney(fromTyped(q))}</button>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAmount(String(round2(toDisplayAmount(from?.balance ?? 0)))); setMsg(null); }}>All</button>
            </div>
          </div>

          {valid && (
            <dl className="glass grid grid-cols-2 gap-3 p-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">{from?.name} after</dt><dd className="font-semibold tabular-nums">{after(from, -value)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">{to?.name} after</dt><dd className="font-semibold tabular-nums">{after(to, value)}</dd></div>
            </dl>
          )}

          <button type="button" className="btn btn-primary w-full" disabled={!valid} onClick={submit}>
            {valid ? `Move ${formatMoney(round2(value))}` : "Enter an amount"}
          </button>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`text-center text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</p>
          )}
          {msg?.ok && <button type="button" className="btn btn-ghost w-full" onClick={onClose}>Done</button>}
        </div>
      </SheetPanel>
    </div>,
    document.body,
  );
}

/** A horizontal row of account cards to pick one account from. The disabled account is the other side of the move. */
function AccountChooser({ label, accounts, selected, disabledId, onPick }: { label: string; accounts: Account[]; selected: string; disabledId: string; onPick: (id: string) => void }) {
  const Icon = label === "From" ? ArrowUp : ArrowDown;
  const track = useRef<HTMLDivElement>(null);
  // Mouse drag swiping along the account cards. Created once so the drag state survives between events.
  const [drag] = useState(() => mouseDragHandlers(() => track.current));
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </legend>
      <div ref={track} {...drag} className="no-scrollbar -mx-1 flex w-full min-w-0 snap-x gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={`${label} account`}>
        {accounts.map((a) => {
          const isSel = a.id === selected;
          const isOther = a.id === disabledId;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={isSel}
              disabled={isOther}
              onClick={() => onPick(a.id)}
              className={`glass w-40 shrink-0 snap-start p-3 text-left transition-all duration-300 disabled:opacity-35 ${isSel ? "ring-2 ring-accent" : ""}`}
            >
              <span className="block truncate text-sm font-semibold">{a.name}</span>
              <span className="block text-xs tabular-nums text-muted-foreground">{formatMoney(a.balance)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
