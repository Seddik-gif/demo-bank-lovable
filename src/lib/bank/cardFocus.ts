import type { Card } from "./data";

/** The card to show first when the Cards page opens, e.g. the card tapped on Home. */
let focused: string | null = null;

export function focusCard(cardId: string): void {
  focused = cardId;
}

/** Returns the card to focus once, then forgets it. */
export function takeFocusedCard(): string | null {
  const id = focused;
  focused = null;
  return id;
}

/**
 * The card "flying" from Home to the Cards page. `from` is where it was tapped; `to` is where it lands,
 * which the Cards page sets once it has scrolled to the card.
 */
export interface CardFlight {
  card: Card;
  from: DOMRect;
  to: DOMRect | null;
}

let flight: CardFlight | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function startCardFlight(card: Card, from: DOMRect): void {
  flight = { card, from, to: null };
  notify();
}

export function setCardFlightTarget(to: DOMRect): void {
  if (!flight) return;
  flight = { ...flight, to };
  notify();
}

export function endCardFlight(): void {
  if (!flight) return;
  flight = null;
  notify();
}

export function getCardFlight(): CardFlight | null {
  return flight;
}

export function subscribeCardFlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
