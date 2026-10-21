// Short sound effects made with the browser's own audio (no files to download).
// Browsers only play sound after a click or key press, so the first sound may wait for the first tap.
import { soundsEnabled } from "./settings";
import { buzz, type HapticName } from "./haptics";

// One sound family. Every note comes from the same C major pentatonic scale, and every sound uses the same
// soft voice (a triangle wave), the same fade in and out, and the same note spacing. So the sounds belong together.
// The meaning is in the shape: rising for good news, falling for a problem, repeated notes for a stop.

/** The notes the family uses, in Hz. C major pentatonic, from G4 up to C6. */
export const NOTE = {
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
} as const;

/** The shared voice: one wave, one level, one note spacing. */
const VOICE = { wave: "triangle" as OscillatorType, level: 0.12, gap: 0.09 };

// [note Hz, start (s), length (s), level]
type Tone = [number, number, number, number];

/** Notes played one after another in the same voice. */
function run(notes: number[], length: number, level = VOICE.level): Tone[] {
  return notes.map((f, i) => [f, i * VOICE.gap, i === notes.length - 1 ? length * 1.8 : length, level]);
}

const SOUNDS = {
  // Pip, the guide: a quick rising chirp.
  pip: run([NOTE.G5, NOTE.C6], 0.1),
  // A payment or transfer that went through: a rising major-feel triad.
  success: run([NOTE.C5, NOTE.E5, NOTE.G5], 0.13),
  // A payment or transfer that failed: a falling pair, a little quieter.
  fail: run([NOTE.E5, NOTE.C5], 0.16, 0.1),
  // Money received: a rising arpeggio that ends on the top note.
  receive: run([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.12),
  // A payment that was blocked: three flat, repeated notes.
  blocked: run([NOTE.A4, NOTE.A4, NOTE.G4], 0.13, 0.1),
} satisfies Record<string, Tone[]>;

/** Exported for the tests, so the family can be checked as a whole. */
export const SOUND_FAMILY = { SOUNDS, VOICE };

export type SoundName = keyof typeof SOUNDS;

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

/** The vibration that goes with each sound. Pip has none: it is a guide, not a result. */
const HAPTIC_FOR: Partial<Record<SoundName, HapticName>> = {
  success: "success",
  receive: "success",
  fail: "error",
  blocked: "error",
};

export function playSound(name: SoundName): void {
  // A vibration does not depend on the sound switch: each can be turned off on its own.
  const haptic = HAPTIC_FOR[name];
  if (haptic) buzz(haptic);
  if (!soundsEnabled()) return;
  const c = audioContext();
  if (!c) return;
  const t0 = c.currentTime;
  for (const [freq, start, length, volume] of SOUNDS[name]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = VOICE.wave;
    osc.frequency.setValueAtTime(freq, t0 + start);
    // A short fade in and out keeps each tone from clicking.
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + length);
    osc.connect(gain).connect(c.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + length + 0.03);
  }
}

/** Which sound a ledger event makes, if any. Blocked payments are covered by the blocked notice sound. */
export function soundForEvent(type: string, message: string): SoundName | null {
  switch (type) {
    case "transfer":
      return "success";
    case "transfer_rejected":
      return "fail";
    case "trade":
      return "success";
    case "trade_rejected":
      return "fail";
    case "payment":
      // "Received ..." is money in, which has its own sound. "Top-up pending" has none yet.
      return message.startsWith("Received") || message.startsWith("Top-up") ? null : "success";
    case "payment_rejected":
      return message.startsWith("Blocked") ? null : "fail";
    default:
      return null;
  }
}

/** Which sound a notification makes. Payments sent already make the success sound, so they stay quiet. */
export function soundForNotice(tone: "in" | "out" | "blocked" | "pending"): SoundName | null {
  if (tone === "in") return "receive";
  if (tone === "blocked") return "blocked";
  // Pending top-ups have no sound: nothing has arrived yet.
  return null;
}
