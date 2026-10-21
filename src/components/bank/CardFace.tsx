import type { Card, CardTone } from "@/lib/bank/data";

/**
 * The card palette from the reference, made see-through: each gradient keeps its colours but at about 80% opacity,
 * so the card looks like tinted glass. Each finish also has the colour its text should be.
 */
const FINISH: Record<CardTone, { background: string; ink: string }> = {
  violet: { background: "linear-gradient(135deg, rgba(224,33,138,0.44) 0%, rgba(157,43,214,0.42) 55%, rgba(74,20,216,0.46) 100%)", ink: "#ffffff" },
  gold: { background: "linear-gradient(135deg, rgba(255,143,177,0.42) 0%, rgba(255,196,163,0.4) 45%, rgba(253,246,178,0.42) 100%)", ink: "#1e1b4b" },
  cyan: { background: "linear-gradient(135deg, rgba(157,195,255,0.42) 0%, rgba(191,230,247,0.4) 50%, rgba(185,246,216,0.42) 100%)", ink: "#1e1b4b" },
  emerald: { background: "linear-gradient(135deg, rgba(185,246,216,0.42) 0%, rgba(216,247,166,0.4) 55%, rgba(253,246,178,0.42) 100%)", ink: "#1e1b4b" },
};

/**
 * A 3D glass card in the reference design: tilted in space, see-through with a frosted edge, a light sheen,
 * and the network logo, contactless arcs and card number on top. It straightens when you hover over it.
 */
export function CardFace({ card, className = "" }: { card: Card; holder?: string; className?: string }) {
  const { background, ink } = FINISH[card.tone];
  const digits = `•••• •••• •••• ${card.last4}`;
  return (
    <div
      className={`relative aspect-[1.586] w-full rounded-[1.1rem] transition-transform duration-500 ease-out [transform:perspective(900px)_rotateX(8deg)_rotateY(-10deg)] hover:[transform:perspective(900px)_rotateX(0deg)_rotateY(0deg)] ${className}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div
        className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[1.1rem] border border-white/60 p-5"
        style={{
          background,
          backdropFilter: "blur(14px) saturate(190%)",
          WebkitBackdropFilter: "blur(14px) saturate(190%)",
          color: ink,
          boxShadow:
            "0 34px 44px -22px rgba(20,10,60,0.6), 0 10px 18px -10px rgba(20,10,60,0.35), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {/* Sheen: a light band across the top-left, like light on glass. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 34%, transparent 52%)" }}
        />

        <div className="relative flex items-start justify-between">
          <span />
          <NetworkLogo network={card.network} ink={ink} />
        </div>

        <div className="relative flex items-center justify-between">
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
