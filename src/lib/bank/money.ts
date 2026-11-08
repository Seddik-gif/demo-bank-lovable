// Savings goals, scheduled payments and card controls. Same rules as the rest of the demo: nothing real moves.
import {
  CARD_TONES,
  CASH_ACCOUNT_ID,
  CRYPTO_HOLDINGS,
  INVEST_HOLDINGS,
  MAX_BUDGET_LIMIT,
  type Account,
  type Card,
  type CardTone,
  formatMoney,
  round2,
  uid,
  type BankState,
  type Frequency,
  type PlanId,
  type Result,
  type Transaction,
} from "./data";
import { STOCKS } from "./stocks";
import { CURRENCIES, FOREIGN_CURRENCIES, fromEur, type Currency } from "./fx";

const MAX_NAME = 40;
export const MAX_GOAL_TARGET = 1_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

// ---- Savings goals ---------------------------------------------------------------

export function validateGoal(state: BankState, name: string, target: number): Result {
  const clean = cleanName(name);
  if (clean.length < 2 || clean.length > MAX_NAME) return { ok: false, error: `Name the goal (2 to ${MAX_NAME} characters).` };
  if (state.goals.some((g) => g.name.toLowerCase() === clean.toLowerCase())) return { ok: false, error: `A goal called "${clean}" already exists.` };
  if (!Number.isFinite(target) || target <= 0) return { ok: false, error: "The target must be greater than zero." };
  if (target > MAX_GOAL_TARGET) return { ok: false, error: `The target can be at most ${formatMoney(MAX_GOAL_TARGET)}.` };
  return { ok: true };
}

export function applyAddGoal(state: BankState, name: string, target: number): BankState {
  return { ...state, goals: [...state.goals, { id: uid(), name: cleanName(name), target: round2(target), saved: 0 }] };
}

export function validateContribution(state: BankState, goalId: string, accountId: string, amount: number): Result {
  const goal = state.goals.find((g) => g.id === goalId);
  const account = state.accounts.find((a) => a.id === accountId);
  if (!goal || !account) return { ok: false, error: "Choose an account and a goal." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (round2(amount) > account.balance) return { ok: false, error: `Not enough money: ${account.name} has ${formatMoney(account.balance)}.` };
  const remaining = round2(goal.target - goal.saved);
  if (remaining <= 0) return { ok: false, error: `${goal.name} is already complete.` };
  if (round2(amount) > remaining) return { ok: false, error: `Only ${formatMoney(remaining)} is left to reach ${goal.name}.` };
  return { ok: true };
}

export function applyContribution(state: BankState, goalId: string, accountId: string, amount: number, now = new Date()): BankState {
  const value = round2(amount);
  const goal = state.goals.find((g) => g.id === goalId)!;
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description: `Saved for ${goal.name}`,
    category: "Savings",
    amount: -value,
    accountId,
  };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance - value) } : a)),
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, saved: round2(g.saved + value) } : g)),
    transactions: [txn, ...state.transactions],
  };
}

export function validateWithdrawal(state: BankState, goalId: string, amount: number): Result {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return { ok: false, error: "This goal no longer exists." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (round2(amount) > goal.saved) return { ok: false, error: `${goal.name} only has ${formatMoney(goal.saved)} saved.` };
  return { ok: true };
}

/** Moves money from a goal back into an account. */
export function applyWithdrawal(state: BankState, goalId: string, accountId: string, amount: number, now = new Date()): BankState {
  const value = round2(amount);
  const goal = state.goals.find((g) => g.id === goalId)!;
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description: `From ${goal.name}`,
    category: "Savings",
    amount: value,
    accountId,
  };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance + value) } : a)),
    goals: state.goals.map((g) => (g.id === goalId ? { ...g, saved: round2(g.saved - value) } : g)),
    transactions: [txn, ...state.transactions],
  };
}

/** Deletes a goal. Any money still saved goes back to the main account first. */
export function applyDeleteGoal(state: BankState, goalId: string, now = new Date()): BankState {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return state;
  const refunded = goal.saved > 0 ? applyWithdrawal(state, goalId, CASH_ACCOUNT_ID, goal.saved, now) : state;
  return { ...refunded, goals: refunded.goals.filter((g) => g.id !== goalId) };
}

// ---- Scheduled payments ----------------------------------------------------------

export function validateSchedule(state: BankState, name: string, amount: number, accountId: string): Result {
  const clean = cleanName(name);
  if (clean.length < 2 || clean.length > MAX_NAME) return { ok: false, error: `Name the payment (2 to ${MAX_NAME} characters).` };
  if (!state.accounts.some((a) => a.id === accountId)) return { ok: false, error: "Choose an account." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (amount > MAX_BUDGET_LIMIT) return { ok: false, error: `The amount can be at most ${formatMoney(MAX_BUDGET_LIMIT)}.` };
  return { ok: true };
}

export function applyAddSchedule(state: BankState, name: string, amount: number, accountId: string, frequency: Frequency, nextDate: string): BankState {
  return {
    ...state,
    schedules: [...state.schedules, { id: uid(), name: cleanName(name), amount: round2(amount), accountId, frequency, nextDate }],
  };
}

/** Moves a scheduled payment's date on by one period. */
export function advanceDate(iso: string, frequency: Frequency): string {
  const d = new Date(iso);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

/** A payment is due soon when its date is within the next few days (or already passed). */
export function isDueSoon(nextDate: string, now = new Date(), days = 3): boolean {
  return Date.parse(nextDate) - now.getTime() <= days * DAY_MS;
}

export function validateSchedulePayment(state: BankState, scheduleId: string): Result {
  const s = state.schedules.find((x) => x.id === scheduleId);
  if (!s) return { ok: false, error: "This payment no longer exists." };
  const account = state.accounts.find((a) => a.id === s.accountId);
  if (!account) return { ok: false, error: "The account for this payment no longer exists." };
  if (s.amount > account.balance) return { ok: false, error: `Not enough money: ${account.name} has ${formatMoney(account.balance)}.` };
  return { ok: true };
}

/** Pays a scheduled bill now and moves its next date on. */
export function applySchedulePayment(state: BankState, scheduleId: string, now = new Date()): BankState {
  const s = state.schedules.find((x) => x.id === scheduleId)!;
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description: s.name,
    category: "Bills",
    amount: -s.amount,
    accountId: s.accountId,
  };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === s.accountId ? { ...a, balance: round2(a.balance - s.amount) } : a)),
    transactions: [txn, ...state.transactions],
    schedules: state.schedules.map((x) => (x.id === scheduleId ? { ...x, nextDate: advanceDate(x.nextDate, x.frequency) } : x)),
  };
}

export function applyRemoveSchedule(state: BankState, scheduleId: string): BankState {
  return { ...state, schedules: state.schedules.filter((s) => s.id !== scheduleId) };
}

// ---- Card controls ---------------------------------------------------------------

export function applyCardOnline(state: BankState, cardId: string, on: boolean): BankState {
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? { ...c, onlinePayments: on } : c)) };
}

export function validateSpendLimit(limit: number): Result {
  if (!Number.isFinite(limit) || limit < 0) return { ok: false, error: "The limit cannot be negative." };
  if (limit > MAX_BUDGET_LIMIT) return { ok: false, error: `The limit can be at most ${formatMoney(MAX_BUDGET_LIMIT)}.` };
  return { ok: true };
}

export function applyCardLimit(state: BankState, cardId: string, limit: number): BankState {
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? { ...c, spendLimit: round2(limit) } : c)) };
}

/** Freezes a card that was lost or stolen. Unfreezing is still possible from the card. */
export function applyReportLost(state: BankState, cardId: string): BankState {
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? { ...c, frozen: true } : c)) };
}

// ---- Transaction details -----------------------------------------------------------

export function applyTransactionCategory(state: BankState, txnId: string, category: string): BankState {
  return { ...state, transactions: state.transactions.map((t) => (t.id === txnId ? { ...t, category: category.trim() } : t)) };
}

/** Blocks the next scheduled payment with this name. Used once, then cleared. */
export function applyBlockNext(state: BankState, name: string): BankState {
  if (state.blockedNext.includes(name)) return state;
  return { ...state, blockedNext: [...state.blockedNext, name] };
}

/** The payee a transaction was paid to: "Payment to Alex Morgan" -> "Alex Morgan", scheduled bills keep their name. */
export function payeeOf(description: string): string {
  return description.replace(/^Payment to /, "").trim();
}

export function applyUnblockNext(state: BankState, name: string): BankState {
  return { ...state, blockedNext: state.blockedNext.filter((n) => n !== name) };
}

/** Clears a block once it has stopped a payment. */
export const applyConsumeBlock = applyUnblockNext;

/** Spending on a category, or on one payee (same description), counted from the transactions list. */
export function spentOn(transactions: Transaction[], match: { category?: string; description?: string }, sinceMonth: Date | null): number {
  const total = transactions
    .filter((t) => t.amount < 0)
    .filter((t) => (match.category === undefined ? true : t.category.toLowerCase() === match.category.toLowerCase()))
    .filter((t) => (match.description === undefined ? true : t.description === match.description))
    .filter((t) => (sinceMonth === null ? true : sameMonth(t.date, sinceMonth)))
    .reduce((s, t) => s - t.amount, 0);
  return round2(total);
}

export function sameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// ---- Cards: adding a new one -------------------------------------------------------

export const MAX_CARDS = 6;
export const CARD_TYPES = ["Debit", "Credit", "Prepaid", "Online only"] as const;

export interface NewCardConfig {
  label: string;
  network: Card["network"];
  type: (typeof CARD_TYPES)[number];
  tone: CardTone;
  onlinePayments: boolean;
  spendLimit: number;
  delivery: "digital" | "physical";
}

export function validateNewCard(state: BankState, cfg: NewCardConfig): Result {
  const label = cleanName(cfg.label);
  if (label.length < 2 || label.length > 30) return { ok: false, error: "Name the card (2 to 30 characters)." };
  if (state.cards.length >= MAX_CARDS) return { ok: false, error: `You can have up to ${MAX_CARDS} cards. Remove one to add another.` };
  if (cfg.network !== "Visa" && cfg.network !== "Mastercard") return { ok: false, error: "Choose Visa or Mastercard." };
  if (!(CARD_TYPES as readonly string[]).includes(cfg.type)) return { ok: false, error: "Choose a card type." };
  if (!(CARD_TONES as readonly string[]).includes(cfg.tone)) return { ok: false, error: "Choose a finish for the card." };
  if (cfg.delivery !== "digital" && cfg.delivery !== "physical") return { ok: false, error: "Choose digital or physical delivery." };
  return validateSpendLimit(cfg.spendLimit);
}

/** The card details are generated here. The app never asks for real card details. */
export function applyAddCard(state: BankState, cfg: NewCardConfig, last4: string): BankState {
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const prefix = cfg.network === "Visa" ? "4" : "5";
  const groups = `${prefix}${digits(2)}`.padEnd(4, "0") + " " + digits(4) + " " + digits(4) + " " + last4;
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
  const year = String(new Date().getFullYear() + 3 + Math.floor(Math.random() * 3)).slice(2);
  const card: Card = {
    id: uid(),
    network: cfg.network,
    label: cleanName(cfg.label),
    type: cfg.type,
    last4,
    frozen: false,
    tone: cfg.tone,
    onlinePayments: cfg.onlinePayments,
    spendLimit: round2(cfg.spendLimit),
    number: groups,
    expiry: `${month}/${year}`,
    cvv: digits(3),
    delivery: cfg.delivery,
    delivered: cfg.delivery === "digital",
  };
  return { ...state, cards: [...state.cards, card] };
}

/** Deletes a card. Its past transactions stay in the history. */
export function applyRemoveCard(state: BankState, cardId: string): BankState {
  return { ...state, cards: state.cards.filter((c) => c.id !== cardId) };
}

/** Demo only: the physical card arrives. From then on it works like any other card. */
export function applyCardDelivered(state: BankState, cardId: string): BankState {
  return { ...state, cards: state.cards.map((c) => (c.id === cardId ? { ...c, delivered: true } : c)) };
}

// ---- Opening other accounts --------------------------------------------------------

export const SAVINGS_RATE = 0.0225; // demo yearly rate, shown before the user opens the account
export type NewAccountConfig =
  | { kind: "savings" }
  | { kind: "currency"; currency: string }
  | { kind: "joint"; coHolder: string }
  | { kind: "crypto" }
  | { kind: "invest" }
  | { kind: "pockets" };

const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

// Accounts each plan includes (the Plans screen shows the same numbers).
const ACCOUNT_LIMIT: Record<PlanId, number> = { everyday: 2, plus: 5, pro: Infinity, private: Infinity };
const PLAN_LABEL: Record<PlanId, string> = { everyday: "Everyday", plus: "Plus", pro: "Pro", private: "Private" };

export function validateNewAccount(state: BankState, cfg: NewAccountConfig): Result {
  const limit = ACCOUNT_LIMIT[state.plan];
  if (state.accounts.length >= limit) return { ok: false, error: `Your ${PLAN_LABEL[state.plan]} plan includes ${limit} accounts. Choose a bigger plan to open another.` };
  if (cfg.kind === "savings") {
    if (state.accounts.some((a) => a.kind === "savings")) return { ok: false, error: "You already have a savings account." };
    return { ok: true };
  }
  if (cfg.kind === "currency") {
    if (!(FOREIGN_CURRENCIES as readonly string[]).includes(cfg.currency)) return { ok: false, error: "Choose USD, GBP or CHF." };
    if (state.accounts.some((a) => a.kind === "currency" && a.currency === cfg.currency))
      return { ok: false, error: `You already have a ${cfg.currency} account.` };
    return { ok: true };
  }
  if (cfg.kind === "joint") {
    const name = cleanName(cfg.coHolder);
    if (name.length < 2 || name.length > MAX_NAME) return { ok: false, error: `Name the second account holder (2 to ${MAX_NAME} characters).` };
    if (state.accounts.some((a) => a.kind === "joint")) return { ok: false, error: "You can have one joint account." };
    return { ok: true };
  }
  if (cfg.kind === "crypto" && state.accounts.some((a) => a.kind === "crypto")) return { ok: false, error: "You already have a crypto account." };
  if (cfg.kind === "invest" && state.accounts.some((a) => a.kind === "invest")) return { ok: false, error: "You already have an investment account." };
  if (cfg.kind === "pockets" && state.accounts.some((a) => a.kind === "pockets")) return { ok: false, error: "You already have a pockets account." };
  return { ok: true };
}

// ---- Round-up account -------------------------------------------------------------

/** The spare change that rounds a payment up to the next whole dollar. */
export function spareChange(amount: number): number {
  const cents = Math.round(amount * 100);
  const rest = cents % 100;
  return rest === 0 ? 0 : round2((100 - rest) / 100);
}

/**
 * Moves the spare change from each payment into the Round-up account (when it exists and is switched on).
 * `parts` are the amounts taken from each account. Returns the new state and the round-ups made.
 */
export function applyRoundUps(state: BankState, parts: { accountId: string; amount: number }[], now = new Date()): { state: BankState; ups: { pocket: string; amount: number }[] } {
  const roundUpAccount = state.accounts.find((a) => a.kind === "pockets" && a.roundUp !== false);
  if (!roundUpAccount) return { state, ups: [] };
  let next = state;
  const ups: { pocket: string; amount: number }[] = [];
  for (const part of parts) {
    if (part.accountId === roundUpAccount.id) continue;
    const spare = spareChange(part.amount);
    if (spare <= 0) continue;
    const source = next.accounts.find((a) => a.id === part.accountId);
    if (!source || source.balance < spare) continue;
    const iso = now.toISOString();
    const out: Transaction = { id: uid(), date: iso, description: "Round-up saved", category: "Savings", amount: -spare, accountId: part.accountId };
    const into: Transaction = { id: uid(), date: iso, description: `Round-up from ${source.name}`, category: "Savings", amount: spare, accountId: roundUpAccount.id };
    next = {
      ...next,
      accounts: next.accounts.map((a) =>
        a.id === part.accountId ? { ...a, balance: round2(a.balance - spare) } : a.id === roundUpAccount.id ? { ...a, balance: round2(a.balance + spare) } : a,
      ),
      transactions: [out, into, ...next.transactions],
    };
    ups.push({ pocket: roundUpAccount.name, amount: spare });
  }
  return { state: next, ups };
}

export function applyRoundUpToggle(state: BankState, on: boolean): BankState {
  return { ...state, accounts: state.accounts.map((a) => (a.kind === "pockets" ? { ...a, roundUp: on } : a)) };
}

// ---- Investments -------------------------------------------------------------------

/**
 * The name and fixed demo price of an investment: a fund, bond or stock. Stocks also have a live
 * price, which the Invest page passes in as `price`. Without one, the demo price is used.
 */
function instrumentOf(symbol: string): { name: string; price: number } | null {
  const holding = INVEST_HOLDINGS.find((h) => h.symbol === symbol);
  if (holding) return { name: holding.name, price: holding.price };
  const stock = STOCKS.find((s) => s.symbol === symbol);
  if (stock) return { name: stock.name, price: stock.basePrice };
  return null;
}

export function validateInvestBuy(state: BankState, accountId: string, symbol: string, usd: number, price?: number): Result {
  const account = state.accounts.find((a) => a.id === accountId && a.kind === "invest");
  const instrument = instrumentOf(symbol);
  if (!account) return { ok: false, error: "Choose your investment account." };
  if (!instrument) return { ok: false, error: "Choose an investment." };
  if (price !== undefined && (!Number.isFinite(price) || price <= 0)) return { ok: false, error: "The price is not available right now." };
  if (!Number.isFinite(usd) || usd < 1) return { ok: false, error: "Invest at least $1." };
  if (round2(usd) > account.balance) return { ok: false, error: `Not enough cash in ${account.name}: it has ${formatMoney(account.balance)}. Move money in first.` };
  return { ok: true };
}

export function applyInvestBuy(state: BankState, accountId: string, symbol: string, usd: number, price?: number, now = new Date()): BankState {
  const instrument = instrumentOf(symbol)!;
  const unitPrice = price ?? instrument.price;
  const value = round2(usd);
  const units = Math.round((value / unitPrice) * 1e6) / 1e6;
  const txn: Transaction = { id: uid(), date: now.toISOString(), description: `Bought ${symbol} (${instrument.name})`, category: "Investing", amount: -value, accountId };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance - value) } : a)),
    investments: { ...state.investments, [symbol]: round2((state.investments[symbol] ?? 0) + units) },
    transactions: [txn, ...state.transactions],
  };
}

export function validateInvestSell(state: BankState, accountId: string, symbol: string, units: number, price?: number): Result {
  if (price !== undefined && (!Number.isFinite(price) || price <= 0)) return { ok: false, error: "The price is not available right now." };
  if (!state.accounts.some((a) => a.id === accountId && a.kind === "invest")) return { ok: false, error: "Choose your investment account." };
  const held = state.investments[symbol] ?? 0;
  if (held <= 0) return { ok: false, error: `You don't hold any ${symbol}.` };
  if (!Number.isFinite(units) || units <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (units > held + 1e-9) return { ok: false, error: `You can't sell more than you hold: you have ${held} ${symbol}.` };
  return { ok: true };
}

export function applyInvestSell(state: BankState, accountId: string, symbol: string, units: number, price?: number, now = new Date()): BankState {
  const instrument = instrumentOf(symbol)!;
  const value = round2(units * (price ?? instrument.price));
  const left = Math.max(0, Math.round(((state.investments[symbol] ?? 0) - units) * 1e6) / 1e6);
  const txn: Transaction = { id: uid(), date: now.toISOString(), description: `Sold ${symbol} (${instrument.name})`, category: "Investing", amount: value, accountId };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance + value) } : a)),
    investments: { ...state.investments, [symbol]: left },
    transactions: [txn, ...state.transactions],
  };
}

/** Value of the holdings in EUR, at the demo prices. */
export function investmentsValue(investments: Record<string, number>): number {
  // Funds and bonds use their demo prices; stocks use their starting prices here. The Invest page shows live values.
  const prices = [...INVEST_HOLDINGS.map((h) => ({ symbol: h.symbol, price: h.price })), ...STOCKS.map((s) => ({ symbol: s.symbol, price: s.basePrice }))];
  return round2(prices.reduce((s, p) => s + (investments[p.symbol] ?? 0) * p.price, 0));
}

/** Value of the crypto holdings in EUR, at the demo prices. */
export function cryptoValue(crypto: Record<string, number>): number {
  return round2(CRYPTO_HOLDINGS.reduce((s, h) => s + (crypto[h.symbol] ?? 0) * h.price, 0));
}

export function applyNewAccount(state: BankState, cfg: NewAccountConfig): BankState {
  const iban = `DB${digits(2)} DEMO ${digits(4)} ${digits(4)} ${digits(4)}`;
  const id = uid();
  const account: Account =
    cfg.kind === "savings"
      ? { id, name: "Savings", iban, balance: 0, kind: "savings", rate: SAVINGS_RATE }
      : cfg.kind === "currency"
        ? { id, name: `${cfg.currency} account`, iban, balance: 0, kind: "currency", currency: cfg.currency }
        : cfg.kind === "joint"
          ? { id, name: `Joint with ${cleanName(cfg.coHolder)}`, iban, balance: 0, kind: "joint", coHolder: cleanName(cfg.coHolder) }
          : cfg.kind === "crypto"
            ? { id, name: "Crypto wallet", iban: "No IBAN", balance: 0, kind: "crypto" }
            : cfg.kind === "invest"
              ? { id, name: "Investments", iban, balance: 0, kind: "invest" }
              : { id, name: "Round-up", iban: "No IBAN", balance: 0, kind: "pockets", roundUp: true };
  return { ...state, accounts: [...state.accounts, account] };
}

/** What a balance held in EUR is worth in a currency account's currency. */
export function inCurrency(eur: number, currency: string): number {
  return (CURRENCIES as readonly string[]).includes(currency) ? round2(fromEur(eur, currency as Currency)) : round2(eur);
}

// ---- Charts ----------------------------------------------------------------------

/** Money out per day for the last `days` days, oldest first. */
export function dailySpending(transactions: Transaction[], days = 14, now = new Date()): { label: string; amount: number }[] {
  const out: { label: string; amount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const amount = transactions
      .filter((t) => t.amount < 0 && Date.parse(t.date) >= d.getTime() && Date.parse(t.date) < next.getTime())
      .reduce((s, t) => s - t.amount, 0);
    out.push({ label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), amount: round2(amount) });
  }
  return out;
}
