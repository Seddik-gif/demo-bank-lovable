import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, CreditCard, Smartphone, Truck, X } from "lucide-react";
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
const TYPE_HELP: Record<NewCardConfig["type"], string> = {
  Debit: "Spends the money in the account it is linked to.",
  Credit: "Spends a credit line and is paid back later.",
  Prepaid: "Loaded with a set amount you choose in advance.",
  "Online only": "For online shopping only. Cannot be used in shops.",
};
const STEPS = ["Choose", "Create", "Configure", "Order"] as const;

/**
 * Card wizard: choose the card, create it, configure it, then order it as digital or physical.
 * Used when a customer adds a card and right after opening an account. `mandatory` hides the close button,
 * so the customer has to finish the order.
 */
export function AddCardSheet({ onClose, onAdded, mandatory = false }: { onClose: () => void; onAdded: (index: number) => void; mandatory?: boolean }) {
  const { cards, addCard } = useBank();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<NewCardConfig["type"]>("Debit");
  const [network, setNetwork] = useState<Card["network"]>("Visa");
  const [label, setLabel] = useState("");
  const [tone, setTone] = useState<CardTone>("violet");
  const [online, setOnline] = useState(true);
  const [limit, setLimit] = useState("0");
  const [delivery, setDelivery] = useState<NewCardConfig["delivery"]>("digital");
  const [error, setError] = useState("");

  const next = () => {
    if (step === 1 && label.trim().length < 2) return setError("Name the card (at least 2 characters).");
    if (step === 2 && limit.trim() !== "" && (!Number.isFinite(Number(limit)) || Number(limit) < 0)) return setError("The monthly limit must be 0 or more.");
    setError("");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const order = () => {
    const res = addCard({
      label,
      network,
      type,
      tone,
      onlinePayments: online,
      spendLimit: limit.trim() === "" ? 0 : Number(limit),
      delivery,
    });
    if (!res.ok) return setError(res.error);
    onAdded(cards.length);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Order a card">
      <button className="fade-in absolute inset-0 bg-background/70" aria-label={mandatory ? "Card wizard" : "Close"} onClick={mandatory ? undefined : onClose} />
      <div className="glass page-fade relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setError(""); setStep((s) => s - 1); }}><ChevronLeft className="h-4 w-4" aria-hidden /> Back</button>
            ) : <span />}
            <h2 className="text-lg font-semibold">Order a card</h2>
            {!mandatory ? (
              <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
            ) : <span className="w-8" />}
          </div>
          <ol className="grid grid-cols-4 gap-1 text-center text-[11px] text-muted-foreground" aria-label="Steps">
            {STEPS.map((name, i) => (
              <li key={name} aria-current={i === step ? "step" : undefined} className={i <= step ? "text-foreground" : ""}>
                <span className={`mx-auto mb-1 block h-1 rounded-full ${i <= step ? "bg-accent-gradient" : "bg-secondary"}`} />
                {i + 1}. {name}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-5 overflow-y-auto overscroll-contain p-5 pb-6">
          {step === 0 && (
            <>
              <div>
                <p className="text-sm font-semibold">What kind of card?</p>
                <div className="mt-2 grid gap-2">
                  {CARD_TYPES.map((t) => (
                    <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={`glass flex items-start gap-3 p-3 text-left ${type === t ? "ring-2 ring-accent" : ""}`}>
                      <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <span><span className="block text-sm font-medium">{t}</span><span className="block text-xs text-muted-foreground">{TYPE_HELP[t]}</span></span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Network</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["Visa", "Mastercard"] as const).map((n) => (
                    <button key={n} type="button" aria-pressed={network === n} onClick={() => setNetwork(n)} className={`btn ${network === n ? "btn-primary" : "btn-ghost"}`}>{n}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm font-semibold">Create the card</p>
              <div className="rounded-2xl p-4 text-xs" style={{ background: FINISH_SWATCH[tone] }}>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-white">{network} · {type}</span>
                <p className="mt-6 font-mono text-sm text-white/90">•••• •••• •••• ••••</p>
                <p className="mt-1 text-white/80">{label.trim() || "Your card name"}</p>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="text-muted-foreground">Card name</span>
                <input className="field" value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }} placeholder="e.g. Travel card" maxLength={30} autoFocus />
              </label>
              <p className="text-xs text-muted-foreground">The number, expiry and security code are generated in this demo. Nothing is charged.</p>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-semibold">Configure the card</p>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm text-muted-foreground">Metal finish</legend>
                <div className="grid grid-cols-4 gap-2" role="radiogroup">
                  {CARD_TONES.map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={tone === t} onClick={() => setTone(t)} className={`space-y-1 rounded-xl p-1.5 text-xs ${tone === t ? "ring-2 ring-accent" : ""}`}>
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
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-semibold">How do you want the card?</p>
              <div className="grid gap-2">
                <button type="button" aria-pressed={delivery === "digital"} onClick={() => setDelivery("digital")} className={`glass flex items-start gap-3 p-3 text-left ${delivery === "digital" ? "ring-2 ring-accent" : ""}`}>
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span><span className="block text-sm font-medium">Digital card</span><span className="block text-xs text-muted-foreground">Ready now in the app. Use it for online payments and Apple or Google Pay.</span></span>
                </button>
                <button type="button" aria-pressed={delivery === "physical"} onClick={() => setDelivery("physical")} className={`glass flex items-start gap-3 p-3 text-left ${delivery === "physical" ? "ring-2 ring-accent" : ""}`}>
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <span><span className="block text-sm font-medium">Physical card</span><span className="block text-xs text-muted-foreground">Posted to you. It works once it arrives (in this demo, mark it delivered from the Cards page).</span></span>
                </button>
              </div>
              <dl className="glass space-y-2 p-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Card</dt><dd>{label.trim()} · {network} {type}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Finish</dt><dd>{FINISH_LABEL[tone]}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Online payments</dt><dd>{online ? "On" : "Off"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Monthly limit</dt><dd>{Number(limit) > 0 ? `$${Number(limit).toFixed(2)}` : "None"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Delivery</dt><dd>{delivery === "digital" ? "Digital, ready now" : "Physical, on its way"}</dd></div>
              </dl>
            </>
          )}

          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary w-full" onClick={next}>Continue</button>
          ) : (
            <button type="button" className="btn btn-primary w-full" onClick={order}>
              {delivery === "digital" ? "Order digital card" : "Order physical card"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
