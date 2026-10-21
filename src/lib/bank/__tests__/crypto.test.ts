import { describe, expect, it } from "vitest";
import { createEmptyState } from "../data";
import { applyDeposit, heldOf, isValidSenderAddress, validateDeposit, validateSale } from "../crypto";

describe("sender addresses", () => {
  it("accepts a Bitcoin address", () => {
    expect(isValidSenderAddress("BTC", "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
  });

  it("accepts an Ethereum address", () => {
    expect(isValidSenderAddress("ETH", "0x" + "a1".repeat(20))).toBe(true);
  });

  it("refuses text that is not an address", () => {
    expect(isValidSenderAddress("BTC", "not-an-address")).toBe(false);
    expect(isValidSenderAddress("ETH", "0x123")).toBe(false);
  });
});

describe("deposits", () => {
  it("refuses a deposit from an address that is already waiting for confirmations", () => {
    const from = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    const s = applyDeposit(createEmptyState(), "BTC", 0.01, from);
    expect(validateDeposit(s, "BTC", 0.01, from).ok).toBe(false);
  });

  it("refuses a zero or negative quantity", () => {
    const from = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    expect(validateDeposit(createEmptyState(), "BTC", 0, from).ok).toBe(false);
  });
});

describe("selling crypto", () => {
  const crypto = { BTC: 0.01 };

  it("reads what is held", () => {
    expect(heldOf(crypto, "BTC")).toBe(0.01);
    expect(heldOf(crypto, "ETH")).toBe(0);
  });

  it("allows a sale of what is held", () => {
    expect(validateSale(crypto, "BTC", 0.005).ok).toBe(true);
  });

  it("refuses a sale of more than is held", () => {
    expect(validateSale(crypto, "BTC", 0.02).ok).toBe(false);
  });

  it("refuses a sale of a coin that is not held", () => {
    expect(validateSale(crypto, "ETH", 0.1).ok).toBe(false);
  });
});
