import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useDialog } from "./useDialog";

/** One spring for everything that slides in, so the sheets all feel the same. */
export const SHEET_SPRING = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;

/** The dark layer behind a sheet. It fades in and out, and a tap on it closes the sheet. */
export function SheetBackdrop({ onClick, label, blur = "backdrop-blur-md" }: { onClick?: (() => void) | undefined; label: string; blur?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute inset-0 bg-background/70 ${blur}`}
      initial={{ opacity: reduce ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    />
  );
}

/**
 * A sheet panel that springs up from the bottom (or scales in on a wide screen).
 * Under reduced motion it appears straight away.
 */
export function SheetPanel({ children, className = "", onClose }: { children: ReactNode; className?: string; onClose?: (() => void) | undefined }) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  // Focus moves into the sheet, stays in it, closes on Escape, and returns to the opener.
  useDialog(panel, onClose);
  return (
    <motion.div
      ref={panel}
      className={`relative ${className}`}
      initial={reduce ? false : { y: "100%", opacity: 0.6 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={reduce ? { duration: 0 } : SHEET_SPRING}
    >
      {children}
    </motion.div>
  );
}
