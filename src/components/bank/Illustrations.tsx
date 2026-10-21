import type { ReactNode } from "react";

// One style for every illustration: a line drawing in the accent colour, on a soft circle of the same colour.
// They are decorative, so they are hidden from screen readers. The text next to them says what is going on.

function Frame({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <svg viewBox="0 0 96 96" className={`text-accent ${className || "h-24 w-24"}`} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="48" cy="48" r="44" fill="currentColor" fillOpacity="0.12" stroke="none" />
      {children}
    </svg>
  );
}

/** A receipt: for empty transaction lists. */
export function ReceiptIllustration({ className }: { className?: string | undefined }) {
  return (
    <Frame className={className}>
      <path d="M31 24h34v50l-6-4-6 4-5-4-6 4-6-4-5 4z" />
      <path d="M39 36h18M39 46h18M39 56h10" />
    </Frame>
  );
}

/** Two chat bubbles: for empty conversations. */
export function ChatIllustration({ className }: { className?: string | undefined }) {
  return (
    <Frame className={className}>
      <path d="M26 32h28a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H40l-8 7v-7h-6a6 6 0 0 1-6-6V38a6 6 0 0 1 6-6z" />
      <path d="M50 52h14a6 6 0 0 0 6-6V32a6 6 0 0 0-6-6H42" />
    </Frame>
  );
}

/** A pie chart with a slice missing: for budgets that have not been set yet. */
export function BudgetIllustration({ className }: { className?: string | undefined }) {
  return (
    <Frame className={className}>
      <path d="M48 24a24 24 0 1 0 24 24H48z" />
      <path d="M54 18a24 24 0 0 1 24 24H54z" />
    </Frame>
  );
}

/** A card with a chip: for the "Get your card now" banner and empty card lists. */
export function CardIllustration({ className }: { className?: string | undefined }) {
  return (
    <Frame className={className}>
      <rect x="20" y="30" width="56" height="36" rx="6" />
      <path d="M20 40h56" />
      <path d="M30 56h14" />
    </Frame>
  );
}

/** A coin with a rising line: for crypto and investments that are empty. */
export function CoinIllustration({ className }: { className?: string | undefined }) {
  return (
    <Frame className={className}>
      <circle cx="44" cy="50" r="18" />
      <path d="M38 50h12M44 44v12" />
      <path d="M62 34l8-8m0 0h-7m7 0v7" />
    </Frame>
  );
}
