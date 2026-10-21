import { useEffect, useLayoutEffect, useState } from "react";

interface TourStep {
  /** data-tour value of the element to highlight. Steps without one are shown over a dimmed page. */
  target?: string;
  text: string;
}

/** Fired on the window when the user asks for the guide again (Profile > Help). */
export const REPLAY_TOUR_EVENT = "demo-bank:replay-tour";

const STEPS: TourStep[] = [
  { text: "Let's take a quick tour. It takes 30 seconds." },
  { target: "balance", text: "This is your balance. Tap any amount to hide it." },
  { target: "nav-payments", text: "Pay friends and split bills here." },
  { target: "nav-cards", text: "Freeze a card with one tap." },
  { target: "nav-budgets", text: "Set monthly limits and track spending." },
  { target: "nav-crypto", text: "Trade crypto with simulated money only." },
  { target: "profile", text: "Tap your photo for plans, themes and settings." },
  { text: "You're all set. Enjoy your account!" },
];

/** Pip, the guide: a small round robot with a blink, a bob and a wave. */
export function Pip({ waving, className = "h-24 w-24" }: { waving: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`pip-bob shrink-0 ${className}`} aria-hidden>
      <line x1="60" y1="22" x2="60" y2="8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <circle className="pip-pulse" cx="60" cy="6" r="5" fill="var(--accent)" />
      <ellipse cx="60" cy="70" rx="44" ry="40" fill="var(--violet)" />
      <ellipse cx="60" cy="78" rx="30" ry="20" fill="oklch(1 0 0 / 0.12)" />
      <g className="pip-blink">
        <ellipse cx="46" cy="62" rx="7" ry="9" fill="white" />
        <ellipse cx="74" cy="62" rx="7" ry="9" fill="white" />
        <circle cx="48" cy="64" r="3.5" fill="#1b1030" />
        <circle cx="76" cy="64" r="3.5" fill="#1b1030" />
      </g>
      <circle cx="34" cy="78" r="5" fill="oklch(0.8 0.15 350 / 0.7)" />
      <circle cx="86" cy="78" r="5" fill="oklch(0.8 0.15 350 / 0.7)" />
      <path d="M 50 84 Q 60 92 70 84" stroke="#1b1030" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="14" cy="84" rx="7" ry="10" fill="var(--violet)" />
      <ellipse className={waving ? "pip-wave" : undefined} cx="106" cy="80" rx="7" ry="10" fill="var(--violet)" />
    </svg>
  );
}

/** Guided tour shown once, right after a new account is created. Pip highlights the parts of the app. */
export function WelcomeTour({ name, onDone }: { name: string; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const first = name.trim().split(/\s+/)[0] || "there";
  const step = STEPS[index] ?? STEPS[0]!;
  const last = index === STEPS.length - 1;
  const text = index === 0 ? `Hi ${first}! I'm Pip. Let me show you around.` : index === STEPS.length - 1 ? `You're all set, ${first}. Enjoy your account!` : step.text;

  // Find the visible copy of the target (the phone bar and the desktop sidebar both carry the same markers).
  useLayoutEffect(() => {
    const measure = () => {
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = [...document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`)].find((e) => e.getBoundingClientRect().width > 0);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const next = () => (last ? onDone() : setIndex((i) => i + 1));

  // The page stays faded for the whole tour. The target is the only clear part; with no target, the spotlight is a point in the middle.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = rect ? { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 } : { top: vh / 2, left: vw / 2, width: 0, height: 0 };
  const bottomEdge = box.top + box.height;
  const rightEdge = box.left + box.width;
  // fade-in: the panels fade in once when the tour opens; after that their size and position animate with the transition.
  const fade = "fade-in fixed z-[59] bg-background/60 backdrop-blur-sm pointer-events-none transition-all duration-500 ease-out";

  return (
    <>
      <div aria-hidden className={fade} style={{ top: 0, left: 0, width: vw, height: Math.max(0, box.top) }} />
      <div aria-hidden className={fade} style={{ top: bottomEdge, left: 0, width: vw, height: Math.max(0, vh - bottomEdge) }} />
      <div aria-hidden className={fade} style={{ top: box.top, left: 0, width: Math.max(0, box.left), height: box.height }} />
      <div aria-hidden className={fade} style={{ top: box.top, left: rightEdge, width: Math.max(0, vw - rightEdge), height: box.height }} />
      {rect && (
        <div
          aria-hidden
          className="fade-in pointer-events-none fixed z-[60] rounded-2xl ring-2 ring-accent transition-all duration-500 ease-out"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 32px var(--accent)" }}
        />
      )}
      <div role="dialog" aria-label="App tour" className="fade-in fixed inset-x-0 bottom-0 z-[61] flex justify-center px-4 pb-28">
        <div className="glass pip-enter w-full max-w-sm space-y-4 p-5">
          <div className="flex items-end gap-3">
            <Pip waving={index === 0 || last} />
            <div key={index} className="tour-bubble relative min-w-0 flex-1 rounded-2xl bg-secondary p-3 text-sm font-medium">
              {index === 0 && <p className="font-display text-lg font-semibold">Welcome, {first}!</p>}
              <p>{text}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-accent" : "w-1.5 bg-muted-foreground/40"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!last && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
                  Skip
                </button>
              )}
              {index > 0 && !last && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIndex((i) => i - 1)}>
                  Back
                </button>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={next}>
                {index === 0 ? "Start tour" : last ? "Start exploring" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
