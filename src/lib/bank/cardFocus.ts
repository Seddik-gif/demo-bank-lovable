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
