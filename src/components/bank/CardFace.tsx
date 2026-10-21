import type { Card, CardTone } from "@/lib/bank/data";

/** A thin accent line per finish. The card itself stays dark, like the reference: matte black with light details. */
const ACCENT: Record<CardTone, string> = {
  violet: "#a78bfa",
  cyan: "#67e8f9",
  gold: "#fcd34d",
  emerald: "#6ee7b7",
};

/**
 * A dark matte card: bank name at the top, a silver chip with contactless arcs, the number in large digits,
 * then the name and "valid thru" at the bottom. Drawn here, not copied from any stock artwork.
 */
export function CardFace({ card, holder, className = "" }: { card: Card; holder: string; className?: string }) {
  const expiry = card.expiry ?? "00/00";
  const digits = `•••• •••• •••• ${card.last4}`;
  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-[1.1rem] p-5 text-neutral-100 ${className}`}
      style={{
        background: "linear-gradient(160deg, #2a2a2e 0%, #141416 55%, #0b0b0c 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.18), 0 14px 30px -12px rgba(0,0,0,0.8)",
      }}
    >
      {/* A thin accent line along the top edge, in the card's finish colour. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT[card.tone]}, transparent)` }} />

      <div className="flex items-start justify-between">
        <span className="font-display text-[15px] font-bold uppercase tracking-[0.08em] text-neutral-100">Demo Bank</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{card.network}</span>
      </div>

      <div className="flex items-center gap-3">
        <span aria-hidden className="relative block h-[30px] w-[40px] overflow-hidden rounded-[5px]" style={{ background: "linear-gradient(135deg, #e5e7eb 0%, #9ca3af 40%, #f3f4f6 60%, #6b7280 100%)" }}>
          <span className="absolute inset-x-0 top-1/2 h-px bg-neutral-700/70" />
          <span className="absolute inset-y-0 left-1/3 w-px bg-neutral-700/70" />
          <span className="absolute inset-y-0 right-1/3 w-px bg-neutral-700/70" />
        </span>
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-neutral-300" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8.5 9.5a4 4 0 0 1 0 5" />
          <path d="M11.5 7a7.5 7.5 0 0 1 0 10" />
          <path d="M14.5 4.5a11 11 0 0 1 0 15" />
        </svg>
      </div>

      <p className="font-mono text-[18px] font-light tracking-[0.18em] text-neutral-200">{digits}</p>

      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-100">{holder}</p>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-semibold uppercase leading-none tracking-[0.1em] text-neutral-400">Valid<br />thru</p>
          <p className="mt-0.5 font-mono text-[13px] tracking-wider text-neutral-100">{expiry}</p>
        </div>
      </div>

      {card.frozen && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200">Frozen</div>
      )}
    </div>
  );
}
