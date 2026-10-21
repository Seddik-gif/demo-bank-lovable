import { useState, type PointerEvent } from "react";
import type { Card, CardTone } from "@/lib/bank/data";

/**
 * The card palette from the reference, made see-through: each gradient keeps its colours but at about 80% opacity,
 * so the card looks like tinted glass. Each finish also has the colour its text should be.
 */
export const FINISH: Record<CardTone, { background: string; ink: string }> = {
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
  // The card leans toward the pointer and settles flat when the pointer leaves. Limited to 8 degrees.
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 16, y: px * 16 });
  };
  return (
    <div
      className={`relative isolate z-0 aspect-[1.586] w-full rounded-[1.1rem] ${className}`}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.25s ease-out",
      }}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[1.1rem] border-2 border-white/70 p-5"
        style={{
          background,
          backdropFilter: "blur(14px) saturate(190%)",
          WebkitBackdropFilter: "blur(14px) saturate(190%)",
          color: ink,
          // A thick, bright edge: a light rim inside and a soft shadow outside, like a slab of glass.
          boxShadow:
            "0 34px 44px -22px rgba(20,10,60,0.6), 0 10px 18px -10px rgba(20,10,60,0.35), inset 0 0 0 3px rgba(255,255,255,0.28), inset 0 2px 10px rgba(255,255,255,0.8), inset 0 -2px 6px rgba(255,255,255,0.35)",
        }}
      >
        {/* Holographic shimmer: pastel rainbow light that moves across the glass. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen"
          style={{
            background:
              "linear-gradient(115deg, rgba(255,190,240,0.7) 0%, rgba(190,235,255,0.7) 22%, rgba(210,255,220,0.65) 42%, rgba(255,240,190,0.65) 60%, rgba(220,200,255,0.7) 80%, rgba(255,190,240,0.7) 100%)",
          }}
        />
        {/* Sheen: a light band across the top-left, like light on glass. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.14) 34%, transparent 52%)" }}
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
