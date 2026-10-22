// Live stock prices for the Invest page.
//
// Where the prices come from:
// - With a Finnhub API key (VITE_FINNHUB_API_KEY in .env.local), real US quotes are read every 15 seconds.
//   Finnhub's free plan allows about 60 calls a minute; six stocks every 15 seconds stays well inside that.
// - Without a key, prices move on a simulated feed. The screen says which one is in use.
//
// Trades are always simulated: no real money or shares are bought or sold.
import { useSyncExternalStore } from "react";

export interface StockInfo {
  symbol: string;
  name: string;
  /** Starting price for the simulated feed, and the fallback when no quote has arrived yet. */
  basePrice: number;
}

export const STOCKS: StockInfo[] = [
  { symbol: "AAPL", name: "Apple", basePrice: 230 },
  { symbol: "MSFT", name: "Microsoft", basePrice: 420 },
  { symbol: "NVDA", name: "NVIDIA", basePrice: 180 },
  { symbol: "AMZN", name: "Amazon", basePrice: 200 },
  { symbol: "GOOGL", name: "Alphabet", basePrice: 170 },
  { symbol: "TSLA", name: "Tesla", basePrice: 250 },
];

export interface StockQuote {
  symbol: string;
  price: number;
  /** Change since the previous close, in percent. */
  changePct: number;
  /** When the quote was last updated (ms since 1970). */
  at: number;
  source: "live" | "simulated";
}

const POLL_MS = 15_000;
const SIM_MS = 2_000;

/** The Finnhub key, if one is set. Read at build time from .env.local. */
export function finnhubKey(): string | null {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const key = env?.["VITE_FINNHUB_API_KEY"]?.trim();
  return key ? key : null;
}

/** A price after one step of the simulated feed: a small random move, never below half the start. */
export function simulatedNext(price: number, base: number, random: () => number = Math.random): number {
  const move = (random() - 0.5) * 0.004 * price; // up to 0.2% either way per step
  const next = price + move;
  return Math.round(Math.max(base * 0.5, next) * 100) / 100;
}

/** The change in percent from a previous close to a price. */
export function changeOf(price: number, previousClose: number): number {
  if (!previousClose) return 0;
  return Math.round(((price - previousClose) / previousClose) * 10000) / 100;
}

// ---- The shared store the Invest page reads ----------------------------------------

let quotes: Record<string, StockQuote> = Object.fromEntries(
  STOCKS.map((s) => [s.symbol, { symbol: s.symbol, price: s.basePrice, changePct: 0, at: Date.now(), source: "simulated" as const }]),
);
const previousClose: Record<string, number> = Object.fromEntries(STOCKS.map((s) => [s.symbol, s.basePrice]));
const listeners = new Set<() => void>();
let users = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function publish(next: Record<string, StockQuote>) {
  quotes = next;
  listeners.forEach((l) => l());
}

/** Reads one Finnhub quote. Returns null if the call fails, so the last known price stays on screen. */
async function fetchFinnhub(symbol: string, key: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { c?: number; pc?: number };
    if (!body.c || body.c <= 0) return null;
    if (body.pc && body.pc > 0) previousClose[symbol] = body.pc;
    return { symbol, price: body.c, changePct: changeOf(body.c, previousClose[symbol] ?? body.c), at: Date.now(), source: "live" };
  } catch {
    return null;
  }
}

async function tickLive(key: string) {
  const results = await Promise.all(STOCKS.map((s) => fetchFinnhub(s.symbol, key)));
  const next = { ...quotes };
  results.forEach((q) => {
    if (q) next[q.symbol] = q;
  });
  publish(next);
}

function tickSimulated() {
  const next: Record<string, StockQuote> = {};
  for (const s of STOCKS) {
    const prev = quotes[s.symbol]!;
    const price = simulatedNext(prev.price, s.basePrice);
    next[s.symbol] = { symbol: s.symbol, price, changePct: changeOf(price, previousClose[s.symbol] ?? s.basePrice), at: Date.now(), source: "simulated" };
  }
  publish(next);
}

/** The Invest page calls this while it is open. The feed stops when the last page closes. */
export function acquireStocks(): () => void {
  users += 1;
  if (users === 1) {
    const key = finnhubKey();
    if (key) {
      void tickLive(key);
      timer = setInterval(() => void tickLive(key), POLL_MS);
    } else {
      timer = setInterval(tickSimulated, SIM_MS);
    }
  }
  return () => {
    users = Math.max(0, users - 1);
    if (users === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Whether the prices shown are real quotes or the simulated feed. */
export function feedSource(): "live" | "simulated" {
  return finnhubKey() ? "live" : "simulated";
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => quotes;

/** The latest quote for every stock, keyed by symbol. */
export function useStockQuotes(): Record<string, StockQuote> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
