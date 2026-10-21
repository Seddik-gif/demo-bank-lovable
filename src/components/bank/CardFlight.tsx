import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { endCardFlight, getCardFlight, subscribeCardFlight } from "@/lib/bank/cardFocus";
import { CardVisual } from "./Card3D";

/**
 * A copy of a card that glides from where it was tapped to its place on the Cards page.
 * It sits above the app, and disappears once it has landed. Under reduced motion it jumps straight there.
 */
export function CardFlightLayer() {
  const flight = useSyncExternalStore(subscribeCardFlight, getCardFlight, getCardFlight);
  const reduce = useReducedMotion();

  // If the Cards page never reports a landing spot, clear the copy anyway.
  useEffect(() => {
    if (!flight) return;
    const t = window.setTimeout(endCardFlight, 1600);
    return () => window.clearTimeout(t);
  }, [flight]);

  if (!flight) return null;
  const to = flight.to ?? flight.from;

  return createPortal(
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[80]"
      initial={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }}
      animate={{ left: to.left, top: to.top, width: to.width, height: to.height }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 210, damping: 28, mass: 0.9 }}
      onAnimationComplete={() => {
        if (flight.to) endCardFlight();
      }}
    >
      <CardVisual card={flight.card} className="h-full" />
    </motion.div>,
    document.body,
  );
}
