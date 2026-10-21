import { describe, expect, it } from "vitest";
import { createEmptyState } from "../data";
import { feeOn, netOf, RULES, validateFunding } from "../funding";

describe("fees", () => {
  it("charges the card fee on a credit card top-up", () => {
    expect(feeOn("card", 100)).toBe(1.5);
    expect(netOf("card", 100)).toBe(98.5);
  });

  it("charges nothing for Apple Pay, Google Pay and bank transfers", () => {
    expect(feeOn("apple", 100)).toBe(0);
    expect(feeOn("google", 100)).toBe(0);
    expect(feeOn("bank", 100)).toBe(0);
  });

  it("charges nothing for an instant bank transfer", () => {
    expect(feeOn("bank", 100, "instant")).toBe(0);
  });
});

describe("top-up limits", () => {
  const state = createEmptyState();
  const mainId = "main";

  it("refuses an amount below the method's minimum", () => {
    const r = validateFunding(state, { method: "apple", accountId: mainId, amount: RULES.apple.min - 1 });
    expect(r.ok).toBe(false);
  });

  it("refuses more than the method's daily limit", () => {
    const r = validateFunding(state, { method: "card", accountId: mainId, amount: RULES.card.dailyLimit + 1 });
    expect(r.ok).toBe(false);
  });
});
