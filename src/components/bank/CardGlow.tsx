import { CARD_GLOW, useGlowTone } from "@/lib/bank/cardGlow";

/** A full-screen glow in the colours of the card in front. It fades when you swipe to another card. */
export function CardGlow() {
  const tone = useGlowTone();
  if (!tone) return null;
  const [a, b] = CARD_GLOW[tone];
  return (
    <div
      aria-hidden
      className="card-glow fade-in pointer-events-none fixed inset-0 z-0"
      style={{ "--cg-a": a, "--cg-b": b } as React.CSSProperties}
    />
  );
}
