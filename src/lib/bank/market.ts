// Live crypto market data from Binance's public API (no key or account needed).
// Only public read endpoints are used. Nothing here sends orders to Binance:
// buying and selling in this app is a simulation against the demo bank balance.

import { useSyncExternalStore } from "react";

export const MARKET_BASES = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA"] as const;
export const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ether",
  SOL: "Solana",
  BNB: "BNB",
  XRP: "XRP",
  ADA: "Cardano",
};

const BASE_URL = "https://api.binance.com/api/v3";
export const REFRESH_MS = 10_000;
export const DEPTH_REFRESH_MS = 3_000;
export const FEE_RATE = 0.001; // 0.1% per trade, simulated

export interface MarketTicker {
  symbol: string; // e.g. BTCUSDT
  base: string; // e.g. BTC
  price: number; // USD
  change24h: number; // percent
  volumeUsd: number; // 24h quote volume in USD
  high: number;
  low: number;
}

export interface Level {
  price: number;
  qty: number; // amount of the base asset
}

export interface OrderBook {
  bids: Level[]; // best (highest) first
  asks: Level[]; // best (lowest) first
}

export interface Candle {
  time: number; // open time, ms
  open: number;
  high: number;
  low: number;
  close: number;
}

interface RawTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal: signal ?? null, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Market data unavailable (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export async function fetchMarket(signal?: AbortSignal): Promise<MarketTicker[]> {
  const pairs = MARKET_BASES.map((b) => `${b}USDT`);
  const rows = await getJson<RawTicker[]>(
    `${BASE_URL}/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`,
    signal,
  );
  return rows.map((r) => ({
    symbol: r.symbol,
    base: r.symbol.replace(/USDT$/, ""),
    price: Number(r.lastPrice),
    change24h: Number(r.priceChangePercent),
    volumeUsd: Number(r.quoteVolume),
    high: Number(r.highPrice),
    low: Number(r.lowPrice),
  }));
}

/** Level 2 order book: the best 20 bid and ask levels. */
export async function fetchOrderBook(base: string, signal?: AbortSignal): Promise<OrderBook> {
  const raw = await getJson<{ bids: [string, string][]; asks: [string, string][] }>(
    `${BASE_URL}/depth?symbol=${base}USDT&limit=20`,
    signal,
  );
  const toLevel = ([p, q]: [string, string]): Level => ({ price: Number(p), qty: Number(q) });
  return { bids: raw.bids.map(toLevel), asks: raw.asks.map(toLevel) };
}

export type Interval = "15m" | "1h" | "1d";
const INTERVAL_LIMIT: Record<Interval, number> = { "15m": 96, "1h": 168, "1d": 90 };

/** Candles for the chart. Each row is [openTime, open, high, low, close, ...]. */
export async function fetchCandles(base: string, interval: Interval, signal?: AbortSignal): Promise<Candle[]> {
  const rows = await getJson<[number, string, string, string, string][]>(
    `${BASE_URL}/klines?symbol=${base}USDT&interval=${interval}&limit=${INTERVAL_LIMIT[interval]}`,
    signal,
  );
  return rows.map(([time, open, high, low, close]) => ({
    time,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
  }));
}

export interface Fill {
  qty: number; // base asset bought or sold
  quote: number; // USD before fees
  avgPrice: number;
  complete: boolean; // false when the book lacks enough liquidity
}

/** Buy with a USD amount by walking up the asks. */
export function simulateBuy(asks: Level[], usd: number): Fill {
  let remaining = usd;
  let qty = 0;
  let quote = 0;
  for (const level of asks) {
    if (remaining <= 0) break;
    const cost = level.price * level.qty;
    const take = Math.min(remaining, cost);
    quote += take;
    qty += take / level.price;
    remaining -= take;
  }
  return { qty, quote, avgPrice: qty > 0 ? quote / qty : 0, complete: remaining <= 1e-9 };
}

/** Sell an amount of the asset by walking down the bids. */
export function simulateSell(bids: Level[], amount: number): Fill {
  let remaining = amount;
  let qty = 0;
  let quote = 0;
  for (const level of bids) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, level.qty);
    quote += take * level.price;
    qty += take;
    remaining -= take;
  }
  return { qty, quote, avgPrice: qty > 0 ? quote / qty : 0, complete: remaining <= 1e-12 };
}

// ---- Shared price feed -------------------------------------------------------
// One polling loop serves every screen, however many components subscribe.

interface MarketSnapshot {
  tickers: MarketTicker[];
  error: string;
  updatedAt: number | null;
}

let snapshot: MarketSnapshot = { tickers: [], error: "", updatedAt: null };
const listeners = new Set<() => void>();
let users = 0;
let timer = 0;
let controller: AbortController | null = null;

const emit = () => listeners.forEach((l) => l());

async function refresh() {
  if (document.hidden) return;
  const signal = controller?.signal;
  try {
    const tickers = await fetchMarket(signal);
    snapshot = { tickers, error: "", updatedAt: Date.now() };
  } catch (e) {
    if (signal?.aborted) return;
    snapshot = { ...snapshot, error: e instanceof Error ? e.message : "Market data unavailable." };
  }
  emit();
}

/** Starts the shared feed for a component. Call the returned function to stop. */
export function acquireMarket(): () => void {
  users += 1;
  if (users === 1) {
    controller = new AbortController();
    refresh();
    timer = window.setInterval(refresh, REFRESH_MS);
  }
  return () => {
    users -= 1;
    if (users === 0) {
      controller?.abort();
      controller = null;
      window.clearInterval(timer);
    }
  };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => snapshot;

export function useMarket(): MarketSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
