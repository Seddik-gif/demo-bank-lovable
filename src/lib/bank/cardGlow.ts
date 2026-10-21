// The colour of the card in front, shared with the full-screen glow behind the app.
import { useSyncExternalStore } from "react";
import type { CardTone } from "./data";

// Two colours per finish: the first lights the top of the screen, the second the bottom.
export const CARD_GLOW: Record<CardTone, [string, string]> = {
  violet: ["oklch(0.5 0.22 295)", "oklch(0.7 0.16 330)"],
  cyan: ["oklch(0.6 0.15 205)", "oklch(0.78 0.12 180)"],
  gold: ["oklch(0.72 0.15 85)", "oklch(0.6 0.12 60)"],
  emerald: ["oklch(0.6 0.16 160)", "oklch(0.75 0.13 175)"],
};

let tone: CardTone | null = null;
const listeners = new Set<() => void>();

export function setGlowTone(next: CardTone | null): void {
  if (next === tone) return;
  tone = next;
  listeners.forEach((l) => l());
}

export function useGlowTone(): CardTone | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => tone,
    () => tone,
  );
}
