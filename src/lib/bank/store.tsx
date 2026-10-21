import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  applyTrade,
  applyTransfer,
  createDefaultState,
  formatMoney,
  round2,
  uid,
  validateCategoryName,
  validateLimit,
  validateTrade,
  validateTransfer,
  applyContact,
  applyMessage,
  applyOutgoingRequest,
  applyPayment,
  applyRequestPayment,
  setRequestStatus,
  validateRequest,
  validateRequestPayment,
  validateContactName,
  type RequestStatus,
  validateMessage,
  validatePayment,
  type BankState,
  type ContactGroup,
  type Frequency,
  type PaymentSplit,
  type Transaction,
  createEmptyState,
  type PlanId,
  type Result,
  type TradeRequest,
} from "./data";
import { loadState, saveState } from "./storage";
import { track } from "./monitor";
import { amountText, notify } from "./notifications";
import { applyFunding, FUNDING_LABEL, settleDue, validateFunding, type FundingRequest } from "./funding";
import { applyDeposit, settleCryptoDeposits, validateDeposit } from "./crypto";
import {
  advanceDate,
  applyAddGoal,
  applyAddSchedule,
  applyCardLimit,
  applyCardOnline,
  applyContribution,
  applyDeleteGoal,
  applyRemoveSchedule,
  applyReportLost,
  applySchedulePayment,
  applyWithdrawal,
  applyTransactionCategory,
  applyAddCard,
  applyRemoveCard,
  applyNewAccount,
  validateNewAccount,
  type NewAccountConfig,
  applyRoundUps,
  applyRoundUpToggle,
  validateInvestBuy,
  applyInvestBuy,
  validateInvestSell,
  applyInvestSell,
  validateNewCard,
  type NewCardConfig,
  applyBlockNext,
  applyUnblockNext,
  applyConsumeBlock,
  validateContribution,
  validateGoal,
  validateSchedule,
  validateSchedulePayment,
  validateSpendLimit,
  validateWithdrawal,
} from "./money";

interface BankApi extends BankState {
  transfer: (fromId: string, toId: string, amount: number) => Result;
  toggleCard: (id: string) => void;
  setLimit: (id: string, limit: number) => Result;
  deleteBudget: (id: string) => void;
  addBudget: (category: string, limit: number) => Result;
  executeTrade: (trade: TradeRequest) => Result;
  sendMessage: (contactId: string, text: string) => Result;
  sendPayment: (contactId: string, splits: PaymentSplit[], note: string) => Result;
  addContact: (name: string, group: ContactGroup) => Result;
  requestMoney: (contactId: string, amount: number, note: string) => Result;
  respondToRequest: (messageId: string, status: "declined" | "cancelled") => Result;
  payRequest: (messageId: string, splits: PaymentSplit[], note: string) => Result;
  setPlan: (plan: PlanId) => void;
  resetDemo: () => void;
  addGoal: (name: string, target: number) => Result;
  contributeGoal: (goalId: string, accountId: string, amount: number) => Result;
  withdrawGoal: (goalId: string, accountId: string, amount: number) => Result;
  deleteGoal: (goalId: string) => void;
  addSchedule: (name: string, amount: number, accountId: string, frequency: Frequency) => Result;
  payScheduleNow: (scheduleId: string) => Result;
  removeSchedule: (scheduleId: string) => void;
  setCardOnline: (cardId: string, on: boolean) => void;
  setCardLimit: (cardId: string, limit: number) => Result;
  reportCardLost: (cardId: string) => void;
  receiveMoney: (fromName: string, accountId: string, amount: number) => Result;
  addFunds: (req: FundingRequest) => Result;
  receiveCrypto: (symbol: string, quantity: number, from: string) => Result;
  addCard: (cfg: NewCardConfig) => Result;
  removeCard: (cardId: string) => Result;
  openAccount: (cfg: NewAccountConfig) => Result;
  investBuy: (accountId: string, symbol: string, usd: number) => Result;
  investSell: (accountId: string, symbol: string, units: number) => Result;
  setRoundUp: (on: boolean) => void;
  startNewAccount: () => void;
  setTransactionCategory: (txnId: string, category: string) => Result;
  blockNextPayment: (name: string) => void;
  unblockNextPayment: (name: string) => void;
}

const BankContext = createContext<BankApi | null>(null);

/** A payment stopped by a block: logged, reported to the user, and returned as a failed result. */
function blockedPayment(name: string): Result {
  const message = `Blocked: the payment to ${name} was stopped as you asked. The block is now cleared.`;
  track("payment_rejected", `Blocked: payment to ${name} stopped as requested`);
  notify("blocked", "Payment blocked", `Your payment to ${name} was stopped as you asked.`);
  return { ok: false, error: message };
}

export function BankProvider({ children }: { children: ReactNode }) {
  // Load the saved state before the first render, so defaults are never written over it.
  const [state, setState] = useState<BankState>(() =>
    typeof window === "undefined" ? createDefaultState() : loadState(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const transfer = useCallback((fromId: string, toId: string, amount: number): Result => {
    const s = stateRef.current;
    const check = validateTransfer(s.accounts, fromId, toId, amount);
    if (!check.ok) {
      track("transfer_rejected", check.error);
      return check;
    }
    const next = applyTransfer(s, fromId, toId, amount);
    setState(next);
    const name = (id: string) => s.accounts.find((a) => a.id === id)?.name;
    track("transfer", `${formatMoney(round2(amount))} from ${name(fromId)} to ${name(toId)}`);
    return { ok: true };
  }, []);

  const toggleCard = useCallback((id: string) => {
    const card = stateRef.current.cards.find((c) => c.id === id);
    if (!card) return;
    setState((s) => ({ ...s, cards: s.cards.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c)) }));
    track("card", `${card.label} ${card.frozen ? "unfrozen" : "frozen"}`);
  }, []);

  const setLimit = useCallback((id: string, limit: number): Result => {
    const check = validateLimit(limit);
    if (!check.ok) return check;
    const b = stateRef.current.budgets.find((x) => x.id === id);
    setState((s) => ({ ...s, budgets: s.budgets.map((x) => (x.id === id ? { ...x, limit: round2(limit) } : x)) }));
    track("budget", `${b?.category} limit set to ${formatMoney(limit)}`);
    return { ok: true };
  }, []);

  const deleteBudget = useCallback((id: string) => {
    const b = stateRef.current.budgets.find((x) => x.id === id);
    setState((s) => ({ ...s, budgets: s.budgets.filter((x) => x.id !== id) }));
    track("budget", `${b?.category} budget deleted`);
  }, []);

  const addBudget = useCallback((category: string, limit: number): Result => {
    const nameCheck = validateCategoryName(category, stateRef.current.budgets);
    if (!nameCheck.ok) return nameCheck;
    const limitCheck = validateLimit(limit);
    if (!limitCheck.ok) return limitCheck;
    const clean = category.trim();
    setState((s) => ({ ...s, budgets: [...s.budgets, { id: uid(), category: clean, limit: round2(limit) }] }));
    track("budget", `${clean} budget added (${formatMoney(limit)})`);
    return { ok: true };
  }, []);

  const executeTrade = useCallback((trade: TradeRequest): Result => {
    const s = stateRef.current;
    const check = validateTrade(s, trade);
    if (!check.ok) {
      track("trade_rejected", `${trade.side} ${trade.base}: ${check.error}`);
      return check;
    }
    setState(applyTrade(s, trade));
    const verb = trade.side === "buy" ? "Bought" : "Sold";
    track("trade", `${verb} ${trade.qty} ${trade.base} for ${formatMoney(round2(trade.quote))} (simulated)`);
    return { ok: true };
  }, []);

  const sendMessage = useCallback((contactId: string, text: string): Result => {
    const s = stateRef.current;
    const check = validateMessage(text);
    if (!check.ok) return check;
    const name = s.contacts.find((c) => c.id === contactId)?.name ?? "contact";
    setState(applyMessage(s, contactId, text));
    track("message", `Message sent to ${name}`);
    return { ok: true };
  }, []);

  const sendPayment = useCallback((contactId: string, splits: PaymentSplit[], note: string): Result => {
    const s = stateRef.current;
    const name = s.contacts.find((c) => c.id === contactId)?.name ?? "contact";
    if (s.blockedNext.includes(name)) {
      // A block on this payee stops the next payment to them, once.
      setState((cur) => applyConsumeBlock(cur, name));
      return blockedPayment(name);
    }
    const check = validatePayment(s, contactId, splits, note);
    if (!check.ok) {
      track("payment_rejected", `Payment to ${name}: ${check.error}`);
      return check;
    }
    const total = round2(splits.reduce((sum, x) => sum + (x.amount > 0 ? x.amount : 0), 0));
    const count = splits.filter((x) => x.amount > 0).length;
    const rounded = applyRoundUps(applyPayment(s, contactId, splits, note), splits.filter((x) => x.amount > 0));
    setState(rounded.state);
    track("payment", `Paid ${formatMoney(total)} to ${name} from ${count} account${count === 1 ? "" : "s"}`);
    notify("out", "Payment sent", `${amountText(total)} to ${name}`);
    return { ok: true };
  }, []);

  const addContact = useCallback((name: string, group: ContactGroup): Result => {
    const s = stateRef.current;
    const check = validateContactName(name, s.contacts);
    if (!check.ok) return check;
    setState(applyContact(s, name, group));
    track("contact", `Contact added: ${name.trim()} (${group})`);
    return { ok: true };
  }, []);

  const requestMoney = useCallback((contactId: string, amount: number, note: string): Result => {
    const s = stateRef.current;
    const check = validateRequest(s, contactId, amount, note);
    if (!check.ok) return check;
    const name = s.contacts.find((c) => c.id === contactId)?.name ?? "contact";
    setState(applyOutgoingRequest(s, contactId, amount, note));
    track("request", `Requested ${formatMoney(round2(amount))} from ${name}`);
    return { ok: true };
  }, []);

  const respondToRequest = useCallback((messageId: string, status: "declined" | "cancelled"): Result => {
    const s = stateRef.current;
    const msg = s.messages.find((m) => m.id === messageId);
    if (!msg?.request || msg.request.status !== "pending") return { ok: false, error: "This request is no longer pending." };
    setState(setRequestStatus(s, messageId, status as RequestStatus));
    track("request_update", `Request ${formatMoney(msg.request.amount)} ${status}`);
    return { ok: true };
  }, []);

  const payRequest = useCallback((messageId: string, splits: PaymentSplit[], note: string): Result => {
    const s = stateRef.current;
    const payee = s.contacts.find((c) => c.id === s.messages.find((m) => m.id === messageId)?.contactId)?.name ?? "";
    if (payee && s.blockedNext.includes(payee)) {
      setState((cur) => applyConsumeBlock(cur, payee));
      return blockedPayment(payee);
    }
    const check = validateRequestPayment(s, messageId, splits, note);
    if (!check.ok) {
      track("payment_rejected", `Request payment: ${check.error}`);
      return check;
    }
    const msg = s.messages.find((m) => m.id === messageId)!;
    const name = s.contacts.find((c) => c.id === msg.contactId)?.name ?? "contact";
    setState(applyRoundUps(applyRequestPayment(s, messageId, splits, note), splits.filter((x) => x.amount > 0)).state);
    track("payment", `Paid request of ${formatMoney(msg.request?.amount ?? 0)} to ${name}`);
    notify("out", "Request paid", `${amountText(msg.request?.amount ?? 0)} to ${name}`);
    return { ok: true };
  }, []);

  const setPlan = useCallback((plan: PlanId) => {
    setState((s) => ({ ...s, plan }));
    track("plan", `Plan changed to ${plan} (demo, no charge)`);
  }, []);

  const resetDemo = useCallback(() => {
    setState(createDefaultState());
    track("settings", "Demo data reset to the defaults");
  }, []);

  const addGoal = useCallback((name: string, target: number): Result => {
    const check = validateGoal(stateRef.current, name, target);
    if (!check.ok) return check;
    setState((s) => applyAddGoal(s, name, target));
    track("goal", `Goal added: ${name.trim()} (${formatMoney(round2(target))})`);
    return { ok: true };
  }, []);

  const contributeGoal = useCallback((goalId: string, accountId: string, amount: number): Result => {
    const s = stateRef.current;
    const check = validateContribution(s, goalId, accountId, amount);
    if (!check.ok) return check;
    const goal = s.goals.find((g) => g.id === goalId)!;
    setState((cur) => applyContribution(cur, goalId, accountId, amount));
    track("goal", `Saved ${formatMoney(round2(amount))} for ${goal.name}`);
    return { ok: true };
  }, []);

  const withdrawGoal = useCallback((goalId: string, accountId: string, amount: number): Result => {
    const s = stateRef.current;
    const check = validateWithdrawal(s, goalId, amount);
    if (!check.ok) return check;
    const goal = s.goals.find((g) => g.id === goalId)!;
    setState((cur) => applyWithdrawal(cur, goalId, accountId, amount));
    track("goal", `Took ${formatMoney(round2(amount))} out of ${goal.name}`);
    return { ok: true };
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    const goal = stateRef.current.goals.find((g) => g.id === goalId);
    if (!goal) return;
    setState((s) => applyDeleteGoal(s, goalId));
    track("goal", `Goal removed: ${goal.name}${goal.saved > 0 ? " (saved money returned to the main account)" : ""}`);
  }, []);

  const addSchedule = useCallback((name: string, amount: number, accountId: string, frequency: Frequency): Result => {
    const check = validateSchedule(stateRef.current, name, amount, accountId);
    if (!check.ok) return check;
    const next = advanceDate(new Date().toISOString(), frequency);
    setState((s) => applyAddSchedule(s, name, amount, accountId, frequency, next));
    track("schedule", `Scheduled payment added: ${name.trim()} (${frequency})`);
    return { ok: true };
  }, []);

  const receiveMoney = useCallback((fromName: string, accountId: string, amount: number): Result => {
    const s = stateRef.current;
    const from = fromName.trim();
    if (!from) return { ok: false, error: "Choose who the money is from." };
    if (!s.accounts.some((a) => a.id === accountId)) return { ok: false, error: "Choose an account." };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter an amount greater than zero." };
    const value = round2(amount);
    const txn: Transaction = {
      id: uid(),
      date: new Date().toISOString(),
      description: `Payment from ${from}`,
      category: "Payments",
      amount: value,
      accountId,
    };
    setState((cur) => ({
      ...cur,
      accounts: cur.accounts.map((a) => (a.id === accountId ? { ...a, balance: round2(a.balance + value) } : a)),
      transactions: [txn, ...cur.transactions],
    }));
    track("payment", `Received ${formatMoney(value)} from ${from}`);
    notify("in", "Money received", `${amountText(value)} from ${from}`);
    return { ok: true };
  }, []);

  const addFunds = useCallback((req: FundingRequest): Result => {
    const s = stateRef.current;
    const label = FUNDING_LABEL[req.method];
    const check = validateFunding(s, req);
    if (!check.ok) {
      track("payment_rejected", `Add funds with ${label}: ${check.error}`);
      return check;
    }
    const next = applyFunding(s, req);
    const added = next.transactions[0]!;
    setState(next);
    if (added.status === "pending") {
      track("payment", `Top-up pending: ${formatMoney(added.amount)} via ${label}`);
      notify("pending", "Top-up pending", `${amountText(added.amount)} from ${label}. It becomes available after it settles.`);
    } else {
      track("payment", `Received ${formatMoney(added.amount)} via ${label}`);
      notify("in", "Funds added", `${amountText(added.amount)} via ${label}`);
    }
    return { ok: true };
  }, []);

  // Pending top-ups become available when their settle time comes, even if the page was closed in between.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = stateRef.current;
      if (s.transactions.some((t) => t.status === "pending")) {
        const { state: next, settled } = settleDue(s, new Date());
        if (settled.length > 0) {
          setState(next);
          for (const t of settled) {
            track("payment", `Received ${formatMoney(t.amount)} (${t.description}) · now available`);
            notify("in", "Funds available", `${amountText(t.amount)} · ${t.description}`);
          }
        }
      }
      if (s.cryptoDeposits.length > 0) {
        const { state: next, settled } = settleCryptoDeposits(stateRef.current, new Date());
        if (settled.length > 0) {
          setState(next);
          for (const d of settled) {
            track("deposit", `Received ${d.quantity} ${d.symbol} · now in your wallet`);
            notify("in", "Crypto received", `${d.quantity} ${d.symbol} is now in your wallet.`);
          }
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const receiveCrypto = useCallback((symbol: string, quantity: number, from: string): Result => {
    const s = stateRef.current;
    const check = validateDeposit(s, symbol, quantity, from);
    if (!check.ok) {
      track("payment_rejected", `Crypto deposit ${symbol}: ${check.error}`);
      return check;
    }
    setState((cur) => applyDeposit(cur, symbol, quantity, from));
    track("deposit", `Deposit of ${quantity} ${symbol} waiting for confirmations`);
    notify("pending", "Crypto deposit pending", `${quantity} ${symbol} from ${from.slice(0, 8)}… is waiting for confirmations.`);
    return { ok: true };
  }, []);

  const addCard = useCallback((cfg: NewCardConfig): Result => {
    const check = validateNewCard(stateRef.current, cfg);
    if (!check.ok) return check;
    // Generated for the demo. Real card numbers are issued by the bank, never typed in here.
    const last4 = String(Math.floor(1000 + Math.random() * 9000));
    setState((s) => applyAddCard(s, cfg, last4));
    track("card", `${cfg.label.trim()} added (${cfg.network} ${cfg.type})`);
    return { ok: true };
  }, []);

  const openAccount = useCallback((cfg: NewAccountConfig): Result => {
    const check = validateNewAccount(stateRef.current, cfg);
    if (!check.ok) return check;
    setState((s) => applyNewAccount(s, cfg));
    const label = cfg.kind === "savings" ? "savings account" : cfg.kind === "currency" ? `${cfg.currency} account` : "joint account";
    track("account", `Opened a ${label}`);
    return { ok: true };
  }, []);

  const investBuy = useCallback((accountId: string, symbol: string, usd: number): Result => {
    const check = validateInvestBuy(stateRef.current, accountId, symbol, usd);
    if (!check.ok) {
      track("trade_rejected", `Invest ${symbol}: ${check.error}`);
      return check;
    }
    setState((s) => applyInvestBuy(s, accountId, symbol, usd));
    track("trade", `Bought ${symbol} for ${formatMoney(round2(usd))} (simulated)`);
    return { ok: true };
  }, []);

  const investSell = useCallback((accountId: string, symbol: string, units: number): Result => {
    const check = validateInvestSell(stateRef.current, accountId, symbol, units);
    if (!check.ok) {
      track("trade_rejected", `Sell ${symbol}: ${check.error}`);
      return check;
    }
    setState((s) => applyInvestSell(s, accountId, symbol, units));
    track("trade", `Sold ${units} ${symbol} (simulated)`);
    return { ok: true };
  }, []);

  const setRoundUp = useCallback((on: boolean) => {
    setState((s) => applyRoundUpToggle(s, on));
    track("account", `Round-up ${on ? "on" : "off"}`);
  }, []);

  const removeCard = useCallback((cardId: string): Result => {
    const card = stateRef.current.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, error: "This card no longer exists." };
    setState((s) => applyRemoveCard(s, cardId));
    track("card", `${card.label} deleted`);
    return { ok: true };
  }, []);

  const startNewAccount = useCallback(() => {
    setState(createEmptyState());
    track("settings", "New account opened with a zero balance");
  }, []);

  const setTransactionCategory = useCallback((txnId: string, category: string): Result => {
    const clean = category.trim();
    if (!clean || clean.length > 30) return { ok: false, error: "Choose a category (up to 30 characters)." };
    const txn = stateRef.current.transactions.find((t) => t.id === txnId);
    if (!txn) return { ok: false, error: "This transaction no longer exists." };
    setState((s) => applyTransactionCategory(s, txnId, clean));
    track("transaction", `"${txn.description}" moved to ${clean}`);
    return { ok: true };
  }, []);

  const blockNextPayment = useCallback((name: string) => {
    setState((s) => applyBlockNext(s, name));
    track("schedule", `Next payment to ${name} blocked`);
  }, []);

  const unblockNextPayment = useCallback((name: string) => {
    setState((s) => applyUnblockNext(s, name));
    track("schedule", `Block removed for ${name}`);
  }, []);

  const payScheduleNow = useCallback((scheduleId: string): Result => {
    const s = stateRef.current;
    const blocked = s.schedules.find((x) => x.id === scheduleId);
    if (blocked && s.blockedNext.includes(blocked.name)) {
      // The block is used up by this payment.
      setState((cur) => applyConsumeBlock(cur, blocked.name));
      return blockedPayment(blocked.name);
    }
    const check = validateSchedulePayment(s, scheduleId);
    if (!check.ok) {
      track("payment_rejected", `Scheduled payment: ${check.error}`);
      return check;
    }
    const schedule = s.schedules.find((x) => x.id === scheduleId)!;
    setState((cur) => applyRoundUps(applySchedulePayment(cur, scheduleId), [{ accountId: schedule.accountId, amount: schedule.amount }]).state);
    track("payment", `Paid ${schedule.name} (${formatMoney(schedule.amount)})`);
    notify("out", "Bill paid", `${amountText(schedule.amount)} for ${schedule.name}`);
    return { ok: true };
  }, []);

  const removeSchedule = useCallback((scheduleId: string) => {
    const schedule = stateRef.current.schedules.find((x) => x.id === scheduleId);
    if (!schedule) return;
    setState((s) => applyRemoveSchedule(s, scheduleId));
    track("schedule", `Scheduled payment removed: ${schedule.name}`);
  }, []);

  const setCardOnline = useCallback((cardId: string, on: boolean) => {
    const card = stateRef.current.cards.find((c) => c.id === cardId);
    setState((s) => applyCardOnline(s, cardId, on));
    if (card) track("card", `${card.label} online payments ${on ? "on" : "off"}`);
  }, []);

  const setCardLimit = useCallback((cardId: string, limit: number): Result => {
    const check = validateSpendLimit(limit);
    if (!check.ok) return check;
    const card = stateRef.current.cards.find((c) => c.id === cardId);
    setState((s) => applyCardLimit(s, cardId, limit));
    if (card) track("card", `${card.label} monthly limit ${limit > 0 ? formatMoney(round2(limit)) : "removed"}`);
    return { ok: true };
  }, []);

  const reportCardLost = useCallback((cardId: string) => {
    const card = stateRef.current.cards.find((c) => c.id === cardId);
    setState((s) => applyReportLost(s, cardId));
    if (card) track("card", `${card.label} reported lost and frozen`);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      transfer,
      toggleCard,
      setLimit,
      deleteBudget,
      addBudget,
      executeTrade,
      sendMessage,
      sendPayment,
      addContact,
      requestMoney,
      respondToRequest,
      payRequest,
      setPlan,
      resetDemo,
      addGoal,
      contributeGoal,
      withdrawGoal,
      deleteGoal,
      addSchedule,
      payScheduleNow,
      removeSchedule,
      setCardOnline,
      setCardLimit,
      reportCardLost,
      setTransactionCategory,
      blockNextPayment,
      unblockNextPayment,
      receiveMoney,
      addFunds,
      receiveCrypto,
      addCard,
      removeCard,
      openAccount,
      investBuy,
      investSell,
      setRoundUp,
      startNewAccount,
    }),
    [investBuy, investSell, setRoundUp, openAccount, addCard, removeCard, addFunds, receiveCrypto, startNewAccount, receiveMoney, state,transfer, toggleCard, setLimit, deleteBudget, addBudget, executeTrade, sendMessage, sendPayment, addContact, requestMoney, respondToRequest, payRequest, setPlan, resetDemo, addGoal, contributeGoal, withdrawGoal, deleteGoal, addSchedule, payScheduleNow, removeSchedule, setCardOnline, setCardLimit, reportCardLost, setTransactionCategory, blockNextPayment, unblockNextPayment],
  );
  return <BankContext.Provider value={value}>{children}</BankContext.Provider>;
}

export function useBank() {
  const ctx = useContext(BankContext);
  if (!ctx) throw new Error("useBank must be used inside BankProvider");
  return ctx;
}
