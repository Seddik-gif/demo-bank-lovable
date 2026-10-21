// Shared mock data, types and pure banking rules for Demo Bank.
// Everything here is fictional: no real money, customers or APIs.

export type SectionId = "home" | "cards" | "budgets" | "activity" | "crypto" | "invest" | "payments" | "monitor";

export type ContactGroup = "Friends" | "Family" | "Work";

export interface Contact {
  id: string;
  name: string;
  group: ContactGroup;
}

export interface PaymentSplit {
  accountId: string;
  amount: number;
}

export interface ChatMessage {
  id: string;
  contactId: string;
  from: "me" | "them";
  time: string; // ISO
  text: string;
  payment?: {
    amount: number;
    splits: { accountId: string; accountName: string; amount: number }[];
  };
  request?: MoneyRequest;
}

export type RequestStatus = "pending" | "paid" | "declined" | "cancelled";

export interface MoneyRequest {
  direction: "incoming" | "outgoing"; // incoming: they ask you to pay; outgoing: you ask them
  amount: number;
  status: RequestStatus;
}

export type AccountKind = "current" | "savings" | "currency" | "joint" | "crypto" | "invest" | "pockets";

export interface Account {
  id: string;
  name: string;
  iban: string;
  balance: number;
  /** What kind of account this is. Missing means a current account. */
  kind?: AccountKind;
  /** Currency account: the currency the account is shown in. Balances are kept in USD. */
  currency?: string;
  /** Joint account: the second holder. */
  coHolder?: string;
  /** Savings account: the yearly interest rate, e.g. 0.0225 for 2.25%. */
  rate?: number;
}

export interface Transaction {
  id: string;
  date: string; // ISO
  description: string;
  category: string;
  amount: number; // positive = money in, negative = money out
  accountId: string;
  /** Money in that is not available yet (card top-ups and standard bank transfers). Missing means settled. */
  status?: "pending" | "settled";
  /** When a pending amount becomes available. */
  settleAt?: string;
  /** How money was added, for the daily limits. Missing for other transactions. */
  funding?: string;
}

/** The metal finish of a card. */
export const CARD_TONES = ["violet", "cyan", "gold", "emerald"] as const;
export type CardTone = (typeof CARD_TONES)[number];

export interface Card {
  id: string;
  network: "Visa" | "Mastercard";
  label: string;
  type: string;
  last4: string;
  frozen: boolean;
  tone: CardTone;
  /** Can be used for online purchases. Optional so older saved data still loads (missing means on). */
  onlinePayments?: boolean;
  /** Spending cap per month in USD. Missing or 0 means no cap. */
  spendLimit?: number;
  /** Demo card details shown on the back of the card. Generated for new cards. */
  number?: string;
  expiry?: string; // MM/YY
  cvv?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  /** A round-up pocket: spare change from payments is added to it. */
  roundUp?: boolean;
}

export type Frequency = "weekly" | "monthly";

export interface Schedule {
  id: string;
  name: string;
  amount: number;
  accountId: string;
  frequency: Frequency;
  nextDate: string; // ISO date of the next payment
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface BankState {
  accounts: Account[];
  transactions: Transaction[];
  cards: Card[];
  budgets: Budget[];
  crypto: Record<string, number>; // asset symbol -> quantity held
  contacts: Contact[];
  messages: ChatMessage[];
  plan: PlanId;
  goals: Goal[];
  schedules: Schedule[];
  /** Names (as they appear on a transaction) whose next scheduled payment is blocked. Each block is used once. */
  blockedNext: string[];
  /** Crypto sent to this wallet that is still waiting for confirmations. */
  cryptoDeposits: CryptoDeposit[];
  /** Investment holdings: symbol -> units held. */
  investments: Record<string, number>;
}

export interface CryptoDeposit {
  id: string;
  symbol: string;
  quantity: number;
  /** The sender's address, as entered. */
  from: string;
  /** When the deposit is credited to the holdings. */
  settleAt: string;
}

/** Categories a transaction can be moved to. */
export const CATEGORIES = ["Food", "Transport", "Entertainment", "Bills", "Shopping", "Health", "Travel", "Savings", "Transfer", "Income", "Crypto"] as const;

export type PlanId = "everyday" | "plus" | "pro" | "private";
export const PLAN_IDS: PlanId[] = ["everyday", "plus", "pro", "private"];

export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo-pass";
export const MAX_BUDGET_LIMIT = 100_000;

export function checkCredentials(username: string, password: string): boolean {
  return username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// The number format is a setting (Settings > Number format), so it can change at runtime.
let usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function setMoneyLocale(locale: "en-US" | "de-DE"): void {
  usd = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" });
}
export const formatMoney = (n: number) => usd.format(n);
export const formatSigned = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + usd.format(Math.abs(n));

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function createDefaultState(): BankState {
  return {
    accounts: [
      { id: "main", name: "Main current account", iban: "DB42 DEMO 0001 4286 5012", balance: 4286.5 },
      { id: "savings", name: "Savings", iban: "DB17 DEMO 0002 1285 0034", balance: 12850 },
      { id: "travel", name: "Travel pot", iban: "DB88 DEMO 0003 0615 2577", balance: 615.25 },
    ],
    transactions: [
      { id: "t1", date: "2026-10-16T18:20:00Z", description: "Fresh Market groceries", category: "Food", amount: -64.3, accountId: "main" },
      { id: "t2", date: "2026-10-15T08:10:00Z", description: "Metro monthly pass", category: "Transport", amount: -49, accountId: "main" },
      { id: "t3", date: "2026-10-14T20:45:00Z", description: "Cinema Nova tickets", category: "Entertainment", amount: -28.5, accountId: "main" },
      { id: "t4", date: "2026-10-13T09:00:00Z", description: "Salary · Acme Demo Ltd", category: "Income", amount: 3200, accountId: "main" },
      { id: "t5", date: "2026-10-12T12:30:00Z", description: "Corner Café lunch", category: "Food", amount: -18.9, accountId: "main" },
      { id: "t6", date: "2026-10-10T07:00:00Z", description: "Electricity bill", category: "Bills", amount: -86.4, accountId: "main" },
      { id: "t7", date: "2026-10-09T19:15:00Z", description: "Streaming subscription", category: "Entertainment", amount: -14.99, accountId: "main" },
      { id: "t8", date: "2026-10-08T16:40:00Z", description: "Bookshop", category: "Shopping", amount: -32, accountId: "main" },
      { id: "t9", date: "2026-10-07T11:05:00Z", description: "Ride share", category: "Transport", amount: -21.6, accountId: "travel" },
      { id: "t10", date: "2026-10-05T10:00:00Z", description: "Internet & phone", category: "Bills", amount: -59.99, accountId: "main" },
      { id: "t11", date: "2026-10-04T17:25:00Z", description: "Weekend market", category: "Food", amount: -41.75, accountId: "main" },
      { id: "t12", date: "2026-10-02T09:30:00Z", description: "Interest payment", category: "Income", amount: 12.4, accountId: "savings" },
    ],
    cards: [
      { id: "c1", network: "Visa", label: "Visa Everyday", type: "Debit", last4: "4821", frozen: false, tone: "violet", onlinePayments: true, spendLimit: 0, number: "4000 1234 5678 4821", expiry: "09/29", cvv: "318" },
      { id: "c2", network: "Mastercard", label: "Mastercard Online", type: "Online only", last4: "1177", frozen: false, tone: "cyan", onlinePayments: true, spendLimit: 0, number: "5100 2345 6789 1177", expiry: "11/28", cvv: "742" },
    ],
    budgets: [
      { id: "b1", category: "Food", limit: 400 },
      { id: "b2", category: "Transport", limit: 120 },
      { id: "b3", category: "Entertainment", limit: 80 },
      { id: "b4", category: "Bills", limit: 250 },
    ],
    crypto: { BTC: 0.0425, ETH: 1.2 },
    contacts: [
      { id: "ct1", name: "Alex Morgan", group: "Friends" },
      { id: "ct2", name: "Sara Lee", group: "Friends" },
      { id: "ct3", name: "Mom", group: "Family" },
      { id: "ct4", name: "Daniel Kim", group: "Work" },
      { id: "ct5", name: "Leo Park", group: "Work" },
    ],
    messages: [
      { id: "m1", contactId: "ct1", from: "them", time: "2026-10-16T17:00:00Z", text: "Dinner on Friday?" },
      { id: "m2", contactId: "ct1", from: "me", time: "2026-10-16T17:05:00Z", text: "Yes! I'll pay for the taxi, you can send me your share later." },
      { id: "m3", contactId: "ct3", from: "them", time: "2026-10-15T09:10:00Z", text: "Did you pay the electricity bill?" },
      { id: "m4", contactId: "ct4", from: "them", time: "2026-10-14T13:30:00Z", text: "Can you send me the invoice details?" },
      { id: "m5", contactId: "ct3", from: "them", time: "2026-10-15T10:00:00Z", text: "Could you cover my half of the gas bill?", request: { direction: "incoming", amount: 40, status: "pending" } },
    ],
    plan: "everyday",
    goals: [{ id: "g1", name: "Holiday", target: 1500, saved: 420 }],
    schedules: [{ id: "s1", name: "Electricity bill", amount: 86.4, accountId: "main", frequency: "monthly", nextDate: "2026-10-20T00:00:00Z" }],
    blockedNext: [],
    cryptoDeposits: [],
    investments: { GEI: 40, GOVB: 25, TECH: 12 },
  };
}

/** A brand-new account: the same accounts and cards, but every balance is zero and there is no history. */
export function createEmptyState(): BankState {
  const d = createDefaultState();
  return {
    ...d,
    // A new account starts with only the main current account.
    accounts: d.accounts.filter((a) => a.id === "main").map((a) => ({ ...a, balance: 0 })),
    transactions: [],
    budgets: [],
    crypto: {},
    contacts: [],
    messages: [],
    goals: [],
    schedules: [],
    blockedNext: [],
    cryptoDeposits: [],
    investments: {},
  };
}

// ---- Simulated crypto trades ------------------------------------------------
// Trades settle against the Main current account. Prices and quantities come
// from the live order book (see market.ts); nothing is sent to an exchange.

export const CASH_ACCOUNT_ID = "main";

export interface TradeRequest {
  base: string;
  side: "buy" | "sell";
  qty: number; // asset quantity
  quote: number; // USD before fees
  feeRate: number;
}

export function validateTrade(state: BankState, t: TradeRequest): Result {
  if (!(t.qty > 0) || !(t.quote > 0)) return { ok: false, error: "The order is empty." };
  const cash = state.accounts.find((a) => a.id === CASH_ACCOUNT_ID);
  if (!cash) return { ok: false, error: "The Main current account is missing." };
  if (t.side === "buy") {
    const total = round2(t.quote * (1 + t.feeRate));
    if (total > cash.balance)
      return { ok: false, error: `Not enough cash: this order needs ${formatMoney(total)} including fees.` };
  } else {
    const held = state.crypto[t.base] ?? 0;
    if (t.qty > held + 1e-12) return { ok: false, error: `You hold ${held} ${t.base}, not enough to sell ${t.qty}.` };
  }
  return { ok: true };
}

export function applyTrade(state: BankState, t: TradeRequest, now = new Date()): BankState {
  const qty = Math.round(t.qty * 1e8) / 1e8;
  const fee = t.quote * t.feeRate;
  const buy = t.side === "buy";
  const cashDelta = round2(buy ? -(t.quote + fee) : t.quote - fee);
  const accounts = state.accounts.map((a) =>
    a.id === CASH_ACCOUNT_ID ? { ...a, balance: round2(a.balance + cashDelta) } : a,
  );
  const held = state.crypto[t.base] ?? 0;
  const crypto = { ...state.crypto, [t.base]: Math.max(0, buy ? held + qty : held - qty) };
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description: `${buy ? "Bought" : "Sold"} ${qty} ${t.base}`,
    category: "Crypto",
    amount: cashDelta,
    accountId: CASH_ACCOUNT_ID,
  };
  return { ...state, accounts, crypto, transactions: [txn, ...state.transactions] };
}

// ---- Payments and chat -------------------------------------------------------

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_NOTE_LENGTH = 200;

/** Checks a payment split across the accounts the user chose. Accounts left at zero are ignored. */
export function validatePayment(state: BankState, contactId: string, splits: PaymentSplit[], note: string): Result {
  if (!state.contacts.some((c) => c.id === contactId)) return { ok: false, error: "Choose a contact first." };
  if (note.length > MAX_NOTE_LENGTH) return { ok: false, error: `The note can be at most ${MAX_NOTE_LENGTH} characters.` };
  const active = splits.filter((s) => s.amount > 0);
  if (active.length === 0) return { ok: false, error: "Enter an amount for at least one account." };
  for (const s of active) {
    const account = state.accounts.find((a) => a.id === s.accountId);
    if (!account) return { ok: false, error: "One of the chosen accounts no longer exists." };
    if (!Number.isFinite(s.amount) || round2(s.amount) > account.balance)
      return { ok: false, error: `${account.name} has only ${formatMoney(account.balance)}.` };
  }
  return { ok: true };
}

export function applyPayment(state: BankState, contactId: string, splits: PaymentSplit[], note: string, now = new Date()): BankState {
  const contact = state.contacts.find((c) => c.id === contactId)!;
  const active = splits.filter((s) => s.amount > 0).map((s) => ({ accountId: s.accountId, amount: round2(s.amount) }));
  const names = new Map(state.accounts.map((a) => [a.id, a.name]));
  const debit = new Map(active.map((s) => [s.accountId, s.amount]));
  const accounts = state.accounts.map((a) => (debit.has(a.id) ? { ...a, balance: round2(a.balance - (debit.get(a.id) ?? 0)) } : a));
  const txns: Transaction[] = active.map((s) => ({
    id: uid(),
    date: now.toISOString(),
    description: `Payment to ${contact.name}`,
    category: "Payments",
    amount: -s.amount,
    accountId: s.accountId,
  }));
  const total = round2(active.reduce((sum, s) => sum + s.amount, 0));
  const message: ChatMessage = {
    id: uid(),
    contactId,
    from: "me",
    time: now.toISOString(),
    text: note.trim(),
    payment: {
      amount: total,
      splits: active.map((s) => ({ accountId: s.accountId, accountName: names.get(s.accountId) ?? s.accountId, amount: s.amount })),
    },
  };
  return { ...state, accounts, transactions: [...txns, ...state.transactions], messages: [...state.messages, message] };
}

export function validateMessage(text: string): Result {
  const clean = text.trim();
  if (!clean) return { ok: false, error: "Write a message first." };
  if (clean.length > MAX_MESSAGE_LENGTH) return { ok: false, error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters.` };
  return { ok: true };
}

export function applyMessage(state: BankState, contactId: string, text: string, now = new Date()): BankState {
  const message: ChatMessage = { id: uid(), contactId, from: "me", time: now.toISOString(), text: text.trim() };
  return { ...state, messages: [...state.messages, message] };
}

export function validateContactName(name: string, contacts: Contact[]): Result {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Enter a name." };
  if (clean.length > 40) return { ok: false, error: "Names can be at most 40 characters." };
  if (contacts.some((c) => c.name.toLowerCase() === clean.toLowerCase())) return { ok: false, error: `${clean} is already in your contacts.` };
  return { ok: true };
}

export function applyContact(state: BankState, name: string, group: ContactGroup): BankState {
  return { ...state, contacts: [...state.contacts, { id: uid(), name: name.trim(), group }] };
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

// ---- Money requests -----------------------------------------------------------

export function validateRequest(state: BankState, contactId: string, amount: number, note: string): Result {
  if (!state.contacts.some((c) => c.id === contactId)) return { ok: false, error: "Choose a contact first." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (round2(amount) > MAX_BUDGET_LIMIT) return { ok: false, error: `Requests can be at most ${formatMoney(MAX_BUDGET_LIMIT)}.` };
  if (note.length > MAX_NOTE_LENGTH) return { ok: false, error: `The note can be at most ${MAX_NOTE_LENGTH} characters.` };
  return { ok: true };
}

/** You ask a contact to pay you. It stays pending until you cancel it. */
export function applyOutgoingRequest(state: BankState, contactId: string, amount: number, note: string, now = new Date()): BankState {
  const value = round2(amount);
  const message: ChatMessage = {
    id: uid(),
    contactId,
    from: "me",
    time: now.toISOString(),
    text: note.trim() || `Requested ${formatMoney(value)}`,
    request: { direction: "outgoing", amount: value, status: "pending" },
  };
  return { ...state, messages: [...state.messages, message] };
}

export function setRequestStatus(state: BankState, messageId: string, status: RequestStatus): BankState {
  return {
    ...state,
    messages: state.messages.map((m) => (m.id === messageId && m.request ? { ...m, request: { ...m.request, status } } : m)),
  };
}

/** Paying an incoming request: the split must add up to exactly the requested amount. */
export function validateRequestPayment(state: BankState, messageId: string, splits: PaymentSplit[], note: string): Result {
  const msg = state.messages.find((m) => m.id === messageId);
  if (!msg?.request || msg.request.direction !== "incoming" || msg.request.status !== "pending")
    return { ok: false, error: "This request is no longer waiting for payment." };
  const total = round2(splits.reduce((sum, s) => sum + (s.amount > 0 ? s.amount : 0), 0));
  if (total !== round2(msg.request.amount))
    return { ok: false, error: `Split the payment to add up to exactly ${formatMoney(msg.request.amount)}.` };
  return validatePayment(state, msg.contactId, splits, note);
}

export function applyRequestPayment(state: BankState, messageId: string, splits: PaymentSplit[], note: string, now = new Date()): BankState {
  const msg = state.messages.find((m) => m.id === messageId)!;
  const paid = applyPayment(state, msg.contactId, splits, note, now);
  return setRequestStatus(paid, messageId, "paid");
}

export type Result = { ok: true } | { ok: false; error: string };

export function validateTransfer(accounts: Account[], fromId: string, toId: string, amount: number): Result {
  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  if (!from || !to) return { ok: false, error: "Choose both accounts." };
  if (from.id === to.id) return { ok: false, error: "Choose two different accounts." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (round2(amount) > from.balance)
    return { ok: false, error: `Not enough money: ${from.name} has ${formatMoney(from.balance)}.` };
  return { ok: true };
}

export function applyTransfer(state: BankState, fromId: string, toId: string, amount: number, now = new Date()): BankState {
  const value = round2(amount);
  const to = state.accounts.find((a) => a.id === toId)!;
  const accounts = state.accounts.map((a) =>
    a.id === fromId ? { ...a, balance: round2(a.balance - value) } : a.id === toId ? { ...a, balance: round2(a.balance + value) } : a,
  );
  const txn: Transaction = {
    id: uid(),
    date: now.toISOString(),
    description: `Transfer to ${to.name}`,
    category: "Transfer",
    amount: -value,
    accountId: fromId,
  };
  return { ...state, accounts, transactions: [txn, ...state.transactions] };
}

export function validateLimit(limit: number): Result {
  if (!Number.isFinite(limit) || limit <= 0) return { ok: false, error: "The limit must be greater than zero." };
  if (limit > MAX_BUDGET_LIMIT) return { ok: false, error: `The limit can be at most ${formatMoney(MAX_BUDGET_LIMIT)}.` };
  return { ok: true };
}

export function validateCategoryName(name: string, budgets: Budget[]): Result {
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Enter a category name." };
  if (budgets.some((b) => b.category.toLowerCase() === clean.toLowerCase()))
    return { ok: false, error: `A budget for "${clean}" already exists.` };
  return { ok: true };
}

export function spentInCategory(category: string, transactions: Transaction[]): number {
  const key = category.toLowerCase();
  return round2(
    transactions.filter((t) => t.amount < 0 && t.category.toLowerCase() === key).reduce((s, t) => s - t.amount, 0),
  );
}

export interface Holding {
  symbol: string;
  name: string;
  kind: string;
  quantity: number;
  price: number;
  change24h: number; // percent
}

export const CRYPTO_HOLDINGS: Holding[] = [
  { symbol: "BTC", name: "Bitcoin", kind: "Crypto", quantity: 0.0425, price: 67420, change24h: 2.35 },
  { symbol: "ETH", name: "Ether", kind: "Crypto", quantity: 1.2, price: 3185.4, change24h: -1.12 },
];

export const INVEST_HOLDINGS: Holding[] = [
  { symbol: "GEI", name: "Global Equity Index", kind: "ETF", quantity: 40, price: 98.6, change24h: 0.84 },
  { symbol: "GOVB", name: "Government Bond", kind: "Bond", quantity: 25, price: 101.2, change24h: -0.12 },
  { symbol: "TECH", name: "Tech Leaders", kind: "Stock", quantity: 12, price: 212.75, change24h: 1.96 },
];
