// App settings, saved on this device. Visual settings are applied to <html> attributes
// (see styles.css); the number format is passed to the money formatter in data.ts.

import { useSyncExternalStore } from "react";
import { setMoneyFormat } from "./data";
import { CURRENCIES, type Currency } from "./fx";

export interface Settings {
  language: "en" | "fr";
  numberFormat: "us" | "eu";
  currency: Currency;
  hideBalances: boolean;
  reduceMotion: boolean;
  autoLockMinutes: 0 | 1 | 5 | 15;
  defaultAccountId: string;
  confirmPayments: boolean;
  requestsFrom: "everyone" | "contacts";
  confirmTrades: boolean;
  defaultOrderUsd: number; // 0 = start empty
  notify: { payments: boolean; requests: boolean; trades: boolean; news: boolean };
  biometricUnlock: boolean;
  sounds: boolean;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  biometricUnlock: true,
  sounds: true,
  haptics: true,
  language: "en",
  numberFormat: "us",
  currency: "EUR",
  hideBalances: false,
  reduceMotion: false,
  autoLockMinutes: 0,
  defaultAccountId: "main",
  confirmPayments: false,
  requestsFrom: "everyone",
  confirmTrades: true,
  defaultOrderUsd: 0,
  notify: { payments: true, requests: true, trades: true, news: false },
};

const KEY = "demo-bank:settings";

function load(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw) as Partial<Settings>;
    const d = DEFAULT_SETTINGS;
    return {
      language: p.language === "fr" ? "fr" : "en",
      numberFormat: p.numberFormat === "eu" ? "eu" : "us",
      currency: (CURRENCIES as readonly string[]).includes(p.currency as string) ? (p.currency as Currency) : d.currency,
      hideBalances: typeof p.hideBalances === "boolean" ? p.hideBalances : d.hideBalances,
      reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : d.reduceMotion,
      autoLockMinutes: ([0, 1, 5, 15] as const).includes(p.autoLockMinutes as never) ? (p.autoLockMinutes as Settings["autoLockMinutes"]) : d.autoLockMinutes,
      defaultAccountId: typeof p.defaultAccountId === "string" ? p.defaultAccountId : d.defaultAccountId,
      confirmPayments: typeof p.confirmPayments === "boolean" ? p.confirmPayments : d.confirmPayments,
      requestsFrom: p.requestsFrom === "contacts" ? "contacts" : "everyone",
      confirmTrades: typeof p.confirmTrades === "boolean" ? p.confirmTrades : d.confirmTrades,
      defaultOrderUsd: typeof p.defaultOrderUsd === "number" && p.defaultOrderUsd >= 0 ? p.defaultOrderUsd : d.defaultOrderUsd,
      biometricUnlock: typeof p.biometricUnlock === "boolean" ? p.biometricUnlock : d.biometricUnlock,
      sounds: typeof p.sounds === "boolean" ? p.sounds : d.sounds,
      haptics: typeof p.haptics === "boolean" ? p.haptics : d.haptics,
      notify: {
        payments: typeof p.notify?.payments === "boolean" ? p.notify.payments : d.notify.payments,
        requests: typeof p.notify?.requests === "boolean" ? p.notify.requests : d.notify.requests,
        trades: typeof p.notify?.trades === "boolean" ? p.notify.trades : d.notify.trades,
        news: typeof p.notify?.news === "boolean" ? p.notify.news : d.notify.news,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let current: Settings = DEFAULT_SETTINGS;
const listeners = new Set<() => void>();

function applyToPage(s: Settings) {
  const root = document.documentElement;
  root.lang = s.language;
  setMoneyFormat(s.numberFormat === "eu" ? "de-DE" : "en-US", s.currency);
  if (s.reduceMotion) root.setAttribute("data-motion", "reduce");
  else root.removeAttribute("data-motion");
  if (s.hideBalances) root.setAttribute("data-hide-balances", "");
  else root.removeAttribute("data-hide-balances");
}

/** Loads the saved settings and applies them. Runs on import, so the first render already uses them. */
export function initSettings(): void {
  current = load();
  applyToPage(current);
  listeners.forEach((l) => l());
}
if (typeof window !== "undefined") initSettings();

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch, notify: patch.notify ? { ...current.notify, ...patch.notify } : current.notify };
  applyToPage(current);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage blocked: settings still apply for this visit.
  }
  listeners.forEach((l) => l());
}

export function resetSettings(): void {
  updateSettings(DEFAULT_SETTINGS);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => current;

/** Read by the sound effects, which run outside React. */
export function soundsEnabled(): boolean {
  return current.sounds;
}

/** Read by the haptics, which run outside React. */
export function hapticsEnabled(): boolean {
  return current.haptics;
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
