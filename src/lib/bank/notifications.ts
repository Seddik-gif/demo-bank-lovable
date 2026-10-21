// In-app notifications: money received, money sent, and payments that were blocked.
// Kept in memory for this visit only.
import { useSyncExternalStore } from "react";
import { formatMoney } from "./data";
import { playSound, soundForNotice } from "./sounds";

export type NoticeTone = "in" | "out" | "blocked" | "pending";

export interface Notice {
  id: number;
  time: number;
  tone: NoticeTone;
  title: string;
  body: string;
  read: boolean;
}

interface Snapshot {
  items: Notice[];
  /** The newest notice, shown as a short pop-up for a few seconds. */
  toast: Notice | null;
}

const MAX_ITEMS = 50;
const TOAST_MS = 6000;

let snap: Snapshot = { items: [], toast: null };
let nextId = 1;
let toastTimer: number | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Amounts follow the Hide balances setting, like the rest of the app. */
export function amountText(value: number): string {
  const hidden = typeof document !== "undefined" && document.documentElement.hasAttribute("data-hide-balances");
  return hidden ? "**********$" : formatMoney(value);
}

export function notify(tone: NoticeTone, title: string, body: string): void {
  const n: Notice = { id: nextId++, time: Date.now(), tone, title, body, read: false };
  const sound = soundForNotice(tone);
  if (sound) playSound(sound);
  snap = { items: [n, ...snap.items].slice(0, MAX_ITEMS), toast: n };
  emit();
  if (typeof window !== "undefined") {
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      snap = { ...snap, toast: null };
      emit();
    }, TOAST_MS);
  }
}

export function markAllRead(): void {
  if (snap.items.every((n) => n.read)) return;
  snap = { ...snap, items: snap.items.map((n) => ({ ...n, read: true })) };
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snap;

export function useNotices(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
