import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Minus, X } from "lucide-react";
import { formatMoney, PLAN_IDS, type PlanId } from "@/lib/bank/data";

type Billing = "monthly" | "annual";

export const PLAN_NAMES: Record<PlanId, string> = {
  everyday: "Everyday",
  plus: "Plus",
  pro: "Pro",
  private: "Private",
};

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  background: string; // card gradient
  accent: string;
  benefits: string[];
}

// Demo plans. Prices and benefits are placeholders and nothing is charged.
export const PLANS: Plan[] = [
  {
    id: "everyday",
    name: "Everyday",
    tagline: "Start with the basics",
    monthly: 0,
    annual: 0,
    background: "linear-gradient(135deg, oklch(0.45 0.02 260), oklch(0.25 0.02 260))",
    accent: "oklch(0.75 0.03 260)",
    benefits: ["Two accounts", "One virtual card", "Transfers between your accounts", "Standard support"],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For regular payments",
    monthly: 6,
    annual: 60,
    background: "oklch(0.55 0.2 260)",
    accent: "oklch(0.85 0.1 260)",
    benefits: ["Five accounts", "Two virtual cards", "Free transfers up to $1,000 a month", "0.5% cashback on selected categories"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For active savers and traders",
    monthly: 14,
    annual: 140,
    background: "linear-gradient(135deg, oklch(0.5 0.22 295), oklch(0.3 0.12 275))",
    accent: "oklch(0.85 0.12 300)",
    benefits: ["Unlimited accounts", "Five virtual cards", "Unlimited free transfers", "Lower crypto trading fee (0.05%)", "Priority support"],
  },
  {
    id: "private",
    name: "Private",
    tagline: "Everything, with a personal contact",
    monthly: 39,
    annual: 390,
    background: "linear-gradient(160deg, oklch(0.16 0.01 80), oklch(0.09 0.01 80))",
    accent: "oklch(0.8 0.12 85)",
    benefits: ["Everything in Pro", "Higher transfer and request limits", "Dedicated relationship manager (demo)", "Priority access to new features"],
  },
];

type Feature = { label: string; values: Record<PlanId, boolean | string> };
const COMPARISON: Feature[] = [
  { label: "Accounts", values: { everyday: "2", plus: "5", pro: "Unlimited", private: "Unlimited" } },
  { label: "Virtual cards", values: { everyday: "1", plus: "2", pro: "5", private: "5" } },
  { label: "Free transfers", values: { everyday: "Standard", plus: "Up to $1,000/mo", pro: "Unlimited", private: "Unlimited" } },
  { label: "Cashback on selected categories", values: { everyday: false, plus: true, pro: true, private: true } },
  { label: "Lower crypto trading fee", values: { everyday: false, plus: false, pro: true, private: true } },
  { label: "Priority support", values: { everyday: false, plus: false, pro: true, private: true } },
  { label: "Dedicated relationship manager", values: { everyday: false, plus: false, pro: false, private: true } },
];

const priceOf = (p: Plan, billing: Billing) => (billing === "monthly" ? p.monthly : p.annual);
const perLabel = (billing: Billing) => (billing === "monthly" ? "/month" : "/year");

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-label="Not included" />;
  return <span className="text-xs">{value}</span>;
}

/**
 * Swipeable plan cards with snapping and dots. Swiping reports the card in view through onIndexChange;
 * a change from outside (a dot, a keyboard step) scrolls to that card. Used by the profile and by sign-up.
 */
export function PlanCarousel({ index, onIndexChange, billing = "monthly" }: { index: number; onIndexChange: (i: number) => void; billing?: Billing }) {
  const track = useRef<HTMLDivElement>(null);
  const fromSwipe = useRef(false);

  useEffect(() => {
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    (track.current?.children[index] as HTMLElement | undefined)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.children.length === 0) return;
    const cardWidth = (el.children[0] as HTMLElement).offsetWidth + 16;
    const next = Math.min(PLANS.length - 1, Math.max(0, Math.round(el.scrollLeft / cardWidth)));
    if (next !== index) {
      fromSwipe.current = true;
      onIndexChange(next);
    }
  };

  return (
    <>
      <div ref={track} onScroll={onScroll} className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2" aria-label="Plans">
        {PLANS.map((p, i) => {
          const active = i === index;
          return (
            <article
              key={p.id}
              className={`sheen tilt relative aspect-[1.586] w-[78%] shrink-0 snap-center rounded-3xl p-5 shadow-2xl transition-[transform,opacity] duration-500 ease-out ${active ? "scale-100 opacity-100" : "scale-95 opacity-70"}`}
              style={{ background: p.background }}
              aria-current={active ? "true" : undefined}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-lg font-semibold" style={{ color: p.accent }}>{p.name}</p>
                  <p className="text-xs text-white/80">{p.tagline}</p>
                </div>
                <p className="font-display text-3xl font-semibold tabular-nums">
                  {p.monthly === 0 ? "Free" : formatMoney(priceOf(p, billing))}
                  {p.monthly > 0 && <span className="ml-1 text-sm font-normal text-white/80">{perLabel(billing)}</span>}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex justify-center gap-2" aria-hidden>
        {PLANS.map((p, i) => (
          <button key={p.id} type="button" tabIndex={-1} onClick={() => onIndexChange(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
        ))}
      </div>
    </>
  );
}

/** Full-screen plans and subscriptions. Choosing a plan changes the plan shown in the profile (demo only). */
export function PlansSheet({ current, onClose, onChoose }: { current: PlanId; onClose: () => void; onChoose: (plan: PlanId) => void }) {
  const [billing, setBilling] = useState<Billing>("annual");
  const [index, setIndex] = useState(Math.max(0, PLAN_IDS.indexOf(current)));
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState("");
  const plan = PLANS[index] ?? PLANS[0]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const choose = () => {
    if (plan.id === current) return;
    onChoose(plan.id);
    setMessage(`${plan.name} is now your plan. Demo only: nothing was charged.`);
  };

  const saving = Math.round((1 - PLANS[index]!.annual / (PLANS[index]!.monthly * 12 || 1)) * 100);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[oklch(0.1_0.02_280)] text-white" role="dialog" aria-modal="true" aria-label="Plans and subscriptions">
      {/* Background tints toward the active plan */}
      {PLANS.map((p, i) => (
        <div
          key={p.id}
          aria-hidden
          className="pointer-events-none fixed inset-0 transition-opacity duration-700"
          style={{ opacity: i === index ? 0.35 : 0, background: p.background, filter: "blur(80px)" }}
        />
      ))}

      <div className="relative mx-auto flex max-w-md flex-col gap-6 px-5 pb-12 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Plans</p>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" onClick={onClose} aria-label="Close plans">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-semibold">Choose your plan</h1>
          <p className="mt-1 text-sm text-white/70">Pick the features you need. You can change plans at any time.</p>
        </div>

        {/* Billing switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-white/10 p-1" role="group" aria-label="Billing period">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={billing === b}
                onClick={() => setBilling(b)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${billing === b ? "bg-white text-black" : "text-white/80"}`}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          {billing === "annual" && saving > 0 && (
            <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">Save {saving}%</span>
          )}
        </div>

        <PlanCarousel index={index} onIndexChange={setIndex} billing={billing} />

        {/* Active plan benefits */}
        <section className="space-y-3" aria-labelledby="benefits-title">
          <h2 id="benefits-title" className="text-lg font-semibold">What's included in {plan.name}</h2>
          <ul className="space-y-2">
            {(showAll ? plan.benefits : plan.benefits.slice(0, 3)).map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: plan.accent }} aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {plan.benefits.length > 3 && (
            <button type="button" className="flex items-center gap-1 text-sm font-medium" style={{ color: plan.accent }} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? "Show fewer benefits" : "See all benefits"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
            </button>
          )}
        </section>

        <div className="space-y-2">
          <button
            type="button"
            onClick={choose}
            disabled={plan.id === current}
            className="w-full rounded-2xl bg-white py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
          >
            {plan.id === current ? "Current plan" : `Choose ${plan.name}`}
          </button>
          {message && <p role="status" className="text-center text-xs text-success">{message}</p>}
        </div>

        {/* Comparison */}
        <section className="space-y-3" aria-labelledby="compare-title">
          <h2 id="compare-title" className="text-lg font-semibold">Compare plans</h2>
          {/* Fixed-width columns that fit the screen: long values wrap instead of scrolling sideways. */}
          <div className="rounded-2xl bg-white/5 p-2">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs">
              <colgroup>
                <col className="w-[34%]" />
                {PLANS.map((p) => <col key={p.id} className="w-[16.5%]" />)}
              </colgroup>
              <thead>
                <tr className="text-[11px] text-white/70">
                  <th scope="col" className="py-2 pl-2 pr-1 font-medium">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} scope="col" className="px-0.5 py-2 text-center font-semibold" style={{ color: p.accent }}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((f) => (
                  <tr key={f.label} className="border-t border-white/10">
                    <th scope="row" className="py-3 pl-2 pr-1 text-left font-normal leading-snug">{f.label}</th>
                    {PLANS.map((p) => (
                      <td key={p.id} className="px-0.5 py-3 text-center align-middle leading-snug"><Cell value={f.values[p.id]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-white/50">
          Prices and benefits are demo values. No subscription is charged in this demo.
        </p>
      </div>
    </div>,
    document.body,
  );
}
