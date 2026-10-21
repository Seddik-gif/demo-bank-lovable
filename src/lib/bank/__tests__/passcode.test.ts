import { describe, expect, it } from "vitest";
import { passcodeProblem } from "../passcode";

describe("passcode rules", () => {
  it("accepts a six-digit passcode that is not a pattern", () => {
    expect(passcodeProblem("482615")).toBeNull();
  });

  it("asks for all six digits", () => {
    expect(passcodeProblem("4826")).toBe("Enter all 6 digits.");
    expect(passcodeProblem("48261a")).toBe("Enter all 6 digits.");
  });

  it("refuses one digit repeated six times", () => {
    expect(passcodeProblem("111111")).toBe("Too simple: avoid one repeated digit.");
  });

  it("refuses counting sequences, going up or down", () => {
    expect(passcodeProblem("123456")).toBe("Too simple: avoid sequences like 123456.");
    expect(passcodeProblem("654321")).toBe("Too simple: avoid sequences like 123456.");
  });

  it("accepts a sequence that breaks part way", () => {
    expect(passcodeProblem("123457")).toBeNull();
  });
});
