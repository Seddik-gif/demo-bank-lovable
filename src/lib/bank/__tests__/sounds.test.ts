import { describe, expect, it } from "vitest";
import { NOTE, SOUND_FAMILY, soundForEvent, soundForNotice } from "../sounds";

const { SOUNDS, VOICE } = SOUND_FAMILY;
const pitches = (name: keyof typeof SOUNDS) => SOUNDS[name].map(([f]) => f);

describe("the sound family", () => {
  it("uses only the notes of one scale (C major pentatonic)", () => {
    const expected = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    expect(Object.values(NOTE).sort((a, b) => a - b)).toEqual(expected);
  });

  it("uses one voice, one level and one note spacing", () => {
    expect(VOICE.wave).toBe("triangle");
    expect(VOICE.gap).toBe(0.09);
    for (const name of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) {
      for (const [, , , level] of SOUNDS[name]) expect(level).toBeLessThanOrEqual(VOICE.level);
    }
  });

  it("makes good news rise", () => {
    const p = pitches("success");
    expect(p).toEqual([...p].sort((a, b) => a - b));
    expect(pitches("receive")).toEqual([...pitches("receive")].sort((a, b) => a - b));
  });

  it("makes a problem fall", () => {
    const p = pitches("fail");
    expect(p).toEqual([...p].sort((a, b) => b - a));
  });

  it("ends money received on the top note", () => {
    const p = pitches("receive");
    expect(p[p.length - 1]).toBe(NOTE.C6);
  });

  it("makes a blocked payment repeat one note, a stop rather than a melody", () => {
    const p = pitches("blocked");
    expect(p[0]).toBe(p[1]);
  });

  it("keeps every sound short", () => {
    for (const name of Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]) {
      const end = Math.max(...SOUNDS[name].map(([, start, length]) => start + length));
      expect(end).toBeLessThan(1);
    }
  });
});

describe("which sound each event makes", () => {
  it("plays the success sound when a transfer or trade goes through", () => {
    expect(soundForEvent("transfer", "Moved $10")).toBe("success");
    expect(soundForEvent("trade", "Bought GEI")).toBe("success");
  });

  it("plays the fail sound when a transfer or trade is refused", () => {
    expect(soundForEvent("transfer_rejected", "Refused")).toBe("fail");
    expect(soundForEvent("trade_rejected", "Refused")).toBe("fail");
  });

  it("stays quiet for money in and for a blocked payment, which have their own sounds", () => {
    expect(soundForEvent("payment", "Received $25 from Alex")).toBeNull();
    expect(soundForEvent("payment_rejected", "Blocked: payment to Alex stopped")).toBeNull();
  });

  it("maps notifications: money in is the receive sound, a block is the blocked sound, pending is silent", () => {
    expect(soundForNotice("in")).toBe("receive");
    expect(soundForNotice("blocked")).toBe("blocked");
    expect(soundForNotice("pending")).toBeNull();
    expect(soundForNotice("out")).toBeNull();
  });
});
