// Exchange rates for the money shown in the app. The money is kept in euros; these rates
// turn it into the currency the customer chooses (Settings > Currency).
//
// Live rates come from Frankfurter (api.frankfurter.dev), which publishes the European Central
// Bank's daily reference rates. No key is needed. Until the first rates load, or if the request
// fails, the app uses fallback rates and says so on the Settings screen.

import { useSyncExternalStore } from "react";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Currencies a customer can open a currency account in (everything but the euro). */
export const FOREIGN_CURRENCIES = CURRENCIES.filter((c): c is Exclude<Currency, "EUR"> => c !== "EUR");

export const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: "Euro",
  USD: "US dollar",
  GBP: "Pound sterling",
  CHF: "Swiss franc",
};

/** Units of each currency per one euro, used until live rates load. */
export const FALLBACK_RATES: Record<Currency, number> = { EUR: 1, USD: 1.09, GBP: 0.86, CHF: 0.95 };

const RATES_URL = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,CHF";
const REFRESH_MS = 60 * 60 * 1000; // hourly

export interface RateSnapshot {
  rates: Record<Currency, number>;
  source: "live" | "fallback";
  /** The date the rates are for, as published (YYYY-MM-DD), when they are live. */
  date: string | null;
}

let snapshot: RateSnapshot = { rates: FALLBACK_RATES, source: "fallback", date: null };
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;

/** The current rates. Components re-render when they change. */
export function useRates(): RateSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Units of `currency` per one euro. */
export function ratePerEur(currency: Currency): number {
  return snapshot.rates[currency];
}

/** Turns an amount in euros into `currency`, at the current rate. */
export function fromEur(amount: number, currency: Currency): number {
  return amount * ratePerEur(currency);
}

/** Turns an amount in `currency` into euros, at the current rate. */
export function toEur(amount: number, currency: Currency): number {
  return amount / ratePerEur(currency);
}

/** Euros per one US dollar, for market prices quoted in dollars. */
export function usdToEur(): number {
  return 1 / ratePerEur("USD");
}

/** Reads the published rates. Returns null if the response is not usable. */
export function parseRates(body: unknown): RateSnapshot | null {
  if (typeof body !== "object" || body === null) return null;
  const { rates, date } = body as { rates?: Record<string, unknown>; date?: unknown };
  if (typeof rates !== "object" || rates === null) return null;
  const out: Record<string, number> = { EUR: 1 };
  for (const c of FOREIGN_CURRENCIES) {
    const v = rates[c];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
    out[c] = v;
  }
  return { rates: out as Record<Currency, number>, source: "live", date: typeof date === "string" ? date : null };
}

/** Fetches the live rates. If the request fails, the last good rates stay in use. */
export async function refreshRates(signal?: AbortSignal): Promise<void> {
  try {
    const res = await fetch(RATES_URL, { signal: signal ?? null, headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const next = parseRates(await res.json());
    if (!next) return;
    snapshot = next;
    listeners.forEach((l) => l());
  } catch {
    // Offline or blocked: keep the rates already in use.
  }
}

let users = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let controller: AbortController | undefined;

/** Keeps the rates fresh while something on screen needs them. Returns a function that stops it. */
export function acquireRates(): () => void {
  users += 1;
  if (users === 1) {
    controller = new AbortController();
    void refreshRates(controller.signal);
    timer = setInterval(() => void refreshRates(), REFRESH_MS);
  }
  return () => {
    users -= 1;
    if (users === 0) {
      clearInterval(timer);
      controller?.abort();
    }
  };
}
