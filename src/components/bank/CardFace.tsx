import type { Card, CardTone } from "@/lib/bank/data";

/** One solid colour per finish. No texture, no gloss. */
const COLOUR: Record<CardTone, string> = {
  violet: "#5b21b6",
  cyan: "#0e7490",
  gold: "#a16207",
  emerald: "#047857",
};

/** A simple card: one colour, the bank and network at the top, the number in large type, and the name and expiry at the bottom. */
export function CardFace({ card, holder, className = "" }: { card: Card; holder: string; className?: string }) {
  const expiry = card.expiry ?? "••/••";
  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-2xl p-5 text-white ${className}`}
      style={{ background: COLOUR[card.tone] }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Demo Bank</span>
        <span className="text-sm font-semibold tracking-wide opacity-90">{card.network}</span>
      </div>

      <p className="font-mono text-lg tracking-[0.2em]">•••• {card.last4}</p>

      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{holder}</p>
        <p className="shrink-0 font-mono text-sm">{expiry}</p>
      </div>

      {card.frozen && (
        <div className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-semibold">Frozen</div>
      )}
    </div>
  );
}
