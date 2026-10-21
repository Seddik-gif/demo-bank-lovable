// Add funds: how each way of putting money into the account works.
// Modelled on how the real methods behave (see the notes on each rule). Nothing real moves.
import { formatMoney, round2, uid, type BankState, type Result, type Transaction } from "./data";

export type FundingMethod = "apple" | "google" | "crypto" | "card" | "bank";
export type BankSpeed = "instant" | "standard";

export const FUNDING_LABEL: Record<FundingMethod, string> = {
  apple: "Apple Pay",
  google: "Google Pay",
  crypto: "crypto wallet",
  card: "credit card",
  bank: "bank transfer",
};

/** Largest amount for one top-up, in USD. */
export const MAX_FUNDING = 10_000;

/** Crypto sales use the exchange's trade fee and the live order book (see market.ts). */
export const CRYPTO_MIN_USD = 10;

// Demo settings: how long a pending amount takes to become available. Real life: about one business day.
export const SETTLE_MS = { card: 60_000, bankStandard: 120_000 } as const;

export interface MethodRule {
  label: string;
  /** Smallest amount for one top-up. */
  min: number;
  /** Most that can be added in one day with this method. */
  dailyLimit: number;
  /** Fee charged on the amount added (0.015 = 1.5%). */
  feeRate: number;
  /** Shown to the user before they confirm. */
  arrival: string;
  /** Shown on the details screen. */
  note: string;
}

export const RULES: Record<Exclude<FundingMethod, "crypto">, MethodRule> = {
  apple: {
    label: "Apple Pay",
    min: 5,
    dailyLimit: 5_000,
    feeRate: 0,
    arrival: "Available straight away",
    note: "Apple Pay charges the card you choose. There is no Apple Pay balance. Your card's issuer approves each payment.",
  },
  google: {
    label: "Google Pay",
    min: 5,
    dailyLimit: 5_000,
    feeRate: 0,
    arrival: "Available straight away",
    note: "Google Pay charges the card you choose. There is no Google Pay balance. Your card's issuer approves each payment.",
  },
  card: {
    label: "credit card",
    min: 10,
    dailyLimit: 3_000,
    feeRate: 0.015,
    arrival: "Pending for about 1 business day, then available",
    note: "Your bank checks the payment with a verification code (3D Secure) before it is approved. The amount stays pending until it settles.",
  },
  bank: {
    label: "bank transfer",
    min: 10,
    dailyLimit: 10_000,
    feeRate: 0,
    arrival: "Instant: about 10 seconds. Standard: about 1 business day.",
    note: "Sent from your own bank to this account's IBAN with the reference shown. Instant only works if your bank supports it.",
  },
};

const sameDay = (iso: string, now: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/** Amount already added today with this method (counted after fees). */
export function addedToday(transactions: Transaction[], method: Exclude<FundingMethod, "crypto">, now = new Date()): number {
  return round2(transactions.filter((t) => t.funding === method && sameDay(t.date, now)).reduce((s, t) => s + t.amount, 0));
}

export function feeOn(method: Exclude<FundingMethod, "crypto">, amount: number, speed: BankSpeed = "standard"): number {
  if (method === "bank" && speed === "instant") return 0;
  return round2(amount * RULES[method].feeRate);
}

/** The amount that actually reaches the account. */
export function netOf(method: Exclude<FundingMethod, "crypto">, amount: number, speed: BankSpeed = "standard"): number {
  return round2(amount - feeOn(method, amount, speed));
}

export interface FundingRequest {
  method: Exclude<FundingMethod, "crypto">;
  accountId: string;
  amount: number;
  /** The card for Apple Pay, Google Pay and credit card top-ups. */
  cardId?: string;
  speed?: BankSpeed;
}

export function validateFunding(state: BankState, req: FundingRequest, now = new Date()): Result {
  const rule = RULES[req.method];
  if (!state.accounts.some((a) => a.id === req.accountId)) return { ok: false, error: "Choose an account." };
  if (!Number.isFinite(req.amount) || req.amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (req.amount < rule.min) return { ok: false, error: `The minimum with ${rule.label} is ${formatMoney(rule.min)}.` };
  if (req.amount > MAX_FUNDING) return { ok: false, error: `You can add at most ${formatMoney(MAX_FUNDING)} at a time.` };
  const net = netOf(req.method, req.amount, req.speed);
  const left = round2(rule.dailyLimit - addedToday(state.transactions, req.method, now));
  if (net > left) return { ok: false, error: `Daily limit reached: you can add ${formatMoney(Math.max(0, left))} more with ${rule.label} today.` };
  if (req.method !== "bank") {
    const card = state.cards.find((c) => c.id === req.cardId);
    if (!card) return { ok: false, error: "Choose a card." };
    if (card.frozen) return { ok: false, error: `${card.label} is frozen. Unfreeze it to use it.` };
    if (card.onlinePayments === false) return { ok: false, error: `Online payments are off for ${card.label}. Turn them on in Cards.` };
  }
  return { ok: true };
}

/** Records the top-up. Card and standard bank transfers stay pending until they settle. */
export function applyFunding(state: BankState, req: FundingRequest, now = new Date()): BankState {
  const speed = req.speed ?? "standard";
  const net = netOf(req.method, req.amount, speed);
  const card = state.cards.find((c) => c.id === req.cardId);
  const pending = req.method === "card" || (req.method === "bank" && speed === "standard");
  let description: string;
  if (req.method === "apple") description = `Apple Pay top-up · ${card?.label ?? "card"} ··${card?.last4 ?? ""}`;
  else if (req.method === "google") description = `Google Pay top-up · ${card?.label ?? "card"} ··${card?.last4 ?? ""}`;
  else if (req.method === "card") description = `Card top-up · ${card?.label ?? "card"} ··${card?.last4 ?? ""}`;
  else description = speed === "instant" ? "Bank transfer (instant)" : "Bank transfer (standard)";
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description,
    category: "Income",
    amount: net,
    accountId: req.accountId,
    funding: req.method,
    status: pending ? "pending" : "settled",
    ...(pending ? { settleAt: new Date(now.getTime() + (req.method === "card" ? SETTLE_MS.card : SETTLE_MS.bankStandard)).toISOString() } : {}),
  };
  return {
    ...state,
    accounts: state.accounts.map((a) => (a.id === req.accountId && !pending ? { ...a, balance: round2(a.balance + net) } : a)),
    transactions: [txn, ...state.transactions],
  };
}

/** Makes every pending amount whose time has come available. Returns the new state and what settled. */
export function settleDue(state: BankState, now = new Date()): { state: BankState; settled: Transaction[] } {
  const due = state.transactions.filter((t) => t.status === "pending" && t.settleAt && Date.parse(t.settleAt) <= now.getTime());
  if (due.length === 0) return { state, settled: [] };
  const ids = new Set(due.map((t) => t.id));
  const byAccount = new Map<string, number>();
  for (const t of due) byAccount.set(t.accountId, round2((byAccount.get(t.accountId) ?? 0) + t.amount));
  const done = (t: Transaction): Transaction => {
    const { settleAt: _ignored, ...rest } = t;
    return { ...rest, status: "settled" };
  };
  return {
    settled: due.map(done),
    state: {
      ...state,
      accounts: state.accounts.map((a) => (byAccount.has(a.id) ? { ...a, balance: round2(a.balance + (byAccount.get(a.id) ?? 0)) } : a)),
      transactions: state.transactions.map((t) => (ids.has(t.id) ? done(t) : t)),
    },
  };
}
