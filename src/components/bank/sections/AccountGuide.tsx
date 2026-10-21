import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import type { AccountKind } from "@/lib/bank/data";
import { ACCOUNT_GUIDES } from "@/lib/bank/guides";
import { SheetBackdrop, SheetPanel } from "../motion";

/** A short walk-through of one type of account. Opened from the account page and right after opening an account. */
export function AccountGuide({ kind, onClose, doneLabel = "Got it" }: { kind: AccountKind; onClose: () => void; doneLabel?: string }) {
  const guide = ACCOUNT_GUIDES[kind];
  const [step, setStep] = useState(0);
  const last = step === guide.steps.length - 1;
  const current = guide.steps[step] ?? { title: guide.name, text: guide.summary };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`${guide.name} guide`}>
      <SheetBackdrop onClick={onClose} label="Close guide" blur="backdrop-blur-sm" />
      <SheetPanel className="glass flex w-full max-w-md flex-col gap-5 overflow-hidden rounded-b-none p-6 pb-8 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{guide.name} guide</p>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" aria-hidden /></button>
        </div>

        <p className="text-sm text-muted-foreground">{guide.summary}</p>

        <div key={step} className="page-fade space-y-2 rounded-2xl bg-secondary p-5">
          <p className="text-xs text-muted-foreground">Step {step + 1} of {guide.steps.length}</p>
          <h3 className="font-display text-xl font-semibold">{current.title}</h3>
          <p className="text-sm leading-relaxed">{current.text}</p>
        </div>

        <div className="flex justify-center gap-2" aria-hidden>
          {guide.steps.map((s, i) => (
            <span key={s.title} className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-accent" : "w-2 bg-muted-foreground/40"}`} />
          ))}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button type="button" className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          {last ? (
            <button type="button" className="btn btn-primary" onClick={onClose}>{doneLabel}</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>Next</button>
          )}
        </div>
      </SheetPanel>
    </div>,
    document.body,
  );
}
