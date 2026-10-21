import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Makes a dialog behave like one for keyboard and screen-reader users:
 * focus moves into it when it opens, Tab stays inside it, Escape closes it (when `onClose` is given),
 * and focus goes back to whatever opened it when it closes.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose?: (() => void) | undefined) {
  // Read the latest close handler without restarting the focus handling on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;

    const focusables = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);

    // Start on the first control, or on the dialog itself if it has none.
    const first = focusables()[0];
    if (first) first.focus();
    else {
      panel.tabIndex = -1;
      panel.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const firstEl = list[0]!;
      const lastEl = list[list.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && panel.contains(active);
      if (e.shiftKey && (!inside || active === firstEl)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (!inside || active === lastEl)) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Give focus back to the control that opened the dialog, if it is still there.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [ref]);
}
