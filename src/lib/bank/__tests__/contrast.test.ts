import { describe, expect, it } from "vitest";

/**
 * Text contrast checks, following WCAG: body text needs at least 4.5 to 1 against the colour behind it.
 * The colours are the ones used in the app. Where a colour is see-through (the cards), it is blended
 * over the colour behind it first, so the check uses what the eye actually sees.
 */

type RGB = [number, number, number];

const hex = (h: string): RGB => {
  const n = h.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
};

/** Blend a colour with alpha over a solid background. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB => [0, 1, 2].map((i) => fg[i]! * alpha + bg[i]! * (1 - alpha)) as RGB;

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const luminance = ([r, g, b]: RGB) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** The contrast ratio between two colours, from 1 (none) to 21 (black on white). */
export function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: RGB = [255, 255, 255];
const NAVY = hex("#1e1b4b");

/** The colour behind every section (the wash). Each section's text sits on one of these. */
const SECTION_WASH = {
  home: ["#5b21b6", "#1e1b4b"],
  cards: ["#7e22ce", "#3b0764"],
  budgets: ["#047857", "#052e2b"],
  activity: ["#b45309", "#3b0d0d"],
  crypto: ["#a16207", "#1c1917"],
  invest: ["#1d4ed8", "#0b1537"],
  payments: ["#be185d", "#3b0764"],
  monitor: ["#0f766e", "#042f2e"],
} as const;

/** The body text colour on the glass panels is the app's foreground, a near-white. */
const FOREGROUND: RGB = [246, 244, 252];
const MUTED_ON_GLASS: RGB = [180, 178, 200];

describe("text on the coloured screens", () => {
  for (const [section, [a, b]] of Object.entries(SECTION_WASH)) {
    it(`${section}: body text reads on the screen colour`, () => {
      // The worst case is the lighter end of the wash, which is where most of the text sits.
      const worst = Math.min(contrast(FOREGROUND, hex(a)), contrast(FOREGROUND, hex(b)));
      expect(worst, `${section} foreground ratio`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("text on the cards", () => {
  // The glass card is tinted with the palette at 44% (violet) or 42% (the light cards), over the screen colour.
  const screens = [SECTION_WASH.home[0], SECTION_WASH.cards[0], SECTION_WASH.monitor[0]].map(hex);

  const violetStops: [string, number][] = [["#e0218a", 0.44], ["#9d2bd6", 0.42], ["#4a14d8", 0.44]];
  const lightStops: [string, number][] = [
    ["#9dc3ff", 0.42], ["#bfe6f7", 0.4], ["#b9f6d8", 0.42], ["#d8f7a6", 0.4], ["#fdf6b2", 0.42], ["#ff8fb1", 0.42], ["#ffc4a3", 0.4],
  ];

  for (const screen of screens) {
    it("violet card: white card number and logo read on the tinted glass", () => {
      for (const [stop, alpha] of violetStops) {
        const card = over(hex(stop), alpha, screen);
        // The card number is white at 85%, blended onto the card.
        const number = over(WHITE, 0.85, card);
        expect(contrast(number, card)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it("light cards: the navy logo and number read on the tinted glass", () => {
      for (const [stop, alpha] of lightStops) {
        // The light cards have a frost underneath the tint (see cardBackground in CardFace).
        const card = over(hex(stop), alpha, over(WHITE, 0.62, screen));
        // The number is solid navy, as in the card face.
        const number = NAVY;
        expect(contrast(number, card), `${stop} over ${screen}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("muted text on the glass", () => {
  it("secondary text still reads on the dark panels", () => {
    const panel = over(hex("#2a1b5c"), 0.6, hex("#1e1b4b"));
    expect(contrast(MUTED_ON_GLASS, panel)).toBeGreaterThanOrEqual(4.5);
  });
});
