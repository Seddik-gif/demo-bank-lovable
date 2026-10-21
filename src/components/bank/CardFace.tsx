import type { Card, CardTone } from "@/lib/bank/data";

/**
 * The card palette from the reference: magenta to purple, peach to pink to yellow, and blue to mint.
 * Each finish has its gradient and the colour its text should be (white on the dark one, navy on the light ones).
 */
const FINISH: Record<CardTone, { background: string; ink: string }> = {
  violet: { background: "linear-gradient(135deg, #e0218a 0%, #9d2bd6 55%, #4a14d8 100%)", ink: "#ffffff" },
  gold: { background: "linear-gradient(135deg, #ff8fb1 0%, #ffc4a3 45%, #fdf6b2 100%)", ink: "#1e1b4b" },
  cyan: { background: "linear-gradient(135deg, #9dc3ff 0%, #bfe6f7 50%, #b9f6d8 100%)", ink: "#1e1b4b" },
  emerald: { background: "linear-gradient(135deg, #b9f6d8 0%, #d8f7a6 55%, #fdf6b2 100%)", ink: "#1e1b4b" },
};

/**
 * A card in the reference design: a coloured gradient, the network logo at the top, the contactless arcs,
 * and the card number. The bank name, holder name, expiry and chip are left off.
 */
export function CardFace({ card, className = "" }: { card: Card; holder?: string; className?: string }) {
  const { background, ink } = FINISH[card.tone];
  const digits = `•••• •••• •••• ${card.last4}`;
  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-[1.1rem] p-5 ${className}`}
      style={{ background, color: ink, boxShadow: "0 18px 34px -16px rgba(20,10,60,0.55)" }}
    >
      <div className="flex items-start justify-between">
        <span />
        <NetworkLogo network={card.network} ink={ink} />
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] font-medium tracking-[0.16em]" style={{ color: card.tone === "violet" ? "rgba(255,255,255,0.85)" : "rgba(30,27,75,0.75)" }}>{digits}</p>
        <svg viewBox="0 0 24 24" className="h-6 w-6 opacity-80" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M8.5 9.5a4 4 0 0 1 0 5" />
          <path d="M11.5 7a7.5 7.5 0 0 1 0 10" />
          <path d="M14.5 4.5a11 11 0 0 1 0 15" />
        </svg>
      </div>

      {card.frozen && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-semibold uppercase tracking-[0.2em] text-white">Frozen</div>
      )}
    </div>
  );
}

/** The network logo, drawn to match the reference: a bold italic VISA wordmark, or the two Mastercard circles. */
function NetworkLogo({ network, ink }: { network: Card["network"]; ink: string }) {
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
      <text x="0" y="26" fill={ink} fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontStyle="italic" fontSize="30" letterSpacing="-0.5">VISA</text>
    </svg>
  );
}
