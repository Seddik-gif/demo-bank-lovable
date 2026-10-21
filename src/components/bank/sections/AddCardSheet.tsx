import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { CARD_TONES, type Card, type CardTone } from "@/lib/bank/data";
import { CARD_TYPES, type NewCardConfig } from "@/lib/bank/money";
import { useBank } from "@/lib/bank/store";

const FINISH_LABEL: Record<CardTone, string> = { violet: "Violet", cyan: "Ice", gold: "Gold", emerald: "Emerald" };
const FINISH_SWATCH: Record<CardTone, string> = {
  violet: "linear-gradient(115deg, oklch(0.42 0.12 290), oklch(0.8 0.1 300), oklch(0.42 0.12 290))",
  cyan: "linear-gradient(115deg, oklch(0.45 0.1 215), oklch(0.84 0.1 205), oklch(0.45 0.1 215))",
  gold: "linear-gradient(115deg, oklch(0.5 0.1 75), oklch(0.9 0.12 85), oklch(0.5 0.1 75))",
  emerald: "linear-gradient(115deg, oklch(0.45 0.1 160), oklch(0.82 0.12 160), oklch(0.45 0.1 160))",
};

/** Adds a card. No card number, expiry or security code is asked for: the demo generates them. */
export function AddCardSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (index: number) => void }) {
  const { cards, addCard } = useBank();
  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState<Card["network"]>("Visa");
  const [type, setType] = useState<NewCardConfig["type"]>("Debit");
  const [tone, setTone] = useState<CardTone>("violet");
  const [online, setOnline] = useState(true);
  const [limit, setLimit] = useState("0");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = addCard({
      label,
      network,
      type,
      tone,
      onlinePayments: online,
      spendLimit: limit.trim() === "" ? 0 : Number(limit),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAdded(cards.length);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Add a card">
      <button className="fade-in absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <div className="glass page-fade relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold">Add a card</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 overflow-y-auto overscroll-contain p-5 pb-8">
          <div className="rounded-2xl p-4 text-center text-xs text-muted-foreground" style={{ background: FINISH_SWATCH[tone] }}>
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-white">Preview: {FINISH_LABEL[tone]} · {network} · {type}</span>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Card name</span>
            <input className="field" value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }} placeholder="e.g. Travel card" maxLength={30} autoFocus />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Network</span>
              <select className="field" value={network} onChange={(e) => setNetwork(e.target.value as Card["network"])}>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Type</span>
              <select className="field" value={type} onChange={(e) => setType(e.target.value as NewCardConfig["type"])}>
                {CARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm text-muted-foreground">Metal finish</legend>
            <div className="grid grid-cols-4 gap-2" role="radiogroup">
              {CARD_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tone === t}
                  onClick={() => setTone(t)}
                  className={`space-y-1 rounded-xl p-1.5 text-xs ${tone === t ? "ring-2 ring-accent" : ""}`}
                >
                  <span className="block h-10 rounded-lg" style={{ background: FINISH_SWATCH[t] }} />
                  {FINISH_LABEL[t]}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              <span className="block font-medium">Online payments</span>
              <span className="block text-xs text-muted-foreground">Allow the card for online shopping and top-ups</span>
            </span>
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Monthly limit (USD, 0 for none)</span>
            <input className="field tabular-nums" type="number" min="0" step="10" inputMode="decimal" value={limit} onChange={(e) => { setLimit(e.target.value); setError(""); }} />
          </label>

          <p className="text-xs text-muted-foreground">
            Demo card: the number, expiry and security code are generated. Nothing is charged, and no real card details are needed.
          </p>

          <button type="submit" className="btn btn-primary w-full">Add card</button>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        </form>
      </div>
    </div>,
    document.body,
  );
}
