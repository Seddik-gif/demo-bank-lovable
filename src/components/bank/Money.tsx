import { type KeyboardEvent, type MouseEvent } from "react";
import { formatMoney, formatSigned } from "@/lib/bank/data";
import { updateSettings, useSettings } from "@/lib/bank/settings";

const MASK = "**********";
// The digits (from first to last) become the mask. Everything else stays where the formatter put it:
// "$17,751.75" hides as "$**********", and "17.751,75 $" hides as "********** $".
const NUMBER = /\d(?:[\d.,\s]*\d)?/;

/** Formats an amount, or returns the mask while balances are hidden. */
export function useMoneyText() {
  const hidden = useSettings().hideBalances;
  return (value: number, signed = false) => {
    const text = signed ? formatSigned(value) : formatMoney(value);
    return hidden ? text.replace(NUMBER, MASK) : text;
  };
}

/**
 * An amount that can be hidden. Click it (or press Enter/Space) to show or hide every amount in the app.
 * The click stops here, so a row that contains the amount does not also open.
 */
export function Money({ value, signed = false, className = "" }: { value: number; signed?: boolean; className?: string }) {
  const fmt = useMoneyText();
  const hidden = useSettings().hideBalances;
  const toggle = () => updateSettings({ hideBalances: !hidden });
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggle();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={hidden}
      aria-label={hidden ? "Amount hidden. Show amounts" : "Hide amounts"}
      title={hidden ? "Click to show amounts" : "Click to hide amounts"}
      onClick={onClick}
      onKeyDown={onKey}
      className={`cursor-pointer select-none ${className}`}
    >
      {fmt(value, signed)}
    </span>
  );
}
