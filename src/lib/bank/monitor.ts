import { useSyncExternalStore } from "react";
import { playSound, soundForEvent } from "./sounds";

export type EventType =
  | "login"
  | "login_failed"
  | "logout"
  | "page_view"
  | "transfer"
  | "transfer_rejected"
  | "card"
  | "budget"
  | "trade"
  | "trade_rejected"
  | "payment"
  | "payment_rejected"
  | "message"
  | "contact"
  | "request"
  | "request_update"
  | "plan"
  | "register"
  | "goal"
  | "schedule"
  | "transaction"
  | "deposit"
  | "account"
  | "settings"
  | "error";

export const EVENT_LABELS: Record<EventType, string> = {
  login: "Login",
  login_failed: "Failed login",
  logout: "Sign-out",
  page_view: "Page view",
  transfer: "Transfer",
  transfer_rejected: "Rejected transfer",
  card: "Card change",
  budget: "Budget change",
  trade: "Simulated trade",
  trade_rejected: "Rejected trade",
  payment: "Payment",
  payment_rejected: "Rejected payment",
  message: "Message",
  contact: "Contact",
  request: "Money request",
  request_update: "Request update",
  plan: "Plan",
  register: "Sign-up",
  goal: "Savings goal",
  schedule: "Scheduled payment",
  transaction: "Transaction",
  deposit: "Crypto deposit",
  account: "Account",
  settings: "Settings",
  error: "Error",
};

export interface MonitorEvent {
  id: number;
  type: EventType;
  message: string;
  time: number;
}

const MAX = 500;
const EMPTY: MonitorEvent[] = [];
let events: MonitorEvent[] = EMPTY;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Records an event. Never pass secrets such as passwords. */
export function track(type: EventType, message: string) {
  events = [{ id: nextId++, type, message, time: Date.now() }, ...events].slice(0, MAX);
  emit();
  const sound = soundForEvent(type, message);
  if (sound) playSound(sound);
}

export function clearLog() {
  events = EMPTY;
  emit();
}

export function useMonitorEvents() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => events,
    () => EMPTY,
  );
}
