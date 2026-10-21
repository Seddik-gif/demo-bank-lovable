// Crypto wallet: receiving crypto from another wallet, and checks for selling what you hold.
// Modelled on how real wallets behave. Nothing real moves.
import { uid, type BankState, type CryptoDeposit, type Result } from "./data";
import { MARKET_BASES } from "./market";

export const CRYPTO_ASSETS: readonly string[] = MARKET_BASES;

/** Network each asset is received on. Sending on any other network can lose the funds. */
export const NETWORK: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB Smart Chain",
  SOL: "Solana",
  XRP: "XRP Ledger",
  ADA: "Cardano",
};

/** Blocks needed before a deposit is credited. Demo: one short wait stands in for them. */
export const CONFIRMATIONS: Record<string, number> = { BTC: 3, ETH: 12, BNB: 15, SOL: 32, XRP: 1, ADA: 15 };
export const DEPOSIT_MS = 90_000;

/** Your deposit address for an asset. A fixed demo address per asset, so the same one is shown each time. */
export function receiveAddress(symbol: string): string {
  // A seeded generator, so the same asset always gets the same demo address.
  let seed = 2166136261;
  for (const ch of symbol) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 16;
  };
  const pick = (alphabet: string, length: number) => Array.from({ length }, () => alphabet[next() % alphabet.length]).join("");
  if (symbol === "BTC") return "bc1q" + pick("qpzry9x8gf2tvdw0s3jn54khce6mua7l", 38);
  if (symbol === "ETH" || symbol === "BNB") return "0x" + pick("0123456789abcdef", 40);
  return "DEMO" + pick("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 32);
}

/** A rough format check for a sender address. It doesn't prove the address exists. */
export function isValidSenderAddress(symbol: string, address: string): boolean {
  const a = address.trim();
  if (symbol === "BTC") return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a);
  if (symbol === "ETH" || symbol === "BNB") return /^0x[a-fA-F0-9]{40}$/.test(a);
  return /^[A-Za-z0-9]{25,64}$/.test(a);
}

export function validateDeposit(state: BankState, symbol: string, quantity: number, from: string): Result {
  if (!CRYPTO_ASSETS.includes(symbol)) return { ok: false, error: "Choose an asset to receive." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (quantity > 1_000_000) return { ok: false, error: "That amount is too large for one deposit." };
  if (!isValidSenderAddress(symbol, from))
    return { ok: false, error: `That doesn't look like a ${symbol} address on ${NETWORK[symbol]}. Check it and try again.` };
  if (state.cryptoDeposits.some((d) => d.from.toLowerCase() === from.trim().toLowerCase() && d.symbol === symbol))
    return { ok: false, error: "A deposit from this address is already waiting for confirmations." };
  return { ok: true };
}

export function applyDeposit(state: BankState, symbol: string, quantity: number, from: string, now = new Date()): BankState {
  const deposit: CryptoDeposit = {
    id: uid(),
    symbol,
    quantity: Math.round(quantity * 1e8) / 1e8,
    from: from.trim(),
    settleAt: new Date(now.getTime() + DEPOSIT_MS).toISOString(),
  };
  return { ...state, cryptoDeposits: [deposit, ...state.cryptoDeposits] };
}

/** Credits deposits whose confirmations are done. */
export function settleCryptoDeposits(state: BankState, now = new Date()): { state: BankState; settled: CryptoDeposit[] } {
  const due = state.cryptoDeposits.filter((d) => Date.parse(d.settleAt) <= now.getTime());
  if (due.length === 0) return { state, settled: [] };
  const crypto = { ...state.crypto };
  for (const d of due) crypto[d.symbol] = Math.round(((crypto[d.symbol] ?? 0) + d.quantity) * 1e8) / 1e8;
  const ids = new Set(due.map((d) => d.id));
  return { settled: due, state: { ...state, crypto, cryptoDeposits: state.cryptoDeposits.filter((d) => !ids.has(d.id)) } };
}

/** How much of an asset is held. */
export function heldOf(crypto: Record<string, number>, symbol: string): number {
  return Math.round((crypto[symbol] ?? 0) * 1e8) / 1e8;
}

/** You can only sell what you hold. */
export function validateSale(crypto: Record<string, number>, symbol: string, quantity: number): Result {
  const held = heldOf(crypto, symbol);
  if (held <= 0) return { ok: false, error: `You don't hold any ${symbol}.` };
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  if (quantity > held + 1e-12) return { ok: false, error: `You can't sell more than you hold: you have ${held} ${symbol}.` };
  return { ok: true };
}
