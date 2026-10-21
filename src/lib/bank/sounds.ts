// Short sound effects made with the browser's own audio (no files to download).
// Browsers only play sound after a click or key press, so the first sound may wait for the first tap.
import { soundsEnabled } from "./settings";

// [frequency Hz, start (s), length (s), wave shape, volume]
type Tone = [number, number, number, OscillatorType?, number?];

const SOUNDS = {
  // Pip, the guide: a quick rising chirp.
  pip: [
    [660, 0, 0.08, "sine", 0.12],
    [990, 0.07, 0.14, "sine", 0.12],
  ],
  // A payment or transfer that went through: a bright major chord.
  success: [
    [523.25, 0, 0.14, "triangle", 0.12],
    [659.25, 0.1, 0.14, "triangle", 0.12],
    [783.99, 0.2, 0.26, "triangle", 0.12],
  ],
  // A payment or transfer that failed: two low, short buzzes.
  fail: [
    [196, 0, 0.16, "sawtooth", 0.07],
    [165, 0.2, 0.26, "sawtooth", 0.07],
  ],
  // Money received: a happy rising arpeggio.
  receive: [
    [659.25, 0, 0.1, "sine", 0.13],
    [830.61, 0.1, 0.1, "sine", 0.13],
    [987.77, 0.2, 0.1, "sine", 0.13],
    [1318.5, 0.3, 0.24, "sine", 0.13],
  ],
  // A payment that was blocked: three flat, square beeps.
  blocked: [
    [330, 0, 0.12, "square", 0.05],
    [330, 0.17, 0.12, "square", 0.05],
    [262, 0.34, 0.24, "square", 0.05],
  ],
} satisfies Record<string, Tone[]>;

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

export function playSound(name: SoundName): void {
  if (!soundsEnabled()) return;
  const c = audioContext();
  if (!c) return;
  const t0 = c.currentTime;
  for (const [freq, start, length, wave = "sine", volume = 0.12] of SOUNDS[name] as Tone[]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = wave;
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
