import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDefaultState } from "../data";
import { loadState, saveState } from "../storage";

const KEY = "demo-bank:v1";

/** A small stand-in for the browser's localStorage, so the tests run without a browser. */
function fakeStorage(failures: { get?: boolean; set?: boolean } = {}) {
  const items = new Map<string, string>();
  return {
    items,
    storage: {
      getItem: (k: string) => {
        if (failures.get) throw new Error("storage blocked");
        return items.get(k) ?? null;
      },
      setItem: (k: string, v: string) => {
        if (failures.set) throw new Error("storage full");
        items.set(k, v);
      },
    },
  };
}

function useStorage(storage: unknown) {
  (globalThis as unknown as { window: { localStorage: unknown } }).window = { localStorage: storage };
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("loading saved data", () => {
  beforeEach(() => useStorage(fakeStorage().storage));

  it("starts from the demo data when nothing is saved", () => {
    const loaded = loadState();
    expect(loaded.accounts.map((a) => a.id)).toEqual(createDefaultState().accounts.map((a) => a.id));
  });

  it("gives back what was saved", () => {
    const { storage } = fakeStorage();
    useStorage(storage);
    const state = createDefaultState();
    saveState({ ...state, accounts: state.accounts.map((a) => (a.id === "main" ? { ...a, balance: 77 } : a)) });
    expect(loadState().accounts.find((a) => a.id === "main")?.balance).toBe(77);
  });

  it("falls back to the demo data when the saved text is not valid JSON", () => {
    const { items, storage } = fakeStorage();
    items.set(KEY, "{not json");
    useStorage(storage);
    expect(loadState().accounts.length).toBe(createDefaultState().accounts.length);
  });

  it("falls back to the demo data when the saved value is not an object", () => {
    const { items, storage } = fakeStorage();
    items.set(KEY, JSON.stringify([1, 2, 3]));
    useStorage(storage);
    expect(loadState().accounts.length).toBe(createDefaultState().accounts.length);
  });

  it("keeps the demo accounts when the saved accounts have no main account", () => {
    const { items, storage } = fakeStorage();
    items.set(KEY, JSON.stringify({ accounts: [{ id: "savings", name: "Savings", iban: "X", balance: 5 }] }));
    useStorage(storage);
    expect(loadState().accounts.some((a) => a.id === "main")).toBe(true);
  });

  it("replaces a whole list when one entry in it is damaged", () => {
    const { items, storage } = fakeStorage();
    items.set(KEY, JSON.stringify({ transactions: [{ id: "t1", date: "not a date", description: "x", category: "Food", amount: -5, accountId: "main" }] }));
    useStorage(storage);
    expect(loadState().transactions).toEqual(createDefaultState().transactions);
  });

  it("fills in card details that older saves did not have", () => {
    const { items, storage } = fakeStorage();
    const base = createDefaultState();
    const card = { ...base.cards[0]!, number: undefined, expiry: undefined, cvv: undefined };
    items.set(KEY, JSON.stringify({ cards: [card] }));
    useStorage(storage);
    const loaded = loadState().cards[0]!;
    expect(loaded.number).toContain(card.last4);
    expect(loaded.expiry).toBeDefined();
    expect(loaded.cvv).toBeDefined();
  });

  it("falls back to the demo data when browser storage cannot be read", () => {
    useStorage(fakeStorage({ get: true }).storage);
    expect(loadState().accounts.length).toBe(createDefaultState().accounts.length);
  });
});

describe("saving data", () => {
  it("does not crash when browser storage is full", () => {
    useStorage(fakeStorage({ set: true }).storage);
    expect(() => saveState(createDefaultState())).not.toThrow();
  });
});

describe("holding accounts", () => {
  it("the demo profile opens the crypto and investing accounts it holds", () => {
    const state = createDefaultState();
    expect(state.accounts.some((a) => a.kind === "crypto")).toBe(true);
    expect(state.accounts.some((a) => a.kind === "invest")).toBe(true);
  });

  it("an older save with holdings but no account gets the account back", () => {
    const state = createDefaultState();
    const saved = { ...state, accounts: state.accounts.filter((a) => a.kind !== "crypto" && a.kind !== "invest") };
    const { storage, items } = fakeStorage();
    items.set(KEY, JSON.stringify(saved));
    useStorage(storage);
    const loaded = loadState();
    expect(loaded.accounts.some((a) => a.kind === "crypto")).toBe(true);
    expect(loaded.accounts.some((a) => a.kind === "invest")).toBe(true);
  });

  it("no crypto account is added when there are no crypto holdings", () => {
    const state = createDefaultState();
    const saved = { ...state, crypto: {}, accounts: state.accounts.filter((a) => a.kind !== "crypto") };
    const { storage, items } = fakeStorage();
    items.set(KEY, JSON.stringify(saved));
    useStorage(storage);
    expect(loadState().accounts.some((a) => a.kind === "crypto")).toBe(false);
  });
});
