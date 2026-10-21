import type { Card, CardTone } from "@/lib/bank/data";

/** Colours of each card finish: a deep base, a bright band for the light, and a soft edge. */
const FINISH: Record<CardTone, { base: string; band: string; edge: string }> = {
  violet: { base: "#2e1065", band: "#a78bfa", edge: "#c4b5fd" },
  cyan: { base: "#083344", band: "#22d3ee", edge: "#a5f3fc" },
  gold: { base: "#422006", band: "#facc15", edge: "#fef08a" },
  emerald: { base: "#022c22", band: "#34d399", edge: "#a7f3d0" },
};

/** A payment card drawn the way a real one looks: chip, contactless mark, network logo, brushed metal and a gloss. */
export function CardFace({ card, holder, className = "" }: { card: Card; holder: string; className?: string }) {
  const f = FINISH[card.tone];
  const expiry = card.expiry ?? "••/••";
  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden rounded-[1.1rem] text-white shadow-[0_18px_34px_-14px_rgba(0,0,0,0.75)] ${className}`}
      style={{
        background: `linear-gradient(128deg, ${f.base} 0%, ${f.band} 42%, ${f.base} 58%, ${f.band} 78%, ${f.base} 100%)`,
        boxShadow: `inset 0 0 0 1px ${f.edge}55, 0 18px 34px -14px rgba(0,0,0,0.75)`,
      }}
    >
      {/* Brushed metal: fine lines across the card. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 3px)" }} />
      {/* Gloss: a light sheen over the top-left, and a soft shade at the bottom. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(155deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 32%, transparent 52%, rgba(0,0,0,0.25) 100%)" }} />
      <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />

      <div className="relative z-10 flex h-full flex-col justify-between p-[5%]">
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">Demo Bank</span>
          <NetworkLogo network={card.network} />
        </div>

        <div className="flex items-center gap-3">
          <Chip />
          <Contactless />
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[13px] tracking-[0.22em] text-white/95 drop-shadow">
            •••• •••• •••• {card.last4}
          </p>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[7px] uppercase tracking-[0.2em] text-white/60">Card holder</p>
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">{holder}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[7px] uppercase tracking-[0.2em] text-white/60">Valid thru</p>
              <p className="font-mono text-[11px] tracking-[0.12em]">{expiry}</p>
            </div>
          </div>
        </div>
      </div>

      {card.frozen && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 text-[11px] font-semibold uppercase tracking-[0.2em]">Frozen</div>
      )}
    </div>
  );
}

/** A gold EMV chip with its contact lines. */
function Chip() {
  return (
    <span
      aria-hidden
      className="relative block h-[30px] w-[40px] overflow-hidden rounded-[6px] shadow-inner"
      style={{ background: "linear-gradient(135deg, #fde68a 0%, #d4a72c 35%, #fef3c7 55%, #b8860b 80%, #f5d97a 100%)" }}
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-black/35" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-black/35" />
      <span className="absolute inset-y-0 right-1/3 w-px bg-black/35" />
      <span className="absolute inset-[3px] rounded-[3px] border border-black/25" />
    </span>
  );
}

/** The contactless symbol: four arcs. */
function Contactless() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 opacity-85" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8.5 9.5a4 4 0 0 1 0 5" />
      <path d="M11.5 7a7.5 7.5 0 0 1 0 10" />
      <path d="M14.5 4.5a11 11 0 0 1 0 15" />
    </svg>
  );
}

/** Network logos drawn in type and shape, so there's no need for trademark artwork. */
function NetworkLogo({ network }: { network: Card["network"] }) {
  if (network === "Mastercard") {
    return (
      <span className="flex items-center" aria-label="Mastercard">
        <span className="h-5 w-5 rounded-full bg-red-500/90" />
        <span className="-ml-2 h-5 w-5 rounded-full bg-amber-400/90 mix-blend-screen" />
      </span>
    );
  }
  return <span className="font-display text-lg font-bold italic tracking-tight" aria-label="Visa">VISA</span>;
}
