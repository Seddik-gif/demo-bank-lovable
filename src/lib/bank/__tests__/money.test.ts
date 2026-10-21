import { describe, expect, it } from "vitest";
import { createEmptyState, type BankState } from "../data";
import {
  applyAddCard,
  applyCardDelivered,
  applyNewAccount,
  applyRoundUpToggle,
  applyRoundUps,
  applyInvestBuy,
  applyInvestSell,
  spareChange,
  validateInvestBuy,
  validateInvestSell,
  validateNewAccount,
  validateNewCard,
  MAX_CARDS,
} from "../money";
import { applyTransfer, validateTransfer } from "../data";

/** A new profile (only the main account, at $0) with some money in the main account and an optional round-up account. */
function profile(mainBalance: number, withRoundUp = true): BankState {
  let s = createEmptyState();
  s = { ...s, accounts: s.accounts.map((a) => ({ ...a, balance: mainBalance })) };
  if (withRoundUp) s = applyNewAccount(s, { kind: "pockets" });
  return s;
}

const balance = (s: BankState, name: string) => s.accounts.find((a) => a.name === name)?.balance;
const roundUpAccount = (s: BankState) => s.accounts.find((a) => a.kind === "pockets");

describe("spareChange", () => {
  it("rounds a payment up to the next whole dollar", () => {
    expect(spareChange(12.4)).toBe(0.6);
    expect(spareChange(7.3)).toBe(0.7);
    expect(spareChange(20.4)).toBe(0.6);
    expect(spareChange(0.01)).toBe(0.99);
  });

  it("gives nothing for whole dollars", () => {
    expect(spareChange(10)).toBe(0);
    expect(spareChange(250)).toBe(0);
  });
});

describe("round-ups", () => {
  it("moves the spare change from the payer into the Round-up account", () => {
    const s = profile(100);
    const { state, ups } = applyRoundUps(s, [{ accountId: "main", amount: 12.4 }]);
    expect(balance(state, "Main current account")).toBe(99.4);
    expect(roundUpAccount(state)?.balance).toBe(0.6);
    expect(ups).toEqual([{ pocket: "Round-up", amount: 0.6 }]);
  });

  it("records one debit on the payer and one credit on the Round-up account", () => {
    const { state } = applyRoundUps(profile(100), [{ accountId: "main", amount: 12.4 }]);
    const roundUpId = roundUpAccount(state)?.id;
    const out = state.transactions.find((t) => t.amount === -0.6);
    const into = state.transactions.find((t) => t.amount === 0.6);
    expect(out?.accountId).toBe("main");
    expect(into?.accountId).toBe(roundUpId);
  });

  it("does nothing when round-ups are switched off", () => {
    const s = applyRoundUpToggle(profile(100), false);
    const { state, ups } = applyRoundUps(s, [{ accountId: "main", amount: 12.4 }]);
    expect(balance(state, "Main current account")).toBe(100);
    expect(roundUpAccount(state)?.balance).toBe(0);
    expect(ups).toEqual([]);
  });

  it("does nothing when there is no Round-up account", () => {
    const s = profile(100, false);
    const { ups } = applyRoundUps(s, [{ accountId: "main", amount: 12.4 }]);
    expect(ups).toEqual([]);
  });

  it("skips the spare change when the payer cannot cover it", () => {
    const s = profile(0.3);
    const { state, ups } = applyRoundUps(s, [{ accountId: "main", amount: 12.4 }]);
    expect(balance(state, "Main current account")).toBe(0.3);
    expect(ups).toEqual([]);
  });
});

describe("transfers", () => {
  it("takes money out of one account and puts it into the other, with an entry on each side", () => {
    let s = profile(200);
    s = applyNewAccount(s, { kind: "savings" });
    const savings = s.accounts.find((a) => a.kind === "savings")!;
    const next = applyTransfer(s, "main", savings.id, 25);
    expect(balance(next, "Main current account")).toBe(175);
    expect(next.accounts.find((a) => a.id === savings.id)?.balance).toBe(25);
    expect(next.transactions.find((t) => t.amount === -25)?.accountId).toBe("main");
    expect(next.transactions.find((t) => t.amount === 25)?.accountId).toBe(savings.id);
  });

  it("refuses a move from an account into itself", () => {
    const r = validateTransfer(profile(200).accounts, "main", "main", 10);
    expect(r.ok).toBe(false);
  });

  it("refuses a zero or negative amount", () => {
    expect(validateTransfer(profile(200).accounts, "main", "pockets", 0).ok).toBe(false);
    expect(validateTransfer(profile(200).accounts, "main", "pockets", -5).ok).toBe(false);
  });

  it("refuses more than the account holds", () => {
    const r = validateTransfer(profile(20).accounts, "main", profile(0).accounts[0]!.id, 50);
    expect(r.ok).toBe(false);
  });
});

describe("investing", () => {
  function withInvestAccount(cash: number): { state: BankState; id: string } {
    let s = profile(cash);
    s = applyNewAccount(s, { kind: "invest" });
    const id = s.accounts.find((a) => a.kind === "invest")!.id;
    s = applyTransfer(s, "main", id, cash);
    return { state: s, id };
  }

  it("buys units with the cash in the investment account", () => {
    const { state, id } = withInvestAccount(100);
    expect(validateInvestBuy(state, id, "GEI", 50).ok).toBe(true);
    const bought = applyInvestBuy(state, id, "GEI", 50);
    expect(bought.investments["GEI"]).toBeCloseTo(50 / 98.6, 2);
    expect(bought.accounts.find((a) => a.id === id)?.balance).toBe(50);
  });

  it("refuses a buy larger than the cash in the account", () => {
    const { state, id } = withInvestAccount(40);
    expect(validateInvestBuy(state, id, "GEI", 50).ok).toBe(false);
  });

  it("refuses to sell more units than are held", () => {
    const { state, id } = withInvestAccount(100);
    const bought = applyInvestBuy(state, id, "GEI", 50);
    expect(validateInvestSell(bought, id, "GEI", 1).ok).toBe(false);
    expect(validateInvestSell(bought, id, "GEI", 0.2).ok).toBe(true);
  });

  it("returns the sale proceeds to the investment account's cash", () => {
    const { state, id } = withInvestAccount(100);
    const bought = applyInvestBuy(state, id, "GEI", 50);
    const sold = applyInvestSell(bought, id, "GEI", 0.2);
    expect(sold.accounts.find((a) => a.id === id)?.balance).toBeCloseTo(50 + 0.2 * 98.6, 2);
  });
});

describe("cards", () => {
  const card = { label: "Travel card", network: "Visa" as const, type: "Debit" as const, tone: "violet" as const, onlinePayments: true, spendLimit: 0, delivery: "digital" as const };

  it("accepts a valid card", () => {
    expect(validateNewCard(createEmptyState(), card).ok).toBe(true);
  });

  it("refuses a card name that is too short", () => {
    expect(validateNewCard(createEmptyState(), { ...card, label: "A" }).ok).toBe(false);
  });

  it("refuses a seventh card", () => {
    let s = createEmptyState();
    for (let i = 0; i < MAX_CARDS; i++) s = applyAddCard(s, card, String(1000 + i));
    expect(validateNewCard(s, card).ok).toBe(false);
  });

  it("makes a digital card usable straight away", () => {
    const s = applyAddCard(createEmptyState(), card, "1234");
    expect(s.cards[0]?.delivered).toBe(true);
  });

  it("keeps a physical card unusable until it is delivered", () => {
    let s = applyAddCard(createEmptyState(), { ...card, delivery: "physical" }, "1234");
    expect(s.cards[0]?.delivered).toBe(false);
    s = applyCardDelivered(s, s.cards[0]!.id);
    expect(s.cards[0]?.delivered).toBe(true);
  });
});

describe("new accounts", () => {
  it("starts a new profile with only the main account at zero, no cards and no history", () => {
    const s = createEmptyState();
    expect(s.accounts.map((a) => a.id)).toEqual(["main"]);
    expect(s.accounts[0]?.balance).toBe(0);
    expect(s.cards).toEqual([]);
    expect(s.transactions).toEqual([]);
  });

  it("allows only one savings account", () => {
    const s = applyNewAccount(createEmptyState(), { kind: "savings" });
    expect(validateNewAccount(s, { kind: "savings" }).ok).toBe(false);
  });

  it("allows a second round-up account only if there is none yet", () => {
    const s = profile(0);
    expect(validateNewAccount(s, { kind: "pockets" }).ok).toBe(false);
  });
});
