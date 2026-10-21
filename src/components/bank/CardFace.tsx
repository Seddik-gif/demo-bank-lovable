import type { Card, CardTone } from "@/lib/bank/data";

/** A thin accent line per finish. The card itself stays dark, like the reference: matte black with light details. */
const ACCENT: Record<CardTone, string> = {
  violet: "#a78bfa",
  cyan: "#67e8f9",
  gold: "#fcd34d",
  emerald: "#6ee7b7",
};

/**
 * A dark matte card with three things on it: the network logo at the top right, the contactless arcs,
 * and the card number. Everything else (bank name, name, expiry, chip) is left off.
 */
export function CardFace({ card, className = "" }: { card: Card; holder?: string; className?: string }) {
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
        <span />
        <NetworkLogo network={card.network} />
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[18px] font-light tracking-[0.18em] text-neutral-200">{digits}</p>
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-neutral-300" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8.5 9.5a4 4 0 0 1 0 5" />
          <path d="M11.5 7a7.5 7.5 0 0 1 0 10" />
          <path d="M14.5 4.5a11 11 0 0 1 0 15" />
        </svg>
      </div>

      {card.frozen && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-200">Frozen</div>
      )}
    </div>
  );
}

/** The Visa wordmark: heavy italic letters with the blue-and-gold stripe under them, as on the real logo. */
function NetworkLogo({ network }: { network: Card["network"] }) {
  if (network === "Mastercard") {
    return (
      <svg viewBox="0 0 60 38" className="h-9 w-auto" role="img" aria-label="Mastercard">
        <circle cx="19" cy="19" r="17" fill="#eb001b" />
        <circle cx="41" cy="19" r="17" fill="#f79e1b" />
        <path d="M30 4.6a17 17 0 0 1 0 28.8 17 17 0 0 1 0-28.8z" fill="#ff5f00" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-auto" role="img" aria-label="Visa">
      <text x="0" y="25" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="30" letterSpacing="-0.5">VISA</text>
      <path d="M2 29 L92 27" stroke="#f7b600" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
