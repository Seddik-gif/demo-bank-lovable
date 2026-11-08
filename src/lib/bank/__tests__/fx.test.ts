import { describe, expect, it } from "vitest";
import { FALLBACK_RATES, fromEur, parseRates, toEur, usdToEur } from "../fx";
import { formatMoney, fromTyped, setMoneyFormat } from "../data";

describe("live rates", () => {
  it("reads the published rates", () => {
    const parsed = parseRates({ amount: 1, base: "EUR", date: "2026-10-30", rates: { USD: 1.1172, GBP: 0.8338, CHF: 0.9194 } });
    expect(parsed).not.toBeNull();
    expect(parsed!.source).toBe("live");
    expect(parsed!.date).toBe("2026-10-30");
    expect(parsed!.rates).toEqual({ EUR: 1, USD: 1.1172, GBP: 0.8338, CHF: 0.9194 });
  });

  it("rejects a response with a missing or bad rate", () => {
    expect(parseRates({ rates: { USD: 1.1, GBP: 0.8 } })).toBeNull(); // CHF missing
    expect(parseRates({ rates: { USD: 0, GBP: 0.8, CHF: 0.9 } })).toBeNull(); // zero is not a rate
    expect(parseRates({ rates: { USD: "1.1", GBP: 0.8, CHF: 0.9 } })).toBeNull(); // not a number
    expect(parseRates(null)).toBeNull();
  });

  it("starts on the fallback rates, labelled as fallback", () => {
    expect(FALLBACK_RATES.EUR).toBe(1);
    expect(FALLBACK_RATES.USD).toBeGreaterThan(1);
  });
});

describe("conversion between euros and the chosen currency", () => {
  it("converts euros out and back again", () => {
    for (const c of ["USD", "GBP", "CHF"] as const) {
      expect(toEur(fromEur(250, c), c)).toBeCloseTo(250, 6);
    }
  });

  it("euros stay euros", () => {
    expect(fromEur(100, "EUR")).toBe(100);
    expect(toEur(100, "EUR")).toBe(100);
  });

  it("a dollar is worth less than a euro at the current rate", () => {
    expect(usdToEur()).toBeGreaterThan(0);
    expect(usdToEur()).toBeLessThan(1);
  });
});

describe("typed amounts in the chosen currency", () => {
  it("an amount typed in dollars shows back as the same dollar amount", () => {
    setMoneyFormat("en-US", "USD");
    try {
      for (const typed of [10, 25, 50, 100, 250, 333.33]) {
        expect(formatMoney(fromTyped(typed))).toBe(`$${typed.toFixed(2)}`);
      }
    } finally {
      setMoneyFormat("en-US", "EUR");
    }
  });
});
