import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buzz, HAPTIC_PATTERNS } from "../haptics";

/** Replace the browser's navigator with one that records vibrations, so the tests can see them. */
let sent: number[][] = [];
function fakeNavigator(withVibrate: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: withVibrate ? { vibrate: (p: number[]) => sent.push(p) } : {},
  });
}

beforeEach(() => {
  sent = [];
});

afterEach(() => {
  delete (globalThis as unknown as { navigator?: unknown }).navigator;
});

describe("haptic feedback", () => {
  it("sends the success pattern for a payment that went through", () => {
    fakeNavigator(true);
    buzz("success");
    expect(sent).toEqual([[...HAPTIC_PATTERNS.success]]);
  });

  it("sends a firmer error pattern for a refused or blocked payment", () => {
    fakeNavigator(true);
    buzz("error");
    expect(sent).toEqual([[...HAPTIC_PATTERNS.error]]);
    // Total time the phone actually vibrates (every other entry), so the error is firmer than the success.
    const vibrating = (p: readonly number[]) => p.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0);
    expect(vibrating(HAPTIC_PATTERNS.error)).toBeGreaterThan(vibrating(HAPTIC_PATTERNS.success));
  });

  it("sends one firm pulse when a card is frozen", () => {
    fakeNavigator(true);
    buzz("frozen");
    expect(sent).toEqual([[25]]);
  });

  it("keeps every pulse short, so it feels light", () => {
    for (const pattern of Object.values(HAPTIC_PATTERNS)) {
      expect(Math.max(...pattern)).toBeLessThanOrEqual(60);
    }
  });

  it("does nothing on a device without vibration", () => {
    fakeNavigator(false);
    expect(() => buzz("success")).not.toThrow();
    expect(sent).toEqual([]);
  });
});
