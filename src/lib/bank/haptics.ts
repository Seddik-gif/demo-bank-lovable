// Light vibration on phones that support it. Other devices simply do nothing.
// Each pattern is a list of alternating vibrate and pause times, in milliseconds.
import { hapticsEnabled } from "./settings";

const PATTERNS = {
  // A payment or transfer went through: one short, light tap.
  success: [12, 40, 18],
  // Something was refused or blocked: two firmer pulses.
  error: [30, 60, 30],
  // A card was frozen: one firm pulse, to confirm the card is now blocked.
  frozen: [25],
} as const;

export type HapticName = keyof typeof PATTERNS;

export function buzz(name: HapticName): void {
  if (!hapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([...PATTERNS[name]]);
    }
  } catch {
    // Some browsers refuse vibration outside a tap. That is fine: the sound and the screen still show the result.
  }
}

/** The pattern each sound also plays, so a sound and its feeling always match. */
export const HAPTIC_PATTERNS = PATTERNS;
