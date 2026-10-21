import { describe, expect, it } from "vitest";
import { SLICE_LIMIT, spendingSlices } from "../spending";
import type { Budget, Transaction } from "../data";

const txn = (id: number, category: string, amount: number): Transaction => ({
  id: `t${id}`,
  date: new Date().toISOString(),
  description: category,
  category,
  amount,
  accountId: "main",
});

describe("spending pie slices", () => {
  it("lists each category biggest first", () => {
    const s = spendingSlices([txn(1, "Food", -20), txn(2, "Bills", -80), txn(3, "Transport", -50)], []);
    expect(s.map((x) => x.label)).toEqual(["Bills", "Transport", "Food"]);
  });

  it("leaves transfers between your own accounts out of the pie", () => {
    const s = spendingSlices([txn(1, "Food", -20), txn(2, "Transfer", -500)], []);
    expect(s.map((x) => x.label)).toEqual(["Food"]);
  });

  it("ignores money coming in", () => {
    const s = spendingSlices([txn(1, "Income", 900), txn(2, "Food", -20)], []);
    expect(s.map((x) => x.label)).toEqual(["Food"]);
  });

  it("groups the smallest categories as Other once there are more than the limit", () => {
    const many = Array.from({ length: SLICE_LIMIT + 3 }, (_, i) => txn(i, `Cat${i}`, -(100 - i)));
    const s = spendingSlices(many, []);
    expect(s).toHaveLength(SLICE_LIMIT + 1);
    expect(s.at(-1)?.label).toBe("Other");
    const total = s.reduce((sum, x) => sum + x.value, 0);
    const expected = many.reduce((sum, t) => sum + -t.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(Math.round(expected * 100) / 100);
  });

  it("attaches the budget to a category that has one, matching the name in any case", () => {
    const budgets: Budget[] = [{ id: "b1", category: "food", limit: 100 }];
    const s = spendingSlices([txn(1, "Food", -40)], budgets);
    expect(s[0]?.budget?.limit).toBe(100);
  });

  it("returns nothing when there is no spending", () => {
    expect(spendingSlices([txn(1, "Income", 50)], [])).toEqual([]);
  });
});
