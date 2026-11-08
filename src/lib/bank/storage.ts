import { CARD_TONES, createDefaultState, PLAN_IDS, withHoldingAccounts, type Account, type BankState, type Budget, type Card, type ChatMessage, type Contact, type CryptoDeposit, type Goal, type PlanId, type Schedule, type Transaction } from "./data";

const KEY = "demo-bank:v1";

const isObj = (v: unknown): v is any => typeof v === "object" && v !== null;
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isAccount = (v: unknown): v is Account => isObj(v) && isStr(v.id) && isStr(v.name) && isStr(v.iban) && isNum(v.balance);
const isTxn = (v: unknown): v is Transaction =>
  isObj(v) && isStr(v.id) && isStr(v.date) && !Number.isNaN(Date.parse(v.date as string)) && isStr(v.description) &&
  isStr(v.category) && isNum(v.amount) && isStr(v.accountId);
const isCard = (v: unknown): v is Card =>
  isObj(v) && isStr(v.id) && (v.network === "Visa" || v.network === "Mastercard") && isStr(v.label) && isStr(v.type) &&
  typeof v.last4 === "string" && /^\d{4}$/.test(v.last4) && typeof v.frozen === "boolean" && (CARD_TONES as readonly string[]).includes(v.tone as string);
const isBudget = (v: unknown): v is Budget => isObj(v) && isStr(v.id) && isStr(v.category) && isNum(v.limit) && v.limit > 0;
/** Cards saved before the back of the card existed get demo details, so every card shows them. */
const withCardDetails = (c: Card): Card => ({
  ...c,
  number: c.number ?? `${c.network === "Visa" ? "4000" : "5100"} 0000 0000 ${c.last4}`,
  expiry: c.expiry ?? "12/29",
  cvv: c.cvv ?? "123",
});

const isDeposit = (v: unknown): v is CryptoDeposit =>
  isObj(v) && isStr(v.id) && isStr(v.symbol) && isNum(v.quantity) && v.quantity > 0 && isStr(v.from) &&
  isStr(v.settleAt) && !Number.isNaN(Date.parse(v.settleAt as string));
const isGoal = (v: unknown): v is Goal =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isNum(v.target) && v.target > 0 && isNum(v.saved) && v.saved >= 0;
const isSchedule = (v: unknown): v is Schedule =>
  isObj(v) && isStr(v.id) && isStr(v.name) && isNum(v.amount) && v.amount > 0 && isStr(v.accountId) &&
  (v.frequency === "weekly" || v.frequency === "monthly") && isStr(v.nextDate) && !Number.isNaN(Date.parse(v.nextDate as string));

const listOf = <T,>(v: unknown, check: (x: unknown) => x is T): T[] | null =>
  Array.isArray(v) && v.every(check) ? v : null;

const isContact = (v: unknown): v is Contact =>
  isObj(v) && isStr(v.id) && isStr(v.name) && (v.group === "Friends" || v.group === "Family" || v.group === "Work");
const isMessage = (v: unknown): v is ChatMessage =>
  isObj(v) && isStr(v.id) && isStr(v.contactId) && (v.from === "me" || v.from === "them") &&
  isStr(v.time) && !Number.isNaN(Date.parse(v.time as string)) && typeof v.text === "string" &&
  (v.payment === undefined || (isObj(v.payment) && isNum(v.payment.amount))) &&
  (v.request === undefined || (isObj(v.request) && isNum(v.request.amount) && v.request.amount > 0 &&
    (v.request.direction === "incoming" || v.request.direction === "outgoing") &&
    ["pending", "paid", "declined", "cancelled"].includes(v.request.status)));

const isCrypto = (v: unknown): v is Record<string, number> =>
  isObj(v) && Object.values(v).every((q) => isNum(q) && q >= 0);

/** Loads saved state; any missing or damaged part falls back to its default. */
export function loadState(): BankState {
  const defaults = createDefaultState();
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return defaults; // storage blocked
  }
  if (!raw) return defaults;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed)) return defaults;
    const accounts = listOf(parsed.accounts, isAccount);
    const crypto = isCrypto(parsed.crypto) ? parsed.crypto : defaults.crypto;
    const investments = isCrypto(parsed.investments) ? parsed.investments : defaults.investments;
    const savedAccounts = accounts && accounts.length >= 1 && accounts.some((a) => a.id === "main") ? accounts : defaults.accounts;
    return {
      accounts: withHoldingAccounts(savedAccounts, crypto, investments),
      transactions: listOf(parsed.transactions, isTxn) ?? defaults.transactions,
      cards: (listOf(parsed.cards, isCard) ?? defaults.cards).map(withCardDetails),
      budgets: listOf(parsed.budgets, isBudget) ?? defaults.budgets,
      crypto,
      contacts: listOf(parsed.contacts, isContact) ?? defaults.contacts,
      messages: listOf(parsed.messages, isMessage) ?? defaults.messages,
      plan: typeof parsed.plan === "string" && (PLAN_IDS as string[]).includes(parsed.plan) ? (parsed.plan as PlanId) : defaults.plan,
      goals: listOf(parsed.goals, isGoal) ?? defaults.goals,
      schedules: listOf(parsed.schedules, isSchedule) ?? defaults.schedules,
      blockedNext: listOf(parsed.blockedNext, isStr) ?? defaults.blockedNext,
      cryptoDeposits: listOf(parsed.cryptoDeposits, isDeposit) ?? defaults.cryptoDeposits,
      investments,
    };
  } catch {
    return defaults;
  }
}

export function saveState(state: BankState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked or full: keep working in memory.
  }
}
