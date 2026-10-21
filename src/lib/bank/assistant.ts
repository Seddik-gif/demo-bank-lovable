// Pip's answers. A small keyword list, not an AI model: it only knows how this demo app works.
import type { SectionId } from "./data";

export interface Answer {
  text: string;
  /** Optional button that opens the section the answer talks about. */
  go?: { id: SectionId; label: string };
}

interface Entry extends Answer {
  keywords: string[];
}

const ENTRIES: Entry[] = [
  {
    keywords: ["send", "pay", "payment", "transfer money", "split"],
    text: "Open Pay, pick a contact, tap Pay, then choose how much to take from each account.",
    go: { id: "payments", label: "Open Pay" },
  },
  {
    keywords: ["request", "ask for money", "ask money"],
    text: "In Pay, open a contact and tap Request. They can pay it or decline it, and you can cancel it.",
    go: { id: "payments", label: "Open Pay" },
  },
  {
    keywords: ["balance", "hide", "show amount", "privacy", "blur"],
    text: "Your balance is at the top of Home. Tap any amount to hide it, and tap again to show it.",
  },
  {
    keywords: ["move money", "between my accounts", "between accounts", "savings", "travel pot"],
    text: "On Home, use Move money between your accounts. Pick From, To and an amount, then tap Transfer.",
  },
  {
    keywords: ["freeze", "unfreeze", "card", "cards"],
    text: "Tap a card on Home or in Cards to freeze it. Tap it again to unfreeze.",
    go: { id: "cards", label: "Open Cards" },
  },
  {
    keywords: ["budget", "limit", "spending limit", "monthly limit"],
    text: "Budgets sets a monthly limit per category. Tap Edit limit on a budget to change it.",
    go: { id: "budgets", label: "Open Budgets" },
  },
  {
    keywords: ["crypto", "bitcoin", "btc", "eth", "buy", "sell", "trade", "trading"],
    text: "Crypto trades are simulated. You buy or sell against a live order book with demo money. Nothing real is sent.",
    go: { id: "crypto", label: "Open Crypto" },
  },
  {
    keywords: ["invest", "investment", "stocks", "holdings"],
    text: "Invest shows your holdings and what they are worth. Trades there are simulated too.",
    go: { id: "invest", label: "Open Invest" },
  },
  {
    keywords: ["plan", "plans", "subscription", "pricing", "price", "upgrade"],
    text: "Tap your photo, then Plans and subscriptions to compare Everyday, Plus, Pro and Private. Nothing is charged in this demo.",
  },
  {
    keywords: ["theme", "colour", "color", "palette", "dark", "light", "look"],
    text: "Tap your photo, then Theme. Pick a palette and it applies straight away.",
  },
  {
    keywords: ["setting", "settings", "auto-lock", "autolock", "lock", "reduce motion", "language", "number format"],
    text: "Tap your photo, then Settings. You can change language, number format, auto-lock, confirmations and more.",
  },
  {
    keywords: ["activity", "transactions", "history", "statement", "export", "csv", "download"],
    text: "Activity lists every transaction. Search or filter by category. You can download a CSV from your profile under Statements.",
    go: { id: "activity", label: "Open Activity" },
  },
  {
    keywords: ["real money", "is it real", "real", "fake", "demo"],
    text: "No, this is a demo with mock data. Payments and trades are simulated, and nothing is charged.",
  },
  {
    keywords: ["passcode", "password", "login", "log in", "sign in", "sign up", "register", "account"],
    text: "Demo login: demo / demo-pass. New accounts are created with Create an account and set a 6-digit passcode.",
  },
  {
    keywords: ["monitor", "log", "events"],
    text: "Monitor shows what happened in the app: sign-ins, payments, trades and settings changes.",
    go: { id: "monitor", label: "Open Monitor" },
  },
  {
    keywords: ["hello", "hi", "hey", "who are you", "pip", "help"],
    text: "I'm Pip, your guide. Ask me how to do something in the app, like sending money or freezing a card.",
  },
];

const FALLBACK: Answer = {
  text: "I'm not sure about that yet. Try asking about payments, cards, budgets, crypto, plans or settings.",
};

/** Finds the entry whose keywords match the question most often. Returns a fallback when nothing matches. */
export function answerQuestion(question: string): Answer {
  const q = ` ${question.toLowerCase().replace(/[?!.,]/g, " ").replace(/\s+/g, " ")} `;
  let best: Entry | null = null;
  let bestScore = 0;
  for (const entry of ENTRIES) {
    const score = entry.keywords.filter((k) => q.includes(` ${k} `) || (k.includes(" ") && q.includes(k))).length;
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  if (!best) return FALLBACK;
  return best.go ? { text: best.text, go: best.go } : { text: best.text };
}

/** Starter questions shown as chips. */
export const SUGGESTIONS = ["How do I send money?", "Freeze a card", "Is this real money?", "Where are plans?"];
